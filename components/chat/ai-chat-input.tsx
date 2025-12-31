'use client';

import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface AIChatInputProps {
  onSendMessage: (content: string, sender?: string) => void;
  conversationHistory?: Array<{ username?: string; content?: string }>;
  disabled?: boolean;
  onTyping?: (isTyping?: boolean) => void;
  className?: string;
}

export function AIChatInput({
  onSendMessage,
  conversationHistory = [],
  disabled = false,
  onTyping,
  className = ''
}: AIChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = () => {
    if (!message.trim() || disabled) return;
    const content = message.trim();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (onTyping) onTyping(false);
    onSendMessage(content);
    setMessage('');
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    if (onTyping && value.trim()) {
      onTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    } else if (onTyping && !value.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Textarea
            placeholder={disabled ? 'Connect to server to send messages' : 'Type your message...'}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            disabled={disabled}
            rows={2}
            className="min-h-[48px] max-h-[160px] resize-none"
          />
        </div>
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
          variant="primary"
          size="sm"
          className="px-4 mt-0"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
