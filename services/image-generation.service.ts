const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

export interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  seed?: number | null;
}

export interface ImageJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  message: string;
  image_url: string | null;
  created_at?: string;
  estimated_time?: number;
  generation_time?: number;
  width?: number;
  height?: number;
  error?: string;
}

export async function generateImage({
  prompt,
  model = 'dev',
  width = 1024,
  height = 1024,
  steps = null,
  guidance = null,
  seed = null,
}: {
  prompt: string;
  model?: 'dev' | 'schnell';
  width?: number;
  height?: number;
  steps?: number | null;
  guidance?: number | null;
  seed?: number | null;
}): Promise<ImageJobResponse> {
  const res = await fetch(`${API_URL}/image/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model,
      width,
      height,
      num_inference_steps: steps,
      guidance_scale: guidance,
      seed,
    }),
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
  return res.json();
}

export async function pollImageJob(jobId: string): Promise<ImageJobResponse> {
  const res = await fetch(`${API_URL}/image/job/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
  return res.json();
}

export function getImageResultUrl(jobId: string): string {
  return `${API_URL}/image/result/${encodeURIComponent(jobId)}`;
}
