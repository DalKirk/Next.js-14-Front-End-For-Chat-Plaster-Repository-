'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'security'>('profile');
  
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
    // Load profile from localStorage or API
    const storedUser = localStorage.getItem('chat-user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    const existingProfile = localStorage.getItem('userProfile');

    // Mock profile data
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
      toast.error('Image must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setEditedProfile({ ...editedProfile, avatar: result });
      toast.success('Avatar updated!');
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

  const handleSaveProfile = () => {
    if (profile && editedProfile) {
      const updatedProfile = { ...profile, ...editedProfile };
      setProfile(updatedProfile);
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      toast.success('Profile updated successfully!');
      setIsEditing(false);
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
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  <p className="text-xs text-white/60 mt-2 text-center">Drag & drop or click</p>
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
                  <Button onClick={() => setIsEditing(true)} variant="glass" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Edit Profile
                  </Button>
                </>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-auto">
              <div className="glass-panel p-3 sm:p-4 text-center border border-slate-700/50 hover:border-green-500/50 transition">
                <div className="text-xl sm:text-2xl font-bold text-green-400">{stats.messagesCount}</div>
                <div className="text-xs sm:text-sm text-slate-400">Messages</div>
              </div>
              <div className="glass-panel p-3 sm:p-4 text-center border border-slate-700/50 hover:border-emerald-500/50 transition">
                <div className="text-xl sm:text-2xl font-bold text-emerald-400">{stats.conversationsCount}</div>
                <div className="text-xs sm:text-sm text-slate-400">Chats</div>
              </div>
              <div className="glass-panel p-3 sm:p-4 text-center border border-slate-700/50 hover:border-green-500/50 transition">
                <div className="text-xl sm:text-2xl font-bold text-slate-300">{stats.totalSessionTime}</div>
                <div className="text-xs sm:text-sm text-slate-400">Time</div>
              </div>
              <div className="glass-panel p-3 sm:p-4 text-center border border-slate-700/50 hover:border-emerald-500/50 transition">
                <div className="text-xl sm:text-2xl font-bold text-slate-300">{stats.aiChatsCount}</div>
                <div className="text-xs sm:text-sm text-slate-400">AI Chats</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'security', label: 'Security', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold shadow-[0_0_25px_rgba(34,197,94,0.6)]'
                  : 'bg-gradient-to-br from-black/60 via-slate-900/60 to-black/60 text-slate-400 hover:bg-green-500/10 hover:text-slate-300 border border-slate-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm sm:text-base">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-4 sm:p-6 lg:p-8"
          >
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-200">Profile Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-panel p-4">
                    <div className="text-slate-500 text-sm mb-1">Joined</div>
                    <div className="text-slate-300">{new Date(profile.joinedDate).toLocaleDateString()}</div>
                  </div>
                  <div className="glass-panel p-4">
                    <div className="text-slate-500 text-sm mb-1">Total Rooms</div>
                    <div className="text-slate-300">{profile.totalRooms}</div>
                  </div>
                  <div className="glass-panel p-4">
                    <div className="text-slate-500 text-sm mb-1">Messages Sent</div>
                    <div className="text-slate-300">{profile.totalMessages}</div>
                  </div>
                  <div className="glass-panel p-4">
                    <div className="text-slate-500 text-sm mb-1">Favorite Language</div>
                    <div className="text-slate-300">{profile.favoriteLanguage}</div>
                  </div>
                </div>

                {recentRooms.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-slate-200 mb-4">Recent Rooms</h3>
                    <div className="space-y-3">
                      {recentRooms.map((room) => (
                        <div key={room.id} className="glass-panel p-4 hover:bg-green-500/10 hover:border-green-500/30 transition border border-slate-700/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-slate-300">{room.name}</h4>
                              <p className="text-sm text-slate-400">Last visited: {new Date(room.lastVisited).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-400">{room.messageCount} messages</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-200 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="glass-panel p-4 border border-slate-700/50">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-slate-300 font-medium">{activity.action}</div>
                              <div className="text-slate-400 text-sm">{activity.details}</div>
                            </div>
                            <div className="text-slate-500 text-sm">{getTimeAgo(activity.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-200 mb-4">Security & Privacy</h2>
                
                <div className="glass-panel p-6 space-y-4 border border-slate-700/50">
                  <h3 className="text-slate-300 font-medium mb-4">Change Password</h3>
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
                    <Button onClick={handleChangePassword} variant="primary">
                      Update Password
                    </Button>
                  </div>
                </div>

                <div className="glass-panel p-6 border border-red-500/30 bg-red-500/5">
                  <h3 className="text-slate-200 font-medium mb-2 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-400" />
                    Danger Zone
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
