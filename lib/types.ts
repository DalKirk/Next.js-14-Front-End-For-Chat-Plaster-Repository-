// Types matching your FastAPI backend
export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  timestamp: string;
  type: 'message' | 'system' | 'video_ready' | 'live_stream_created' | 'user_joined' | 'user_left';
}

export interface LiveStream {
  id: string;
  stream_key: string;
  playback_id: string;
  title: string;
  status: string;
}

export interface VideoUpload {
  id: string;
  upload_url: string;
  asset_id: string;
  title: string;
  description?: string;
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
}

export interface ChatState {
  currentUser: User | null;
  currentRoom: Room | null;
  messages: Message[];
  isConnected: boolean;
  typingUsers: string[];
}