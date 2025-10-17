import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload } from './types';

// API configuration - Force Railway URL for production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://natural-presence-production.up.railway.app'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Debug logging for environment variables (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_BASE_URL
  });
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // 15 second timeout
  withCredentials: false, // Disable credentials for CORS
});

// Error handler for development/missing backend
const handleApiError = (error: any, operation: string) => {
  console.error(`❌ ${operation} failed:`, error);
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
    throw new Error(`⚠️ Backend not available at ${API_BASE_URL}. The Railway server may be sleeping or offline. Please try again in a few moments.`);
  }
  
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || error.response.data?.detail || error.message;
    
    if (status === 502) {
      throw new Error(`🔄 Backend server is currently unavailable (502 Bad Gateway). The Railway service may be sleeping or restarting. Please wait 30-60 seconds and try again.`);
    } else if (status === 503) {
      throw new Error(`⏳ Backend service is temporarily unavailable (503). Please try again shortly.`);
    } else if (status === 404) {
      throw new Error(`❌ API endpoint not found. Check if ${API_BASE_URL} is the correct backend URL.`);
    } else if (status === 500) {
      throw new Error(`💥 Backend server error: ${message}`);
    } else if (status >= 400) {
      throw new Error(`⚠️ Request failed (${status}): ${message}`);
    }
  } else if (error.request) {
    // Network error or no response - check for CORS
    if (error.message?.includes('CORS') || error.message?.includes('Access-Control')) {
      throw new Error(`🚫 CORS Error: Backend at ${API_BASE_URL} doesn't allow requests from ${typeof window !== 'undefined' ? window.location.origin : 'this domain'}. Please configure CORS in your FastAPI backend.`);
    }
    // Network error or no response
    throw new Error(`🌐 Network error: Unable to reach backend at ${API_BASE_URL}. Please check your internet connection or CORS settings.`);
  }
  
  throw new Error(`${operation} failed: ${error.message}`);
};

// Health check endpoint
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// API functions matching your FastAPI endpoints
export const apiClient = {
  // Health check
  checkHealth: checkServerHealth,

  // User endpoints
  createUser: async (username: string): Promise<User> => {
    try {
      console.log(`🚀 Creating user "${username}" at ${API_BASE_URL}/users`);
      const response = await api.post('/users', { username });
      console.log('✅ User created successfully:', response.data);
      return response.data;
    } catch (error) {
      handleApiError(error, 'User creation');
      throw error; // This will never be reached but satisfies TypeScript
    }
  },

  // Room endpoints
  getRooms: async (): Promise<Room[]> => {
    try {
      const response = await api.get('/rooms');
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get rooms');
      throw error;
    }
  },

  createRoom: async (name: string): Promise<Room> => {
    try {
      const response = await api.post('/rooms', { name });
      return response.data;
    } catch (error) {
      handleApiError(error, 'Create room');
      throw error;
    }
  },

  joinRoom: async (roomId: string, userId: string): Promise<void> => {
    try {
      await api.post(`/rooms/${roomId}/join`, { user_id: userId });
    } catch (error) {
      handleApiError(error, 'Join room');
      throw error;
    }
  },

  // Message endpoints
  getRoomMessages: async (roomId: string): Promise<Message[]> => {
    try {
      const response = await api.get(`/rooms/${roomId}/messages`);
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get room messages');
      throw error;
    }
  },

  // Video endpoints
  createLiveStream: async (roomId: string, title: string): Promise<LiveStream> => {
    try {
      const response = await api.post(`/rooms/${roomId}/live-stream`, { title });
      return response.data;
    } catch (error) {
      handleApiError(error, 'Create live stream');
      throw error;
    }
  },

  createVideoUpload: async (roomId: string, title: string, description?: string): Promise<VideoUpload> => {
    try {
      const response = await api.post(`/rooms/${roomId}/video-upload`, { 
        title, 
        description 
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'Create video upload');
      throw error;
    }
  },

  uploadVideoFile: async (uploadUrl: string, file: File): Promise<void> => {
    try {
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
      });
    } catch (error) {
      handleApiError(error, 'Upload video file');
      throw error;
    }
  },
};

export default api;