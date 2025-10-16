import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload } from './types';

// API configuration - Force Railway URL for production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://web-production-64adb.up.railway.app'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Debug logging for environment variables
console.log('🔧 API Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  API_BASE_URL,
  forced_production: process.env.NODE_ENV === 'production'
});

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Error handler for development/missing backend
const handleApiError = (error: any, operation: string) => {
  console.error(`❌ ${operation} failed:`, error);
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
    throw new Error(`Backend not available. Please check if your API server is running at ${API_BASE_URL}`);
  }
  
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || error.response.data?.detail || error.message;
    
    if (status === 404) {
      throw new Error(`API endpoint not found. Check if ${API_BASE_URL} is the correct backend URL.`);
    } else if (status === 500) {
      throw new Error(`Backend server error: ${message}`);
    } else if (status >= 400) {
      throw new Error(`Request failed (${status}): ${message}`);
    }
  } else if (error.request) {
    // Network error or no response
    throw new Error(`Network error: Unable to reach backend at ${API_BASE_URL}. Check CORS settings or network connectivity.`);
  }
  
  throw new Error(`${operation} failed: ${error.message}`);
};

// API functions matching your FastAPI endpoints
export const apiClient = {
  // User endpoints
  createUser: async (username: string): Promise<User> => {
    try {
      console.log(`🚀 Creating user "${username}" at ${API_BASE_URL}/users`);
      const response = await api.post('/users', { username });
      console.log('✅ User created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ User creation failed:', error);
      handleApiError(error, 'Create user');
      throw error; // This will never execute but satisfies TypeScript
    }
  },

  // Room endpoints
  getRooms: async (): Promise<Room[]> => {
    const response = await api.get('/rooms');
    return response.data;
  },

  createRoom: async (name: string): Promise<Room> => {
    const response = await api.post('/rooms', { name });
    return response.data;
  },

  joinRoom: async (roomId: string, userId: string): Promise<void> => {
    await api.post(`/rooms/${roomId}/join`, { user_id: userId });
  },

  // Message endpoints
  getRoomMessages: async (roomId: string): Promise<Message[]> => {
    const response = await api.get(`/rooms/${roomId}/messages`);
    return response.data;
  },

  // Video endpoints
  createLiveStream: async (roomId: string, title: string): Promise<LiveStream> => {
    const response = await api.post(`/rooms/${roomId}/live-stream`, { title });
    return response.data;
  },

  createVideoUpload: async (roomId: string, title: string, description?: string): Promise<VideoUpload> => {
    const response = await api.post(`/rooms/${roomId}/video-upload`, { 
      title, 
      description 
    });
    return response.data;
  },

  uploadVideoFile: async (uploadUrl: string, file: File): Promise<void> => {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  },
};

export default api;