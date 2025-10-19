import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload } from './types';

// Prefer explicit NEXT_PUBLIC_API_URL set in Vercel / local .env.local. Allow optional FORCE.
// If not set, prefer the production Railway backend (safe default) before falling back
// to same-origin. This helps deployed frontends (or dev machines without env vars)
// to reach the correct backend URL.
// Use environment variable for backend URL, fallback to hardcoded for production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-3ba7e.up.railway.app';

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
    const r = await api.get('/', { timeout: 5000 });
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
    try {
      await api.post(`/rooms/${roomId}/join`, { user_id: userId });
    } catch (e) {
      handleApiError(e, 'Join room');
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

  // createVideoUpload returns a same-origin upload_url (e.g. /upload-proxy/{id})
  createVideoUpload: async (roomId: string, title: string, description?: string): Promise<VideoUpload> => {
    if (!title || !title.trim()) throw new Error('Please provide a title');
    try {
      const r = await api.post(`/rooms/${roomId}/video-upload`, { title, description });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Create video upload');
    }
  },

  // upload to the given uploadUrl (designed to be same-origin proxy). Accepts progress callback.
  // upload to the given uploadUrl. If the backend returned an access_key, pass it as apiKey.
  uploadVideoFile: async (
    uploadUrl: string,
    file: File,
    onProgress?: (pct: number) => void,
    apiKey?: string
  ): Promise<void> => {
    try {
      // Use fetch to PUT the file. This allows custom headers like AccessKey and
      // uses the actual file.type as Content-Type.
      // We attempt to use the Fetch + ReadableStream upload progress if available; if
      // not, we fall back to XMLHttpRequest to track upload progress.

      const headers: Record<string, string> = {
        'Content-Type': file.type || 'application/octet-stream',
      };
      if (apiKey) headers['AccessKey'] = apiKey;

      // Prefer fetch for modern browsers and same-origin/third-party uploads
      if (typeof window !== 'undefined' && 'fetch' in window && 'ReadableStream' in window) {
        // Some CDNs reject extra headers on pre-signed URLs. If adding AccessKey causes problems,
        // backend should return a signed URL that doesn't require custom headers. We'll still
        // attempt fetch with the header when provided.
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers,
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        // If onProgress is provided, report 100% when complete
        onProgress?.(100);
        return;
      }

      // Fallback to XMLHttpRequest for progress reporting in older browsers/environments
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