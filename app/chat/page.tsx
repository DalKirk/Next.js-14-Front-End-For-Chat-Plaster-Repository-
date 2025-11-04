'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { Room, User } from '@/lib/types';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
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

  const createRoom = async () => {
    if (!user) {
      toast.error('Please create a user profile first');
      router.push('/');
      return;
    }
    if (!newRoomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    setIsCreating(true);
    try {
      const room = await apiClient.createRoom(newRoomName.trim());
      toast.success(`Room "${room.name}" created`);
      setShowCreateModal(false);
      setNewRoomName('');
      // Optimistically insert into list and navigate
      setRooms(prev => [room, ...prev]);
      joinRoom(room);
    } catch (error) {
      console.error('❌ Error creating room:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create room');
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
            <div className="flex items-center gap-2 flex-wrap">
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
              <div className="text-slate-400 mb-4">No rooms available</div>
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
                  className="bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4 hover:bg-green-500/10 hover:border-green-500/50 hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-slate-300 truncate">
                      {room.name}
                    </h3>
                    <div className="flex items-center space-x-1 text-xs text-green-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.9)]"></div>
                      <span>Active</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-4">
                    Created {new Date(room.created_at).toLocaleDateString()}
                  </p>
                  
                  <Button
                    onClick={() => joinRoom(room)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shadow-[0_0_25px_rgba(34,197,94,0.6)] text-black font-bold"
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
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setNewRoomName(''); }}
        title="Create a New Room"
      >
        <div className="space-y-4">
          <Input
            label="Room Name"
            placeholder="Enter a room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => { setShowCreateModal(false); setNewRoomName(''); }}
              variant="glass"
              className="flex-1"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={createRoom}
              variant="primary"
              className="flex-1"
              disabled={isCreating || !newRoomName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}