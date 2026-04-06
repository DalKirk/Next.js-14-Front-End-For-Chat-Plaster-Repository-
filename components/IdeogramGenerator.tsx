'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Zap, Layers, Image as ImageIcon, Clock, Download, Wand2,
  Settings2, ChevronDown, RefreshCw, X, Maximize2, Copy, ArrowLeft,
  Trash2, Check, RotateCcw, Type,
} from 'lucide-react';
import {
  generateIdeogramImage,
  pollIdeogramJob,
  getIdeogramResultUrl,
  type IdeogramJobStatus,
  type IdeogramModel,
  type IdeogramStyle,
  type IdeogramMagicPrompt,
} from '@/services/ideogram.service';
import { apiClient } from '@/lib/api';
import { StorageUtils } from '@/lib/storage-utils';

/* ─── Ideogram style types ─── */
const ideogramStyles: { id: IdeogramStyle | 'none'; name: string; desc: string; emoji: string; bg: string }[] = [
  { id: 'none', name: 'Auto', desc: 'Let Ideogram decide', emoji: '✨', bg: 'rgba(255,255,255,0.06)' },
  { id: 'GENERAL', name: 'General', desc: 'Versatile all-purpose', emoji: '🎨', bg: 'rgba(139,92,246,0.12)' },
  { id: 'REALISTIC', name: 'Realistic', desc: 'Photographic quality', emoji: '📷', bg: 'rgba(6,182,212,0.12)' },
  { id: 'DESIGN', name: 'Design', desc: 'Logos, typography, graphics', emoji: '✏️', bg: 'rgba(236,72,153,0.12)' },
  { id: 'RENDER_3D', name: '3D Render', desc: 'Clean CGI look', emoji: '💎', bg: 'rgba(168,85,247,0.12)' },
  { id: 'ANIME', name: 'Anime', desc: 'Japanese animation', emoji: '🎌', bg: 'rgba(245,158,11,0.12)' },
];

/* ─── Aspect ratios ─── */
const aspectRatios: { id: string; label: string; desc: string }[] = [
  { id: 'ASPECT_1_1', label: '1:1', desc: 'Square' },
  { id: 'ASPECT_16_9', label: '16:9', desc: 'Wide' },
  { id: 'ASPECT_9_16', label: '9:16', desc: 'Tall' },
  { id: 'ASPECT_4_3', label: '4:3', desc: 'Classic' },
  { id: 'ASPECT_3_4', label: '3:4', desc: 'Portrait' },
  { id: 'ASPECT_3_2', label: '3:2', desc: 'Photo' },
  { id: 'ASPECT_2_3', label: '2:3', desc: 'Poster' },
];

/* ─── Generated image record ─── */
interface GeneratedImage {
  id: string;
  jobId: string;
  prompt: string;
  style: string;
  time: number | null;
  imageUrl: string | null;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  error?: string;
  c1: string;
  c2: string;
  kept?: boolean;
  savedAt?: number;
}

const STORAGE_KEY = 'starcyeed-ideogram-images';
const NOTICE_KEY = 'starcyeed-ideogram-notice-seen';
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

export default function IdeogramGenerator() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [styleType, setStyleType] = useState<IdeogramStyle | 'none'>('none');
  const [aspectRatio, setAspectRatio] = useState('ASPECT_1_1');
  const [model, setModel] = useState<IdeogramModel>('V_2_TURBO');
  const [magicPrompt, setMagicPrompt] = useState<IdeogramMagicPrompt>('AUTO');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState('');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [storageNotice, setStorageNotice] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [savingToProfile, setSavingToProfile] = useState<Record<string, boolean>>({});
  const [savedToProfile, setSavedToProfile] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<GeneratedImage | null>(null);
  const [hCard, setHCard] = useState<string | null>(null);
  const [hStyle, setHStyle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSubmitRef = useRef(0);

  const curStyle = ideogramStyles.find(s => s.id === styleType);
  const curRatio = aspectRatios.find(r => r.id === aspectRatio) || aspectRatios[0];

  /* ─── Generate ─── */
  const generate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < 2000) return;
    lastSubmitRef.current = now;

    setGenerating(true);
    setError(null);

    const h1 = Math.floor(Math.random() * 360);
    const h2 = Math.floor(Math.random() * 360);
    const tempId = `ideo-${Date.now()}`;

    const newImg: GeneratedImage = {
      id: tempId,
      jobId: '',
      prompt: prompt.trim(),
      style: styleType === 'none' ? 'Auto' : styleType,
      time: null,
      imageUrl: null,
      status: 'queued',
      c1: `hsl(${h1},60%,45%)`,
      c2: `hsl(${h2},60%,45%)`,
    };
    setImages(prev => [newImg, ...prev]);
    setActiveJobs(prev => prev + 1);

    try {
      const parsedSeed = seed ? parseInt(seed, 10) : null;
      const job = await generateIdeogramImage({
        prompt: prompt.trim(),
        model,
        style_type: styleType === 'none' ? null : styleType,
        aspect_ratio: aspectRatio,
        magic_prompt_option: magicPrompt,
        negative_prompt: negativePrompt || null,
        seed: Number.isNaN(parsedSeed) ? null : parsedSeed,
      });

      const jobId = job.job_id;
      setImages(prev => prev.map(img => img.id === tempId ? { ...img, jobId } : img));

      pollRef.current = setInterval(async () => {
        try {
          const status: IdeogramJobStatus = await pollIdeogramJob(jobId);

          setImages(prev =>
            prev.map(img =>
              img.id === tempId
                ? {
                    ...img,
                    status: status.status,
                    time: status.generation_time ?? null,
                    imageUrl: status.status === 'complete' ? getIdeogramResultUrl(jobId) : null,
                    error: status.error ?? undefined,
                  }
                : img,
            ),
          );

          if (status.status === 'complete' || status.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setActiveJobs(prev => Math.max(0, prev - 1));
            setTimeout(() => setGenerating(false), 3000);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setImages(prev =>
            prev.map(img => img.id === tempId ? { ...img, status: 'failed', error: 'Polling error' } : img),
          );
          setActiveJobs(prev => Math.max(0, prev - 1));
          setTimeout(() => setGenerating(false), 3000);
        }
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      setImages(prev =>
        prev.map(img => img.id === tempId ? { ...img, status: 'failed', error: msg } : img),
      );
      setActiveJobs(prev => Math.max(0, prev - 1));
      setGenerating(false);
    }
  }, [prompt, generating, styleType, aspectRatio, model, magicPrompt, negativePrompt, seed]);

  /* ─── Actions ─── */
  const handleDownload = async (img: GeneratedImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!img.imageUrl) return;
    try {
      const res = await fetch(img.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `starcyeed-ideogram-${img.id}.png`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) window.open(url, '_blank');
      else setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      if (img.imageUrl) window.open(img.imageUrl, '_blank');
    }
  };

  const handleCopy = async (img: GeneratedImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!img.imageUrl) return;
    try {
      const res = await fetch(img.imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch { /* ignore */ }
  };

  const handleSaveToProfile = async (img: GeneratedImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!img.imageUrl || savingToProfile[img.id] || savedToProfile[img.id]) return;
    const raw = StorageUtils.safeGetItem('chat-user');
    if (!raw) { setError('Please log in to save to your profile'); return; }
    let user: { id?: string; username?: string };
    try { user = JSON.parse(raw); } catch { setError('Invalid user session'); return; }
    if (!user.id || !user.username) { setError('Please log in to save to your profile'); return; }
    setSavingToProfile(prev => ({ ...prev, [img.id]: true }));
    try {
      await apiClient.saveToGallery(user.id, user.username, img.imageUrl, 'image', img.prompt.slice(0, 100));
      setSavedToProfile(prev => ({ ...prev, [img.id]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to profile');
    } finally {
      setSavingToProfile(prev => ({ ...prev, [img.id]: false }));
    }
  };

  const handleKeep = (img: GeneratedImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, kept: !i.kept } : i));
    if (expanded?.id === img.id) setExpanded(prev => prev ? { ...prev, kept: !prev.kept } : null);
  };

  const handleTrash = (img: GeneratedImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImages(prev => prev.filter(i => i.id !== img.id));
    if (expanded?.id === img.id) setExpanded(null);
  };

  const handleRegenerate = (img: GeneratedImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImages(prev => prev.filter(i => i.id !== img.id));
    if (expanded?.id === img.id) setExpanded(null);
    setPrompt(img.prompt);
    setTimeout(() => {
      const btn = document.querySelector('[data-ideogram-generate-btn]') as HTMLButtonElement | null;
      btn?.click();
    }, 100);
  };

  /* ─── Storage ─── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: GeneratedImage[] = JSON.parse(raw);
        const now = Date.now();
        const valid = parsed.filter(v => v.savedAt && (now - v.savedAt) < STORAGE_TTL_MS && v.status === 'complete');
        if (valid.length > 0) setImages(valid);
        if (valid.length !== parsed.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }
    } catch { /* noop */ }
    if (!localStorage.getItem(NOTICE_KEY)) setStorageNotice(true);
  }, []);

  useEffect(() => {
    try {
      const completed = images
        .filter(v => v.status === 'complete' && v.imageUrl)
        .map(v => ({ ...v, savedAt: v.savedAt || Date.now() }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    } catch { /* storage full */ }
  }, [images]);

  /* ─── Render ─── */
  return (
    <div style={{ minHeight: '100vh', background: '#030308', color: '#e2e2e8', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* 24h Storage Notice Modal */}
      {storageNotice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div style={{ maxWidth: 420, width: '90%', padding: '28px 24px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(10,10,20,0.98))', border: '1px solid rgba(236,72,153,0.2)', boxShadow: '0 0 40px rgba(236,72,153,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⏳</div>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', color: '#fbbf24' }}>Storage Notice</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>
              Generated images are kept in your browser for <strong style={{ color: '#fbbf24' }}>24 hours</strong> only.
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', margin: '0 0 20px' }}>
              Please <strong style={{ color: '#22d3ee' }}>download</strong> or <strong style={{ color: '#a78bfa' }}>save to profile</strong> any images you want to keep.
            </p>
            <button
              onClick={() => { setStorageNotice(false); localStorage.setItem(NOTICE_KEY, '1'); }}
              style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(236,72,153,0.3)', background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.1))', color: '#f472b6', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-12%', right: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,72,153,0.06),transparent 60%)', filter: 'blur(90px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-6%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,0.04),transparent 60%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.018, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.04) 3px,rgba(255,255,255,0.04) 4px)' }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3" style={{ position: 'relative', zIndex: 2, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 0 }}>
            <ArrowLeft size={16} />
          </button>
          <img src="/icon.png" alt="Starcyeed" style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0 }} />
          <span className="hidden sm:inline" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>starcyeed</span>
          <span className="hidden sm:inline" style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)' }}>/</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Type size={12} /> Ideogram
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.68)' }}>IDEOGRAM</span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]" style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 56px)' }}>

        {/* ────── LEFT: Prompt + Gallery ────── */}
        <div className="p-4 sm:p-6 md:border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>

          {/* Prompt area */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ padding: 1, borderRadius: 14, background: 'linear-gradient(135deg,rgba(236,72,153,0.40),rgba(168,85,247,0.25),rgba(6,182,212,0.20))' }}>
              <div style={{ borderRadius: 13, background: '#0a0a14', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                  <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div className="ideo-rainbow-glow" />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.75)' }}>PROMPT</span>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)', color: 'rgba(236,72,153,0.8)', marginLeft: 'auto' }}>
                    Best for logos & text
                  </span>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
                  placeholder="Describe the image you want to create... Ideogram excels at text, logos & typography"
                  rows={3}
                  maxLength={2000}
                  style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit', caretColor: '#ec4899' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 14, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 11, background: curStyle?.bg || 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', cursor: 'default', maxWidth: 130, overflow: 'hidden' }}>
                      <Layers size={11} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{curStyle?.name}</span>
                    </button>
                    <span style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.72)' }}>{curRatio.label}</span>
                    <button onClick={() => setSettings(!settings)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: settings ? '#ec4899' : 'rgba(255,255,255,0.6)' }}>
                      <Settings2 size={14} />
                    </button>
                  </div>
                  <button
                    data-ideogram-generate-btn
                    onClick={generate}
                    disabled={!prompt.trim() || generating}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none',
                      fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#fff', flexShrink: 0,
                      cursor: prompt.trim() && !generating ? 'pointer' : 'not-allowed',
                      opacity: !prompt.trim() && !generating ? 0.3 : 1,
                      background: generating ? 'rgba(236,72,153,0.12)' : 'linear-gradient(135deg,#ec4899,#a855f7)',
                      boxShadow: !generating && prompt.trim() ? '0 0 24px rgba(236,72,153,0.2)' : 'none',
                      transition: 'all 0.3s',
                    }}
                  >
                    {generating
                      ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />Generating...</>
                      : <><Zap size={14} />Generate · 2 cr</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings drawer */}
          {settings && (
            <div style={{ borderRadius: 12, padding: 16, marginBottom: 20, background: 'rgba(10,10,20,0.7)', border: '1px solid rgba(236,72,153,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.72)' }}>ADVANCED</span>
                <button onClick={() => setSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.62)' }}><X size={13} /></button>
              </div>

              {/* Model */}
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>MODEL</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {([['V_2_TURBO', '⚡ Turbo', 'Fast & good'], ['V_2', '✨ Quality', 'Best quality']] as const).map(([m, label, desc]) => (
                  <button key={m} onClick={() => setModel(m)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    border: model === m ? '1px solid rgba(236,72,153,0.50)' : '1px solid rgba(255,255,255,0.10)',
                    background: model === m ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.04)',
                    color: model === m ? '#f472b6' : 'rgba(255,255,255,0.7)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                  }}>
                    {label}<br /><span style={{ fontSize: 9, fontWeight: 400, opacity: 0.5 }}>{desc}</span>
                  </button>
                ))}
              </div>

              {/* Magic Prompt */}
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>MAGIC PROMPT</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {([['AUTO', '🔮 Auto'], ['ON', '✅ On'], ['OFF', '❌ Off']] as const).map(([m, label]) => (
                  <button key={m} onClick={() => setMagicPrompt(m)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    border: magicPrompt === m ? '1px solid rgba(168,85,247,0.50)' : '1px solid rgba(255,255,255,0.10)',
                    background: magicPrompt === m ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                    color: magicPrompt === m ? '#c084fc' : 'rgba(255,255,255,0.7)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Negative prompt + seed */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>NEGATIVE PROMPT</label>
                  <input
                    placeholder="blurry, low quality, watermark..."
                    value={negativePrompt}
                    onChange={e => setNegativePrompt(e.target.value)}
                    maxLength={1000}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>SEED</label>
                  <input
                    placeholder="Random"
                    value={seed}
                    onChange={e => setSeed(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Aspect Ratio */}
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>ASPECT RATIO</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {aspectRatios.map(r => (
                  <button key={r.id} onClick={() => setAspectRatio(r.id)} style={{
                    padding: '8px 10px', borderRadius: 8, minWidth: 60,
                    border: aspectRatio === r.id ? '1px solid rgba(236,72,153,0.50)' : '1px solid rgba(255,255,255,0.10)',
                    background: aspectRatio === r.id ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.04)',
                    color: aspectRatio === r.id ? '#f472b6' : 'rgba(255,255,255,0.7)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                  }}>
                    {r.label}<br /><span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(255,255,255,0.72)' }}>{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', padding: 2, display: 'flex' }}><X size={13} /></button>
            </div>
          )}

          {/* Active jobs indicator */}
          {activeJobs > 0 && (
            <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.12)', fontSize: 11, color: 'rgba(244,114,182,0.7)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
              {activeJobs} image{activeJobs > 1 ? 's' : ''} generating...
            </div>
          )}

          {/* Cold-start banner */}
          {generating && images[0]?.status === 'queued' && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)', fontSize: 11, color: 'rgba(251,191,36,0.7)' }}>
              ⏳ Ideogram generation may take 10-15 seconds. Hang tight!
            </div>
          )}

          {/* Gallery label */}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
            GENERATED · {images.length}
          </div>

          {/* Gallery grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {images.map(img => {
              const hov = hCard === img.id;
              return (
                <div
                  key={img.id}
                  className="ideo-card"
                  onMouseEnter={() => setHCard(img.id)}
                  onMouseLeave={() => setHCard(null)}
                  onTouchStart={(e) => { if (img.imageUrl) { e.stopPropagation(); setHCard(prev => prev === img.id ? null : img.id); } }}
                  onClick={() => { if (hCard !== img.id && img.imageUrl) return; setExpanded(img); }}
                  style={{
                    padding: 1, borderRadius: 12, cursor: 'pointer', transition: 'all 0.3s',
                    background: hov ? `linear-gradient(135deg,${img.c1}55,${img.c2}44)` : 'linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))',
                    boxShadow: hov ? `0 0 28px ${img.c1}20` : 'none',
                  }}
                >
                  <div style={{ borderRadius: 11, overflow: 'hidden', background: 'rgba(8,8,15,0.9)' }}>
                    <div style={{ position: 'relative', aspectRatio: '4/3', background: `linear-gradient(135deg,${img.c1}15,${img.c2}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {img.imageUrl ? (
                        <img src={img.imageUrl} alt={img.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: `radial-gradient(ellipse at 30% 40%,${img.c1}28,transparent 55%),radial-gradient(ellipse at 70% 60%,${img.c2}22,transparent 50%)` }} />
                          {img.status === 'failed' ? (
                            <X size={24} color="rgba(239,68,68,0.4)" />
                          ) : (
                            <RefreshCw size={24} color="rgba(236,72,153,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
                          )}
                        </>
                      )}
                      {img.kept && (
                        <div style={{ position: 'absolute', top: 6, right: 6, padding: '3px 7px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 3, zIndex: 2 }}>
                          <Check size={10} color="#10b981" />
                          <span style={{ fontSize: 9, fontWeight: 600, color: '#10b981' }}>KEPT</span>
                        </div>
                      )}
                      {img.imageUrl && (hCard === img.id) && (
                        <div className="ideo-card-overlay" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, background: 'rgba(3,3,8,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, padding: 8, zIndex: 3 }}>
                          <button onClick={(e) => handleKeep(img, e)} title={img.kept ? 'Unkeep' : 'Keep'} style={{ padding: 7, borderRadius: 7, background: img.kept ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${img.kept ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: img.kept ? '#10b981' : '#fff', cursor: 'pointer', display: 'flex', pointerEvents: 'auto' }}><Check size={14} /></button>
                          <button onClick={(e) => handleRegenerate(img, e)} title="Regenerate" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', pointerEvents: 'auto' }}><RotateCcw size={14} /></button>
                          <button onClick={(e) => handleTrash(img, e)} title="Trash" style={{ padding: 7, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', display: 'flex', pointerEvents: 'auto' }}><Trash2 size={14} /></button>
                          <button onClick={(e) => handleDownload(img, e)} title="Download" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', pointerEvents: 'auto' }}><Download size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleSaveToProfile(img, e); }} title={savedToProfile[img.id] ? 'Saved' : 'Save to Profile'} style={{ padding: 7, borderRadius: 7, background: savedToProfile[img.id] ? 'rgba(16,185,129,0.15)' : 'rgba(236,72,153,0.08)', border: `1px solid ${savedToProfile[img.id] ? 'rgba(16,185,129,0.3)' : 'rgba(236,72,153,0.15)'}`, color: savedToProfile[img.id] ? '#10b981' : '#f472b6', cursor: savingToProfile[img.id] ? 'wait' : 'pointer', display: 'flex', pointerEvents: 'auto', opacity: savingToProfile[img.id] ? 0.6 : 1 }}>{savedToProfile[img.id] ? <Check size={14} /> : <Layers size={14} />}</button>
                          <button onClick={(e) => { e.stopPropagation(); setExpanded(img); }} title="Expand" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', pointerEvents: 'auto' }}><Maximize2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '9px 11px' }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.prompt}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(236,72,153,0.08)', color: 'rgba(244,114,182,0.8)' }}>{img.style}</span>
                        {img.time != null && (
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.58)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} />{img.time.toFixed(1)}s</span>
                        )}
                        {img.status === 'failed' && (
                          <span style={{ fontSize: 9, color: 'rgba(239,68,68,0.5)' }}>Failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ────── RIGHT: Style Picker ────── */}
        <div className="p-4 sm:p-5" style={{ background: 'rgba(5,5,12,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Layers size={15} color="#f472b6" />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.75)' }}>STYLE</span>
            </div>
            <span style={{ fontSize: 9, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(236,72,153,0.35)', color: 'rgba(236,72,153,0.70)' }}>{ideogramStyles.length - 1} AVAILABLE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 20 }}>
            {ideogramStyles.map(s => {
              const active = styleType === s.id;
              const hover = hStyle === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStyleType(s.id)}
                  onMouseEnter={() => setHStyle(s.id)}
                  onMouseLeave={() => setHStyle(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 9,
                    border: active ? '1px solid rgba(236,72,153,0.35)' : '1px solid transparent',
                    background: active ? s.bg : hover ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: s.bg, border: active ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                    {s.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: active ? '#fff' : 'rgba(255,255,255,0.75)' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>
                  </div>
                  {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 6px rgba(236,72,153,0.5)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '18px 0' }} />

          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18, padding: '10px 0' }}>
            <img src="/icon.png" alt="Starcyeed" style={{ width: 28, height: 28, borderRadius: 7 }} />
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.85)' }}>starcyeed</span>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center', marginBottom: 18 }}>
            {[
              { l: 'Generated', v: images.length, i: <ImageIcon size={13} /> },
              { l: 'Avg Time', v: images.filter(i => i.time).length ? `${(images.filter(i => i.time).reduce((a, b) => a + (b.time || 0), 0) / images.filter(i => i.time).length).toFixed(1)}s` : '—', i: <Clock size={13} /> },
            ].map(s => (
              <div key={s.l}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3, color: 'rgba(255,255,255,0.35)' }}>{s.i}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{s.v}</div>
                <div style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.58)' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ borderRadius: 10, padding: 14, background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.14)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(236,72,153,0.65)', marginBottom: 7 }}>IDEOGRAM TIPS</div>
            {[
              'Ideogram excels at text rendering in images',
              'Use quotes for text: \'logo saying "HELLO"\'',
              'Great for logos, posters, typography art',
              'Magic Prompt enhances your prompt automatically',
              'DESIGN style is best for logos & graphics',
            ].map((t, i) => (
              <p key={i} style={{ fontSize: 11, lineHeight: 1.65, color: 'rgba(255,255,255,0.55)', margin: '0 0 1px' }}>• {t}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div onClick={() => setExpanded(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(3,3,8,0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ padding: 1, borderRadius: 14, background: `linear-gradient(135deg,${expanded.c1}66,${expanded.c2}44)`, maxWidth: 560, width: '100%', position: 'relative' }}>
            <div style={{ borderRadius: 13, background: '#08080f', overflow: 'hidden' }}>
              <div style={{ aspectRatio: '1/1', maxHeight: '50vh', background: `linear-gradient(135deg,${expanded.c1}12,${expanded.c2}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {expanded.imageUrl ? (
                  <img src={expanded.imageUrl} alt={expanded.prompt} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <ImageIcon size={36} color="rgba(255,255,255,0.05)" />
                )}
              </div>
              <div style={{ padding: 18 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{expanded.prompt}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(236,72,153,0.14)', border: '1px solid rgba(236,72,153,0.22)', color: 'rgba(236,72,153,0.70)' }}>{expanded.style}</span>
                  {expanded.time != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.62)' }}>{expanded.time.toFixed(1)}s</span>}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => handleKeep(expanded)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: expanded.kept ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${expanded.kept ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.14)'}`, color: expanded.kept ? '#10b981' : 'rgba(255,255,255,0.65)', cursor: 'pointer' }}
                  >
                    <Check size={12} />{expanded.kept ? 'Kept' : 'Keep'}
                  </button>
                  <button
                    onClick={() => handleRegenerate(expanded)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.12)', color: '#f472b6', cursor: 'pointer' }}
                  >
                    <RotateCcw size={12} />Redo
                  </button>
                  <button
                    onClick={() => handleTrash(expanded)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />Trash
                  </button>
                  <button
                    onClick={() => handleDownload(expanded)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.12)', color: '#22d3ee', cursor: 'pointer' }}
                  >
                    <Download size={12} />Download
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSaveToProfile(expanded); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: savedToProfile[expanded.id] ? 'rgba(16,185,129,0.1)' : 'rgba(236,72,153,0.08)', border: `1px solid ${savedToProfile[expanded.id] ? 'rgba(16,185,129,0.25)' : 'rgba(236,72,153,0.12)'}`, color: savedToProfile[expanded.id] ? '#10b981' : '#f472b6', cursor: savingToProfile[expanded.id] ? 'wait' : 'pointer', opacity: savingToProfile[expanded.id] ? 0.6 : 1 }}
                  >
                    {savedToProfile[expanded.id] ? <><Check size={12} />Saved</> : savingToProfile[expanded.id] ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : <><Layers size={12} />Save to Profile</>}
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => setExpanded(null)} style={{ position: 'absolute', top: 10, right: 10, padding: 5, borderRadius: 7, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes rainbowSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes rainbowPulse{0%,100%{opacity:1;filter:blur(4px) brightness(1.8)}50%{opacity:1;filter:blur(6px) brightness(2.2)}}
        .ideo-rainbow-glow{position:absolute;inset:-4px;border-radius:50%;z-index:0;overflow:hidden;animation:rainbowPulse 2s ease-in-out infinite}
        .ideo-rainbow-glow::before{content:'';position:absolute;inset:-50%;border-radius:50%;background:conic-gradient(from 0deg,#ec4899,#a855f7,#06b6d4,#ec4899);animation:rainbowSpin 2.5s linear infinite}
        .ideo-rainbow-glow::after{content:'';position:absolute;inset:2px;border-radius:50%;background:#0a0a14}
        .ideo-card:hover .ideo-card-overlay,.ideo-card.touched .ideo-card-overlay{opacity:1!important;pointer-events:auto!important}
        textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.48)}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(236,72,153,0.30);border-radius:2px}
        *{box-sizing:border-box;margin:0}
      `}</style>
    </div>
  );
}
