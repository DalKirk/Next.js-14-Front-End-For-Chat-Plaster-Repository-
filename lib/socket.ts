import { SocketMessage } from './types';

class SocketManager {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, Function> = new Map();
  private messageQueue: Map<string, any[]> = new Map(); // Queue for messages received before handlers registered
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5 for Railway free tier wake-up
  private reconnectDelay = 1000;
  private roomId: string = '';
  private userId: string = '';
  private username: string = '';
  private avatarUrl: string | undefined;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private keepAliveIntervalMs = 10000; // Send keep-alive every 10 seconds

  connect(roomId: string, userId: string, username?: string, avatarUrl?: string): void {
    this.roomId = roomId;
    this.userId = userId;
    this.username = username || '';
    this.avatarUrl = avatarUrl;
    
    // If already connected to the same room, don't reconnect
    if (this.socket?.readyState === WebSocket.OPEN && this.roomId === roomId && this.userId === userId) {
      console.log('⚠️ Already connected to this room, skipping reconnect');
      return;
    }
    
    // Build WS host/protocol robustly.
    let host = '';
    let protocol: 'wss' | 'ws' = 'ws';

    // Use environment variable for WebSocket URL, fallback to API base (converted to ws/wss)
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const DEFAULT_WS_BASE = API_BASE.replace(/^http/, API_BASE.startsWith('https') ? 'wss' : 'ws');
    const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_BASE;
    const qp: string[] = [];
    if (this.username) qp.push(`username=${encodeURIComponent(this.username)}`);
    // Prefer actual avatar URL but avoid sending large data URLs in the WS query
    const finalAvatarUrl = this.avatarUrl || (() => {
      const name = (this.username || userId || 'User').toString();
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    })();
    const isSafeAvatarUrl = typeof finalAvatarUrl === 'string' && /^https?:\/\//.test(finalAvatarUrl) && finalAvatarUrl.length < 500;
    if (isSafeAvatarUrl) {
      qp.push(`avatar_url=${encodeURIComponent(finalAvatarUrl)}`);
    } else {
      console.log('⚠️ Skipping avatar_url in WS query (unsafe or too long).');
    }
    const query = qp.length ? `?${qp.join('&')}` : '';
    const WS_URL = `${WS_BASE_URL}/ws/${roomId}/${userId}${query}`;
    console.log('🔗 WebSocket URL includes avatar_url:', finalAvatarUrl.substring(0, 50) + '...');
    
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
      console.log('🔌 Creating WebSocket connection to:', WS_URL);
      this.socket = new WebSocket(WS_URL);
      
      this.socket.onopen = () => {
        console.log('✅ Connected to WebSocket successfully at:', WS_URL);
        console.log('👤 User:', userId, '🏠 Room:', roomId);
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
        console.error('❌ WebSocket error occurred:', error);
        console.log('📊 WebSocket state:', this.socket?.readyState);
        console.log('🔗 Attempted URL:', WS_URL);
        console.log('🔧 Room ID:', roomId, 'User ID:', userId);
        console.log('💡 Make sure your backend WebSocket is running and accepting connections');
        this.stopKeepAlive();
        this.callbacks.get('connect')?.(false);
        this.callbacks.get('error')?.(new Error('WebSocket connection error - Check backend logs'));
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
            return;
          }
          if (data.type === 'user_joined' || data.type === 'user_left' || data.type === 'room_state') {
            this.callbacks.get('notification')?.(data);
            return;
          }
          if (data.type === 'webrtc-signal') {
            if (this.callbacks.has('webrtc-signal')) {
              this.callbacks.get('webrtc-signal')?.(data);
            } else {
              // Queue for later - handler not registered yet
              console.log('📨 Queuing webrtc-signal (handler not yet registered)');
              if (!this.messageQueue.has('webrtc-signal')) this.messageQueue.set('webrtc-signal', []);
              this.messageQueue.get('webrtc-signal')!.push(data);
            }
            return;
          }
          if (data.type === 'broadcast-started') {
            if (this.callbacks.has('broadcast-started')) {
              this.callbacks.get('broadcast-started')?.(data);
            } else {
              console.log('📨 Queuing broadcast-started (handler not yet registered)');
              if (!this.messageQueue.has('broadcast-started')) this.messageQueue.set('broadcast-started', []);
              this.messageQueue.get('broadcast-started')!.push(data);
            }
            return;
          }
          if (data.type === 'broadcast-stopped') {
            if (this.callbacks.has('broadcast-stopped')) {
              this.callbacks.get('broadcast-stopped')?.(data);
            } else {
              console.log('📨 Queuing broadcast-stopped (handler not yet registered)');
              if (!this.messageQueue.has('broadcast-stopped')) this.messageQueue.set('broadcast-stopped', []);
              this.messageQueue.get('broadcast-stopped')!.push(data);
            }
            return;
          }
          if (data.type === 'active-broadcasts') {
            if (this.callbacks.has('active-broadcasts')) {
              this.callbacks.get('active-broadcasts')?.(data);
            } else {
              console.log('📨 Queuing active-broadcasts (handler not yet registered)');
              if (!this.messageQueue.has('active-broadcasts')) this.messageQueue.set('active-broadcasts', []);
              this.messageQueue.get('active-broadcasts')!.push(data);
            }
            return;
          }
          // Fallback: treat as notification for unknown types
          this.callbacks.get('notification')?.(data);
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
    this.messageQueue.clear(); // Clear queued messages on disconnect
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

  sendMessage(content: string, avatar?: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ 
        type: 'message',  // Add type field for backend
        content, 
        avatar,
        username: this.username,
        user_id: this.userId,
        timestamp: new Date().toISOString()
      });
      console.log('📤 Sending WebSocket message:', { 
        content: content.substring(0, 50) + '...', 
        avatar: avatar ? 'YES (' + avatar.substring(0, 30) + '...)' : 'NO',
        username: this.username,
        user_id: this.userId
      });
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

  // Emit profile updates so the backend can broadcast to all room clients
  sendProfileUpdate(update: { username?: string; prevUsername?: string; email?: string; bio?: string; avatar_url?: string; avatar?: string }): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot send profile update - WebSocket not connected');
      return;
    }
    const payload = {
      type: 'profile_updated',
      user_id: this.userId,
      room_id: this.roomId,
      username: update.username ?? this.username,
      prevUsername: update.prevUsername,
      email: update.email,
      bio: update.bio,
      avatar: update.avatar ?? update.avatar_url ?? this.avatarUrl,
    };
    this.socket.send(JSON.stringify(payload));
  }

  // Emit avatar-only updates
  sendAvatarUpdate(avatarUrl: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot send avatar update - WebSocket not connected');
      return;
    }
    const payload = {
      type: 'avatar_updated',
      user_id: this.userId,
      room_id: this.roomId,
      avatar: avatarUrl,
      username: this.username,
    };
    this.socket.send(JSON.stringify(payload));
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

  // WebRTC signaling methods
  sendWebRTCSignal(roomId: string, targetUserId: string, signal: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot send WebRTC signal - WebSocket not connected');
      return;
    }
    
    const payload = {
      type: 'webrtc-signal',
      room_id: roomId,
      target_user_id: targetUserId,
      from_user_id: this.userId,
      from_username: this.username,
      signal,
    };
    
    console.log('📡 Sending WebRTC signal to:', targetUserId);
    this.socket.send(JSON.stringify(payload));
  }

  notifyBroadcastStarted(roomId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot notify broadcast start - WebSocket not connected');
      return;
    }
    
    const payload = {
      type: 'broadcast-started',
      room_id: roomId,
      user_id: this.userId,
      username: this.username,
    };
    
    console.log('📡 Notifying room: broadcast started');
    this.socket.send(JSON.stringify(payload));
  }

  notifyBroadcastStopped(roomId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot notify broadcast stop - WebSocket not connected');
      return;
    }
    
    const payload = {
      type: 'broadcast-stopped',
      room_id: roomId,
      user_id: this.userId,
      username: this.username,
    };
    
    console.log('📡 Notifying room: broadcast stopped');
    this.socket.send(JSON.stringify(payload));
  }

  // Generic event listener for WebRTC
  on(event: string, callback: Function): void {
    this.callbacks.set(event, callback);
    
    // Replay any queued messages for this event type
    const queued = this.messageQueue.get(event);
    if (queued && queued.length > 0) {
      console.log(`📨 Replaying ${queued.length} queued ${event} message(s)`);
      queued.forEach(data => callback(data));
      this.messageQueue.delete(event);
    }
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