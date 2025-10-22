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
import { Copy, Check } from 'lucide-react';

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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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

  // Parse message to extract code blocks
  const parseMessage = (content: string) => {
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    // Match ```language OR ``` (without language) followed by code and closing ```
    const codeBlockRegex = /```([a-zA-Z0-9_+-]*)?\s*\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let hasCodeBlocks = false;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      hasCodeBlocks = true;
      
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({
            type: 'text',
            content: textContent
          });
        }
      }

      // Add code block
      const codeContent = match[2];
      if (codeContent && codeContent.trim()) {
        parts.push({
          type: 'code',
          language: match[1] || 'javascript',
          content: codeContent.trim()
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex).trim();
      if (remainingText) {
        parts.push({
          type: 'text',
          content: remainingText
        });
      }
    }

    // If no markdown code blocks found, check if content looks like code
    if (!hasCodeBlocks) {
      // Check for code patterns: objects, arrays, functions, etc.
      const hasCodePatterns = (
        (content.includes('{') && content.includes('}')) ||
        (content.includes('[') && content.includes(']')) ||
        content.includes('function') ||
        content.includes('const ') ||
        content.includes('let ') ||
        content.includes('var ') ||
        content.includes('def ') ||
        content.includes('class ') ||
        content.includes('=>') ||
        /^\s*[\{\[]/.test(content)
      );
      
      if (hasCodePatterns && content.length > 20) {
        return [{ 
          type: 'code', 
          content: content.trim(), 
          language: 'javascript' 
        }];
      }
      
      return [{ type: 'text', content }];
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }];
  };

  // Format regular text
  const formatText = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => (
        <p key={i} className="mb-3 last:mb-0 leading-loose tracking-wide">
          {line || '\u00A0'}
        </p>
      ));
  };

  // Copy code to clipboard
  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Syntax highlighting for code
  const highlightToken = (text: string) => {
    const tokens: Array<{ text: string; className: string }> = [];
    let currentPos = 0;
    
    const patterns = [
      // Comments (must come before strings)
      { regex: /(#|\/\/)(.*)$/gm, className: 'text-gray-500 italic' },
      { regex: /\/\*[\s\S]*?\*\//g, className: 'text-gray-500 italic' },
      // Strings
      { regex: /(['"`])((?:\\.|(?!\1).)*?)\1/g, className: 'text-green-400' },
      // Keywords
      { regex: /\b(def|class|import|from|return|if|else|elif|for|while|in|function|const|let|var|async|await|try|catch|finally|throw|new|this|super|extends|export|default|break|continue|switch|case|interface|type|enum|namespace|public|private|protected|static|readonly)\b/g, className: 'text-purple-400 font-semibold' },
      // Built-in functions/methods
      { regex: /\b(console|log|print|map|filter|reduce|forEach|push|pop|shift|unshift|slice|splice|join|split|length|toString|parseInt|parseFloat)\b/g, className: 'text-yellow-400' },
      // Function calls
      { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, className: 'text-cyan-400' },
      // Numbers
      { regex: /\b(\d+\.?\d*|0x[0-9a-fA-F]+)\b/g, className: 'text-orange-400' },
      // Boolean and null
      { regex: /\b(true|false|null|undefined|None|True|False)\b/g, className: 'text-red-400' },
      // Operators
      { regex: /([+\-*/%=<>!&|^~?:]|\&\&|\|\||\=\=|\!\=|\<\=|\>\=|\=\=\=|\!\=\=)/g, className: 'text-pink-400' }
    ];
    
    const matches: Array<{ start: number; end: number; text: string; className: string }> = [];
    patterns.forEach(({ regex, className }) => {
      const re = new RegExp(regex.source, regex.flags);
      let match;
      while ((match = re.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          className
        });
      }
    });
    
    matches.sort((a, b) => a.start - b.start);
    
    const finalTokens: Array<{ text: string; className: string }> = [];
    matches.forEach(match => {
      if (match.start > currentPos) {
        finalTokens.push({ text: text.slice(currentPos, match.start), className: '' });
      }
      if (match.start >= currentPos) {
        finalTokens.push(match);
        currentPos = match.end;
      }
    });
    
    if (currentPos < text.length) {
      finalTokens.push({ text: text.slice(currentPos), className: '' });
    }
    
    return finalTokens;
  };

  // Render code block with syntax highlighting
  const renderCodeBlock = (code: string, language: string, messageId: string, blockIndex: number) => {
    const codeId = `${messageId}-${blockIndex}`;
    
    const getHighlightedCode = (code: string) => {
      // Don't trim - preserve exact formatting
      const lines = code.split('\n');
      return lines.map((line, i) => {
        const tokens = highlightToken(line);
        
        return (
          <div key={i} className="table-row">
            <span className="table-cell text-right pr-4 py-0.5 select-none text-gray-500 text-xs align-top">
              {i + 1}
            </span>
            <span className="table-cell text-white/90 py-0.5 align-top font-mono">
              {tokens.map((token, j) => (
                <span key={j} className={token.className || 'text-white/90'}>
                  {token.text}
                </span>
              ))}
              {line === '' && '\u00A0'}
            </span>
          </div>
        );
      });
    };

    return (
      <div className="my-4 rounded-lg overflow-hidden border border-[oklch(var(--color-primary)/0.3)] bg-[oklch(10%_0.02_280)] shadow-lg">
        <div className="flex items-center justify-between bg-[oklch(14.7%_0.004_49.25)] text-white px-4 py-2 text-sm border-b border-[oklch(var(--color-primary)/0.2)]">
          <span className="font-mono text-[oklch(var(--color-primary))] font-semibold">{language}</span>
          <button
            onClick={() => copyCode(code, codeId)}
            className="flex items-center gap-2 hover:bg-white/10 px-2 py-1 rounded transition-colors"
          >
            {copiedCode === codeId ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="p-4 overflow-x-auto bg-[oklch(8%_0.02_280)]">
          <pre className="font-mono text-sm leading-relaxed">
            <code className="table border-spacing-0">
              {getHighlightedCode(code)}
            </code>
          </pre>
        </div>
      </div>
    );
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
      
      toast.success(`Welcome, ${user.username}! Let's set up your profile.`);
      router.push('/profile');
    } catch (error) {
      console.error('❌ User creation error:', error);
      let errorMessage = 'Failed to create user';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 6000,
        style: {
          maxWidth: '500px',
        },
      });
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
    
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ClaudeMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setClaudeMessages(prev => [...prev, assistantMessage]);
    
    try {
      await claudeAPI.streamGenerate(
        promptText,
        (chunk: string) => {
          setClaudeMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        {
          maxTokens: 1000,
          temperature: 0.7
        }
      );
      
      toast.success('Response complete!');
    } catch (error) {
      console.error('Claude error:', error);
      toast.error('Failed to get response from Claude');
      
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

      {/* Fixed Input at Top */}
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

      {/* Chat Messages */}
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
                  <div className="max-w-none">
                    {parseMessage(msg.content).map((part, i) => (
                      part.type === 'code' ? (
                        <React.Fragment key={i}>
                          {renderCodeBlock(
                            part.content, 
                            ('language' in part ? part.language : undefined) || 'text', 
                            msg.id, 
                            i
                          )}
                        </React.Fragment>
                      ) : (
                        <div key={i} className="prose prose-sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {formatText(part.content)}
                        </div>
                      )
                    ))}
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
