/**
 * Star IDE API service
 * All requests go through /api/ide/* (Next.js proxy) → https://api.starcyeed.com/api/ide/*
 * Auth: static Bearer token (NEXT_PUBLIC_STAR_TOKEN / STAR_API_TOKEN on Railway).
 */

// Routes through the local Next.js proxy to avoid browser CORS restrictions.
const IDE_BASE = '/api/ide';
const TOKEN = process.env.NEXT_PUBLIC_STAR_TOKEN ?? '7571868d-ae26-45d1-af71-1819ed6b1c1d';

function ideHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  };
}

async function ideRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${IDE_BASE}${path}`, {
    method,
    headers: ideHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `IDE API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SandboxStatus {
  status?: string;
  active?: boolean;
  message?: string;
  sandbox_id?: string;
}

export interface ExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  error: string | null;
  // alias so StarIDE can use either field name
  execution_time_ms: number;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
}

export interface GitResult {
  output: string;
  success: boolean;
}

// ── Sandbox ───────────────────────────────────────────────────────────────────

export const createSandbox = (packages: string[] = [], packageManager = 'pip') =>
  ideRequest<SandboxStatus>('POST', '/sandbox', { packages, package_manager: packageManager });

export const getSandboxStatus = () =>
  ideRequest<SandboxStatus>('GET', '/sandbox');

export const destroySandbox = () =>
  ideRequest<{ ok: boolean }>('DELETE', '/sandbox');

// ── Execution ─────────────────────────────────────────────────────────────────

export const runCode = (code: string, language = 'python') =>
  ideRequest<ExecuteResult>('POST', '/execute', { code, language });

export const runCommand = (command: string, cwd?: string) =>
  ideRequest<ExecuteResult>('POST', '/command', { command, ...(cwd ? { cwd } : {}) });

// ── Files ─────────────────────────────────────────────────────────────────────

export const readFile = (path: string) =>
  ideRequest<{ content: string }>('GET', `/files?path=${encodeURIComponent(path)}&mode=read`);

export const listFiles = (path = '/home/user') =>
  ideRequest<{ entries: FileEntry[] }>('GET', `/files?path=${encodeURIComponent(path)}&mode=list`);

export const writeFile = (path: string, content: string) =>
  ideRequest<{ ok: boolean }>('POST', '/files', { path, content });

export const deleteFile = (path: string) =>
  ideRequest<{ ok: boolean }>('DELETE', '/files', { path });

// ── Git ───────────────────────────────────────────────────────────────────────

export type GitAction = 'init' | 'status' | 'commit' | 'log' | 'branch';

export const gitOp = (action: GitAction, extras: Record<string, unknown> = {}) =>
  ideRequest<GitResult>('POST', '/git', { action, ...extras });

