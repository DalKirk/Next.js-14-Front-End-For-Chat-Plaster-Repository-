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
import { socketManager } from '@/lib/socket';
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
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
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
      const userData = JSON.parse(savedUser);
      setUser(userData);
      
      // Load initial messages
      loadMessages();
      
      // Initialize WebSocket connection after user is set
      setTimeout(() => {
        initializeWebSocket(userData);
      }, 100);
    } else {
      router.push('/');
      return;
    }
    
    // Cleanup WebSocket on unmount
    return () => {
      socketManager.disconnect();
    };
  }, [roomId, router]);

  const initializeWebSocket = async (userData?: User) => {
    const currentUser = userData || user;
    if (!currentUser) return;
    
    try {
      console.log('🔌 Attempting WebSocket connection...');
      setConnectionAttempts(prev => prev + 1);
      
      // Connect to WebSocket
      socketManager.connect(roomId, currentUser.id);
      
      // Handle connection status
      socketManager.onConnect((connected: boolean) => {
        setWsConnected(connected);
        setIsConnected(connected);
        
        if (connected) {
          toast.success('Connected to real-time chat!');
          console.log('✅ WebSocket connected - real-time messaging active');
        } else {
          console.log('❌ WebSocket disconnected');
          if (connectionAttempts === 1) {
            toast.error('Could not connect to real-time server. Check if your backend is running.');
          }
        }
      });
      
      // Handle incoming messages
      socketManager.onMessage((socketMessage: any) => {
        console.log('📨 Received message:', socketMessage);
        
        const newMessage: Message = {
          id: socketMessage.id || Date.now().toString(),
          room_id: roomId,
          user_id: socketMessage.user_id || 'unknown',
          username: socketMessage.username || 'Unknown User',
          content: socketMessage.content || socketMessage.message || '',
          timestamp: socketMessage.timestamp || new Date().toISOString(),
          type: socketMessage.type || 'message',
          title: socketMessage.title,
          playback_id: socketMessage.playback_id
        };
        
        setMessages(prev => {
          // Avoid duplicate messages
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      });
      
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setIsConnected(false);
      setWsConnected(false);
      
      toast.error('Failed to connect to real-time server. Please check your connection.');
    }
  };

  const loadMessages = async () => {
    try {
      const roomMessages = await apiClient.getRoomMessages(roomId);
      setMessages(roomMessages);
      console.log('✅ Loaded real messages from backend:', roomMessages.length);
    } catch (error) {
      console.error('❌ Failed to load messages from backend:', error);
      toast.error('Failed to connect to server. Please check your connection.');
      setMessages([]);
    }
  };

  const sendMessage = (content: string) => {
    if (!content.trim() || !user) return;
    
    if (wsConnected && socketManager.isConnected()) {
      // Send via WebSocket
      try {
        socketManager.sendMessage(content);
        console.log('📤 Message sent via WebSocket:', content);
        toast.success('Message sent!');
      } catch (error) {
        console.error('Failed to send message via WebSocket:', error);
        toast.error('Failed to send message. Check your connection.');
      }
    } else {
      toast.error('Not connected to server. Cannot send message.');
    }
  };
  
  const addLocalMessage = (content: string) => {
    if (!user) return;
    
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
      
      // Send via WebSocket if connected
      if (wsConnected) {
        socketManager.sendMessage(JSON.stringify(streamMessage));
      }
      
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
      toast.error('Failed to create live stream. Please check backend connection.');
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
      
      // Send via WebSocket if connected
      if (wsConnected) {
        socketManager.sendMessage(JSON.stringify(videoMessage));
      }
      
      toast.success('Video uploaded successfully!');
      resetUploadModal();
    } catch (error) {
      toast.error('Failed to upload video. Please check backend connection.');
      console.error('Error uploading video:', error);
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
                <div className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-white/60">
                  {wsConnected ? 'Connected' : 'Disconnected'}
                </span>
                {!wsConnected && (
                  <Button
                    onClick={() => initializeWebSocket()}
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 py-1 h-6"
                  >
                    Retry
                  </Button>
                )}
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
                <div className="text-white/60 mb-4">
                  {wsConnected ? 'No messages yet. Start the conversation!' : 'WebSocket connection required for real-time messaging.'}
                </div>
                {!wsConnected && (
                  <div className="text-white/40 text-sm">
                    Make sure your backend server is running with WebSocket support.
                  </div>
                )}
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
                  placeholder={wsConnected ? "Type your message..." : "Connect to server to send messages"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!wsConnected}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || !wsConnected}
                variant="primary"
                size="sm"
                className="px-4"
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