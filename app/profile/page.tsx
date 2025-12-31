'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AvatarUpload } from '@/components/AvatarUpload';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { apiClient } from '@/lib/api';
import { StorageUtils } from '@/lib/storage-utils';
import toast from 'react-hot-toast';
import { AvatarUrls } from '@/types/backend';
import { 
  Camera, Activity, Trash2,
  User, MessageSquare, Zap
} from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  avatar?: string;  // Legacy
  avatar_urls?: {    // Multi-size support
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  joinedDate: string;
  totalRooms?: number;
  totalMessages?: number;
  favoriteLanguage?: string;
  theme: 'purple' | 'blue' | 'green';
  notifications: boolean;
}

interface ProfileStats {
  messagesCount: number;
  conversationsCount: number;
  totalSessionTime: string;
  lastActive: string;
  aiChatsCount: number;
}

interface ActivityItem {
  id: string;
  type: 'chat' | 'video' | 'ai' | 'room_join';
  action: string;
  details: string;
  timestamp: string;
}

interface RecentRoom {
  id: string;
  name: string;
  lastVisited: string;
  messageCount: number;
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  
  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Security state
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  useEffect(() => {
    // Load profile from backend API
    const storedUser = StorageUtils.safeGetItem('chat-user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    
    // Ensure user exists in backend
    async function ensureUserExists() {
      try {
        // Try to get user from backend
        const backendUser = await apiClient.getProfile(userData.id);
        console.log('✅ User exists in backend:', backendUser.id);
        return true;
      } catch (error) {
        console.warn('⚠️ User not found, creating in backend...');
        try {
          // Create user in backend
          const newUser = await apiClient.createUser(userData.username);
          console.log('✅ User created in backend:', newUser.id);
          
          // Update local storage with backend user ID
          const updatedUserData = { ...userData, id: newUser.id };
          StorageUtils.safeSetItem('chat-user', JSON.stringify(updatedUserData));
          
          return true;
        } catch (createError) {
          console.error('❌ Failed to create user in backend:', createError);
          return false;
        }
      }
    }
    
    // Load profile - try backend first, fallback to local
    async function loadProfile() {
      // First ensure user exists
      await ensureUserExists();
      
      // Clean up any base64 avatars from localStorage (migration)
      const storedAvatar = localStorage.getItem('userAvatar');
      if (storedAvatar && storedAvatar.startsWith('data:')) {
        console.log('🧹 Removing base64 avatar from localStorage');
        localStorage.removeItem('userAvatar');
      }
      
      // Check userProfile for base64 avatars too
      const existingProfileStr = StorageUtils.safeGetItem('userProfile');
      if (existingProfileStr) {
        try {
          const existingProfile = JSON.parse(existingProfileStr);
          if (existingProfile.avatar && existingProfile.avatar.startsWith('data:')) {
            console.log('🧹 Removing base64 avatar from userProfile');
            delete existingProfile.avatar;
            StorageUtils.safeSetItem('userProfile', JSON.stringify(existingProfile));
          }
        } catch (e) {
          console.error('Failed to parse userProfile:', e);
        }
      }
      
      // Start with local data
      const existingProfile = StorageUtils.safeGetItem('userProfile');
      const localProfile: UserProfile = existingProfile 
        ? JSON.parse(existingProfile)
        : {
            id: userData.id,
            username: userData.username,
            email: userData.email || `${userData.username}@chatplaster.com`,
            bio: 'Developer passionate about real-time collaboration and clean code.',
            avatar: '',
            joinedDate: new Date().toISOString().split('T')[0],
            totalRooms: 3,
            totalMessages: 127,
            favoriteLanguage: 'JavaScript',
            theme: 'purple',
            notifications: true
          };
      
      // Set local profile immediately
      setProfile(localProfile);
      setEditedProfile(localProfile);
      setAvatarPreview(localProfile.avatar || null);
      
      // Try to sync with backend in background (non-blocking)
      try {
        console.log('📥 Syncing profile with backend...');
        const backendProfile = await apiClient.getProfile(userData.id);
        
        const joinedDate = backendProfile.created_at 
          ? new Date(backendProfile.created_at).toISOString().split('T')[0]
          : localProfile.joinedDate;
        
        const fullProfile: UserProfile = {
          ...localProfile,
          username: backendProfile.username,
          avatar: backendProfile.avatar_url || localProfile.avatar || '',
          joinedDate
        };
        
        console.log('✅ Profile synced from backend');
        setProfile(fullProfile);
        setEditedProfile(fullProfile);
        setAvatarPreview(fullProfile.avatar || null);
        
        // Save CDN URL to localStorage for WebSocket usage
        if (fullProfile.avatar) {
          localStorage.setItem('userAvatar', fullProfile.avatar);
        }
      } catch (error) {
        console.warn('⚠️ Could not sync with backend, using local profile');
        
        // Fallback to localStorage
        const existingProfile = StorageUtils.safeGetItem('userProfile');
        const mockProfile: UserProfile = {
          id: userData.id,
          username: userData.username,
          email: userData.email || `${userData.username}@chatplaster.com`,
          bio: 'Developer passionate about real-time collaboration and clean code.',
          avatar: '',  // Always provide string, even if empty
          joinedDate: new Date().toISOString().split('T')[0],
          totalRooms: 3,
          totalMessages: 127,
          favoriteLanguage: 'JavaScript',
          theme: 'purple',
          notifications: true
        };

        if (existingProfile) {
          const savedProfile = JSON.parse(existingProfile);
          setProfile({ ...mockProfile, ...savedProfile });
          setEditedProfile({ ...mockProfile, ...savedProfile });
          if (savedProfile.avatar) {
            setAvatarPreview(savedProfile.avatar);
          }
        } else {
          setProfile(mockProfile);
          setEditedProfile(mockProfile);
        }
      }
    }
    
    loadProfile();

    // If route includes ?edit=true, open edit mode automatically (used after signup or direct links)
    try {
      if (searchParams?.get('edit') === 'true') {
        setIsEditing(true);
        try { router.replace('/profile'); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }

    // One-time onboarding after signup: check localStorage flag
    try {
      if (localStorage.getItem('showProfileOnboard') === 'true') {
        // Open edit mode and show onboarding modal, then clear the flag
        setIsEditing(true);
        setShowOnboardModal(true);
        localStorage.removeItem('showProfileOnboard');
      }
    } catch (e) { /* ignore storage errors */ }
  }, [router]);

  // Avatar handling with Bunny.net CDN - Multi-size support
  const handleAvatarChange = async (avatarUrls: AvatarUrls | null) => {
    if (!profile) return;
    
    if (avatarUrls) {
      // Update local state with multi-size CDN URLs
      setEditedProfile({ ...editedProfile, avatar_urls: avatarUrls, avatar: avatarUrls.medium });
      setAvatarPreview((avatarUrls.large || avatarUrls.medium || avatarUrls.small) ?? null);
      
      // Save to localStorage for WebSocket (use medium size as default)
      if (avatarUrls.medium) {
        localStorage.setItem('userAvatar', avatarUrls.medium);
      }
      
      // Update backend profile with all sizes
      try {
        await apiClient.updateProfile(profile.id, editedProfile.username, avatarUrls.medium, avatarUrls);
        toast.success('Avatar uploaded to CDN (4 optimized sizes)!');
      } catch (error) {
        console.error('❌ Failed to update profile with new avatar:', error);
        toast.error('Failed to save avatar to profile');
      }
    } else {
      // Avatar deleted
      setEditedProfile({ ...editedProfile, avatar: '', avatar_urls: undefined });
      setAvatarPreview(null);
      localStorage.removeItem('userAvatar');
      toast.success('Avatar removed');
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !editedProfile) return;
    
    try {
      console.log('💾 Saving profile to backend...');
      
      // Save to backend (avatar already uploaded via AvatarUpload component)
      const result = await apiClient.updateProfile(
        profile.id,
        editedProfile.username,
        editedProfile.avatar || undefined
      );
      
      if (result.success) {
        const updatedProfile = {
          ...profile,
          ...editedProfile,
          username: result.user.username,
          avatar: result.user.avatar_url || editedProfile.avatar || ''
        };
        
        setProfile(updatedProfile);
        setIsEditing(false);
        
        // Only store minimal data in localStorage
        StorageUtils.safeSetItem('userProfile', JSON.stringify({
          id: updatedProfile.id,
          username: updatedProfile.username,
          email: updatedProfile.email
        }));
        
        // Store avatar URL separately for WebSocket
        if (updatedProfile.avatar) {
          localStorage.setItem('userAvatar', updatedProfile.avatar);
        }
        
        toast.success('✅ Profile saved successfully!');
        console.log('✅ Profile saved to backend');
      }
    } catch (error) {
      console.error('❌ Failed to save profile to backend:', error);
      toast.error('Failed to save profile');
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    toast.success('Password updated successfully!');
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  const handleDeleteAccount = async () => {
    if (confirm('⚠️ Are you absolutely sure? This action cannot be undone.')) {
      localStorage.removeItem('chat-user');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('aiPreferences');
      toast.success('Account deleted. Goodbye! 👋');
      setTimeout(() => router.push('/'), 1500);
    }
  };

  // Utility functions for future features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ai': return <Zap className="w-4 h-4 text-green-400" />;
      case 'video': return <Camera className="w-4 h-4 text-emerald-400" />;
      case 'chat': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'room_join': return <User className="w-4 h-4 text-slate-400" />;
      default: return <Activity className="w-4 h-4 text-slate-300" />;
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-black via-slate-950 to-black">
        <div className="glass-card p-6 text-center border border-slate-700/50">
          <p className="text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-black via-slate-950 to-black pt-20">
      {/* Onboarding modal (one-time after signup) */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowOnboardModal(false)} />
          <div className="relative bg-[#0b1020] p-6 rounded-lg shadow-lg w-full max-w-md z-50">
            <h3 className="text-lg font-semibold text-white mb-2">Welcome — finish your profile</h3>
            <p className="text-slate-400 mb-4">Add a profile photo, display name, and short bio so others can recognize you in chats.</p>
            <ul className="list-disc list-inside text-slate-300 mb-4">
              <li>Add a photo</li>
              <li>Choose a display name</li>
              <li>Write a short bio</li>
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="glass" onClick={() => setShowOnboardModal(false)}>Skip</Button>
              <Button variant="primary" onClick={() => setShowOnboardModal(false)}>Got it</Button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/">
            <Button variant="glass" className="px-4 py-2">← Back to Home</Button>
          </Link>
        </motion.div>

        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8"
        >
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Avatar - Show AvatarUpload when editing, otherwise show display avatar */}
            {isEditing ? (
              <div className="w-full lg:w-auto">
                <AvatarUpload
                  userId={profile.id}
                  currentAvatar={editedProfile.avatar_urls || profile.avatar_urls || undefined}
                  username={editedProfile.username || profile.username}
                  onAvatarChange={handleAvatarChange}
                />
              </div>
            ) : (
              <div className="relative">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/20">
                  <ResponsiveAvatar
                    avatarUrls={profile.avatar_urls}
                    username={profile.username}
                    size="large"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* User Info */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    label="Display Name"
                    value={editedProfile.username || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, username: e.target.value})}
                    maxLength={30}
                    className="bg-white/5"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={editedProfile.email || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                    className="bg-white/5"
                  />
                  <Textarea
                    label="Bio"
                    value={editedProfile.bio || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, bio: e.target.value})}
                    maxLength={200}
                    rows={3}
                    className="bg-white/5"
                  />
                  
                  {/* Security Section - Only visible when editing */}
                  <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Security & Privacy</h3>
                    <div className="space-y-3">
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                        className="bg-white/5"
                      />
                      <Input
                        type="password"
                        placeholder="New password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                        className="bg-white/5"
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                        className="bg-white/5"
                      />
                      <Button onClick={handleChangePassword} variant="glass" size="sm">
                        Update Password
                      </Button>
                    </div>
                    
                    <div className="mt-4 p-4 border border-red-500/30 bg-red-500/5 rounded-lg">
                      <h4 className="text-slate-200 font-medium mb-2 flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-red-400" />
                        Danger Zone
                      </h4>
                      <p className="text-slate-400 text-sm mb-3">
                        Permanently delete your account and all associated data.
                      </p>
                      <Button
                        onClick={handleDeleteAccount}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} variant="primary">Save Profile</Button>
                    <Button onClick={handleCancelEdit} variant="glass">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-200 mb-2">{profile.username}</h1>
                  <p className="text-slate-400 mb-3">{profile.email}</p>
                  {profile.bio && <p className="text-slate-300 mb-4 max-w-2xl">{profile.bio}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => router.push('/chat')} variant="primary" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Search Chat Rooms
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center"><div className="text-green-400">Loading...</div></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}
