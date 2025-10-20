import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Message, VideoMessage } from '@/lib/types';
import { VideoPlayer } from '@/components/video/video-player';
import { cn } from '@/lib/utils';

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
          className="text-primary-300 hover:text-primary-200 underline break-all"
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

  const isVideoMessage = message.type === 'video_ready' || message.type === 'live_stream_created';
  const videoMessage = message as VideoMessage;

  // Safely format timestamp with fallback
  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Now';
    
    try {
      // Ensure timestamp has 'Z' suffix for UTC if it doesn't already
      const isoTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
      const date = new Date(isoTimestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Now';
      }
      
      return format(date, 'HH:mm');
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
            ? 'bg-primary-500/25 border-primary-400/40 text-text-primary shadow-primary-500/20' 
            : 'bg-surface/60 border-primary-400/25 text-text-primary',
          isVideoMessage && 'max-w-sm lg:max-w-md xl:max-w-lg'
        )}
      >
        {/* Username and timestamp */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            {message.username}
          </span>
          <span className="text-xs text-text-muted">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        {/* Message content */}
        {message.type === 'system' ? (
          <p className="text-sm italic text-text-secondary">
            {parseMessageWithLinks(message.content)}
          </p>
        ) : isVideoMessage ? (
          <div className="space-y-3">
            {/* Video type indicator */}
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {message.type === 'live_stream_created' ? '🔴' : '🎥'}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {message.type === 'live_stream_created' ? 'Live Stream' : 'Video'}
              </span>
            </div>
            
            {/* Video title */}
            {videoMessage.title && (
              <h4 className="text-sm font-medium text-text-primary">
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
              <p className="text-sm text-text-secondary">
                {parseMessageWithLinks(message.content)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-primary break-words">
            {parseMessageWithLinks(message.content)}
          </p>
        )}
      </div>
    </motion.div>
  );
}