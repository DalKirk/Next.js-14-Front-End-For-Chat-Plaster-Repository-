import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Message, VideoMessage } from '@/lib/types';
import { VideoPlayer } from '@/components/video/video-player';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn?: boolean;
}

export function MessageBubble({ message, isOwn = false }: MessageBubbleProps) {
  const [imageError, setImageError] = useState(false);

  const isVideoMessage = message.type === 'video_ready' || message.type === 'live_stream_created';
  const videoMessage = message as VideoMessage;

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
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
        </div>

        {/* Message content */}
        {message.type === 'system' ? (
          <p className="text-sm italic text-white/80">{message.content}</p>
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
            {message.playback_id && (
              <VideoPlayer
                playbackId={message.playback_id}
                title={message.title}
                className="w-full"
                muted={true}
                autoPlay={false}
              />
            )}
            
            {/* Message text if any */}
            {message.content && (
              <p className="text-sm text-white/90">{message.content}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-white break-words">{message.content}</p>
        )}
      </div>
    </motion.div>
  );
}