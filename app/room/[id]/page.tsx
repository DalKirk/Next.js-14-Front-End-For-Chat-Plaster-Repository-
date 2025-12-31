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
// import { useChat } from '@/hooks/use-chat'; // Reserved for future use
import { User, Message } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { applyMessageForRender, cacheUserProfile, updateAvatarEverywhere } from '@/lib/message-utils';
import toast from 'react-hot-toast';
import { 
  PaperAirplaneIcon, 
  VideoCameraIcon, 
  DocumentIcon,
  ArrowLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

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
  const [avatarDirectory, setAvatarDirectory] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
          localStorage.setItem('chat-user', JSON.stringify(created));
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
      console.log('🧹 Cleaning up room - disconnecting WebSocket');
      socketManager.disconnect();
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
            localStorage.setItem('chat-user', JSON.stringify(created));
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
        if (newMessage.playback_id || newMessage.type === 'video_ready' || newMessage.type === 'live_stream_created') {
          setHosts(prev => {
            const copy = new Set(prev);
            if (newMessage.user_id) copy.add(newMessage.user_id);
            return copy;
          });
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
      socketManager.onNotification((data: { type?: string; user_id?: string; username?: string; avatar_url?: string }) => {
        if (!data) return;
        if (data.type === 'user_joined' || data.type === 'typing_start' || data.type === 'typing_stop') {
          cacheUserProfile(data.user_id, data.username, data.avatar_url);
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
      
      // Normalize and sanitize messages for rendering
      const validMessages = roomMessages.map(msg => applyMessageForRender(msg as import('@/types/backend').BackendMessage, {
        roomId,
        currentUser: effectiveUser,
        currentUserAvatar: effectiveAvatar,
      }));

      // Update host list (any message that has playback_id or is a video notification)
      const computedHosts = new Set<string>();
      validMessages.forEach(m => {
        if (m.playback_id || m.type === 'video_ready' || m.type === 'live_stream_created') {
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
      const localMessages = JSON.parse(localStorage.getItem(`room-${roomId}-messages`) || '[]');
      if (localMessages.length > 0) {
        console.log('📦 Loaded', localMessages.length, 'messages from localStorage');
        setMessages(localMessages);
        // Compute hosts from local messages as well
        const localHosts = new Set<string>();
        localMessages.forEach((m: Message) => {
          if (m.playback_id || m.type === 'video_ready' || m.type === 'live_stream_created') {
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
        stream_key: stream.stream_key,
        avatar: userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&size=128`
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
                  wsConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
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
            {/* Desktop buttons (>450px) */}
            <div className="hidden min-[450px]:flex items-center space-x-2">
              <Button
                onClick={() => setShowVideoModal(true)}
                variant="secondary"
                size="sm"
                className="text-xs sm:text-sm border-slate-700/50 hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
              >
                <VideoCameraIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">🔴 Live</span>
                <span className="sm:hidden">🔴</span>
              </Button>
              <Button
                onClick={() => setShowUploadModal(true)}
                variant="secondary"
                size="sm"
                className="text-xs sm:text-sm border-slate-700/50 hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
              >
                <DocumentIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">📹 Upload</span>
                <span className="sm:hidden">📹</span>
              </Button>
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
                  <div className="w-full h-0.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  <div className="w-full h-0.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  <div className="w-full h-0.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                </div>
              </Button>
              
              {showMobileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-12 bg-gradient-to-br from-black/80 via-slate-900/80 to-black/80 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-black/50 z-[100] min-w-[180px]"
                >
                  <div className="p-2 space-y-2">
                    <Button
                      onClick={() => {
                        setShowVideoModal(true);
                        setShowMobileMenu(false);
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start text-sm border-slate-700/50 hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                    >
                      <VideoCameraIcon className="w-4 h-4 mr-2" />
                      🔴 Live Stream
                    </Button>
                    <Button
                      onClick={() => {
                        setShowUploadModal(true);
                        setShowMobileMenu(false);
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start text-sm border-slate-700/50 hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
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
        {/* Split screen container: messages on left, video on right */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Messages column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card w-full lg:w-1/2 flex flex-col min-h-0 border border-slate-700/50 shadow-black/50"
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
                  {messages.map((msg, index) => (
                    <div key={index} className="mb-2">
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
              <div className="mb-2 text-sm text-emerald-400 italic flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce shadow-[0_0_8px_rgba(34,197,94,0.8)]" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(74,222,128,0.8)]" style={{ animationDelay: '300ms' }}></span>
                </span>
                <span>
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <div className="flex-1 min-w-0">
                <Textarea
                  placeholder="Type your message (Markdown supported)...\nShift+Enter for new line, Enter to send\nDrag & drop code files for instant sharing!"
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyPress}
                  onFileContent={handleFileContent}
                  disabled={false}
                  rows={2}
                  className="h-[60px] !min-h-[60px] !max-h-[60px] overflow-y-auto !resize-none text-base"
                  style={{ height: '60px', minHeight: '60px', maxHeight: '60px', fontSize: '16px' }}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                variant="primary"
                className="shrink-0 w-12 h-[60px] flex items-center justify-center bg-transparent border-transparent hover:bg-transparent hover:shadow-none disabled:opacity-50"
                title={wsConnected ? "Send via WebSocket" : "Send via REST API (WebSocket unavailable)"}
              >
                <PaperAirplaneIcon className="w-5 h-5 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Video column */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-0">
          <div className="glass-card flex-1 border border-slate-700/50 shadow-black/50 p-4 flex flex-col min-h-0">
            <h3 className="text-slate-300 font-semibold mb-3">Video</h3>
            <div className="flex-1 min-h-0">
              {/* VideoPlayer will render the most recent video message (playback_id) */}
              {(() => {
                const latestVideo = [...messages].reverse().find(m => m.playback_id || m.type === 'video_ready' || m.type === 'live_stream_created');
                if (latestVideo && latestVideo.playback_id) {
                  return (
                    <VideoPlayer playbackId={latestVideo.playback_id} title={latestVideo.title} autoPlay muted className="w-full h-full" />
                  );
                }
                return (
                  <div className="h-full w-full flex items-center justify-center text-slate-500">No video available</div>
                );
              })()}
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
              className="w-10 h-10 rounded-full p-0 bg-black/40 backdrop-blur-sm border border-slate-700/50 hover:bg-green-500/20 hover:border-green-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
              title="Scroll to top"
            >
              <ChevronUpIcon className="w-4 h-4 text-green-500" />
            </Button>
            
            {!isAtBottom && (
              <Button
                onClick={scrollToBottom}
                variant="primary"
                size="sm"
                className="w-10 h-10 rounded-full p-0 bg-gradient-to-br from-green-500 to-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                title="Scroll to bottom"
              >
                <ChevronDownIcon className="w-4 h-4 text-black" />
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
              className="bg-gradient-to-r from-fuchsia-500 to-purple-600 backdrop-blur-sm border border-fuchsia-400/30 hover:from-fuchsia-600 hover:to-purple-700 shadow-[0_0_20px_rgba(217,70,239,0.6)]"
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
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
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