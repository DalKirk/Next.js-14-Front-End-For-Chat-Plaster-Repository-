import { SocketMessage } from './types';

class SocketManager {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, Function> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5 for Railway free tier wake-up
  private reconnectDelay = 1000;
  private roomId: string = '';
  private userId: string = '';
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private keepAliveIntervalMs = 10000; // Send keep-alive every 10 seconds

  connect(roomId: string, userId: string): void {
    this.roomId = roomId;
    this.userId = userId;
    
    // If already connected to the same room, don't reconnect
    if (this.socket?.readyState === WebSocket.OPEN && this.roomId === roomId && this.userId === userId) {
      console.log('⚠️ Already connected to this room, skipping reconnect');
      return;
    }
    
    // Build WS host/protocol robustly.
    let host = '';
    let protocol: 'wss' | 'ws' = 'ws';

    // Use environment variable for WebSocket URL, fallback to hardcoded
    const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://web-production-3ba7e.up.railway.app';
    const WS_URL = `${WS_BASE_URL}/ws/${roomId}/${userId}`;
    
    console.log('🔧 WebSocket Configuration:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      host,
      protocol,
      WS_URL,
      roomId,
      userId,
      forced_production: process.env.NODE_ENV === 'production'
    });
    
    // Disconnect existing connection
    if (this.socket) {
      console.log('🔌 Closing existing WebSocket connection before creating new one');
      this.socket.close();
    }
    
    try {
      this.socket = new WebSocket(WS_URL);
      
      this.socket.onopen = () => {
        console.log('✅ Connected to WebSocket successfully');
        this.reconnectAttempts = 0;
        this.startKeepAlive();
        this.callbacks.get('connect')?.(true);
      };

      this.socket.onclose = (event) => {
        console.log('❌ Disconnected from WebSocket:', event.code, event.reason);
        this.stopKeepAlive();
        this.callbacks.get('connect')?.(false);
        
        // Check close codes
        if (event.code === 4004) {
          // Custom code: User/Room not found - don't reconnect
          console.error('❌ Room or user not found on backend. Cannot reconnect.');
          this.callbacks.get('error')?.(new Error('Room or user not found'));
          return;
        }

        // Auto-reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          // Reduce delay for faster reconnection
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 5000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(this.roomId, this.userId), delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          this.callbacks.get('error')?.(new Error('Max reconnection attempts reached'));
        }
      };
      
      this.socket.onerror = () => {
        console.error('❌ WebSocket error occurred');
        console.log('📊 WebSocket state:', this.socket?.readyState);
        console.log('🔗 Attempted URL:', WS_URL);
        this.stopKeepAlive();
        this.callbacks.get('connect')?.(false);
        this.callbacks.get('error')?.(new Error('WebSocket connection error'));
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received WebSocket message:', data);
          
          // Handle ping from server - respond with pong
          if (data.type === 'ping') {
            this.socket?.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          // Handle typing indicators
          if (data.type === 'typing_start' || data.type === 'typing_stop') {
            this.callbacks.get('typing')?.(data);
            return;
          }
          
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
    this.stopKeepAlive();
  }

  private startKeepAlive(): void {
    this.stopKeepAlive(); // Clear any existing keep-alive
    this.keepAliveInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send a simple keep-alive message that the server can ignore (silent)
        this.socket.send(JSON.stringify({ type: 'keep_alive', timestamp: Date.now() }));
      }
    }, this.keepAliveIntervalMs);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  sendMessage(content: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ content });
      this.socket.send(message);
    } else {
      console.error('❌ Cannot send message - WebSocket not connected');
      throw new Error('WebSocket not connected. Current state: ' + this.socket?.readyState);
    }
  }

  sendTypingIndicator(isTyping: boolean): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const event = JSON.stringify({
        type: isTyping ? 'typing_start' : 'typing_stop',
        user_id: this.userId,
        room_id: this.roomId,
        timestamp: Date.now()
      });
      this.socket.send(event);
    }
  }

  onConnect(callback: (connected: boolean) => void): void {
    this.callbacks.set('connect', callback);
  }

  onMessage(callback: (message: SocketMessage) => void): void {
    this.callbacks.set('message', callback);
  }

  onNotification(callback: (notification: SocketMessage) => void): void {
    this.callbacks.set('notification', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.callbacks.set('error', callback);
  }

  onTyping(callback: (data: { type: string; user_id: string; username?: string }) => void): void {
    this.callbacks.set('typing', callback);
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