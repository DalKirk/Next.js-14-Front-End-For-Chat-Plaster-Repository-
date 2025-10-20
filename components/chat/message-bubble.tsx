import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
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

  const isVideoMessage = message.type === 'video_ready' || message.type === 'live_stream_created';
  const videoMessage = message as VideoMessage;

  // Copy code to clipboard
  const copyToClipboard = async (code: string, language: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
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
          'max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl p-4 shadow-lg',
          'backdrop-blur-sm border',
          isOwn 
            ? 'bg-blue-600/20 border-blue-500/30 text-white' 
            : 'bg-white/10 border-white/20 text-white',
          isVideoMessage && 'max-w-sm lg:max-w-md xl:max-w-lg'
        )}
      >
        {/* Username and timestamp */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/90">
            {message.username}
          </span>
          <span className="text-xs text-white/60">
            {formatTimestamp(message.timestamp)}
          </span>
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
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
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
                  const codeString = String(children).replace(/\n$/, '');
                  
                  return !inline && language ? (
                    <div className="relative group my-3">
                      {/* Language badge and copy button */}
                      <div className="flex items-center justify-between bg-gray-800/90 px-4 py-2 rounded-t-lg border-b border-white/10">
                        <span className="text-xs font-mono text-blue-300 uppercase tracking-wider">
                          {language}
                        </span>
                        <button
                          onClick={() => copyToClipboard(codeString, language)}
                          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                          title="Copy code"
                        >
                          {copiedCode === codeString ? (
                            <>
                              <CheckIcon className="w-4 h-4 text-green-400" />
                              <span className="text-green-400">Copied!</span>
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
                      <SyntaxHighlighter
                        style={atomDark}
                        language={language}
                        PreTag="div"
                        className="!mt-0 !rounded-t-none !rounded-b-lg !bg-gray-900/90 text-sm"
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          background: 'rgba(17, 24, 39, 0.9)',
                          borderRadius: '0 0 0.5rem 0.5rem',
                        }}
                        codeTagProps={{
                          style: {
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                          }
                        }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  ) : inline ? (
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-900/90 p-3 rounded-lg my-2 overflow-x-auto font-mono text-sm" {...props}>
                      {children}
                    </code>
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