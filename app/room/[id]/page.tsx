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
  ArrowLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon
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
  const [showScrollControls, setShowScrollControls] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop <= clientHeight + 10;
    
    setIsAtBottom(isScrolledToBottom);
    setShowScrollControls(scrollTop > 100); // Show controls when scrolled up
  };

  // Filter messages based on search term
  const filteredMessages = messages;

  useEffect(() => {
    // Only auto-scroll if user is at bottom (not browsing history)
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

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
      
      // Demo mode: Add more sample messages to show scroll functionality
      const demoMessages: Message[] = [
        {
          id: '1',
          room_id: roomId,
          user_id: 'demo-user-1',
          username: 'Alice',
          content: 'Welcome to the chat room! 👋',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          type: 'message'
        },
        {
          id: '2',
          room_id: roomId,
          user_id: 'demo-user-2',
          username: 'Bob',
          content: 'Great to see everyone here!',
          timestamp: new Date(Date.now() - 540000).toISOString(),
          type: 'message'
        },
        {
          id: '3',
          room_id: roomId,
          user_id: 'demo-user-3',
          username: 'Charlie',
          content: 'This chat interface looks amazing with the glassmorphism design! ✨',
          timestamp: new Date(Date.now() - 480000).toISOString(),
          type: 'message'
        },
        {
          id: '4',
          room_id: roomId,
          user_id: 'demo-user-4',
          username: 'Diana',
          content: 'The search functionality is really helpful for finding old messages',
          timestamp: new Date(Date.now() - 420000).toISOString(),
          type: 'message'
        },
        {
          id: '5',
          room_id: roomId,
          user_id: 'demo-user-1',
          username: 'Alice',
          content: 'I love how the message input stays visible while scrolling through history',
          timestamp: new Date(Date.now() - 360000).toISOString(),
          type: 'message'
        },
        {
          id: '6',
          room_id: roomId,
          user_id: 'demo-user-2',
          username: 'Bob',
          content: 'The scroll controls appear automatically when you scroll up - so intuitive!',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          type: 'message'
        },
        {
          id: '7',
          room_id: roomId,
          user_id: 'demo-user-3',
          username: 'Charlie',
          content: 'And the "New messages" indicator helps you get back to recent conversations',
          timestamp: new Date(Date.now() - 240000).toISOString(),
          type: 'message'
        },
        {
          id: '8',
          room_id: roomId,
          user_id: 'demo-user-4',
          username: 'Diana',
          content: 'Perfect for busy chat rooms with lots of message history! 📚',
          timestamp: new Date(Date.now() - 180000).toISOString(),
          type: 'message'
        },
        {
          id: '9',
          room_id: roomId,
          user_id: 'demo-user-1',
          username: 'Alice',
          content: 'The real-time search works great too - try searching for "glassmorphism"',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          type: 'message'
        },
        {
          id: '10',
          room_id: roomId,
          user_id: 'demo-user-2',
          username: 'Bob',
          content: 'This is the most recent message. The auto-scroll feature works perfectly! 🚀',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          type: 'message'
        },
        {
          id: '11',
          room_id: roomId,
          user_id: 'demo-user-3',
          username: 'Charlie',
          content: 'Adding more messages to test scroll functionality. This should help demonstrate the scrolling!',
          timestamp: new Date(Date.now() - 50000).toISOString(),
          type: 'message'
        },
        {
          id: '12',
          room_id: roomId,
          user_id: 'demo-user-4',
          username: 'Diana',
          content: 'The glassmorphism design looks fantastic with all these messages stacked up!',
          timestamp: new Date(Date.now() - 40000).toISOString(),
          type: 'message'
        },
        {
          id: '13',
          room_id: roomId,
          user_id: 'demo-user-1',
          username: 'Alice',
          content: 'You should now be able to scroll up and down through all the message history.',
          timestamp: new Date(Date.now() - 30000).toISOString(),
          type: 'message'
        },
        {
          id: '14',
          room_id: roomId,
          user_id: 'demo-user-2',
          username: 'Bob',
          content: 'The scroll controls help you navigate back to recent messages quickly.',
          timestamp: new Date(Date.now() - 20000).toISOString(),
          type: 'message'
        },
        {
          id: '15',
          room_id: roomId,
          user_id: 'demo-user-3',
          username: 'Charlie',
          content: 'This is now the most recent message. Perfect for testing the scroll functionality! 🎉',
          timestamp: new Date(Date.now() - 10000).toISOString(),
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
      
      // Create a video message with live stream info
      const streamMessage: Message = {
        id: Date.now().toString(),
        room_id: roomId,
        user_id: user.id,
        username: user.username,
        content: `🔴 Started live stream: ${videoTitle}`,
        timestamp: new Date().toISOString(),
        type: 'live_stream_created',
        title: videoTitle,
        playback_id: stream.playback_id,
        stream_key: stream.stream_key
      };
      
      setMessages(prev => [...prev, streamMessage]);
      toast.success(`Live stream created! Stream key: ${stream.stream_key}`);
      
      // Show detailed stream info
      setTimeout(() => {
        toast.success(
          `RTMP URL: ${stream.rtmp_url || 'rtmp://global-live.mux.com:5222/live'}\nStream Key: ${stream.stream_key}`,
          { duration: 15000 }
        );
      }, 1000);
      
      setShowVideoModal(false);
      setVideoTitle('');
    } catch (error) {
      console.error('Backend live stream failed, using demo mode:', error);
      
      // Demo mode: Create a mock live stream
      const mockStreamMessage: Message = {
        id: Date.now().toString(),
        room_id: roomId,
        user_id: user.id,
        username: user.username,
        content: `🔴 Started live stream: ${videoTitle} (Demo Mode)`,
        timestamp: new Date().toISOString(),
        type: 'live_stream_created',
        title: videoTitle,
        playback_id: 'demo-stream-' + Date.now(),
        stream_key: 'demo-key-' + Math.random().toString(36).substr(2, 9)
      };
      
      setMessages(prev => [...prev, mockStreamMessage]);
      toast.success('Demo: Live stream created! This is a demonstration.');
      
      setTimeout(() => {
        toast(
          '📺 Demo Mode: In production, you would get real RTMP credentials for OBS streaming.',
          { duration: 8000, icon: '🎬' }
        );
      }, 1000);
      
      setShowVideoModal(false);
      setVideoTitle('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoUpload = async () => {
    if (!user || !videoTitle.trim()) {
      toast.error('Please enter a title for your video');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      // Step 1: Create video upload request
      const upload = await apiClient.createVideoUpload(roomId, videoTitle.trim());
      setUploadProgress(25);
      
      // Step 2: Upload file directly to Mux
      await apiClient.uploadVideoFile(upload.upload_url, selectedFile);
      setUploadProgress(100);
      
      // Step 3: Create video message
      const videoMessage: Message = {
        id: Date.now().toString(),
        room_id: roomId,
        user_id: user.id,
        username: user.username,
        content: `📹 Shared video: ${videoTitle}`,
        timestamp: new Date().toISOString(),
        type: 'video_ready',
        title: videoTitle,
        playback_id: upload.playback_id
      };
      
      setMessages(prev => [...prev, videoMessage]);
      toast.success('Video uploaded successfully!');
      
      resetUploadModal();
    } catch (error) {
      console.error('Backend video upload failed, using demo mode:', error);
      
      // Demo mode: Simulate video upload
      const simulateUpload = () => {
        return new Promise<void>((resolve) => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += 20;
            setUploadProgress(progress);
            
            if (progress >= 100) {
              clearInterval(interval);
              resolve();
            }
          }, 200);
        });
      };
      
      await simulateUpload();
      
      // Create mock video message
      const mockVideoMessage: Message = {
        id: Date.now().toString(),
        room_id: roomId,
        user_id: user.id,
        username: user.username,
        content: `📹 Shared video: ${videoTitle} (Demo Mode)`,
        timestamp: new Date().toISOString(),
        type: 'video_ready',
        title: videoTitle,
        playback_id: 'demo-video-' + Date.now()
      };
      
      setMessages(prev => [...prev, mockVideoMessage]);
      toast.success('Demo: Video uploaded! This is a demonstration.');
      
      setTimeout(() => {
        toast(
          '🎥 Demo Mode: In production, your video would be processed by Mux and playable immediately.',
          { duration: 8000, icon: '📹' }
        );
      }, 1000);
      
      resetUploadModal();
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      
      // Check file size (limit to 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 500MB');
        return;
      }
      
      setSelectedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setVideoTitle('');
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              className="text-xs sm:text-sm"
            >
              <VideoCameraIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">🔴 Live</span>
              <span className="sm:hidden">🔴</span>
            </Button>
            <Button
              onClick={() => setShowUploadModal(true)}
              variant="secondary"
              size="sm"
              className="text-xs sm:text-sm"
            >
              <DocumentIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">📹 Upload</span>
              <span className="sm:hidden">📹</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 mx-4 mb-4 flex flex-col relative min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card flex-1 flex flex-col min-h-0"
          style={{ maxHeight: 'calc(100vh - 160px)' }}
        >
          {/* Messages List */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 scroll-smooth min-h-0 custom-scrollbar" 
            id="messages-container"
            style={{ maxHeight: 'calc(100vh - 240px)' }}
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

        {/* Floating Scroll Controls */}
        {showScrollControls && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-6 bottom-24 flex flex-col space-y-2 z-10"
          >
            <Button
              onClick={scrollToTop}
              variant="glass"
              size="sm"
              className="w-10 h-10 rounded-full p-0 bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-white/20"
              title="Scroll to top"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </Button>
            
            {!isAtBottom && (
              <Button
                onClick={scrollToBottom}
                variant="primary"
                size="sm"
                className="w-10 h-10 rounded-full p-0"
                title="Scroll to bottom"
              >
                <ChevronDownIcon className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* New Messages Indicator */}
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10"
          >
            <Button
              onClick={scrollToBottom}
              variant="primary"
              size="sm"
              className="bg-blue-500/90 backdrop-blur-sm border border-white/20 hover:bg-blue-400/90"
            >
              <ChevronDownIcon className="w-4 h-4 mr-1" />
              New messages
            </Button>
          </motion.div>
        )}
      </div>

      {/* Live Stream Modal */}
      <Modal
        isOpen={showVideoModal}
        onClose={() => {
          setShowVideoModal(false);
          setVideoTitle('');
        }}
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
        onClose={resetUploadModal}
        title="Upload Video"
      >
        <div className="space-y-4">
          <Input
            label="Video Title"
            placeholder="Enter video title"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
          />
          
          {/* File Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">
              Select Video File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20 file:backdrop-blur-sm transition-all"
            />
            {selectedFile && (
              <p className="text-xs text-white/60">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          
          {/* Upload Progress */}
          {isLoading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/70">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button
              onClick={resetUploadModal}
              variant="glass"
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVideoUpload}
              disabled={isLoading || !videoTitle.trim() || !selectedFile}
              variant="primary"
              className="flex-1"
            >
              {isLoading ? `Uploading... ${uploadProgress}%` : 'Upload Video'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}