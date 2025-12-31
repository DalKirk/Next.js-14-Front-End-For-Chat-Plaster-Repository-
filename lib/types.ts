// Types matching your FastAPI backend
export interface User {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  avatar_url?: string; // Avatar URL from backend (legacy)
  avatar_urls?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  display_name?: string; // Display name (if different from username)
  created_at?: string; // Make optional since it may not always be present
}

export interface Room {
  id: string;
  name: string;
  created_at: string;
  description?: string;
  thumbnail?: string;
  thumbnail_url?: string; // Backend field for persistent thumbnails
  thumbnailPreset?: string;
  privacy?: 'public' | 'private' | 'password';
  password?: string;
  maxMembers?: number;
  memberCount?: number;
  onlineCount?: number;
  category?: string;
  tags?: string[];
  createdBy?: string;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  timestamp: string;
  type: 'message' | 'system' | 'video_ready' | 'live_stream_created' | 'user_joined' | 'user_left';
  // Optional video-related fields
  title?: string;
  playback_id?: string;
  stream_key?: string;
  // User avatar - ALWAYS present (fallback generated if not cached)
  avatar: string;
  avatar_urls?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
}

export interface LiveStream {
  id: string;
  stream_key: string;
  playback_id: string;
  title: string;
  status: string;
  rtmp_url?: string;
}

export interface VideoUpload {
  id: string;
  upload_url: string;
  asset_id: string;
  playback_id: string;
  title: string;
  description?: string;
  // Optional access key returned by the backend to authorize direct PUT uploads
  access_key?: string;
}

export interface VideoMessage extends Message {
  type: 'video_ready' | 'live_stream_created';
  playback_id: string;
  title: string;
}

export interface SocketMessage {
  type: 'message' | 'video_ready' | 'live_stream_created' | 'user_joined' | 'user_left';
  message?: string;
  username?: string;
  content?: string;
  timestamp: string;
  playback_id?: string;
  title?: string;
  avatar_url?: string;
}

export interface ChatState {
  currentUser: User | null;
  currentRoom: Room | null;
  messages: Message[];
  isConnected: boolean;
  typingUsers: string[];
}

// 3D Model Types
export interface Model3D {
  id: string;
  title: string;
  description?: string;
  prompt?: string;
  model_url: string;
  preview_url?: string;
  format: 'gltf' | 'glb';
  file_size?: number;
  created_at: string;
  room_id?: string;
  user_id?: string;
  status: string;
}

export interface Generate3DModelRequest {
  prompt: string;
  room_id?: string;
  user_id?: string;
  style?: 'realistic' | 'low-poly' | 'stylized';
  complexity?: 'simple' | 'medium' | 'complex';
}

export interface Generate3DModelResponse {
  model_id: string;
  model_url: string;
  status: 'processing' | 'completed' | 'failed';
  preview_url?: string;
  estimated_time?: number;
}