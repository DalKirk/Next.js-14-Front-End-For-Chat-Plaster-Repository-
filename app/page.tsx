'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ServerStatus } from '@/components/ui/server-status';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
}

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('chat-user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('chat-user');
      }
    }
  }, []);

  const handleCreateUser = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsLoading(true);
    try {
      const user = await apiClient.createUser(username.trim());
      localStorage.setItem('chat-user', JSON.stringify(user));
      setCurrentUser(user);
      
      if (user.id.startsWith('mock-')) {
        toast.success(`Welcome, ${user.username}! Let's set up your profile.`);
      } else {
        toast.success(`Welcome, ${user.username}! Let's set up your profile.`);
      }
      
      // Redirect to profile setup instead of chat
      router.push('/profile');
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Server Status Indicator */}
      <ServerStatus />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg sm:max-w-xl lg:max-w-2xl space-y-8"
      >
        {/* Navigation */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-end mb-4"
          >
            <Button
              onClick={() => router.push('/profile')}
              variant="glass"
              className="flex items-center gap-2"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              Profile
            </Button>
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="bitcount-prop-double-ink font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            style={{ fontSize: '60px', letterSpacing: '0.05em' }}
          >
            CHATTER BOX
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-4"
          >
            <p className="text-xl text-white/90 font-medium">
              Real-time collaboration for developers
            </p>
            <p className="text-white/70 max-w-lg mx-auto leading-relaxed">
              Share code with syntax highlighting, chat instantly, and connect face-to-face. 
              Everything you need for seamless team collaboration.
            </p>
            
            {/* Feature highlights */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-sm">
              <span className="glass-panel px-2 sm:px-3 py-1 rounded-full text-white/80 flex items-center gap-1">
                <span>✨</span> <span className="hidden sm:inline">Syntax Highlighting</span><span className="sm:hidden">Syntax</span>
              </span>
              <span className="glass-panel px-2 sm:px-3 py-1 rounded-full text-white/80 flex items-center gap-1">
                <span>🎥</span> <span className="hidden sm:inline">HD Video Chat</span><span className="sm:hidden">Video</span>
              </span>
              <span className="glass-panel px-2 sm:px-3 py-1 rounded-full text-white/80 flex items-center gap-1">
                <span>📁</span> <span className="hidden sm:inline">File Sharing</span><span className="sm:hidden">Files</span>
              </span>
              <span className="glass-panel px-2 sm:px-3 py-1 rounded-full text-white/80 flex items-center gap-1">
                <span>⚡</span> <span className="hidden sm:inline">Real-time Sync</span><span className="sm:hidden">Sync</span>
              </span>
            </div>
          </motion.div>
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
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleCreateUser}
                disabled={isLoading || !username.trim()}
                className="w-full relative overflow-hidden group"
                variant="primary"
              >
                <span className="relative z-10">
                  {isLoading ? 'Creating...' : 'Create Profile'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
            </motion.div>
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
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleCreateRoom}
                disabled={isLoading || !roomName.trim()}
                className="w-full relative overflow-hidden group"
                variant="secondary"
              >
                <span className="relative z-10">
                  {isLoading ? 'Creating...' : 'Create Room'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
            </motion.div>
          </div>

          {/* Quick Access */}
          <div className="border-t border-white/10 pt-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => router.push('/chat')}
                className="w-full relative overflow-hidden group"
                variant="glass"
              >
                <span className="relative z-10">Browse Existing Rooms</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Features Showcase */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="space-y-6"
        >
          <h3 className="text-lg font-semibold text-center text-white/90">
            Everything you need for team collaboration
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 text-center space-y-2 hover:bg-white/10 transition-all duration-300">
              <div className="text-2xl">💻</div>
              <div className="text-sm font-medium text-white">Code Editor</div>
              <div className="text-xs text-white/60">150+ languages</div>
            </div>
            
            <div className="glass-card p-4 text-center space-y-2 hover:bg-white/10 transition-all duration-300">
              <div className="text-2xl">🎥</div>
              <div className="text-sm font-medium text-white">HD Video</div>
              <div className="text-xs text-white/60">Screen sharing</div>
            </div>
            
            <div className="glass-card p-4 text-center space-y-2 hover:bg-white/10 transition-all duration-300">
              <div className="text-2xl">⚡</div>
              <div className="text-sm font-medium text-white">Real-time</div>
              <div className="text-xs text-white/60">Instant sync</div>
            </div>
            
            <div className="glass-card p-4 text-center space-y-2 hover:bg-white/10 transition-all duration-300">
              <div className="text-2xl">🔒</div>
              <div className="text-sm font-medium text-white">Secure</div>
              <div className="text-xs text-white/60">Private rooms</div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex justify-center space-x-8 text-center text-sm">
            <div>
              <div className="font-semibold text-white">150+</div>
              <div className="text-white/60">Languages</div>
            </div>
            <div>
              <div className="font-semibold text-white">&lt;100ms</div>
              <div className="text-white/60">Latency</div>
            </div>
            <div>
              <div className="font-semibold text-white">24/7</div>
              <div className="text-white/60">Uptime</div>
            </div>
          </div>
        </motion.div>

        {/* Interactive Demo Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="glass-card p-4 space-y-3"
        >
          <div className="text-center">
            <div className="text-sm font-medium text-white/90 mb-2">Live Preview</div>
            <div className="bg-black/20 rounded-lg p-3 text-left space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-white/50 ml-2">CHATTER BOX - Room #demo</span>
              </div>
              <div className="text-xs text-white/70 py-2">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-blue-400">Alex:</span>
                  <span>Check out this function:</span>
                </div>
                <div className="bg-black/30 rounded p-2 font-mono text-xs">
                  <span className="text-purple-400">const</span> <span className="text-blue-300">fibonacci</span> <span className="text-white">=</span> <span className="text-yellow-300">(n)</span> <span className="text-white">=&gt; {`{`}</span>
                  <br />
                  <span className="text-white ml-2">return n &lt; 2 ? n : fibonacci(n-1) + fibonacci(n-2);</span>
                  <br />
                  <span className="text-white">{`}`}</span>
                </div>
                <div className="flex items-start gap-2 mt-1">
                  <span className="text-green-400">Sarah:</span>
                  <span>Nice! Syntax highlighting works perfectly ✨</span>
                </div>
              </div>
            </div>
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