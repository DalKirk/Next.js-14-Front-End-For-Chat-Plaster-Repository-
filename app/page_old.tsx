'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
// import Link from 'next/link'; // Reserved for future use
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ServerStatus } from '@/components/ui/server-status';
import { apiClient } from '@/lib/api';
import { claudeAPI } from '@/lib/api/claude';
import toast from 'react-hot-toast';
import { 
  SparklesIcon, 
  PaperAirplaneIcon,
  // LightBulbIcon,
  // CodeBracketIcon,
  // ChatBubbleLeftRightIcon,
  // VideoCameraIcon,
  // CommandLineIcon,
  // BoltIcon,
  // LockClosedIcon,
  UserCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  username: string;
}

interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Claude AI State
  const [claudeMessages, setClaudeMessages] = useState<ClaudeMessage[]>([]);
  const [claudeInput, setClaudeInput] = useState('');
  const [isClaudeTyping, setIsClaudeTyping] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ ai_enabled: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const textareaRef = useRef<HTMLTextAreaElement>(null); // Reserved for future use
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('chat-user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('chat-user');
      }
    }
    
    // Check AI health
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
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [claudeMessages]);

  // Format text with proper spacing and line breaks
  const formatText = (text: string) => {
    // DO NOT modify the text - display it exactly as received from the stream
    // Only split by newlines to create paragraphs
    return text
      .split('\n')
      .map((line, i) => (
        <p key={i} className="mb-3 last:mb-0 leading-loose tracking-wide">
          {line || '\u00A0'} {/* Non-breaking space for empty lines */}
        </p>
      ));
  };

  const handleCreateUser = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsLoading(true);
    try {
      const user = await apiClient.createUser(username.trim());
      localStorage.setItem('chat-user', JSON.stringify(user));
      setCurrentUser(user);
      
      if (user.id.startsWith('mock-')) {
        toast.success(`Welcome, ${user.username}! Let's set up your profile.`);
      } else {
        toast.success(`Welcome, ${user.username}! Let's set up your profile.`);
      }
      
      // Redirect to profile setup instead of chat
      router.push('/profile');
    } catch (error) {
      console.error('❌ User creation error:', error);
      let errorMessage = 'Failed to create user';
      
      if (error instanceof Error) {
        // Use the enhanced error messages from the API client
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 6000, // Show longer for server errors
        style: {
          maxWidth: '500px',
        },
      });
      console.error('Error creating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskClaude = async () => {
    if (!claudeInput.trim() || !aiHealth?.ai_enabled) return;
    
    const userMessage: ClaudeMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: claudeInput.trim(),
      timestamp: new Date()
    };
    
    setClaudeMessages(prev => [...prev, userMessage]);
    const promptText = claudeInput.trim();
    setClaudeInput('');
    setIsClaudeTyping(true);
    
    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ClaudeMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setClaudeMessages(prev => [...prev, assistantMessage]);
    
    try {
      // Stream the response
      await claudeAPI.streamGenerate(
        promptText,
        (chunk: string) => {
          // Update the assistant message with streaming text
          setClaudeMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        {
          maxTokens: 500,
          temperature: 0.7
        }
      );
      
      toast.success('Response complete!');
    } catch (error) {
      console.error('Claude error:', error);
      toast.error('Failed to get response from Claude');
      
      // Update with error message
      setClaudeMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsClaudeTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(10%_0.02_280)] via-[oklch(15%_0.03_260)] to-[oklch(12%_0.02_240)]">
      {/* Server Status Indicator */}
      <ServerStatus />

      {/* Top Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 bg-[oklch(14.7%_0.004_49.25)] backdrop-blur-xl border-b border-[oklch(var(--color-primary)/0.2)] shadow-lg p-3 sm:p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(var(--color-primary))] to-purple-600 flex items-center justify-center shadow-[0_0_20px_oklch(var(--color-primary)/0.5)]">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">CHATTER BOX</h1>
          </div>
          {aiHealth?.ai_enabled && (
            <span className="text-xs bg-[oklch(14.7%_0.004_49.25)] border border-[oklch(var(--color-primary)/0.3)] text-white/80 px-3 py-1.5 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Server Online
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="relative">
              <Button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-[oklch(14.7%_0.004_49.25)] border border-[oklch(var(--color-primary)/0.3)] hover:border-[oklch(var(--color-primary)/0.5)] text-white"
              >
                <UserCircleIcon className="w-5 h-5 text-[oklch(var(--color-primary))]" />
                <span className="hidden sm:inline">{currentUser.username}</span>
              </Button>
              
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 mt-2 bg-[oklch(14.7%_0.004_49.25)] backdrop-blur-xl border border-[oklch(var(--color-primary)/0.3)] rounded-xl p-2 space-y-1 min-w-[150px] shadow-[0_0_30px_oklch(var(--color-primary)/0.3)]"
                >
                  <button
                    onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm text-white/90"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => { router.push('/chat'); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm text-white/90"
                  >
                    Browse Rooms
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
                className="w-24 sm:w-32 text-sm bg-[oklch(14.7%_0.004_49.25)] border-[oklch(var(--color-primary)/0.3)] text-white placeholder:text-white/40 focus:border-[oklch(var(--color-primary)/0.6)] focus:shadow-[0_0_20px_oklch(var(--color-primary)/0.2)]"
                maxLength={20}
              />
              <Button
                onClick={handleCreateUser}
                disabled={isLoading || !username.trim()}
                className="text-sm h-9 bg-[oklch(var(--color-primary))] hover:bg-[oklch(var(--color-primary)/0.8)] border border-[oklch(var(--color-primary)/0.5)] shadow-[0_0_20px_oklch(var(--color-primary)/0.3)] text-white"
              >
                {isLoading ? '...' : 'Join'}
                <ArrowRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Fixed Input at Top - Below Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="fixed top-[72px] left-0 right-0 bg-[oklch(14.7%_0.004_49.25)]/90 backdrop-blur-xl border-b border-[oklch(var(--color-primary)/0.2)] shadow-lg z-40"
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <SparklesIcon className="w-5 h-5 text-[oklch(var(--color-primary))]" />
            </motion.div>
            <input
              type="text"
              value={claudeInput}
              onChange={(e) => setClaudeInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskClaude();
                }
              }}
              placeholder={aiHealth?.ai_enabled ? "Ask me anything..." : "AI is offline"}
              disabled={!aiHealth?.ai_enabled || isClaudeTyping}
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 border-b-2 border-[oklch(var(--color-primary)/0.3)] focus:border-[oklch(var(--color-primary))] transition-all duration-300 pb-2"
            />
            <motion.button
              onClick={handleAskClaude}
              disabled={!claudeInput.trim() || !aiHealth?.ai_enabled || isClaudeTyping}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="text-[oklch(var(--color-primary))] hover:text-[oklch(var(--color-primary)/0.8)] disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Chat Messages */}
      <div className="pt-[160px] pb-8 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <AnimatePresence>
            {claudeMessages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.05,
                  ease: "easeOut" 
                }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className={`max-w-3xl rounded-2xl px-6 py-4 ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-[oklch(var(--color-primary))] to-[oklch(var(--color-primary)/0.8)] text-white shadow-lg hover:shadow-xl' 
                      : 'bg-[oklch(14.7%_0.004_49.25)] border border-[oklch(var(--color-primary)/0.2)] text-white/90 shadow-md hover:shadow-lg'
                  } transition-shadow duration-200`}
                >
                  <div className="prose prose-sm max-w-none overflow-hidden break-words" style={{ whiteSpace: 'pre-wrap' }}>
                    {formatText(msg.content)}
                  </div>
                  <p className="text-xs text-white/40 mt-3">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isClaudeTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start"
            >
              <div className="flex gap-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-pink-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                  className="w-2 h-2 bg-pink-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                  className="w-2 h-2 bg-pink-500 rounded-full"
                />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}