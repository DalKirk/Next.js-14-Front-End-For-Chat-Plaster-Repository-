'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Zap, Layers, Image as ImageIcon, Clock, Download, Wand2,
  Settings2, ChevronDown, RefreshCw, X, Maximize2, Copy, ArrowLeft,
  Trash2, Check, RotateCcw,
} from 'lucide-react';
import {
  generateImage,
  pollImageJob,
  getImageResultUrl,
  type ImageJobResponse,
} from '@/services/image-generation.service';

/* ─── Style presets ─── */
const allStyles = [
  { id: 'none', name: 'No Style', desc: 'Raw output', emoji: '—', bg: 'rgba(255,255,255,0.06)', promptPrefix: '', promptSuffix: '' },
  { id: 'photorealistic', name: 'Photorealistic', desc: 'Ultra-realistic', emoji: '📷', bg: 'rgba(6,182,212,0.12)', image: '/styles/photorealistic.png', promptPrefix: 'ultra realistic photograph, 8K UHD, DSLR camera, sharp focus, high detail, natural lighting, photographic, real life,', promptSuffix: ', NOT a painting, NOT illustrated, NOT canvas texture, photorealism only' },
  { id: 'anime', name: 'Anime', desc: 'Japanese animation', emoji: '🎌', bg: 'rgba(236,72,153,0.12)', image: '/styles/anime.png', promptPrefix: 'anime artwork, studio ghibli style, cel shading, vibrant flat colors, manga illustration, clean lineart, anime key visual, digital art,', promptSuffix: ', NOT oil painting, NOT canvas, NOT realistic, clean digital anime style only' },
  { id: 'oil-painting', name: 'Oil Painting', desc: 'Classical fine art', emoji: '🎨', bg: 'rgba(245,158,11,0.12)', image: '/styles/oil-painting.png', promptPrefix: 'oil painting on canvas, thick impasto brushstrokes, classical fine art, rich pigments, museum quality, painterly texture, visible brush marks,', promptSuffix: ', traditional oil painting on canvas' },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon futurism', emoji: '🌆', bg: 'rgba(139,92,246,0.12)', image: '/styles/cyberpunk.png', promptPrefix: 'cyberpunk digital art, neon lights, futuristic, holographic, glowing edges, dark atmosphere, rain-soaked streets, synthwave colors, blade runner aesthetic, digital illustration,', promptSuffix: ', NOT a painting, NOT canvas, NOT oil paint, clean digital cyberpunk render' },
  { id: 'watercolor', name: 'Watercolor', desc: 'Soft pigments', emoji: '💧', bg: 'rgba(59,130,246,0.12)', image: '/styles/watercolor.png', promptPrefix: 'watercolor painting on white paper, soft pigments bleeding into wet paper, delicate washes, translucent layers, artistic splashes, pastel tones, watercolour,', promptSuffix: ', NOT oil painting, NOT canvas texture, watercolor on paper only' },
  { id: 'pixel-art', name: 'Pixel Art', desc: 'Retro 8-bit', emoji: '👾', bg: 'rgba(16,185,129,0.12)', promptPrefix: 'pixel art, 16-bit retro video game sprite, limited color palette, pixelated, crisp square pixels, nostalgic, no anti-aliasing, retro game screenshot,', promptSuffix: ', NOT a painting, NOT smooth, NOT realistic, pure pixel art only' },
  { id: '3d-render', name: '3D Render', desc: 'Clean CGI', emoji: '💎', bg: 'rgba(168,85,247,0.12)', promptPrefix: '3D render, octane render, blender cycles, smooth shading, subsurface scattering, volumetric lighting, ray traced, clean CGI, studio lighting, unreal engine 5,', promptSuffix: ', NOT a painting, NOT canvas, NOT brushstrokes, clean 3D CGI render only' },
  { id: 'comic', name: 'Comic Book', desc: 'Bold halftone', emoji: '💥', bg: 'rgba(239,68,68,0.12)', image: '/styles/comic.png', promptPrefix: 'comic book art, bold black outlines, halftone dots, flat cel-shaded colors, dynamic composition, pop art, inked illustration, marvel DC style,', promptSuffix: ', NOT oil painting, NOT canvas, NOT realistic, flat comic book colors only' },
  { id: 'cinematic', name: 'Cinematic', desc: 'Film grading', emoji: '🎬', bg: 'rgba(251,191,36,0.12)', promptPrefix: 'cinematic film still, anamorphic lens, dramatic lighting, shallow depth of field, color graded, movie scene, 35mm film grain, widescreen, photographic,', promptSuffix: ', NOT a painting, NOT canvas, NOT illustrated, photographic cinematic still only' },
  { id: 'sketch', name: 'Pencil Sketch', desc: 'Hand-drawn', emoji: '✏️', bg: 'rgba(255,255,255,0.06)', image: '/styles/sketch.png', promptPrefix: 'pencil sketch on white paper, graphite drawing, hand-drawn, cross-hatching shading, detailed linework, charcoal, black and white, monochrome,', promptSuffix: ', NOT a painting, NOT color, NOT canvas, black and white pencil drawing only' },
  { id: 'neon', name: 'Neon Glow', desc: 'Vivid lights', emoji: '✨', bg: 'rgba(236,72,153,0.15)', image: '/styles/neon.png', promptPrefix: 'neon glow effect, glowing neon tube lights, pure black background, vivid electric colors, light trails, fluorescent, blacklight, luminescent, digital art,', promptSuffix: ', NOT oil painting, NOT canvas texture, NOT brushstrokes, clean glowing neon on black background only' },
];

const ratios = [
  { id: '1:1', desc: 'Square', w: 1024, h: 1024 },
  { id: '16:9', desc: 'Wide', w: 1024, h: 576 },
  { id: '9:16', desc: 'Tall', w: 576, h: 1024 },
  { id: '4:3', desc: 'Classic', w: 1024, h: 768 },
];

/* ─── Generated image record ─── */
interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  time: number | null;
  imageUrl: string | null;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  error?: string;
  c1: string;
  c2: string;
  kept?: boolean;
}

export default function ImageGenerator() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('none');
  const [ratio, setRatio] = useState('1:1');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [steps, setSteps] = useState(28);
  const [guidance, setGuidance] = useState(7.0);
  const [model, setModel] = useState<'dev' | 'schnell'>('dev');
  const [seed, setSeed] = useState('');
  const [expanded, setExpanded] = useState<GeneratedImage | null>(null);
  const [hCard, setHCard] = useState<string | null>(null);
  const [hStyle, setHStyle] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cur = allStyles.find(s => s.id === style);
  const curRatio = ratios.find(r => r.id === ratio) || ratios[0];

  const handleModelChange = (m: 'dev' | 'schnell') => {
    setModel(m);
    if (m === 'schnell') {
      setSteps(4);
      setGuidance(0);
    } else {
      setSteps(28);
      setGuidance(7.0);
    }
  };

  /* Build final prompt with style prefix */
  const buildPrompt = (raw: string, styleId: string): string => {
    if (styleId === 'none') return raw;
    const s = allStyles.find(x => x.id === styleId);
    if (!s || !s.promptPrefix) return raw;
    return `${s.promptPrefix} ${raw}${s.promptSuffix || ''}`;
  };

  const generate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);

    const h1 = Math.floor(Math.random() * 360);
    const h2 = Math.floor(Math.random() * 360);
    const tempId = `temp-${Date.now()}`;

    const newImg: GeneratedImage = {
      id: tempId,
      prompt: prompt.trim(),
      style,
      time: null,
      imageUrl: null,
      status: 'queued',
      c1: `hsl(${h1},60%,45%)`,
      c2: `hsl(${h2},60%,45%)`,
    };
    setImages(prev => [newImg, ...prev]);

    try {
      const finalPrompt = buildPrompt(prompt.trim(), style);
      const parsedSeed = seed ? parseInt(seed, 10) : null;
      const { job_id } = await generateImage({
        prompt: finalPrompt,
        model,
        width: curRatio.w,
        height: curRatio.h,
        steps,
        guidance,
        seed: Number.isNaN(parsedSeed) ? null : parsedSeed,
      });

      /* Poll every 2s */
      pollRef.current = setInterval(async () => {
        try {
          const job: ImageJobResponse = await pollImageJob(job_id);

          setImages(prev =>
            prev.map(img =>
              img.id === tempId
                ? {
                    ...img,
                    status: job.status,
                    time: job.generation_time ?? null,
                    imageUrl: job.status === 'complete' ? getImageResultUrl(job_id) : null,
                    error: job.error,
                  }
                : img,
            ),
          );

          if (job.status === 'complete' || job.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setGenerating(false);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setImages(prev =>
            prev.map(img =>
              img.id === tempId ? { ...img, status: 'failed', error: 'Polling error' } : img,
            ),
          );
          setGenerating(false);
        }
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setImages(prev =>
        prev.map(img =>
          img.id === tempId ? { ...img, status: 'failed', error: msg } : img,
        ),
      );
      setGenerating(false);
    }
  }, [prompt, generating, style, ratio, steps, guidance, model, seed, curRatio]);

  const handleDownload = async (img: GeneratedImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!img.imageUrl) return;
    try {
      const res = await fetch(img.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `starcyeed-${img.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
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
    setStyle(img.style);
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
        <div style={{ position: 'absolute', inset: 0, opacity: 0.018, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.04) 3px,rgba(255,255,255,0.04) 4px)' }} />
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
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Image Generation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)' }}>SERVER READY</span>
        </div>
      </div>

      {/* Main grid — stacks on mobile, side-by-side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]" style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 56px)' }}>

        {/* ────── LEFT: Prompt + Gallery ────── */}
        <div className="p-4 sm:p-6 md:border-r" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>

          {/* Prompt area */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ padding: 1, borderRadius: 14, background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(6,182,212,0.15),rgba(236,72,153,0.12))' }}>
              <div style={{ borderRadius: 13, background: '#0a0a14', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Sparkles size={14} color="#a78bfa" />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>PROMPT</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
                  placeholder="Describe the image you want to create..."
                  rows={3}
                  style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit', caretColor: '#22d3ee' }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 14, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 11, background: cur?.bg || 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                      <Layers size={11} />{cur?.name}<ChevronDown size={10} />
                    </button>
                    <span style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>{ratio}</span>
                    <button onClick={() => setSettings(!settings)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: settings ? '#22d3ee' : 'rgba(255,255,255,0.2)' }}>
                      <Settings2 size={14} />
                    </button>
                  </div>
                  <button
                    data-generate-btn
                    onClick={generate}
                    disabled={!prompt.trim() || generating}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none',
                      fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#fff', flexShrink: 0,
                      cursor: prompt.trim() && !generating ? 'pointer' : 'not-allowed',
                      opacity: !prompt.trim() && !generating ? 0.3 : 1,
                      background: generating ? 'rgba(139,92,246,0.12)' : 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                      boxShadow: !generating && prompt.trim() ? '0 0 24px rgba(139,92,246,0.2)' : 'none',
                      transition: 'all 0.3s',
                    }}
                  >
                    {generating
                      ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />Generating...</>
                      : <><Zap size={14} />Generate</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings drawer */}
          {settings && (
            <div style={{ borderRadius: 12, padding: 16, marginBottom: 20, background: 'rgba(10,10,20,0.7)', border: '1px solid rgba(139,92,246,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)' }}>ADVANCED</span>
                <button onClick={() => setSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)' }}><X size={13} /></button>
              </div>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>MODEL</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {(['dev', 'schnell'] as const).map(m => (
                  <button key={m} onClick={() => handleModelChange(m)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    border: model === m ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(255,255,255,0.04)',
                    background: model === m ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                    color: model === m ? '#c084fc' : 'rgba(255,255,255,0.3)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                  }}>
                    {m === 'dev' ? '🎨 Dev (Quality)' : '⚡ Schnell (Fast)'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>STEPS (1–50)</label>
                  <input
                    type="number" value={steps}
                    onChange={e => setSteps(Math.min(50, Math.max(1, +e.target.value)))}
                    min={1} max={50}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>GUIDANCE ({guidance.toFixed(1)})</label>
                  <input
                    type="range" min={0} max={20} step={0.5}
                    value={guidance}
                    onChange={e => setGuidance(parseFloat(e.target.value))}
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
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>ASPECT RATIO</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {ratios.map(r => (
                  <button key={r.id} onClick={() => setRatio(r.id)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    border: ratio === r.id ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(255,255,255,0.04)',
                    background: ratio === r.id ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                    color: ratio === r.id ? '#c084fc' : 'rgba(255,255,255,0.3)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                  }}>
                    {r.id}<br /><span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(255,255,255,0.2)' }}>{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cold-start banner */}
          {generating && images[0]?.status === 'queued' && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)', fontSize: 11, color: 'rgba(251,191,36,0.7)' }}>
              ⏳ First request may take up to 4 min (GPU cold start). Hang tight!
            </div>
          )}

          {/* Gallery label */}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
            GENERATED · {images.length}
          </div>

          {/* Loading skeleton */}
          {generating && (
            <div style={{ padding: 1, borderRadius: 12, marginBottom: 12, background: 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(6,182,212,0.2))', backgroundSize: '200% 200%', animation: 'shimmer 2s ease infinite' }}>
              <div style={{ borderRadius: 11, padding: 14, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(8,8,15,0.95)' }}>
                <div style={{ width: 52, height: 52, borderRadius: 8, background: 'rgba(139,92,246,0.07)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.05)', width: '60%', marginBottom: 7 }} />
                  <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.03)', width: '35%' }} />
                </div>
                <RefreshCw size={16} color="rgba(139,92,246,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            </div>
          )}

          {/* Cards — 2 cols mobile, 3 on md, 4 on lg like chat rooms */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {images.map(img => {
              const hov = hCard === img.id;
              return (
                <div
                  key={img.id}
                  onMouseEnter={() => setHCard(img.id)}
                  onMouseLeave={() => setHCard(null)}
                  onClick={() => setExpanded(img)}
                  style={{
                    padding: 1, borderRadius: 12, cursor: 'pointer', transition: 'all 0.3s',
                    background: hov ? `linear-gradient(135deg,${img.c1}55,${img.c2}44)` : 'linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))',
                    boxShadow: hov ? `0 0 28px ${img.c1}20` : 'none',
                  }}
                >
                  <div style={{ borderRadius: 11, overflow: 'hidden', background: 'rgba(8,8,15,0.9)' }}>
                    <div style={{ position: 'relative', aspectRatio: '4/3', background: `linear-gradient(135deg,${img.c1}15,${img.c2}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {img.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.imageUrl} alt={img.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: `radial-gradient(ellipse at 30% 40%,${img.c1}28,transparent 55%),radial-gradient(ellipse at 70% 60%,${img.c2}22,transparent 50%)` }} />
                          {img.status === 'failed' ? (
                            <X size={24} color="rgba(239,68,68,0.4)" />
                          ) : img.status === 'queued' || img.status === 'processing' ? (
                            <RefreshCw size={24} color="rgba(139,92,246,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <ImageIcon size={24} color="rgba(255,255,255,0.05)" style={{ position: 'relative' }} />
                          )}
                        </>
                      )}
                      {img.kept && (
                        <div style={{ position: 'absolute', top: 6, right: 6, padding: '3px 7px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 3, zIndex: 2 }}>
                          <Check size={10} color="#10b981" />
                          <span style={{ fontSize: 9, fontWeight: 600, color: '#10b981' }}>KEPT</span>
                        </div>
                      )}
                      {hov && img.imageUrl && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,3,8,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button onClick={(e) => handleKeep(img, e)} title={img.kept ? 'Unkeep' : 'Keep'} style={{ padding: 7, borderRadius: 7, background: img.kept ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${img.kept ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: img.kept ? '#10b981' : '#fff', cursor: 'pointer', display: 'flex' }}><Check size={14} /></button>
                          <button onClick={(e) => handleRegenerate(img, e)} title="Regenerate (trash & redo)" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><RotateCcw size={14} /></button>
                          <button onClick={(e) => handleTrash(img, e)} title="Trash" style={{ padding: 7, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
                          <button onClick={(e) => handleDownload(img, e)} title="Download" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><Download size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setExpanded(img); }} title="Expand" style={{ padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><Maximize2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '9px 11px' }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.prompt}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.22)' }}>{img.style}</span>
                        {img.time != null && (
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} />{img.time.toFixed(1)}s</span>
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

        {/* ────── RIGHT: Style Picker (collapsible on mobile) ────── */}
        <div className="p-4 sm:p-5" style={{ background: 'rgba(5,5,12,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Layers size={15} color="#a78bfa" />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>STYLE</span>
            </div>
            <span style={{ fontSize: 9, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(139,92,246,0.5)' }}>{allStyles.length - 1} AVAILABLE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', paddingRight: 4 }}>
            {allStyles.map(s => {
              const active = style === s.id;
              const hover = hStyle === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  onMouseEnter={() => setHStyle(s.id)}
                  onMouseLeave={() => setHStyle(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 9,
                    border: active ? '1px solid rgba(139,92,246,0.22)' : '1px solid transparent',
                    background: active ? s.bg : hover ? 'rgba(255,255,255,0.02)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: s.bg, border: active ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)', flexShrink: 0 }}>
                    {'image' in s && s.image ? <img src={s.image} alt={s.name} style={{ width: 28, height: 28, borderRadius: 5, objectFit: 'cover' }} /> : s.emoji === '—' ? <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11 }}>—</span> : s.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</div>
                  </div>
                  {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px rgba(34,211,238,0.5)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '18px 0' }} />

          {/* Starcyeed branding */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18, padding: '10px 0' }}>
            <img src="/icon.png" alt="Starcyeed" style={{ width: 28, height: 28, borderRadius: 7 }} />
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.7)' }}>starcyeed</span>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center', marginBottom: 18 }}>
            {[
              { l: 'Generated', v: images.length, i: <ImageIcon size={13} /> },
              { l: 'Avg Time', v: images.filter(i => i.time).length ? `${(images.filter(i => i.time).reduce((a, b) => a + (b.time || 0), 0) / images.filter(i => i.time).length).toFixed(1)}s` : '—', i: <Clock size={13} /> },
            ].map(s => (
              <div key={s.l}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3, color: 'rgba(255,255,255,0.1)' }}>{s.i}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{s.v}</div>
                <div style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.16)' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ borderRadius: 10, padding: 14, background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.06)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(139,92,246,0.4)', marginBottom: 7 }}>PROMPT TIPS</div>
            {[
              'Be specific with details, lighting, mood',
              '"cinematic lighting" adds drama',
              'Combine: "oil painting of a cyberpunk city"',
              '"8K, detailed, sharp focus" boosts fidelity',
            ].map((t, i) => (
              <p key={i} style={{ fontSize: 11, lineHeight: 1.65, color: 'rgba(255,255,255,0.22)', margin: '0 0 1px' }}>• {t}</p>
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={expanded.imageUrl} alt={expanded.prompt} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <ImageIcon size={36} color="rgba(255,255,255,0.05)" />
                )}
              </div>
              <div style={{ padding: 18 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{expanded.prompt}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.1)', color: 'rgba(139,92,246,0.5)' }}>{expanded.style}</span>
                  {expanded.time != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{expanded.time.toFixed(1)}s</span>}
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
            <button onClick={() => setExpanded(null)} style={{ position: 'absolute', top: 10, right: 10, padding: 5, borderRadius: 7, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={15} /></button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.16)}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.15);border-radius:2px}
        *{box-sizing:border-box;margin:0}
      `}</style>
    </div>
  );
}
