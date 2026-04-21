'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { Room, User } from '@/lib/types';
import { StorageManager } from '@/lib/storage-manager';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import toast from 'react-hot-toast';
import CreateRoomModal, { THUMBNAIL_PRESETS } from '@/components/room/CreateRoomModal';
import PasswordModal from '@/components/room/PasswordModal';
import { updateAvatarEverywhere } from '@/lib/message-utils';
import { Lock, Users, Globe, Key, Search, MoreVertical, X } from 'lucide-react';

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
  const [passwordModalRoom, setPasswordModalRoom] = useState<Room | null>(null);
  const [passwordError, setPasswordError] = useState<string>('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [descriptionModal, setDescriptionModal] = useState<{
    isOpen: boolean;
    room: Room | null;
    roomData: any;
  }>({ isOpen: false, room: null, roomData: null });
  const [shuffleSeed] = useState(() => Math.random()); // Random seed for stable shuffle
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

  const joinRoom = async (room: Room, skipPasswordCheck = false) => {
    if (!user) {
      toast.error('Please create a user profile first');
      router.push('/');
      return;
    }
    
    // Check if room is password-protected (skip if creator is joining their own room)
    if (!skipPasswordCheck) {
      // Get local room data for password info (until backend fully supports it)
      const roomsData = StorageManager.getItem('rooms-data', {}) as Record<string, any>;
      const localRoomData = roomsData[room.id];
      const roomPrivacy = localRoomData?.privacy || room.privacy;
      
      if (roomPrivacy === 'password') {
        // Show password modal
        setPasswordError('');
        setPasswordModalRoom(room);
        return;
      }
      
      // Check if room is private (can only be accessed by creator or invited users)
      if (roomPrivacy === 'private') {
        // For now, allow access - backend should handle proper authorization
        console.log('🔒 Joining private room:', room.name);
      }
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

  const handlePasswordSubmit = async (password: string) => {
    if (!passwordModalRoom || !user) return;
    
    setIsVerifyingPassword(true);
    setPasswordError('');
    
    try {
      // First try backend verification
      const result = await apiClient.verifyRoomPassword(passwordModalRoom.id, password);
      
      if (!result.success) {
        // Fallback: Check local storage for password (for testing when backend doesn't have the endpoint)
        const roomsData = StorageManager.getItem('rooms-data', {}) as Record<string, any>;
        const localRoomData = roomsData[passwordModalRoom.id];
        
        if (localRoomData?.password && localRoomData.password === password) {
          // Password matches locally
          console.log('✅ Password verified locally');
        } else {
          setPasswordError(result.error || 'Incorrect password');
          setIsVerifyingPassword(false);
          return;
        }
      }
      
      // Password verified - proceed to join
      console.log('🚪 Password verified, joining room:', passwordModalRoom.name);
      
      // Store verification in sessionStorage so room page knows we're verified
      sessionStorage.setItem(`room-password-verified-${passwordModalRoom.id}`, 'true');
      
      setPasswordModalRoom(null);
      
      router.push(`/room/${passwordModalRoom.id}?name=${encodeURIComponent(passwordModalRoom.name)}`);
      toast.success(`Joining ${passwordModalRoom.name}...`);
    } catch (error) {
      console.error('❌ Error verifying password:', error);
      setPasswordError('Failed to verify password');
    } finally {
      setIsVerifyingPassword(false);
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
      
      // Build host info to send to backend
      const hostInfo = {
        id: user.id,
        username: user.username,
        avatar_url: (user as any).avatar,
        avatar_urls: user.avatar_urls,
      };
      
      // Send thumbnail and host info to backend when creating room
      const room = await apiClient.createRoom(roomData.name, thumbnail, {
        category: roomData.category,
        description: roomData.description,
        tags: roomData.tags,
        privacy: roomData.privacy,
        maxMembers: roomData.maxMembers,
        password: roomData.password, // Include password for password-protected rooms
        host: hostInfo, // Include host info so other devices can see it
      });
      
      // Enhance room with additional data (use backend host if returned, else use local)
      const enhancedRoom: Room = {
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
        createdBy: user.id,
        host: room.host || hostInfo, // Use backend host if available
      };
      
      // Store room data in localStorage with quota handling
      // Include password for local fallback verification (until backend supports it)
      const roomDataToStore: Record<string, unknown> = { ...enhancedRoom };
      if (roomData.privacy === 'password' && roomData.password) {
        roomDataToStore.password = roomData.password;
      }
      
      // Store extended data in localStorage with quota handling
      const roomsData = StorageManager.getItem('rooms-data', {}) as Record<string, any>;
      roomsData[room.id] = roomDataToStore;
      const success = StorageManager.setItem('rooms-data', roomsData);
      
      if (!success) {
        toast.error('Storage full! Some old rooms were removed.');
      }
      
      toast.success(`Room "${room.name}" created successfully!`);
      setShowCreateModal(false);
      // Optimistically insert into list and navigate
      setRooms(prev => [enhancedRoom, ...prev]);
      
      // Mark this room as password-verified in sessionStorage so room page doesn't ask again
      // (Creator automatically bypasses password for their own room)
      if (roomData.privacy === 'password') {
        sessionStorage.setItem(`room-password-verified-${room.id}`, 'true');
      }
      
      // Skip password check - creator doesn't need to enter password for their own room
      joinRoom(enhancedRoom, true);
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
              // Get room data - merge localStorage data with room object
              // localStorage takes priority for category since backend may not have it yet
              const localData = roomsData[room.id] || {};
              const category = localData.category || room.category || '';
              const description = localData.description || room.description || '';
              const tags = localData.tags || room.tags || [];
              
              // Category filter
              if (selectedCategory) {
                if (selectedCategory === 'Other') {
                  // "Other" means rooms with category="Other" or no category at all
                  const hasStandardCategory = CATEGORIES.slice(0, -1).includes(category);
                  if (hasStandardCategory) return false;
                } else {
                  if (category !== selectedCategory) return false;
                }
              }
              
              // Search filter (only when "Other" is selected or for general search)
              if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesName = room.name.toLowerCase().includes(query);
                const matchesDescription = description.toLowerCase().includes(query);
                const matchesTags = tags.some((tag: string) => tag.toLowerCase().includes(query));
                if (!matchesName && !matchesDescription && !matchesTags) return false;
              }
              
              return true;
            });

            // Shuffle rooms using seeded random for stable order during session
            const seededRandom = (seed: number, index: number) => {
              const x = Math.sin(seed * 9999 + index) * 10000;
              return x - Math.floor(x);
            };
            
            const randomizedRooms = [...filteredRooms].sort((a, b) => {
              const aHash = seededRandom(shuffleSeed, filteredRooms.indexOf(a));
              const bHash = seededRandom(shuffleSeed, filteredRooms.indexOf(b));
              return aHash - bHash;
            });

            if (randomizedRooms.length === 0) {
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {randomizedRooms.map((room, index) => {
                  // Merge room data - localStorage takes priority for extended fields
                  const localData = roomsData[room.id] || {};
                  const roomData = {
                    ...room,
                    ...localData,
                    // Explicitly merge these to handle null/undefined from backend
                    category: localData.category || room.category || '',
                    description: localData.description || room.description || '',
                    tags: localData.tags || room.tags || [],
                    privacy: localData.privacy || room.privacy || 'public',
                    maxMembers: localData.maxMembers || room.maxMembers,
                    host: localData.host || room.host,
                  };
                
                // Prefer backend thumbnail_url over localStorage thumbnail
                const thumbnailUrl = room.thumbnail_url || roomData.thumbnail;
                
                const getThumbnailStyle = () => {
                  if (thumbnailUrl) {
                    return { 
                      backgroundImage: `url(${thumbnailUrl})`, 
                      backgroundSize: 'cover',       // Fill the thumbnail area
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    };
                  } else if (roomData.thumbnailPreset) {
                    const preset = THUMBNAIL_PRESETS.find(p => p.id === roomData.thumbnailPreset);
                    return { background: preset?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                  }
                  return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
                };

                const getPrivacyIcon = () => {
                  if (roomData.privacy === 'private') return <Lock size={10} />;
                  if (roomData.privacy === 'password') return <Key size={10} />;
                  return null;
                };

                const viewerCount = roomData.memberCount ?? roomData.onlineCount ?? 0;

                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => joinRoom(room)}
                    className="cursor-pointer group"
                  >
                    {/* Host Info - Above Thumbnail */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border-2 border-slate-600 group-hover:border-cyan-400/70 transition-colors flex-shrink-0">
                        {roomData.host ? (
                          <ResponsiveAvatar
                            avatarUrls={roomData.host.avatar_urls || (roomData.host.avatar_url ? { thumbnail: roomData.host.avatar_url, small: roomData.host.avatar_url, medium: roomData.host.avatar_url, large: roomData.host.avatar_url } : undefined)}
                            username={roomData.host.username}
                            size="thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            {room.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm text-slate-300 font-medium truncate flex-1 group-hover:text-cyan-400 transition-colors">
                        {roomData.host?.username || 'Unknown Host'}
                      </span>
                      {/* Viewer count pill */}
                      <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-red-500/90 rounded text-[10px] sm:text-xs text-white font-medium flex-shrink-0">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        <span>{viewerCount}</span>
                      </div>
                    </div>
                    
                    {/* Thumbnail - Clickable Card */}
                    <div 
                      className="w-full aspect-[5/7] relative rounded-lg overflow-hidden border border-slate-700/50 group-hover:border-cyan-400/60 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all duration-200"
                      style={getThumbnailStyle()}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      
                      {/* Privacy icon - top left */}
                      {roomData.privacy && roomData.privacy !== 'public' && (
                        <div className="absolute top-2 left-2 p-1 bg-black/60 rounded text-white/80">
                          {getPrivacyIcon()}
                        </div>
                      )}
                      
                      {/* Kebab menu - top right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDescriptionModal({ isOpen: true, room, roomData });
                        }}
                        className="absolute top-1 right-1 p-1 text-white/70 hover:text-white transition-colors"
                        title="View description"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {/* Room name overlay at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                        <h3 className="font-semibold text-white text-xs sm:text-sm truncate drop-shadow-lg">
                          {room.name}
                        </h3>
                        {roomData.category && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-black/50 text-slate-300 rounded text-[10px] sm:text-xs">
                            {roomData.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              </div>
            );
          })()}
        </motion.div>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateRoom={createRoom}
      />

      {/* Password Entry Modal */}
      <PasswordModal
        isOpen={!!passwordModalRoom}
        roomName={passwordModalRoom?.name || ''}
        onClose={() => {
          setPasswordModalRoom(null);
          setPasswordError('');
        }}
        onSubmit={handlePasswordSubmit}
        isLoading={isVerifyingPassword}
        error={passwordError}
      />

      {/* Room Description Modal */}
      {descriptionModal.isOpen && descriptionModal.room && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDescriptionModal({ isOpen: false, room: null, roomData: null })}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white truncate pr-4">
                {descriptionModal.room.name}
              </h3>
              <button
                onClick={() => setDescriptionModal({ isOpen: false, room: null, roomData: null })}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Host Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-600 flex-shrink-0">
                  {descriptionModal.roomData?.host ? (
                    <ResponsiveAvatar
                      avatarUrls={descriptionModal.roomData.host.avatar_urls || (descriptionModal.roomData.host.avatar_url ? { thumbnail: descriptionModal.roomData.host.avatar_url, small: descriptionModal.roomData.host.avatar_url, medium: descriptionModal.roomData.host.avatar_url, large: descriptionModal.roomData.host.avatar_url } : undefined)}
                      username={descriptionModal.roomData.host.username}
                      size="small"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {descriptionModal.room.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-400">Hosted by</p>
                  <p className="text-white font-medium">{descriptionModal.roomData?.host?.username || 'Unknown Host'}</p>
                </div>
              </div>

              {/* Category & Privacy */}
              <div className="flex flex-wrap gap-2 mb-4">
                {descriptionModal.roomData?.category && (
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm">
                    {descriptionModal.roomData.category}
                  </span>
                )}
                {descriptionModal.roomData?.privacy && (
                  <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-1">
                    {descriptionModal.roomData.privacy === 'private' && <Lock size={12} />}
                    {descriptionModal.roomData.privacy === 'password' && <Key size={12} />}
                    {descriptionModal.roomData.privacy === 'public' && <Globe size={12} />}
                    {descriptionModal.roomData.privacy.charAt(0).toUpperCase() + descriptionModal.roomData.privacy.slice(1)}
                  </span>
                )}
              </div>
              
              {/* Description */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Description</h4>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {descriptionModal.roomData?.description || 'No description provided.'}
                </p>
              </div>
              
              {/* Tags */}
              {descriptionModal.roomData?.tags && descriptionModal.roomData.tags.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {descriptionModal.roomData.tags.map((tag: string, idx: number) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Stats */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Users size={16} />
                  <span>{descriptionModal.roomData?.memberCount ?? descriptionModal.roomData?.onlineCount ?? 0} viewers</span>
                </div>
                {descriptionModal.roomData?.maxMembers && (
                  <div className="text-slate-400 text-sm">
                    Max: {descriptionModal.roomData.maxMembers}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700">
              <Button
                onClick={() => {
                  setDescriptionModal({ isOpen: false, room: null, roomData: null });
                  if (descriptionModal.room) {
                    joinRoom(descriptionModal.room);
                  }
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                Join Room
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}