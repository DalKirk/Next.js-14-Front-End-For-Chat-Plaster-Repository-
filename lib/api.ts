import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload } from './types';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Error handler for development/missing backend
const handleApiError = (error: any, operation: string) => {
  if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
    throw new Error(`Backend not available. Please check if your API server is running at ${API_BASE_URL}`);
  }
  throw new Error(`${operation} failed: ${error.response?.data?.message || error.message}`);
};

// API functions matching your FastAPI endpoints
export const apiClient = {
  // User endpoints
  createUser: async (username: string): Promise<User> => {
    try {
      const response = await api.post('/users', { username });
      return response.data;
    } catch (error) {
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