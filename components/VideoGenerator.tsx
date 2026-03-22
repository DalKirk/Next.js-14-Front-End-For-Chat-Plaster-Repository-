'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Layers, Clock, Download, Settings2, RefreshCw, X, Maximize2,
  ArrowLeft, Trash2, Check, RotateCcw, Play, Upload, Film, Video, Copy,
} from 'lucide-react';
import {
  generateVideo,
  pollVideoJob,
  getVideoResultUrl,
  type VideoJobResponse,
} from '@/services/video-generation.service';

/* ─── Duration & resolution presets ─── */
const durations = [
  { id: '1.4s', label: 'Short (1.4s)', frames: 33 },
  { id: '5s', label: 'Standard (5s)', frames: 121 },
  { id: '30s', label: '30 seconds', frames: 721 },
  { id: '1m', label: '1 minute', frames: 1441 },
  { id: '2.5m', label: '2.5 minutes', frames: 3601 },
];

const resolutions = [
  { id: '480p', label: 'Quick Draft', w: 832, h: 480 },
  { id: '720p', label: '720p Landscape', w: 1280, h: 704 },
  { id: 'portrait', label: 'Portrait', w: 704, h: 1280 },
];

/* ─── Generated video record ─── */
interface GeneratedVideo {
  id: string;
  prompt: string;
  mode: 't2v' | 'i2v' | 'smart';
  duration: string;
  resolution: string;
  time: string | null;
  videoUrl: string | null;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  error?: string;
  c1: string;
  c2: string;
  kept?: boolean;
  enhancedPrompt?: string | null;
}

const colorPairs = [
  ['#f59e0b', '#ef4444'], ['#ec4899', '#8b5cf6'], ['#06b6d4', '#10b981'],
  ['#7c3aed', '#06b6d4'], ['#f59e0b', '#ec4899'], ['#10b981', '#3b82f6'],
];

export default function VideoGenerator() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'t2v' | 'i2v' | 'smart'>('t2v');
  const [duration, setDuration] = useState('1.4s');
  const [resolution, setResolution] = useState('720p');
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [steps, setSteps] = useState(30);
  const [cfg, setCfg] = useState(5.0);
  const [seed, setSeed] = useState('');
  const [expanded, setExpanded] = useState<GeneratedVideo | null>(null);
  const [hCard, setHCard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const lastSubmitRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coldStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const curDuration = durations.find(d => d.id === duration) || durations[0];
  const curResolution = resolutions.find(r => r.id === resolution) || resolutions[0];

  const generate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    if (mode === 'i2v' && !uploadedImage) return;

    const now = Date.now();
    if (now - lastSubmitRef.current < 2000) return;
    lastSubmitRef.current = now;

    setGenerating(true);
    setError(null);
    setProgress(0);

    const ci = Math.floor(Math.random() * colorPairs.length);
    const tempId = `temp-${Date.now()}`;

    const newVid: GeneratedVideo = {
      id: tempId,
      prompt: prompt.trim(),
      mode,
      duration,
      resolution,
      time: null,
      videoUrl: null,
      status: 'queued',
      c1: colorPairs[ci][0],
      c2: colorPairs[ci][1],
    };
    setVideos(prev => [newVid, ...prev]);
    setActiveJobs(prev => prev + 1);
    setColdStart(false);

    try {
      const parsedSeed = seed ? parseInt(seed, 10) : null;
      const imageBase64 = mode === 'i2v' && uploadedImage
        ? uploadedImage.replace(/^data:image\/[^;]+;base64,/, '')
        : null;

      const job = await generateVideo({
        prompt: prompt.trim(),
        mode,
        image: imageBase64,
        width: curResolution.w,
        height: curResolution.h,
        numFrames: curDuration.frames,
        steps,
        guidanceScale: cfg,
        fps: 24,
        seed: Number.isNaN(parsedSeed) ? null : parsedSeed,
      });

      // Cold start detection: if progress stays 10-25% for >30s
      coldStartTimerRef.current = setTimeout(() => {
        setColdStart(true);
      }, 30000);

      /* Poll every 2s */
      pollRef.current = setInterval(async () => {
        try {
          const status: VideoJobResponse = await pollVideoJob(job.job_id);

          setProgress(status.progress);
          setProgressMsg(status.message);

          // Clear cold start timer once past 25%
          if (status.progress > 25 && coldStartTimerRef.current) {
            clearTimeout(coldStartTimerRef.current);
            coldStartTimerRef.current = null;
            setColdStart(false);
          }

          setVideos(prev =>
            prev.map(v =>
              v.id === tempId
                ? {
                    ...v,
                    status: status.status,
                    time: status.generation_time != null
                      ? `${status.generation_time.toFixed(1)}s`
                      : null,
                    videoUrl: status.status === 'complete' && status.video_url
                      ? getVideoResultUrl(job.job_id)
                      : null,
                    error: status.error ?? undefined,
                    enhancedPrompt: status.enhanced_prompt ?? undefined,
                  }
                : v,
            ),
          );

          if (status.status === 'complete' || status.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (coldStartTimerRef.current) clearTimeout(coldStartTimerRef.current);
            setActiveJobs(prev => Math.max(0, prev - 1));
            setProgress(0);
            setProgressMsg('');
            setColdStart(false);
            setTimeout(() => setGenerating(false), 3000);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          if (coldStartTimerRef.current) clearTimeout(coldStartTimerRef.current);
          setVideos(prev =>
            prev.map(v =>
              v.id === tempId ? { ...v, status: 'failed', error: 'Polling error' } : v,
            ),
          );
          setActiveJobs(prev => Math.max(0, prev - 1));
          setProgress(0);
          setProgressMsg('');
          setColdStart(false);
          setTimeout(() => setGenerating(false), 3000);
        }
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      setVideos(prev =>
        prev.map(v =>
          v.id === tempId ? { ...v, status: 'failed', error: msg } : v,
        ),
      );
      setActiveJobs(prev => Math.max(0, prev - 1));
      setProgress(0);
      setProgressMsg('');
      setGenerating(false);
    }
  }, [prompt, generating, mode, duration, resolution, uploadedImage, steps, cfg, seed, curDuration, curResolution]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (vid: GeneratedVideo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!vid.videoUrl) return;
    try {
      const res = await fetch(vid.videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `starcyeed-${vid.id}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const handleKeep = (vid: GeneratedVideo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, kept: !v.kept } : v));
    if (expanded?.id === vid.id) setExpanded(prev => prev ? { ...prev, kept: !prev.kept } : null);
  };

  const handleTrash = (vid: GeneratedVideo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVideos(prev => prev.filter(v => v.id !== vid.id));
    if (expanded?.id === vid.id) setExpanded(null);
  };

  const handleRegenerate = (vid: GeneratedVideo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVideos(prev => prev.filter(v => v.id !== vid.id));
    if (expanded?.id === vid.id) setExpanded(null);
    setPrompt(vid.prompt);
    // For i2v, fall back to t2v since we can't restore the source image
    setMode(vid.mode === 'i2v' ? 't2v' : vid.mode === 'smart' ? 't2v' : vid.mode);
    setDuration(vid.duration);
    setTimeout(() => {
      const btn = document.querySelector('[data-generate-btn]') as HTMLButtonElement | null;
      btn?.click();
    }, 100);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030308', color: '#e2e2e8', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-12%', right: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.06),transparent 60%)', filter: 'blur(90px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-6%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,72,153,0.04),transparent 60%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.015, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.04) 3px,rgba(255,255,255,0.04) 4px)' }} />
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3" style={{ position: 'relative', zIndex: 2, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}
          >
            <ArrowLeft size={16} />
          </button>
          <img src="/icon.png" alt="Starcyeed" style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0 }} />
          <span className="hidden sm:inline" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>starcyeed</span>
          <span className="hidden sm:inline" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Video Generation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)' }}>SERVER READY</span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]" style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 56px)' }}>

        {/* ────── LEFT: Prompt + Gallery ────── */}
        <div className="p-4 sm:p-6 md:border-r" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(6,182,212,0.15))', border: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={20} color="#a78bfa" />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>Video Generation</h1>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Text-to-Video, Image-to-Video & Smart AI</div>
            </div>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', marginBottom: 20, width: 'fit-content' }}>
            {([
              { id: 't2v' as const, label: 'Text to Video', icon: <Film size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> },
              { id: 'i2v' as const, label: 'Image to Video', icon: <Upload size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> },
              { id: 'smart' as const, label: 'Smart', icon: <Zap size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                  background: mode === tab.id ? 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(6,182,212,0.08))' : 'transparent',
                  color: mode === tab.id ? '#c084fc' : 'rgba(255,255,255,0.35)',
                  ...(mode === tab.id ? { border: '1px solid rgba(139,92,246,0.15)' } : {}),
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'smart' && <span style={{ fontSize: 9, marginLeft: 4, padding: '1px 5px', borderRadius: 4, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontWeight: 600 }}>AI</span>}
              </button>
            ))}
          </div>

          {/* Smart mode info banner */}
          {mode === 'smart' && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)', fontSize: 11, color: 'rgba(251,191,36,0.7)' }}>
              ✨ Smart mode: AI enhances your prompt, generates a starting frame, then animates it. Best for complex scenes. Uses 8 credits.
            </div>
          )}

          {/* Image upload (I2V mode) */}
          {mode === 'i2v' && !uploadedImage && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '1px dashed rgba(139,92,246,0.15)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16, cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(139,92,246,0.02)' }}
            >
              <Upload size={28} color="rgba(139,92,246,0.3)" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>Upload a source image</p>
              <small style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>PNG, JPG up to 10MB · This image will be animated</small>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          {mode === 'i2v' && uploadedImage && (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImage} alt="Preview" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
              <button onClick={removeImage} style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Prompt area */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ padding: 1, borderRadius: 14, background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(6,182,212,0.15),rgba(236,72,153,0.12))' }}>
              <div style={{ borderRadius: 13, background: '#0a0a14', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                  <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div className="video-rainbow-glow" />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>
                    {mode === 'i2v' ? 'DESCRIBE THE MOTION' : 'DESCRIBE YOUR VIDEO'}
                  </span>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
                  placeholder={mode === 'i2v' ? 'The person turns their head slowly and smiles...' : 'A majestic eagle soaring through mountain peaks at golden hour, cinematic drone shot...'}
                  rows={3}
                  style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit', caretColor: '#22d3ee' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 14, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}>{duration}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)' }}>{resolution}</span>
                    <button onClick={() => setSettings(!settings)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: settings ? '#22d3ee' : 'rgba(255,255,255,0.2)' }}>
                      <Settings2 size={14} />
                    </button>
                  </div>
                  <button
                    data-generate-btn
                    onClick={generate}
                    disabled={!prompt.trim() || generating || (mode === 'i2v' && !uploadedImage)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 9, border: 'none',
                      fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#fff', flexShrink: 0, fontFamily: 'inherit',
                      cursor: prompt.trim() && !generating ? 'pointer' : 'not-allowed',
                      opacity: !prompt.trim() && !generating ? 0.3 : 1,
                      background: generating ? 'rgba(139,92,246,0.12)' : 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                      boxShadow: !generating && prompt.trim() ? '0 0 24px rgba(139,92,246,0.2)' : 'none',
                      transition: 'all 0.3s',
                    }}
                  >
                    {generating
                      ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />Generating...</>
                      : <><Play size={14} />Generate</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings drawer */}
          {settings && (
            <div style={{ borderRadius: 12, padding: 16, marginBottom: 20, background: 'rgba(10,10,20,0.7)', border: '1px solid rgba(139,92,246,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)' }}>ADVANCED SETTINGS</span>
                <button onClick={() => setSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)' }}><X size={13} /></button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>STEPS (10–50)</label>
                  <input
                    type="number" value={steps}
                    onChange={e => setSteps(Math.min(50, Math.max(10, +e.target.value)))}
                    min={10} max={50}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>CFG SCALE ({cfg.toFixed(1)})</label>
                  <input
                    type="range" min={1} max={15} step={0.5}
                    value={cfg}
                    onChange={e => setCfg(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#7c3aed', marginTop: 8 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>SEED</label>
                  <input
                    placeholder="Random"
                    value={seed}
                    onChange={e => setSeed(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>RESOLUTION</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {resolutions.map(r => (
                    <button key={r.id} onClick={() => setResolution(r.id)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: resolution === r.id ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(255,255,255,0.04)',
                      background: resolution === r.id ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                      color: resolution === r.id ? '#c084fc' : 'rgba(255,255,255,0.3)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>DURATION</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {durations.map(d => (
                  <button key={d.id} onClick={() => setDuration(d.id)} style={{
                    padding: '8px 12px', borderRadius: 8,
                    border: duration === d.id ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(255,255,255,0.04)',
                    background: duration === d.id ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                    color: duration === d.id ? '#c084fc' : 'rgba(255,255,255,0.3)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}>
                    {d.label}
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
            <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)', fontSize: 11, color: 'rgba(167,139,250,0.7)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
              {activeJobs} video{activeJobs > 1 ? 's' : ''} generating...
            </div>
          )}

          {/* Progress bar */}
          {generating && progress > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>{progressMsg || 'Generating video...'}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', width: `${progress}%`, transition: 'width 0.3s' }} />
              </div>
              {/* Show AI-enhanced prompt in smart mode */}
              {videos[0]?.enhancedPrompt && (
                <div style={{ position: 'relative', marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)', fontSize: 11, color: 'rgba(251,191,36,0.6)' }}>
                  <button onClick={() => { navigator.clipboard.writeText(videos[0].enhancedPrompt!); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000); }} title="Copy enhanced prompt" style={{ position: 'absolute', top: 6, right: 6, padding: '3px 6px', borderRadius: 5, background: copiedPrompt ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.08)', border: `1px solid ${copiedPrompt ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.12)'}`, color: copiedPrompt ? '#10b981' : 'rgba(251,191,36,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.2s' }}>{copiedPrompt ? <><Check size={10} /><span style={{ fontSize: 9, fontWeight: 600 }}>Copied</span></> : <Copy size={11} />}</button>
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(251,191,36,0.4)', display: 'block', marginBottom: 3 }}>AI-ENHANCED PROMPT</span>
                  {videos[0].enhancedPrompt}
                </div>
              )}
            </div>
          )}

          {/* Cold-start banner */}
          {generating && coldStart && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)', fontSize: 11, color: 'rgba(251,191,36,0.7)' }}>
              ⏳ Warming up GPU... First request may take up to 3 min (cold start). Hang tight!
            </div>
          )}
          {generating && !coldStart && videos[0]?.status === 'queued' && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)', fontSize: 11, color: 'rgba(251,191,36,0.7)' }}>
              ⏳ Video generation typically takes 1-4 minutes depending on settings.
            </div>
          )}

          {/* Gallery label */}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
            GENERATED · {videos.length}
          </div>

          {/* Video cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {videos.map(vid => {
              const hov = hCard === vid.id;
              return (
                <div
                  key={vid.id}
                  onMouseEnter={() => setHCard(vid.id)}
                  onMouseLeave={() => setHCard(null)}
                  onClick={() => setExpanded(vid)}
                  style={{
                    padding: 1, borderRadius: 12, cursor: 'pointer', transition: 'all 0.3s',
                    background: hov ? `linear-gradient(135deg,${vid.c1}55,${vid.c2}44)` : 'linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))',
                    boxShadow: hov ? `0 0 28px ${vid.c1}20` : 'none',
                  }}
                >
                  <div style={{ borderRadius: 11, overflow: 'hidden', background: 'rgba(8,8,15,0.9)' }}>
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: `linear-gradient(135deg,${vid.c1}12,${vid.c2}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {vid.videoUrl ? (
                        <video src={vid.videoUrl} muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} onMouseEnter={e => (e.target as HTMLVideoElement).play()} onMouseLeave={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                      ) : (
                        <>
                          <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: `radial-gradient(ellipse at 30% 40%,${vid.c1}25,transparent 55%),radial-gradient(ellipse at 70% 60%,${vid.c2}20,transparent 50%)` }} />
                          {vid.status === 'failed' ? (
                            <X size={24} color="rgba(239,68,68,0.4)" />
                          ) : vid.status === 'queued' || vid.status === 'processing' ? (
                            <RefreshCw size={24} color="rgba(139,92,246,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Video size={24} color="rgba(255,255,255,0.06)" style={{ position: 'relative' }} />
                          )}
                        </>
                      )}
                      {vid.kept && (
                        <div style={{ position: 'absolute', top: 6, right: 6, padding: '3px 7px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 3, zIndex: 2 }}>
                          <Check size={10} color="#10b981" />
                          <span style={{ fontSize: 9, fontWeight: 600, color: '#10b981' }}>KEPT</span>
                        </div>
                      )}
                      {hov && vid.status === 'complete' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,3,8,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 2 }}>
                          <button onClick={(e) => handleKeep(vid, e)} title={vid.kept ? 'Unkeep' : 'Keep'} style={{ padding: 7, borderRadius: 7, background: vid.kept ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${vid.kept ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: vid.kept ? '#10b981' : '#fff', cursor: 'pointer', display: 'flex' }}><Check size={14} /></button>
                          <button onClick={(e) => handleRegenerate(vid, e)} title="Regenerate" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><RotateCcw size={14} /></button>
                          <button onClick={(e) => handleTrash(vid, e)} title="Trash" style={{ padding: 7, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
                          <button onClick={(e) => handleDownload(vid, e)} title="Download" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><Download size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setExpanded(vid); }} title="Expand" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><Maximize2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '9px 11px' }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vid.prompt}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: vid.mode === 'smart' ? 'rgba(251,191,36,0.08)' : 'rgba(139,92,246,0.06)', color: vid.mode === 'smart' ? '#fbbf24' : 'rgba(139,92,246,0.5)' }}>{vid.mode}{vid.mode === 'smart' && ' ✨'}</span>
                        {vid.time != null && (
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} />{vid.time}</span>
                        )}
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.16)' }}>{vid.duration}</span>
                        {vid.status === 'failed' && (
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

        {/* ────── RIGHT: Info Panel ────── */}
        <div className="p-4 sm:p-5" style={{ background: 'rgba(5,5,12,0.5)' }}>

          {/* Stats */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <Video size={14} color="#a78bfa" />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>GENERATION STATS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { l: 'Videos', v: videos.length },
                { l: 'Avg time', v: '~2m' },
                { l: 'Credits', v: mode === 'smart' ? '8' : '5' },
              ].map(s => (
                <div key={s.l} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{s.v}</div>
                  <div style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.16)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue status */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <Clock size={14} color="#a78bfa" />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>QUEUE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
              {activeJobs > 0 ? (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 4px rgba(167,139,250,0.4)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{activeJobs} job{activeJobs > 1 ? 's' : ''} processing</span>
                </>
              ) : (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 4px rgba(52,211,153,0.4)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>No jobs in queue</span>
                </>
              )}
            </div>
          </div>

          {/* Starcyeed branding */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '18px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18, padding: '10px 0' }}>
            <img src="/icon.png" alt="Starcyeed" style={{ width: 28, height: 28, borderRadius: 7 }} />
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.7)' }}>starcyeed</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', marginBottom: 18 }} />

          {/* Tips */}
          <div style={{ borderRadius: 10, padding: 14, background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.06)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(139,92,246,0.4)', marginBottom: 7 }}>VIDEO PROMPT TIPS</div>
            {[
              'Describe camera movement: "slow pan", "dolly zoom"',
              'Add motion cues: "wind blowing", "waves crashing"',
              'Specify mood: "cinematic", "dreamy", "dramatic"',
              'For I2V: describe what should move',
              'Keep prompts under 200 words for best results',
            ].map((t, i) => (
              <p key={i} style={{ fontSize: 11, lineHeight: 1.65, color: 'rgba(255,255,255,0.2)', margin: '0 0 1px' }}>• {t}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div onClick={() => setExpanded(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(3,3,8,0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ padding: 1, borderRadius: 14, background: `linear-gradient(135deg,${expanded.c1}66,${expanded.c2}44)`, maxWidth: 640, width: '100%', position: 'relative' }}>
            <div style={{ borderRadius: 13, background: '#08080f', overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16/9', maxHeight: '45vh', background: `linear-gradient(135deg,${expanded.c1}12,${expanded.c2}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {expanded.videoUrl ? (
                  <video src={expanded.videoUrl} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={24} fill="rgba(255,255,255,0.6)" color="rgba(255,255,255,0.6)" style={{ marginLeft: 3 }} />
                  </div>
                )}
              </div>
              <div style={{ padding: 18 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{expanded.prompt}</p>
                {expanded.enhancedPrompt && (
                  <div style={{ position: 'relative', marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)', fontSize: 11, color: 'rgba(251,191,36,0.55)' }}>
                    <button onClick={() => { navigator.clipboard.writeText(expanded.enhancedPrompt!); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000); }} title="Copy enhanced prompt" style={{ position: 'absolute', top: 6, right: 6, padding: '3px 6px', borderRadius: 5, background: copiedPrompt ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.08)', border: `1px solid ${copiedPrompt ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.12)'}`, color: copiedPrompt ? '#10b981' : 'rgba(251,191,36,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.2s' }}>{copiedPrompt ? <><Check size={10} /><span style={{ fontSize: 9, fontWeight: 600 }}>Copied</span></> : <Copy size={11} />}</button>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(251,191,36,0.4)', display: 'block', marginBottom: 3 }}>AI-ENHANCED PROMPT</span>
                    {expanded.enhancedPrompt}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: expanded.mode === 'smart' ? 'rgba(251,191,36,0.08)' : 'rgba(139,92,246,0.08)', border: `1px solid ${expanded.mode === 'smart' ? 'rgba(251,191,36,0.15)' : 'rgba(139,92,246,0.1)'}`, color: expanded.mode === 'smart' ? '#fbbf24' : 'rgba(139,92,246,0.5)' }}>{expanded.mode}{expanded.mode === 'smart' && ' ✨'}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)' }}>{expanded.duration}</span>
                  {expanded.time != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{expanded.time}</span>}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => handleKeep(expanded)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: expanded.kept ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${expanded.kept ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`, color: expanded.kept ? '#10b981' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    <Check size={12} />{expanded.kept ? 'Kept' : 'Keep'}
                  </button>
                  <button
                    onClick={() => handleRegenerate(expanded)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)', color: '#a78bfa', cursor: 'pointer' }}
                  >
                    <RotateCcw size={12} />Regenerate
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
                </div>
              </div>
            </div>
            <button onClick={() => setExpanded(null)} style={{ position: 'absolute', top: 10, right: 10, padding: 5, borderRadius: 7, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes rainbowSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes rainbowPulse{0%,100%{opacity:1;filter:blur(4px) brightness(1.8)}50%{opacity:1;filter:blur(6px) brightness(2.2)}}
        .video-rainbow-glow{position:absolute;inset:-4px;border-radius:50%;z-index:0;overflow:hidden;animation:rainbowPulse 2s ease-in-out infinite}
        .video-rainbow-glow::before{content:'';position:absolute;inset:-50%;border-radius:50%;background:conic-gradient(from 0deg,#ff3333,#ffaa00,#33ff66,#00ddff,#aa66ff,#ff44aa,#ff3333);animation:rainbowSpin 2.5s linear infinite}
        .video-rainbow-glow::after{content:'';position:absolute;inset:2px;border-radius:50%;background:#0a0a14}
        textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.16)}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.15);border-radius:2px}
        *{box-sizing:border-box;margin:0}
      `}</style>
    </div>
  );
}
