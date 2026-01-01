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
import { socketManager } from '@/lib/socket';
import { updateUsernameEverywhere } from '@/lib/message-utils';
import { StorageUtils } from '@/lib/storage-utils';
import toast from 'react-hot-toast';
import { AvatarUrls } from '@/types/backend';
import { 
  Camera, Activity, Trash2,
  User, MessageSquare, Zap
} from 'lucide-react';
// Image not used; remove import to satisfy lint

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

// Remove unused interfaces (ProfileStats, ActivityItem, RecentRoom) to reduce lint noise

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const viewedUserId = (() => {
    try { return searchParams?.get('userId') || null; } catch { return null; }
  })();
  const viewedUsername = (() => {
    try { return searchParams?.get('username') || null; } catch { return null; }
  })();
  
  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Security state
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordSupported, setPasswordSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Load profile from backend API
    const storedUser = StorageUtils.safeGetItem('chat-user');
    const userData = storedUser ? JSON.parse(storedUser) : null;

    // Determine if viewing another user's profile
    const viewingOtherUser = viewedUserId && (!userData || viewedUserId !== userData.id);
    setIsViewOnly(Boolean(viewingOtherUser));

    // If not viewing another user and no local user, redirect to home
    if (!viewingOtherUser && !storedUser) {
      router.push('/');
      return;
    }
    
    // Ensure user exists in backend
    async function ensureUserExists() {
      try {
        if (!userData) return false;
        // Try to get user from backend by ID (current user only)
        const backendUser = await apiClient.getProfile(userData.id);
        console.log('✅ User exists in backend:', backendUser.id);
        return true;
      } catch (error) {
        console.warn('⚠️ User not found by ID, checking if user exists with this username...');
        
        // User might exist but with different ID (e.g., after failed signup attempt)
        // Try to create/get user by username
        try {
          const newUser = await apiClient.createUser(userData!.username);
          console.log('✅ User created in backend:', newUser.id);
          
          // Update local storage with backend user ID
          const updatedUserData = { ...userData, id: newUser.id };
          StorageUtils.safeSetItem('chat-user', JSON.stringify(updatedUserData));
          
          return true;
        } catch (createError: unknown) {
          // If username already exists, backend should return the existing user
          // But if it just returns error, we need to clear localStorage and redirect to login
          console.error('❌ Failed to sync user with backend:', createError);
          
          const errorMsg = (createError instanceof Error ? createError.message : String(createError || ''));
          if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
            console.error('💥 Username exists but with different ID. Clearing localStorage and redirecting to login.');
            toast.error('Session mismatch. Please log in again.');
            localStorage.removeItem('chat-user');
            localStorage.removeItem('auth-token');
            router.push('/');
            return false;
          }
          
          return false;
        }
      }
    }
    
    // Load profile - try backend first, fallback to local
    async function loadProfile() {
      // First ensure user exists
      if (!viewingOtherUser) {
        await ensureUserExists();
      }
      
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
      const existingProfile = !viewingOtherUser ? StorageUtils.safeGetItem('userProfile') : null;
      const localProfile: UserProfile = existingProfile 
        ? JSON.parse(existingProfile)
        : {
            id: userData?.id || viewedUserId || 'unknown',
            username: viewingOtherUser ? (viewedUsername || 'User') : (userData?.username || viewedUsername || 'User'),
            // When viewing another user's profile, do NOT infer or use current user's email
            email: viewingOtherUser ? undefined : (userData?.email || (userData?.username ? `${userData.username}@chatplaster.com` : (viewedUsername ? `${viewedUsername}@chatplaster.com` : undefined))),
        bio: undefined,
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
        const backendProfile = await apiClient.getProfile(viewingOtherUser ? (viewedUserId as string) : userData!.id);
        
        const joinedDate = backendProfile.created_at 
          ? new Date(backendProfile.created_at).toISOString().split('T')[0]
          : localProfile.joinedDate;
        
        const fullProfile: UserProfile = {
          ...localProfile,
          username: backendProfile.display_name || backendProfile.username,
          // Prefer backend email; do not derive placeholder when viewing others
          email: backendProfile.email ?? localProfile.email,
          bio: backendProfile.bio ?? localProfile.bio,
          avatar: backendProfile.avatar_url || localProfile.avatar || '',
          avatar_urls: backendProfile.avatar_urls || localProfile.avatar_urls,
          joinedDate
        };
        
        console.log('✅ Profile synced from backend');
        setProfile(fullProfile);
        setEditedProfile(fullProfile);
        setAvatarPreview(fullProfile.avatar || null);
        
        // Persist avatar and basic profile only for current user context
        if (!viewingOtherUser) {
          try {
            if (fullProfile.avatar) {
              localStorage.setItem('userAvatar', fullProfile.avatar);
            }
            const chatUserRaw = localStorage.getItem('chat-user');
            if (chatUserRaw) {
              const chatUser = JSON.parse(chatUserRaw);
              const updated = { ...chatUser, username: fullProfile.username, email: fullProfile.email, avatar_url: fullProfile.avatar, avatar_urls: fullProfile.avatar_urls };
              localStorage.setItem('chat-user', JSON.stringify(updated));
            }
            // Also store minimal profile for quick reads
            StorageUtils.safeSetItem('userProfile', JSON.stringify({ id: fullProfile.id, username: fullProfile.username, email: fullProfile.email }));
          } catch {}
        }
      } catch (error) {
        console.warn('⚠️ Could not sync with backend, using local profile');
        
        // Fallback to localStorage
        const existingProfile = StorageUtils.safeGetItem('userProfile');
        const mockProfile: UserProfile = {
          id: userData?.id || viewedUserId || 'unknown',
          username: viewingOtherUser ? (viewedUsername || 'User') : (userData?.username || viewedUsername || 'User'),
          email: viewingOtherUser ? undefined : (userData?.email || (userData?.username ? `${userData.username}@chatplaster.com` : (viewedUsername ? `${viewedUsername}@chatplaster.com` : undefined))),
          bio: undefined,
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

    // Detect if backend supports password updates and toggle UI accordingly
    (async () => {
      try {
        const supported = await apiClient.checkPasswordRouteAvailable();
        setPasswordSupported(supported);
      } catch {
        setPasswordSupported(false);
      }
    })();

    // If route includes ?edit=true, open edit mode automatically (used after signup or direct links)
    try {
      if (!viewingOtherUser && searchParams?.get('edit') === 'true') {
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
  }, [router, searchParams, viewedUserId, viewedUsername]);

  // Avatar handling with Bunny.net CDN - Multi-size support
  const handleAvatarChange = async (avatarUrls: AvatarUrls | null) => {
    if (!profile) return;
    if (isViewOnly) return; // No edits when viewing another user's profile
    
    if (avatarUrls) {
      // Update local state with multi-size CDN URLs
      setEditedProfile({ ...editedProfile, avatar_urls: avatarUrls, avatar: avatarUrls.medium });
      setAvatarPreview((avatarUrls.large || avatarUrls.medium || avatarUrls.small) ?? null);
      
      // Save to localStorage for WebSocket (use medium size as default)
      if (avatarUrls.medium) {
        localStorage.setItem('userAvatar', avatarUrls.medium);
        // Update avatar caches for real-time message resolution
        try {
          const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
          const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
          byId[profile.id] = avatarUrls.medium;
          byName[profile.username] = avatarUrls.medium;
          localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
          localStorage.setItem('userAvatarCache', JSON.stringify(byName));
        } catch {}
      }
      
      // Update backend profile with all sizes
      try {
        const result = await apiClient.updateProfile(profile.id, editedProfile.username, avatarUrls.medium, avatarUrls);
        toast.success('Avatar uploaded to CDN (4 optimized sizes)!');
        // Persist avatar_urls to chat-user for cross-device/session use
        try {
          const chatUserRaw = localStorage.getItem('chat-user');
          if (chatUserRaw) {
            const chatUser = JSON.parse(chatUserRaw);
            const updated = { ...chatUser, avatar_url: result.user?.avatar_url || avatarUrls.medium, avatar_urls: result.user?.avatar_urls || avatarUrls };
            localStorage.setItem('chat-user', JSON.stringify(updated));
          }
        } catch {}

        // Notify other routes/pages to refresh avatar immediately
        try {
          const detail = { userId: profile.id, username: profile.username, avatar: avatarUrls.medium };
          window.dispatchEvent(new CustomEvent('avatar-updated', { detail }));
          const bc = new BroadcastChannel('avatar-updates');
          bc.postMessage(detail);
          bc.close();
        } catch {}
      } catch (error) {
        console.error('❌ Failed to update profile with new avatar:', error);
        toast.error('Failed to save avatar to profile');
      }
    } else {
      // Avatar deleted
      setEditedProfile({ ...editedProfile, avatar: '', avatar_urls: undefined });
      setAvatarPreview(null);
      localStorage.removeItem('userAvatar');
      try {
        const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
        const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
        delete byId[profile.id];
        delete byName[profile.username];
        localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
        localStorage.setItem('userAvatarCache', JSON.stringify(byName));
      } catch {}
      toast.success('Avatar removed');
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !editedProfile) return;
    
    try {
      console.log('💾 Saving profile to backend...');
      const prevUsername = profile.username;
      
      // Save to backend (avatar already uploaded via AvatarUpload component)
      const result = await apiClient.updateProfile(
        profile.id,
        editedProfile.username,
        editedProfile.avatar || undefined,
        editedProfile.avatar_urls,
        editedProfile.bio,
        editedProfile.email
      );
      
      if (result.success) {
        const updatedProfile = {
          ...profile,
          ...editedProfile,
          username: result.user.display_name || result.user.username,
          bio: result.user.bio ?? editedProfile.bio,
          avatar: result.user.avatar_url || editedProfile.avatar || ''
        };
        
        setProfile(updatedProfile);
        setIsEditing(false);
        
        // Patch username across message history and caches
        try { updateUsernameEverywhere(updatedProfile.id, prevUsername, updatedProfile.username!); } catch {}

        // Only store minimal data in localStorage
        StorageUtils.safeSetItem('userProfile', JSON.stringify({
          id: updatedProfile.id,
          username: updatedProfile.username,
          email: updatedProfile.email,
          bio: updatedProfile.bio
        }));
        
        // Store avatar URL separately for WebSocket
        if (updatedProfile.avatar) {
          localStorage.setItem('userAvatar', updatedProfile.avatar);
        }

        // Update chat-user cache and broadcast profile changes for real-time updates
        try {
          const chatUserRaw = localStorage.getItem('chat-user');
          if (chatUserRaw) {
            const chatUser = JSON.parse(chatUserRaw);
            const merged = { ...chatUser, username: updatedProfile.username, email: updatedProfile.email, avatar_url: updatedProfile.avatar, avatar_urls: updatedProfile.avatar_urls };
            localStorage.setItem('chat-user', JSON.stringify(merged));
          }
          const detail = { userId: updatedProfile.id, username: updatedProfile.username, prevUsername, email: updatedProfile.email, bio: updatedProfile.bio, avatar: updatedProfile.avatar };
          window.dispatchEvent(new CustomEvent('profile-updated', { detail }));
          const bc = new BroadcastChannel('profile-updates');
          bc.postMessage(detail);
          bc.close();
          // If connected to a room, also emit a WebSocket profile update for instant cross-device sync
          try {
            if (socketManager.isConnected()) {
              socketManager.sendProfileUpdate({
                username: updatedProfile.username,
                prevUsername,
                email: updatedProfile.email,
                bio: updatedProfile.bio,
                avatar_url: updatedProfile.avatar,
              });
            }
          } catch {}
        } catch {}
        
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

  const handleChangePassword = async () => {
    if (!profile) return;
    if (passwordSupported === false) {
      toast.error('Password updates are not enabled on the backend yet.');
      return;
    }
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
    try {
      const result = await apiClient.updatePassword(profile.id, passwordData.new);
      if (result?.notSupported) {
        toast.error('Password updates are not enabled on the backend yet.');
        return;
      }
      if (result?.success) {
        toast.success('Password updated successfully!');
        setPasswordData({ current: '', new: '', confirm: '' });
      } else {
        toast.error('Failed to update password');
      }
    } catch (e) {
      console.error('Failed to update password', e);
      toast.error('Failed to update password');
    }
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
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
            {/* Avatar - Show AvatarUpload when editing (only for own profile), otherwise show display avatar */}
            {isEditing && !isViewOnly ? (
              <div className="w-full lg:w-auto mx-auto">
                <AvatarUpload
                  userId={profile.id}
                  currentAvatar={(editedProfile.avatar_urls || profile.avatar_urls) ?? (profile.avatar ? { thumbnail: profile.avatar, small: profile.avatar, medium: profile.avatar, large: profile.avatar } : undefined)}
                  username={editedProfile.username || profile.username}
                  onAvatarChange={handleAvatarChange}
                />
              </div>
            ) : (
              <div className="relative">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/20">
                  <ResponsiveAvatar
                    avatarUrls={(profile.avatar_urls && (profile.avatar_urls.thumbnail || profile.avatar_urls.medium || profile.avatar_urls.large)) ? profile.avatar_urls : (profile.avatar ? { thumbnail: profile.avatar, small: profile.avatar, medium: profile.avatar, large: profile.avatar } : undefined)}
                    username={profile.username}
                    size="large"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* User Info */}
            <div className="flex-1">
              {isEditing && !isViewOnly ? (
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
                    {passwordSupported === false ? (
                      <div className="p-3 border border-yellow-500/30 bg-yellow-500/5 rounded">
                        <p className="text-yellow-300 text-sm">
                          Password updates are not enabled on the backend yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          type="password"
                          placeholder="Current password"
                          value={passwordData.current}
                          onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                          className="bg-white/5"
                          disabled={passwordSupported === null}
                        />
                        <Input
                          type="password"
                          placeholder="New password"
                          value={passwordData.new}
                          onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                          className="bg-white/5"
                          disabled={passwordSupported === null}
                        />
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          value={passwordData.confirm}
                          onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                          className="bg-white/5"
                          disabled={passwordSupported === null}
                        />
                        <Button onClick={handleChangePassword} variant="glass" size="sm" disabled={passwordSupported === null}>
                          Update Password
                        </Button>
                      </div>
                    )}
                    
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
                  {profile.email && (
                    <p className="text-slate-400 mb-3">{profile.email}</p>
                  )}
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
