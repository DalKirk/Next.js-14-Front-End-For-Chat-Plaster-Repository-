import { useState, useEffect } from 'react';
import { socketManager } from '@/lib/socket';
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

    // Connect to WebSocket
    socketManager.connect(roomId, user.id);

    // Set up event listeners
    socketManager.onConnect(setIsConnected);
    socketManager.onMessage(handleMessage);

    return () => {
      socketManager.disconnect();
    };
  }, [roomId, user.id]);

  const handleMessage = (socketMessage: SocketMessage) => {
    const messageType = socketMessage.type === 'user_joined' || socketMessage.type === 'user_left' 
      ? 'system' 
      : socketMessage.type || 'message';
      
    const message: Message = {
      id: Date.now().toString(),
      room_id: roomId,
      user_id: user.id,
      username: socketMessage.username || 'System',
      content: socketMessage.content || socketMessage.message || '',
      timestamp: socketMessage.timestamp,
      type: messageType,
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