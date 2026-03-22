const API_BASE = 'https://web-production-3ba7e.up.railway.app';

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
  prompt,
  mode = 't2v',
  image = null,
  width = 1280,
  height = 704,
  numFrames = 33,
  steps = 30,
  guidanceScale = 5.0,
  fps = 24,
  seed = null,
}: {
  prompt: string;
  mode?: 't2v' | 'i2v' | 'smart';
  image?: string | null;
  width?: number;
  height?: number;
  numFrames?: number;
  steps?: number;
  guidanceScale?: number;
  fps?: number;
  seed?: number | null;
}): Promise<VideoJobResponse> {
  const res = await fetch(`${API_BASE}/video/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      mode,
      image,
      width,
      height,
      num_frames: numFrames,
      num_inference_steps: steps,
      guidance_scale: guidanceScale,
      fps,
      seed,
    }),
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

export async function pollVideoJob(jobId: string): Promise<VideoJobResponse> {
  const res = await fetch(`${API_BASE}/video/job/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
  return res.json();
}

export function getVideoResultUrl(jobId: string): string {
  return `${API_BASE}/video/result/${encodeURIComponent(jobId)}`;
}
