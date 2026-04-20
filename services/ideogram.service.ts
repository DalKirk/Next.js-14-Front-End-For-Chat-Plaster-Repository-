const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

/* ─── Retry helper for transient gateway errors ─── */
const RETRYABLE = new Set([502, 503, 504]);
const MAX_RETRIES = 3;

async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastRes: Response | undefined;
  for (let i = 0; i <= retries; i++) {
    lastRes = await fetch(input, init);
    if (!RETRYABLE.has(lastRes.status) || i === retries) return lastRes;
    await new Promise(r => setTimeout(r, 1000 * 2 ** i)); // 1s, 2s, 4s
  }
  return lastRes!;
}

export interface IdeogramJobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  message: string;
  image_url: string | null;
  created_at: string;
  completed_at: string | null;
  error: string | null;
  generation_time: number | null;
  width: number | null;
  height: number | null;
}

export type IdeogramModel = 'V_2' | 'V_2_TURBO';
export type IdeogramStyle = 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
export type IdeogramMagicPrompt = 'AUTO' | 'ON' | 'OFF';

export interface IdeogramGenerateRequest {
  prompt: string;
  model?: IdeogramModel;
  style_type?: IdeogramStyle | null;
  aspect_ratio?: string;
  magic_prompt_option?: IdeogramMagicPrompt;
  negative_prompt?: string | null;
  seed?: number | null;
}

export async function generateIdeogramImage(params: IdeogramGenerateRequest): Promise<IdeogramJobStatus> {
  const body: Record<string, unknown> = { prompt: params.prompt };
  if (params.model) body.model = params.model;
  if (params.style_type) body.style_type = params.style_type;
  if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
  if (params.magic_prompt_option) body.magic_prompt_option = params.magic_prompt_option;
  if (params.negative_prompt) body.negative_prompt = params.negative_prompt;
  if (params.seed != null) body.seed = params.seed;

  const res = await fetchWithRetry(`${API_URL}/ideogram/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Too many requests. Please wait for current jobs to finish.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Generate failed: ${res.status}`);
  }
  return res.json();
}

export async function pollIdeogramJob(jobId: string): Promise<IdeogramJobStatus> {
  const res = await fetchWithRetry(`${API_URL}/ideogram/job/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
  return res.json();
}

export function getIdeogramResultUrl(jobId: string): string {
  return `${API_URL}/ideogram/result/${encodeURIComponent(jobId)}`;
}
