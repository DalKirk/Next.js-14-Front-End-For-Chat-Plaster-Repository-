import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Message, VideoMessage } from '@/lib/types';
import { VideoPlayer } from '@/components/video/video-player';
import { cn } from '@/lib/utils';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface MessageBubbleProps {
  message: Message;
  isOwn?: boolean;
}

// Function to parse URLs in text and make them clickable
const parseMessageWithLinks = (text: string) => {
  // Regex to match URLs (http, https, www, or just domain.com)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  
  // Split text by URLs and create elements
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (urlRegex.test(part)) {
      // Ensure URL has protocol
      let href = part;
      if (part.startsWith('www.')) {
        href = 'https://' + part;
      } else if (!part.startsWith('http://') && !part.startsWith('https://')) {
        href = 'https://' + part;
      }
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    
    // Return regular text
    return <span key={index}>{part}</span>;
  });
};

export function MessageBubble({ message, isOwn = false }: MessageBubbleProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const isVideoMessage = message.type === 'video_ready' || message.type === 'live_stream_created';
  const videoMessage = message as VideoMessage;

  // Extract code blocks efficiently
  const extractCodeBlocks = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: Array<{ language: string; code: string }> = [];
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2]
      });
    }
    
    return blocks;
  };
  
  const manualCodeBlocks = message.content ? extractCodeBlocks(message.content) : [];

  // Unified copy to clipboard function
  const copyToClipboard = async (text: string, type: 'code' | 'message' = 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(text);
        setTimeout(() => setCopiedCode(null), 2000);
      } else {
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Enhanced timestamp formatting with smart display
  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Now';
    
    try {
      const isoTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
      const date = new Date(isoTimestamp);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Now';
      }
      
      // Smart formatting based on age
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        // Less than 1 hour: "2 minutes ago"
        return formatDistanceToNow(date, { addSuffix: true });
      } else if (isToday(date)) {
        // Today: "14:30"
        return format(date, 'HH:mm');
      } else if (isYesterday(date)) {
        // Yesterday: "Yesterday 14:30"
        return `Yesterday ${format(date, 'HH:mm')}`;
      } else if (diffInHours < 168) {
        // Within a week: "Mon 14:30"
        return format(date, 'EEE HH:mm');
      } else {
        // Older: "Oct 19, 14:30"
        return format(date, 'MMM dd, HH:mm');
      }
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Now';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex w-full mb-4',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'rounded-2xl p-4 shadow-lg',
          'backdrop-blur-sm border',
          isOwn 
            ? 'bg-blue-600/20 border-blue-500/30 text-white' 
            : 'bg-white/10 border-white/20 text-white',
          // Dynamic width based on content type
          isVideoMessage 
            ? 'max-w-sm lg:max-w-md xl:max-w-lg' 
            : 'max-w-xs lg:max-w-2xl xl:max-w-3xl'
        )}
      >
        {/* Username, timestamp, and copy button */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-sm font-medium text-white/90">
            {message.username}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">
              {formatTimestamp(message.timestamp)}
            </span>
            {!isVideoMessage && message.content && (
              <button
                onClick={() => copyToClipboard(message.content, 'message')}
                className="text-white/40 hover:text-white/90 transition-colors p-1 rounded hover:bg-white/10"
                title="Copy message"
              >
                {copiedMessage ? (
                  <CheckIcon className="w-4 h-4 text-green-400" />
                ) : (
                  <ClipboardDocumentIcon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Message content */}
        {message.type === 'system' ? (
          <p className="text-sm italic text-white/80">
            {parseMessageWithLinks(message.content)}
          </p>
        ) : isVideoMessage ? (
          <div className="space-y-3">
            {/* Video type indicator */}
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {message.type === 'live_stream_created' ? '🔴' : '🎥'}
              </span>
              <span className="text-sm font-medium">
                {message.type === 'live_stream_created' ? 'Live Stream' : 'Video'}
              </span>
            </div>
            
            {/* Video title */}
            {videoMessage.title && (
              <h4 className="text-sm font-medium text-white">
                {videoMessage.title}
              </h4>
            )}
            
            {/* Video player */}
            {message.playback_id ? (
              <VideoPlayer
                playbackId={message.playback_id}
                title={message.title}
                className="w-full"
                muted={true}
                autoPlay={false}
              />
            ) : (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-xs">⚠️ No playback ID - backend may not have configured Bunny.net correctly</p>
                <p className="text-red-400/60 text-xs mt-1">Check backend logs for Bunny.net configuration</p>
              </div>
            )}
            
            {/* Message text if any */}
            {message.content && (
              <p className="text-sm text-white/90">
                {parseMessageWithLinks(message.content)}
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm text-white break-words prose prose-invert prose-sm max-w-none">
            {/* View Source feature for messages with code blocks */}
            {message.content?.includes('```') && (
              <details className="mb-4 rounded-lg overflow-hidden border border-white/10">
                <summary className="cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2.5 transition-colors flex items-center justify-between group">
                  <span className="text-xs font-medium text-white/70 group-hover:text-white/90 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    View Source
                  </span>
                  <span className="text-[10px] text-white/40 group-hover:text-white/60">Raw markdown</span>
                </summary>
                <div className="bg-gray-900/50 p-4 relative group/source">
                  <button
                    onClick={() => copyToClipboard(message.content, 'message')}
                    className="absolute top-2 right-2 text-white/40 hover:text-white/90 transition-colors p-1.5 rounded bg-gray-800/80 hover:bg-gray-700/80 opacity-0 group-hover/source:opacity-100 transition-opacity"
                    title="Copy raw source"
                  >
                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                  </button>
                  <pre className="text-xs text-gray-300 overflow-auto max-h-60 whitespace-pre-wrap font-mono leading-relaxed pr-10">
                    {message.content}
                  </pre>
                </div>
              </details>
            )}
            
            {/* Manual code block rendering if ReactMarkdown fails */}
            {manualCodeBlocks.length > 0 && (
              <div className="mb-4">
                {manualCodeBlocks.map((block, index) => (
                  <div key={index} className="not-prose relative group my-4 rounded-lg overflow-hidden border border-gray-600 shadow-2xl max-w-full">
                    <div className="flex items-center justify-between bg-[#21252b] px-4 py-2.5 border-b border-gray-600 flex-shrink-0">
                      <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-bold">
                        {block.language}
                      </span>
                      <button
                        onClick={() => copyToClipboard(block.code, 'code')}
                        className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-all px-3 py-1.5 rounded-md hover:bg-gray-600/50 active:scale-95"
                        title="Copy code to clipboard"
                      >
                        {copiedCode === block.code ? (
                          <>
                            <CheckIcon className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-[#282c34] overflow-x-auto max-w-full">
                      <SyntaxHighlighter
                        language={block.language}
                        style={oneDark}
                        PreTag="div"
                        showLineNumbers={true}
                        lineNumberStyle={{ 
                          color: '#5c6370',
                          paddingRight: '1em',
                          userSelect: 'none',
                          minWidth: '2.5em',
                          display: 'inline-block',
                          textAlign: 'right'
                        }}
                        wrapLines={false}
                        wrapLongLines={false}
                        customStyle={{
                          margin: 0,
                          padding: '1.5rem',
                          background: '#282c34',
                          fontSize: '0.875rem',
                          lineHeight: '1.7',
                          borderRadius: 0,
                          maxWidth: '100%',
                          overflowX: 'auto',
                          whiteSpace: 'pre',
                        }}
                        codeTagProps={{
                          style: {
                            fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontSize: '0.875rem',
                            display: 'block',
                            background: 'transparent',
                            whiteSpace: 'pre',
                          }
                        }}
                      >
                        {block.code}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml={false}
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    className="text-blue-400 hover:text-blue-300 underline break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  // Extract code string - improved extraction
                  let codeString = '';
                  
                  // Method 1: Get raw value from node (most reliable for code blocks)
                  if (node?.children && node.children.length > 0) {
                    // First try to get raw value from text nodes
                    const textNode = node.children.find((child: any) => child.type === 'text');
                    if (textNode && textNode.value) {
                      codeString = textNode.value;
                    } else {
                      // Collect all text node values
                      codeString = node.children
                        .filter((child: any) => child.type === 'text')
                        .map((child: any) => child.value || '')
                        .join('');
                    }
                  }
                  
                  // Method 2: Try direct children if node extraction failed
                  if (!codeString && children) {
                    if (Array.isArray(children)) {
                      codeString = children.map(child => 
                        typeof child === 'string' ? child : String(child)
                      ).join('');
                    } else if (typeof children === 'string') {
                      codeString = children;
                    } else {
                      codeString = String(children);
                    }
                  }
                  
                  // Method 3: Fallback to props
                  if (!codeString && props.children) {
                    codeString = String(props.children);
                  }
                  
                  // Method 4: Last resort - get from node position
                  if (!codeString && node?.position) {
                    // The node exists but value is empty - this is likely due to sanitization
                    // In this case, rely on manual code block extraction
                    codeString = '';
                  }
                  
                  // Block code with language - syntax highlighting
                  if (!inline && language) {
                    return (
                      <div className="not-prose relative group my-4 rounded-lg overflow-hidden border border-gray-600 shadow-2xl max-w-full">
                        {/* Language badge and copy button */}
                        <div className="flex items-center justify-between bg-[#21252b] px-4 py-2.5 border-b border-gray-600 flex-shrink-0">
                          <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-bold">
                            {language}
                          </span>
                          <button
                            onClick={() => copyToClipboard(codeString, 'code')}
                            className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-all px-3 py-1.5 rounded-md hover:bg-gray-600/50 active:scale-95"
                            title="Copy code to clipboard"
                          >
                            {copiedCode === codeString ? (
                              <>
                                <CheckIcon className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 font-medium">Copied!</span>
                              </>
                            ) : (
                              <>
                                <ClipboardDocumentIcon className="w-4 h-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Syntax highlighted code */}
                        <div className="bg-[#282c34] overflow-x-auto max-w-full">
                          {codeString ? (
                            <SyntaxHighlighter
                              language={language}
                              style={oneDark}
                              PreTag="div"
                              showLineNumbers={true}
                              lineNumberStyle={{ 
                                color: '#5c6370',
                                paddingRight: '1em',
                                userSelect: 'none',
                                minWidth: '2.5em',
                                display: 'inline-block',
                                textAlign: 'right'
                              }}
                              wrapLines={false}
                              wrapLongLines={false}
                              customStyle={{
                                margin: 0,
                                padding: '1.5rem',
                                background: '#282c34',
                                fontSize: '0.875rem',
                                lineHeight: '1.7',
                                borderRadius: 0,
                                maxWidth: '100%',
                                overflowX: 'auto',
                                whiteSpace: 'pre',
                              }}
                              codeTagProps={{
                                style: {
                                  fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                  fontSize: '0.875rem',
                                  display: 'block',
                                  background: 'transparent',
                                  whiteSpace: 'pre',
                                }
                              }}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          ) : (
                            <pre className="p-6 text-yellow-400 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96">
                              {`// Debug: No code string extracted

// Children: ${children}
// Children type: ${typeof children}

// Node exists: ${!!node}
// Node children: ${JSON.stringify(node?.children, null, 2)}

// Props children: ${props.children}

// Language detected: ${language}
// ClassName: ${className}

// This usually means the markdown is not being parsed correctly.
// Make sure you're using three backticks followed by language name.`}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  // Inline code
                  if (inline) {
                    return (
                      <code 
                        className="bg-gray-800/90 px-2 py-0.5 rounded-md text-emerald-300 font-mono text-sm border border-gray-700/50" 
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  
                  // Block code without language
                  return (
                    <div className="not-prose relative group my-4 rounded-lg overflow-hidden border border-gray-600 shadow-2xl">
                      <div className="flex items-center justify-between bg-[#21252b] px-4 py-2.5 border-b border-gray-600">
                        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider font-bold">
                          Code
                        </span>
                        <button
                          onClick={() => copyToClipboard(codeString, 'code')}
                          className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-all px-3 py-1.5 rounded-md hover:bg-gray-600/50 active:scale-95"
                          title="Copy code to clipboard"
                        >
                          {copiedCode === codeString ? (
                            <>
                              <CheckIcon className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="w-4 h-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="bg-[#282c34] p-5 overflow-x-auto m-0">
                        <code className="font-mono text-sm text-gray-200 leading-relaxed block" {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                pre: ({ node, ...props }) => (
                  <pre className="!bg-transparent !p-0 !m-0" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-blue-400 pl-3 my-2 italic" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside my-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside my-1" {...props} />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}