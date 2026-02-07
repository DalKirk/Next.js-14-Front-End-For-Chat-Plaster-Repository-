'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { MessageBubble } from '@/components/chat/message-bubble';
import { StorageManager } from '@/lib/storage-manager';
import { VideoPlayer } from '@/components/video/video-player';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { LiveStream } from '@/components/video/live-stream';
import { StreamViewer } from '@/components/video/stream-viewer';
import { webrtcManager } from '@/lib/webrtc-manager';
// import { useChat } from '@/hooks/use-chat'; // Reserved for future use
import { User, Message } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { applyMessageForRender, cacheUserProfile, updateAvatarEverywhere } from '@/lib/message-utils';
import { sanitizeUserForStorage } from '@/lib/utils';
import toast from 'react-hot-toast';
import { 
  VideoCameraIcon, 
  DocumentIcon,
  ArrowLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

// Interface for WebSocket messages
interface WebSocketMessage {
  type?: string;
  content?: string;
  message?: string;
  id?: string;
  message_id?: string;
  user_id?: string;
  sender_id?: string;
  username?: string;
  sender?: string;
  timestamp?: string;
  created_at?: string;
  message_type?: string;
  title?: string;
  playback_id?: string;
  avatar?: string;
  avatar_url?: string;
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const roomName = searchParams.get('name') || 'Chat Room';

  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  // Track which user IDs are hosts (started/uploaded a video). Messages from these users are highlighted
  const [hosts, setHosts] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStopStreamModal, setShowStopStreamModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollControls, setShowScrollControls] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [, setConnectionAttempts] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const lastMessageCountRef = useRef<number>(0);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setAvatarDirectory] = useState<Record<string, string>>({});
  const [isLiveStreamMode, setIsLiveStreamMode] = useState(false); // Toggle between live stream and video playback
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null); // Incoming stream from broadcaster
  const [broadcasterName, setBroadcasterName] = useState<string>(''); // Name of active broadcaster
  const isBroadcastingRef = useRef(false); // Track if currently broadcasting to prevent double notifications
  const [showMobileChatOverlay, setShowMobileChatOverlay] = useState(true); // Mobile chat overlay visibility
  const [presentUsers, setPresentUsers] = useState<Set<string>>(new Set()); // Track users present in room
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Video framing controls
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [centerBias, setCenterBias] = useState<boolean>(false);

  // Prevent viewport zoom on mobile when focusing inputs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Add viewport meta tag to prevent zooming
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content'
      );
    }

    return () => {
      // Restore original viewport settings on unmount
      if (metaViewport) {
        metaViewport.setAttribute('content', 
          'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, interactive-widget=resizes-content'
        );
      }
    };
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitializedRef = useRef(false); // Prevent double initialization
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null); // Debounce typing ping to reduce lag

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

  // Filter messages based on search term - reserved for future use
  // const filteredMessages = messages;

  // Avatar is now loaded synchronously in the main useEffect to prevent race conditions

  useEffect(() => {
    // Only auto-scroll if user is at bottom (not browsing history)
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  // Seed present users with current user once available
  useEffect(() => {
    if (user?.id) {
      setPresentUsers(prev => {
        const updated = new Set(prev);
        updated.add(user.id);
        return updated;
      });
    }
  }, [user?.id]);

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
      console.log('👤 Loaded user from localStorage:', userData);
      console.log('   - ID:', userData.id);
      console.log('   - Username:', userData.username);
      setUser(userData);
      
      // Load user avatar BEFORE loading messages (critical for avatar display)
      const storedProfile = localStorage.getItem('userProfile');
      let loadedAvatar: string | null = null;
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          if (profile.avatar) {
            loadedAvatar = profile.avatar;
            setUserAvatar(profile.avatar);
            console.log('🖼️ User avatar loaded:', profile.avatar.substring(0, 50) + '...');
          } else {
            console.log('⚠️ No avatar found in profile');
          }
        } catch (error) {
          console.error('Error parsing user profile:', error);
        }
      } else {
        console.log('⚠️ No userProfile in localStorage');
      }
      
      // Mark as initialized
      isInitializedRef.current = true;
      
      // Load initial messages with avatar available
      loadMessages(userData, loadedAvatar);
      
      // Initialize WebSocket connection after user is set
      setTimeout(() => {
        initializeWebSocket(userData, loadedAvatar);
      }, 100);
    } else {
      // No local user: strictly create one on backend, then proceed
      (async () => {
        try {
          const localProfileRaw = localStorage.getItem('userProfile');
          let desiredName = 'Guest';
          if (localProfileRaw) {
            try {
              const parsed = JSON.parse(localProfileRaw);
              if (parsed.username && typeof parsed.username === 'string') {
                desiredName = parsed.username;
              }
            } catch {}
          }
          // Ensure minimal uniqueness
          const uniqueName = `${desiredName}-${Math.random().toString(36).slice(2, 6)}`;
          const created = await apiClient.createUser(uniqueName);
          console.log('👤 Created backend user:', created);
          localStorage.setItem('chat-user', JSON.stringify(sanitizeUserForStorage(created)));
          setUser(created);
          // Load avatar from profile if present
          // Prefer dedicated avatar key (updated by profile page), fallback to userProfile
          const storedAvatar = localStorage.getItem('userAvatar');
          if (storedAvatar) {
            setUserAvatar(storedAvatar);
            console.log('🖼️ User avatar loaded:', storedAvatar.substring(0, 50) + '...');
          } else {
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
              try {
                const profile = JSON.parse(storedProfile);
                if (profile.avatar) {
                  setUserAvatar(profile.avatar);
                  console.log('🖼️ User avatar loaded:', profile.avatar.substring(0, 50) + '...');
                }
              } catch {}
            }
          }
          isInitializedRef.current = true;
          // Load messages and init WS
          loadMessages(created, userAvatar);
          setTimeout(() => initializeWebSocket(created, userAvatar), 100);
        } catch (createErr) {
          console.error('❌ Failed to auto-create user:', createErr);
          router.push('/');
          return;
        }
      })();
    }
    
    // Cleanup WebSocket on unmount
    return () => {
      console.log('🧹 Cleaning up room - disconnecting WebSocket and WebRTC');
      socketManager.disconnect();
      webrtcManager.cleanup();
      setWsConnected(false);
      setIsConnected(false);
      isInitializedRef.current = false; // Reset for next mount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Removed 'router' from dependencies to prevent re-renders

  // React to avatar changes from profile page (localStorage updates)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'userAvatar') {
        const newAvatar = e.newValue;
        setUserAvatar(newAvatar);
        // Update caches for current user
        if (user && newAvatar) {
          try {
            const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
            const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
            byId[user.id] = newAvatar;
            byName[user.username] = newAvatar;
            localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
            localStorage.setItem('userAvatarCache', JSON.stringify(byName));
          } catch {}
        }
        // Update existing messages to reflect new avatar immediately
        if (user && newAvatar) {
          setMessages(prev => prev.map(m => {
            if (m.user_id === user.id) {
              return {
                ...m,
                avatar: newAvatar,
                avatar_urls: { thumbnail: newAvatar, small: newAvatar, medium: newAvatar, large: newAvatar }
              };
            }
            return m;
          }));
          // Also patch all stored room histories so other rooms reflect updates
          try { updateAvatarEverywhere(user.id, user.username, newAvatar); } catch {}
        }
      }
    };
    window.addEventListener('storage', onStorage);
    // Also listen for profile page custom event and broadcast channel
    const onAvatarUpdated = (ev: Event) => {
      try {
        const anyEv = ev as CustomEvent<{ userId: string; username: string; avatar: string }>;
        const detail = anyEv.detail;
        if (!detail) return;
        if (user && (detail.userId === user.id || detail.username === user.username)) {
          const newAvatar = detail.avatar;
          setUserAvatar(newAvatar);
          try {
            const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
            const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
            byId[user.id] = newAvatar;
            byName[user.username] = newAvatar;
            localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
            localStorage.setItem('userAvatarCache', JSON.stringify(byName));
          } catch {}
          setMessages(prev => prev.map(m => m.user_id === user.id
            ? { ...m, avatar: newAvatar, avatar_urls: { thumbnail: newAvatar, small: newAvatar, medium: newAvatar, large: newAvatar } }
            : m));
          // Patch all stored room histories
          try { updateAvatarEverywhere(user.id, user.username, newAvatar); } catch {}
        }
      } catch {}
    };
    window.addEventListener('avatar-updated', onAvatarUpdated);

    const bc = new BroadcastChannel('avatar-updates');
    bc.onmessage = (msg: MessageEvent) => {
      const data = msg.data as { userId?: string; username?: string; avatar?: string };
      if (!data || !data.avatar) return;
      if (user && (data.userId === user.id || data.username === user.username)) {
        const newAvatar = data.avatar;
        setUserAvatar(newAvatar);
        try {
          const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
          const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
          byId[user.id] = newAvatar;
          byName[user.username] = newAvatar;
          localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
          localStorage.setItem('userAvatarCache', JSON.stringify(byName));
        } catch {}
        setMessages(prev => prev.map(m => m.user_id === user.id
          ? { ...m, avatar: newAvatar, avatar_urls: { thumbnail: newAvatar, small: newAvatar, medium: newAvatar, large: newAvatar } }
          : m));
        // Patch all stored room histories
        try { updateAvatarEverywhere(user.id, user.username, newAvatar); } catch {}
      }
    };

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('avatar-updated', onAvatarUpdated);
      bc.close();
    };
  }, [user]);

  // Cross-device profile sync: periodically fetch current user's profile
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const backendUser = await apiClient.getProfile(user.id);
        if (cancelled) return;
        const nextUsername = backendUser.display_name || backendUser.username;
        const nextEmail = backendUser.email;
        const nextBio = (backendUser as { bio?: string }).bio;
        const nextAvatar = backendUser.avatar_url || userAvatar || undefined;
        setUser(prev => prev ? { ...prev, username: nextUsername ?? prev.username, email: nextEmail ?? prev.email, bio: nextBio ?? (prev as { bio?: string }).bio } : prev);
        if (nextAvatar && nextAvatar !== userAvatar) {
          const newAvatar = nextAvatar;
          setUserAvatar(newAvatar);
          try {
            const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
            const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
            byId[user.id] = newAvatar;
            byName[user.username] = newAvatar;
            localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
            localStorage.setItem('userAvatarCache', JSON.stringify(byName));
          } catch {}
        }
      } catch (e) {
        // ignore transient errors
      }
    }, 30000); // 30s cadence
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.id, user?.username, userAvatar]);

  // Listen for profile updates (username/email/avatar) and update local state in real time
  useEffect(() => {
    if (!user) return;
    const onProfileUpdated = (ev: Event) => {
      try {
        const anyEv = ev as CustomEvent;
        const detail = anyEv.detail as { userId?: string; username?: string; prevUsername?: string; email?: string; bio?: string; avatar?: string };
        if (!detail) return;
        if (detail.userId && detail.userId !== user.id) return;
        setUser(prev => prev ? { ...prev, username: detail.username || prev.username, email: detail.email || prev.email, bio: detail.bio ?? (prev as any).bio } : prev);
        // Patch current room messages with new username immediately
        if (detail.username && (detail.prevUsername || user.id)) {
          setMessages(prev => prev.map(m => (m.user_id === user.id || (detail.prevUsername && m.username === detail.prevUsername)) ? { ...m, username: detail.username! } : m));
        }
        if (detail.avatar) {
          const newAvatar = detail.avatar;
          setUserAvatar(newAvatar);
          try {
            const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
            const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
            byId[user.id] = newAvatar;
            byName[user.username] = newAvatar;
            localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
            localStorage.setItem('userAvatarCache', JSON.stringify(byName));
          } catch {}
        }
      } catch {}
    };
    window.addEventListener('profile-updated', onProfileUpdated);
    const bc = new BroadcastChannel('profile-updates');
    bc.onmessage = (msg: MessageEvent) => {
      const data = msg.data as { userId?: string; username?: string; prevUsername?: string; email?: string; bio?: string; avatar?: string };
      if (!data) return;
      if (data.userId && data.userId !== user.id) return;
      setUser(prev => prev ? { ...prev, username: data.username || prev.username, email: data.email || prev.email, bio: data.bio ?? (prev as any).bio } : prev);
      if (data.username && (data.prevUsername || user.id)) {
        setMessages(prev => prev.map(m => (m.user_id === user.id || (data.prevUsername && m.username === data.prevUsername)) ? { ...m, username: data.username! } : m));
      }
      if (data.avatar) {
        const newAvatar = data.avatar;
        setUserAvatar(newAvatar);
        try {
          const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
          const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
          byId[user.id] = newAvatar;
          byName[user.username] = newAvatar;
          localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
          localStorage.setItem('userAvatarCache', JSON.stringify(byName));
        } catch {}
      }
    };

    return () => {
      window.removeEventListener('profile-updated', onProfileUpdated);
      bc.close();
    };
  }, [user]);

  const initializeWebSocket = async (userData?: User, avatarOverride?: string | null) => {
    const currentUser = userData || user;
    if (!currentUser) return;
    
    try {
      console.log('🔌 Initializing chat connection...');
      console.log('👤 User:', currentUser.id, currentUser.username);
      console.log('🏠 Room:', roomId);
      // Seed local avatar caches for the current user so history and early messages resolve
      if (userAvatar && currentUser.username) {
        try {
          const avatarCacheSeed = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
          const avatarCacheByIdSeed = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
          avatarCacheSeed[currentUser.username] = userAvatar;
          avatarCacheByIdSeed[currentUser.id] = userAvatar;
          localStorage.setItem('userAvatarCache', JSON.stringify(avatarCacheSeed));
          localStorage.setItem('userAvatarCacheById', JSON.stringify(avatarCacheByIdSeed));
          console.log('🌱 Seeded avatar cache for current user');
        } catch (storageError) {
          console.warn('⚠️ Failed to seed avatar cache (localStorage quota exceeded):', storageError);
          // Continue without cache seeding
        }
      }
      
      // STEP 1: Try to join room on backend (REQUIRED for WebSocket to work)
      // Resolve an avatar URL for backend - prefer actual user avatar over fallback
      const resolveAvatarUrl = (): string | undefined => {
        // Always prefer the actual user avatar if available (data URLs or HTTPS)
        const currentAvatar = avatarOverride !== undefined ? avatarOverride : userAvatar;
        if (currentAvatar) {
          console.log('✅ Using custom avatar:', currentAvatar.substring(0, 50) + '...');
          return currentAvatar;
        }
        // Fallback only if no avatar exists: generate a deterministic avatar URL
        const fallbackUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(currentUser.id)}`;
        console.log('⚠️ No custom avatar, using fallback:', fallbackUrl);
        return fallbackUrl;
      };
      const avatarUrl = resolveAvatarUrl();

      try {
        await apiClient.joinRoom(roomId, currentUser.id, currentUser.username, avatarUrl);
        console.log('✅ Joined room on backend successfully - WebSocket should now work');
      } catch (joinError: unknown) {
        console.error('❌ Failed to join room:', joinError);
        const msg = (joinError instanceof Error ? joinError.message : String(joinError || '')).toLowerCase();
        // If backend reports user missing, create user then retry join once
        if (msg.includes('user not found')) {
          try {
            console.log('👤 Creating missing user, then retrying join...');
            const created = await apiClient.createUser(currentUser.username || 'Guest');
            localStorage.setItem('chat-user', JSON.stringify(sanitizeUserForStorage(created)));
            setUser(created);
            await apiClient.joinRoom(roomId, created.id, created.username, avatarUrl);
            console.log('✅ Joined after creating user');
          } catch (retryErr) {
            console.error('❌ Retry join failed:', retryErr);
            toast.error('Cannot join room. Please create user and room first.', { duration: 5000 });
            setIsConnected(false);
            setWsConnected(false);
            return;
          }
        } else {
          toast.error('Cannot join room. Please create user and room first.', { duration: 5000 });
          setIsConnected(false);
          setWsConnected(false);
          return;
        }
      }

      // STEP 2: Connect WebSocket (works even if join endpoint doesn't exist)
      setConnectionAttempts(prev => prev + 1);
      console.log('🔌 Connecting WebSocket with:', { 
        roomId, 
        userId: currentUser.id, 
        username: currentUser.username,
        avatar_url: avatarUrl
      });
      socketManager.connect(roomId, currentUser.id, currentUser.username, avatarUrl);
      
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
      socketManager.onMessage((socketMessage: WebSocketMessage) => {
        // Ignore system messages like keep_alive, ping, pong
        if (socketMessage.type && ['keep_alive', 'ping', 'pong', 'error'].includes(socketMessage.type)) {
          return; // Don't add these to chat
        }

        // Handle profile/avatar update notifications pushed by backend for cross-device sync
        if (socketMessage.type && (socketMessage.type === 'profile_updated' || socketMessage.type === 'avatar_updated')) {
          const updatedUserId = socketMessage.user_id || socketMessage.sender_id;
          const updatedUsername = socketMessage.username || socketMessage.sender;
          const newAvatar = socketMessage.avatar_url || socketMessage.avatar;
          if (updatedUserId && newAvatar) {
            try {
              // Seed caches
              const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
              const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
              byId[updatedUserId] = newAvatar;
              if (updatedUsername) byName[updatedUsername] = newAvatar;
              localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
              localStorage.setItem('userAvatarCache', JSON.stringify(byName));
            } catch {}
            const synthesize = (url: string) => ({ thumbnail: url, small: url, medium: url, large: url });
            // Patch in-memory history
            setMessages(prev => prev.map(m => (m.user_id === updatedUserId)
              ? { ...m, avatar: newAvatar, avatar_urls: synthesize(newAvatar) }
              : m));
            // If this update is for current user, reflect in state
            if (user && updatedUserId === user.id) {
              setUserAvatar(newAvatar);
            }
            // Persist across all room histories
            try { updateAvatarEverywhere(updatedUserId, updatedUsername || '', newAvatar); } catch {}
          }
          return; // Do not treat as chat message
        }
        
        // Derive identity from server payload, then correct for own messages
        const incomingUserId = socketMessage.user_id || socketMessage.sender_id;
        let username = socketMessage.username || socketMessage.sender || 'Unknown User';
        let avatar = socketMessage.avatar_url || socketMessage.avatar;

        // If the incoming message is from the current user, ALWAYS use real profile avatar
        if (user && incomingUserId && incomingUserId === user.id) {
          username = user.username;
          // Force use of actual user avatar, don't trust server's generic fallback
          avatar = userAvatar || avatar;
        }
        
        console.log('📬 Received WebSocket message:', { 
          username, 
          avatar: avatar ? 'YES (' + avatar.substring(0, 30) + '...)' : 'NO',
          content: (socketMessage.content || socketMessage.message || '').substring(0, 50) + '...',
          rawMessage: socketMessage
        });
        
        // Cache avatar/profile from message
        cacheUserProfile(incomingUserId, username, avatar);
        
        const newMessage: Message = applyMessageForRender(socketMessage, {
          roomId,
          currentUser: user,
          currentUserAvatar: userAvatar,
        });

        // If this message indicates a video upload/start, add the user to hosts set so all their messages are highlighted
        if (newMessage.playback_id || newMessage.type === 'video_ready') {
          setHosts(prev => {
            const copy = new Set(prev);
            if (newMessage.user_id) copy.add(newMessage.user_id);
            return copy;
          });
        }
        
        // Don't display live stream start/stop notifications in chat
        if (newMessage.type === 'live_stream_created') {
          console.log('🔴 Live stream notification (not adding to chat):', newMessage.content);
          return;
        }
        
        setMessages(prev => {
          // Replace local optimistic message with server echo to avoid duplicates
          const localMsgIdx = prev.findIndex(m => 
            m.id.startsWith('local-') && 
            m.username === newMessage.username && 
            m.content === newMessage.content
          );
          
          if (localMsgIdx >= 0) {
            const localMsg = prev[localMsgIdx];
            
            // ALWAYS preserve the local message's avatar - it has the real profile picture
            // The server only has a generic fallback
            if (localMsg.avatar) {
              console.log('✅ Preserving local avatar over server avatar');
              newMessage.avatar = localMsg.avatar;
            }
            
            // Replace the local message with the server one (but keeping local avatar)
            const updated = [...prev];
            updated[localMsgIdx] = newMessage;
            return updated;
          }
          
          // Avoid duplicate messages by ID
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) {
            return prev;
          }
          return [...prev, newMessage];
        });
      });
      
      // Cache avatars from join/leave/typing notifications for future messages
      socketManager.onNotification((data: { type?: string; user_id?: string; username?: string; avatar_url?: string; users?: Array<{ user_id: string }> }) => {
        if (!data) return;
        if (data.type === 'user_joined' || data.type === 'typing_start' || data.type === 'typing_stop') {
          cacheUserProfile(data.user_id, data.username, data.avatar_url);
        }

        // Track present users for real-time viewer count
        if (data.type === 'room_state' && Array.isArray(data.users)) {
          setPresentUsers(prev => {
            const updated = new Set(prev);
            data.users!.forEach(u => { if (u.user_id) updated.add(u.user_id); });
            return updated;
          });
        }
        if (data.type === 'user_joined' && data.user_id) {
          setPresentUsers(prev => {
            const updated = new Set(prev);
            updated.add(data.user_id!);
            return updated;
          });
        }
        if ((data.type === 'user_left' || data.type === 'user_disconnected') && data.user_id) {
          setPresentUsers(prev => {
            const updated = new Set(prev);
            updated.delete(data.user_id!);
            return updated;
          });
        }
      });
      
      // Handle typing indicators
      socketManager.onTyping((data: { type?: string; user_id?: string; username?: string }) => {
        const typingUserId = data.user_id;
        const typingUsername = data.username || 'Someone';
        
        if (user && typingUserId === user.id) return; // Ignore own typing
        
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
      
      // Handle WebRTC signaling for video streaming
      socketManager.on('webrtc-signal', async (data: { from_user_id: string; from_username: string; signal: any; target_user_id?: string }) => {
        // Ignore signals from ourselves (backend echo)
        if (data.from_user_id === currentUser.id) {
          console.log('⚠️ Ignoring WebRTC signal from self');
          return;
        }
        
        // Ignore signals not targeted at us (if target_user_id is present)
        if (data.target_user_id && data.target_user_id !== currentUser.id) {
          console.log('⚠️ Ignoring WebRTC signal targeted at someone else:', data.target_user_id);
          return;
        }
        
        console.log('📡 Received WebRTC signal from:', data.from_username, 'type:', data.signal.type);
        console.log('   Current user ID:', currentUser.id, '| From user ID:', data.from_user_id);
        console.log('   Is broadcaster:', webrtcManager.isBroadcaster);
        
        await webrtcManager.handleSignal(
          data.from_user_id,
          { ...data.signal, username: data.from_username },
          (targetUserId, signal) => {
            // Send signal back through WebSocket
            console.log('📡 Sending WebRTC signal back:', signal.type, 'to:', data.from_username, '(userId:', targetUserId, ')');
            socketManager.sendWebRTCSignal(roomId, targetUserId, signal);
          }
        );
      });

      // Handle broadcaster start/stop notifications
      socketManager.on('broadcast-started', (data: { user_id: string; username: string }) => {
        console.log('📡 Broadcast started by:', data.username);
        console.log('📡 Current user ID:', currentUser.id, '| Broadcaster ID:', data.user_id);
        setBroadcasterName(data.username);
        
        // If we're a viewer (not the broadcaster), connect to broadcaster
        if (data.user_id !== currentUser.id) {
          console.log('📡 Creating viewer peer connection to broadcaster');
          webrtcManager.createPeerConnection(
            data.user_id,
            data.username,
            true, // Viewer creates offer
            (targetUserId, signal) => {
              console.log('📡 Sending offer to broadcaster:', signal.type);
              socketManager.sendWebRTCSignal(roomId, targetUserId, signal);
            }
          );
        } else {
          console.log('📡 Skipping viewer peer (we are the broadcaster)');
        }
      });

      socketManager.on('broadcast-stopped', () => {
        console.log('📡 Broadcast stopped');
        setBroadcasterName('');
        setRemoteStream(null);
      });

      // Handle active broadcasts when joining room (for late joiners)
      socketManager.on('active-broadcasts', (data: { broadcasters: Array<{ user_id: string; username: string }> }) => {
        console.log('📡 Received active broadcasts:', data.broadcasters);
        
        // Connect to each active broadcaster
        data.broadcasters.forEach((broadcaster) => {
          // Skip if this is ourselves
          if (broadcaster.user_id === currentUser.id) {
            console.log('📡 Skipping self broadcast');
            return;
          }
          
          console.log('📡 Late join: connecting to active broadcaster:', broadcaster.username);
          setBroadcasterName(broadcaster.username);
          
          // Create peer connection to the broadcaster
          webrtcManager.createPeerConnection(
            broadcaster.user_id,
            broadcaster.username,
            true, // Viewer creates offer
            (targetUserId, signal) => {
              console.log('📡 Late join: sending offer to broadcaster:', signal.type);
              socketManager.sendWebRTCSignal(roomId, targetUserId, signal);
            }
          );
        });
      });

      // Set up remote stream handler
      webrtcManager.onRemoteStream((userId, stream) => {
        console.log('📺 Received remote stream from:', userId);
        setRemoteStream(stream);
        setIsLiveStreamMode(false); // Switch to watch mode
      });
      
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setIsConnected(false);
      setWsConnected(false);
      
      toast.error('Failed to connect to real-time server. Please check your connection.');
    }
  };

  const loadMessages = async (currentUser?: User, currentAvatar?: string | null) => {
    const effectiveUser = currentUser || user;
    const effectiveAvatar = currentAvatar !== undefined ? currentAvatar : userAvatar;
    
    try {
      const roomMessages = await apiClient.getRoomMessages(roomId, 100);
      
      // Normalize and sanitize messages for rendering, filter out live stream notifications
      const validMessages = roomMessages
        .filter(msg => (msg.type !== 'live_stream_created' && (msg as any).message_type !== 'live_stream_created'))
        .map(msg => applyMessageForRender(msg as import('@/types/backend').BackendMessage, {
          roomId,
          currentUser: effectiveUser,
          currentUserAvatar: effectiveAvatar,
        }));

      // Update host list (any message that has playback_id or is a video notification)
      const computedHosts = new Set<string>();
      validMessages.forEach(m => {
        if (m.playback_id || m.type === 'video_ready') {
          computedHosts.add(m.user_id);
        }
      });
      setHosts(computedHosts);
      
      setMessages(prev => {
        // Merge fetched messages with existing ones, preserving local optimistic messages
        const byId = new Map<string, Message>();
        // Start with previous messages to keep local- optimistic ones until replaced
        for (const m of prev) {
          byId.set(m.id, m);
        }
        // Overlay fetched messages; preserve avatar if previous had one
        for (const newMsg of validMessages) {
          const existing = byId.get(newMsg.id);
          if (existing && existing.avatar && !newMsg.avatar) {
            byId.set(newMsg.id, { ...newMsg, avatar: existing.avatar });
          } else {
            byId.set(newMsg.id, newMsg);
          }
        }
        const result = Array.from(byId.values());
        // Sort by timestamp/created_at to keep chronological order
        result.sort((a, b) => {
          const ta = new Date(a.timestamp ?? (a as { created_at?: string }).created_at ?? 0).getTime();
          const tb = new Date(b.timestamp ?? (b as { created_at?: string }).created_at ?? 0).getTime();
          return ta - tb;
        });
        return result;
      });
      console.log('✅ Loaded and validated messages from backend:', validMessages.length);

      // Fetch latest avatars for all distinct users in this room to ensure history reflects updates across devices
      try {
        const userIds = Array.from(new Set(validMessages.map(m => m.user_id).filter((id): id is string => !!id)));
        if (userIds.length > 0) {
          const synthesize = (url: string) => ({ thumbnail: url, small: url, medium: url, large: url });
          const results = await Promise.allSettled(userIds.map(async (id) => {
            const profile = await apiClient.getProfile(id);
            const latest = profile.avatar_urls?.medium || profile.avatar_urls?.large || profile.avatar_url || null;
            return { id, latest };
          }));
          const directoryUpdates: Record<string, string> = {};
          results.forEach(r => {
            if (r.status === 'fulfilled' && r.value.latest) {
              directoryUpdates[r.value.id] = r.value.latest;
            }
          });
          if (Object.keys(directoryUpdates).length > 0) {
            setAvatarDirectory(prev => ({ ...prev, ...directoryUpdates }));
            // Patch messages in-memory to reflect latest avatars
            setMessages(prev => prev.map(m => {
              const latest = directoryUpdates[m.user_id || ''];
              if (latest && m.avatar !== latest) {
                return { ...m, avatar: latest, avatar_urls: synthesize(latest) };
              }
              return m;
            }));
            // Seed caches for future loads
            try {
              const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
              const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
              const nameMap: Record<string, string> = {};
              validMessages.forEach(m => { if (m.user_id && m.username) nameMap[m.user_id] = m.username; });
              Object.entries(directoryUpdates).forEach(([id, url]) => {
                byId[id] = url;
                const name = nameMap[id];
                if (name) byName[name] = url;
              });
              localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
              localStorage.setItem('userAvatarCache', JSON.stringify(byName));
            } catch {}
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to refresh avatars for history:', e);
      }
    } catch (error) {
      console.error('❌ Failed to load messages from backend:', error);
      
      // Load local messages as fallback
      const localMessages = JSON.parse(localStorage.getItem(`room-${roomId}-messages`) || '[]')
        .filter((m: Message) => (m.type !== 'live_stream_created' && (m as any).message_type !== 'live_stream_created'));
      if (localMessages.length > 0) {
        console.log('📦 Loaded', localMessages.length, 'messages from localStorage');
        setMessages(localMessages);
        // Compute hosts from local messages as well
        const localHosts = new Set<string>();
        localMessages.forEach((m: Message) => {
          if (m.playback_id || m.type === 'video_ready') {
            localHosts.add(m.user_id);
          }
        });
        setHosts(localHosts);
        toast('Backend offline - showing local messages only', { 
          icon: '⚠️',
          duration: 3000 
        });
      } else {
        toast.error('Backend unavailable - no messages to show');
        setMessages([]);
      }
    }
  };

  // Periodically refresh avatars for users present in history to capture cross-device changes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const userIds = Array.from(new Set(messages.map(m => m.user_id).filter((id): id is string => !!id)));
        if (userIds.length === 0) return;
        const synthesize = (url: string) => ({ thumbnail: url, small: url, medium: url, large: url });
        const results = await Promise.allSettled(userIds.map(async (id) => {
          const profile = await apiClient.getProfile(id);
          const latest = profile.avatar_urls?.medium || profile.avatar_urls?.large || profile.avatar_url || null;
          return { id, latest };
        }));
        const directoryUpdates: Record<string, string> = {};
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value.latest) {
            directoryUpdates[r.value.id] = r.value.latest;
          }
        });
        if (Object.keys(directoryUpdates).length > 0) {
          setAvatarDirectory(prev => ({ ...prev, ...directoryUpdates }));
          setMessages(prev => prev.map(m => {
            const latest = directoryUpdates[m.user_id || ''];
            if (latest && m.avatar !== latest) {
              return { ...m, avatar: latest, avatar_urls: synthesize(latest) };
            }
            return m;
          }));
        }
      } catch (e) {
        console.warn('⚠️ Avatar periodic refresh failed:', e);
      }
    }, 10000); // every 10s
    return () => clearInterval(interval);
  }, [messages]);

  // Polling fallback when WebSocket is disconnected
  useEffect(() => {
    if (!wsConnected) {
      const interval = setInterval(() => {
        loadMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
    return;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConnected, roomId]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user) return;
    
    // Cache current user's avatar before sending (with error handling)
    if (userAvatar && user.username) {
      try {
        const avatarCache = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
        const avatarCacheById = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
        avatarCache[user.username] = userAvatar;
        avatarCacheById[user.id] = userAvatar;
        
        // Limit cache size to prevent quota errors - keep only last 50 entries
        const cacheEntries = Object.entries(avatarCache);
        if (cacheEntries.length > 50) {
          const recentCache = Object.fromEntries(cacheEntries.slice(-50));
          localStorage.setItem('userAvatarCache', JSON.stringify(recentCache));
        } else {
          localStorage.setItem('userAvatarCache', JSON.stringify(avatarCache));
        }
        
        const cacheByIdEntries = Object.entries(avatarCacheById);
        if (cacheByIdEntries.length > 50) {
          const recentCacheById = Object.fromEntries(cacheByIdEntries.slice(-50));
          localStorage.setItem('userAvatarCacheById', JSON.stringify(recentCacheById));
        } else {
          localStorage.setItem('userAvatarCacheById', JSON.stringify(avatarCacheById));
        }
        
        console.log('💾 Cached avatar for', user.username);
      } catch (storageError) {
        console.warn('⚠️ Failed to cache avatar (localStorage quota exceeded):', storageError);
        // Continue sending message even if caching fails
      }
    }
    
    if (wsConnected && socketManager.isConnected()) {
      // Send via WebSocket ONLY - backend doesn't have REST endpoint for messages
      try {
        socketManager.sendMessage(content, userAvatar || undefined);
        console.log('📤 Message sent via WebSocket with avatar:', !!userAvatar);
      } catch (error) {
        console.error('❌ Failed to send message via WebSocket:', error);
        toast.error('Failed to send message');
        return;
      }
      // Show message immediately (optimistic update)
      addLocalMessage(content);
    } else {
      // Backend unavailable - show message locally only
      console.log('⚠️ WebSocket not connected - cannot send message');
      toast.error('Not connected to chat. Please wait for connection...', { 
        duration: 3000 
      });
    }
  };

  const addLocalMessage = (content: string) => {
    if (!user) return;
    
    // Generate fallback avatar if none exists
    const finalAvatar = userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&size=128`;
    
    const newMessage: Message = {
      id: `local-${Date.now()}-${Math.random()}`,
      room_id: roomId,
      user_id: user.id,
      username: user.username,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      type: 'message',
      avatar: finalAvatar
    };
    
    console.log('💬 Adding local message:', {
      username: newMessage.username,
      avatar: newMessage.avatar ? 'YES' : 'NO',
      content: content.substring(0, 50)
    });
    
    setMessages(prev => [...prev, newMessage]);
    
    // Store in localStorage with automatic quota management
    const messageKey = `room-${roomId}-messages`;
    const localMessages = StorageManager.getItem(messageKey, []) as Message[];
    localMessages.push(newMessage);
    StorageManager.setItem(messageKey, localMessages); // Auto-limits to 100 messages
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;
    
    try {
      // Stop typing indicator before sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (wsConnected) {
        socketManager.sendTypingIndicator(false);
      }
      
      await sendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Error toast already shown in sendMessage
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

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Send typing indicator
    if (value.trim() && wsConnected) {
      // Debounce typing start to reduce rapid network calls
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
      typingDebounceRef.current = setTimeout(() => {
        socketManager.sendTypingIndicator(true);
      }, 150);

      // Clear existing stop-typing timeout
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
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
      socketManager.sendTypingIndicator(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Enter without Shift = Send message
    // Shift+Enter = New line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Allow Shift+Enter to create newlines naturally
  };
  // Auto-show mobile chat overlay when new messages arrive (no auto-hide to prevent flicker)
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (!isMobile) return;

    if (messages.length > lastMessageCountRef.current) {
      // New message arrived
      setShowMobileChatOverlay(true);
      // Disabled auto-hide: keep overlay visible to avoid blinking
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    }
    lastMessageCountRef.current = messages.length;

    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [messages]);

  const handleStopStream = () => {
    setIsLiveStreamMode(false);
    setShowStopStreamModal(false);
    toast.success('Live stream ended', { duration: 2000 });
  };

  const handleLiveStream = async () => {
    if (!user || !videoTitle.trim()) {
      toast.error('Please enter a title for your stream');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🎥 Starting live stream:', videoTitle);
      
      toast.success(`✅ Starting live stream: ${videoTitle}`, { duration: 3000 });
      
      // Activate live stream mode to show camera
      setIsLiveStreamMode(true);
      
      setShowVideoModal(false);
      setVideoTitle('');
    } catch (error) {
      toast.error('Failed to start live stream.');
      console.error('Error starting live stream:', error);
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
        playback_id: upload.playback_id,
        avatar: userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&size=128`
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
    <div className="min-h-screen flex flex-col max-h-screen overflow-hidden bg-gradient-to-br from-black via-slate-950 to-black">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card m-2 sm:m-4 p-2 sm:p-4 border border-slate-700/50 shadow-black/50 relative z-50"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <Button
              onClick={() => router.push('/chat')}
              variant="ghost"
              size="sm"
              className="shrink-0"
            >
              <ArrowLeftIcon className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold text-white truncate">{roomName}</h1>
              <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)]' : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                }`}></div>
                <span className="text-slate-400 hidden min-[375px]:inline">
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
            {/* Desktop hamburger menu in header (>450px) */}
            <div className="hidden min-[450px]:block relative">
              <Button
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                variant="secondary"
                size="sm"
                className="bg-transparent border-transparent hover:bg-transparent p-2"
                title="Menu"
              >
                <div className="w-6 h-5 flex flex-col justify-between">
                  <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.85)]"></div>
                  <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.85)]"></div>
                  <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.85)]"></div>
                </div>
              </Button>

              {showHeaderMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-10 bg-gradient-to-br from-black/80 via-slate-900/80 to-black/80 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-black/50 z-[100] min-w-[220px]"
                >
                  <div className="p-2 space-y-2">
                    {/* Stream Mode Controls */}
                    <div className="border-b border-slate-700/50 pb-2 mb-2">
                      <div className="text-xs text-slate-400 mb-2 px-2">Stream Mode</div>
                      {!isLiveStreamMode ? (
                        <Button
                          onClick={() => { setIsLiveStreamMode(false); setShowHeaderMenu(false); }}
                          variant="secondary"
                          size="sm"
                          className={`w-full justify-start text-sm mb-1 ${
                            !isLiveStreamMode 
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                              : 'border-slate-700/50 hover:border-cyan-400/60'
                          }`}
                        >
                          👁️ Watch Mode
                        </Button>
                      ) : (
                        <Button
                          onClick={() => { setShowStopStreamModal(true); setShowHeaderMenu(false); }}
                          variant="secondary"
                          size="sm"
                          className="w-full justify-start text-sm bg-red-500/20 text-red-300 border-red-500/50 mb-1"
                        >
                          🛑 End Live
                        </Button>
                      )}
                      <Button
                        onClick={() => { setIsLiveStreamMode(true); setShowHeaderMenu(false); }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm ${
                          isLiveStreamMode 
                            ? 'bg-green-500/20 text-green-300 border-green-500/50' 
                            : 'border-slate-700/50 hover:border-green-400/60'
                        }`}
                      >
                        🟢 Go Live
                      </Button>
                    </div>

                    {/* Framing Controls */}
                    <div className="border-b border-slate-700/50 pb-2 mb-2">
                      <div className="text-xs text-slate-400 mb-2 px-2">Framing</div>
                      <Button
                        onClick={() => { setFitMode('cover'); setShowHeaderMenu(false); }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm mb-1 ${
                          fitMode === 'cover'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'border-slate-700/50 hover:border-cyan-400/60'
                        }`}
                      >
                        🔲 Fill (Cover)
                      </Button>
                      <Button
                        onClick={() => { setFitMode('contain'); setShowHeaderMenu(false); }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm mb-1 ${
                          fitMode === 'contain'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'border-slate-700/50 hover:border-cyan-400/60'
                        }`}
                      >
                        🧩 Fit (Contain)
                      </Button>
                      <Button
                        onClick={() => { setCenterBias(!centerBias); setShowHeaderMenu(false); }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm ${
                          centerBias
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'border-slate-700/50 hover:border-cyan-400/60'
                        }`}
                      >
                        🎯 Centering {centerBias ? 'On' : 'Off'}
                      </Button>
                    </div>

                    {/* Video Actions */}
                    <Button
                      onClick={() => { setShowVideoModal(true); setShowHeaderMenu(false); }}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start text-sm border-slate-700/50 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                    >
                      <VideoCameraIcon className="w-4 h-4 mr-2" />
                      📡 Stream Settings
                    </Button>
                    <Button
                      onClick={() => { setShowUploadModal(true); setShowHeaderMenu(false); }}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start text-sm border-slate-700/50 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                    >
                      <DocumentIcon className="w-4 h-4 mr-2" />
                      📹 Upload Video
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Mobile hamburger menu (<=450px) */}
            <div className="min-[450px]:hidden relative">
              <Button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                variant="secondary"
                size="sm"
                className="bg-transparent border-transparent hover:bg-transparent p-2"
              >
                <div className="w-6 h-5 flex flex-col justify-between">
                  <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.85)]"></div>
                  <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.85)]"></div>
                  <div className="w-full h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.85)]"></div>
                </div>
              </Button>
              
              {showMobileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-12 bg-gradient-to-br from-black/80 via-slate-900/80 to-black/80 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-black/50 z-[100] min-w-[180px]"
                >
                  <div className="p-2 space-y-2">
                    {/* Stream Mode Controls */}
                    <div className="border-b border-slate-700/50 pb-2 mb-2">
                      <div className="text-xs text-slate-400 mb-2 px-2">Stream Mode</div>
                      <Button
                        onClick={() => {
                          if (isLiveStreamMode) {
                            setShowStopStreamModal(true);
                          } else {
                            setIsLiveStreamMode(false);
                          }
                          setShowMobileMenu(false);
                        }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm mb-1 ${
                          !isLiveStreamMode 
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                            : 'border-slate-700/50 hover:border-cyan-400/60'
                        }`}
                      >
                        👁️ Watch Mode
                      </Button>
                      <Button
                        onClick={() => {
                          setIsLiveStreamMode(true);
                          setShowMobileMenu(false);
                        }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm ${
                          isLiveStreamMode 
                            ? 'bg-red-500/20 text-red-300 border-red-500/50' 
                            : 'border-slate-700/50 hover:border-red-400/60'
                        }`}
                      >
                        🔴 Go Live
                      </Button>
                    </div>
                    
                    {/* Framing Controls */}
                    <div className="border-b border-slate-700/50 pb-2 mb-2">
                      <div className="text-xs text-slate-400 mb-2 px-2">Framing</div>
                      <Button
                        onClick={() => { setFitMode('cover'); setShowMobileMenu(false); }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm mb-1 ${
                          fitMode === 'cover'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'border-slate-700/50 hover:border-cyan-400/60'
                        }`}
                      >
                        🔲 Fill (Cover)
                      </Button>
                      <Button
                        onClick={() => { setFitMode('contain'); setShowMobileMenu(false); }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm mb-1 ${
                          fitMode === 'contain'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'border-slate-700/50 hover:border-cyan-400/60'
                        }`}
                      >
                        🧩 Fit (Contain)
                      </Button>
                      <Button
                        onClick={() => { setCenterBias(!centerBias); setShowMobileMenu(false); }}
                        variant="secondary"
                        size="sm"
                        className={`w-full justify-start text-sm ${
                          centerBias
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'border-slate-700/50 hover:border-cyan-400/60'
                        }`}
                      >
                        🎯 Centering {centerBias ? 'On' : 'Off'}
                      </Button>
                    </div>
                    
                    {/* Video Actions */}
                    <Button
                      onClick={() => {
                        setShowVideoModal(true);
                        setShowMobileMenu(false);
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start text-sm border-slate-700/50 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                    >
                      <VideoCameraIcon className="w-4 h-4 mr-2" />
                      📡 Stream Settings
                    </Button>
                    <Button
                      onClick={() => {
                        setShowUploadModal(true);
                        setShowMobileMenu(false);
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start text-sm border-slate-700/50 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                    >
                      <DocumentIcon className="w-4 h-4 mr-2" />
                      📹 Upload Video
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 mx-2 sm:mx-4 mb-2 sm:mb-4 flex flex-col relative min-h-0">
        {/* Mobile View (320px to 1023px) - Fullscreen video with chat overlay */}
        <div className="lg:hidden fixed inset-0 top-0">
          {/* Video Background - Full Screen */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-black">
            {isLiveStreamMode ? (
              user && (
                <LiveStream
                  roomId={roomId}
                  userId={user.id}
                  username={user.username}
                  fitMode={fitMode}
                  centerBias={centerBias}
                  onStreamStart={(stream) => {
                    console.log('📡 Stream started:', stream);
                    if (!isBroadcastingRef.current) {
                      isBroadcastingRef.current = true;
                      socketManager.notifyBroadcastStarted(roomId);
                    }
                  }}
                  onStreamStop={() => {
                    console.log('🛑 Stream stopped');
                    if (isBroadcastingRef.current) {
                      isBroadcastingRef.current = false;
                      // Guard against WS not connected to avoid console error
                      if (wsConnected && socketManager.isConnected()) {
                        socketManager.notifyBroadcastStopped(roomId);
                      }
                      webrtcManager.cleanup();
                    }
                  }}
                  className="w-full h-full"
                />
              )
            ) : remoteStream ? (
              <StreamViewer 
                stream={remoteStream}
                username={broadcasterName}
                fitMode={fitMode}
                centerBias={centerBias}
                className="w-full h-full"
              />
            ) : (
              (() => {
                const latestVideo = [...messages].reverse().find(m => m.playback_id || m.type === 'video_ready');
                if (latestVideo && latestVideo.playback_id) {
                  return (
                    <VideoPlayer playbackId={latestVideo.playback_id} title={latestVideo.title} autoPlay muted className="w-full h-full" />
                  );
                }
                return (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black">
                    <div className="text-center">
                      <div className="w-32 h-32 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <p className="text-white text-lg font-medium">{isLiveStreamMode ? 'Live Stream Active' : 'Ready to Stream'}</p>
                      <p className="text-slate-400 text-sm mt-2">Camera feed will appear here</p>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Overlay badges in top corners */}
          {isLiveStreamMode && (
            <div className="absolute top-20 left-4 z-40">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/90 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                <span className="text-white text-sm font-semibold">LIVE</span>
              </div>
            </div>
          )}
          <div className="absolute top-20 right-4 z-40">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <span className="text-white text-sm font-semibold">{presentUsers.size}</span>
            </div>
          </div>

          {/* Top Bar - Mobile */}
          <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/60 to-transparent p-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => router.push('/chat')}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-white" />
              </button>
              <div />
            </div>

            {/* Room title removed per request */}
          </div>

          {/* Chat Overlay - Mobile (lower third, auto-hide) */}
          {showMobileChatOverlay && messages.length > 0 && (
            <div className="absolute bottom-[110px] left-0 right-0 z-20 max-h-[22vh] pointer-events-none">
              <div className="px-3 pb-2 space-y-1 overflow-y-auto pointer-events-auto flex flex-col justify-end bg-black/25 rounded-lg">
                {messages
                  .filter(msg => (msg.type !== 'live_stream_created' && (msg as any).message_type !== 'live_stream_created'))
                  .slice(-5)
                  .map((msg) => (
                  <div
                    key={msg.id}
                    className="text-left flex items-start gap-1.5 max-w-[80%]"
                  >
                    <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border border-cyan-400/50">
                      <ResponsiveAvatar 
                        avatarUrls={msg.avatar_urls || (msg.avatar ? { thumbnail: msg.avatar, small: msg.avatar, medium: msg.avatar, large: msg.avatar } : undefined)} 
                        username={msg.username} 
                        size="thumbnail" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[11px] text-cyan-400">
                        {msg.username}:
                      </span>
                      {' '}
                      <span className="text-white/90 text-[11px] leading-snug">{msg.content}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Controls - Mobile */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3">
            {/* Message Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }} 
              className="mb-3"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleMessageChange(e);
                  }}
                  onKeyDown={handleKeyPress}
                  className="flex-1 px-3 py-2 rounded-full bg-slate-800/90 backdrop-blur-sm text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                  style={{ fontSize: '14px' }}
                />
                <button 
                  type="submit"
                  disabled={!message.trim()}
                  className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                >
                  <PaperAirplaneIcon className="w-5 h-5 text-white -rotate-45" />
                </button>
              </div>
            </form>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-2 px-2">
              <button 
                onClick={() => setShowMobileChatOverlay(!showMobileChatOverlay)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/90 backdrop-blur-sm flex items-center justify-center hover:bg-slate-700 transition-all border border-slate-700/50 shadow-lg"
                title="Toggle chat"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </button>

              <button 
                onClick={() => isLiveStreamMode ? setShowStopStreamModal(true) : setShowVideoModal(true)}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all border shadow-lg ${
                  isLiveStreamMode 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 border-white/10' 
                    : 'bg-slate-800/90 hover:bg-slate-700 shadow-slate-900/50 border-slate-700/50'
                } backdrop-blur-sm`}
                title={isLiveStreamMode ? 'Stop streaming' : 'Start live stream'}
              >
                {isLiveStreamMode ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" strokeWidth="2" opacity="0.5"/>
                  </svg>
                )}
              </button>

              <button 
                onClick={() => setShowUploadModal(true)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/90 backdrop-blur-sm flex items-center justify-center hover:bg-slate-700 transition-colors border border-slate-700/50 shadow-lg"
                title="Upload video"
              >
                <DocumentIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop View (1024px+) - Split screen container: messages on left, video on right */}
        <div className="hidden lg:flex flex-1 flex-col lg:flex-row gap-4 min-h-0">
          {/* Messages column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-1/2 flex flex-col min-h-0 order-2 lg:order-1 bg-transparent"
            style={{ maxHeight: 'calc(100vh - 100px)' }}
          >
          {/* Messages List */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-2 sm:p-4 scroll-smooth min-h-0 custom-scrollbar" 
            id="messages-container"
            style={{ maxHeight: 'calc(100vh - 180px)' }}
          >
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-zinc-400 mb-4">
                  No messages yet. Start the conversation!
                </div>
                {!wsConnected && (
                  <div className="space-y-4">
                    <div className="text-slate-500 text-sm max-w-md mx-auto">
                      <p className="mb-2">⚠️ WebSocket unavailable - using polling mode</p>
                      <p className="text-xs">Messages will be sent via REST API and polled every 3 seconds.</p>
                      <p className="text-xs mt-2">To enable real-time chat, your backend needs WebSocket support at:</p>
                      <code className="bg-slate-900 px-2 py-1 rounded text-xs block mt-1">wss://your-backend/ws/{'{roomId}'}/{'{userId}'}</code>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                        {messages
                    .filter(msg => (msg.type !== 'live_stream_created' && (msg as any).message_type !== 'live_stream_created'))
                          .map((msg, index) => (
                            <div key={msg.id} className="mb-2">
                      <MessageBubble
                        message={msg}
                        isOwn={msg.user_id === user?.id}
                        isHost={hosts.has(msg.user_id)}
                      />
                    </div>
                  ))}
                </div>
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Sticky Message Input */}
          <div className="border-t border-slate-700/50 p-2 sm:p-4 bg-black/20 backdrop-blur-sm sticky bottom-0 shadow-black/50">
            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="mb-2 text-sm text-cyan-300 italic flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(34,211,238,0.85)]" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(56,189,248,0.85)]" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.85)]" style={{ animationDelay: '300ms' }}></span>
                </span>
                <span>
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <div className="flex-1 min-w-0">
                <Textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyPress}
                  onFileContent={handleFileContent}
                  disabled={false}
                  rows={2}
                  className="h-[48px] !min-h-[48px] !max-h-[96px] overflow-y-auto !resize-none text-base"
                  style={{ height: '48px', minHeight: '48px', maxHeight: '96px', fontSize: '16px' }}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                variant="primary"
                className="shrink-0 px-4 h-[48px] flex items-center justify-center disabled:opacity-50"
                title={wsConnected ? "Send via WebSocket" : "Send via REST API (WebSocket unavailable)"}
              >
                Send
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Video column */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 order-1 lg:order-2">
          <div className="glass-card flex-1 border border-slate-700/50 shadow-black/50 p-4 flex flex-col min-h-0">
            {/* Video Mode Toggle */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-300 font-semibold">Video</h3>
              <div className="flex items-center space-x-2">
                {!isLiveStreamMode ? (
                  <button
                    onClick={() => setIsLiveStreamMode(false)}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      !isLiveStreamMode 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' 
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    Watch
                  </button>
                ) : (
                  <button
                    onClick={() => setShowStopStreamModal(true)}
                    className="px-3 py-1 rounded text-sm transition-all bg-red-500/20 text-red-300 border border-red-500/50"
                    title="End Live"
                  >
                    End Live
                  </button>
                )}
                <button
                  onClick={() => setIsLiveStreamMode(true)}
                  className={`px-3 py-1 rounded text-sm transition-all ${
                    isLiveStreamMode 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  Go Live
                </button>

                {/* Desktop hamburger menu removed from video section; moved to header */}
              </div>
            </div>
            
            <div className="flex-1 min-h-0 relative">
              {isLiveStreamMode ? (
                /* Live Stream Mode - User is broadcasting */
                user && (
                  <LiveStream
                    roomId={roomId}
                    userId={user.id}
                    username={user.username}
                    fitMode={fitMode}
                    centerBias={centerBias}
                    onStreamStart={(stream) => {
                      console.log('📡 Stream started:', stream);
                      // Notify room that broadcast started (only once)
                      if (!isBroadcastingRef.current) {
                        isBroadcastingRef.current = true;
                        socketManager.notifyBroadcastStarted(roomId);
                      }
                    }}
                    onStreamStop={() => {
                      console.log('🛑 Stream stopped');
                      // Notify room that broadcast stopped (only once)
                      if (isBroadcastingRef.current) {
                        isBroadcastingRef.current = false;
                        if (wsConnected && socketManager.isConnected()) {
                          socketManager.notifyBroadcastStopped(roomId);
                        }
                        webrtcManager.cleanup();
                      }
                    }}
                    className="h-full"
                  />
                )
              ) : remoteStream ? (
                /* Viewing Live Stream from another user */
                <StreamViewer 
                  stream={remoteStream}
                  username={broadcasterName}
                  fitMode={fitMode}
                  centerBias={centerBias}
                  className="h-full"
                />
              ) : (
                /* Video Playback Mode - Recorded videos */
                (() => {
                  const latestVideo = [...messages].reverse().find(m => m.playback_id || m.type === 'video_ready');
                  if (latestVideo && latestVideo.playback_id) {
                    return (
                      <VideoPlayer playbackId={latestVideo.playback_id} title={latestVideo.title} autoPlay muted className="w-full h-full" />
                    );
                  }
                  return (
                    <div className="h-full w-full flex items-center justify-center text-slate-500">
                      <div className="text-center space-y-2">
                        <p>No video playing</p>
                        <p className="text-sm text-white/40">Switch to &quot;Go Live&quot; to start streaming</p>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Overlay badges in top corners for desktop */}
              {isLiveStreamMode && (
                <div className="absolute top-4 left-4 z-40">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/90 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    <span className="text-white text-sm font-semibold">LIVE</span>
                  </div>
                </div>
              )}
              <div className="absolute top-4 right-4 z-40">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  <span className="text-white text-sm font-semibold">{presentUsers.size}</span>
                </div>
              </div>

              {/* End Video Chat button - Desktop overlay */}
              {isLiveStreamMode && (
                <div className="absolute bottom-4 left-0 right-0 z-40 flex justify-center">
                  <button
                    onClick={() => setShowStopStreamModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg shadow-red-500/30 border border-white/10 backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                    title="End Video Chat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"></path>
                    </svg>
                    End Video Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>        {showScrollControls && (
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
              className="w-10 h-10 rounded-full p-0 bg-black/40 backdrop-blur-sm border border-slate-700/50 hover:bg-cyan-400/15 hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              title="Scroll to top"
            >
              <ChevronUpIcon className="w-4 h-4 text-cyan-300" />
            </Button>
            
            {!isAtBottom && (
              <Button
                onClick={scrollToBottom}
                variant="primary"
                size="sm"
                className="w-10 h-10 rounded-full p-0 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                title="Scroll to bottom"
              >
                <ChevronDownIcon className="w-4 h-4 text-black" />
              </Button>
            )}
          </motion.div>
        )}

        {/* New Messages Indicator removed per request; using top/bottom controls only */}
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

      {/* Stop Stream Confirmation Modal */}
      <Modal
        isOpen={showStopStreamModal}
        onClose={() => setShowStopStreamModal(false)}
        title="End Live Stream?"
      >
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Are you sure you want to end your live stream? This will disconnect all viewers.
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowStopStreamModal(false)}
              variant="glass"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStopStream}
              variant="primary"
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
            >
              End Stream
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
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.45)]"
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