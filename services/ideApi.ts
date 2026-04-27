/**
 * Star IDE API service
 * All requests go through /api/ide/* (Next.js proxy) → https://api.starcyeed.com/api/ide/*
 * Auth: static Bearer token (NEXT_PUBLIC_STAR_TOKEN / STAR_API_TOKEN on Railway).
 */

const IDE_BASE = '/api/ide';

function ideHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    // Token is now added server-side in the proxy
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

export interface GitFile {
  status: string;
  path: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitResult {
  success:   boolean;
  stdout:    string;
  stderr:    string;
  exit_code: number;
  action:    string;
  // legacy alias kept for compatibility
  output:    string;
  branch?:   string;
  files?:    GitFile[];
  commits?:  GitCommit[];
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

export type GitAction =
  | 'init'
  | 'status'
  | 'commit'
  | 'log'
  | 'branch'
  | 'add'
  | 'push'
  | 'pull'
  | 'clone'
  | 'checkout'
  | 'diff'
  | 'remote';

export const gitOp = (action: GitAction, extras: Record<string, unknown> = {}) =>
  ideRequest<GitResult>('POST', '/git', { action, ...extras });

// ── Viewport ──────────────────────────────────────────────────────────────────

export interface ViewportInfo {
  url: string;
  port: number;
  ready: boolean;
}

export const exposePort = (port: number) =>
  ideRequest<ViewportInfo>('POST', '/viewport', { port });

export const getViewportUrl = (port: number) =>
  ideRequest<ViewportInfo>('GET', `/viewport?port=${port}`);

export const closeViewport = (port: number) =>
  ideRequest<{ ok: boolean }>('DELETE', '/viewport', { port });

