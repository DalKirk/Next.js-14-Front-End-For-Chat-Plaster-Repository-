import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload } from './types';

const BACKEND_URL = 'https://web-production-3ba7e.up.railway.app';

// Prefer explicit NEXT_PUBLIC_API_URL set in Vercel / local .env.local. Allow optional FORCE.
// If not set, prefer the production Railway backend (safe default) before falling back
// to same-origin. This helps deployed frontends (or dev machines without env vars)
// to reach the correct backend URL.
// Use environment variable for backend URL, fallback to hardcoded for production
const DEFAULT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
const API_BASE_URL = process.env.NEXT_PUBLIC_FORCE_API_URL || process.env.NEXT_PUBLIC_API_URL || BACKEND_URL;

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.debug('🔧 API config', { NODE_ENV: process.env.NODE_ENV, NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL, API_BASE_URL });
}

// axios instance used for same-origin requests and endpoints. Enable withCredentials
// in case the backend uses cookies/auth that require credentials. For cross-origin
// upload URLs (absolute third-party URLs) we fall back to axios directly.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000,
  withCredentials: true,
});

function extractMessage(err: any): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.response?.data?.detail || err.message || String(err);
  }
  return String(err);
}

function handleApiError(error: any, operation: string): never {
  // eslint-disable-next-line no-console
  console.error(`❌ ${operation} failed:`, error);
  if (axios.isAxiosError(error)) {
    if (!error.response && error.request) {
      throw new Error(`🌐 Network/CORS error contacting ${API_BASE_URL}. Check backend and CORS. See browser DevTools Network tab.`);
    }
    const status = error.response?.status;
    const msg = extractMessage(error);
    if (status === 502) throw new Error('🔄 Backend gateway error (502). Try again shortly.');
    if (status === 503) throw new Error('⏳ Service unavailable (503).');
    if (status === 404) throw new Error(`❌ API endpoint not found at ${API_BASE_URL}.`);
    if (status === 500) throw new Error(`💥 Backend error: ${msg}`);
    if (status && status >= 400) throw new Error(`⚠️ Request failed (${status}): ${msg}`);
  }
  throw new Error(`${operation} failed: ${String(error)}`);
}

export const checkServerHealth = async (): Promise<boolean> => {
  try {
    // Call the dedicated health endpoint rather than root. Use configured `api` so baseURL and credentials apply.
    const r = await api.get('/health', { timeout: 5000 });
    return r.status === 200;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Health check failed', err);
    return false;
  }
};

export const apiClient = {
  checkHealth: checkServerHealth,

  createUser: async (username: string): Promise<User> => {
    if (!username || !username.trim()) throw new Error('Please provide a username');
    try {
      const r = await api.post('/users', { username });
      return r.data;
    } catch (e) {
      // Fallback to mock user when backend is unavailable
      console.warn('Backend unavailable, creating mock user:', e);
      const mockUser: User = {
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: username.trim(),
        created_at: new Date().toISOString(),
      };
      return mockUser;
    }
  },

  getRooms: async (): Promise<Room[]> => {
    try {
      const r = await api.get('/rooms');
      return r.data;
    } catch (e) {
      // Fallback to mock rooms when backend is unavailable
      console.warn('Backend unavailable, returning mock rooms:', e);
      return [
        {
          id: 'mock-room-1',
          name: 'General Chat',
          created_at: new Date().toISOString(),
        },
        {
          id: 'mock-room-2',
          name: 'Video Room',
          created_at: new Date().toISOString(),
        },
      ];
    }
  },

  createRoom: async (name: string): Promise<Room> => {
    if (!name || !name.trim()) throw new Error('Please provide a room name');
    try {
      const r = await api.post('/rooms', { name });
      return r.data;
    } catch (e) {
      // Fallback to mock room when backend is unavailable
      console.warn('Backend unavailable, creating mock room:', e);
      const mockRoom: Room = {
        id: `mock-room-${Date.now()}`,
        name: name.trim(),
        created_at: new Date().toISOString(),
      };
      return mockRoom;
    }
  },

  joinRoom: async (roomId: string, userId: string): Promise<void> => {
    // Avoid calling backend for locally-created mock rooms
    if (roomId.startsWith('mock-')) {
      // Local/mock join: nothing to send to backend
      // You can add local state updates here if needed.
      // eslint-disable-next-line no-console
      console.warn('Attempted to join mock room locally; skipping backend call', roomId);
      return;
    }

    try {
      await api.post(`/rooms/${roomId}/join`, { user_id: userId });
    } catch (e) {
      // Fail gracefully: log and return so UI can continue using fallback behavior
      // eslint-disable-next-line no-console
      console.warn('Join room failed, continuing with fallback behavior', e);
      return;
    }
  },

  getRoomMessages: async (roomId: string): Promise<Message[]> => {
    try {
      const r = await api.get(`/rooms/${roomId}/messages`);
      return r.data;
    } catch (e) {
      // Fallback to empty messages when backend is unavailable
      console.warn('Backend unavailable, returning empty messages:', e);
      return [];
    }
  },

  createLiveStream: async (roomId: string, title: string): Promise<LiveStream> => {
    if (!title || !title.trim()) throw new Error('Please provide a title');
    try {
      const r = await api.post(`/rooms/${roomId}/live-stream`, { title });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Create live stream');
    }
  },

  createVideoUpload: async (roomId: string, title: string, description?: string): Promise<VideoUpload> => {
    if (!title || !title.trim()) throw new Error('Please provide a title');
    try {
      const r = await api.post(`/rooms/${roomId}/video-upload`, { title, description });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Create video upload');
    }
  },

  uploadVideoFile: async (
    uploadUrl: string,
    file: File,
    onProgress?: (pct: number) => void,
    apiKey?: string
  ): Promise<void> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': file.type || 'application/octet-stream',
      };
      if (apiKey) headers['AccessKey'] = apiKey;

      if (typeof window !== 'undefined' && 'fetch' in window && 'ReadableStream' in window) {
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers,
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        onProgress?.(100);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.timeout = 5 * 60 * 1000;
        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          const pct = Math.round((ev.loaded * 100) / ev.total);
          onProgress?.(pct);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(100);
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.send(file);
      });
    } catch (e) {
      handleApiError(e, 'Upload video file');
    }
  },
};

export default apiClient;