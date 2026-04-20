'use client';

import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  Loader2,
  Download,
  Maximize2,
  Send,
  Video,
  Image as ImageIcon,
  Box,
  Type,
  Search,
  Zap,
  Sparkles,
  Paperclip,
  X,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { sendAgentMessage } from '@/services/agent-api';
import type { GalleryItem } from '@/app/workspace/page';
import type {
  ToolStartPayload,
  ToolDonePayload,
  SummaryPayload,
  AgentAsset,
} from '@/services/agent-api';

/* ─── Tool metadata (mirrored from AgentPanel.tsx) ──────────────────────────── */

const TOOL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  generate_image:     { label: 'Generating image',     icon: <ImageIcon className="w-3.5 h-3.5" />, color: '#c084fc' },
  generate_logo:      { label: 'Generating logo',      icon: <Type className="w-3.5 h-3.5" />,      color: '#f472b6' },
  generate_thumbnail: { label: 'Generating thumbnail', icon: <ImageIcon className="w-3.5 h-3.5" />, color: '#fb923c' },
  generate_video:     { label: 'Generating video',     icon: <Video className="w-3.5 h-3.5" />,     color: '#fbbf24' },
  generate_skyreel:   { label: 'SkyReels video',       icon: <Video className="w-3.5 h-3.5" />,     color: '#f43f5e' },
  generate_3d:        { label: 'Generating 3D model',  icon: <Box className="w-3.5 h-3.5" />,       color: '#67e8f9' },
  web_search:         { label: 'Searching the web',    icon: <Search className="w-3.5 h-3.5" />,    color: '#34d399' },
};

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type EventType = 'status' | 'plan' | 'tool_start' | 'tool_done' | 'tool_error' | 'content' | 'summary' | 'done' | 'error';

interface AgentEvent {
  id: string;
  type: EventType;
  text?: string;
  tool?: string;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  cost?: number;
  assets?: AgentAsset[];
  total_cost?: number;
}

interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ═══════════════════════════════════════════════════════
   Agent Activity — SSE streaming + tool chain + assets
   Same output rendering as AgentPanel.tsx
   ═══════════════════════════════════════════════════════ */

export interface AgentActivityHandle {
  runPrompt: (text: string) => void;
  hasImage: () => boolean;
}

interface Props {
  addToGallery: (item: GalleryItem) => void;
  onRunningChange?: (running: boolean) => void;
  onContentChange?: (content: string) => void;
}

export const WorkspaceAgentActivity = forwardRef<AgentActivityHandle, Props>(
  function WorkspaceAgentActivity({ addToGallery, onRunningChange, onContentChange }, ref) {
  const [prompt, setPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imagePreviewRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentBuf = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agentConvId] = useState(() => `ws-agent-${Date.now()}`);

  /* ─── Image attachment handlers ──────────────────────── */
  const setImagePreviewWithRef = useCallback((val: string | null) => {
    setImagePreview(val);
    imagePreviewRef.current = val;
  }, []);

  const handleImageAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;
    setAttachedImage(file);

    const img = new window.Image();
    img.onload = () => {
      const MAX = 1024;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      console.log('[AgentActivity] image processed, dataUrl length:', dataUrl.length, 'prefix:', dataUrl.slice(0, 30));
      setImagePreviewWithRef(dataUrl);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  }, [setImagePreviewWithRef]);

  const handleRemoveImage = useCallback(() => {
    setAttachedImage(null);
    setImagePreviewWithRef(null);
  }, [setImagePreviewWithRef]);

  // Notify parent of state changes
  useEffect(() => { onRunningChange?.(running); }, [running, onRunningChange]);
  useEffect(() => { onContentChange?.(content); }, [content, onContentChange]);

  // Imperative handle: let parent trigger agent from voice
  const runFromExternal = useCallback((text: string) => {
    if (!text.trim() || running) return;
    const capturedImage = imagePreviewRef.current;
    console.log('[AgentActivity] runFromExternal capturedImage:', !!capturedImage, capturedImage?.slice(0, 50));
    setPrompt('');
    setAttachedImage(null);
    setImagePreviewWithRef(null);
    setRunning(true);
    setEvents([]);
    setContent('');
    setSummary(null);
    contentBuf.current = '';

    const newHistory: HistoryEntry[] = [...history, { role: 'user', content: text }];
    setHistory(newHistory);

    controllerRef.current = sendAgentMessage(
      text,
      newHistory,
      {
        onStatus: (t) => pushEventCb({ id: uid(), type: 'status', text: t }),
        onPlan: (t) => pushEventCb({ id: uid(), type: 'plan', text: t }),
        onToolStart: (p: ToolStartPayload) =>
          pushEventCb({ id: uid(), type: 'tool_start', tool: p.tool, input: p.input, cost: p.cost }),
        onToolDone: (p: ToolDonePayload) => replaceToolDone(p),
        onToolError: (e) => pushEventCb({ id: uid(), type: 'tool_error', error: e }),
        onContent: (t) => {
          contentBuf.current += t;
          setContent(contentBuf.current);
        },
        onSummary: (s: SummaryPayload) => {
          setSummary(s);
          for (const asset of s.assets) {
            addToGallery({
              id: uid(),
              type: asset.type === 'logo' ? 'image' : asset.type,
              url: asset.url,
              prompt: text,
              model: asset.tool,
              createdAt: Date.now(),
            });
          }
        },
        onDone: () => {
          setRunning(false);
          setHistory(prev => [...prev, { role: 'assistant', content: contentBuf.current }]);
        },
        onError: (e) => {
          pushEventCb({ id: uid(), type: 'error', error: e });
          setRunning(false);
        },
      },
      {
        enableSearch: true,
        maxSteps: 8,
        conversationId: agentConvId,
        ...(capturedImage ? {
          imageData: capturedImage.replace(/^data:[^;]+;base64,/, ''),
          imageMediaType: capturedImage.match(/^data:([^;]+);/)?.[1] || 'image/png',
        } : {}),
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, history, addToGallery]);

  useImperativeHandle(ref, () => ({
    runPrompt: runFromExternal,
    hasImage: () => !!imagePreviewRef.current,
  }), [runFromExternal]);

  const pushEventCb = useCallback((ev: AgentEvent) => {
    setEvents(prev => [...prev, ev]);
    // auto-scroll
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  // Replace matching tool_start with tool_done (like AgentPanel)
  const replaceToolDone = useCallback((p: ToolDonePayload) => {
    const doneEv: AgentEvent = { id: uid(), type: 'tool_done', tool: p.tool, result: p.result, cost: p.cost };
    setEvents(prev => {
      const idx = [...prev].reverse().findIndex(e => e.type === 'tool_start' && e.tool === p.tool);
      if (idx === -1) return [...prev, doneEv];
      const realIdx = prev.length - 1 - idx;
      const next = [...prev];
      next[realIdx] = { ...doneEv, id: prev[realIdx].id };
      return next;
    });
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  const handleSend = useCallback(() => {
    const text = prompt.trim();
    if (!text || running) return;
    const capturedImage = imagePreviewRef.current;
    console.log('[AgentActivity] handleSend capturedImage:', !!capturedImage, capturedImage?.slice(0, 50));
    setPrompt('');
    setAttachedImage(null);
    setImagePreviewWithRef(null);
    setRunning(true);
    setEvents([]);
    setContent('');
    setSummary(null);
    contentBuf.current = '';

    const newHistory: HistoryEntry[] = [...history, { role: 'user', content: text }];
    setHistory(newHistory);

    controllerRef.current = sendAgentMessage(
      text,
      newHistory,
      {
        onStatus: (t) => pushEventCb({ id: uid(), type: 'status', text: t }),
        onPlan: (t) => pushEventCb({ id: uid(), type: 'plan', text: t }),
        onToolStart: (p: ToolStartPayload) =>
          pushEventCb({ id: uid(), type: 'tool_start', tool: p.tool, input: p.input, cost: p.cost }),
        onToolDone: (p: ToolDonePayload) => replaceToolDone(p),
        onToolError: (e) => pushEventCb({ id: uid(), type: 'tool_error', error: e }),
        onContent: (t) => {
          contentBuf.current += t;
          setContent(contentBuf.current);
        },
        onSummary: (s: SummaryPayload) => {
          setSummary(s);
          for (const asset of s.assets) {
            addToGallery({
              id: uid(),
              type: asset.type === 'logo' ? 'image' : asset.type,
              url: asset.url,
              prompt: text,
              model: asset.tool,
              createdAt: Date.now(),
            });
          }
        },
        onDone: () => {
          setRunning(false);
          setHistory(prev => [...prev, { role: 'assistant', content: contentBuf.current }]);
        },
        onError: (e) => {
          pushEventCb({ id: uid(), type: 'error', error: e });
          setRunning(false);
        },
      },
      {
        enableSearch: true,
        maxSteps: 8,
        conversationId: agentConvId,
        ...(capturedImage ? {
          imageData: capturedImage.replace(/^data:[^;]+;base64,/, ''),
          imageMediaType: capturedImage.match(/^data:([^;]+);/)?.[1] || 'image/png',
        } : {}),
      },
    );
  }, [prompt, running, history, pushEventCb, addToGallery, agentConvId]);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    setRunning(false);
  }, []);

  /* ─── Download helper (same as AgentPanel) ── */
  const downloadAsset = useCallback((url: string) => {
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const ext = url.split('.').pop()?.split('?')[0] ?? 'png';
        a.download = `asset_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => window.open(url, '_blank'));
  }, []);

  /* ─── Collect assets from tool_done events (same logic as AgentPanel) ── */
  const resolvedAssets: AgentAsset[] = [];
  if (summary && summary.assets.length > 0) {
    resolvedAssets.push(...summary.assets);
  } else if (!running) {
    const seen = new Set<string>();
    for (const ev of events) {
      if (ev.type !== 'tool_done' || !ev.result) continue;
      const r = ev.result as Record<string, unknown>;
      for (const key of ['urls', 'url', 'video_url', 'output_url', 'model_url']) {
        const val = r[key];
        const list = Array.isArray(val) ? val : val ? [val] : [];
        for (const u of list) {
          if (typeof u === 'string' && !seen.has(u)) {
            seen.add(u);
            const isVid = ev.tool === 'generate_video' || ev.tool === 'generate_skyreel';
            const is3d = ev.tool === 'generate_3d';
            resolvedAssets.push({
              type: isVid ? 'video' : is3d ? '3d' : 'image',
              url: u,
              tool: ev.tool ?? '',
            });
          }
        }
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable event stream */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto' }}
        className="ws-center-body p-3 sm:p-4"
      >
        {events.length === 0 && !content && !running && (
          <div className="ws-empty">
            <div className="ws-empty-icon">
              <Zap size={22} />
            </div>
            <p className="ws-empty-title">Star Agent</p>
            <p className="ws-empty-sub">
              Ask the agent to generate images, videos, logos, 3D models, or search the web.
            </p>
          </div>
        )}

        {/* Tool chain events — same rendering as AgentPanel EventRow */}
        <div className="ws-agent">
          {events.map((ev) => {
            const meta = ev.tool ? TOOL_META[ev.tool] : null;

            if (ev.type === 'status' || ev.type === 'plan') {
              return (
                <div key={ev.id} className="ws-agent-event">
                  <div className="ws-agent-event-icon running">
                    <Loader2 size={12} className="ws-spinner" />
                  </div>
                  <div className="ws-agent-text">
                    <span className="ws-agent-text-sub">{ev.text}</span>
                  </div>
                </div>
              );
            }

            if (ev.type === 'tool_start') {
              return (
                <div key={ev.id} className="ws-agent-event">
                  <div className="ws-agent-event-icon running">
                    {meta?.icon || <Loader2 size={12} className="ws-spinner" />}
                  </div>
                  <div className="ws-agent-text">
                    <span className="ws-agent-text-label">
                      {meta?.label || ev.tool}
                    </span>
                  </div>
                  {ev.cost != null && (
                    <span className="ws-agent-cost">{ev.cost} cr</span>
                  )}
                </div>
              );
            }

            if (ev.type === 'tool_done') {
              return (
                <div key={ev.id} className="ws-agent-event">
                  <div className="ws-agent-event-icon done">✓</div>
                  <div className="ws-agent-text">
                    <span className="ws-agent-text-label">
                      {meta?.label?.replace('Generating ', '') || ev.tool} complete
                    </span>
                  </div>
                  {ev.cost != null && (
                    <span className="ws-agent-cost">-{ev.cost} cr</span>
                  )}
                </div>
              );
            }

            if (ev.type === 'tool_error' || ev.type === 'error') {
              return (
                <div key={ev.id} className="ws-agent-event">
                  <div className="ws-agent-event-icon error">✕</div>
                  <div className="ws-agent-text">
                    <span className="ws-agent-text-label" style={{ color: 'var(--ws-red)' }}>
                      {ev.error || 'Unknown error'}
                    </span>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* Streaming text response — same as AgentPanel */}
          {content && (() => {
            const textOnly = content
              .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
              .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
              .replace(/https?:\/\/\S+\.(png|jpg|mp4|glb)(\?\S*)?\s*/gi, '')
              .trim();
            return textOnly ? (
              <div
                style={{
                  padding: '4px 0',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <MarkdownRenderer content={textOnly} />
                {running && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 14,
                      marginLeft: 2,
                      background: 'var(--ws-accent)',
                      borderRadius: 1,
                      animation: 'ws-pulse 0.8s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
            ) : null;
          })()}

          {/* Asset grid — same rendering as AgentPanel */}
          {resolvedAssets.length > 0 && (
            <div
              style={{
                padding: '4px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(52,211,153,0.7)' }}>
                  ✓ {resolvedAssets.length} asset{resolvedAssets.length !== 1 ? 's' : ''} created
                </span>
                {summary && (
                  <span style={{ fontSize: 11, color: 'var(--ws-amber)' }}>
                    {summary.totalCost} credits used
                  </span>
                )}
              </div>
              <div className="ws-agent-assets">
                {resolvedAssets.map((asset, i) => {
                  const isVid = asset.type === 'video';
                  const is3d = asset.type === '3d';
                  return (
                    <div key={i} className="ws-agent-asset-card">
                      <div style={{ position: 'relative' }}>
                        {isVid ? (
                          <video
                            src={asset.url}
                            controls
                            preload="metadata"
                            muted
                            loop
                            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }}
                          />
                        ) : is3d ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            aspectRatio: '4/3',
                            gap: 4,
                          }}>
                            <Box size={24} style={{ color: 'var(--ws-cyan)' }} />
                            <span style={{ fontSize: 10, color: 'var(--ws-text-muted)' }}>3D Model</span>
                          </div>
                        ) : (
                          <img
                            src={asset.url}
                            alt={`Asset ${i + 1}`}
                            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }}
                          />
                        )}
                        <div className="ws-agent-asset-overlay">
                          <button
                            className="ws-gallery-action"
                            onClick={() => downloadAsset(asset.url)}
                          >
                            <Download size={14} />
                          </button>
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ws-gallery-action"
                          >
                            <Maximize2 size={14} />
                          </a>
                        </div>
                      </div>
                      <div style={{ padding: '6px 8px' }}>
                        <p style={{ fontSize: 11, color: 'var(--ws-text-dim)' }}>
                          {TOOL_META[asset.tool]?.label.replace('Generating ', '') ?? asset.type}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="ws-agent-input-wrap">
        {imagePreview && (
          <div className="ws-agent-attach-preview">
            <img src={imagePreview} alt="Attached" />
            <button className="ws-agent-attach-remove" onClick={handleRemoveImage} title="Remove image">
              <X size={12} />
            </button>
            <span className="ws-agent-attach-label">Reference image</span>
          </div>
        )}
        <div className="ws-agent-input-row">
          <label className="ws-agent-btn-attach" title="Attach reference image">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageAttach}
              style={{ display: 'none' }}
            />
            <Paperclip size={16} />
          </label>
          <input
            className="ws-agent-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={attachedImage ? 'Describe the video you want from this image...' : 'Ask Star Agent to create...'}
            disabled={running}
          />
          {running ? (
            <button className="ws-agent-send" onClick={handleCancel} title="Cancel">
              <Loader2 size={16} className="ws-spinner" />
            </button>
          ) : (
            <button
              className="ws-agent-send"
              onClick={handleSend}
              disabled={!prompt.trim()}
              title="Send"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
