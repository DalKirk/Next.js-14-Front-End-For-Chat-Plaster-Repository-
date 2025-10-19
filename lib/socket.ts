import { SocketMessage } from './types';

class SocketManager {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, Function> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private roomId: string = '';
  private userId: string = '';
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private keepAliveIntervalMs = 10000; // Send keep-alive every 10 seconds

  connect(roomId: string, userId: string): void {
    this.roomId = roomId;
    this.userId = userId;
    // Build WS host/protocol robustly.
    let host = '';
    let protocol: 'wss' | 'ws' = 'ws';

    // Always use explicit Railway backend for all WebSocket connections
    const WS_URL = `wss://web-production-64adb.up.railway.app/ws/${roomId}/${userId}`;
    
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
      
      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.stopKeepAlive();
        this.callbacks.get('connect')?.(false);
        this.callbacks.get('error')?.(new Error('WebSocket error'));
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received WebSocket message:', data);
          
          // Handle ping from server - respond with pong
          if (data.type === 'ping') {
            console.log('🏓 Received ping from server, sending pong');
            this.socket?.send(JSON.stringify({ type: 'pong' }));
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
        console.log('💓 Sending WebSocket keep-alive');
        // Send a simple keep-alive message that the server can ignore
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

  onNotification(callback: (notification: SocketMessage) => void): void {
    this.callbacks.set('notification', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.callbacks.set('error', callback);
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