import { io, Socket } from 'socket.io-client';
import { SocketMessage } from './types';

class SocketManager {
  private socket: Socket | null = null;
  private callbacks: Map<string, Function> = new Map();

  connect(roomId: string, userId: string): Socket {
    const WS_URL = process.env.NODE_ENV === 'production' 
      ? 'https://web-production-64adb.up.railway.app'
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    console.log('🔧 WebSocket Configuration:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      WS_URL,
      roomId,
      userId,
      forced_production: process.env.NODE_ENV === 'production'
    });
    
    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      query: {
        room_id: roomId,
        user_id: userId
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
      this.callbacks.get('connect')?.(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      this.callbacks.get('connect')?.(false);
    });

    this.socket.on('message', (data: SocketMessage) => {
      this.callbacks.get('message')?.(data);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(content: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message', { content });
    }
  }

  onConnect(callback: (connected: boolean) => void): void {
    this.callbacks.set('connect', callback);
  }

  onMessage(callback: (message: SocketMessage) => void): void {
    this.callbacks.set('message', callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketManager = new SocketManager();
export default socketManager;