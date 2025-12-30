'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { 
  Camera, Settings, Activity, Shield, Trash2,
  User, MessageSquare, Clock, Zap, Code, Globe
} from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  joinedDate: string;
  totalRooms: number;
  totalMessages: number;
  favoriteLanguage: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  
  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState<ProfileStats>({
    messagesCount: 0,
    conversationsCount: 0,
    totalSessionTime: '0h 0m',
    lastActive: 'Just now',
    aiChatsCount: 0,
  });
  
  // Activity state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  
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
    
    // Try to load from backend first
    async function loadProfile() {
      try {
        console.log('📥 Loading profile from backend...');
        const backendProfile = await apiClient.getProfile(userData.id);
        
        const fullProfile: UserProfile = {
          id: backendProfile.id,
          username: backendProfile.username,
          email: userData.email || `${backendProfile.username}@chatplaster.com`,
          bio: 'Developer passionate about real-time collaboration and clean code.',
          avatar: backendProfile.avatar_url || '',
          joinedDate: new Date(backendProfile.created_at).toISOString().split('T')[0],
          totalRooms: 3,
          totalMessages: 127,
          favoriteLanguage: 'JavaScript',
          theme: 'purple',
          notifications: true
        };
        
        console.log('✅ Profile loaded from backend:', fullProfile);
        setProfile(fullProfile);
        setEditedProfile(fullProfile);
        setAvatarPreview(fullProfile.avatar || null);
        
      } catch (error) {
        console.warn('⚠️ Backend profile not found, using localStorage fallback');
        
        // Fallback to localStorage
        const existingProfile = StorageUtils.safeGetItem('userProfile');
        const mockProfile: UserProfile = {
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

    // Mock stats
    setStats({
      messagesCount: 127,
      conversationsCount: 23,
      totalSessionTime: '14h 32m',
      lastActive: 'Just now',
      aiChatsCount: 18,
    });

    // Mock activities
    setActivities([
      { 
        id: '1', 
        type: 'ai', 
        action: 'AI Chat', 
        details: 'Asked about mobile keyboard optimization',
        timestamp: new Date(Date.now() - 120000).toISOString() 
      },
      { 
        id: '2', 
        type: 'video', 
        action: 'Video Call', 
        details: 'Called with User #1234',
        timestamp: new Date(Date.now() - 3600000).toISOString() 
      },
      { 
        id: '3', 
        type: 'ai', 
        action: 'AI Chat', 
        details: 'Discussed project planning',
        timestamp: new Date(Date.now() - 10800000).toISOString() 
      },
    ]);

    // Mock recent rooms
    setRecentRooms([
      { id: '1', name: 'Frontend Team', lastVisited: '2024-11-01', messageCount: 45 },
      { id: '2', name: 'Code Review', lastVisited: '2024-10-31', messageCount: 23 },
    ]);
  }, [router]);

  // Avatar handling
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAvatarFile(file);
  };

  const processAvatarFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('❌ File too large! Please use an image URL instead.');
      toast(
        '💡 Tip: Upload to imgbb.com or use pravatar.cc for avatars',
        { duration: 5000, icon: '💡' }
      );
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Show preview but warn about storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      
      toast.error(
        '⚠️ Base64 images cause storage quota errors. Please enter an image URL instead.',
        { duration: 6000 }
      );
      toast(
        '💡 Use imgbb.com, imgur.com, or paste a direct image URL',
        { duration: 6000, icon: '💡' }
      );
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processAvatarFile(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !editedProfile) return;
    
    try {
      // Validate avatar URL
      if (editedProfile.avatar && editedProfile.avatar.startsWith('data:')) {
        toast.error(
          '❌ Cannot save base64 avatars. Please use an image URL.',
          { duration: 5000 }
        );
        return;
      }
      
      console.log('💾 Saving profile to backend...');
      setIsEditing(false); // Show loading state
      
      // Save to backend
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
          avatar: result.user.avatar_url || editedProfile.avatar
        };
        
        setProfile(updatedProfile);
        
        // Only store minimal data in localStorage (no avatars!)
        StorageUtils.safeSetItem('userProfile', JSON.stringify({
          id: updatedProfile.id,
          username: updatedProfile.username,
          email: updatedProfile.email
        }));
        
        toast.success('✅ Profile saved successfully!');
        console.log('✅ Profile saved to backend');
      }
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save profile';
      toast.error(errorMsg, { duration: 5000 });
      setIsEditing(true); // Re-enable editing
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile || {});
    setAvatarPreview(profile?.avatar || null);
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
            {/* Avatar */}
            <div className="relative">
              <div
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 ${
                  isDragging ? 'border-[#FF9900]' : 'border-white/20'
                } transition-all`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-4xl sm:text-5xl font-bold text-black">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isEditing && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full hover:from-green-400 hover:to-emerald-400 transition shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                  </button>
                  <p className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-white/80 font-medium whitespace-nowrap">UPLOAD</p>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </>
              )}
            </div>

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
                  
                  {/* Avatar URL Input */}
                  <div className="space-y-2">
                    <Input
                      label="Avatar URL (Recommended)"
                      placeholder="https://example.com/avatar.jpg or https://i.pravatar.cc/150"
                      value={editedProfile.avatar || ''}
                      onChange={(e) => {
                        setEditedProfile({...editedProfile, avatar: e.target.value});
                        setAvatarPreview(e.target.value);
                      }}
                      className="bg-white/5"
                    />
                    <p className="text-xs text-slate-400">
                      💡 Tip: Use <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">imgbb.com</a>, <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">imgur.com</a>, or <a href="https://i.pravatar.cc/150" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">pravatar.cc</a> for avatars
                    </p>
                  </div>
                  
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
