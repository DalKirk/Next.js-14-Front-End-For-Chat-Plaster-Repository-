"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MarkdownRenderer from './MarkdownRenderer';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';

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

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  apiEndpoint = '/api/ai-stream',
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => generateConversationId()); // ? Track conversation ID
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) {
      console.log('Cannot send: empty input or loading');
      return;
    }

    const userMsg: Message = { role: 'user', content: trimmedInput };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = trimmedInput;
    setInput('');
    setLoading(true);
    
    console.log('?? Sending message:', currentInput);
    console.log('?? Using conversation ID:', conversationId); // ? Log conversation ID

    try {
      const requestPayload = {
        message: currentInput,
        conversation_history: messages.filter(m => m.role && m.content),
        conversation_id: conversationId, // ? Add conversation_id
        enable_search: true
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
                  assistantMessage += parsed.content;
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
  };

  // ? Clear chat and reset conversation
  const clearChat = () => {
    setMessages([]);
    const newConversationId = generateConversationId();
    setConversationId(newConversationId);
    console.log('?? Chat cleared, new conversation ID:', newConversationId);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-[oklch(10%_0.02_280)] via-[oklch(15%_0.03_260)] to-[oklch(12%_0.02_240)] ${className}`}>
      {/* Header with Clear Button */}
      <div className="flex justify-between items-center p-4 border-b border-[oklch(30%_0.05_260)]">
        <h2 className="text-xl font-bold text-[oklch(90%_0.05_260)]">AI Chat Assistant</h2>
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
      <div className="p-4 border-t border-[oklch(30%_0.05_260)]">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 resize-none bg-[oklch(20%_0.03_260)] border-[oklch(35%_0.08_260)] text-[oklch(90%_0.05_260)] placeholder:text-[oklch(50%_0.05_260)] focus:border-[oklch(50%_0.15_260)] focus:ring-[oklch(50%_0.15_260)]"
            rows={3}
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="self-end bg-[oklch(50%_0.2_260)] hover:bg-[oklch(55%_0.22_260)] text-white p-3"
            size="md"
          >
            {loading ? (
              <SparklesIcon className="h-5 w-5 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
