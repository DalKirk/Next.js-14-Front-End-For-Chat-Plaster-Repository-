'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitializedRef = useRef(false); // Prevent double initialization
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    // Prevent double initialization (React StrictMode in dev)
    if (isInitializedRef.current) {
      console.log('⚠️ Skipping duplicate initialization');
      return;
    }
    
    // Get user from localStorage
    const savedUser = localStorage.getItem('chat-user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      
      // Mark as initialized
      isInitializedRef.current = true;
      
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
      console.log('🧹 Cleaning up room - disconnecting WebSocket');
      socketManager.disconnect();
      setWsConnected(false);
      setIsConnected(false);
      isInitializedRef.current = false; // Reset for next mount
    };
  }, [roomId]); // Removed 'router' from dependencies to prevent re-renders

  const initializeWebSocket = async (userData?: User) => {
    const currentUser = userData || user;
    if (!currentUser) return;
    
    try {
      console.log('🔌 Initializing chat connection...');
      console.log('👤 User:', currentUser.id, currentUser.username);
      console.log('🏠 Room:', roomId);
      
      // STEP 1: Try to join room on backend (REQUIRED for WebSocket to work)
      try {
        await apiClient.joinRoom(roomId, currentUser.id);
        console.log('✅ Joined room on backend successfully - WebSocket should now work');
      } catch (joinError) {
        console.error('❌ Failed to join room:', joinError);
        console.warn('⚠️ Your backend needs a POST /rooms/{roomId}/join endpoint that accepts {user_id}');
        console.warn('⚠️ Without this, WebSocket will reject the connection because user is not in room');
        toast.error('Cannot join room - backend endpoint missing', { duration: 5000 });
        // Continue anyway - maybe backend auto-registers on WS connect
      }

      // STEP 2: Connect WebSocket (works even if join endpoint doesn't exist)
      setConnectionAttempts(prev => prev + 1);
      socketManager.connect(roomId, currentUser.id);
      
      // Handle connection status
      socketManager.onConnect((connected: boolean) => {
        setWsConnected(connected);
        setIsConnected(connected);
        
        if (connected) {
          // Only show success toast on FIRST connection (not on reconnects)
          if (!isConnected) {
            toast.success('Connected to real-time chat!', { 
              duration: 2000,
              id: 'ws-connected' // Prevents duplicate toasts
            });
          }
          console.log('✅ WebSocket connected - real-time messaging active');
        } else {
          console.log('⚠️ WebSocket disconnected - attempting to reconnect...');
          // Don't show error toast here - reconnection is automatic
          // Only show error if it's a first-time connection failure
        }
      });
      
      // Handle incoming messages - IMPROVED VERSION
      socketManager.onMessage((socketMessage: { type?: string; content?: string; message?: string; id?: string; message_id?: string; user_id?: string; sender_id?: string; username?: string; sender?: string; timestamp?: string; created_at?: string; message_type?: string; title?: string; playback_id?: string }) => {
        // Ignore system messages like keep_alive, ping, pong
        if (socketMessage.type && ['keep_alive', 'ping', 'pong', 'error'].includes(socketMessage.type)) {
          return; // Don't add these to chat
        }
        
        // Handle different message formats from backend
        const messageContent = socketMessage.content || socketMessage.message || '';
        const messageId = socketMessage.id || socketMessage.message_id || `msg-${Date.now()}-${Math.random()}`;
        
        const newMessage: Message = {
          id: messageId,
          room_id: roomId,
          user_id: socketMessage.user_id || socketMessage.sender_id || 'unknown',
          username: socketMessage.username || socketMessage.sender || 'Unknown User',
          content: messageContent,
          timestamp: socketMessage.timestamp || socketMessage.created_at || new Date().toISOString(),
          type: (socketMessage.type || socketMessage.message_type || 'message') as Message['type'],
          title: socketMessage.title,
          playback_id: socketMessage.playback_id
        };
        
        setMessages(prev => {
          // Avoid duplicate messages by ID
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) {
            return prev;
          }
          return [...prev, newMessage];
        });
      });
      
      // Handle typing indicators
      socketManager.onTyping((data: { type?: string; user_id?: string; username?: string }) => {
        const typingUserId = data.user_id;
        const typingUsername = data.username || 'Someone';
        
        if (typingUserId === currentUser.id) return; // Ignore own typing
        
        if (data.type === 'typing_start') {
          setTypingUsers(prev => {
            const updated = new Set(prev);
            updated.add(typingUsername);
            return updated;
          });
        } else if (data.type === 'typing_stop') {
          setTypingUsers(prev => {
            const updated = new Set(prev);
            updated.delete(typingUsername);
            return updated;
          });
        }
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
      
      // Validate and sanitize messages - ensure all have valid timestamps
      const validMessages = roomMessages.map(msg => ({
        ...msg,
        // Ensure timestamp is valid, fallback to current time
        timestamp: msg.timestamp && !isNaN(new Date(msg.timestamp).getTime()) 
          ? msg.timestamp 
          : new Date().toISOString()
      }));
      
      setMessages(validMessages);
      console.log('✅ Loaded and validated messages from backend:', validMessages.length);
    } catch (error) {
      console.error('❌ Failed to load messages from backend:', error);
      toast.error('Failed to connect to server. Please check your connection.');
      setMessages([]);
    }
  };

  const sendMessage = (content: string) => {
    if (!content.trim() || !user) return;
    
    if (wsConnected && socketManager.isConnected()) {
      // Send via WebSocket - message will appear when server broadcasts it back
      // Send via WebSocket
      try {
        socketManager.sendMessage(content);
        console.log('📤 Message sent via WebSocket:', content);
        // Message will appear in chat when received from server (no optimistic update)
      } catch (error) {
        console.error('❌ Failed to send message via WebSocket:', error);
        toast.error('Failed to send message. Check your connection.');
        throw error; // Re-throw to be caught by handleSendMessage
      }
    } else {
      console.error('❌ WebSocket not connected - cannot send message');
      toast.error('Not connected to server. Cannot send message.');
      throw new Error('WebSocket not connected');
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;
    
    try {
      // Stop typing indicator before sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socketManager.sendTypingIndicator(false);
      
      sendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message. Please check your connection.');
    }
  };

  const handleFileContent = (content: string, filename: string) => {
    // Auto-detect and format the file content
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash'
    };
    
    const language = extension ? languageMap[extension] || extension : 'text';
    const formattedContent = `File: ${filename}\n\`\`\`${language}\n${content}\n\`\`\``;
    setMessage(formattedContent);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Send typing indicator
    if (value.trim() && wsConnected) {
      socketManager.sendTypingIndicator(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        socketManager.sendTypingIndicator(false);
      }, 2000);
    } else if (!value.trim()) {
      // Clear typing if message is empty
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketManager.sendTypingIndicator(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift = Send message
    // Shift+Enter = New line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Allow Shift+Enter to create newlines naturally
  };

  const handleLiveStream = async () => {
    if (!user || !videoTitle.trim()) {
      toast.error('Please enter a title for your stream');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🎥 Creating live stream:', videoTitle);
      const stream = await apiClient.createLiveStream(roomId, videoTitle.trim());
      console.log('✅ Live stream created:', stream);
      
      // Verify we have required data
      if (!stream.playback_id) {
        toast.error('⚠️ Live stream created but missing playback ID. Check backend Bunny.net configuration.');
        console.error('Missing playback_id in stream response:', stream);
      }
      
      if (!stream.stream_key) {
        toast.error('⚠️ Live stream created but missing stream key. Check backend Bunny.net configuration.');
        console.error('Missing stream_key in stream response:', stream);
      }
      
      // Create a video message with live stream info
      const streamMessage: Message = {
        id: `stream-${Date.now()}`,
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
      
      // Add to messages immediately
      setMessages(prev => [...prev, streamMessage]);
      
      // Also send via WebSocket if connected
      if (wsConnected && socketManager.isConnected()) {
        try {
          // Send as JSON string with proper structure
          const wsMessage = {
            type: 'live_stream_created',
            content: streamMessage.content,
            title: videoTitle,
            playback_id: stream.playback_id,
            stream_key: stream.stream_key
          };
          socketManager.sendMessage(JSON.stringify(wsMessage));
          console.log('📤 Sent live stream message via WebSocket');
        } catch (wsError) {
          console.error('Failed to send via WebSocket:', wsError);
        }
      }
      
      toast.success(`✅ Live stream created!`, { duration: 3000 });
      
      // Show detailed stream info
      setTimeout(() => {
        toast.success(
          `RTMP URL: ${stream.rtmp_url || 'rtmp://rtmp.bunnycdn.com/live'}\nStream Key: ${stream.stream_key}`,
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
      console.log('📤 Starting video upload:', { title: videoTitle, file: selectedFile.name });
      
      // Step 1: Create video upload request
      const upload = await apiClient.createVideoUpload(roomId, videoTitle.trim());
      console.log('✅ Upload URL received:', upload);
      
      if (!upload.playback_id) {
        toast.error('⚠️ Upload created but missing playback ID. Check backend Bunny.net configuration.');
      }
      
      setUploadProgress(25);
      
  // Step 2: Upload file directly to Bunny.net (or provider returned upload_url)
  console.log('⬆️ Uploading file to upload_url...');
  // If the backend returned an access_key, include it in the PUT headers
  const apiKey = (upload as { access_key?: string }).access_key || undefined;
  await apiClient.uploadVideoFile(upload.upload_url, selectedFile, (pct) => setUploadProgress(pct), apiKey);
      setUploadProgress(100);
      console.log('✅ File uploaded successfully');
      
      // Step 3: Create video message
      const videoMessage: Message = {
        id: `video-${Date.now()}`,
        room_id: roomId,
        user_id: user.id,
        username: user.username,
        content: `📹 Shared video: ${videoTitle}`,
        timestamp: new Date().toISOString(),
        type: 'video_ready',
        title: videoTitle,
        playback_id: upload.playback_id
      };
      
      // Add to messages immediately
      setMessages(prev => [...prev, videoMessage]);
      
      // Also send via WebSocket if connected
      if (wsConnected && socketManager.isConnected()) {
        try {
          const wsMessage = {
            type: 'video_ready',
            content: videoMessage.content,
            title: videoTitle,
            playback_id: upload.playback_id
          };
          socketManager.sendMessage(JSON.stringify(wsMessage));
          console.log('📤 Sent video message via WebSocket');
        } catch (wsError) {
          console.error('Failed to send via WebSocket:', wsError);
        }
      }
      
      toast.success('✅ Video uploaded successfully!', { duration: 3000 });
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
                  {wsConnected ? 'No messages yet. Start the conversation!' : '⚠️ Real-time messaging unavailable'}
                </div>
                {!wsConnected && (
                  <div className="space-y-4">
                    <div className="text-white/40 text-sm max-w-md mx-auto">
                      <p className="mb-2">Your backend server needs WebSocket support for real-time chat.</p>
                      <p className="text-xs">Required endpoint: <code className="bg-white/10 px-2 py-1 rounded">wss://your-backend/ws/{'{roomId}'}/{'{userId}'}</code></p>
                    </div>
                    <Button
                      onClick={loadMessages}
                      variant="primary"
                      size="sm"
                    >
                      Load Messages Manually
                    </Button>
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
            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="mb-2 text-sm text-white/70 italic flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
                <span>
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <div className="flex-1">
                <Textarea
                  placeholder={wsConnected ? "Type your message (Markdown supported)...\nShift+Enter for new line, Enter to send\nDrag & drop code files for instant sharing!" : "Connect to server to send messages"}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyPress}
                  onFileContent={handleFileContent}
                  disabled={!wsConnected}
                  rows={message.includes('\n') || message.length > 80 ? Math.min(Math.max(message.split('\n').length, 3), 10) : 2}
                  className="min-h-[60px] max-h-[300px]"
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