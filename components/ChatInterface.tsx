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
  isStreaming?: boolean; // NEW: Track if message is still streaming
}

interface ChatInterfaceProps {
  apiEndpoint?: string;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  apiEndpoint = '/api/ai-stream',
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    
    console.log('Sending message:', currentInput);

    try {
      const requestPayload = {
        message: currentInput,
        conversation_history: messages.filter(m => m.role && m.content)
      };
      
      console.log('Request payload:', requestPayload);
      
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

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantMessage += parsed.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      lastMsg.content = assistantMessage;
                      lastMsg.isStreaming = true; // Mark as streaming
                    } else {
                      newMessages.push({
                        role: 'assistant',
                        content: assistantMessage,
                        format_type: parsed.format_type,
                        isStreaming: true // Mark as streaming
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
        }
        
        // CRITICAL: Mark streaming as complete
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.isStreaming = false; // Streaming complete
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, there was an error processing your message. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-[oklch(10%_0.02_280)] via-[oklch(15%_0.03_260)] to-[oklch(12%_0.02_240)] ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-xl backdrop-blur-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 border border-fuchsia-500/30 ml-auto max-w-[85%] shadow-[0_0_20px_rgba(217,70,239,0.3)]'
                    : 'bg-[oklch(14.7%_0.004_49.25)]/50 border border-cyan-400/20 mr-auto max-w-[90%] shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </span>
                  <strong className={`font-orbitron text-sm ${
                    msg.role === 'user' ? 'text-fuchsia-300' : 'text-cyan-300'
                  }`}>
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </strong>
                </div>
                <div className="text-white/90 text-sm sm:text-base">
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : (
                    // TEMPORARY TEST: Always use MarkdownRenderer for assistant messages
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-cyan-400 p-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <SparklesIcon className="w-5 h-5" />
              </motion.div>
              <span className="text-sm font-orbitron">AI is thinking...</span>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container */}
      <div className="border-t border-purple-600/30 bg-[oklch(14.7%_0.004_49.25)]/90 backdrop-blur-xl p-4 shadow-[0_-5px_30px_rgba(147,51,234,0.2)]">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              disabled={loading}
              rows={2}
              className="min-h-[60px] max-h-[200px] bg-[oklch(10%_0.02_280)] border-cyan-400/30 text-white placeholder:text-white/40 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] resize-none"
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 h-[60px] bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 shadow-[0_0_20px_rgba(217,70,239,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
