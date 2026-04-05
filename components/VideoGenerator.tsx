'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Layers, Clock, Download, Settings2, RefreshCw, X, Maximize2,
  ArrowLeft, Trash2, Check, RotateCcw, Play, Upload, Film, Video, Copy,
  Mic, User, Image as ImageIcon, Plus,
} from 'lucide-react';
import {
  generateVideo,
  generateSkyReelVideo,
  generateAvatarVideo,
  pollVideoJob,
  getVideoResultUrl,
  type VideoJobResponse,
  type VideoModel,
} from '@/services/video-generation.service';
import { apiClient } from '@/lib/api';
import { StorageUtils } from '@/lib/storage-utils';

/* ─── Model definitions ─── */
type WanMode = 't2v' | 'i2v' | 'smart';
type LtxMode = 't2v' | 'i2v' | 'v2v';
type SkyReelMode = 'ref2video';
type AvatarMode = 'avatar';
type VideoMode = WanMode | LtxMode | SkyReelMode | AvatarMode;

const MODEL_CONFIG = {
  wan: {
    name: 'WAN 2.2',
    sub: 'Realistic humans · Cinematic · 5B',
    modes: ['t2v', 'i2v', 'smart'] as WanMode[],
    defaultSteps: 30,
    defaultGuidance: 6.5,
    creditCost: { t2v: 5, i2v: 5, smart: 8 } as Record<string, number>,
    supportsNegativePrompt: false,
  },
  ltx: {
    name: 'LTX-Video',
    sub: 'Fast · Up to 1080p · V2V · 13B',
    modes: ['t2v', 'i2v', 'v2v'] as LtxMode[],
    defaultSteps: 30,
    defaultGuidance: 7.5,
    creditCost: { t2v: 5, i2v: 5, v2v: 6 } as Record<string, number>,
    supportsNegativePrompt: true,
  },
  skyreel: {
    name: 'SkyReels V3',
    sub: 'Reference-to-Video · Character consistency · 14B',
    modes: ['ref2video'] as SkyReelMode[],
    defaultSteps: 8,
    defaultGuidance: 1.0,
    creditCost: { ref2video: 8 } as Record<string, number>,
    supportsNegativePrompt: true,
  },
  avatar: {
    name: 'Talking Avatar',
    sub: 'Portrait + Audio → Lip-synced video · 19B',
    modes: ['avatar'] as AvatarMode[],
    defaultSteps: 40,
    defaultGuidance: 5.0,
    creditCost: { avatar: 12 } as Record<string, number>,
    supportsNegativePrompt: false,
  },
} as const;

/* ─── Duration presets per model ─── */
const FRAME_PRESETS: Record<string, { id: string; label: string; frames: number }[]> = {
  wan: [
    { id: '1.4s', label: 'Short (1.4s)', frames: 33 },
    { id: '3.4s', label: 'Medium (3.4s)', frames: 81 },
    { id: '5s', label: 'Standard (5s)', frames: 121 },
    { id: '10s', label: 'Long (10s)', frames: 241 },
    { id: '15s', label: 'Max (15s)', frames: 361 },
  ],
  ltx: [
    { id: '1s', label: 'Quick (1s)', frames: 25 },
    { id: '2s', label: 'Short (2s)', frames: 49 },
    { id: '4s', label: 'Medium (4s)', frames: 97 },
    { id: '5s', label: 'Standard (5s)', frames: 121 },
    { id: '8s', label: 'Long (8s)', frames: 193 },
    { id: '10.7s', label: 'Max (10.7s)', frames: 257 },
  ],
  skyreel: [
    { id: '3s', label: 'Quick (3s)', frames: 3 },
    { id: '5s', label: 'Standard (5s)', frames: 5 },
    { id: '7s', label: 'Long (7s)', frames: 7 },
    { id: '10s', label: 'Max (10s)', frames: 10 },
  ],
  avatar: [
    { id: 'auto', label: 'Match audio length', frames: 0 },
  ],
};

/* ─── Resolution presets (WAN fixed, LTX selectable, SkyReels/Avatar selectable) ─── */
const WAN_RESOLUTION = { w: 1280, h: 704 };

const LTX_RESOLUTIONS = [
  { id: '480p', label: '480p', w: 832, h: 480 },
  { id: '720p', label: '720p', w: 1280, h: 720 },
  { id: '1080p', label: '1080p', w: 1920, h: 1088 },
];

const SKYREEL_RESOLUTIONS = [
  { id: '480P', label: '480P' },
  { id: '540P', label: '540P' },
  { id: '720P', label: '720P' },
];

const AVATAR_RESOLUTIONS = [
  { id: '480P', label: '480P' },
  { id: '720P', label: '720P' },
];

/* ─── Generated video record ─── */
interface GeneratedVideo {
  id: string;
  prompt: string;
  model: VideoModel;
  mode: string;
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

const VIDEO_STORAGE_KEY = 'starcyeed-generated-videos';
const VIDEO_STORAGE_NOTICE_KEY = 'starcyeed-video-storage-notice-seen';
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function VideoGenerator() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<VideoModel>('wan');
  const [mode, setMode] = useState<VideoMode>('t2v');
  const [duration, setDuration] = useState('1.4s');
  const [resolution, setResolution] = useState('720p');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [v2vStrength, setV2vStrength] = useState(0.7);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [storageNotice, setStorageNotice] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [steps, setSteps] = useState(30);
  const [cfg, setCfg] = useState(6.5);
  const [seed, setSeed] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<GeneratedVideo | null>(null);
  const [hCard, setHCard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [portraitImage, setPortraitImage] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [guidanceScaleImg, setGuidanceScaleImg] = useState(1.0);
  const [avatarResolution, setAvatarResolution] = useState('480P');
  const [skyreelResolution, setSkyreelResolution] = useState('720P');
  const [samplingSteps, setSamplingSteps] = useState(40);
  const [textGuideScale, setTextGuideScale] = useState(5.0);
  const [audioGuideScale, setAudioGuideScale] = useState(4.0);
  const [savingToProfile, setSavingToProfile] = useState<Record<string, boolean>>({});
  const [savedToProfile, setSavedToProfile] = useState<Record<string, boolean>>({});
  const videoElRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastSubmitRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coldStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const modelCfg = MODEL_CONFIG[model];
  const framePresets = FRAME_PRESETS[model] || FRAME_PRESETS.wan;
  const curDuration = framePresets.find(d => d.id === duration) || framePresets[0];
  const curLtxRes = LTX_RESOLUTIONS.find(r => r.id === resolution) || LTX_RESOLUTIONS[1];
  const creditCost = modelCfg.creditCost[mode] ?? 5;

  // Reset mode, duration, and settings when model changes
  const switchModel = (m: VideoModel) => {
    setModel(m);
    const cfg = MODEL_CONFIG[m];
    setMode(cfg.modes[0] as VideoMode);
    const presets = FRAME_PRESETS[m] || FRAME_PRESETS.wan;
    setDuration(presets[0].id);
    setSteps(cfg.defaultSteps);
    setCfg(cfg.defaultGuidance);
    setNegativePrompt('');
    setUploadedVideo(null);
    setResolution('720p');
    if (m === 'skyreel') setSkyreelResolution('720P');
    if (m === 'avatar') setAvatarResolution('480P');
  };

  const generate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    if (mode === 'i2v' && !uploadedImage) return;
    if (mode === 'v2v' && !uploadedVideo) return;
    if (mode === 'ref2video' && refImages.length === 0) return;
    if (mode === 'avatar' && (!portraitImage || !audioFile)) return;

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
      model,
      mode,
      duration,
      resolution: model === 'skyreel' ? skyreelResolution : model === 'avatar' ? avatarResolution : resolution,
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
      const safeSeed = Number.isNaN(parsedSeed) ? null : parsedSeed;

      let job: VideoJobResponse;

      if (model === 'skyreel') {
        const refImagesBase64 = refImages.map(img => img.replace(/^data:image\/[^;]+;base64,/, ''));
        job = await generateSkyReelVideo({
          prompt: prompt.trim(),
          refImages: refImagesBase64,
          duration: curDuration.frames, // For skyreel, frames field stores duration in seconds
          resolution: skyreelResolution as '480P' | '540P' | '720P',
          steps,
          guidanceScale: cfg,
          guidanceScaleImg,
          negativePrompt: negativePrompt || '',
          seed: safeSeed,
        });
      } else if (model === 'avatar') {
        const portraitBase64 = portraitImage!.replace(/^data:image\/[^;]+;base64,/, '');
        const audioBase64 = audioFile!.replace(/^data:audio\/[^;]+;base64,/, '');
        job = await generateAvatarVideo({
          prompt: prompt.trim(),
          portraitImage: portraitBase64,
          audio: audioBase64,
          resolution: avatarResolution as '480P' | '720P',
          samplingSteps,
          textGuideScale,
          audioGuideScale,
          seed: safeSeed,
        });
      } else {
        const imageBase64 = mode === 'i2v' && uploadedImage
          ? uploadedImage.replace(/^data:image\/[^;]+;base64,/, '')
          : null;
        const videoBase64 = mode === 'v2v' && uploadedVideo
          ? uploadedVideo.replace(/^data:video\/[^;]+;base64,/, '')
          : null;

        job = await generateVideo({
          model,
          prompt: prompt.trim(),
          mode,
          image: imageBase64,
          video: videoBase64,
          ...(model === 'wan'
            ? { width: WAN_RESOLUTION.w, height: WAN_RESOLUTION.h }
            : { resolution }),
          numFrames: curDuration.frames,
          steps,
          guidanceScale: cfg,
          fps: 24,
          seed: safeSeed,
          negativePrompt: model === 'ltx' && negativePrompt ? negativePrompt : null,
          strength: v2vStrength,
        });
      }

      // Cold start detection: if progress stays 10-25% for >30s
      coldStartTimerRef.current = setTimeout(() => {
        setColdStart(true);
      }, 30000);

      /* Poll every 2s */
      pollRef.current = setInterval(async () => {
        try {
          const status: VideoJobResponse = await pollVideoJob(model, job.job_id);

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
                      ? getVideoResultUrl(model, job.job_id)
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
  }, [prompt, generating, model, mode, duration, resolution, uploadedImage, uploadedVideo, steps, cfg, seed, negativePrompt, v2vStrength, curDuration, refImages, portraitImage, audioFile, skyreelResolution, avatarResolution, guidanceScaleImg, samplingSteps, textGuideScale, audioGuideScale]);

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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedVideo(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeVideo = () => {
    setUploadedVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 4 - refImages.length;
    const toRead = Array.from(files).slice(0, remaining);
    toRead.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRefImages(prev => prev.length < 4 ? [...prev, ev.target?.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
    if (refImageInputRef.current) refImageInputRef.current.value = '';
  };

  const removeRefImage = (idx: number) => {
    setRefImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPortraitImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePortrait = () => {
    setPortraitImage(null);
    if (portraitInputRef.current) portraitInputRef.current.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAudioFile(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioFileName(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleDownload = async (vid: GeneratedVideo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!vid.videoUrl) return;
    const filename = `starcyeed-${vid.model}-${vid.mode}-${Date.now()}.mp4`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const downloadBlob = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      if (isIOS) {
        // iOS Safari doesn't support <a download> for blobs — open in new tab
        window.open(url, '_blank');
        return;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    // Try 1: direct fetch → blob
    try {
      const res = await fetch(vid.videoUrl);
      if (res.ok) { downloadBlob(await res.blob()); return; }
    } catch { /* CORS or network error */ }

    // Fallback: open URL directly
    window.open(vid.videoUrl, '_blank');
  };

  const handleSaveToProfile = async (vid: GeneratedVideo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!vid.videoUrl || savingToProfile[vid.id] || savedToProfile[vid.id]) return;
    const raw = StorageUtils.safeGetItem('chat-user');
    if (!raw) { setError('Please log in to save to your profile'); return; }
    let user: { id?: string; username?: string };
    try { user = JSON.parse(raw); } catch { setError('Invalid user session'); return; }
    if (!user.id || !user.username) { setError('Please log in to save to your profile'); return; }
    setSavingToProfile(prev => ({ ...prev, [vid.id]: true }));
    try {
      await apiClient.saveToGallery(user.id, user.username, vid.videoUrl, 'video', vid.prompt.slice(0, 100));
      setSavedToProfile(prev => ({ ...prev, [vid.id]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to profile');
    } finally {
      setSavingToProfile(prev => ({ ...prev, [vid.id]: false }));
    }
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
    setModel(vid.model);
    // For modes needing file uploads, fall back to t2v since we can't restore the source files
    const fallbackModes = ['i2v', 'v2v', 'smart', 'ref2video', 'avatar'];
    setMode(fallbackModes.includes(vid.mode) ? (MODEL_CONFIG[vid.model].modes[0] as VideoMode) : vid.mode as VideoMode);
    setDuration(vid.duration);
    setTimeout(() => {
      const btn = document.querySelector('[data-generate-btn]') as HTMLButtonElement | null;
      btn?.click();
    }, 100);
  };

  // Load from localStorage on mount, filtering out expired items
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIDEO_STORAGE_KEY);
      if (raw) {
        const parsed: (GeneratedVideo & { savedAt?: number })[] = JSON.parse(raw);
        const now = Date.now();
        const valid = parsed.filter(v => v.savedAt && (now - v.savedAt) < STORAGE_TTL_MS && v.status === 'complete');
        if (valid.length > 0) setVideos(valid);
        // Clean up expired
        if (valid.length !== parsed.length) {
          localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(valid));
        }
      }
    } catch { /* noop */ }
    // Show storage notice if not seen before
    if (!localStorage.getItem(VIDEO_STORAGE_NOTICE_KEY)) {
      setStorageNotice(true);
    }
  }, []);

  // Save completed videos to localStorage whenever they change
  useEffect(() => {
    try {
      const completedVideos = videos
        .filter(v => v.status === 'complete' && v.videoUrl)
        .map(v => ({ ...v, savedAt: (v as any).savedAt || Date.now() }));
      localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(completedVideos));
    } catch { /* storage full or unavailable */ }
  }, [videos]);

  return (
    <div style={{ minHeight: '100vh', background: '#030308', color: '#e2e2e8', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* 24h Storage Notice Modal */}
      {storageNotice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div style={{ maxWidth: 420, width: '90%', padding: '28px 24px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(10,10,20,0.98))', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 0 40px rgba(139,92,246,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⏳</div>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', color: '#fbbf24' }}>Storage Notice</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>
              Due to storage capacity, generated videos are kept in your browser for <strong style={{ color: '#fbbf24' }}>24 hours</strong> only.
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', margin: '0 0 20px' }}>
              Please <strong style={{ color: '#22d3ee' }}>download</strong> any videos you want to keep before they expire.
            </p>
            <button
              onClick={() => { setStorageNotice(false); localStorage.setItem(VIDEO_STORAGE_NOTICE_KEY, '1'); }}
              style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(139,92,246,0.3)', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.1))', color: '#a78bfa', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-12%', right: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.06),transparent 60%)', filter: 'blur(90px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-6%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,72,153,0.04),transparent 60%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.015, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.04) 3px,rgba(255,255,255,0.04) 4px)' }} />
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3" style={{ position: 'relative', zIndex: 2, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 0 }}
          >
            <ArrowLeft size={16} />
          </button>
          <img src="/icon.png" alt="Starcyeed" style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0 }} />
          <span className="hidden sm:inline" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>starcyeed</span>
          <span className="hidden sm:inline" style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)' }}>/</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Video Generation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.68)' }}>SERVER READY</span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]" style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 56px)' }}>

        {/* ────── LEFT: Prompt + Gallery ────── */}
        <div className="p-4 sm:p-6 md:border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(6,182,212,0.25))', border: '1px solid rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={20} color="#a78bfa" />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>Video Generation</h1>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>{modelCfg.name} · {modelCfg.sub}</div>
            </div>
          </div>

          {/* Model selector */}
          <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 16 }}>
            {(Object.entries(MODEL_CONFIG) as [VideoModel, typeof MODEL_CONFIG[VideoModel]][]).map(([key, m]) => (
              <button
                key={key}
                onClick={() => switchModel(key)}
                style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  border: model === key ? '1px solid rgba(139,92,246,0.50)' : '1px solid rgba(255,255,255,0.10)',
                  background: model === key ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: model === key ? '#c084fc' : 'rgba(255,255,255,0.65)' }}>{m.name}</span>
                  {key === 'wan' && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.06em' }}>SMART</span>}
                  {key === 'ltx' && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(6,182,212,0.1)', color: '#22d3ee', fontWeight: 600, letterSpacing: '0.06em' }}>V2V</span>}
                  {key === 'skyreel' && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(236,72,153,0.1)', color: '#ec4899', fontWeight: 600, letterSpacing: '0.06em' }}>REF</span>}
                  {key === 'avatar' && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(16,185,129,0.1)', color: '#34d399', fontWeight: 600, letterSpacing: '0.06em' }}>TALK</span>}
                </div>
                <div style={{ fontSize: 10, color: model === key ? 'rgba(192,132,252,0.7)' : 'rgba(255,255,255,0.6)' }}>{m.sub}</div>
              </button>
            ))}
          </div>

          {/* Mode tabs */}
          <div className="video-mode-tabs" style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20, overflowX: 'auto', maxWidth: '100%' }}>
            {modelCfg.modes.map(tab => {
              const labels: Record<string, { label: string; icon: React.ReactNode }> = {
                t2v: { label: 'Text to Video', icon: <Film size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> },
                i2v: { label: 'Image to Video', icon: <Upload size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> },
                smart: { label: 'Smart', icon: <Zap size={12} style={{ verticalAlign: -1, marginRight: 4, marginBottom: 4, color: '#fbbf24', filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.6))' }} /> },
                v2v: { label: 'Video to Video', icon: <Video size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> },
                ref2video: { label: 'Ref to Video', icon: <ImageIcon size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> },
                avatar: { label: 'Talking Avatar', icon: <Mic size={12} style={{ verticalAlign: -1, marginRight: 4 }} /> },
              };
              const info = labels[tab] || { label: tab, icon: null };
              return (
              <button
                key={tab}
                onClick={() => setMode(tab)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                  background: mode === tab ? 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(6,182,212,0.08))' : 'transparent',
                  color: mode === tab ? '#c084fc' : 'rgba(255,255,255,0.75)',
                  ...(mode === tab ? { border: '1px solid rgba(139,92,246,0.25)' } : {}),
                }}
              >
                {info.icon}
                {info.label}
                <span style={{ fontSize: 9, marginLeft: 6, color: 'rgba(255,255,255,0.62)' }}>({modelCfg.creditCost[tab]}cr)</span>
              </button>
              );
            })}
          </div>

          {/* Smart mode info banner */}
          {mode === 'smart' && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)', fontSize: 11, color: 'rgba(251,191,36,0.7)' }}>
              ✨ Smart mode: Enhances your prompt, generates a starting frame, then animates it. Best for complex scenes. Uses 8 credits.
            </div>
          )}

          {/* SkyReels info banner */}
          {mode === 'ref2video' && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.1)', fontSize: 11, color: 'rgba(236,72,153,0.7)' }}>
              Upload 1–4 reference images to preserve character identity in the generated video. Uses 8 credits.
            </div>
          )}

          {/* Avatar info banner */}
          {mode === 'avatar' && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', fontSize: 11, color: 'rgba(16,185,129,0.7)' }}>
              🎙️ Upload a portrait photo and audio file to generate a lip-synced talking avatar video. Uses 12 credits.
            </div>
          )}

          {/* Image upload (I2V mode) */}
          {mode === 'i2v' && !uploadedImage && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '1px dashed rgba(139,92,246,0.30)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16, cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(139,92,246,0.04)' }}
            >
              <Upload size={28} color="rgba(139,92,246,0.5)" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Upload a source image</p>
              <small style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>PNG, JPG up to 10MB · This image will be animated</small>
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

          {/* Video upload (V2V mode — LTX only) */}
          {mode === 'v2v' && !uploadedVideo && (
            <div
              onClick={() => videoInputRef.current?.click()}
              style={{ border: '1px dashed rgba(6,182,212,0.35)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16, cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(6,182,212,0.04)' }}
            >
              <Video size={28} color="rgba(6,182,212,0.5)" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Upload a source video</p>
              <small style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>MP4 up to 50MB · This video will be remixed</small>
            </div>
          )}
          <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} style={{ display: 'none' }} />
          {mode === 'v2v' && uploadedVideo && (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
              <video src={uploadedVideo} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} muted playsInline />
              <button onClick={removeVideo} style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 6, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 10, padding: '3px 8px', borderRadius: 5, background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Strength: {v2vStrength.toFixed(1)}
              </div>
            </div>
          )}

          {/* Reference images upload (SkyReels) */}
          <input ref={refImageInputRef} type="file" accept="image/*" multiple onChange={handleRefImageUpload} style={{ display: 'none' }} />
          {mode === 'ref2video' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {refImages.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(236,72,153,0.2)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Ref ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => removeRefImage(idx)} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {refImages.length < 4 && (
                  <div
                    onClick={() => refImageInputRef.current?.click()}
                    style={{ width: 80, height: 80, borderRadius: 8, border: '1px dashed rgba(236,72,153,0.3)', background: 'rgba(236,72,153,0.04)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <Plus size={16} color="rgba(236,72,153,0.5)" />
                    <span style={{ fontSize: 8, color: 'rgba(236,72,153,0.5)' }}>{refImages.length}/4</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Portrait + Audio upload (Avatar) */}
          <input ref={portraitInputRef} type="file" accept="image/*" onChange={handlePortraitUpload} style={{ display: 'none' }} />
          <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: 'none' }} />
          {mode === 'avatar' && (
            <div className="grid grid-cols-2 gap-2.5" style={{ marginBottom: 16 }}>
              {/* Portrait upload */}
              {!portraitImage ? (
                <div
                  onClick={() => portraitInputRef.current?.click()}
                  style={{ border: '1px dashed rgba(16,185,129,0.3)', borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: 'rgba(16,185,129,0.04)' }}
                >
                  <User size={24} color="rgba(16,185,129,0.5)" style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Portrait photo</p>
                  <small style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>Face image, max 10MB</small>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portraitImage} alt="Portrait" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  <button onClick={removePortrait} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 5, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} />
                  </button>
                </div>
              )}
              {/* Audio upload */}
              {!audioFile ? (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  style={{ border: '1px dashed rgba(16,185,129,0.3)', borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: 'rgba(16,185,129,0.04)' }}
                >
                  <Mic size={24} color="rgba(16,185,129,0.5)" style={{ marginBottom: 6 }} />
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Audio file</p>
                  <small style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>WAV/MP3, max 30MB</small>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 10, padding: 16, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Mic size={20} color="#34d399" />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center', wordBreak: 'break-all' }}>{audioFileName || 'Audio loaded'}</span>
                  <button onClick={removeAudio} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 5, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} />
                  </button>
                </div>
              )}
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
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.75)' }}>
                    {mode === 'i2v' ? 'DESCRIBE THE MOTION' : mode === 'v2v' ? 'DESCRIBE THE REMIX' : mode === 'ref2video' ? 'DESCRIBE THE SCENE' : mode === 'avatar' ? 'DESCRIBE THE PERSON / SCENE' : 'DESCRIBE YOUR VIDEO'}
                  </span>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
                  placeholder={mode === 'i2v' ? 'The person turns their head slowly and smiles...' : mode === 'v2v' ? 'Transform the scene into a cyberpunk city at night...' : mode === 'ref2video' ? 'The person walks through a sunlit forest, looking around in wonder...' : mode === 'avatar' ? 'A professional news anchor delivering a report in a studio...' : 'A majestic eagle soaring through mountain peaks at golden hour, cinematic drone shot...'}
                  rows={3}
                  style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit', caretColor: '#22d3ee' }}
                />
                {/* Negative prompt — LTX & SkyReels */}
                {(model === 'ltx' || model === 'skyreel') && (
                  <textarea
                    value={negativePrompt}
                    onChange={e => setNegativePrompt(e.target.value)}
                    placeholder="Negative prompt — blurry, distorted face, low quality, cartoon..."
                    rows={2}
                    style={{ width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.6, fontFamily: 'inherit', caretColor: '#ef4444', marginTop: 8, borderTop: '1px dashed rgba(239,68,68,0.35)', paddingTop: 8 }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 14, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0, flexWrap: 'wrap', rowGap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)' }}>{modelCfg.name}</span>
                    {model !== 'avatar' && <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)' }}>{duration}</span>}
                    {model === 'ltx' && <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)' }}>{resolution}</span>}
                    {model === 'skyreel' && <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)' }}>{skyreelResolution}</span>}
                    {model === 'avatar' && <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)' }}>{avatarResolution}</span>}
                    <button onClick={() => setSettings(!settings)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: settings ? '#22d3ee' : 'rgba(255,255,255,0.62)' }}>
                      <Settings2 size={14} />
                    </button>
                  </div>
                  {(() => {
                    const canGenerate = prompt.trim() && !generating && !(mode === 'i2v' && !uploadedImage) && !(mode === 'v2v' && !uploadedVideo) && !(mode === 'ref2video' && refImages.length === 0) && !(mode === 'avatar' && (!portraitImage || !audioFile));
                    return (
                  <button
                    data-generate-btn
                    onClick={generate}
                    disabled={!canGenerate}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 9, border: 'none',
                      fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#fff', flexShrink: 0, fontFamily: 'inherit',
                      cursor: canGenerate ? 'pointer' : 'not-allowed',
                      opacity: canGenerate || generating ? 1 : 0.3,
                      background: generating ? 'rgba(139,92,246,0.12)' : 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                      boxShadow: canGenerate ? '0 0 24px rgba(139,92,246,0.2)' : 'none',
                      transition: 'all 0.3s',
                    }}
                  >
                    {generating
                      ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />Generating...</>
                      : <><Play size={14} />Generate ({creditCost}cr)</>}
                  </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Settings drawer */}
          {settings && (
            <div style={{ borderRadius: 12, padding: 16, marginBottom: 20, background: 'rgba(10,10,20,0.7)', border: '1px solid rgba(139,92,246,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.72)' }}>ADVANCED SETTINGS</span>
                <button onClick={() => setSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.62)' }}><X size={13} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>STEPS ({steps})</label>
                  <input
                    type="range" min={10} max={50} step={1}
                    value={steps}
                    onChange={e => setSteps(+e.target.value)}
                    style={{ width: '100%', accentColor: '#7c3aed', marginTop: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>CFG SCALE ({cfg.toFixed(1)})</label>
                  <input
                    type="range" min={1} max={15} step={0.5}
                    value={cfg}
                    onChange={e => setCfg(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#7c3aed', marginTop: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>SEED</label>
                  <input
                    placeholder="Random"
                    value={seed}
                    onChange={e => setSeed(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>RESOLUTION {model === 'wan' ? '(fixed 1280×704)' : ''}</label>
                {model === 'ltx' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {LTX_RESOLUTIONS.map(r => (
                    <button key={r.id} onClick={() => setResolution(r.id)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: resolution === r.id ? '1px solid rgba(139,92,246,0.50)' : '1px solid rgba(255,255,255,0.10)',
                      background: resolution === r.id ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                      color: resolution === r.id ? '#c084fc' : 'rgba(255,255,255,0.7)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    }}>
                      {r.label}
                    </button>
                  ))}
                </div>
                ) : model === 'skyreel' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {SKYREEL_RESOLUTIONS.map(r => (
                    <button key={r.id} onClick={() => setSkyreelResolution(r.id)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: skyreelResolution === r.id ? '1px solid rgba(236,72,153,0.50)' : '1px solid rgba(255,255,255,0.10)',
                      background: skyreelResolution === r.id ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.04)',
                      color: skyreelResolution === r.id ? '#ec4899' : 'rgba(255,255,255,0.7)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    }}>
                      {r.label}
                    </button>
                  ))}
                </div>
                ) : model === 'avatar' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {AVATAR_RESOLUTIONS.map(r => (
                    <button key={r.id} onClick={() => setAvatarResolution(r.id)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: avatarResolution === r.id ? '1px solid rgba(16,185,129,0.50)' : '1px solid rgba(255,255,255,0.10)',
                      background: avatarResolution === r.id ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
                      color: avatarResolution === r.id ? '#34d399' : 'rgba(255,255,255,0.7)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    }}>
                      {r.label}
                    </button>
                  ))}
                </div>
                ) : (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>
                    1280 × 704 (landscape)
                  </div>
                )}
              </div>
              {/* V2V strength slider */}
              {mode === 'v2v' && model === 'ltx' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>V2V STRENGTH ({v2vStrength.toFixed(1)})</label>
                  <input
                    type="range" min={0.1} max={1.0} step={0.05}
                    value={v2vStrength}
                    onChange={e => setV2vStrength(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#22d3ee', marginTop: 4 }}
                  />
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Lower = more of original, Higher = more creative</div>
                </div>
              )}
              {/* SkyReels image guidance */}
              {model === 'skyreel' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>IMAGE GUIDANCE ({guidanceScaleImg.toFixed(1)})</label>
                  <input
                    type="range" min={0} max={10} step={0.5}
                    value={guidanceScaleImg}
                    onChange={e => setGuidanceScaleImg(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#ec4899', marginTop: 4 }}
                  />
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Higher = stronger reference image adherence</div>
                </div>
              )}
              {/* Avatar-specific settings */}
              {model === 'avatar' && (
                <>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>SAMPLING STEPS ({samplingSteps})</label>
                      <input
                        type="range" min={10} max={80} step={5}
                        value={samplingSteps}
                        onChange={e => setSamplingSteps(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#34d399', marginTop: 4 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>TEXT GUIDE ({textGuideScale.toFixed(1)})</label>
                      <input
                        type="range" min={1} max={20} step={0.5}
                        value={textGuideScale}
                        onChange={e => setTextGuideScale(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#34d399', marginTop: 4 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>AUDIO GUIDE ({audioGuideScale.toFixed(1)})</label>
                      <input
                        type="range" min={1} max={20} step={0.5}
                        value={audioGuideScale}
                        onChange={e => setAudioGuideScale(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#34d399', marginTop: 4 }}
                      />
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>How closely lips follow audio</div>
                    </div>
                  </div>
                </>
              )}
              {model !== 'avatar' && (
                <>
              <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>DURATION</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {framePresets.map(d => (
                  <button key={d.id} onClick={() => setDuration(d.id)} style={{
                    padding: '8px 12px', borderRadius: 8,
                    border: duration === d.id ? '1px solid rgba(139,92,246,0.50)' : '1px solid rgba(255,255,255,0.10)',
                    background: duration === d.id ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                    color: duration === d.id ? '#c084fc' : 'rgba(255,255,255,0.7)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}>
                    {d.label}
                  </button>
                ))}
              </div>
                </>
              )}
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
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>{progressMsg || 'Generating video...'}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', width: `${progress}%`, transition: 'width 0.3s' }} />
              </div>
              {/* Show AI-enhanced prompt in smart mode */}
              {videos[0]?.enhancedPrompt && (
                <div style={{ position: 'relative', marginTop: 8, padding: '8px 40px 8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)', fontSize: 11, color: 'rgba(251,191,36,0.6)' }}>
                  <button onClick={() => { navigator.clipboard.writeText(videos[0].enhancedPrompt!); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000); }} title="Copy enhanced prompt" style={{ position: 'absolute', top: 6, right: 6, padding: '3px 6px', borderRadius: 5, background: copiedPrompt ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.08)', border: `1px solid ${copiedPrompt ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.12)'}`, color: copiedPrompt ? '#10b981' : 'rgba(251,191,36,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all 0.2s' }}>{copiedPrompt ? <><Check size={10} /><span style={{ fontSize: 9, fontWeight: 600 }}>Copied</span></> : <Copy size={11} />}</button>
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
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
            GENERATED · {videos.length}
          </div>

          {/* Video cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {videos.map(vid => {
              const hov = hCard === vid.id;
              return (
                <div
                  key={vid.id}
                  onMouseEnter={() => { setHCard(vid.id); const v = videoElRefs.current[vid.id]; if (v) v.play().catch(() => {}); }}
                  onMouseLeave={() => { setHCard(null); const v = videoElRefs.current[vid.id]; if (v) { v.pause(); v.currentTime = 0; } }}
                  onTouchStart={(e) => { if (vid.status === 'complete') { e.stopPropagation(); setHCard(prev => prev === vid.id ? null : vid.id); } }}
                  onClick={() => { if (hCard !== vid.id && vid.status === 'complete') return; setExpanded(vid); }}
                  style={{
                    padding: 1, borderRadius: 12, cursor: 'pointer', transition: 'all 0.3s',
                    background: hov ? `linear-gradient(135deg,${vid.c1}55,${vid.c2}44)` : 'linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))',
                    boxShadow: hov ? `0 0 28px ${vid.c1}20` : 'none',
                  }}
                >
                  <div style={{ borderRadius: 11, overflow: 'hidden', background: 'rgba(8,8,15,0.9)' }}>
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: `linear-gradient(135deg,${vid.c1}12,${vid.c2}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {vid.videoUrl ? (
                        <video ref={el => { videoElRefs.current[vid.id] = el; }} src={vid.videoUrl} muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
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
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', inset: 0, background: 'rgba(3,3,8,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, padding: 8, zIndex: 10 }}>
                          <button onClick={(e) => { e.stopPropagation(); handleKeep(vid, e); }} title={vid.kept ? 'Unkeep' : 'Keep'} style={{ position: 'relative', zIndex: 11, padding: 7, borderRadius: 7, background: vid.kept ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${vid.kept ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: vid.kept ? '#10b981' : '#fff', cursor: 'pointer', display: 'flex' }}><Check size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleRegenerate(vid, e); }} title="Regenerate" style={{ position: 'relative', zIndex: 11, padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><RotateCcw size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleTrash(vid, e); }} title="Trash" style={{ position: 'relative', zIndex: 11, padding: 7, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(vid, e); }} title="Download" style={{ position: 'relative', zIndex: 11, padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><Download size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleSaveToProfile(vid, e); }} title={savedToProfile[vid.id] ? 'Saved to Profile' : 'Save to Profile'} style={{ position: 'relative', zIndex: 11, padding: 7, borderRadius: 7, background: savedToProfile[vid.id] ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.08)', border: `1px solid ${savedToProfile[vid.id] ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.15)'}`, color: savedToProfile[vid.id] ? '#10b981' : '#a78bfa', cursor: savingToProfile[vid.id] ? 'wait' : 'pointer', display: 'flex', opacity: savingToProfile[vid.id] ? 0.6 : 1 }}>{savedToProfile[vid.id] ? <Check size={14} /> : <User size={14} />}</button>
                          <button onClick={(e) => { e.stopPropagation(); setExpanded(vid); }} title="Expand" style={{ position: 'relative', zIndex: 11, padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex' }}><Maximize2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '9px 11px' }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vid.prompt}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
                        <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: vid.model === 'ltx' ? 'rgba(6,182,212,0.08)' : vid.model === 'skyreel' ? 'rgba(236,72,153,0.08)' : vid.model === 'avatar' ? 'rgba(16,185,129,0.08)' : 'rgba(139,92,246,0.06)', color: vid.model === 'ltx' ? '#22d3ee' : vid.model === 'skyreel' ? '#ec4899' : vid.model === 'avatar' ? '#34d399' : 'rgba(139,92,246,0.5)', fontWeight: 600 }}>{MODEL_CONFIG[vid.model].name}</span>
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: vid.mode === 'smart' ? 'rgba(251,191,36,0.08)' : vid.mode === 'ref2video' ? 'rgba(236,72,153,0.08)' : vid.mode === 'avatar' ? 'rgba(16,185,129,0.08)' : 'rgba(139,92,246,0.06)', color: vid.mode === 'smart' ? '#fbbf24' : vid.mode === 'ref2video' ? '#ec4899' : vid.mode === 'avatar' ? '#34d399' : 'rgba(139,92,246,0.5)' }}>{vid.mode}{vid.mode === 'smart' && ' ✨'}{vid.mode === 'avatar' && ' 🎙️'}</span>
                        {vid.time != null && (
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.58)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} />{vid.time}</span>
                        )}
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.58)' }}>{vid.duration}</span>
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
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.75)' }}>GENERATION STATS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { l: 'Videos', v: videos.length },
                { l: 'Avg time', v: '~2m' },
                { l: 'Credits', v: creditCost },
                { l: 'Model', v: modelCfg.name },
              ].map(s => (
                <div key={s.l} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{s.v}</div>
                  <div style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.58)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue status */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <Clock size={14} color="#a78bfa" />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.75)' }}>QUEUE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
              {activeJobs > 0 ? (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 4px rgba(167,139,250,0.4)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>{activeJobs} job{activeJobs > 1 ? 's' : ''} processing</span>
                </>
              ) : (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 4px rgba(52,211,153,0.4)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>No jobs in queue</span>
                </>
              )}
            </div>
          </div>

          {/* Starcyeed branding */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '18px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18, padding: '10px 0' }}>
            <img src="/icon.png" alt="Starcyeed" style={{ width: 28, height: 28, borderRadius: 7 }} />
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.85)' }}>starcyeed</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', marginBottom: 18 }} />

          {/* Tips */}
          <div style={{ borderRadius: 10, padding: 14, background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.06)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(139,92,246,0.6)', marginBottom: 7 }}>VIDEO PROMPT TIPS</div>
            {(model === 'wan' ? [
              'Best for realistic human faces & bodies',
              'Use "cinematic", "shallow depth of field" for film quality',
              'Smart mode enhances your prompt with AI',
              'guidance_scale sweet spot: 6.5',
              'Keep prompts under 200 words for best results',
            ] : model === 'skyreel' ? [
              'Upload 1–4 reference images for character consistency',
              'Flow-matching model — 8 steps is the default',
              'Best for preserving character identity across scenes',
              'Supports 3–10 second video durations',
              'Use guidance_scale_img to control ref adherence',
            ] : model === 'avatar' ? [
              'Upload a clear portrait photo (face visible)',
              'Audio is auto-converted to 16kHz mono WAV',
              'Single person only — no multi-person scenes',
              'Output is 25fps for audio synchronization',
              'Audio max: 200s, min: ~0.4s',
            ] : [
              'Supports up to 1080p resolution',
              'Use negative prompts to refine output',
              'V2V mode remixes existing videos',
              'guidance_scale sweet spot: 7.0–7.5',
              'Great for landscapes & abstract scenes',
            ]).map((t, i) => (
              <p key={i} style={{ fontSize: 11, lineHeight: 1.65, color: 'rgba(255,255,255,0.55)', margin: '0 0 1px' }}>• {t}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div onClick={() => setExpanded(null)} className="video-expanded-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(3,3,8,0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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
              <div className="video-expanded-content" style={{ padding: 18 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{expanded.prompt}</p>
                {expanded.enhancedPrompt && (
                  <div style={{ position: 'relative', marginBottom: 10, padding: '8px 40px 8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)', fontSize: 11, color: 'rgba(251,191,36,0.55)' }}>
                    <button onClick={() => { navigator.clipboard.writeText(expanded.enhancedPrompt!); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000); }} title="Copy enhanced prompt" style={{ position: 'absolute', top: 6, right: 6, padding: '3px 6px', borderRadius: 5, background: copiedPrompt ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.08)', border: `1px solid ${copiedPrompt ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.12)'}`, color: copiedPrompt ? '#10b981' : 'rgba(251,191,36,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all 0.2s' }}>{copiedPrompt ? <><Check size={10} /><span style={{ fontSize: 9, fontWeight: 600 }}>Copied</span></> : <Copy size={11} />}</button>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(251,191,36,0.4)', display: 'block', marginBottom: 3 }}>AI-ENHANCED PROMPT</span>
                    {expanded.enhancedPrompt}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: expanded.model === 'ltx' ? 'rgba(6,182,212,0.08)' : expanded.model === 'skyreel' ? 'rgba(236,72,153,0.08)' : expanded.model === 'avatar' ? 'rgba(16,185,129,0.08)' : 'rgba(139,92,246,0.08)', border: `1px solid ${expanded.model === 'ltx' ? 'rgba(6,182,212,0.15)' : expanded.model === 'skyreel' ? 'rgba(236,72,153,0.15)' : expanded.model === 'avatar' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.1)'}`, color: expanded.model === 'ltx' ? '#22d3ee' : expanded.model === 'skyreel' ? '#ec4899' : expanded.model === 'avatar' ? '#34d399' : 'rgba(139,92,246,0.5)', fontWeight: 600 }}>{MODEL_CONFIG[expanded.model].name}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: expanded.mode === 'smart' ? 'rgba(251,191,36,0.08)' : expanded.mode === 'ref2video' ? 'rgba(236,72,153,0.08)' : expanded.mode === 'avatar' ? 'rgba(16,185,129,0.08)' : 'rgba(139,92,246,0.08)', border: `1px solid ${expanded.mode === 'smart' ? 'rgba(251,191,36,0.15)' : expanded.mode === 'ref2video' ? 'rgba(236,72,153,0.15)' : expanded.mode === 'avatar' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.1)'}`, color: expanded.mode === 'smart' ? '#fbbf24' : expanded.mode === 'ref2video' ? '#ec4899' : expanded.mode === 'avatar' ? '#34d399' : 'rgba(139,92,246,0.5)' }}>{expanded.mode}{expanded.mode === 'smart' && ' ✨'}{expanded.mode === 'avatar' && ' 🎙️'}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)' }}>{expanded.duration}</span>
                  {expanded.time != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.62)' }}>{expanded.time}</span>}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleKeep(expanded); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: expanded.kept ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${expanded.kept ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`, color: expanded.kept ? '#10b981' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    <Check size={12} />{expanded.kept ? 'Kept' : 'Keep'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRegenerate(expanded); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)', color: '#a78bfa', cursor: 'pointer' }}
                  >
                    <RotateCcw size={12} />Regenerate
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTrash(expanded); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />Trash
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(expanded); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.12)', color: '#22d3ee', cursor: 'pointer' }}
                  >
                    <Download size={12} />Download
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSaveToProfile(expanded); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, fontSize: 11, background: savedToProfile[expanded.id] ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.08)', border: `1px solid ${savedToProfile[expanded.id] ? 'rgba(16,185,129,0.25)' : 'rgba(139,92,246,0.12)'}`, color: savedToProfile[expanded.id] ? '#10b981' : '#a78bfa', cursor: savingToProfile[expanded.id] ? 'wait' : 'pointer', opacity: savingToProfile[expanded.id] ? 0.6 : 1 }}
                  >
                    {savedToProfile[expanded.id] ? <><Check size={12} />Saved</> : savingToProfile[expanded.id] ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : <><User size={12} />Save to Profile</>}
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
        .video-mode-tabs{-ms-overflow-style:none;scrollbar-width:none}
        .video-mode-tabs::-webkit-scrollbar{display:none}
        @media(max-width:480px){
          .video-expanded-overlay{padding:10px !important}
          .video-expanded-content{padding:12px !important}
        }
        .video-rainbow-glow{position:absolute;inset:-4px;border-radius:50%;z-index:0;overflow:hidden;animation:rainbowPulse 2s ease-in-out infinite}
        .video-rainbow-glow::before{content:'';position:absolute;inset:-50%;border-radius:50%;background:conic-gradient(from 0deg,#ff3333,#ffaa00,#33ff66,#00ddff,#aa66ff,#ff44aa,#ff3333);animation:rainbowSpin 2.5s linear infinite}
        .video-rainbow-glow::after{content:'';position:absolute;inset:2px;border-radius:50%;background:#0a0a14}
        textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.48)}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.15);border-radius:2px}
        *{box-sizing:border-box;margin:0}
      `}</style>
    </div>
  );
}
