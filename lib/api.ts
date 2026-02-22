import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload, Generate3DModelRequest, Generate3DModelResponse, Model3D } from './types';
import type { AvatarUploadResponse, AvatarUrls, GalleryItem, GalleryListResponse, ThemeConfig } from '../types/backend';
import { sanitizeUserForStorage } from './utils';

type ProfileUpdatePayload = {
  display_name?: string;
  username?: string;
  avatar_url?: string;
  avatar_urls?: AvatarUrls;
  bio?: string;
  email?: string;
};

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

// Prefer explicit NEXT_PUBLIC_API_URL set in Vercel / local .env.local.
// If not set, use the custom backend domain as the default.
// For local dev, set NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';

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
  // Detect if backend has the password route by inspecting FastAPI OpenAPI
  checkPasswordRouteAvailable: async (): Promise<boolean> => {
    try {
      const r = await api.get('/openapi.json');
      const paths = (r.data && r.data.paths) || {};
      const route = paths['/users/{user_id}/password'] || paths['/users/{userId}/password'];
      const hasPut = route && (route.put || route['PUT']);
      return Boolean(hasPut);
    } catch (e) {
      console.warn('Could not load OpenAPI spec to check password route:', e);
      return false;
    }
  },

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

  getRooms: async (category?: string): Promise<Room[]> => {
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      const r = await api.get('/rooms', { params });
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

  createRoom: async (name: string, thumbnailUrl?: string, options?: { category?: string; description?: string; tags?: string[]; privacy?: string; maxMembers?: number; password?: string }): Promise<Room> => {
    if (!name || !name.trim()) throw new Error('Please provide a room name');
    try {
      const payload: Record<string, unknown> = { name: name.trim() };
      if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl;
      if (options?.category) payload.category = options.category;
      if (options?.description) payload.description = options.description;
      if (options?.tags && options.tags.length > 0) payload.tags = options.tags;
      if (options?.privacy) payload.privacy = options.privacy;
      if (options?.maxMembers) payload.max_members = options.maxMembers;
      if (options?.privacy === 'password' && options?.password) {
        payload.password = options.password;
      }
      console.log('📤 Creating room with payload:', { ...payload, password: payload.password ? '***' : undefined });
      const r = await api.post('/rooms', payload);
      return r.data;
    } catch (e) {
      // Fallback to mock room when backend is unavailable
      console.warn('Backend unavailable, creating mock room:', e);
      const mockRoom: Room = {
        id: `mock-room-${Date.now()}`,
        name: name.trim(),
        created_at: new Date().toISOString(),
        thumbnail: thumbnailUrl, // Include thumbnail in mock room
        thumbnail_url: thumbnailUrl,
        category: options?.category,
        description: options?.description,
        tags: options?.tags,
        privacy: options?.privacy as 'public' | 'private' | 'password',
        maxMembers: options?.maxMembers,
        password: options?.password, // Store for local testing only
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

  verifyRoomPassword: async (roomId: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const r = await api.post(`/rooms/${roomId}/verify-password`, { password });
      return { success: true };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 401 || status === 403) {
          return { success: false, error: 'Incorrect password' };
        }
        if (status === 404) {
          // Backend doesn't have verify endpoint yet, check locally
          console.warn('Password verify endpoint not available, using local check');
          return { success: false, error: 'Password verification not available' };
        }
      }
      return { success: false, error: 'Failed to verify password' };
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
              // Keep any extra non-sensitive fields, but always sanitize and prefer backend values
              const mergedRaw = existing ? { ...JSON.parse(existing), ...createdUser } : createdUser;
              const merged = sanitizeUserForStorage(mergedRaw);
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

  updateProfile: async (
    userId: string,
    displayName?: string,
    avatarUrl?: string,
    avatarUrls?: AvatarUrls,
    bio?: string,
    email?: string,
  ): Promise<{ success: boolean; user: User }> => {
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

      const payload: ProfileUpdatePayload = {};
      if (displayName) {
        // Prefer backend display_name; also set username for backends that use that field
        payload.display_name = displayName;
        payload.username = displayName;
      }
      if (avatarUrl) payload.avatar_url = avatarUrl;
      if (avatarUrls) payload.avatar_urls = avatarUrls;
      if (bio !== undefined) payload.bio = bio;
      if (email !== undefined) payload.email = email;

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

  updatePassword: async (
    userId: string,
    newPassword: string,
  ): Promise<{ success: boolean; notSupported?: boolean }> => {
    try {
      if (!newPassword || newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      const r = await api.put(`/users/${userId}/password`, { new_password: newPassword });
      return r.data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 405) {
        return { success: false, notSupported: true };
      }
      handleApiError(e, 'Update password');
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
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        throw new Error('Invalid username or password');
      }
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

      const headers = {
        'Content-Type': 'multipart/form-data',
        'X-User-Id': userId,
      } as const;

      // Try backend-preferred routes in order
      const routes = [
        { method: 'put', path: `/users/${userId}/avatar` },
        { method: 'post', path: `/avatars/upload/${userId}` },
        { method: 'post', path: `/users/${userId}/avatar` },
      ] as const;

      let lastErr: unknown = null;
      for (const rinfo of routes) {
        try {
          const resp = await (rinfo.method === 'put'
            ? api.put<AvatarUploadResponse>(rinfo.path, formData, { headers, timeout: 30000 })
            : api.post<AvatarUploadResponse>(rinfo.path, formData, { headers, timeout: 30000 }));
          console.log('✅ Avatar uploaded:', rinfo.path, resp.data.avatar_urls);
          return resp.data;
        } catch (err) {
          lastErr = err;
          continue;
        }
      }
      handleApiError(lastErr, 'Upload avatar');
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
   * Upload a gallery image using the same multi-size processing as avatars.
   * Backend should expose POST /users/{userId}/gallery that stores images to CDN.
   */
  uploadGalleryFiles: async (
    userId: string,
    files: File[],
    caption?: string,
    username?: string,
  ): Promise<GalleryListResponse> => {
    if (username) {
      await apiClient.ensureUserExists(userId, username);
    }
    const formData = new FormData();
    // Explicitly include user association to prevent backend misrouting
    formData.append('user_id', userId);
    if (username) formData.append('username', username);
    files.forEach((file) => formData.append('files', file, file.name));
    if (caption) formData.append('caption', caption);

    // Try canonical path
    const paths = [`/users/${userId}/media`, `/users/${userId}/media/`];
    let lastErr: unknown = null;
    for (const p of paths) {
      try {
        const r = await api.post<GalleryListResponse>(p, formData, {
          headers: { 'Content-Type': 'multipart/form-data', 'X-User-Id': userId },
          timeout: 30000,
        });
        // Validate response user scope
        const res = r.data;
        
        // DEBUG: Log what backend returned after upload
        console.log('🔍 UPLOAD DEBUG - Uploading for userId:', userId);
        console.log('🔍 UPLOAD DEBUG - Response envelope user_id:', res?.user_id);
        console.log('🔍 UPLOAD DEBUG - Items received:', Array.isArray(res?.items) ? res.items.length : 0);
        console.log('🔍 UPLOAD DEBUG - Items with user_id:', (res?.items || []).map((it: any) => ({ id: it.id, user_id: it.user_id, url: it.url?.substring(0, 50) })));
        
        if (res?.user_id && res.user_id !== userId) {
          throw new Error(`Upload response user mismatch: expected ${userId}, got ${res.user_id}`);
        }
        // If items include user_id, ensure all match uploader
        if (Array.isArray(res?.items) && (res.items as GalleryItem[]).some((it: GalleryItem) => typeof it.user_id === 'string' && it.user_id !== userId)) {
          throw new Error('Upload returned items for a different user');
        }
        // If neither envelope nor item-level user_id provided, treat as ambiguous and reject to prevent leakage
        const hasEnvelopeUser = Boolean(res?.user_id);
        const itemsArr: GalleryItem[] = Array.isArray(res?.items) ? (res.items as GalleryItem[]) : [];
        const anyItemHasUser = itemsArr.some((it) => typeof it.user_id === 'string');
        if (!hasEnvelopeUser && !anyItemHasUser) {
          throw new Error('Upload response ambiguous: missing user_id at envelope and item level');
        }
        return res;
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    handleApiError(lastErr, 'Upload gallery files');
  },

  /** List gallery items for a user - PUBLIC readable, no auth required */
  listGallery: async (userId: string): Promise<GalleryItem[]> => {
    const getPaths = [`/users/${userId}/media`, `/users/${userId}/media/`];
    let lastErr: unknown = null;
    for (const p of getPaths) {
      try {
        // Don't send X-User-Id on GET - this is public read, backend uses route param
        const r = await api.get(p);
        const responseUserId = r.data?.user_id as string | undefined;
        const items = (r.data?.items || []) as GalleryItem[];
        
        // DEBUG: Log what backend returned
        console.log('🔍 GALLERY DEBUG - Requested userId:', userId);
        console.log('🔍 GALLERY DEBUG - Response envelope user_id:', responseUserId);
        console.log('🔍 GALLERY DEBUG - Items received:', items.length);
        console.log('🔍 GALLERY DEBUG - Items with user_id:', items.filter((it) => it.user_id).map((it) => ({ id: it.id, user_id: it.user_id, url: it.url?.substring(0, 50) })));
        
        // Accept items for the REQUESTED user (allows public viewing)
        if (responseUserId && responseUserId !== userId) {
          throw new Error(`Mismatched user_id in gallery list: expected ${userId}, got ${responseUserId}`);
        }
        // Filter items to match requested userId (not logged-in user)
        const anyUserIdPresent = Array.isArray(items) && items.some((it) => typeof it.user_id === 'string');
        if (anyUserIdPresent) {
          const filtered = items.filter((it) => it.user_id === userId);
          console.log('🔍 GALLERY DEBUG - Filtered items:', filtered.length);
          return filtered;
        }
        // If neither envelope nor item-level user_id, avoid ambiguous server data and fall back to local cache
        console.warn('Gallery list response lacks user_id; using local cache to avoid cross-user leakage');
        if (typeof window !== 'undefined') {
          try {
            const key = `userGallery:${userId}`;
            const raw = window.localStorage.getItem(key) || '[]';
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              return arr.filter((u: unknown) => typeof u === 'string').map((u: string) => ({
                id: `local-${Math.random().toString(36).slice(2)}`,
                url: u,
                caption: undefined,
                created_at: new Date().toISOString(),
              }));
            }
          } catch {}
        }
        return [];
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    // Gallery endpoint not available on this backend — fall back silently to local storage
    if (typeof lastErr === 'object' && lastErr !== null && 'response' in lastErr) {
      const status = (lastErr as any).response?.status;
      if (status !== 404) console.warn('Gallery list failed:', lastErr);
    }
      // Fallback: local storage URLs without IDs, scoped per user
      if (typeof window !== 'undefined') {
        try {
          const key = `userGallery:${userId}`;
          const raw = window.localStorage.getItem(key) || '[]';
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            return arr.filter((u: unknown) => typeof u === 'string').map((u: string) => ({
              id: `local-${Math.random().toString(36).slice(2)}`,
              url: u,
              caption: undefined,
              created_at: new Date().toISOString(),
            }));
          }
        } catch {}
      }
      return [];
    
  },

  /** Update gallery item metadata (e.g., title) */
  updateGalleryItem: async (userId: string, itemId: string, data: { caption?: string }): Promise<GalleryItem> => {
    const paths = [`/users/${userId}/media/${itemId}`, `/users/${userId}/media/${itemId}/`];
    let lastErr: unknown = null;
    for (const p of paths) {
      try {
        const r = await api.put(p, data, { headers: { 'X-User-Id': userId } });
        return r.data as GalleryItem;
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    handleApiError(lastErr, 'Update gallery item');
  },

  /** Update gallery order */
  updateGalleryOrder: async (userId: string, itemIds: string[]): Promise<{ user_id: string; items: GalleryItem[] }> => {
    const paths = [`/users/${userId}/media/order`, `/users/${userId}/media/order/`];
    let lastErr: unknown = null;
    for (const p of paths) {
      try {
        const r = await api.put(p, { ids: itemIds }, { headers: { 'X-User-Id': userId } });
        return r.data as { user_id: string; items: GalleryItem[] };
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    handleApiError(lastErr, 'Update gallery order');
  },

  /** Delete gallery item */
  deleteGalleryItem: async (userId: string, itemId: string): Promise<{ ok: boolean }> => {
    // Always remove from localStorage first (works for both local and backend items)
    let removedFromCache = false;
    if (typeof window !== 'undefined') {
      try {
        const key = `userGallery:${userId}`;
        const raw = window.localStorage.getItem(key) || '[]';
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          // Filter out items matching this ID (whether string URL or object)
          const filtered = items.filter((item: unknown) => {
            if (typeof item === 'string') return !item.includes(itemId);
            if (item && typeof item === 'object' && 'id' in item) return (item as {id: string}).id !== itemId;
            return true;
          });
          window.localStorage.setItem(key, JSON.stringify(filtered));
          removedFromCache = true;
        }
      } catch (e) {
        console.error('Failed to remove item from local cache:', e);
      }
    }

    // If this is a local-only item, we're done (no backend call needed)
    if (itemId.startsWith('local-')) {
      return { ok: removedFromCache };
    }

    // For backend items, call the API
    const paths = [`/users/${userId}/media/${itemId}`, `/users/${userId}/media/${itemId}/`];
    let lastErr: unknown = null;
    for (const p of paths) {
      try {
        const r = await api.delete(p, { headers: { 'X-User-Id': userId } });
        return r.data as { ok: boolean };
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    
    // If backend delete failed but we removed from cache, that's still success
    if (removedFromCache && axios.isAxiosError(lastErr) && lastErr.response?.status === 404) {
      return { ok: true };
    }
    
    handleApiError(lastErr, 'Delete gallery item');
    throw lastErr;
  },

  // ─── Theme CRUD ──────────────────────────────────────────────────────

  /**
   * Get user's theme configuration from the database.
   * Returns null if no theme is saved yet.
   */
  getTheme: async (userId: string): Promise<ThemeConfig | null> => {
    try {
      const r = await api.get(`/users/${userId}/theme`);
      return (r.data?.theme_config as ThemeConfig) ?? null;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        // Endpoint or user not found – no custom theme yet
        return null;
      }
      console.warn('⚠️ Failed to load theme, falling back to null:', e);
      return null;
    }
  },

  /**
   * Save user's theme configuration to the database.
   */
  updateTheme: async (userId: string, themeConfig: ThemeConfig): Promise<{ success: boolean }> => {
    try {
      const r = await api.put(`/users/${userId}/theme`, { theme_config: themeConfig });
      return r.data as { success: boolean };
    } catch (e) {
      handleApiError(e, 'Update theme');
      throw e;
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

  // ── Feed / Posts ──────────────────────────────────────────────

  /**
   * Get feed posts by type (for you, following, trending)
   * Supports pagination with page & limit params
   */
  getFeed: async (
    type: 'foryou' | 'following' | 'trending' = 'foryou',
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any[]> => {
    try {
      const response = await api.get('/feed', {
        params: { type, user_id: userId, page, limit }
      });
      return response.data;
    } catch (e) {
      handleApiError(e, 'Load feed');
      return [];
    }
  },

  /**
   * Create a new post
   */
  createPost: async (data: { user_id: string; content: string; media_urls: string[] }): Promise<any> => {
    try {
      const response = await api.post('/posts', data);
      return response.data;
    } catch (e) {
      handleApiError(e, 'Create post');
      throw e;
    }
  },

  /**
   * Like / unlike a post (toggle)
   */
  likePost: async (postId: string, userId: string): Promise<{ liked: boolean }> => {
    try {
      const response = await api.post(`/posts/${postId}/like`, { user_id: userId });
      return response.data;
    } catch (e) {
      handleApiError(e, 'Like post');
      throw e;
    }
  },

  /**
   * Add a comment to a post
   */
  commentOnPost: async (postId: string, userId: string, content: string): Promise<any> => {
    try {
      const response = await api.post(`/posts/${postId}/comments`, { user_id: userId, content });
      return response.data;
    } catch (e) {
      handleApiError(e, 'Comment on post');
      throw e;
    }
  },

  /**
   * Get comments for a post
   */
  getComments: async (postId: string): Promise<any[]> => {
    try {
      const response = await api.get(`/posts/${postId}/comments`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      // Don't use handleApiError here — it re-throws (return type `never`),
      // making the `return []` unreachable.  Let the caller handle the error.
      console.error('❌ Load comments failed:', e);
      throw e;
    }
  },

  /**
   * Share / repost a post — creates a new post referencing the original
   */
  sharePost: async (postId: string, userId: string, content?: string): Promise<any> => {
    try {
      const response = await api.post(`/posts/${postId}/share`, { user_id: userId, content: content || '' });
      return response.data;
    } catch (e) {
      handleApiError(e, 'Share post');
      throw e;
    }
  },

  /**
   * Delete a post
   */
  deletePost: async (postId: string): Promise<void> => {
    try {
      await api.delete(`/posts/${postId}`);
    } catch (e) {
      handleApiError(e, 'Delete post');
      throw e;
    }
  },

  /**
   * Get posts by a specific user
   */
  getUserPosts: async (userId: string): Promise<any[]> => {
    try {
      const response = await api.get(`/posts/user/${userId}`);
      return response.data;
    } catch (e) {
      handleApiError(e, 'Load user posts');
      return [];
    }
  },

  // ── Follow System ─────────────────────────────────────────────

  /**
   * Toggle follow on a user (follow if not following, unfollow if already following)
   */
  toggleFollow: async (targetUserId: string, currentUserId: string): Promise<{ following: boolean; followers_count: number; following_count: number }> => {
    try {
      const response = await api.post(`/users/${targetUserId}/follow`, { user_id: currentUserId });
      return response.data;
    } catch (e) {
      handleApiError(e, 'Toggle follow');
      throw e;
    }
  },

  /**
   * Check if current user follows target user
   */
  checkFollowing: async (targetUserId: string, currentUserId: string): Promise<{ following: boolean }> => {
    try {
      const response = await api.get(`/users/${targetUserId}/follow-status`, { params: { user_id: currentUserId } });
      return response.data;
    } catch (e) {
      console.error('❌ Check follow status failed:', e);
      return { following: false };
    }
  },

  /**
   * Get followers list for a user
   */
  getFollowers: async (userId: string): Promise<any[]> => {
    try {
      const response = await api.get(`/users/${userId}/followers`);
      return response.data;
    } catch (e) {
      console.error('❌ Load followers failed:', e);
      return [];
    }
  },

  /**
   * Get following list for a user
   */
  getFollowing: async (userId: string): Promise<any[]> => {
    try {
      const response = await api.get(`/users/${userId}/following`);
      return response.data;
    } catch (e) {
      console.error('❌ Load following failed:', e);
      return [];
    }
  },

  // ─── Direct Messages ─────────────────────────────────────────────────

  /**
   * Get conversations for a user
   */
  getConversations: async (userId: string): Promise<{ conversations: any[]; contacts: any[] }> => {
    try {
      const response = await api.get(`/users/${userId}/conversations`);
      const data = response.data;
      // Handle various response formats
      if (Array.isArray(data)) {
        return { conversations: data, contacts: [] };
      }
      return {
        conversations: Array.isArray(data?.conversations) ? data.conversations : [],
        contacts: Array.isArray(data?.contacts) ? data.contacts : [],
      };
    } catch (e) {
      console.warn('❌ Load conversations failed (may not be implemented):', e);
      // Return empty for fallback to localStorage
      return { conversations: [], contacts: [] };
    }
  },

  /**
   * Get direct messages for a conversation
   */
  getDirectMessages: async (conversationId: string, limit?: number): Promise<any[]> => {
    try {
      const params = limit ? { limit } : undefined;
      const response = await api.get(`/conversations/${conversationId}/messages`, { params });
      // Ensure we always return an array
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data?.messages && Array.isArray(data.messages)) {
        return data.messages;
      }
      return [];
    } catch (e) {
      console.warn('❌ Load direct messages failed:', e);
      return [];
    }
  },

  /**
   * Send a direct message
   */
  sendDirectMessage: async (receiverId: string, senderId: string, content: string): Promise<any> => {
    try {
      const response = await api.post('/messages/direct', {
        receiver_id: receiverId,
        sender_id: senderId,
        content,
      });
      return response.data;
    } catch (e) {
      console.warn('❌ Send direct message failed (may not be implemented):', e);
      throw e;
    }
  },

  /**
   * Mark messages as read
   */
  markMessagesRead: async (conversationId: string, userId: string): Promise<void> => {
    try {
      await api.post(`/conversations/${conversationId}/read`, { user_id: userId });
    } catch (e) {
      console.warn('❌ Mark messages read failed:', e);
    }
  },

  /**
   * Get unread message count
   */
  getUnreadCount: async (userId: string): Promise<number> => {
    try {
      const response = await api.get(`/users/${userId}/unread-count`);
      return response.data.count ?? 0;
    } catch (e) {
      console.warn('❌ Get unread count failed:', e);
      return 0;
    }
  },

  /**
   * Search users by username
   */
  searchUsers: async (query: string): Promise<any[]> => {
    try {
      const response = await api.get('/users/search', { params: { q: query, limit: 20 } });
      return response.data || [];
    } catch (e) {
      console.warn('❌ Search users failed:', e);
      return [];
    }
  },

  /**
   * Delete a single direct message
   */
  deleteDirectMessage: async (messageId: string, userId: string): Promise<boolean> => {
    try {
      await api.delete(`/messages/${messageId}`, { data: { user_id: userId } });
      return true;
    } catch (e) {
      console.warn('❌ Delete message failed:', e);
      return false;
    }
  },

  /**
   * Delete an entire conversation and all its messages
   */
  deleteConversation: async (conversationId: string, userId: string): Promise<boolean> => {
    try {
      await api.delete(`/conversations/${conversationId}`, { data: { user_id: userId } });
      return true;
    } catch (e) {
      console.warn('❌ Delete conversation failed:', e);
      return false;
    }
  },
};

export default apiClient;