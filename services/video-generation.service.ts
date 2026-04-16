const API_BASE = 'https://web-production-3ba7e.up.railway.app';

export type VideoModel = 'wan' | 'ltx' | 'skyreel' | 'avatar';

const ENDPOINTS: Record<VideoModel, string> = {
  wan: '/video',
  ltx: '/ltx-video',
  skyreel: '/skyreel',
  avatar: '/avatar',
};

export interface VideoJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  message: string;
  video_url: string | null;
  generation_time?: number | null;
  error?: string | null;
  estimated_time?: number | null;
  width?: number;
  height?: number;
  mode?: string;
  enhanced_prompt?: string | null;
  created_at?: string;
}

export async function generateVideo({
  model = 'wan',
  prompt,
  mode = 't2v',
  image = null,
  video = null,
  width,
  height,
  resolution,
  numFrames = 33,
  steps = 30,
  guidanceScale = 5.0,
  fps = 24,
  seed = null,
  negativePrompt = null,
  strength = 0.7,
}: {
  model?: VideoModel;
  prompt: string;
  mode?: string;
  image?: string | null;
  video?: string | null;
  width?: number;
  height?: number;
  resolution?: string | null;
  numFrames?: number;
  steps?: number;
  guidanceScale?: number;
  fps?: number;
  seed?: number | null;
  negativePrompt?: string | null;
  strength?: number;
}): Promise<VideoJobResponse> {
  const prefix = ENDPOINTS[model] || ENDPOINTS.wan;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    prompt,
    mode,
    num_frames: numFrames,
    num_inference_steps: steps,
    guidance_scale: guidanceScale,
    fps,
    seed,
  };

  if (image) body.image = image;

  if (model === 'wan') {
    body.width = width ?? 1280;
    body.height = height ?? 704;
  } else {
    // LTX supports resolution presets or explicit width/height
    if (resolution) body.resolution = resolution;
    if (width) body.width = width;
    if (height) body.height = height;
    if (negativePrompt) body.negative_prompt = negativePrompt;
    if (video) body.video = video;
    if (mode === 'v2v') body.strength = strength;
  }

  const res = await fetch(`${API_BASE}${prefix}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Too many requests. Please wait for your current videos to finish.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Video generation failed: ${res.status}`);
  }
  return res.json();
}

/* ─── SkyReels R2V ─── */
export async function generateSkyReelVideo({
  prompt,
  refImages,
  duration = 5,
  resolution = '720P',
  steps = 8,
  guidanceScale = 1.0,
  guidanceScaleImg = 1.0,
  negativePrompt = '',
  seed = null,
}: {
  prompt: string;
  refImages: string[];
  duration?: number;
  resolution?: '480P' | '540P' | '720P';
  steps?: number;
  guidanceScale?: number;
  guidanceScaleImg?: number;
  negativePrompt?: string;
  seed?: number | null;
}): Promise<VideoJobResponse> {
  const res = await fetch(`${API_BASE}/skyreel/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      ref_images: refImages,
      duration,
      resolution,
      num_inference_steps: steps,
      guidance_scale: guidanceScale,
      guidance_scale_img: guidanceScaleImg,
      negative_prompt: negativePrompt,
      seed,
    }),
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Too many requests. Please wait for your current videos to finish.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `SkyReels generation failed: ${res.status}`);
  }
  return res.json();
}

/* ─── Talking Avatar ─── */
export async function generateAvatarVideo({
  prompt,
  portraitImage,
  audio,
  resolution = '480P',
  samplingSteps = 25,
  textGuideScale = 5.0,
  audioGuideScale = 4.0,
  seed = null,
}: {
  prompt: string;
  portraitImage: string;
  audio: string;
  resolution?: '480P' | '720P';
  samplingSteps?: number;
  textGuideScale?: number;
  audioGuideScale?: number;
  seed?: number | null;
}): Promise<VideoJobResponse> {
  const res = await fetch(`${API_BASE}/avatar/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      portrait_image: portraitImage,
      audio,
      resolution,
      sampling_steps: samplingSteps,
      text_guide_scale: textGuideScale,
      audio_guide_scale: audioGuideScale,
      seed,
    }),
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Too many requests. Please wait for your current videos to finish.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Avatar generation failed: ${res.status}`);
  }
  return res.json();
}

export async function pollVideoJob(model: VideoModel, jobId: string): Promise<VideoJobResponse> {
  const prefix = ENDPOINTS[model] || ENDPOINTS.wan;
  const res = await fetch(`${API_BASE}${prefix}/job/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
  return res.json();
}

export function getVideoResultUrl(model: VideoModel, jobId: string): string {
  const prefix = ENDPOINTS[model] || ENDPOINTS.wan;
  return `${API_BASE}${prefix}/result/${encodeURIComponent(jobId)}`;
}
