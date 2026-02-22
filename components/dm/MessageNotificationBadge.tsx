'use client';

import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface MessageNotificationBadgeProps {
  userId: string;
  onClick?: () => void;
  className?: string;
}

export function MessageNotificationBadge({ userId, onClick, className = '' }: MessageNotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Load initial count
    loadUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    // Listen for local message events
    const handleNewMessage = (e: CustomEvent) => {
      if (e.detail?.receiverId === userId) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleMessagesRead = (e: CustomEvent) => {
      if (e.detail?.userId === userId) {
        setUnreadCount(e.detail.unreadCount ?? 0);
      }
    };

    window.addEventListener('dm-new-message' as any, handleNewMessage);
    window.addEventListener('dm-messages-read' as any, handleMessagesRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dm-new-message' as any, handleNewMessage);
      window.removeEventListener('dm-messages-read' as any, handleMessagesRead);
    };
  }, [userId]);

  const loadUnreadCount = async () => {
    try {
      const count = await apiClient.getUnreadCount(userId);
      setUnreadCount(count);
    } catch {
      // Fallback to localStorage
      const stored = localStorage.getItem(`dm-contacts-${userId}`);
      if (stored) {
        const contacts = JSON.parse(stored);
        const total = contacts.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
        setUnreadCount(total);
      }
    }
  };

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg hover:bg-slate-800/50 transition-colors ${className}`}
      title="Messages"
    >
      <Mail className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-lg">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default MessageNotificationBadge;
