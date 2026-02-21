'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { Room, User } from '@/lib/types';
import { StorageManager } from '@/lib/storage-manager';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import toast from 'react-hot-toast';
import CreateRoomModal, { THUMBNAIL_PRESETS } from '@/components/room/CreateRoomModal';
import { updateAvatarEverywhere } from '@/lib/message-utils';
import { Lock, Users, Globe, Key, Search } from 'lucide-react';

// Room categories for filtering
const CATEGORIES = ['Gaming', 'Study', 'Social', 'Work', 'Music', 'Art', 'Tech', 'Sports', 'Other'];

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [, setIsCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Get user from localStorage
    const savedUser = localStorage.getItem('chat-user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      // Load user avatar from profile, fallback to caches
      let avatarUrl: string | null = null;
      const storedProfile = localStorage.getItem('userProfile');
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          if (profile.avatar) avatarUrl = profile.avatar;
        } catch {}
      }
      if (!avatarUrl) {
        try {
          const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
          const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
          avatarUrl = byId[parsed.id] || byName[parsed.username] || null;
        } catch {}
      }
      setUserAvatar(avatarUrl);
    } else {
      router.push('/');
      return;
    }

    loadRooms();
    
    // Run storage cleanup on mount
    StorageManager.cleanupStorage();
    StorageManager.logStorageUsage();
    
    // Periodic cleanup every 5 minutes
    const cleanupInterval = setInterval(() => {
      StorageManager.cleanupStorage();
    }, 5 * 60 * 1000);
    
    // Listen for profile updates (username/email/avatar) and update local state in real time
    const onProfileUpdated = (ev: Event) => {
      try {
        const anyEv = ev as CustomEvent;
        const detail = anyEv.detail as { userId?: string; username?: string; prevUsername?: string; email?: string; bio?: string; avatar?: string };
        if (!detail) return;
        const { userId, username, prevUsername, email, bio, avatar } = detail;
        setUser(prev => {
          if (!prev) return prev;
          if (userId && prev.id !== userId) return prev;
          const next = { ...prev } as User;
          if (username) next.username = username;
          if (email) next.email = email;
          if (bio !== undefined) next.bio = bio;
          return next;
        });
        if (avatar) setUserAvatar(avatar);
      } catch {}
    };
    window.addEventListener('profile-updated', onProfileUpdated);
    const bc = new BroadcastChannel('profile-updates');
    bc.onmessage = (msg: MessageEvent) => {
      const data = msg.data as { userId?: string; username?: string; prevUsername?: string; email?: string; bio?: string; avatar?: string };
      if (!data) return;
      const { userId, username, prevUsername, email, bio, avatar } = data;
      setUser(prev => {
        if (!prev) return prev;
        if (userId && prev.id !== userId) return prev;
        const next = { ...prev } as User;
        if (username) next.username = username;
        if (email) next.email = email;
        if (bio !== undefined) next.bio = bio;
        return next;
      });
      if (avatar) setUserAvatar(avatar);
    };

    return () => {
      clearInterval(cleanupInterval);
      window.removeEventListener('profile-updated', onProfileUpdated);
      bc.close();
    };
  }, [router]);

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
        const nextBio = backendUser.bio;
        const nextAvatar = backendUser.avatar_url || userAvatar || undefined;
        setUser(prev => prev ? { ...prev, username: nextUsername ?? prev.username, email: nextEmail ?? prev.email, bio: nextBio ?? prev.bio } : prev);
        if (nextAvatar && nextAvatar !== userAvatar) setUserAvatar(nextAvatar);
      } catch (e) {
        // ignore transient errors
      }
    }, 30000); // 30s cadence
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.id, userAvatar]);

  const loadRooms = async (category?: string) => {
    setIsLoading(true);
    try {
      const roomList = await apiClient.getRooms(category || undefined);
      setRooms(roomList);
    } catch (error) {
      toast.error('Failed to load rooms');
      console.error('Error loading rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload rooms when category filter changes
  useEffect(() => {
    loadRooms(selectedCategory);
  }, [selectedCategory]);

  const joinRoom = async (room: Room) => {
    if (!user) {
      toast.error('Please create a user profile first');
      router.push('/');
      return;
    }
    
    try {
      console.log('🚪 Attempting to join room:', { roomId: room.id, userId: user.id, roomName: room.name });
      
      // Navigate directly to room - the room page will handle joining
      router.push(`/room/${room.id}?name=${encodeURIComponent(room.name)}`);
      
      toast.success(`Joining ${room.name}...`);
    } catch (error) {
      console.error('❌ Error navigating to room:', error);
      toast.error('Failed to join room. Please try again.');
    }
  };

  const createRoom = async (roomData: any) => {
    if (!user) {
      toast.error('Please create a user profile first');
      router.push('/');
      return;
    }
    setIsCreating(true);
    try {
      // Compress thumbnail to reduce storage (90% size reduction)
      let thumbnail = roomData.thumbnailData;
      if (thumbnail && thumbnail.startsWith('data:image/')) {
        thumbnail = await StorageManager.compressImage(thumbnail);
      }
      
      // Send thumbnail to backend when creating room
      const room = await apiClient.createRoom(roomData.name, thumbnail);
      
      // Enhance room with additional data
      const enhancedRoom = {
        ...room,
        description: roomData.description,
        thumbnail: room.thumbnail_url || thumbnail, // Prefer backend thumbnail_url
        thumbnailPreset: roomData.thumbnailPreset,
        privacy: roomData.privacy,
        maxMembers: roomData.maxMembers,
        category: roomData.category,
        tags: roomData.tags,
        memberCount: 1,
        onlineCount: 1,
      };
      
      // Store extended data in localStorage with quota handling
      const roomsData = StorageManager.getItem('rooms-data', {}) as Record<string, any>;
      roomsData[room.id] = enhancedRoom;
      const success = StorageManager.setItem('rooms-data', roomsData);
      
      if (!success) {
        toast.error('Storage full! Some old rooms were removed.');
      }
      
      toast.success(`Room "${room.name}" created successfully!`);
      setShowCreateModal(false);
      // Optimistically insert into list and navigate
      setRooms(prev => [enhancedRoom, ...prev]);
      joinRoom(enhancedRoom);
    } catch (error) {
      console.error('❌ Error creating room:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create room');
      throw error;
    } finally {
      setIsCreating(false);
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
    <div className="min-h-screen p-4 bg-gradient-to-br from-black via-slate-950 to-black">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6 bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-200">
                Welcome, {user.username}! 👋
              </h1>
              <p className="text-slate-400 mt-1">
                Choose a room to start chatting and sharing videos
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* User avatar preview */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-cyan-400/50">
                <ResponsiveAvatar
                  avatarUrls={userAvatar ? { thumbnail: userAvatar, small: userAvatar, medium: userAvatar, large: userAvatar } : user.avatar_urls}
                  username={user.username}
                  size="small"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_25px_rgba(0,212,255,0.55)]"
              >
                Create Room
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="glass"
                size="sm"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Rooms List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-200">Available Rooms</h2>
            <Button
              onClick={() => loadRooms(selectedCategory)}
              disabled={isLoading}
              variant="glass"
              size="sm"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => { setSelectedCategory(''); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === ''
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); if (cat !== 'Other') setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar - shows for "Other" category or can be used anytime */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={selectedCategory === 'Other' ? 'Search in Other rooms...' : 'Search rooms by name, description, or tags...'}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-slate-400">Loading rooms...</div>
            </div>
          ) : (() => {
            // Client-side filtering by category and search
            const roomsData = JSON.parse(localStorage.getItem('rooms-data') || '{}');
            
            let filteredRooms = rooms.filter(room => {
              // Get room data - check room object first (for optimistically added rooms), then localStorage
              const data = { ...room, ...roomsData[room.id] };
              
              // Category filter
              if (selectedCategory) {
                if (selectedCategory === 'Other') {
                  // "Other" means rooms with category="Other" or no category at all
                  const hasStandardCategory = CATEGORIES.slice(0, -1).includes(data.category || '');
                  if (hasStandardCategory) return false;
                } else {
                  if (data.category !== selectedCategory) return false;
                }
              }
              
              // Search filter (only when "Other" is selected or for general search)
              if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesName = room.name.toLowerCase().includes(query);
                const matchesDescription = (data.description || '').toLowerCase().includes(query);
                const matchesTags = (data.tags || []).some((tag: string) => tag.toLowerCase().includes(query));
                if (!matchesName && !matchesDescription && !matchesTags) return false;
              }
              
              return true;
            });

            if (filteredRooms.length === 0) {
              return (
                <div className="text-center py-8">
                  <div className="text-slate-400">
                    {searchQuery 
                      ? `No rooms found matching "${searchQuery}"${selectedCategory ? ` in ${selectedCategory}` : ''}`
                      : selectedCategory 
                        ? `No rooms in "${selectedCategory}" category` 
                        : 'No rooms available'}
                  </div>
                  {(searchQuery || selectedCategory) && (
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                      className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRooms.map((room, index) => {
                  // Merge room data - room object first (for optimistically added rooms), then localStorage
                  const roomData = { ...room, ...roomsData[room.id] };
                
                // Prefer backend thumbnail_url over localStorage thumbnail
                const thumbnailUrl = room.thumbnail_url || roomData.thumbnail;
                
                const getThumbnailStyle = () => {
                  if (thumbnailUrl) {
                    return { backgroundImage: `url(${thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
                  } else if (roomData.thumbnailPreset) {
                    const preset = THUMBNAIL_PRESETS.find(p => p.id === roomData.thumbnailPreset);
                    return { background: preset?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                  }
                  return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                };

                const getPrivacyIcon = () => {
                  if (roomData.privacy === 'private') return <Lock size={14} />;
                  if (roomData.privacy === 'password') return <Key size={14} />;
                  return <Globe size={14} />;
                };

                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-lg overflow-hidden hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(0,212,255,0.35)] transition-all duration-200 group"
                  >
                    {/* Thumbnail */}
                    <div 
                      className="w-full h-32 relative"
                      style={getThumbnailStyle()}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                        <div className="flex items-center space-x-1 text-xs text-cyan-300">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(0,212,255,0.85)]"></div>
                          <span>Active</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-white/80">
                          {getPrivacyIcon()}
                          <span className="capitalize">{roomData.privacy || 'public'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white text-lg truncate flex-1">
                          {room.name}
                        </h3>
                      </div>

                      {/* Topic / Description */}
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                        <span className="text-slate-500">Topic:</span> {roomData.topic || roomData.description || 'No topic yet'}
                      </p>

                      {/* Category & Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {roomData.category && (
                          <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs border border-gray-600/50">
                            {roomData.category}
                          </span>
                        )}
                        {(roomData.tags && roomData.tags.length > 0) ? (
                          roomData.tags.slice(0, 4).map((tag: string) => (
                            <span key={tag} className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs border border-gray-600/50">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-1 bg-gray-800/50 text-gray-500 rounded text-xs border border-gray-700/50">No tags</span>
                        )}
                      </div>

                      {/* Member count */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <Users size={14} />
                        {roomData.maxMembers ? (
                          <span>{roomData.memberCount || 0}/{roomData.maxMembers} members</span>
                        ) : (
                          <span>{roomData.memberCount ?? roomData.onlineCount ?? 0} members</span>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => joinRoom(room)}
                        className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_25px_rgba(0,212,255,0.55)] text-black font-bold group-hover:scale-105 transition-transform"
                        variant="primary"
                        size="sm"
                      >
                        Join Room
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
              </div>
            );
          })()}
        </motion.div>

        {/* Features Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="glass-card p-4 text-center bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(0,212,255,0.35)] transition-all">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-medium text-slate-300 mb-1">Real-time Chat</h3>
            <p className="text-sm text-slate-400">
              Instant messaging with all room members
            </p>
          </div>
          
          <div className="glass-card p-4 text-center bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(0,212,255,0.35)] transition-all">
            <div className="text-3xl mb-2">🔴</div>
            <h3 className="font-medium text-slate-300 mb-1">Live Streaming</h3>
            <p className="text-sm text-slate-400">
              Stream live video with RTMP support
            </p>
          </div>
          
          <div className="glass-card p-4 text-center bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(0,212,255,0.35)] transition-all">
            <div className="text-3xl mb-2">🎥</div>
            <h3 className="font-medium text-slate-300 mb-1">Video Sharing</h3>
            <p className="text-sm text-slate-400">
              Upload and share videos instantly
            </p>
          </div>
        </motion.div>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateRoom={createRoom}
      />
    </div>
  );
}