import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload, Generate3DModelRequest, Generate3DModelResponse, Model3D } from './types';
import type { AvatarUploadResponse, AvatarUrls } from '../types/backend';

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
      console.log('✅ User created on backend:', r.data);
      return r.data;
    } catch (e) {
      console.error('❌ Failed to create user on backend:', e);
      handleApiError(e, 'Create user');
      throw e;
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

  createRoom: async (name: string, thumbnailUrl?: string): Promise<Room> => {
    if (!name || !name.trim()) throw new Error('Please provide a room name');
    try {
      const payload: Record<string, unknown> = { name: name.trim() };
      if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl;
      console.log('📤 Creating room with payload:', payload);
      const r = await api.post('/rooms', payload);
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

  joinRoom: async (roomId: string, userId: string, username?: string, avatarUrl?: string): Promise<void> => {
    try {
      const defaultAvatar = (() => {
        const name = (username || 'Anonymous').trim();
        const safeName = encodeURIComponent(name);
        return `https://ui-avatars.com/api/?name=${safeName}&background=random`;
      })();
      const payload: Record<string, unknown> = { 
        user_id: userId,
        username: username || 'Anonymous',
        avatar_url: avatarUrl || defaultAvatar
      };
      console.log('📤 Joining room with payload:', payload);
      await api.post(`/rooms/${roomId}/join`, payload);
    } catch (e) {
      // Strict mode: joining must succeed before WebSocket connect
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const detail = e.response?.data?.detail || extractMessage(e);
        if (status === 404) {
          throw new Error('Join endpoint missing on backend (404). Please create /rooms/{room_id}/join.');
        }
        if (status === 400 || status === 422) {
          throw new Error(`Join failed (${status}): ${detail}`);
        }
      }
      handleApiError(e, 'Join room');
    }
  },

  getRoomMessages: async (roomId: string, limit?: number): Promise<Message[]> => {
    try {
      const params = limit ? { limit } : undefined;
      const r = await api.get(`/rooms/${roomId}/messages`, { params });
      return r.data;
    } catch (e) {
      // Fallback to empty messages when backend is unavailable
      console.warn('Backend unavailable, returning empty messages:', e);
      return [];
    }
  },

  // NOTE: Messages are sent via WebSocket ONLY - backend doesn't have REST endpoint
  // Use socketManager.sendMessage() instead
  // This function is deprecated and should not be used
  sendRoomMessage: async (_roomId: string, _userId: string, _content: string): Promise<Message> => {
    throw new Error('❌ Messages must be sent via WebSocket. Backend does not support POST /messages endpoint.');
  },

  // User Profile Management
  
  // Ensure user exists on backend, create if not found
  ensureUserExists: async (userId: string, username: string): Promise<User> => {
    try {
      // Try to get existing user
      const r = await api.get(`/users/${userId}`);
      console.log('✅ User exists on backend:', r.data);
      return r.data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        // User not found, create them (let backend assign the ID)
        console.log('👤 Creating user on backend (no client ID):', { username });
        try {
          const createResponse = await api.post('/users', { username });
          const createdUser: User = createResponse.data;
          console.log('✅ User created on backend:', createdUser);

          // Save backend-returned user to localStorage for consistency
          if (typeof window !== 'undefined') {
            try {
              const existing = window.localStorage.getItem('chat-user');
              // Keep any extra fields, but replace id/username with backend values
              const merged = existing ? { ...JSON.parse(existing), ...createdUser } : createdUser;
              window.localStorage.setItem('chat-user', JSON.stringify(merged));
              window.localStorage.setItem('userId', createdUser.id);
              window.localStorage.setItem('username', createdUser.username);
              console.log('💾 LocalStorage updated with backend user ID:', createdUser.id);
            } catch (storageErr) {
              console.warn('LocalStorage update failed:', storageErr);
            }
          }

          return createdUser;
        } catch (createError) {
          console.error('❌ Failed to create user on backend:', createError);
          throw new Error('Failed to initialize user on backend');
        }
      }
      handleApiError(e, 'Ensure user exists');
      throw e;
    }
  },
  
  getProfile: async (userId: string): Promise<User> => {
    try {
      const r = await api.get(`/users/${userId}`);
      console.log('✅ Profile loaded from backend:', r.data);
      return r.data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        console.error('❌ User not found on backend. User ID:', userId);
        throw new Error('USER_NOT_FOUND');
      }
      handleApiError(e, 'Get profile');
      throw e;
    }
  },

  updateProfile: async (userId: string, displayName?: string, avatarUrl?: string, avatarUrls?: AvatarUrls): Promise<{ success: boolean; user: User }> => {
    try {
      // Backend ONLY accepts URLs, not base64 data
      if (avatarUrl && avatarUrl.startsWith('data:')) {
        throw new Error('⚠️ Avatar must be a URL, not base64 data. Please upload the image and provide a URL.');
      }
      
      if (avatarUrl && avatarUrl.length > 2000) {
        throw new Error('❌ Avatar URL too long. Maximum 2000 characters.');
      }
      
      if (displayName && displayName.length < 2) {
        throw new Error('❌ Display name must be at least 2 characters.');
      }

      const payload: Record<string, any> = {};
      if (displayName) payload.display_name = displayName;
      if (avatarUrl) payload.avatar_url = avatarUrl;
      if (avatarUrls) payload.avatar_urls = avatarUrls;

      console.log('📤 Updating profile on backend:', { ...payload, avatar_url: payload.avatar_url ? `${payload.avatar_url.substring(0, 50)}...` : undefined });
      const r = await api.put(`/users/${userId}/profile`, payload);
      console.log('✅ Profile updated on backend:', r.data);
      return r.data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        console.error('❌ User not found on backend. User ID:', userId);
        throw new Error('USER_NOT_FOUND');
      }
      handleApiError(e, 'Update profile');
      throw e;
    }
  },

  // Validate user exists on backend
  validateUser: async (userId: string): Promise<boolean> => {
    try {
      await api.get(`/users/${userId}`);
      return true;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        return false;
      }
      // Other errors (network, etc) - assume user might exist
      console.warn('Could not validate user:', e);
      return true;
    }
  },

  // Recreate user on backend if they don't exist
  recreateUser: async (username: string): Promise<User> => {
    try {
      console.log('🔄 Recreating user on backend:', username);
      const user = await apiClient.createUser(username);
      console.log('✅ User recreated:', user);
      return user;
    } catch (e) {
      console.error('❌ Failed to recreate user:', e);
      throw e;
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

  // Authentication endpoints
  login: async (username: string, password: string): Promise<{ user: User; token: string }> => {
    try {
      const r = await api.post('/auth/login', { username, password });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Login');
    }
  },

  signup: async (username: string, email: string, password: string): Promise<{ user: User; token: string }> => {
    try {
      const r = await api.post('/auth/signup', { username, email, password });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Sign up');
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      handleApiError(e, 'Logout');
    }
  },

  getCurrentUser: async (token: string): Promise<User> => {
    try {
      const r = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return r.data;
    } catch (e) {
      handleApiError(e, 'Get current user');
    }
  },

  /**
   * Upload avatar with multi-size processing
   * Client processes image into 4 sizes before upload (Facebook/Instagram style)
   * 
   * @param userId - User ID
   * @param file - Image file (JPEG, PNG, GIF, WebP - max 10MB)
   * @param username - Username (optional, used to create user if not exists)
   * @returns Avatar URLs object with all sizes
   * 
   * @example
   * const avatarUrls = await apiClient.uploadAvatar('user-123', fileObject, 'john_doe');
   * // Returns: { thumbnail: "...", small: "...", medium: "...", large: "..." }
   */
  uploadAvatar: async (userId: string, file: File, username?: string): Promise<AvatarUploadResponse> => {
    // Always ensure user exists on backend before uploading avatar
    // If the `/users/{id}` record is missing, create via POST /users and persist backend ID
    if (username) {
      await apiClient.ensureUserExists(userId, username);
    }

    const { ImageProcessor } = await import('./image-processor');

    // Validate image dimensions
    const validation = await ImageProcessor.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image');
    }

    // Process image into multiple sizes
    const processed = await ImageProcessor.processAvatar(file);
    const totalSize = ImageProcessor.getTotalSize(processed);

    console.log(`📸 Processed avatar into 4 sizes (${totalSize}KB total):`, {
      thumbnail: `${processed.thumbnail.sizeKB}KB`,
      small: `${processed.small.sizeKB}KB`,
      medium: `${processed.medium.sizeKB}KB`,
      large: `${processed.large.sizeKB}KB`,
    });

    try {
      // Create form data with all sizes
      const formData = new FormData();
      formData.append('thumbnail', processed.thumbnail.blob, 'thumbnail.jpg');
      formData.append('small', processed.small.blob, 'small.jpg');
      formData.append('medium', processed.medium.blob, 'medium.jpg');
      formData.append('large', processed.large.blob, 'large.jpg');

      // Upload all sizes to backend
      const response = await api.post<AvatarUploadResponse>(`/users/${userId}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('✅ All avatar sizes uploaded to Bunny.net CDN:', response.data.avatar_urls);

      return response.data;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const errorMsg = e.response?.data?.detail || e.message || 'Failed to upload avatar';
        console.error('❌ Avatar upload error:', errorMsg);
        throw new Error(errorMsg);
      }
      throw new Error('Failed to upload avatar');
    }
  },

  /**
   * Delete user's avatar from Bunny.net CDN
   * 
   * @param userId - User ID
   * 
   * @example
   * await apiClient.deleteAvatar('user-123');
   */
  deleteAvatar: async (userId: string): Promise<void> => {
    try {
      await api.delete(`/avatars/delete/${userId}`);
      console.log('🗑️ Avatar deleted from Bunny.net CDN');
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const errorMsg = e.response?.data?.detail || e.message || 'Failed to delete avatar';
        throw new Error(errorMsg);
      }
      throw new Error('Failed to delete avatar');
    }
  },

  /**
   * Check if Bunny.net CDN is configured and healthy
   * 
   * @returns Health status
   */
  checkAvatarHealth: async (): Promise<{
    status: 'healthy' | 'not_configured';
    bunny_net_configured: boolean;
    storage_zone: string | null;
    cdn_hostname: string | null;
    timestamp: string;
  }> => {
    try {
      const response = await api.get('/avatars/health');
      return response.data;
    } catch (e) {
      throw new Error('Failed to check avatar health');
    }
  },
};

export default apiClient;