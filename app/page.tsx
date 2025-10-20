'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ServerStatus } from '@/components/ui/server-status';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateUser = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsLoading(true);
    try {
      const user = await apiClient.createUser(username.trim());
      localStorage.setItem('chat-user', JSON.stringify(user));
      
      if (user.id.startsWith('mock-')) {
        toast.success(`Welcome, ${user.username}! (Demo mode - backend unavailable)`);
      } else {
        toast.success(`Welcome, ${user.username}!`);
      }
      
      // Redirect to chat page
      router.push('/chat');
    } catch (error) {
      console.error('❌ User creation error:', error);
      let errorMessage = 'Failed to create user';
      
      if (error instanceof Error) {
        // Use the enhanced error messages from the API client
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 6000, // Show longer for server errors
        style: {
          maxWidth: '500px',
        },
      });
      console.error('Error creating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.createRoom(roomName.trim());
      toast.success(`Room "${roomName}" created!`);
      setRoomName('');
    } catch (error) {
      let errorMessage = 'Failed to create room';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, {
        duration: 6000,
        style: {
          maxWidth: '500px',
        },
      });
      console.error('Error creating room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Server Status Indicator */}
      <ServerStatus />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="text-left">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="bitcount-prop-double-ink font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap"
            style={{ fontSize: '60px', letterSpacing: '0.05em' }}
          >
            CHATTER BOX v2.0
          </motion.h1>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="glass-card p-6 space-y-6"
        >
          {/* User Creation */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Get Started</h2>
            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
              maxLength={20}
            />
            <Button
              onClick={handleCreateUser}
              disabled={isLoading || !username.trim()}
              className="w-full"
              variant="primary"
            >
              {isLoading ? 'Creating...' : 'Create Profile'}
            </Button>
          </div>

          {/* Room Creation */}
          <div className="border-t border-white/10 pt-6 space-y-4">
            <h3 className="text-lg font-medium text-white">Create New Room</h3>
            <Input
              label="Room Name"
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
              maxLength={30}
            />
            <Button
              onClick={handleCreateRoom}
              disabled={isLoading || !roomName.trim()}
              className="w-full"
              variant="secondary"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>

          {/* Quick Access */}
          <div className="border-t border-white/10 pt-6">
            <Button
              onClick={() => router.push('/chat')}
              className="w-full"
              variant="glass"
            >
              Browse Existing Rooms
            </Button>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-3 gap-4 text-center"
        >
          <div className="glass-card p-4">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm text-white/80">Real-time Chat</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl mb-2">🔴</div>
            <div className="text-sm text-white/80">Live Streaming</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl mb-2">🎥</div>
            <div className="text-sm text-white/80">Video Upload</div>
          </div>
        </motion.div>

        {/* Help Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-center"
        >
          <Link href="/troubleshooting">
            <span className="text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer">
              🔧 Having connection issues? Click here for help
            </span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}