'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import type { ChatMessage } from '@/app/workspace/page';

/* ─── ChatBubble (memoized) ─────────────────────────────────────────────── */

const ChatBubble = memo(({ message, onCopy, copiedId }: {
  message: ChatMessage;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) => (
  <div className={`ws-chat-row ${message.role}`}>
    <div className={`ws-chat-bubble ${message.role}`}>
      {message.role === 'assistant' ? (
        <div className="ws-chat-md">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a({ children, href, ...props }) {
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#22d3ee', textDecoration: 'underline' }} {...props}>
                    {children}
                  </a>
                );
              },
              pre({ children }) {
                return <div className="not-prose" style={{ margin: '8px 0' }}>{children}</div>;
              },
              code({ className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match ? match[1] : '';
                const codeStr = String(children).replace(/\n$/, '');
                const isBlock = codeStr.includes('\n') || !!className;
                if (isBlock) {
                  return (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => onCopy(codeStr, codeStr.slice(0, 20))}
                        className="ws-chat-copy-btn"
                      >
                        {copiedId === codeStr.slice(0, 20)
                          ? <Check size={12} />
                          : <Copy size={12} />}
                      </button>
                      <SyntaxHighlighter
                        style={dracula}
                        language={lang || 'text'}
                        PreTag="div"
                        customStyle={{ fontSize: 12, borderRadius: 8, margin: '8px 0' }}
                      >
                        {codeStr}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                return <code className={className} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: 4, fontSize: 12 }} {...props}>{children}</code>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
          {message.isStreaming && (
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: 'var(--ws-cyan)', animation: 'ws-pulse 0.8s ease-in-out infinite',
              verticalAlign: 'text-bottom', marginLeft: 2,
            }} />
          )}
        </div>
      ) : (
        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</p>
      )}
    </div>
  </div>
));
ChatBubble.displayName = 'ChatBubble';

/* ═══════════════════════════════════════════════════════
   WorkspaceChatTab — Chat with Star
   ═══════════════════════════════════════════════════════ */

interface Props {
  messages: ChatMessage[];
  streaming: boolean;
  onSendChat: (text: string) => void;
  onClearChat: () => void;
  sharedTurnCount: number;
}

export function WorkspaceChatTab({
  messages,
  streaming,
  onSendChat,
  onClearChat,
  sharedTurnCount,
}: Props) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    onSendChat(text);
  }, [input, streaming, onSendChat]);

  const copyCode = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header actions */}
      {messages.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', padding: '8px 16px 0',
          gap: 8,
        }}>
          <button
            onClick={onClearChat}
            className="ws-chat-action-btn"
          >
            <RotateCcw size={12} /> Clear
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="ws-center-body" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.length === 0 && (
          <div className="ws-empty">
            <div className="ws-empty-icon">
              <MessageSquare size={22} />
            </div>
            <p className="ws-empty-title">Chat with Star</p>
            <p className="ws-empty-sub">
              Ask anything — code, research, creative writing, platform help.
              {sharedTurnCount > 0 && (
                <><br />Star remembers {sharedTurnCount} turn{sharedTurnCount !== 1 ? 's' : ''} from this session.</>
              )}
            </p>
          </div>
        )}

        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} onCopy={copyCode} copiedId={copiedId} />
        ))}

        {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="ws-chat-row assistant">
            <div className="ws-chat-bubble assistant" style={{ display: 'flex', gap: 6, padding: '10px 14px' }}>
              {[0, 150, 300].map(d => (
                <div key={d} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--ws-purple)',
                  animation: `ws-pulse 1s ease-in-out ${d}ms infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="ws-agent-input-wrap">
        <div className="ws-agent-input-row">
          <textarea
            ref={inputRef}
            className="ws-agent-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Star anything..."
            disabled={streaming}
            rows={1}
            style={{ resize: 'none' }}
          />
          <button
            className="ws-agent-send"
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            title="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
