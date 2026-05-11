// lib/upload-utils.ts

import type { GameEngine, UploadProgress } from '@/types/upload';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '—';
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB/s`;
  const kb = bytesPerSec / 1024;
  return `${kb.toFixed(0)} KB/s`;
}

export function guessEngineFromFilename(fileName: string): GameEngine {
  const name = fileName.toLowerCase();
  if (name.includes('unity')) return 'unity';
  if (name.includes('godot')) return 'godot';
  if (name.includes('gamemaker') || name.includes('gms')) return 'gamemaker';
  if (name.includes('construct')) return 'construct';
  if (name.includes('phaser')) return 'phaser';
  return 'unknown';
}

export function getEngineLabel(engine: GameEngine | string): string {
  const labels: Record<string, string> = {
    unity: 'Unity',
    godot: 'Godot',
    gamemaker: 'GameMaker',
    construct: 'Construct',
    phaser: 'Phaser',
    webassembly: 'WebAssembly',
    html5: 'HTML5',
    unknown: 'Detecting…',
  };
  return labels[engine] ?? 'Unknown';
}

export function getEngineIcon(engine: GameEngine | string): string {
  const icons: Record<string, string> = {
    unity: '◆',
    godot: '▲',
    gamemaker: '■',
    construct: '●',
    phaser: '◉',
    webassembly: '⬡',
    html5: '◐',
    unknown: '○',
  };
  return icons[engine] ?? '○';
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateGameFile(file: File, maxSizeMB = 100): ValidationResult {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return { valid: false, error: 'File must be a .zip archive' };
  }
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `File exceeds ${maxSizeMB} MB limit` };
  }
  if (file.size < 100) {
    return { valid: false, error: 'File appears to be empty or corrupted' };
  }
  return { valid: true };
}

export function validateThumbnail(file: File): ValidationResult {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Thumbnail must be JPEG, PNG, or WebP' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Thumbnail must be under 5 MB' };
  }
  return { valid: true };
}

export function calculateProgress(
  loaded: number,
  total: number,
  startTime: number,
): UploadProgress {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const speedBps = elapsedSeconds > 0 ? loaded / elapsedSeconds : 0;
  const remainingBytes = total - loaded;
  const etaSeconds = speedBps > 0 ? remainingBytes / speedBps : 0;

  return {
    loaded,
    total,
    percent: total > 0 ? Math.min(100, (loaded / total) * 100) : 0,
    speedBps,
    speedDisplay: formatSpeed(speedBps),
    etaSeconds,
    etaDisplay: formatTime(etaSeconds),
  };
}
