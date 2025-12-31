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
import { Lock, Users, Globe, Key } from 'lucide-react';

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
    
    return () => clearInterval(cleanupInterval);
  }, [router]);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const roomList = await apiClient.getRooms();
      setRooms(roomList);
    } catch (error) {
      toast.error('Failed to load rooms');
      console.error('Error loading rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-green-400/50">
                <ResponsiveAvatar
                  avatarUrls={user.avatar_urls || (userAvatar ? { thumbnail: userAvatar, small: userAvatar, medium: userAvatar, large: userAvatar } : undefined)}
                  username={user.username}
                  size="small"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shadow-[0_0_25px_rgba(34,197,94,0.6)]"
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
              onClick={loadRooms}
              disabled={isLoading}
              variant="glass"
              size="sm"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-slate-400">Loading rooms...</div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400">No rooms available</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room, index) => {
                // Load extended room data from localStorage
                const roomsData = JSON.parse(localStorage.getItem('rooms-data') || '{}');
                const roomData = roomsData[room.id] || room;
                
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
                    className="bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-lg overflow-hidden hover:border-green-500/50 hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all duration-200 group"
                  >
                    {/* Thumbnail */}
                    <div 
                      className="w-full h-32 relative"
                      style={getThumbnailStyle()}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                        <div className="flex items-center space-x-1 text-xs text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.9)]"></div>
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

                      {roomData.description && (
                        <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                          {roomData.description}
                        </p>
                      )}

                      {/* Category & Tags */}
                      {(roomData.category || roomData.tags?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {roomData.category && (
                            <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs border border-gray-600/50">
                              {roomData.category}
                            </span>
                          )}
                          {roomData.tags?.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs border border-gray-600/50">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Member count */}
                      {roomData.maxMembers && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                          <Users size={14} />
                          <span>{roomData.memberCount || 0}/{roomData.maxMembers} members</span>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => joinRoom(room)}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shadow-[0_0_25px_rgba(34,197,94,0.6)] text-black font-bold group-hover:scale-105 transition-transform"
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
          )}
        </motion.div>

        {/* Features Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="glass-card p-4 text-center bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 hover:border-green-500/50 hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-medium text-slate-300 mb-1">Real-time Chat</h3>
            <p className="text-sm text-slate-400">
              Instant messaging with all room members
            </p>
          </div>
          
          <div className="glass-card p-4 text-center bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 hover:border-green-500/50 hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all">
            <div className="text-3xl mb-2">🔴</div>
            <h3 className="font-medium text-slate-300 mb-1">Live Streaming</h3>
            <p className="text-sm text-slate-400">
              Stream live video with RTMP support
            </p>
          </div>
          
          <div className="glass-card p-4 text-center bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 hover:border-green-500/50 hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all">
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