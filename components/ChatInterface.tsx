"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Settings } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  format_type?: string;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  apiEndpoint?: string;
  className?: string;
}

// ? Generate unique conversation ID
const generateConversationId = () => {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Memoized message component to prevent re-renders during multi-user typing
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
        className={`chat-message-container max-w-[80%] rounded-lg p-4 ${
          message.role === 'user'
            ? 'bg-[oklch(45%_0.15_260)] text-[oklch(98%_0.02_260)]'
            : 'bg-[oklch(25%_0.05_260)] text-[oklch(90%_0.05_260)] border border-[oklch(35%_0.08_260)]'
        } break-words overflow-hidden word-break-break-word`}
        style={{ 
          wordWrap: 'break-word', 
          wordBreak: 'break-word', 
          overflowWrap: 'break-word',
          maxWidth: '100%'
        }}
      >
        {message.role === 'assistant' ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <p className="whitespace-pre-wrap break-words overflow-wrap-break-word" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{message.content}</p>
        )}
        {message.isStreaming && (
          <span className="inline-block ml-2 animate-pulse">?</span>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if message content/streaming state changes
  return prevProps.message.content === nextProps.message.content &&
         prevProps.message.isStreaming === nextProps.message.isStreaming;
});

MessageBubble.displayName = 'MessageBubble';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  apiEndpoint = '/api/ai-stream',
  className = ''
}) => {
  const AI_SYSTEM_PROMPT = `You are the Starcyeed AI assistant. Do not self-identify as "Claude" or mention model/provider names unless explicitly asked. Avoid greetings like "Hi" or "I'm ...". Be concise, friendly, and helpful. Focus on answering the user's question directly, with code blocks where useful.`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => generateConversationId()); // ? Track conversation ID
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Uncontrolled input

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ? Log conversation ID on mount
  useEffect(() => {
    console.log('?? Conversation ID initialized:', conversationId);
  }, [conversationId]);

  const stripSelfIdentificationIntro = (text: string): string => {
    const lines = text.split('\n');
    let removeCount = 0;
    const isGreeting = (s: string) => /\b(hi|hello|hey|welcome|greetings)\b/i.test(s);
    const isSelfIntro = (s: string) => /\b(i\s*'?m|i\s*am|my\s*name\s*is)\b/i.test(s);
    const mentionsClaude = (s: string) => /\bclaude\b/i.test(s);
    const mentionsAssistant = (s: string) => /\ban\s+ai\s+assistant\b/i.test(s);
    // Consider first few lines: greeting and self-intro
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const s = lines[i].trim();
      if (i === 0 && isGreeting(s)) {
        removeCount++;
        continue;
      }
      if ((isSelfIntro(s) && (mentionsClaude(s) || mentionsAssistant(s))) || mentionsClaude(s)) {
        removeCount++;
        continue;
      }
      break;
    }
    let result = removeCount > 0 ? lines.slice(removeCount).join('\n').trimStart() : text;
    // Secondary cleanup: remove residual "Claude" mentions at start
    result = result.replace(/^\s*claude[:,]?\s*/i, '');
    return result;
  };

  const sendMessage = useCallback(async () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const trimmedInput = textarea.value.trim();
    if (!trimmedInput || loading) {
      console.log('Cannot send: empty input or loading');
      return;
    }

    const userMsg: Message = { role: 'user', content: trimmedInput };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = trimmedInput;
    textarea.value = ''; // Clear textarea
    setLoading(true);
    
    console.log('?? Sending message:', currentInput);
    console.log('?? Using conversation ID:', conversationId); // ? Log conversation ID

    try {
      const requestPayload = {
        message: currentInput,
        conversation_history: messages.filter(m => m.role && m.content),
        conversation_id: conversationId, // ? Add conversation_id
        enable_search: true,
        system_prompt: AI_SYSTEM_PROMPT
      };
      
      console.log('?? Request payload:', requestPayload);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let hasError = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                console.log('📍 Received [DONE] signal');
                continue;
              }
              
              try {
                const parsed = JSON.parse(data);
                console.log('📍 Frontend parsed:', parsed);
                
                // Handle error responses from backend
                if (parsed.error) {
                  console.error('❌ Backend error:', parsed.error);
                  assistantMessage = `⚠️ AI Error: ${parsed.error}\n\nPlease try again or contact support if the issue persists.`;
                  hasError = true;
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: assistantMessage,
                  }]);
                  console.log('📍 Error message set, breaking loop');
                  break; // Exit the line processing loop
                }
                
                if (parsed.content) {
                  console.log('Raw chunk:', JSON.stringify(parsed.content));
                  let chunkText = parsed.content;
                  if (!assistantMessage) {
                    chunkText = stripSelfIdentificationIntro(chunkText);
                  }
                  assistantMessage += chunkText;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      lastMsg.content = assistantMessage;
                      lastMsg.isStreaming = true;
                    } else {
                      newMessages.push({
                        role: 'assistant',
                        content: assistantMessage,
                        format_type: parsed.format_type,
                        isStreaming: true
                      });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
          
          // If error encountered, break the read loop
          if (hasError) break;
        }
        
        // Mark streaming as complete (unless it was an error)
        if (!hasError) {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.isStreaming = false;
            }
            return newMessages;
          });
        }
        
        console.log('? Message complete (conversation_id:', conversationId, ')'); // ? Log completion
      }
    } catch (error) {
      console.error('? Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '? Sorry, there was an error processing your message. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, conversationId, apiEndpoint]);

  // ? Clear chat and reset conversation
  const clearChat = () => {
    setMessages([]);
    const newConversationId = generateConversationId();
    setConversationId(newConversationId);
    console.log('?? Chat cleared, new conversation ID:', newConversationId);
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-[oklch(10%_0.02_280)] via-[oklch(15%_0.03_260)] to-[oklch(12%_0.02_240)] ${className}`}>
      {/* Header with Clear Button */}
      <div className="flex justify-between items-center p-4 border-b border-[oklch(30%_0.05_260)]">
        <h2 className="text-xl font-bold flex items-center gap-2.5">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', animation: 'agenticBlink 1.4s ease-in-out infinite', boxShadow: '0 0 8px #f59e0b', display: 'inline-block' }} />
        </h2>
        <Button
          onClick={clearChat}
          disabled={messages.length === 0}
          variant="ghost"
          size="sm"
          className="text-sm"
        >
          Clear Chat
        </Button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <MessageBubble key={`msg-${index}`} message={message} index={index} />
          ))}
        </AnimatePresence>

        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="chat-message-container bg-[oklch(25%_0.05_260)] rounded-lg p-4 border border-[oklch(35%_0.08_260)]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[oklch(60%_0.15_260)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-[oklch(60%_0.15_260)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-[oklch(60%_0.15_260)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <style>{`@keyframes agenticBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.15; } } @keyframes neonSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
