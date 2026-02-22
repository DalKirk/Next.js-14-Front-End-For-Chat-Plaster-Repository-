'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MessageCircle, User } from 'lucide-react';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { apiClient } from '@/lib/api';

interface UserResult {
  id: string;
  username: string;
  avatar_url?: string;
  avatar_urls?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  bio?: string;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserResult) => void;
  currentUserId: string;
}

export default function UserSearchModal({
  isOpen,
  onClose,
  onSelectUser,
  currentUserId,
}: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentUsers, setRecentUsers] = useState<UserResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      loadRecentUsers();
    }
  }, [isOpen]);

  // Load recently messaged users from localStorage
  const loadRecentUsers = () => {
    try {
      const stored = localStorage.getItem(`dm-recent-users-${currentUserId}`);
      if (stored) {
        setRecentUsers(JSON.parse(stored));
      }
    } catch {
      setRecentUsers([]);
    }
  };

  // Search users as they type
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // Try API first
        const response = await apiClient.searchUsers(searchQuery);
        const filtered = (response || []).filter((u: UserResult) => u.id !== currentUserId);
        setResults(filtered);
      } catch (error) {
        console.warn('User search API failed, checking localStorage:', error);
        // Fallback: search in locally stored users
        searchLocalUsers();
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentUserId]);

  const searchLocalUsers = () => {
    // Search in recent users and any cached users
    const query = searchQuery.toLowerCase();
    const localResults = recentUsers.filter(
      u => u.username.toLowerCase().includes(query) && u.id !== currentUserId
    );
    setResults(localResults);
  };

  const handleSelectUser = (user: UserResult) => {
    // Save to recent users
    const updated = [user, ...recentUsers.filter(u => u.id !== user.id)].slice(0, 10);
    localStorage.setItem(`dm-recent-users-${currentUserId}`, JSON.stringify(updated));
    setRecentUsers(updated);
    
    onSelectUser(user);
    onClose();
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">New Message</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search users by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
              </div>
            ) : searchQuery ? (
              results.length > 0 ? (
                <div className="p-2">
                  {results.map((user) => (
                    <motion.button
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/60 transition-colors text-left"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-600/50 flex-shrink-0">
                        <ResponsiveAvatar
                          avatarUrls={user.avatar_urls || (user.avatar_url ? { thumbnail: user.avatar_url, small: user.avatar_url, medium: user.avatar_url, large: user.avatar_url } : undefined)}
                          username={user.username}
                          size="small"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{user.username}</p>
                        {user.bio && (
                          <p className="text-xs text-slate-400 truncate">{user.bio}</p>
                        )}
                      </div>
                      <MessageCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <User size={40} className="mb-2 opacity-30" />
                  <p className="text-sm">No users found</p>
                  <p className="text-xs text-slate-600">Try a different search term</p>
                </div>
              )
            ) : recentUsers.length > 0 ? (
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent</p>
                {recentUsers.map((user) => (
                  <motion.button
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/60 transition-colors text-left"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-600/50 flex-shrink-0">
                      <ResponsiveAvatar
                        avatarUrls={user.avatar_urls || (user.avatar_url ? { thumbnail: user.avatar_url, small: user.avatar_url, medium: user.avatar_url, large: user.avatar_url } : undefined)}
                        username={user.username}
                        size="small"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{user.username}</p>
                    </div>
                    <MessageCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Search size={40} className="mb-2 opacity-30" />
                <p className="text-sm">Search for users</p>
                <p className="text-xs text-slate-600">Type a username to find someone</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
