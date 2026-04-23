'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Download,
  Trash2,
  Maximize2,
  Check,
  LayoutGrid,
  Zap,
  Film,
  ImageIcon,
  Box,
  Clock,
  X,
  RotateCcw,
  Layers,
  MessageSquare,
} from 'lucide-react';
import type { CenterTab, GalleryItem, GenerationTool, ChatMessage } from '@/app/(app)/workspace/page';
import { WorkspaceAgentActivity } from './AgentActivity';
import type { AgentActivityHandle } from './AgentActivity';
import { WorkspaceChatTab } from './ChatTab';

/* ═══════════════════════════════════════════════════════
   Center Viewport — Gallery + Chat + Agent Activity tabs
   ═══════════════════════════════════════════════════════ */

interface Props {
  activeTab: CenterTab;
  onTabChange: (t: CenterTab) => void;
  gallery: GalleryItem[];
  addToGallery: (item: GalleryItem) => void;
  removeFromGallery: (id: string) => void;
  onOpenTool: (tool: GenerationTool) => void;
  /* Chat props */
  chatMessages: ChatMessage[];
  chatStreaming: boolean;
  onSendChat: (text: string) => void;
  onClearChat: () => void;
  sharedTurnCount: number;
  /* Agent ref forwarding */
  agentRef: React.Ref<AgentActivityHandle>;
  onAgentRunningChange?: (running: boolean) => void;
  onAgentContentChange?: (content: string) => void;
  onExecuteCode?: (code: string, lang: string) => void;
}

export function WorkspaceCenterViewport({
  activeTab,
  onTabChange,
  gallery,
  addToGallery,
  removeFromGallery,
  onOpenTool,
  chatMessages,
  chatStreaming,
  onSendChat,
  onClearChat,
  sharedTurnCount,
  agentRef,
  onAgentRunningChange,
  onAgentContentChange,
  onExecuteCode,
}: Props) {
  return (
    <main className="ws-center">
      {/* Tab bar */}
      <div className="ws-center-tabs">
        <button
          className={`ws-tab ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => onTabChange('gallery')}
        >
          <LayoutGrid size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: -2 }} />
          Gallery
        </button>
        <button
          className={`ws-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => onTabChange('chat')}
        >
          <MessageSquare size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: -2 }} />
          Chat
        </button>
        <button
          className={`ws-tab ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => onTabChange('agent')}
        >
          <Zap size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: -2 }} />
          Agent
        </button>
      </div>

      {/* Tab body */}
      <div className="ws-center-body">
        {activeTab === 'gallery' && (
          <GalleryView
            gallery={gallery}
            removeFromGallery={removeFromGallery}
            onOpenTool={onOpenTool}
          />
        )}
        {activeTab === 'chat' && (
          <WorkspaceChatTab
            messages={chatMessages}
            streaming={chatStreaming}
            onSendChat={onSendChat}
            onClearChat={onClearChat}
            sharedTurnCount={sharedTurnCount}
          />
        )}
        {activeTab === 'agent' && (
          <WorkspaceAgentActivity
            ref={agentRef}
            addToGallery={addToGallery}
            onRunningChange={onAgentRunningChange}
            onContentChange={onAgentContentChange}
            onExecuteCode={onExecuteCode}
          />
        )}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════
   Gallery View — mirrors VideoGenerator / ImageGenerator
   output cards with hover actions, expanded preview, etc.
   ═══════════════════════════════════════════════════════ */

interface GalleryViewProps {
  gallery: GalleryItem[];
  removeFromGallery: (id: string) => void;
  onOpenTool: (tool: GenerationTool) => void;
}

function GalleryView({ gallery, removeFromGallery, onOpenTool }: GalleryViewProps) {
  const [hCard, setHCard] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<GalleryItem | null>(null);

  // Download — same pattern as VideoGenerator/ImageGenerator
  const handleDownload = useCallback(async (item: GalleryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const ext = item.type === 'video' ? 'mp4' : item.type === '3d' ? 'glb' : 'png';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `starcyeed-${item.type}-${item.id.slice(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      /* toast would go here */
    }
  }, []);

  const handleTrash = useCallback((item: GalleryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    removeFromGallery(item.id);
    if (expanded?.id === item.id) setExpanded(null);
  }, [removeFromGallery, expanded]);

  // Tag color map — matches existing generator badge patterns
  const tagColor = (type: GalleryItem['type']) => {
    switch (type) {
      case 'video': return 'video';
      case 'image': return 'image';
      case '3d': return 'three-d';
      default: return '';
    }
  };

  const tagLabel = (type: GalleryItem['type']) => {
    switch (type) {
      case 'video': return 'VIDEO';
      case 'image': return 'IMAGE';
      case '3d': return '3D';
    }
  };

  const TypeIcon = ({ type }: { type: GalleryItem['type'] }) => {
    switch (type) {
      case 'video': return <Film size={14} />;
      case 'image': return <ImageIcon size={14} />;
      case '3d': return <Box size={14} />;
      default: return null;
    }
  };

  if (gallery.length === 0) {
    return (
      <div className="ws-empty">
        <div className="ws-empty-icon">
          <LayoutGrid size={22} />
        </div>
        <p className="ws-empty-title">No creations yet</p>
        <p className="ws-empty-sub">
          Generate images, videos, or 3D models and they&apos;ll appear here.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button
            onClick={() => onOpenTool('video')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--ws-accent)',
              color: 'white',
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Generate Video
          </button>
          <button
            onClick={() => onOpenTool('image')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--ws-surface-2)',
              color: 'var(--ws-text-dim)',
              border: '1px solid var(--ws-border)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Generate Image
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-gallery">
      <div className="ws-gallery-grid">
        {gallery.map((item) => {
          const isHovered = hCard === item.id;
          return (
            <div
              key={item.id}
              className="ws-gallery-card"
              onMouseEnter={() => setHCard(item.id)}
              onMouseLeave={() => setHCard(null)}
              onClick={() => setExpanded(item)}
            >
              <div className="ws-gallery-media">
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : item.type === '3d' ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: 6,
                    color: 'var(--ws-amber)',
                  }}>
                    <Box size={28} />
                    <span style={{ fontSize: 11, color: 'var(--ws-text-muted)' }}>3D Model</span>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={item.prompt}
                    onError={(e) => {
                      const t = e.currentTarget;
                      t.style.display = 'none';
                      const p = t.parentElement;
                      if (p && !p.querySelector('.ws-gallery-fallback')) {
                        const d = document.createElement('div');
                        d.className = 'ws-gallery-fallback';
                        Object.assign(d.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--ws-text-muted)', fontSize: '11px', textAlign: 'center', padding: '12px' });
                        d.textContent = 'Image expired';
                        p.appendChild(d);
                      }
                    }}
                  />
                )}

                {/* Hover overlay with action buttons — same as VideoGenerator */}
                {isHovered && item.url && (
                  <div className="ws-gallery-overlay">
                    <button
                      className="ws-gallery-action"
                      onClick={(e) => handleDownload(item, e)}
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      className="ws-gallery-action"
                      onClick={(e) => { e.stopPropagation(); setExpanded(item); }}
                      title="Expand"
                    >
                      <Maximize2 size={14} />
                    </button>
                    <button
                      className="ws-gallery-action"
                      onClick={(e) => handleTrash(item, e)}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="ws-gallery-meta">
                <p className="ws-gallery-prompt">{item.prompt}</p>
                <div className="ws-gallery-info">
                  <span className={`ws-gallery-tag ${tagColor(item.type)}`}>
                    {tagLabel(item.type)}
                  </span>
                  {item.model && (
                    <span className="ws-gallery-tag">{item.model}</span>
                  )}
                  {item.time && (
                    <span className="ws-gallery-time">
                      <Clock size={9} style={{ display: 'inline', verticalAlign: -1, marginRight: 2 }} />
                      {item.time.toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Expanded preview modal — same pattern as VideoGenerator/ImageGenerator ── */}
      {expanded && (
        <div
          className="ws-preview-backdrop"
          onClick={() => setExpanded(null)}
        >
          <div className="ws-preview-content" onClick={(e) => e.stopPropagation()}>
            {expanded.type === 'video' ? (
              <video
                src={expanded.url}
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 10 }}
              />
            ) : expanded.type === '3d' ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 60,
                background: 'var(--ws-surface)',
                borderRadius: 10,
              }}>
                <Box size={48} style={{ color: 'var(--ws-amber)', marginBottom: 12 }} />
                <p style={{ color: 'var(--ws-text-dim)', fontSize: 14 }}>3D Model Viewer</p>
                <a
                  href={expanded.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'var(--ws-amber-dim)',
                    color: 'var(--ws-amber)',
                    border: 'none',
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                >
                  Open in Viewer
                </a>
              </div>
            ) : (
              <img
                src={expanded.url}
                alt={expanded.prompt}
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 10 }}
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = 'none';
                  const p = t.parentElement;
                  if (p && !p.querySelector('.ws-gallery-fallback')) {
                    const d = document.createElement('div');
                    d.className = 'ws-gallery-fallback';
                    Object.assign(d.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '200px', color: 'var(--ws-text-muted)', fontSize: '13px' });
                    d.textContent = 'Image no longer available';
                    p.appendChild(d);
                  }
                }}
              />
            )}

            <div style={{ padding: '10px 0 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--ws-text-dim)', marginBottom: 8 }}>
                {expanded.prompt}
              </p>
            </div>

            {/* Action row — mirrors existing generators */}
            <div className="ws-preview-actions">
              <button
                className="ws-preview-btn"
                onClick={() => handleDownload(expanded)}
              >
                <Download size={14} /> Download
              </button>
              <button
                className="ws-preview-btn"
                onClick={() => { handleTrash(expanded); setExpanded(null); }}
              >
                <Trash2 size={14} /> Remove
              </button>
              <button
                className="ws-preview-btn"
                onClick={() => setExpanded(null)}
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
