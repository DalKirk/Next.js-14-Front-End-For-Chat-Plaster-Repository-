import axios from 'axios';
import { User, Room, Message, LiveStream, VideoUpload } from './types';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions matching your FastAPI endpoints
export const apiClient = {
  // User endpoints
  createUser: async (username: string): Promise<User> => {
    const response = await api.post('/users', { username });
    return response.data;
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