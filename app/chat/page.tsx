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
    if (!user) return;
    
    try {
      await apiClient.joinRoom(room.id, user.id);
      // Navigate to room (we'll create this route later)
      router.push(`/room/${room.id}?name=${encodeURIComponent(room.name)}`);
    } catch (error) {
      toast.error('Failed to join room');
      console.error('Error joining room:', error);
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
              <h1 className="text-2xl font-bold text-text-primary">
                Welcome, {user.username}! 👋
              </h1>
              <p className="text-text-muted mt-1">
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
            <h2 className="text-xl font-semibold text-text-primary">Available Rooms</h2>
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
              <div className="animate-pulse text-text-muted">Loading rooms...</div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-text-muted mb-4">No rooms available</div>
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
                  className="bg-surface/40 backdrop-blur-sm border border-primary-400/20 rounded-lg p-4 hover:bg-surface-hover hover:border-primary-400/35 transition-all duration-200 shadow-lg shadow-primary-900/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-text-primary truncate">
                      {room.name}
                    </h3>
                    <div className="flex items-center space-x-1 text-xs text-text-muted">
                      <div className="w-2 h-2 bg-status-success rounded-full shadow-sm shadow-status-success/50"></div>
                      <span>Active</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-text-muted mb-4">
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
            <h3 className="font-medium text-text-primary mb-1">Real-time Chat</h3>
            <p className="text-sm text-text-secondary">
              Instant messaging with all room members
            </p>
          </div>
          
          <div className="glass-card p-4 text-center">
            <div className="text-3xl mb-2">🔴</div>
            <h3 className="font-medium text-text-primary mb-1">Live Streaming</h3>
            <p className="text-sm text-text-secondary">
              Stream live video with RTMP support
            </p>
          </div>
          
          <div className="glass-card p-4 text-center">
            <div className="text-3xl mb-2">🎥</div>
            <h3 className="font-medium text-text-primary mb-1">Video Sharing</h3>
            <p className="text-sm text-text-secondary">
              Upload and share videos instantly
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}