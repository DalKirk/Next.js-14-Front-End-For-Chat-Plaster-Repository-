import { useState, useEffect } from 'react';
import { socketManager } from '@/lib/socket';
import { apiClient } from '@/lib/api';
import { SocketMessage, Message, User, Room } from '@/lib/types';

interface UseChatProps {
  roomId: string;
  user: User;
}

export function useChat({ roomId, user }: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId || !user) return;

    let cancelled = false;

    // Ensure backend knows about the user-room relationship before opening WebSocket
    (async () => {
      try {
        // Ensure backend knows about the user-room relationship before opening WebSocket
        await apiClient.joinRoom(roomId, user.id, user.username, user.avatar_url);
      } catch (err) {
        // If joining the room fails, do not attempt the WebSocket connection
        // eslint-disable-next-line no-console
        console.error('Failed to join room before WebSocket connect', err);
        setIsConnected(false);
        return;
      }

      if (cancelled) return;

      // Connect to WebSocket (include username and avatar for accurate presence)
      socketManager.connect(roomId, user.id, user.username, user.avatar_url);

      // Set up event listeners
      socketManager.onConnect(setIsConnected);
      socketManager.onMessage(handleMessage);
    })();

    return () => {
      cancelled = true;
      socketManager.disconnect();
    };
  }, [roomId, user.id]);

  const handleMessage = (socketMessage: SocketMessage) => {
    const incomingType: SocketMessage['type'] = socketMessage.type || 'message';

    // Handle live profile and avatar updates: patch history + caches
    if (incomingType === 'profile_updated' || incomingType === 'avatar_updated') {
      const updatedUsername = socketMessage.username || 'Anonymous';
      const updatedAvatar = socketMessage.avatar || socketMessage.avatar_url;
      const targetUserId = socketMessage.user_id;
      const prevUsername = socketMessage.prevUsername;

      // Patch existing messages from this user (by id or previous username)
      setMessages((prev: Message[]) => prev.map((m) => {
        const sameUser = targetUserId ? m.user_id === targetUserId : false;
        const sameName = prevUsername ? m.username === prevUsername : false;
        if (sameUser || sameName) {
          return {
            ...m,
            username: updatedUsername || m.username,
            avatar: updatedAvatar || m.avatar,
          };
        }
        return m;
      }));

      // Update local caches for avatar resolution
      try {
        const byIdRaw = localStorage.getItem('userAvatarCacheById');
        const byNameRaw = localStorage.getItem('userAvatarCache');
        const byId = byIdRaw ? JSON.parse(byIdRaw) : {};
        const byName = byNameRaw ? JSON.parse(byNameRaw) : {};
        if (targetUserId && updatedAvatar) byId[targetUserId] = updatedAvatar;
        if (updatedUsername && updatedAvatar) byName[updatedUsername] = updatedAvatar;
        if (prevUsername && updatedAvatar) delete byName[prevUsername];
        localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
        localStorage.setItem('userAvatarCache', JSON.stringify(byName));
      } catch {}

      // Also add a lightweight system notification to the feed
      const systemMsg: Message = {
        id: Date.now().toString(),
        room_id: roomId,
        user_id: targetUserId || 'system',
        username: updatedUsername,
        content: incomingType === 'profile_updated' ? 'Profile updated' : 'Avatar updated',
        timestamp: socketMessage.timestamp,
        type: 'system',
        avatar: updatedAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedUsername)}&background=random&size=128`,
      };
      setMessages((prev: Message[]) => [...prev, systemMsg]);
      return;
    }

    // Default handling for chat and presence events
    const messageType = incomingType === 'user_joined' || incomingType === 'user_left' ? 'system' : incomingType;
    const username = socketMessage.username || 'System';
    const avatar = socketMessage.avatar || socketMessage.avatar_url || user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=128`;

    const message: Message = {
      id: Date.now().toString(),
      room_id: roomId,
      user_id: socketMessage.user_id || user.id,
      username,
      content: socketMessage.content || socketMessage.message || '',
      timestamp: socketMessage.timestamp,
      type: messageType,
      avatar,
    };

    setMessages((prev: Message[]) => [...prev, message]);
  };

  const sendMessage = (content: string) => {
    if (!content.trim() || !isConnected) return;
    socketManager.sendMessage(content);
  };

  const loadMessages = (initialMessages: Message[]) => {
    setMessages(initialMessages);
  };

  return {
    messages,
    isConnected,
    typingUsers,
    sendMessage,
    loadMessages,
  };
}