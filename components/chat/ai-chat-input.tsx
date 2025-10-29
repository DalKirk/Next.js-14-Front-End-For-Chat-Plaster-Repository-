'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { claudeAPI } from '@/lib/api/claude';
import { Message } from '@/lib/types';
import toast from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  LightBulbIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface AIChatInputProps {
  onSendMessage: (content: string, sender?: string) => void;
  conversationHistory?: Message[];
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ ai_enabled: boolean } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check AI health on mount
  useEffect(() => {
    checkAIHealth();
  }, []);

  const checkAIHealth = async () => {
    try {
      const health = await claudeAPI.checkHealth();
      setAiHealth(health);
    } catch (error) {
      console.error('AI health check failed:', error);
      setAiHealth({ ai_enabled: false });
    }
  };

  // Generate smart reply suggestions based on recent messages
  const generateSuggestions = async () => {
    if (!aiHealth?.ai_enabled) return;
    if (conversationHistory.length === 0) return;

    setIsLoadingSuggestions(true);
    try {
      // Get last few messages for context
      const recentMessages = conversationHistory.slice(-5).map(msg => ({
        username: msg.username,
        content: msg.content
      }));

      const result = await claudeAPI.suggestReply(recentMessages);
      
      if (result && result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions.slice(0, 3)); // Show max 3 suggestions
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      // Silently fail - don't interrupt user experience
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Moderate content before sending
  const checkContent = async (content: string): Promise<boolean> => {
    if (!aiHealth?.ai_enabled) return true; // Allow if AI disabled

    setIsChecking(true);
    try {
      // Run moderation and spam detection in parallel
      const [moderationResult, spamResult] = await Promise.all([
        claudeAPI.moderate(content),
        claudeAPI.detectSpam(content)
      ]);

      // Check if spam
      if (spamResult.is_spam) {
        toast.error(
          `⚠️ This message looks like spam: ${spamResult.reason}`,
          { duration: 4000 }
        );
        return false;
      }

      // Check if safe
      if (!moderationResult.is_safe) {
        toast.error(
          `⚠️ This message violates content policy: ${moderationResult.reason}`,
          { duration: 4000 }
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Content check failed:', error);
      // Fail open - allow message if AI check fails
      return true;
    } finally {
      setIsChecking(false);
    }
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim() || disabled || isChecking) return;

    const content = message.trim();

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (onTyping) onTyping(false);

    // Check content with AI
    const isSafe = await checkContent(content);
    if (!isSafe) return;

    // Send message
    try {
      onSendMessage(content);
      setMessage('');
      setSuggestions([]);
      setShowSuggestions(false);
      
      // Generate new suggestions after sending
      setTimeout(generateSuggestions, 500);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  // Handle message change with typing indicator
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Trigger typing indicator
    if (onTyping && value.trim()) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    } else if (onTyping && !value.trim()) {
      // Clear typing if message is empty
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping(false);
    }
  };

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Request AI to enhance message
  const enhanceMessage = async () => {
    if (!message.trim() || !aiHealth?.ai_enabled) return;

    const loadingToast = toast.loading('✨ Enhancing your message...');
    try {
      const enhanced = await claudeAPI.generate(
        `Improve this message to be more clear and friendly while keeping the same meaning: "${message.trim()}"`,
        { maxTokens: 100, temperature: 0.7 }
      );
      
      if (enhanced && enhanced.response) {
        setMessage(enhanced.response);
        toast.success('✨ Message enhanced!', { id: loadingToast });
      }
    } catch (error) {
      console.error('Failed to enhance message:', error);
      toast.error('Failed to enhance message', { id: loadingToast });
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* AI Status Indicator */}
      {aiHealth?.ai_enabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between text-xs text-white/60 px-2"
        >
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-blue-400" />
            <span>AI assistance enabled</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-green-400" />
            <span>Content moderation active</span>
          </div>
        </motion.div>
      )}

      {/* Smart Reply Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-xs text-white/60 px-2">
              <LightBulbIcon className="w-4 h-4 text-yellow-400" />
              <span>Smart reply suggestions:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    setMessage(suggestion);
                    setShowSuggestions(false);
                    textareaRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white/90 transition-all hover:scale-105"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input Area */}
      <div className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
          <Textarea
            placeholder={
              disabled
                ? 'Connect to server to send messages'
                : 'Type your message (Markdown supported)...\nShift+Enter for new line, Enter to send'
            }
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            disabled={disabled || isChecking}
            rows={message.includes('\n') || message.length > 80 ? Math.min(Math.max(message.split('\n').length, 3), 10) : 2}
            className="min-h-[60px] max-h-[300px] resize-none"
          />          {/* AI Action Buttons */}
          {aiHealth?.ai_enabled && message.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <Button
                onClick={enhanceMessage}
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={disabled || isChecking}
              >
                <SparklesIcon className="w-3 h-3 mr-1" />
                Enhance
              </Button>
              
              {!showSuggestions && conversationHistory.length > 0 && (
                <Button
                  onClick={generateSuggestions}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={disabled || isLoadingSuggestions}
                >
                  <LightBulbIcon className="w-3 h-3 mr-1" />
                  {isLoadingSuggestions ? 'Loading...' : 'Get Suggestions'}
                </Button>
              )}
            </motion.div>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled || isChecking}
          variant="primary"
          size="sm"
          className="px-4 mt-0"
        >
          {isChecking ? (
            <ShieldCheckIcon className="w-4 h-4" style={{ animation: 'spin 3s linear infinite' }} />
          ) : (
            <PaperAirplaneIcon className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Status Messages */}
      {isChecking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-blue-400 px-2"
        >
          <ShieldCheckIcon className="w-4 h-4 animate-pulse" />
          <span>Checking message safety...</span>
        </motion.div>
      )}
    </div>
  );
}
