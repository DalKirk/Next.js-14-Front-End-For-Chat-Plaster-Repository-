/**
 * DM Socket Manager - WebSocket-based direct messaging
 * 
 * Similar to room socket.ts but designed for 1-on-1 DMs.
 * Uses a dedicated DM WebSocket endpoint for real-time messaging.
 */

import { DMMessage } from '@/components/dm/DMSection';

export interface DMSocketMessage {
  type: 'dm_message' | 'dm_read' | 'dm_typing' | 'dm_connect' | 'dm_error';
  message?: DMMessage;
  sender_id?: string;
  receiver_id?: string;
  conversation_id?: string;
  timestamp?: string;
}

class DMSocketManager {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, Function> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private userId: string = '';
  private username: string = '';
  private avatarUrl: string | undefined;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private keepAliveIntervalMs = 15000;
  private isConnecting = false;

  connect(userId: string, username: string, avatarUrl?: string): void {
    // Prevent duplicate connections
    if (this.isConnecting) {
      console.log('[DM Socket] Connection already in progress');
      return;
    }
    
    if (this.socket?.readyState === WebSocket.OPEN && this.userId === userId) {
      console.log('[DM Socket] Already connected');
      return;
    }

    this.userId = userId;
    this.username = username;
    this.avatarUrl = avatarUrl;
    this.isConnecting = true;

    // Build WebSocket URL
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const WS_BASE = API_BASE.replace(/^http/, API_BASE.startsWith('https') ? 'wss' : 'ws');
    
    const params = new URLSearchParams();
    params.set('username', username);
    if (avatarUrl && avatarUrl.length < 500 && /^https?:\/\//.test(avatarUrl)) {
      params.set('avatar_url', avatarUrl);
    }
    
    const WS_URL = `${WS_BASE}/ws/dm/${userId}?${params.toString()}`;
    
    console.log('[DM Socket] Connecting to:', WS_URL);

    // Close existing connection
    if (this.socket) {
      this.socket.close();
    }

    try {
      this.socket = new WebSocket(WS_URL);

      this.socket.onopen = () => {
        console.log('[DM Socket] ✅ Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startKeepAlive();
        this.callbacks.get('connect')?.(true);
      };

      this.socket.onclose = (event) => {
        console.log('[DM Socket] ❌ Disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.stopKeepAlive();
        this.callbacks.get('connect')?.(false);

        // Auto-reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 10000);
          console.log(`[DM Socket] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(this.userId, this.username, this.avatarUrl), delay);
        }
      };

      this.socket.onerror = (error) => {
        console.error('[DM Socket] ❌ Error:', error);
        this.isConnecting = false;
        this.callbacks.get('error')?.(new Error('DM WebSocket error'));
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[DM Socket] 📨 Received:', data);

          if (data.type === 'ping') {
            this.socket?.send(JSON.stringify({ type: 'pong' }));
            return;
          }

          if (data.type === 'dm_message') {
            this.callbacks.get('message')?.(data.message || data);
            return;
          }

          if (data.type === 'dm_typing') {
            this.callbacks.get('typing')?.(data);
            return;
          }

          if (data.type === 'dm_read') {
            this.callbacks.get('read')?.(data);
            return;
          }

          // Generic message callback
          this.callbacks.get('message')?.(data);
        } catch (error) {
          console.error('[DM Socket] Error parsing message:', error);
        }
      };
    } catch (error) {
      console.error('[DM Socket] Connection error:', error);
      this.isConnecting = false;
      this.callbacks.get('connect')?.(false);
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.stopKeepAlive();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
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

  sendMessage(receiverId: string, content: string, avatar?: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('[DM Socket] Cannot send - not connected');
      return false;
    }

    const message = {
      type: 'dm_message',
      sender_id: this.userId,
      sender_username: this.username,
      sender_avatar: avatar || this.avatarUrl,
      receiver_id: receiverId,
      content,
      timestamp: new Date().toISOString(),
    };

    console.log('[DM Socket] 📤 Sending message:', { to: receiverId, content: content.substring(0, 50) });
    this.socket.send(JSON.stringify(message));
    return true;
  }

  sendTypingIndicator(receiverId: string, isTyping: boolean): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'dm_typing',
        sender_id: this.userId,
        receiver_id: receiverId,
        is_typing: isTyping,
        timestamp: Date.now(),
      }));
    }
  }

  markAsRead(senderId: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'dm_read',
        reader_id: this.userId,
        sender_id: senderId,
        timestamp: Date.now(),
      }));
    }
  }

  onConnect(callback: (connected: boolean) => void): void {
    this.callbacks.set('connect', callback);
  }

  onMessage(callback: (message: DMMessage) => void): void {
    this.callbacks.set('message', callback);
  }

  onTyping(callback: (data: { sender_id: string; is_typing: boolean }) => void): void {
    this.callbacks.set('typing', callback);
  }

  onRead(callback: (data: { reader_id: string; sender_id: string }) => void): void {
    this.callbacks.set('read', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.callbacks.set('error', callback);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getUserId(): string {
    return this.userId;
  }
}

export const dmSocketManager = new DMSocketManager();
export default dmSocketManager;
