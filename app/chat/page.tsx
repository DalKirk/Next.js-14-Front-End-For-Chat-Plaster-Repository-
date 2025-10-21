'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { Room, User } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get user from localStorage
    const savedUser = localStorage.getItem('chat-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      router.push('/');
      return;
    }

    loadRooms();
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome, {user.username}! 👋
              </h1>
              <p className="text-white/60 mt-1">
                Choose a room to start chatting and sharing videos
              </p>
            </div>
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
            >
              Back to Home
            </Button>
          </div>
        </motion.div>

        {/* Rooms List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Available Rooms</h2>
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
              <div className="animate-pulse text-white/60">Loading rooms...</div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white/60 mb-4">No rooms available</div>
              <Button
                onClick={() => router.push('/')}
                variant="primary"
              >
                Create a Room
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-white truncate">
                      {room.name}
                    </h3>
                    <div className="flex items-center space-x-1 text-xs text-white/60">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Active</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-white/60 mb-4">
                    Created {new Date(room.created_at).toLocaleDateString()}
                  </p>
                  
                  <Button
                    onClick={() => joinRoom(room)}
                    className="w-full"
                    variant="primary"
                    size="sm"
                  >
                    Join Room
                  </Button>
                </motion.div>
              ))}
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
          <div className="glass-card p-4 text-center">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-medium text-white mb-1">Real-time Chat</h3>
            <p className="text-sm text-white/60">
              Instant messaging with all room members
            </p>
          </div>
          
          <div className="glass-card p-4 text-center">
            <div className="text-3xl mb-2">🔴</div>
            <h3 className="font-medium text-white mb-1">Live Streaming</h3>
            <p className="text-sm text-white/60">
              Stream live video with RTMP support
            </p>
          </div>
          
          <div className="glass-card p-4 text-center">
            <div className="text-3xl mb-2">🎥</div>
            <h3 className="font-medium text-white mb-1">Video Sharing</h3>
            <p className="text-sm text-white/60">
              Upload and share videos instantly
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}