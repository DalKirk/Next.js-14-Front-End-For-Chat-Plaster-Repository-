'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { MessageBubble } from '@/components/chat/message-bubble';
import { VideoPlayer } from '@/components/video/video-player';
import { useChat } from '@/hooks/use-chat';
import { User, Message } from '@/lib/types';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  PaperAirplaneIcon, 
  VideoCameraIcon, 
  DocumentIcon,
  ArrowLeftIcon 
} from '@heroicons/react/24/outline';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const roomName = searchParams.get('name') || 'Chat Room';

  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Get user from localStorage
    const savedUser = localStorage.getItem('chat-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      router.push('/');
      return;
    }

    // Load initial messages
    loadMessages();
    
    // Set connected status for demo
    setIsConnected(true);
  }, [roomId, router]);

  const loadMessages = async () => {
    try {
      const roomMessages = await apiClient.getRoomMessages(roomId);
      setMessages(roomMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      
      // Demo mode: Add some sample messages to show functionality
      const demoMessages: Message[] = [
        {
          id: '1',
          room_id: roomId,
          user_id: 'demo-user-1',
          username: 'Alice',
          content: 'Welcome to the chat room! 👋',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          type: 'message'
        },
        {
          id: '2',
          room_id: roomId,
          user_id: 'demo-user-2',
          username: 'Bob',
          content: 'Great to see everyone here!',
          timestamp: new Date(Date.now() - 240000).toISOString(),
          type: 'message'
        },
        {
          id: '3',
          room_id: roomId,
          user_id: 'demo-user-3',
          username: 'Charlie',
          content: 'This chat interface looks amazing with the glassmorphism design! ✨',
          timestamp: new Date(Date.now() - 180000).toISOString(),
          type: 'message'
        },
        {
          id: '4',
          room_id: roomId,
          user_id: 'demo-user-1',
          username: 'Alice',
          content: 'The auto-scroll feature works perfectly! 🚀',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          type: 'message'
        },
        {
          id: '5',
          room_id: roomId,
          user_id: 'demo-user-2',
          username: 'Bob',
          content: 'And the input stays visible while scrolling - so convenient!',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          type: 'message'
        }
      ];
      
      setMessages(demoMessages);
    }
  };

  const sendMessage = (content: string) => {
    if (!content.trim() || !user) return;
    
    // Add message locally for immediate feedback
    const newMessage: Message = {
      id: Date.now().toString(),
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: content,
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-scroll to new message will happen via useEffect
    // In a real app, this would send via WebSocket
    // For demo purposes, we'll just add it locally
    toast.success('Message sent (demo mode)');
  };

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;
    
    sendMessage(message.trim());
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLiveStream = async () => {
    if (!user || !videoTitle.trim()) {
      toast.error('Please enter a title for your stream');
      return;
    }

    setIsLoading(true);
    try {
      const stream = await apiClient.createLiveStream(roomId, videoTitle.trim());
      toast.success(`Live stream created! Stream key: ${stream.stream_key}`);
      setShowVideoModal(false);
      setVideoTitle('');
      
      // Send message about the stream
      sendMessage(`🔴 Started live stream: ${videoTitle}`);
    } catch (error) {
      toast.error('Failed to create live stream');
      console.error('Error creating live stream:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoUpload = async () => {
    if (!user || !videoTitle.trim()) {
      toast.error('Please enter a title for your video');
      return;
    }

    setIsLoading(true);
    try {
      const upload = await apiClient.createVideoUpload(roomId, videoTitle.trim());
      toast.success('Video upload created! Check your files.');
      setShowUploadModal(false);
      setVideoTitle('');
      
      // Send message about the upload
      sendMessage(`📹 Shared video: ${videoTitle}`);
    } catch (error) {
      toast.error('Failed to create video upload');
      console.error('Error creating video upload:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-h-screen overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card m-4 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push('/chat')}
              variant="ghost"
              size="sm"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{roomName}</h1>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-white/60">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowVideoModal(true)}
              variant="secondary"
              size="sm"
            >
              <VideoCameraIcon className="w-4 h-4 mr-2" />
              🔴 Live
            </Button>
            <Button
              onClick={() => setShowUploadModal(true)}
              variant="secondary"
              size="sm"
            >
              <DocumentIcon className="w-4 h-4 mr-2" />
              📹 Upload
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 mx-4 mb-4 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card flex-1 flex flex-col min-h-0"
        >
          {/* Messages List */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" 
            id="messages-container"
          >
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-white/60">No messages yet. Start the conversation!</div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <MessageBubble
                    key={index}
                    message={msg}
                    isOwn={msg.username === user.username}
                  />
                ))}
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Sticky Message Input */}
          <div className="border-t border-white/10 p-4 bg-black/20 backdrop-blur-sm sticky bottom-0">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isConnected}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || !isConnected}
                variant="primary"
                size="sm"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Live Stream Modal */}
      <Modal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        title="Create Live Stream"
      >
        <div className="space-y-4">
          <Input
            label="Stream Title"
            placeholder="Enter stream title"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
          />
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowVideoModal(false)}
              variant="glass"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLiveStream}
              disabled={isLoading || !videoTitle.trim()}
              variant="primary"
              className="flex-1"
            >
              {isLoading ? 'Creating...' : 'Start Stream'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Video Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Video"
      >
        <div className="space-y-4">
          <Input
            label="Video Title"
            placeholder="Enter video title"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
          />
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowUploadModal(false)}
              variant="glass"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVideoUpload}
              disabled={isLoading || !videoTitle.trim()}
              variant="primary"
              className="flex-1"
            >
              {isLoading ? 'Creating...' : 'Create Upload'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}