// types/upload.ts

export type GameEngine =
  | 'unity'
  | 'godot'
  | 'gamemaker'
  | 'construct'
  | 'phaser'
  | 'webassembly'
  | 'html5'
  | 'unknown';

export type UploadPhase =
  | 'idle'        // No file selected
  | 'selected'    // File selected, form being filled
  | 'uploading'   // Currently uploading
  | 'processing'  // Backend processing the zip
  | 'complete'    // Upload successful
  | 'error';      // Upload failed

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  speedBps: number;
  speedDisplay: string;
  etaSeconds: number;
  etaDisplay: string;
}

export interface UploadResult {
  success: boolean;
  game_id: string;
  slug: string;
  play_url: string;
  engine: GameEngine;
  file_size_mb: number;
  file_count?: number;
}

export interface UploadError {
  message: string;
  code?: string;
  retry?: boolean;
}

export interface GameMetadata {
  title: string;
  description: string;
  thumbnail?: File;
}
