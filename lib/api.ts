import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload, Generate3DModelRequest, Generate3DModelResponse, Model3D } from './types';

export type GPUGenerationJob = {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  glb_url?: string;  // NEW: For browser preview
  model_url?: string;
  texture_url?: string;
  download_url?: string;
  error?: string;
  generation_time?: number;
  estimated_time?: number;
  created_at: string;
}

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

function extractMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.response?.data?.detail || err.message || String(err);
  }
  return String(err);
}

function handleApiError(error: unknown, operation: string): never {
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
      // If endpoint doesn't exist (404), that's okay - room page will handle it
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        console.warn('⚠️ Join room endpoint not found - room page will handle joining');
        return;
      }
      // If user not found (400/422), that's also okay - WebSocket might still work
      if (axios.isAxiosError(e) && (e.response?.status === 400 || e.response?.status === 422)) {
        const errorMsg = e.response?.data?.detail || '';
        if (errorMsg.includes('User not found')) {
          console.warn('⚠️ User not found in backend - WebSocket might still accept connection');
          return; // Don't throw error, let WebSocket try to connect
        }
      }
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

  sendRoomMessage: async (roomId: string, userId: string, content: string): Promise<Message> => {
    if (!content || !content.trim()) throw new Error('Message cannot be empty');
    try {
      const r = await api.post(`/rooms/${roomId}/messages`, {
        user_id: userId,
        content: content.trim(),
      });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Send message');
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

  // 3D Model Generation
  generate3DModel: async (request: Generate3DModelRequest): Promise<Generate3DModelResponse> => {
    if (!request.prompt || !request.prompt.trim()) throw new Error('Please provide a prompt');
    try {
      const r = await api.post('/3d/generate', request);
      return r.data;
    } catch (e) {
      handleApiError(e, 'Generate 3D model');
    }
  },

  get3DModel: async (modelId: string): Promise<Model3D> => {
    try {
      const r = await api.get(`/3d/models/${modelId}`);
      return r.data;
    } catch (e) {
      handleApiError(e, 'Get 3D model');
    }
  },

  list3DModels: async (roomId?: string): Promise<Model3D[]> => {
    try {
      const params = roomId ? { room_id: roomId } : {};
      const r = await api.get('/3d/models', { params });
      return r.data;
    } catch (e) {
      handleApiError(e, 'List 3D models');
    }
  },

  // GPU-accelerated Image to 3D Generation
  generateModelFromImage: async (
    params: {
      image: File;
      texture_resolution?: number;
      mc_resolution?: number;
      user_id?: string;
      room_id?: string;
    },
    onProgress?: (percent: number) => void
  ): Promise<GPUGenerationJob> => {
    try {
      const formData = new FormData();
      formData.append('image', params.image);
      if (params.texture_resolution) formData.append('texture_resolution', params.texture_resolution.toString());
      if (params.mc_resolution) formData.append('mc_resolution', params.mc_resolution.toString());
      if (params.user_id) formData.append('user_id', params.user_id);
      if (params.room_id) formData.append('room_id', params.room_id);

      const r = await api.post('/gpu/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(percent);
          }
        },
      });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Generate 3D model from image');
    }
  },

  checkGPUJobStatus: async (jobId: string): Promise<GPUGenerationJob> => {
    try {
      const r = await api.get(`/gpu/job/${jobId}`);
      return r.data;
    } catch (e) {
      handleApiError(e, 'Check GPU job status');
    }
  },

  downloadGPUModel: async (jobId: string): Promise<Blob> => {
    try {
      const r = await api.get(`/gpu/download/${jobId}`, {
        responseType: 'blob',
      });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Download GPU model');
    }
  },
};

export default apiClient;