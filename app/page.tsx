'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ServerStatus } from '@/components/ui/server-status';
import { apiClient } from '@/lib/api';
import { claudeAPI } from '@/lib/api/claude';
import toast from 'react-hot-toast';
import { 
  SparklesIcon, 
  PaperAirplaneIcon,
  LightBulbIcon,
  CodeBracketIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  CommandLineIcon,
  BoltIcon,
  LockClosedIcon,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    
    // Add welcome message from Claude
    setClaudeMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m Claude, your AI assistant powered by Anthropic. I can help you with:\n\n• Writing and debugging code\n• Explaining technical concepts\n• Answering questions about programming\n• Providing suggestions and best practices\n\nHow can I help you today?',
      timestamp: new Date()
    }]);
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
    setClaudeInput('');
    setIsClaudeTyping(true);
    
    try {
      const response = await claudeAPI.generate(claudeInput.trim(), {
        maxTokens: 500,
        temperature: 0.7
      });
      
      const assistantMessage: ClaudeMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };
      
      setClaudeMessages(prev => [...prev, assistantMessage]);
      toast.success('Response received!');
    } catch (error) {
      console.error('Claude error:', error);
      toast.error('Failed to get response from Claude');
      
      const errorMessage: ClaudeMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setClaudeMessages(prev => [...prev, errorMessage]);
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

      {/* Main Content */}
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Claude AI Messenger - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="lg:sticky lg:top-24 h-[calc(100vh-8rem)]"
          >
            <div className="h-full bg-[oklch(14.7%_0.004_49.25)] backdrop-blur-xl rounded-2xl border border-[oklch(var(--color-primary)/0.3)] shadow-[0_0_40px_oklch(var(--color-primary)/0.2)] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[oklch(var(--color-primary)/0.2)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[oklch(var(--color-primary))] to-purple-600 flex items-center justify-center shadow-[0_0_20px_oklch(var(--color-primary)/0.5)]">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Ask Claude AI</h2>
                    <p className="text-sm text-white/60">Powered by Claude Sonnet 4.5</p>
                  </div>
                </div>
              </div>
            
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <AnimatePresence>
                  {claudeMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl p-4 ${
                        msg.role === 'user' 
                          ? 'bg-[oklch(var(--color-primary)/0.2)] border border-[oklch(var(--color-primary)/0.4)] text-white' 
                          : 'bg-[oklch(14.7%_0.004_49.25)] border border-white/10 text-white/90'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {msg.role === 'assistant' && (
                            <SparklesIcon className="w-4 h-4 text-[oklch(var(--color-primary))]" />
                          )}
                          <span className="text-xs text-white/60">
                            {msg.role === 'user' ? 'You' : 'Claude'}
                          </span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isClaudeTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-[oklch(14.7%_0.004_49.25)] border border-white/10 rounded-2xl p-4 flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-[oklch(var(--color-primary))] animate-pulse" />
                      <div className="flex gap-1">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          className="w-2 h-2 rounded-full bg-white/40"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 rounded-full bg-white/40"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 rounded-full bg-white/40"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            
              {/* Input Area */}
              <div className="p-6 border-t border-[oklch(var(--color-primary)/0.2)]">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      value={claudeInput}
                      onChange={(e) => setClaudeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAskClaude();
                        }
                      }}
                      placeholder={aiHealth?.ai_enabled ? "Ask me anything... (Shift+Enter for new line)" : "AI is offline"}
                      disabled={!aiHealth?.ai_enabled || isClaudeTyping}
                      rows={2}
                      className="w-full bg-[oklch(14.7%_0.004_49.25)] backdrop-blur-xl border border-[oklch(var(--color-primary)/0.3)] rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[oklch(var(--color-primary)/0.6)] focus:shadow-[0_0_20px_oklch(var(--color-primary)/0.2)] resize-none"
                    />
                  </div>
                  <Button
                    onClick={handleAskClaude}
                    disabled={!claudeInput.trim() || !aiHealth?.ai_enabled || isClaudeTyping}
                    className="h-[60px] px-6 bg-[oklch(var(--color-primary))] hover:bg-[oklch(var(--color-primary)/0.8)] border border-[oklch(var(--color-primary)/0.5)] shadow-[0_0_20px_oklch(var(--color-primary)/0.3)] hover:shadow-[0_0_30px_oklch(var(--color-primary)/0.5)] text-white"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* Right Side - Features & Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="space-y-8"
          >
            {/* Hero Section */}
            <div className="text-center lg:text-left space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl lg:text-6xl font-bold text-white leading-tight"
              >
                AI-Powered
                <span className="block bg-gradient-to-r from-[oklch(var(--color-primary))] to-purple-400 bg-clip-text text-transparent">
                  Developer Chat
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-white/70 leading-relaxed"
              >
                Collaborate with your team and get instant AI assistance from Claude. 
                Share code, solve problems, and build better software together.
              </motion.p>
            </div>
            
            {/* AI Features */}
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  icon: CodeBracketIcon,
                  title: 'Code Assistant',
                  description: 'Get help with debugging, refactoring, and code reviews'
                },
                {
                  icon: LightBulbIcon,
                  title: 'Smart Suggestions',
                  description: 'Context-aware reply suggestions and conversation summaries'
                },
                {
                  icon: ChatBubbleLeftRightIcon,
                  title: 'Content Moderation',
                  description: 'Automatic spam detection and safety checks'
                },
                {
                  icon: SparklesIcon,
                  title: 'Message Enhancement',
                  description: 'Improve clarity and professionalism with AI'
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-6 bg-[oklch(14.7%_0.004_49.25)] backdrop-blur-xl rounded-xl border border-[oklch(var(--color-primary)/0.2)] hover:border-[oklch(var(--color-primary)/0.4)] transition-all hover:shadow-[0_0_30px_oklch(var(--color-primary)/0.2)] group"
                >
                  <feature.icon className="w-8 h-8 text-[oklch(var(--color-primary))] mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-white/60 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
            
            {/* Platform Features */}
            <div className="p-8 bg-[oklch(14.7%_0.004_49.25)] backdrop-blur-xl rounded-2xl border border-[oklch(var(--color-primary)/0.3)] shadow-[0_0_40px_oklch(var(--color-primary)/0.2)]">
              <h3 className="text-2xl font-bold text-white mb-6">Platform Features</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: VideoCameraIcon, label: 'HD Video Chat' },
                  { icon: CommandLineIcon, label: 'Code Editor' },
                  { icon: BoltIcon, label: 'Real-time Sync' },
                  { icon: LockClosedIcon, label: 'Secure & Private' }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3 p-4 bg-[oklch(14.7%_0.004_49.25)] rounded-xl border border-white/10 hover:border-[oklch(var(--color-primary)/0.3)] transition-all group"
                  >
                    <item.icon className="w-6 h-6 text-[oklch(var(--color-primary))] group-hover:scale-110 transition-transform" />
                    <span className="text-sm text-white/80">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => router.push('/chat')}
                className="flex-1 h-14 bg-[oklch(var(--color-primary))] hover:bg-[oklch(var(--color-primary)/0.8)] border border-[oklch(var(--color-primary)/0.5)] shadow-[0_0_20px_oklch(var(--color-primary)/0.3)] hover:shadow-[0_0_30px_oklch(var(--color-primary)/0.5)] text-white font-semibold"
              >
                Browse Rooms
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => router.push('/ai-test')}
                className="flex-1 h-14 bg-[oklch(14.7%_0.004_49.25)] border-[oklch(var(--color-primary)/0.4)] hover:bg-[oklch(14.7%_0.004_49.25)] hover:border-[oklch(var(--color-primary)/0.6)] text-white"
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                Test AI Features
              </Button>
            </div>
            
            {/* Help Link */}
            <p className="text-center text-sm text-white/50">
              Need help?{' '}
              <Link href="/troubleshooting" className="text-[oklch(var(--color-primary))] hover:underline">
                View troubleshooting guide
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}