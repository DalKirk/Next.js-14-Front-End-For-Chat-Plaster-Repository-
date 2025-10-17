import { SocketMessage } from './types';

class SocketManager {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, Function> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private roomId: string = '';
  private userId: string = '';

  connect(roomId: string, userId: string): void {
    this.roomId = roomId;
    this.userId = userId;
    
    const BASE_URL = process.env.NODE_ENV === 'production' 
      ? 'natural-presence-production.up.railway.app'
      : (process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000');
    
    const WS_PROTOCOL = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
    const WS_URL = `${WS_PROTOCOL}://${BASE_URL}/ws/${roomId}/${userId}`;
    
    console.log('🔧 WebSocket Configuration:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      BASE_URL,
      WS_URL,
      roomId,
      userId,
      forced_production: process.env.NODE_ENV === 'production'
    });
    
    // Disconnect existing connection
    if (this.socket) {
      this.socket.close();
    }
    
    try {
      this.socket = new WebSocket(WS_URL);
      
      this.socket.onopen = () => {
        console.log('✅ Connected to WebSocket successfully');
        this.reconnectAttempts = 0;
        this.callbacks.get('connect')?.(true);
      };

      this.socket.onclose = (event) => {
        console.log('❌ Disconnected from WebSocket:', event.code, event.reason);
        this.callbacks.get('connect')?.(false);
        
        // Auto-reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(roomId, userId), delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.callbacks.get('connect')?.(false);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received WebSocket message:', data);
          
          // Handle different message types
          if (data.type === 'message') {
            this.callbacks.get('message')?.(data);
          } else if (data.type === 'user_joined' || data.type === 'user_left') {
            this.callbacks.get('notification')?.(data);
          } else {
            this.callbacks.get('message')?.(data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.callbacks.get('connect')?.(false);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
      this.socket.close();
      this.socket = null;
    }
  }

  sendMessage(content: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('📤 Sending message via WebSocket:', content);
      const message = JSON.stringify({ content });
      this.socket.send(message);
    } else {
      console.error('❌ Cannot send message - WebSocket not connected');
      throw new Error('WebSocket not connected. Current state: ' + this.socket?.readyState);
    }
  }

  onConnect(callback: (connected: boolean) => void): void {
    this.callbacks.set('connect', callback);
  }

  onMessage(callback: (message: SocketMessage) => void): void {
    this.callbacks.set('message', callback);
  }

  onNotification(callback: (notification: any) => void): void {
    this.callbacks.set('notification', callback);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getReadyState(): number | null {
    return this.socket?.readyState || null;
  }
}

export const socketManager = new SocketManager();
export default socketManager;