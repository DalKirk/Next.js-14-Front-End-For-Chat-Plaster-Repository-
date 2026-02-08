'use client';

import { useState, useEffect, Suspense, useCallback, useRef, createContext, useContext } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { AvatarUpload } from '@/components/AvatarUpload';
import { GalleryUpload } from '@/components/GalleryUpload';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostCard } from '@/components/feed/PostCard';
import type { GalleryItem } from '@/types/backend';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { apiClient } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { updateUsernameEverywhere } from '@/lib/message-utils';
import { StorageUtils } from '@/lib/storage-utils';
import toast from 'react-hot-toast';
import { AvatarUrls } from '@/types/backend';
import type { ThemeConfig } from '@/types/backend';
import {
  Camera, Activity, Trash2,
  User, MessageSquare, Zap, Pencil, X, Palette,
  Star, Wand2, Type, Layers, Sparkles, Upload, Save, Shield,
  Heart, Eye, Crown, Users, Newspaper, UserPlus, UserMinus,
} from 'lucide-react';
import {
  fontPresets, presetThemes, glassStyles, ParticleShapes,
  defaultTheme, resolveTheme, resolveFont, themeAnimationCSS,
  type PresetTheme, type GlassStyleDef, type EffectsState,
  type CustomThemeState, type UploadedFont,
} from '@/components/theme-engine';

// ═══════════════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════════════

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  avatar?: string;
  avatar_urls?: {
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

type EditTab = 'profile' | 'appearance' | 'fonts' | 'effects' | 'security';

// ═══════════════════════════════════════════════════════════════════════
// Theme Context + Extracted Sub-Components (stable React identity)
// ═══════════════════════════════════════════════════════════════════════

interface ProfileThemeValues {
  liveTheme: PresetTheme;
  liveGlass: GlassStyleDef;
  liveEffects: EffectsState;
  selectedGlassStyle: string;
  createRipple: (e: React.MouseEvent<HTMLDivElement>) => void;
  ripples: { id: number; x: number; y: number }[];
  cardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  headingColor: string;
  bodyColor: string;
  headingFont: string;
  bodyFont: string;
  editTab: EditTab;
  setEditTab: (tab: EditTab) => void;
}

const ProfileThemeCtx = createContext<ProfileThemeValues | null>(null);

function GlassCard({ children, className = '', refIndex }: { children: React.ReactNode; className?: string; refIndex?: number }) {
  const { liveTheme, liveGlass, liveEffects, selectedGlassStyle, createRipple, ripples, cardRefs } = useContext(ProfileThemeCtx)!;
  return (
    <div
      ref={refIndex !== undefined ? (el: HTMLDivElement | null) => { cardRefs.current[refIndex] = el; } : undefined}
      onMouseDown={createRipple}
      className={`relative ${liveGlass.edges} border-2 overflow-hidden transition-all duration-300 ${className}`}
      style={{
        background: liveTheme.glassColor,
        backdropFilter: `blur(${liveGlass.blur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${liveGlass.blur}px) saturate(180%)`,
        borderColor: 'rgba(255,255,255,0.25)',
        boxShadow: `0 0 20px ${liveTheme.borderGlow}, 0 8px 32px rgba(0,0,0,0.1)`,
        transformStyle: liveEffects.depthLayers ? 'preserve-3d' : 'flat',
      }}
    >
      {liveEffects.depthLayers && (<>
        <div className={`absolute inset-3 ${liveGlass.edges} border pointer-events-none`} style={{ borderColor: 'rgba(255,255,255,0.15)', boxShadow: `inset 0 0 20px ${liveTheme.borderGlow}` }} />
        <div className={`absolute inset-6 ${liveGlass.edges} border pointer-events-none`} style={{ borderColor: 'rgba(255,255,255,0.1)', boxShadow: `inset 0 0 15px ${liveTheme.borderGlow}` }} />
      </>)}
      {selectedGlassStyle === 'holographic' && (<div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ background: 'linear-gradient(45deg, rgba(255,0,255,0.2), rgba(0,255,255,0.2), rgba(255,255,0,0.2))' }} />)}
      {selectedGlassStyle === 'metallic' && (<div className="absolute inset-0 opacity-60 mix-blend-overlay pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(200,200,200,0.2) 50%, rgba(255,255,255,0.4) 100%)' }} />)}
      <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 50%)', opacity: 0.6 }} />
      {selectedGlassStyle === 'ombre' && (<div className={`absolute inset-0 ${liveGlass.edges} opacity-60 pointer-events-none`} style={{ padding: '2px', background: `linear-gradient(135deg, ${liveTheme.borderGlow} 0%, transparent 50%, ${liveTheme.borderGlow} 100%)`, WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />)}
      {ripples.map(r => (<span key={r.id} className="absolute rounded-full pointer-events-none" style={{ left: `${r.x}px`, top: `${r.y}px`, width: '0', height: '0', background: liveTheme.accent, opacity: 0.6, transform: 'translate(-50%,-50%)', animation: 'ripple-expand 1s ease-out forwards' }} />))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function FloatingParticles() {
  const ctx = useContext(ProfileThemeCtx);
  if (!ctx) return null;
  const { liveEffects, liveTheme } = ctx;
  if (liveEffects.particles === 'none' || !ParticleShapes[liveEffects.particles]) return null;
  const speeds: Record<string, number> = { slow: 10, medium: 7, fast: 4 };
  const dur = speeds[liveEffects.particleSpeed] || 7;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {Array.from({ length: liveEffects.particleCount }).map((_, i) => {
        const size = 16 + (i % 3) * 8;
        return (
          <div key={i} className="absolute" style={{ left: `${(i * 7) % 100}%`, bottom: `-${100 + (i % 3) * 10}px`, width: `${size}px`, height: `${size}px`, opacity: 0.5 + (i % 3) * 0.15, animation: `float-up ${dur + (i % 3)}s linear infinite`, animationDelay: `${(i * 0.5) % dur}s` }}>
            {ParticleShapes[liveEffects.particles]?.(liveTheme.accent)}
          </div>
        );
      })}
    </div>
  );
}

function TabButton({ id, label, icon: Icon }: { id: EditTab; label: string; icon: React.ElementType }) {
  const { editTab, setEditTab, liveTheme } = useContext(ProfileThemeCtx)!;
  return (
    <button
      onClick={() => setEditTab(id)}
      className="px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105 flex items-center gap-2 border-2 text-sm"
      style={{
        background: editTab === id ? liveTheme.accent : 'rgba(255,255,255,0.1)',
        borderColor: editTab === id ? liveTheme.accent : 'rgba(255,255,255,0.2)',
        color: editTab === id ? '#ffffff' : liveTheme.text,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main Page Content
// ═══════════════════════════════════════════════════════════════════════

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
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
  const [editTab, setEditTab] = useState<EditTab>('profile');

  // Security state
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordSupported, setPasswordSupported] = useState<boolean | null>(null);

  // ─── Posts state ────────────────────────────────────────────────
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // ─── Follow state ───────────────────────────────────────────────
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ─── Theme editor state ─────────────────────────────────────────────
  const [userTheme, setUserTheme] = useState<ThemeConfig | null>(null);
  // Live-edit state (only active during editing)
  const [selectedPreset, setSelectedPreset] = useState('sunset');
  const [selectedGlassStyle, setSelectedGlassStyle] = useState('ombre');
  const [customTheme, setCustomTheme] = useState<CustomThemeState>({
    name: 'My Custom Theme',
    colors: ['#FF6B6B', '#FFB84D', '#FF6B9D', '#C06C84'],
    blurStrength: 12,
    fonts: { heading: 'inter', body: 'inter', headingColor: '#2D1B1B', bodyColor: '#5A3A3A' },
  });
  const [themeMode, setThemeMode] = useState<'presets' | 'custom'>('presets');
  const [effects, setEffects] = useState<EffectsState>({
    depthLayers: false, tilt3D: false, ripple: true,
    particles: 'hearts', particleCount: 15, particleSpeed: 'medium',
  });
  const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ─── Hydrate theme state from saved config ──────────────────────────
  const hydrateThemeState = useCallback((config: ThemeConfig | null) => {
    if (!config) return;
    setSelectedPreset(config.preset === 'custom' ? 'sunset' : config.preset);
    setThemeMode(config.preset === 'custom' ? 'custom' : 'presets');
    setSelectedGlassStyle(config.glassStyle || 'ombre');
    setCustomTheme({
      name: 'My Custom Theme',
      colors: config.colors || ['#FF6B6B', '#FFB84D', '#FF6B9D', '#C06C84'],
      blurStrength: config.blurStrength ?? 12,
      fonts: {
        heading: config.fonts?.heading || 'inter',
        body: config.fonts?.body || 'inter',
        headingColor: config.fonts?.headingColor || '#2D1B1B',
        bodyColor: config.fonts?.bodyColor || '#5A3A3A',
      },
    });
    setEffects({
      depthLayers: config.effects?.depthLayers ?? false,
      tilt3D: config.effects?.tilt3D ?? false,
      ripple: config.effects?.ripple ?? true,
      particles: config.effects?.particles || 'hearts',
      particleCount: config.effects?.particleCount ?? 15,
      particleSpeed: config.effects?.particleSpeed || 'medium',
    });
  }, []);

  // ─── Derived theme values ───────────────────────────────────────────
  const liveTheme: PresetTheme = userTheme && !isEditing
    ? resolveTheme(userTheme.preset, userTheme.colors, userTheme.preset === 'custom' ? 'custom' : 'presets')
    : isEditing
      ? resolveTheme(selectedPreset, customTheme.colors, themeMode)
      : defaultTheme;

  const liveGlass: GlassStyleDef = isEditing
    ? (glassStyles[selectedGlassStyle] || glassStyles.ombre)
    : (userTheme ? (glassStyles[userTheme.glassStyle] || glassStyles.ombre) : glassStyles.ombre);

  const liveEffects: EffectsState = isEditing
    ? effects
    : (userTheme?.effects || { depthLayers: false, tilt3D: false, ripple: false, particles: 'none', particleCount: 0, particleSpeed: 'medium' });

  const liveCustomFonts = isEditing ? customTheme.fonts : (userTheme?.fonts || customTheme.fonts);

  const headingFont = resolveFont(liveCustomFonts.heading, uploadedFonts);
  const bodyFont = resolveFont(liveCustomFonts.body, uploadedFonts);
  const headingColor = liveCustomFonts.headingColor || liveTheme.text;
  const bodyColor = liveCustomFonts.bodyColor || liveTheme.text;

  const hasTheme = Boolean(userTheme) || isEditing;
  const pageGradient = hasTheme ? liveTheme.gradient : defaultTheme.gradient;

  // ─── Google Fonts loader ────────────────────────────────────────────
  useEffect(() => {
    const load = (key: string) => {
      const font = fontPresets[key];
      if (!font) return;
      const id = `font-${key}`;
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet'; link.href = font.url;
      document.head.appendChild(link);
    };
    load(liveCustomFonts.heading);
    load(liveCustomFonts.body);
  }, [liveCustomFonts.heading, liveCustomFonts.body]);

  // ─── 3D tilt effect ─────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (liveEffects.tilt3D) {
        cardRefs.current.forEach(ref => {
          if (!ref) return;
          const rect = ref.getBoundingClientRect();
          const tiltX = ((e.clientY - (rect.top + rect.height / 2)) / rect.height) * 2;
          const tiltY = (((rect.left + rect.width / 2) - e.clientX) / rect.width) * 2;
          ref.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        });
      } else {
        cardRefs.current.forEach(ref => { if (ref) ref.style.transform = 'none'; });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [liveEffects.tilt3D]);

  // ─── Ripple handler ─────────────────────────────────────────────────
  const createRipple = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!liveEffects.ripple) return;
    const t = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(t.tagName) || t.closest?.('button, a, input, textarea, select')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const r = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples(prev => [...prev, r]);
    setTimeout(() => setRipples(prev => prev.filter(x => x.id !== r.id)), 1000);
  }, [liveEffects.ripple]);

  // ─── Font upload handler ────────────────────────────────────────────
  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'heading' | 'body') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      toast.error('Please upload a valid font file (.ttf, .otf, .woff, .woff2)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '-');
      const fontData = ev.target?.result as string;
      const styleId = `custom-font-${fontName}`;
      let el = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!el) { el = document.createElement('style'); el.id = styleId; document.head.appendChild(el); }
      el.textContent = `@font-face { font-family: "${fontName}"; src: url("${fontData}"); }`;
      setUploadedFonts(prev => [...prev.filter(f => f.name !== fontName), { name: fontName, family: `"${fontName}", sans-serif` }]);
      setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, [type]: fontName } }));
    };
    reader.readAsDataURL(file);
  };

  // ─── Build ThemeConfig from live state ──────────────────────────────
  const buildThemeConfig = useCallback((): ThemeConfig => ({
    preset: themeMode === 'custom' ? 'custom' : selectedPreset,
    glassStyle: selectedGlassStyle,
    colors: customTheme.colors,
    blurStrength: customTheme.blurStrength,
    fonts: { ...customTheme.fonts },
    effects: { ...effects },
  }), [themeMode, selectedPreset, selectedGlassStyle, customTheme, effects]);

  // ═══════════════════════════════════════════════════════════════════
  // Profile logic (preserved from original)
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (profile) {
      console.log('🔍 PROFILE DEBUG - profile state updated:', {
        profileId: profile.id,
        username: profile.username,
        isViewOnly,
        viewedUserId,
        viewedUsername
      });
    }
  }, [profile, isViewOnly, viewedUserId, viewedUsername]);

  useEffect(() => {
    const storedUser = StorageUtils.safeGetItem('chat-user');
    const userData = storedUser ? JSON.parse(storedUser) : null;
    const viewingOtherUser = viewedUserId && (!userData || viewedUserId !== userData.id);
    setIsViewOnly(Boolean(viewingOtherUser));

    if (!viewingOtherUser && !storedUser) {
      router.push('/');
      return;
    }

    async function ensureUserExists() {
      try {
        if (!userData) return false;
        const backendUser = await apiClient.getProfile(userData.id);
        console.log('✅ User exists in backend:', backendUser.id);
        return true;
      } catch {
        console.warn('⚠️ User not found by ID, checking if user exists with this username...');
        try {
          const newUser = await apiClient.createUser(userData!.username);
          console.log('✅ User created in backend:', newUser.id);
          const updatedUserData = { ...userData, id: newUser.id };
          StorageUtils.safeSetItem('chat-user', JSON.stringify(updatedUserData));
          return true;
        } catch (createError: unknown) {
          console.error('❌ Failed to sync user with backend:', createError);
          const errorMsg = (createError instanceof Error ? createError.message : String(createError || ''));
          if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
            console.error('💥 Username exists but with different ID.');
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

    async function loadProfile() {
      if (!viewingOtherUser) await ensureUserExists();

      // Clean up base64 avatars
      const storedAvatar = localStorage.getItem('userAvatar');
      if (storedAvatar && storedAvatar.startsWith('data:')) {
        localStorage.removeItem('userAvatar');
      }
      const existingProfileStr = StorageUtils.safeGetItem('userProfile');
      if (existingProfileStr) {
        try {
          const ep = JSON.parse(existingProfileStr);
          if (ep.avatar && ep.avatar.startsWith('data:')) { delete ep.avatar; StorageUtils.safeSetItem('userProfile', JSON.stringify(ep)); }
        } catch {}
      }

      const existingProfile = !viewingOtherUser ? StorageUtils.safeGetItem('userProfile') : null;
      const localProfile: UserProfile = existingProfile
        ? JSON.parse(existingProfile)
        : {
            id: userData?.id || viewedUserId || 'unknown',
            username: viewingOtherUser ? (viewedUsername || 'User') : (userData?.username || viewedUsername || 'User'),
            email: viewingOtherUser ? undefined : (userData?.email || (userData?.username ? `${userData.username}@chatplaster.com` : undefined)),
            bio: undefined,
            avatar: '',
            joinedDate: new Date().toISOString().split('T')[0],
            totalRooms: 3,
            totalMessages: 127,
            favoriteLanguage: 'JavaScript',
            theme: 'purple',
            notifications: true
          };

      setProfile(localProfile);
      setEditedProfile(localProfile);
      setAvatarPreview(localProfile.avatar || null);

      try {
        const backendProfile = await apiClient.getProfile(viewingOtherUser ? (viewedUserId as string) : userData!.id);
        const joinedDate = backendProfile.created_at
          ? new Date(backendProfile.created_at).toISOString().split('T')[0]
          : localProfile.joinedDate;
        const fullProfile: UserProfile = {
          ...localProfile,
          id: backendProfile.id,
          username: backendProfile.display_name || backendProfile.username,
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
        if (!viewingOtherUser) {
          try {
            if (fullProfile.avatar) localStorage.setItem('userAvatar', fullProfile.avatar);
            const chatUserRaw = localStorage.getItem('chat-user');
            if (chatUserRaw) {
              const chatUser = JSON.parse(chatUserRaw);
              localStorage.setItem('chat-user', JSON.stringify({ ...chatUser, username: fullProfile.username, avatar_url: fullProfile.avatar, avatar_urls: fullProfile.avatar_urls }));
            }
            StorageUtils.safeSetItem('userProfile', JSON.stringify({ id: fullProfile.id, username: fullProfile.username, bio: fullProfile.bio }));
          } catch {}
        }
      } catch {
        console.warn('⚠️ Could not sync with backend, using local profile');
        const existing = StorageUtils.safeGetItem('userProfile');
        const mockProfile: UserProfile = {
          id: userData?.id || viewedUserId || 'unknown',
          username: viewingOtherUser ? (viewedUsername || 'User') : (userData?.username || viewedUsername || 'User'),
          email: viewingOtherUser ? undefined : (userData?.email || (userData?.username ? `${userData.username}@chatplaster.com` : undefined)),
          bio: undefined, avatar: '',
          joinedDate: new Date().toISOString().split('T')[0],
          totalRooms: 3, totalMessages: 127, favoriteLanguage: 'JavaScript', theme: 'purple', notifications: true
        };
        if (existing) {
          const saved = JSON.parse(existing);
          setProfile({ ...mockProfile, ...saved });
          setEditedProfile({ ...mockProfile, ...saved });
          if (saved.avatar) setAvatarPreview(saved.avatar);
        } else {
          setProfile(mockProfile);
          setEditedProfile(mockProfile);
        }
      }
    }

    loadProfile();

    // Email visibility preference
    try {
      const privacyRaw = StorageUtils.safeGetItem('userPrivacy');
      if (privacyRaw) {
        const privacy = JSON.parse(privacyRaw);
        if (typeof privacy?.showEmail === 'boolean') setShowEmail(Boolean(privacy.showEmail));
      }
    } catch {}

    // Password support detection
    (async () => {
      try {
        const supported = await apiClient.checkPasswordRouteAvailable();
        setPasswordSupported(supported);
      } catch { setPasswordSupported(false); }
    })();

    // Load saved theme (backend first, localStorage fallback)
    (async () => {
      try {
        const targetId = viewingOtherUser ? viewedUserId : userData?.id;
        if (targetId) {
          let theme = await apiClient.getTheme(targetId);
          // Fallback: load from localStorage if backend returned nothing
          if (!theme) {
            try {
              const raw = StorageUtils.safeGetItem(`userTheme:${targetId}`);
              if (raw) theme = JSON.parse(raw) as ThemeConfig;
            } catch {}
          }
          if (theme) {
            setUserTheme(theme);
            hydrateThemeState(theme);
          }
        }
      } catch { console.log('No custom theme yet'); }
    })();

    // Auto-open edit mode
    try {
      if (!viewingOtherUser && searchParams?.get('edit') === 'true') {
        setIsEditing(true);
        try { router.replace('/profile'); } catch {}
      }
    } catch {}

    // Onboarding
    try {
      if (localStorage.getItem('showProfileOnboard') === 'true') {
        setIsEditing(true);
        setShowOnboardModal(true);
        localStorage.removeItem('showProfileOnboard');
      }
    } catch {}
  }, [router, searchParams, viewedUserId, viewedUsername, hydrateThemeState]);

  // ─── Load user's posts ──────────────────────────────────────────────
  const loadUserPosts = useCallback(async (userId: string) => {
    setPostsLoading(true);
    try {
      const posts = await apiClient.getUserPosts(userId);
      setMyPosts(posts);
    } catch {
      console.warn('Could not load user posts');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.id && profile.id !== 'unknown') {
      loadUserPosts(profile.id);
    }
  }, [profile?.id, loadUserPosts]);

  // ─── Load follow status + counts ───────────────────────────────────
  useEffect(() => {
    const storedUser = StorageUtils.safeGetItem('chat-user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setCurrentUserId(u.id);
    }
  }, []);

  useEffect(() => {
    if (!profile?.id || profile.id === 'unknown') return;
    // Load followers / following counts for the viewed profile
    (async () => {
      try {
        const [followers, following] = await Promise.all([
          apiClient.getFollowers(profile.id),
          apiClient.getFollowing(profile.id),
        ]);
        setFollowersCount(followers.length);
        setFollowingCount(following.length);
      } catch {
        // silent — counts will stay at 0
      }
    })();
    // Check if current user follows this profile
    if (isViewOnly && currentUserId) {
      (async () => {
        try {
          const status = await apiClient.checkFollowing(profile.id, currentUserId);
          setIsFollowing(status.following);
        } catch {
          // silent
        }
      })();
    }
  }, [profile?.id, isViewOnly, currentUserId]);

  const handleToggleFollow = useCallback(async () => {
    if (!profile?.id || !currentUserId || followLoading) return;
    setFollowLoading(true);
    try {
      const result = await apiClient.toggleFollow(profile.id, currentUserId);
      setIsFollowing(result.following);
      setFollowersCount(result.followers_count);
      setFollowingCount(result.following_count);
      toast.success(result.following ? `Following ${profile.username}` : `Unfollowed ${profile.username}`);
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  }, [profile?.id, profile?.username, currentUserId, followLoading]);

  // ─── Post action handlers ──────────────────────────────────────────
  const handlePostCreated = useCallback((newPost: any) => {
    setMyPosts(prev => [newPost, ...prev]);
    toast.success('Post created!');
  }, []);

  const handlePostLike = useCallback(async (postId: string) => {
    if (!profile) return;
    try {
      const result = await apiClient.likePost(postId, profile.id);
      setMyPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: result.liked ? p.likes_count + 1 : p.likes_count - 1, user_liked: result.liked }
          : p
      ));
    } catch { toast.error('Failed to like post'); }
  }, [profile]);

  const handlePostComment = useCallback(async (postId: string, content: string) => {
    if (!profile) return;
    try {
      await apiClient.commentOnPost(postId, profile.id, content);
      setMyPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));
      toast.success('Comment added!');
    } catch { toast.error('Failed to add comment'); }
  }, [profile]);

  const handlePostShare = useCallback(async (postId: string) => {
    if (!profile) return;
    try {
      const result = await apiClient.sharePost(postId, profile.id);
      // Increment shares count on original
      setMyPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, shares_count: p.shares_count + 1 } : p
      ));
      toast.success('Reposted!');
    } catch { toast.error('Failed to repost'); }
  }, [profile]);

  const handlePostDelete = useCallback(async (postId: string) => {
    try {
      await apiClient.deletePost(postId);
      setMyPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch { toast.error('Failed to delete post'); }
  }, []);

  // ─── Avatar handling ────────────────────────────────────────────────
  const handleAvatarChange = async (avatarUrls: AvatarUrls | null) => {
    if (!profile) return;
    if (isViewOnly) return;
    if (avatarUrls) {
      setEditedProfile({ ...editedProfile, avatar_urls: avatarUrls, avatar: avatarUrls.medium });
      setAvatarPreview((avatarUrls.large || avatarUrls.medium || avatarUrls.small) ?? null);
      if (avatarUrls.medium) {
        localStorage.setItem('userAvatar', avatarUrls.medium);
        try {
          const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
          const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
          byId[profile.id] = avatarUrls.medium;
          byName[profile.username] = avatarUrls.medium;
          localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
          localStorage.setItem('userAvatarCache', JSON.stringify(byName));
        } catch {}
      }
      try {
        const result = await apiClient.updateProfile(profile.id, editedProfile.username, avatarUrls.medium, avatarUrls);
        toast.success('Avatar uploaded to CDN (4 optimized sizes)!');
        try {
          const chatUserRaw = localStorage.getItem('chat-user');
          if (chatUserRaw) {
            const chatUser = JSON.parse(chatUserRaw);
            localStorage.setItem('chat-user', JSON.stringify({ ...chatUser, avatar_url: result.user?.avatar_url || avatarUrls.medium, avatar_urls: result.user?.avatar_urls || avatarUrls }));
          }
        } catch {}
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
      setEditedProfile({ ...editedProfile, avatar: '', avatar_urls: undefined });
      setAvatarPreview(null);
      localStorage.removeItem('userAvatar');
      try {
        const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
        const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
        delete byId[profile.id]; delete byName[profile.username];
        localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
        localStorage.setItem('userAvatarCache', JSON.stringify(byName));
      } catch {}
      toast.success('Avatar removed');
    }
  };

  // ─── Save profile + theme ──────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!profile || !editedProfile) return;
    try {
      console.log('💾 Saving profile + theme to backend...');
      const prevUsername = profile.username;

      // 1. Save profile data
      const result = await apiClient.updateProfile(
        profile.id, editedProfile.username, editedProfile.avatar || undefined,
        editedProfile.avatar_urls, editedProfile.bio, editedProfile.email
      );

      if (result.success) {
        const updatedProfile = {
          ...profile, ...editedProfile,
          username: result.user.display_name || result.user.username,
          bio: result.user.bio ?? editedProfile.bio,
          avatar: result.user.avatar_url || editedProfile.avatar || ''
        };
        setProfile(updatedProfile);
        try { updateUsernameEverywhere(updatedProfile.id, prevUsername, updatedProfile.username!); } catch {}
        StorageUtils.safeSetItem('userProfile', JSON.stringify({ id: updatedProfile.id, username: updatedProfile.username, bio: updatedProfile.bio }));
        if (updatedProfile.avatar) localStorage.setItem('userAvatar', updatedProfile.avatar);
        try {
          const chatUserRaw = localStorage.getItem('chat-user');
          if (chatUserRaw) {
            const chatUser = JSON.parse(chatUserRaw);
            localStorage.setItem('chat-user', JSON.stringify({ ...chatUser, username: updatedProfile.username, avatar_url: updatedProfile.avatar, avatar_urls: updatedProfile.avatar_urls }));
          }
          const detail = { userId: updatedProfile.id, username: updatedProfile.username, prevUsername, email: updatedProfile.email, bio: updatedProfile.bio, avatar: updatedProfile.avatar };
          window.dispatchEvent(new CustomEvent('profile-updated', { detail }));
          const bc = new BroadcastChannel('profile-updates'); bc.postMessage(detail); bc.close();
          try {
            if (socketManager.isConnected()) {
              socketManager.sendProfileUpdate({ username: updatedProfile.username, prevUsername, email: updatedProfile.email, bio: updatedProfile.bio, avatar_url: updatedProfile.avatar });
            }
          } catch {}
        } catch {}
      }

      // 2. Save theme config — always apply locally even if backend fails
      const themeConfig = buildThemeConfig();
      setUserTheme(themeConfig);
      // Persist to localStorage so it survives page reloads even if backend has no theme endpoint
      try { StorageUtils.safeSetItem(`userTheme:${profile.id}`, JSON.stringify(themeConfig)); } catch {}
      try {
        await apiClient.updateTheme(profile.id, themeConfig);
      } catch (themeErr) {
        console.warn('Theme save failed (backend may not support it yet), using local storage fallback:', themeErr);
      }

      setIsEditing(false);
      toast.success('✅ Profile & theme saved!');
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      toast.error('Failed to save profile');
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile || {});
    hydrateThemeState(userTheme);
    setEditTab('profile');
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!profile) return;
    if (passwordSupported === false) { toast.error('Password updates are not enabled on the backend yet.'); return; }
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) { toast.error('Please fill in all password fields'); return; }
    if (passwordData.new !== passwordData.confirm) { toast.error('New passwords do not match'); return; }
    if (passwordData.new.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      const result = await apiClient.updatePassword(profile.id, passwordData.new);
      if (result?.notSupported) { toast.error('Password updates are not enabled on the backend yet.'); return; }
      if (result?.success) { toast.success('Password updated successfully!'); setPasswordData({ current: '', new: '', confirm: '' }); }
      else { toast.error('Failed to update password'); }
    } catch (e) { console.error('Failed to update password', e); toast.error('Failed to update password'); }
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTimeAgo = (timestamp: string) => {
    const now = new Date().getTime(); const then = new Date(timestamp).getTime(); const diff = now - then;
    const minutes = Math.floor(diff / 60000); const hours = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`; if (hours < 24) return `${hours}h ago`; return `${days}d ago`;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ai': return <Zap className="w-4 h-4 text-cyan-300" />;
      case 'video': return <Camera className="w-4 h-4 text-sky-300" />;
      case 'chat': return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case 'room_join': return <User className="w-4 h-4 text-slate-400" />;
      default: return <Activity className="w-4 h-4 text-slate-300" />;
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // Loading state
  // ═══════════════════════════════════════════════════════════════════

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: defaultTheme.gradient }}>
        <div className="glass-card p-6 text-center border border-slate-700/50">
          <p className="text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  const themeCtxValue: ProfileThemeValues = {
    liveTheme, liveGlass, liveEffects, selectedGlassStyle,
    createRipple, ripples, cardRefs,
    headingColor, bodyColor, headingFont, bodyFont,
    editTab, setEditTab,
  };

  return (
    <ProfileThemeCtx.Provider value={themeCtxValue}>
    <div className="min-h-screen relative overflow-hidden" style={{ fontFamily: bodyFont }}>
      {/* Gradient background */}
      <div className="fixed inset-0" style={{ background: pageGradient }} />
      {/* Grain texture */}
      <div className="fixed inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      {/* Floating particles */}
      <FloatingParticles />

      {/* Top-right navigation buttons */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Button onClick={() => router.push('/feed')} variant="glass" className="flex items-center gap-2">
          <Newspaper className="w-4 h-4" />
          Social Feed
        </Button>
        <Button onClick={() => router.push('/chat')} variant="primary" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Search Chat Rooms
        </Button>
      </div>

      {/* Onboarding modal */}
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

      {/* Main content */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8 pt-20 max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/">
            <button className="px-4 py-2 rounded-xl font-medium border-2 transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: liveTheme.text, backdropFilter: 'blur(8px)' }}>
              ← Back to Home
            </button>
          </Link>
        </motion.div>

        {isEditing && !isViewOnly ? (
          /* ═══════════════════════════════════════════════════════════
             EDIT MODE — Tabbed Editor
             ═══════════════════════════════════════════════════════════ */
          <>
            {/* Tab Bar */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-4" refIndex={0}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex gap-2 flex-wrap">
                    <TabButton id="profile" label="Profile" icon={User} />
                    <TabButton id="appearance" label="Appearance" icon={Palette} />
                    <TabButton id="fonts" label="Fonts" icon={Type} />
                    <TabButton id="effects" label="Effects" icon={Sparkles} />
                    <TabButton id="security" label="Security" icon={Shield} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveAll} className="px-5 py-2 rounded-xl font-bold flex items-center gap-2 border-2 transition-all hover:scale-105" style={{ background: liveTheme.accent, borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff', boxShadow: `0 0 20px ${liveTheme.accent}80` }}>
                      <Save className="w-4 h-4" /> Save All
                    </button>
                    <button onClick={handleCancelEdit} className="px-5 py-2 rounded-xl font-medium border-2 transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: liveTheme.text }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ─── Left: Tab Content ─────────────────────── */}
              <div className="lg:col-span-2">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <GlassCard className="p-6" refIndex={1}>
                    {/* ══════════ PROFILE TAB ══════════ */}
                    {editTab === 'profile' && (
                      <div className="space-y-5">
                        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                          <User className="w-5 h-5" style={{ color: liveTheme.accent }} /> Profile Info
                        </h3>
                        {/* Avatar Upload */}
                        <div className="w-full lg:w-auto">
                          <AvatarUpload
                            userId={profile.id}
                            currentAvatar={(editedProfile.avatar_urls || profile.avatar_urls) ?? (profile.avatar ? { thumbnail: profile.avatar, small: profile.avatar, medium: profile.avatar, large: profile.avatar } : undefined)}
                            username={editedProfile.username || profile.username}
                            onAvatarChange={handleAvatarChange}
                          />
                        </div>
                        <Input label="Display Name" value={editedProfile.username || ''} onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })} maxLength={30} className="bg-white/5" />
                        <Input label="Email" type="email" name="email" autoComplete="email" value={editedProfile.email || ''} onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })} className="bg-white/5" />
                        <div className="flex items-center gap-2" style={{ color: bodyColor }}>
                          <input id="show-email" type="checkbox" checked={showEmail} onChange={(e) => {
                            const value = e.target.checked; setShowEmail(value);
                            try { const raw = StorageUtils.safeGetItem('userPrivacy') || '{}'; StorageUtils.safeSetItem('userPrivacy', JSON.stringify({ ...JSON.parse(raw), showEmail: value })); } catch {}
                          }} className="h-4 w-4" style={{ accentColor: liveTheme.accent }} />
                          <label htmlFor="show-email" className="text-sm">Show email on my profile</label>
                        </div>
                        <Textarea label="Bio" value={editedProfile.bio || ''} onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })} maxLength={200} rows={3} className="bg-white/5" />
                      </div>
                    )}

                    {/* ══════════ APPEARANCE TAB ══════════ */}
                    {editTab === 'appearance' && (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                          <Palette className="w-5 h-5" style={{ color: liveTheme.accent }} /> Appearance
                        </h3>
                        {/* Preset / Custom toggle */}
                        <div className="flex gap-2">
                          <button onClick={() => setThemeMode('presets')} className="px-4 py-2 rounded-xl border-2 font-medium transition-all" style={{ background: themeMode === 'presets' ? liveTheme.accent : 'rgba(255,255,255,0.1)', borderColor: themeMode === 'presets' ? liveTheme.accent : 'rgba(255,255,255,0.2)', color: themeMode === 'presets' ? '#fff' : liveTheme.text }}>
                            <Star className="w-4 h-4 inline mr-1" /> Presets
                          </button>
                          <button onClick={() => setThemeMode('custom')} className="px-4 py-2 rounded-xl border-2 font-medium transition-all" style={{ background: themeMode === 'custom' ? liveTheme.accent : 'rgba(255,255,255,0.1)', borderColor: themeMode === 'custom' ? liveTheme.accent : 'rgba(255,255,255,0.2)', color: themeMode === 'custom' ? '#fff' : liveTheme.text }}>
                            <Wand2 className="w-4 h-4 inline mr-1" /> Custom
                          </button>
                        </div>

                        {themeMode === 'presets' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(presetThemes).map(([key, preset]) => (
                              <button key={key} onClick={() => setSelectedPreset(key)} className="p-3 rounded-xl border-2 transition-all hover:scale-[1.02] text-left relative overflow-hidden" style={{ background: selectedPreset === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: selectedPreset === key ? liveTheme.accent : 'rgba(255,255,255,0.2)' }}>
                                <div className="h-10 rounded-lg mb-2" style={{ background: preset.gradient }} />
                                <div className="text-sm font-semibold" style={{ color: liveTheme.text }}>{preset.name}</div>
                                {selectedPreset === key && (<div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: liveTheme.accent }}>✓</div>)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-5">
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: liveTheme.text }}>Gradient Preview</label>
                              <div className="h-16 rounded-xl border-2 pointer-events-none" style={{ background: resolveTheme('custom', customTheme.colors, 'custom').gradient, borderColor: 'rgba(255,255,255,0.3)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {customTheme.colors.map((color, i) => (
                                <div key={i}>
                                  <label className="block text-xs font-medium mb-1" style={{ color: liveTheme.text, opacity: 0.7 }}>Color {i + 1}</label>
                                  <ColorPicker
                                    value={color}
                                    onChange={(hex) => setCustomTheme(prev => { const nc = [...prev.colors]; nc[i] = hex; return { ...prev, colors: nc }; })}
                                    accentColor={liveTheme.accent}
                                    textColor={liveTheme.text}
                                  />
                                </div>
                              ))}
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: liveTheme.text }}>Blur Strength: {customTheme.blurStrength}px</label>
                              <input type="range" min="4" max="32" value={customTheme.blurStrength} onChange={(e) => setCustomTheme(prev => ({ ...prev, blurStrength: parseInt(e.target.value) }))} className="w-full h-3 rounded-lg cursor-pointer theme-range" style={{ '--range-accent': liveTheme.accent, touchAction: 'pan-x' } as any} />
                            </div>
                          </div>
                        )}

                        {/* Glass Styles */}
                        <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <h4 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                            <Layers className="w-5 h-5" style={{ color: liveTheme.accent }} /> Glass Style
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(glassStyles).map(([key, style]) => (
                              <button key={key} onClick={() => setSelectedGlassStyle(key)} className="p-3 rounded-xl border-2 transition-all hover:scale-[1.02] text-left relative" style={{ background: selectedGlassStyle === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: selectedGlassStyle === key ? liveTheme.accent : 'rgba(255,255,255,0.2)' }}>
                                <div className="font-semibold text-sm mb-1" style={{ color: liveTheme.text }}>{style.name}</div>
                                <div className="text-xs" style={{ color: liveTheme.text, opacity: 0.6 }}>Blur: {style.blur}px</div>
                                {selectedGlassStyle === key && (<div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: liveTheme.accent }}>✓</div>)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ══════════ FONTS TAB ══════════ */}
                    {editTab === 'fonts' && (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                          <Type className="w-5 h-5" style={{ color: liveTheme.accent }} /> Typography
                        </h3>
                        {/* Heading Font */}
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: liveTheme.text }}>Heading Font</label>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {Object.entries(fontPresets).map(([key, font]) => (
                              <button key={key} onClick={() => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, heading: key } }))} className="w-full p-3 rounded-lg border-2 transition-all hover:scale-[1.01] text-left" style={{ background: customTheme.fonts.heading === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: customTheme.fonts.heading === key ? liveTheme.accent : 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
                                <div className="font-semibold" style={{ color: liveTheme.text }}>{font.name}</div>
                                <div className="text-xs" style={{ color: liveTheme.text, opacity: 0.6 }}>{font.style}</div>
                              </button>
                            ))}
                            {uploadedFonts.map(font => (
                              <button key={font.name} onClick={() => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, heading: font.name } }))} className="w-full p-3 rounded-lg border-2 transition-all hover:scale-[1.01] text-left" style={{ background: customTheme.fonts.heading === font.name ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: customTheme.fonts.heading === font.name ? liveTheme.accent : 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
                                <div className="font-semibold" style={{ color: liveTheme.text }}>{font.name}</div>
                                <div className="text-xs" style={{ color: liveTheme.text, opacity: 0.6 }}>Custom Upload</div>
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium mb-1" style={{ color: liveTheme.text }}>Heading Color</label>
                              <ColorPicker
                                value={customTheme.fonts.headingColor}
                                onChange={(hex) => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, headingColor: hex } }))}
                                accentColor={liveTheme.accent}
                                textColor={liveTheme.text}
                              />
                            </div>
                            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)', color: liveTheme.text }}>
                              <Upload className="w-4 h-4" /><span className="text-xs font-medium">Upload</span>
                              <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(e) => handleFontUpload(e, 'heading')} className="hidden" />
                            </label>
                          </div>
                        </div>
                        {/* Body Font */}
                        <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <label className="block text-sm font-medium mb-2" style={{ color: liveTheme.text }}>Body Font</label>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {Object.entries(fontPresets).map(([key, font]) => (
                              <button key={key} onClick={() => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, body: key } }))} className="w-full p-3 rounded-lg border-2 transition-all hover:scale-[1.01] text-left" style={{ background: customTheme.fonts.body === key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: customTheme.fonts.body === key ? liveTheme.accent : 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
                                <div className="font-semibold" style={{ color: liveTheme.text }}>{font.name}</div>
                                <div className="text-xs" style={{ color: liveTheme.text, opacity: 0.6 }}>{font.style}</div>
                              </button>
                            ))}
                            {uploadedFonts.map(font => (
                              <button key={font.name} onClick={() => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, body: font.name } }))} className="w-full p-3 rounded-lg border-2 transition-all hover:scale-[1.01] text-left" style={{ background: customTheme.fonts.body === font.name ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderColor: customTheme.fonts.body === font.name ? liveTheme.accent : 'rgba(255,255,255,0.2)', fontFamily: font.family }}>
                                <div className="font-semibold" style={{ color: liveTheme.text }}>{font.name}</div>
                                <div className="text-xs" style={{ color: liveTheme.text, opacity: 0.6 }}>Custom Upload</div>
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium mb-1" style={{ color: liveTheme.text }}>Body Color</label>
                              <ColorPicker
                                value={customTheme.fonts.bodyColor}
                                onChange={(hex) => setCustomTheme(prev => ({ ...prev, fonts: { ...prev.fonts, bodyColor: hex } }))}
                                accentColor={liveTheme.accent}
                                textColor={liveTheme.text}
                              />
                            </div>
                            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)', color: liveTheme.text }}>
                              <Upload className="w-4 h-4" /><span className="text-xs font-medium">Upload</span>
                              <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(e) => handleFontUpload(e, 'body')} className="hidden" />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ══════════ EFFECTS TAB ══════════ */}
                    {editTab === 'effects' && (
                      <div className="space-y-5">
                        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                          <Sparkles className="w-5 h-5" style={{ color: liveTheme.accent }} /> Effects & Animations
                        </h3>
                        {/* Toggle effects */}
                        {([
                          { key: 'depthLayers' as const, label: 'Depth Layers', icon: '🎚️', desc: 'Nested border glow layers' },
                          { key: 'tilt3D' as const, label: '3D Tilt', icon: '🎲', desc: 'Cards tilt on mouse move' },
                          { key: 'ripple' as const, label: 'Click Ripple', icon: '💧', desc: 'Ripple on click' },
                        ]).map(effect => (
                          <label key={effect.key} className="flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-white/5 border transition-all" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                            <span className="flex items-center gap-3" style={{ color: liveTheme.text }}>
                              <span className="text-xl">{effect.icon}</span>
                              <span>
                                <span className="font-medium block">{effect.label}</span>
                                <span className="text-xs opacity-60">{effect.desc}</span>
                              </span>
                            </span>
                            <input type="checkbox" checked={effects[effect.key] as boolean} onChange={(e) => setEffects(prev => ({ ...prev, [effect.key]: e.target.checked }))} className="w-5 h-5 rounded" style={{ accentColor: liveTheme.accent }} />
                          </label>
                        ))}
                        {/* Floating Particles */}
                        <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <label className="block text-sm font-medium mb-3" style={{ color: liveTheme.text }}>Floating Particles</label>
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {Object.keys(ParticleShapes).map(type => (
                              <button key={type} onClick={() => setEffects(prev => ({ ...prev, particles: type }))} className="px-3 py-2 rounded-lg border-2 capitalize text-xs transition-all hover:scale-105 flex items-center justify-center gap-1" style={{ background: effects.particles === type ? liveTheme.accent : 'rgba(255,255,255,0.1)', borderColor: effects.particles === type ? liveTheme.accent : 'rgba(255,255,255,0.2)', color: effects.particles === type ? '#ffffff' : liveTheme.text }}>
                                <span className="w-4 h-4 flex items-center justify-center">{ParticleShapes[type](effects.particles === type ? '#fff' : liveTheme.text)}</span>
                                {type}
                              </button>
                            ))}
                            <button onClick={() => setEffects(prev => ({ ...prev, particles: 'none' }))} className="px-3 py-2 rounded-lg border-2 capitalize text-xs transition-all hover:scale-105" style={{ background: effects.particles === 'none' ? liveTheme.accent : 'rgba(255,255,255,0.1)', borderColor: effects.particles === 'none' ? liveTheme.accent : 'rgba(255,255,255,0.2)', color: effects.particles === 'none' ? '#ffffff' : liveTheme.text }}>
                              none
                            </button>
                          </div>
                          {effects.particles !== 'none' && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm mb-1" style={{ color: liveTheme.text }}>Count: <strong>{effects.particleCount}</strong></label>
                                <input type="range" min="5" max="40" step="5" value={effects.particleCount} onChange={(e) => setEffects(prev => ({ ...prev, particleCount: parseInt(e.target.value) }))} className="w-full h-3 cursor-pointer theme-range" style={{ '--range-accent': liveTheme.accent, touchAction: 'pan-x' } as any} />
                              </div>
                              <div>
                                <label className="block text-sm mb-2" style={{ color: liveTheme.text }}>Speed</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {['slow', 'medium', 'fast'].map(speed => (
                                    <button key={speed} onClick={() => setEffects(prev => ({ ...prev, particleSpeed: speed }))} className="px-3 py-2 rounded-lg border capitalize text-sm" style={{ background: effects.particleSpeed === speed ? liveTheme.accent : 'rgba(255,255,255,0.1)', borderColor: effects.particleSpeed === speed ? liveTheme.accent : 'rgba(255,255,255,0.2)', color: effects.particleSpeed === speed ? '#fff' : liveTheme.text }}>
                                      {speed}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ══════════ SECURITY TAB ══════════ */}
                    {editTab === 'security' && (
                      <div className="space-y-5">
                        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                          <Shield className="w-5 h-5" style={{ color: liveTheme.accent }} /> Security & Privacy
                        </h3>
                        {passwordSupported === false ? (
                          <div className="p-3 border rounded" style={{ borderColor: 'rgba(255,200,0,0.3)', background: 'rgba(255,200,0,0.05)' }}>
                            <p className="text-sm" style={{ color: '#fbbf24' }}>Password updates are not enabled on the backend yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Input type="password" name="current-password" autoComplete="current-password" placeholder="Current password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} className="bg-white/5" disabled={passwordSupported === null} />
                            <Input type="password" name="new-password" autoComplete="new-password" placeholder="New password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} className="bg-white/5" disabled={passwordSupported === null} />
                            <Input type="password" name="confirm-new-password" autoComplete="new-password" placeholder="Confirm new password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="bg-white/5" disabled={passwordSupported === null} />
                            <button onClick={handleChangePassword} className="px-4 py-2 rounded-xl font-medium border-2 transition-all hover:scale-105 text-sm" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: liveTheme.text }} disabled={passwordSupported === null}>
                              Update Password
                            </button>
                          </div>
                        )}
                        <div className="mt-4 p-4 border rounded-lg" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: liveTheme.text }}>
                            <Trash2 className="w-4 h-4 text-red-400" /> Danger Zone
                          </h4>
                          <p className="text-sm mb-3" style={{ color: liveTheme.text, opacity: 0.6 }}>Permanently delete your account and all associated data.</p>
                          <button onClick={handleDeleteAccount} className="px-4 py-2 rounded-xl font-medium text-sm bg-red-600 hover:bg-red-700 text-white transition-all">
                            Delete Account
                          </button>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              </div>

              {/* ─── Right: Gallery + Mini Preview ─────────── */}
              <div className="lg:col-span-1 space-y-6">
                {/* Gallery */}
                <GlassCard className="p-5" refIndex={2}>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                    <Camera className="w-4 h-4" style={{ color: liveTheme.accent }} /> Photo Gallery
                  </h3>
                  <div className="mb-3">
                    <GalleryUpload
                      userId={profile.id}
                      username={profile.username}
                      onItemsAdded={(items: GalleryItem[]) => {
                        if (items.length > 0) window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { count: items.length, userId: profile.id } }));
                      }}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto pr-1">
                    <UserGalleryGrid isViewOnly={false} userId={profile.id} canEdit={true} />
                  </div>
                </GlassCard>

                {/* Live Preview — miniature themed profile showing real appearance */}
                <div className="rounded-2xl overflow-hidden border-2" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2" style={{ color: headingColor, fontFamily: headingFont }}>
                    <Eye className="w-4 h-4" style={{ color: liveTheme.accent }} />
                    <span className="text-sm font-semibold">Live Preview</span>
                  </div>

                  {/* Miniature gradient background */}
                  <div className="relative px-3 pb-3" style={{ background: liveTheme.gradient, minHeight: '200px' }}>
                    {/* Mini floating particles indicator */}
                    {liveEffects.particles !== 'none' && ParticleShapes[liveEffects.particles] && (
                      <div className="absolute top-2 right-3 flex gap-1 opacity-50">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="w-3 h-3" style={{ animation: `float-up ${3 + i}s linear infinite`, animationDelay: `${i * 0.5}s` }}>
                            {ParticleShapes[liveEffects.particles]?.(liveTheme.accent)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inner glass card */}
                    <div
                      className={`${liveGlass.edges} border-2 p-4 mt-2`}
                      style={{
                        background: liveTheme.glassColor,
                        backdropFilter: `blur(${liveGlass.blur}px) saturate(180%)`,
                        WebkitBackdropFilter: `blur(${liveGlass.blur}px) saturate(180%)`,
                        borderColor: 'rgba(255,255,255,0.25)',
                        boxShadow: `0 0 15px ${liveTheme.borderGlow}`,
                      }}
                    >
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0" style={{ borderColor: liveTheme.accent + '80', boxShadow: `0 0 10px ${liveTheme.borderGlow}` }}>
                          <ResponsiveAvatar
                            avatarUrls={(editedProfile.avatar_urls || profile.avatar_urls) ?? (profile.avatar ? { thumbnail: profile.avatar, small: profile.avatar, medium: profile.avatar, large: profile.avatar } : undefined)}
                            username={editedProfile.username || profile.username}
                            size="small"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold truncate" style={{ color: headingColor, fontFamily: headingFont }}>
                            {editedProfile.username || profile.username}
                          </h4>
                          <p className="text-xs truncate" style={{ color: bodyColor, fontFamily: bodyFont, opacity: 0.8 }}>
                            {editedProfile.bio || profile.bio || 'No bio yet'}
                          </p>
                        </div>
                      </div>

                      {/* Mini stats */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: 'Posts', val: '—' },
                          { label: 'Rooms', val: String(profile.totalRooms || 0) },
                        ].map((s, i) => (
                          <div key={i} className="text-center p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${liveTheme.accent}30` }}>
                            <div className="text-xs font-bold" style={{ color: headingColor, fontFamily: headingFont }}>{s.val}</div>
                            <div className="text-[10px]" style={{ color: bodyColor, opacity: 0.6 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Theme info badges */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: liveTheme.accent + '30', color: liveTheme.accent, border: `1px solid ${liveTheme.accent}50` }}>
                        {presetThemes[selectedPreset]?.name || 'Custom'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: liveTheme.text, border: '1px solid rgba(255,255,255,0.2)' }}>
                        {glassStyles[selectedGlassStyle]?.name || 'Glass'}
                      </span>
                      {liveEffects.particles !== 'none' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: liveTheme.text, border: '1px solid rgba(255,255,255,0.2)' }}>
                          {liveEffects.particles} ✨
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════
             VIEW MODE — Themed Profile Display
             ═══════════════════════════════════════════════════════════ */
          <>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6 sm:p-8" refIndex={0}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left: Profile Info */}
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden border-4" style={{ borderColor: liveTheme.accent + '60', boxShadow: `0 0 20px ${liveTheme.borderGlow}` }}>
                        <ResponsiveAvatar
                          avatarUrls={(profile.avatar_urls && (profile.avatar_urls.thumbnail || profile.avatar_urls.medium || profile.avatar_urls.large)) ? profile.avatar_urls : (profile.avatar ? { thumbnail: profile.avatar, small: profile.avatar, medium: profile.avatar, large: profile.avatar } : undefined)}
                          username={profile.username}
                          size="large"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: headingColor, fontFamily: headingFont }}>{profile.username}</h1>
                      {profile.email && showEmail && (
                        <p className="mb-3 text-sm" style={{ color: bodyColor, fontFamily: bodyFont, opacity: 0.8 }}>{profile.email}</p>
                      )}
                      {profile.bio && (
                        <p className="mb-4 max-w-2xl" style={{ color: bodyColor, fontFamily: bodyFont }}>{profile.bio}</p>
                      )}
                      {/* Stats row */}
                      <div className="flex flex-wrap gap-3 mb-4">
                        {[
                          { icon: Users, label: 'Followers', val: followersCount },
                          { icon: Heart, label: 'Following', val: followingCount },
                          { icon: MessageSquare, label: 'Rooms', val: profile.totalRooms || 0 },
                        ].map((s, i) => {
                          const SIcon = s.icon;
                          return (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}>
                              <SIcon className="w-4 h-4" style={{ color: liveTheme.accent }} />
                              <span className="text-sm font-semibold" style={{ color: headingColor }}>{s.val}</span>
                              <span className="text-xs" style={{ color: bodyColor, opacity: 0.7 }}>{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Follow button (other users) or Edit button (own profile) */}
                      <div className="flex items-center gap-3">
                        {isViewOnly && currentUserId ? (
                          <button
                            onClick={handleToggleFollow}
                            disabled={followLoading}
                            className={`px-5 py-2.5 rounded-xl font-medium border-2 transition-all hover:scale-105 flex items-center gap-2 ${
                              isFollowing
                                ? 'bg-white/10 border-slate-500 text-slate-300 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400'
                                : ''
                            }`}
                            style={isFollowing ? {} : {
                              background: liveTheme.accent,
                              borderColor: 'rgba(255,255,255,0.3)',
                              color: '#ffffff',
                              boxShadow: `0 0 15px ${liveTheme.accent}60`
                            }}
                          >
                            {followLoading ? (
                              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : isFollowing ? (
                              <UserMinus className="w-4 h-4" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                            {isFollowing ? 'Unfollow' : 'Follow'}
                          </button>
                        ) : !isViewOnly ? (
                          <button onClick={() => { setIsEditing(true); setEditTab('profile'); }} className="px-5 py-2.5 rounded-xl font-medium border-2 transition-all hover:scale-105 flex items-center gap-2" style={{ background: liveTheme.accent, borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff', boxShadow: `0 0 15px ${liveTheme.accent}60` }}>
                            <Pencil className="w-4 h-4" /> Edit Profile
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Right: Gallery */}
                  <div>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                      <Camera className="w-4 h-4" style={{ color: liveTheme.accent }} /> Photo Gallery
                    </h3>
                    <div className="max-h-72 overflow-y-auto pr-2">
                      <UserGalleryGrid isViewOnly={isViewOnly} userId={profile.id} canEdit={false} />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════
               MY POSTS — Compose + Feed
               ═══════════════════════════════════════════════════════════ */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <GlassCard className="p-3 sm:p-6 lg:p-8" refIndex={1}>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2" style={{ color: headingColor, fontFamily: headingFont }}>
                  <Newspaper className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: liveTheme.accent }} />
                  {isViewOnly ? `${profile.username}'s Posts` : 'My Posts'}
                </h3>

                {/* Post Composer (own profile only) */}
                {!isViewOnly && (
                  <div className="mb-4 sm:mb-6">
                    <PostComposer
                      userId={profile.id}
                      username={profile.username}
                      avatarUrl={profile.avatar}
                      avatarUrls={profile.avatar_urls}
                      onPostCreated={handlePostCreated}
                    />
                  </div>
                )}

                {/* Posts list */}
                <div className="space-y-4">
                  {postsLoading ? (
                    <p className="text-center py-6" style={{ color: bodyColor, opacity: 0.6 }}>Loading posts...</p>
                  ) : myPosts.length === 0 ? (
                    <p className="text-center py-6" style={{ color: bodyColor, opacity: 0.6 }}>
                      {isViewOnly ? 'No posts yet.' : 'No posts yet. Share something!'}
                    </p>
                  ) : (
                    myPosts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                      >
                        <PostCard
                          post={post}
                          currentUserId={profile.id}
                          currentUsername={profile.username}
                          currentAvatarUrls={profile.avatar_urls}
                          onLike={handlePostLike}
                          onComment={handlePostComment}
                          onShare={handlePostShare}
                          onDelete={handlePostDelete}
                        />
                      </motion.div>
                    ))
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}
      </div>

      {/* Animation keyframes */}
      <style>{themeAnimationCSS}</style>
    </div>
    </ProfileThemeCtx.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Page export with Suspense
// ═══════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center"><div className="text-cyan-300">Loading...</div></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Gallery Grid (preserved from original)
// ═══════════════════════════════════════════════════════════════════════

function UserGalleryGrid({ isViewOnly, userId, canEdit }: { isViewOnly: boolean; userId: string; canEdit: boolean }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const refresh = useCallback(async () => {
    if (!userId || userId === 'unknown') { setItems([]); return; }
    try {
      const list = await apiClient.listGallery(userId);
      setItems(list);
    } catch {
      if (!isViewOnly) {
        try {
          const key = `userGallery:${userId}`;
          const raw = StorageUtils.safeGetItem(key) || '[]';
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            setItems(arr.filter((u: unknown) => typeof u === 'string').map((u: string, idx: number) => ({ id: `local-${idx}`, url: u, caption: undefined, created_at: new Date().toISOString() })));
          }
        } catch {}
      } else { setItems([]); }
    }
  }, [userId, isViewOnly]);

  useEffect(() => {
    refresh();
    const onUpdate: EventListener = (ev) => {
      try {
        const ce = ev as unknown as CustomEvent<{ userId?: string }>;
        const targetId = ce?.detail?.userId;
        if (targetId && targetId !== userId) return;
      } catch {}
      refresh();
    };
    try { window.addEventListener('gallery-updated', onUpdate); } catch {}
    return () => { try { window.removeEventListener('gallery-updated', onUpdate); } catch {} };
  }, [userId, refresh]);

  const removeItem = async (i: number) => {
    if (!canEdit) return;
    const item = items[i]; if (!item) return;
    const prev = items;
    setItems(items.filter((_, idx) => idx !== i));
    try {
      await apiClient.deleteGalleryItem(userId, item.id);
      try { window.localStorage.removeItem(`userGallery:${userId}`); } catch {}
      refresh();
    } catch (err) {
      console.error('Delete failed:', err);
      setItems(prev);
      refresh();
    }
  };

  const beginEdit = (i: number) => { if (!canEdit) return; setEditingIndex(i); setEditingTitle(''); };

  const saveTitle = async (i: number) => {
    if (!canEdit) return; setEditingIndex(null);
    try {
      const item = items[i];
      if (item) {
        await apiClient.updateGalleryItem(userId, item.id, { caption: editingTitle });
        const next = items.slice(); next[i] = { ...item, caption: editingTitle }; setItems(next);
      }
    } catch {}
    setEditingTitle('');
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        isViewOnly || !canEdit ? null : (<p className="text-slate-400 text-sm">No photos yet. Upload images to start your gallery.</p>)
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((it, i) => (
            <div key={it.id} className="relative rounded-lg overflow-hidden border border-slate-700/50">
              <div className="w-full h-32 relative">
                <Image src={it.url} alt="Gallery item" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" priority={false} />
              </div>
              {it.caption && (<div className="absolute top-2 left-2 text-xs px-2 py-1 bg-black/60 text-slate-200 rounded">{it.caption}</div>)}
              {canEdit && (<button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-xs px-2 py-1 bg-black/60 text-slate-200 rounded">Remove</button>)}
              {editingIndex === i ? (
                <div className="absolute bottom-2 left-2 right-2 bg-black/60 p-2 rounded flex items-center gap-2">
                  <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} placeholder="Title" className="flex-1 bg-transparent text-slate-200 text-xs border-b border-slate-500/50 focus:outline-none" />
                  {canEdit && (<button onClick={() => saveTitle(i)} className="text-xs px-2 py-1 bg-cyan-500/30 text-cyan-200 rounded">Save</button>)}
                  <button onClick={() => setEditingIndex(null)} className="text-xs px-2 py-1 bg-slate-700/50 text-slate-200 rounded"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                canEdit && (
                  <button onClick={() => beginEdit(i)} className="absolute bottom-2 left-2 text-xs px-2 py-1 bg-black/60 text-slate-200 rounded flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit Title
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
