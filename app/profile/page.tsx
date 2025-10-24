'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  username: string;
  bio: string;
  avatar: string;
  joinedDate: string;
  totalRooms: number;
  totalMessages: number;
  favoriteLanguage: string;
  theme: 'purple' | 'blue' | 'green';
  notifications: boolean;
}

interface RecentRoom {
  id: string;
  name: string;
  lastVisited: string;
  messageCount: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    // Load profile from localStorage or API
    const storedUser = localStorage.getItem('chat-user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    
    // Check if this is first-time setup
    const existingProfile = localStorage.getItem('userProfile');
    const isNewUser = !existingProfile;
    setIsFirstTime(isNewUser);

    // Mock profile data - in real app, fetch from API
    const mockProfile: UserProfile = {
      id: userData.id,
      username: userData.username,
      bio: isNewUser ? '' : 'Developer passionate about real-time collaboration and clean code.',
      avatar: '', // Will implement avatar upload
      joinedDate: new Date().toISOString().split('T')[0],
      totalRooms: 0,
      totalMessages: 0,
      favoriteLanguage: 'JavaScript',
      theme: 'purple',
      notifications: true
    };

    // Load existing profile or use defaults
    if (existingProfile) {
      const savedProfile = JSON.parse(existingProfile);
      setProfile({ ...mockProfile, ...savedProfile });
      setEditedProfile({ ...mockProfile, ...savedProfile });
    } else {
      setProfile(mockProfile);
      setEditedProfile(mockProfile);
      setIsEditing(true); // Start in edit mode for new users
    }

    const mockRecentRooms: RecentRoom[] = isNewUser ? [] : [
      { id: '1', name: 'Frontend Team', lastVisited: '2024-10-19', messageCount: 45 },
      { id: '2', name: 'Code Review', lastVisited: '2024-10-18', messageCount: 23 },
      { id: '3', name: 'Project Planning', lastVisited: '2024-10-17', messageCount: 31 }
    ];

    setRecentRooms(mockRecentRooms);
  }, [router]);

  const handleSaveProfile = () => {
    if (profile && editedProfile) {
      // Validate required fields for first-time setup
      if (isFirstTime && (!editedProfile.bio || editedProfile.bio.trim().length < 10)) {
        toast.error('Please add a bio with at least 10 characters');
        return;
      }

      const updatedProfile = { ...profile, ...editedProfile };
      setProfile(updatedProfile);
      // In real app, save to API
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      if (isFirstTime) {
        toast.success('Profile setup complete! Welcome to CHATTER BOX!');
        setIsFirstTime(false);
        // Redirect to chat after first-time setup
        setTimeout(() => {
          router.push('/chat');
        }, 1500);
      } else {
        toast.success('Profile updated successfully!');
      }
      
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-6 text-center">
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="glass" className="px-4 py-2">
                ← Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white bitcount-prop-double-ink">
                {isFirstTime ? 'Welcome to CHATTER BOX!' : 'User Profile'}
              </h1>
              {isFirstTime && (
                <p className="text-white/70 mt-1">Let&apos;s set up your profile to get started</p>
              )}
            </div>
          </div>
          
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="primary">
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} variant="primary">
                {isFirstTime ? 'Complete Setup' : 'Save Changes'}
              </Button>
              {!isFirstTime && (
                <Button onClick={handleCancelEdit} variant="glass">
                  Cancel
                </Button>
              )}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="lg:col-span-1"
          >
            <div className="glass-card p-6 space-y-6">
              {/* Avatar Section */}
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      label="Username"
                      value={editedProfile.username || ''}
                      onChange={(e) => setEditedProfile({...editedProfile, username: e.target.value})}
                      maxLength={20}
                    />
                    <Textarea
                      label={`Bio ${isFirstTime ? '(Required - tell us about yourself!)' : ''}`}
                      value={editedProfile.bio || ''}
                      onChange={(e) => setEditedProfile({...editedProfile, bio: e.target.value})}
                      maxLength={150}
                      rows={4}
                      placeholder={isFirstTime ? 
                        "Tell us about yourself! What do you love about coding? What languages do you use? What are you working on?" :
                        "Update your bio..."
                      }
                    />
                    {isFirstTime && (
                      <p className="text-xs text-white/60">
                        💡 A good bio helps others connect with you in chat rooms!
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">{profile.username}</h2>
                    <p className="text-white/70 text-sm">{profile.bio || 'No bio added yet.'}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Joined</span>
                  <span className="text-white">{new Date(profile.joinedDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Total Rooms</span>
                  <span className="text-white">{profile.totalRooms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Messages Sent</span>
                  <span className="text-white">{profile.totalMessages}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Favorite Language</span>
                  <span className="text-white">{profile.favoriteLanguage}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Settings */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-xl font-semibold text-white">Settings</h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Theme Color
                    </label>
                    <div className="flex gap-3">
                      {(['purple', 'blue', 'green'] as const).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setEditedProfile({...editedProfile, theme})}
                          className={`w-8 h-8 rounded-full border-2 ${
                            editedProfile.theme === theme ? 'border-white' : 'border-white/30'
                          } ${
                            theme === 'purple' ? 'bg-purple-500' :
                            theme === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Enable Notifications</span>
                    <button
                      onClick={() => setEditedProfile({...editedProfile, notifications: !editedProfile.notifications})}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        editedProfile.notifications ? 'bg-blue-500' : 'bg-white/20'
                      } relative`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                        editedProfile.notifications ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-white/70">Theme</span>
                    <span className="text-white capitalize">{profile.theme}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Notifications</span>
                    <span className="text-white">{profile.notifications ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Rooms */}
            {!isFirstTime && (
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-xl font-semibold text-white">Recent Rooms</h3>
                {recentRooms.length > 0 ? (
                  <div className="space-y-3">
                    {recentRooms.map((room) => (
                      <div key={room.id} className="glass-panel p-4 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-white">{room.name}</h4>
                            <p className="text-sm text-white/60">
                              Last visited: {new Date(room.lastVisited).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white/80">{room.messageCount} messages</p>
                            <Button 
                              variant="glass" 
                              className="mt-2 text-xs px-3 py-1"
                              onClick={() => router.push(`/room/${room.id}`)}
                            >
                              Join Room
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/60 mb-4">No recent rooms yet</p>
                    <Button 
                      variant="primary" 
                      onClick={() => router.push('/chat')}
                    >
                      Browse Available Rooms
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* First-time Welcome Message (trimmed) */}
            {isFirstTime && (
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-xl font-semibold text-white">🎉 Welcome to CHATTER BOX!</h3>
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-200 text-sm">
                      💡 Complete your profile setup above to start chatting!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  variant="primary" 
                  onClick={() => router.push('/chat')}
                  className="w-full"
                >
                  Browse All Rooms
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Create New Room
                </Button>
              </div>
              
              {/* Logout Section */}
              <div className="border-t border-white/10 pt-4">
                <Button 
                  variant="glass" 
                  onClick={() => {
                    localStorage.removeItem('chat-user');
                    localStorage.removeItem('userProfile');
                    router.push('/');
                  }}
                  className="w-full text-red-400 hover:text-red-300"
                >
                  🚪 Logout
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}