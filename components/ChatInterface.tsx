"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Settings } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { sendAgentMessage } from '@/services/agent-api';
import type { AgentAsset } from '@/services/agent-api';
import { ToolActivity, AssetsGrid, extractAssetsFromResult } from './chat/MessageDisplay';
import type { ToolStep } from './chat/MessageDisplay';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  format_type?: string;
  isStreaming?: boolean;
  assets?: AgentAsset[];
  toolSteps?: ToolStep[];
}

interface ChatInterfaceProps {
  apiEndpoint?: string;
  className?: string;
  fullscreen?: boolean;
}

const generateConversationId = () =>
  `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const uid = () => Math.random().toString(36).slice(2, 10);

// Typing animation — reveals streamed content word-by-word
const AnimatedContent = memo(({ content, isStreaming }: { content: string; isStreaming?: boolean }) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(content);
      return;
    }
    const newText = content.slice(displayed.length);
    if (!newText) return;

    const words = newText.match(/\S+/g) || [];
    let i = 0;
    const interval = setInterval(() => {
      const batch = words.slice(i, i + 4).join(' ') + ' ';
      setDisplayed(prev => prev + batch);
      i += 4;
      if (i >= words.length) clearInterval(interval);
    }, 250);

    return () => clearInterval(interval);
  }, [content, isStreaming]);

  return <MarkdownRenderer content={displayed} />;
});
AnimatedContent.displayName = 'AnimatedContent';

// Message bubble with optional assets and tool activity
const MessageBubble = memo(({ message, index }: { message: Message; index: number }) => {
  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`chat-message-container max-w-[80%] ${message.role === 'user' ? 'rounded-lg p-4 bg-[oklch(45%_0.15_260)] text-[oklch(98%_0.02_260)]' : 'text-[oklch(90%_0.05_260)]'} break-words overflow-hidden`}
        style={{
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%',
          ...(message.role === 'assistant' ? { background: 'transparent', border: 'none', boxShadow: 'none' } : {}),
        }}
      >
        {message.role === 'assistant' ? (
          <>
            <AnimatedContent content={message.content} isStreaming={message.isStreaming} />
            {message.toolSteps && message.toolSteps.length > 0 && (
              <div className="mt-2">
                <ToolActivity steps={message.toolSteps} />
              </div>
            )}
            {message.assets && message.assets.length > 0 && (
              <div className="mt-3">
                <AssetsGrid assets={message.assets} />
              </div>
            )}
          </>
        ) : (
          <p className="whitespace-pre-wrap break-words" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>
            {message.content}
          </p>
        )}
        {message.isStreaming && (
          <span className="inline-block ml-2 animate-pulse">▊</span>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.message.assets?.length === nextProps.message.assets?.length &&
    prevProps.message.toolSteps?.length === nextProps.message.toolSteps?.length
  );
});
MessageBubble.displayName = 'MessageBubble';

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  className = '',
  fullscreen = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [conversationId] = useState(() => generateConversationId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Accumulated per-run state (reset each send)
  const toolStepsRef = useRef<ToolStep[]>([]);
  const assetsRef = useRef<AgentAsset[]>([]);
  const contentRef = useRef('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusText]);

  const stripSelfIdentificationIntro = (text: string): string => {
    const lines = text.split('\n');
    let removeCount = 0;
    const isGreeting = (s: string) => /\b(hi|hello|hey|welcome|greetings)\b/i.test(s);
    const isSelfIntro = (s: string) => /\b(i\s*'?m|i\s*am|my\s*name\s*is)\b/i.test(s);
    const mentionsClaude = (s: string) => /\bclaude\b/i.test(s);
    const mentionsAssistant = (s: string) => /\ban\s+ai\s+assistant\b/i.test(s);
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const s = lines[i].trim();
      if (i === 0 && isGreeting(s)) { removeCount++; continue; }
      if ((isSelfIntro(s) && (mentionsClaude(s) || mentionsAssistant(s))) || mentionsClaude(s)) { removeCount++; continue; }
      break;
    }
    let result = removeCount > 0 ? lines.slice(removeCount).join('\n').trimStart() : text;
    result = result.replace(/^\s*claude[:,]?\s*/i, '');
    return result;
  };

  /** Helper: update the last assistant message in place */
  const updateAssistant = useCallback(() => {
    setMessages(prev => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.role === 'assistant') {
        copy[copy.length - 1] = {
          ...last,
          content: contentRef.current,
          isStreaming: true,
          toolSteps: [...toolStepsRef.current],
          assets: [...assetsRef.current],
        };
      } else {
        copy.push({
          role: 'assistant',
          content: contentRef.current,
          isStreaming: true,
          toolSteps: [...toolStepsRef.current],
          assets: [...assetsRef.current],
        });
      }
      return copy;
    });
  }, []);

  const sendMessage = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const trimmedInput = textarea.value.trim();
    if (!trimmedInput || loading) return;

    const userMsg: Message = { role: 'user', content: trimmedInput };
    setMessages(prev => [...prev, userMsg]);
    textarea.value = '';
    setLoading(true);
    setStatusText('');

    // Reset per-run accumulators
    toolStepsRef.current = [];
    assetsRef.current = [];
    contentRef.current = '';

    const history = messages
      .filter(m => m.role && m.content)
      .map(m => ({ role: m.role, content: m.content }));

    abortRef.current = sendAgentMessage(
      trimmedInput,
      history,
      {
        onContent: (text) => {
          if (!contentRef.current) {
            text = stripSelfIdentificationIntro(text);
          }
          contentRef.current += text;
          updateAssistant();
        },

        onPlan: (text) => {
          setStatusText(text);
        },

        onStatus: (text) => {
          setStatusText(text);
        },

        onToolStart: ({ tool, cost }) => {
          toolStepsRef.current.push({ id: uid(), tool, state: 'running', cost });
          setStatusText(`Running ${tool.replace('generate_', '')}…`);
          updateAssistant();
        },

        onToolDone: ({ tool, result, cost }) => {
          // Mark the matching running step as done
          const idx = toolStepsRef.current.findIndex(s => s.tool === tool && s.state === 'running');
          if (idx !== -1) {
            toolStepsRef.current[idx] = { ...toolStepsRef.current[idx], state: 'done', result, cost };
          }
          // Extract assets
          const newAssets = extractAssetsFromResult(tool, result);
          assetsRef.current.push(...newAssets);
          setStatusText('');
          updateAssistant();
        },

        onToolError: (err) => {
          const running = toolStepsRef.current.find(s => s.state === 'running');
          if (running) running.state = 'error';
          setStatusText('');
          updateAssistant();
        },

        onSummary: ({ assets, totalCost }) => {
          // Merge any summary assets that aren't already collected
          for (const a of assets) {
            if (!assetsRef.current.some(e => e.url === a.url)) {
              assetsRef.current.push(a);
            }
          }
          updateAssistant();
        },

        onDone: () => {
          setLoading(false);
          setStatusText('');
          // Mark streaming complete
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === 'assistant') {
              copy[copy.length - 1] = { ...last, isStreaming: false };
            }
            return copy;
          });
        },

        onError: (err) => {
          setLoading(false);
          setStatusText('');
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `⚠️ ${err}` },
          ]);
        },
      },
      { enableSearch: true, maxSteps: 8 },
    );
  }, [loading, messages, updateAssistant]);

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setStatusText('');
    setLoading(false);
    toolStepsRef.current = [];
    assetsRef.current = [];
    contentRef.current = '';
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div
      className={`flex flex-col bg-gradient-to-br from-[oklch(10%_0.02_280)] via-[oklch(15%_0.03_260)] to-[oklch(12%_0.02_240)] ${className}`}
      style={fullscreen ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', zIndex: 9999 } : { width: '100%', height: '100%' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-[oklch(30%_0.05_260)]">
        <h2 className="text-xl font-bold flex items-center gap-2.5">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', animation: 'agenticBlink 1.4s ease-in-out infinite', boxShadow: '0 0 8px #f59e0b', display: 'inline-block' }} />
        </h2>
        <Button onClick={clearChat} disabled={messages.length === 0} variant="ghost" size="sm" className="text-sm">
          Clear Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <MessageBubble key={`msg-${index}`} message={message} index={index} />
          ))}
        </AnimatePresence>

        {/* Status bar — replaces bounce dots when agent is running */}
        {loading && statusText && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="agent-status-bar flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.1)' }}>
              <span className="agent-status-dot" />
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{statusText}</span>
            </div>
          </motion.div>
        )}

        {/* Fallback bounce dots — only when no status text yet */}
        {loading && !statusText && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="p-2" style={{ background: 'transparent' }}>
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[oklch(60%_0.15_260)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[oklch(60%_0.15_260)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[oklch(60%_0.15_260)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <style>{`
        @keyframes agenticBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.15; } }
        @keyframes neonSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes statusPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .agent-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #8b5cf6;
          animation: statusPulse 1.5s ease-in-out infinite;
          box-shadow: 0 0 6px rgba(139,92,246,0.5);
        }
      `}</style>
      <div className="p-3 border-t border-[oklch(25%_0.03_260)]">
        <div className="flex items-end gap-2 bg-[oklch(14%_0.02_260)] border border-[oklch(25%_0.04_260)] rounded-xl p-2 focus-within:border-[oklch(45%_0.12_260)] transition-all">
          <div className="flex items-center self-center pl-1" style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 4px #f59e0b)', animation: 'neonSpin 2.5s linear infinite' }}>
            <Settings size={18} />
          </div>
          <Textarea
            ref={textareaRef}
            onKeyDown={handleKeyPress}
            placeholder=""
            className="flex-1 resize-none bg-transparent border-0 text-[oklch(90%_0.03_260)] placeholder:text-[oklch(40%_0.03_260)] focus:ring-0 focus:outline-none text-sm py-1.5 px-2 min-h-[32px] max-h-[120px]"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all disabled:opacity-40 shrink-0"
            style={{ background: loading ? 'oklch(35% 0.05 260)' : 'linear-gradient(135deg, oklch(55% 0.18 260), oklch(50% 0.2 240))' }}
            aria-label={loading ? 'Sending' : 'Send'}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
