// lib/upload-service.ts
// Bridges the new upload UI types to the existing backend API.

import type { UploadProgress, UploadResult } from '@/types/upload';
import { calculateProgress } from './upload-utils';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

interface UploadGameParams {
  userId: string;
  file: File;
  title: string;
  description: string;
  thumbnail?: File;
  onProgress?: (progress: UploadProgress) => void;
  onPhaseChange?: (phase: 'uploading' | 'processing') => void;
}

/**
 * Upload a game zip to POST /api/games/upload/{userId}.
 * Uses XHR so we get upload-progress events.
 */
export function uploadGame(params: UploadGameParams): Promise<UploadResult> {
  const { userId, file, title, description, thumbnail, onProgress, onPhaseChange } = params;

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('game_file', file);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    onPhaseChange?.('uploading');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(calculateProgress(e.loaded, e.total, startTime));
      }
    });

    xhr.upload.addEventListener('load', () => {
      // Transfer done; server is now processing the zip
      onPhaseChange?.('processing');
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const errData = JSON.parse(xhr.responseText);
          msg = errData.detail || errData.message || msg;
        } catch { /* ignore */ }
        reject(new Error(msg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;

    xhr.open('POST', `${API_BASE_URL}/api/games/upload/${encodeURIComponent(userId)}`);
    xhr.setRequestHeader('X-User-Id', userId);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
