'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Video, Trash2, ImageIcon, Newspaper, MessageSquare, Music, Lock, Mail } from 'lucide-react'
import { AvatarUpload } from '@/components/AvatarUpload'
import { PostComposer } from '@/components/feed/PostComposer'
import { PostCard } from '@/components/feed/PostCard'
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar'
import { apiClient } from '@/lib/api'
import { MediaPlaybackProvider } from '@/contexts/MediaPlaybackContext'
import { StorageUtils } from '@/lib/storage-utils'
import { updateUsernameEverywhere } from '@/lib/message-utils'
import type { AvatarUrls, GalleryItem } from '@/types/backend'

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerationType = 'image' | 'video' | '3d' | 'gif'

interface SocialLink {
  platform: 'twitter' | 'instagram' | 'website' | 'youtube' | 'github'
  url: string
  handle: string
}

interface GeneratedItem {
  id: string
  type: GenerationType
  url: string
  thumbnail: string
  prompt: string
  createdAt: string
  credits: number
  liked: boolean
}

interface StoreItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  tags: string[]
  imageUrls?: string[]
  videoUrl?: string
  condition: string
  createdAt: string
}

interface UserProfileData {
  id: string
  username: string
  displayName: string
  bio: string
  aboutText: string
  avatarUrl?: string
  avatar_urls?: AvatarUrls
  profile_video_url?: string
  profile_audio_url?: string
  profileTrackName?: string
  email?: string
  accentColor: string
  bannerColor: string
  nameFont: string
  bioFont: string
  aboutFont: string
  bannerMediaUrl?: string
  bannerMediaType?: 'image' | 'video'
  joinedAt: string
  location?: string
  website?: string
  socials: SocialLink[]
  stats: {
    totalGenerations: number
    imagesCreated: number
    videosCreated: number
    creditsUsed: number
    modelsCreated: number
    gifCreated: number
  }
  gallery: GeneratedItem[]
  isOwnProfile: boolean
  plan: 'free' | 'starter' | 'creator' | 'pro' | 'studio'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_PRESETS: { key: string; name: string; family: string; url: string; style: string }[] = [
  { key: 'dm-sans', name: 'DM Sans', family: "'DM Sans',sans-serif", url: '', style: 'Default' },
  { key: 'inter', name: 'Inter', family: 'Inter,system-ui,sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', style: 'Modern sans-serif' },
  { key: 'playfair', name: 'Playfair Display', family: "'Playfair Display',serif", url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap', style: 'Elegant serif' },
  { key: 'poppins', name: 'Poppins', family: 'Poppins,sans-serif', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap', style: 'Friendly rounded' },
  { key: 'montserrat', name: 'Montserrat', family: 'Montserrat,sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap', style: 'Geometric' },
  { key: 'lora', name: 'Lora', family: 'Lora,serif', url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap', style: 'Classic serif' },
  { key: 'dancing', name: 'Dancing Script', family: "'Dancing Script',cursive", url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap', style: 'Handwritten' },
  { key: 'roboto', name: 'Roboto', family: 'Roboto,sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap', style: 'Clean readable' },
  { key: 'bebas', name: 'Bebas Neue', family: "'Bebas Neue',sans-serif", url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap', style: 'Bold display' },
  { key: 'space-mono', name: 'Space Mono', family: "'Space Mono',monospace", url: '', style: 'Monospace' },
]

const ACCENT_PRESETS = [
  '#f97316', '#8b5cf6', '#06b6d4', '#10b981',
  '#f43f5e', '#eab308', '#ec4899', '#3b82f6',
]

const BANNER_PRESETS = [
  '#7c3aed', '#0f1a2e', '#0a1a0f', '#1a0a0a',
  '#0a0f1a', '#1a1a0a', '#0f0a1a', '#1a0f0a',
]

const TYPE_LABEL: Record<GenerationType, string> = {
  image: 'IMG', video: 'VID', '3d': '3D', gif: 'GIF',
}

const TYPE_ICON: Record<GenerationType, string> = {
  image: '◈', video: '▶', '3d': '◆', gif: '◎',
}

const SOCIAL_ICONS: Record<string, string> = {
  twitter: '𝕏', instagram: '◎', website: '↗', youtube: '▶', github: '◈',
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: '#888' },
  starter: { label: 'Starter', color: '#10b981' },
  creator: { label: 'Creator', color: '#3b82f6' },
  pro: { label: 'Pro', color: '#8b5cf6' },
  studio: { label: 'Studio', color: '#f97316' },
}

// ─── Gallery card ─────────────────────────────────────────────────────────────

function GalleryCard({ item, accent, onLike }: {
  item: GeneratedItem; accent: string; onLike: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: `color-mix(in srgb, ${accent} 10%, #111)`,
        borderRadius: 10,
        overflow: 'hidden',
        aspectRatio: item.type === 'video' ? '16/10' : '1',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 2,
        fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em',
        padding: '3px 7px', borderRadius: 4, background: accent, color: '#000',
      }}>
        {TYPE_LABEL[item.type]}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onLike(item.id) }}
        style={{
          position: 'absolute', top: 6, right: 6, zIndex: 2,
          width: 26, height: 26, borderRadius: '50%',
          background: item.liked ? accent : 'rgba(255,255,255,0.1)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: item.liked ? '#000' : 'rgba(255,255,255,0.4)',
          transition: 'all 0.15s',
          opacity: hovered || item.liked ? 1 : 0,
        }}
      >♥</button>

      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26,
        color: `color-mix(in srgb, ${accent} 30%, transparent)`,
        transition: 'font-size 0.2s',
        ...(hovered ? { fontSize: '32px' } : {}),
      }}>
        {TYPE_ICON[item.type]}
      </div>

      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: `linear-gradient(to top, ${accent}f0 0%, transparent 50%)`,
        opacity: hovered ? 1 : 0, transition: 'opacity 0.25s',
        display: 'flex', alignItems: 'flex-end', padding: '10px 12px',
      }}>
        <p style={{
          fontFamily: 'sans-serif', fontSize: 10, color: '#000',
          lineHeight: 1.4, margin: 0, fontWeight: 700,
        }}>
          {item.prompt.slice(0, 52)}{item.prompt.length > 52 ? '…' : ''}
        </p>
      </div>

      <div style={{
        position: 'absolute', bottom: 7, right: 8, zIndex: 2,
        fontFamily: 'monospace', fontSize: 8,
        color: 'rgba(255,255,255,0.2)',
        opacity: hovered ? 0 : 1, transition: 'opacity 0.15s',
      }}>
        {item.credits}cr · {item.createdAt}
      </div>
    </div>
  )
}

// ─── Profile Audio Player ─────────────────────────────────────────────────────

function ProfileAudioPlayer({
  audioUrl,
  trackName,
  accentColor = '#8b5cf6',
  audioRef,
}: {
  audioUrl: string
  trackName: string
  accentColor?: string
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
}) {
  const [playing, setPlaying] = useState(false)
  const [heights, setHeights] = useState([6, 10, 6, 10, 6])
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const FRAMES = [
    [8,18,24,18,8],[12,22,16,26,10],[20,10,28,12,22],
    [6,24,14,20,8],[16,8,22,10,18],[10,26,8,24,14],
  ]
  const frameRef = useRef(0)

  const start = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
    setPlaying(true)
    ivRef.current = setInterval(() => {
      const h = FRAMES[frameRef.current++ % FRAMES.length]
      setHeights(h.map(v => Math.max(4, v + (Math.random() - 0.5) * 4)))
    }, 120)
  }

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setPlaying(false)
    if (ivRef.current) clearInterval(ivRef.current)
    setHeights([6, 10, 6, 10, 6])
  }

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnded = () => stop()
    el.addEventListener('ended', onEnded)
    return () => { el.removeEventListener('ended', onEnded); if (ivRef.current) clearInterval(ivRef.current) }
  }, [audioUrl])

  return (
    <div style={{ marginBottom: 18 }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: 'none' }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'transparent',
        border: 'none',
        borderRadius: 100, padding: '10px 0',
        maxWidth: 320,
      }}>
        <button onClick={playing ? stop : start} style={{
          width: 40, height: 40, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          color: '#fff', fontSize: 13, cursor: 'pointer',
          boxShadow: `0 0 14px ${accentColor}80`,
          paddingLeft: playing ? 0 : 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {playing ? '⏸' : '▶'}
        </button>

        <span style={{
          flex: 1, fontFamily: "'Space Mono',monospace", fontSize: 10,
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {trackName}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
          {heights.map((h, i) => (
            <div key={i} style={{
              width: 3, height: h, borderRadius: 2,
              background: accentColor,
              opacity: [0.4, 0.6, 0.85, 0.6, 0.4][i],
              transition: 'height 0.08s ease',
              boxShadow: playing ? `0 0 4px ${accentColor}99` : 'none',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Profile Content ──────────────────────────────────────────────────────────

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const viewedUserId = (() => { try { return searchParams?.get('userId') || null } catch { return null } })()
  const viewedUsername = (() => { try { return searchParams?.get('username') || null } catch { return null } })()

  const [isViewOnly, setIsViewOnly] = useState(false)
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'gallery' | 'posts' | 'store' | 'about'>('posts')
  const [filterType, setFilterType] = useState<'all' | GenerationType>('all')
  const bioRef = useRef<HTMLInputElement>(null)
  const aboutRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const profileVideoInputRef = useRef<HTMLInputElement>(null)

  // Audio state
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const profileAudioInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Banner media state
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const bannerMediaInputRef = useRef<HTMLInputElement>(null)

  // Font upload state
  const [uploadedFonts, setUploadedFonts] = useState<{name:string;family:string}[]>([])
  const fontInputRef = useRef<HTMLInputElement>(null)
  const [fontSection, setFontSection] = useState<'name' | 'bio' | 'about'>('name')

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Posts state
  const [myPosts, setMyPosts] = useState<any[]>([])
  const [postsLoading, setPostsLoading] = useState(false)

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  // Store
  const [storeItems, setStoreItems] = useState<StoreItem[]>([])
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null)
  const [itemFormData, setItemFormData] = useState({ name: '', description: '', price: '', category: 'Digital Art', tags: '', condition: 'Digital download', imageUrls: [] as string[], videoUrl: '' })
  const [uploadingItemImage, setUploadingItemImage] = useState(false)
  const [uploadingItemVideo, setUploadingItemVideo] = useState(false)
  const [modalImageIdx, setModalImageIdx] = useState(0)
  useEffect(() => { setModalImageIdx(0) }, [selectedItem])
  const itemImageInputRef = useRef<HTMLInputElement>(null)
  const itemVideoInputRef = useRef<HTMLInputElement>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [currentUserAvatarUrls, setCurrentUserAvatarUrls] = useState<any>(null)

  // Gallery media (user-uploaded, excludes DM attachments)
  const [mediaItems, setMediaItems] = useState<GalleryItem[]>([])
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // ─── Load profile from backend ──────────────────────────────────────
  useEffect(() => {
    const storedUser = StorageUtils.safeGetItem('chat-user')
    const userData = storedUser ? JSON.parse(storedUser) : null
    const viewingOtherUser = viewedUserId && (!userData || viewedUserId !== userData.id)
    setIsViewOnly(Boolean(viewingOtherUser))

    if (!viewingOtherUser && !storedUser) {
      router.push('/')
      return
    }

    async function ensureUserExists() {
      try {
        if (!userData) return false
        await apiClient.getProfile(userData.id)
        return true
      } catch {
        try {
          const newUser = await apiClient.createUser(userData!.username)
          const updatedUserData = { ...userData, id: newUser.id }
          StorageUtils.safeSetItem('chat-user', JSON.stringify(updatedUserData))
          return true
        } catch (createError: unknown) {
          const errorMsg = (createError instanceof Error ? createError.message : String(createError || ''))
          if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
            toast.error('Session mismatch. Please log in again.')
            localStorage.removeItem('chat-user')
            localStorage.removeItem('auth-token')
            router.push('/')
            return false
          }
          return false
        }
      }
    }

    async function loadProfile() {
      if (!viewingOtherUser) await ensureUserExists()

      // Clean up base64 avatars
      const storedAvatar = localStorage.getItem('userAvatar')
      if (storedAvatar && storedAvatar.startsWith('data:')) localStorage.removeItem('userAvatar')

      const targetId = viewingOtherUser ? (viewedUserId as string) : userData!.id
      const fallbackUsername = viewingOtherUser ? (viewedUsername || 'User') : (userData?.username || 'User')

      try {
        const bp = await apiClient.getProfile(targetId)
        const joinedAt = bp.created_at ? new Date(bp.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'

        // Read profile customization — prefer backend values, fallback to localStorage for own profile only
        let savedAccent = bp.accent_color || '#f97316'
        let savedBanner = bp.banner_color || '#7c3aed'
        let savedNameFont = bp.name_font || 'dm-sans'
        let savedBioFont = bp.bio_font || 'dm-sans'
        let savedAboutFont = bp.about_font || 'dm-sans'
        let savedBio: string | undefined = undefined
        let savedAboutText: string | undefined = bp.about_text || undefined

        // Only read localStorage for own profile (migration path)
        if (!viewingOtherUser) {
          try {
            const savedColors = localStorage.getItem(`profileColors:${bp.id}`)
            if (savedColors) {
              const parsed = JSON.parse(savedColors)
              if (!(bp.accent_color) && parsed.accent) savedAccent = parsed.accent
              if (!(bp.banner_color) && parsed.banner) savedBanner = parsed.banner
              if (!(bp.name_font)) {
                if (parsed.nameFont) savedNameFont = parsed.nameFont
                else if (parsed.font) savedNameFont = parsed.font
              }
              if (!(bp.bio_font)) {
                if (parsed.bioFont) savedBioFont = parsed.bioFont
                else if (parsed.font) savedBioFont = parsed.font
              }
              if (!(bp.about_font)) {
                if (parsed.aboutFont) savedAboutFont = parsed.aboutFont
                else if (parsed.font) savedAboutFont = parsed.font
              }
              if (parsed.bio !== undefined) savedBio = parsed.bio
              if (!(bp.about_text) && parsed.aboutText !== undefined) savedAboutText = parsed.aboutText
            }
          } catch { /* empty */ }
        }

        // Read banner media — prefer backend
        let savedBannerUrl: string | undefined = bp.banner_media_url || undefined
        let savedBannerType: string | undefined = bp.banner_media_type || undefined
        if (!viewingOtherUser) {
          try {
            const saved = localStorage.getItem(`bannerMedia:${bp.id}`)
            if (saved) {
              const parsed = JSON.parse(saved)
              if (!savedBannerUrl && parsed.url) { savedBannerUrl = parsed.url; savedBannerType = parsed.type }
            }
          } catch { /* empty */ }
        }

        // Read profile video — prefer backend
        let savedVideoUrl: string | undefined = bp.profile_video_url || undefined
        if (!viewingOtherUser) {
          try {
            const saved = localStorage.getItem(`profileVideo:${bp.id}`)
            if (saved) {
              const parsed = JSON.parse(saved)
              if (!savedVideoUrl && parsed.url) { savedVideoUrl = parsed.url }
            }
          } catch { /* empty */ }
        }

        // Read profile audio — prefer backend
        let savedAudioUrl: string | undefined = bp.profile_audio_url || undefined
        let savedTrackName: string | undefined = bp.profile_track_name || undefined
        if (!viewingOtherUser) {
          try {
            const saved = localStorage.getItem(`profileAudio:${bp.id}`)
            if (saved) {
              const parsed = JSON.parse(saved)
              if (!savedAudioUrl && parsed.url) { savedAudioUrl = parsed.url; savedTrackName = parsed.trackName }
            }
          } catch { /* empty */ }
        }

        const p: UserProfileData = {
          id: bp.id,
          username: bp.username,
          displayName: bp.display_name || bp.username,
          bio: savedBio ?? bp.bio ?? '',
          aboutText: savedAboutText ?? bp.about_text ?? '',
          avatarUrl: bp.avatar_url || '',
          avatar_urls: bp.avatar_urls,
          profile_video_url: savedVideoUrl || bp.profile_video_url,
          profile_audio_url: savedAudioUrl || bp.profile_audio_url,
          profileTrackName: savedTrackName || bp.profile_track_name,
          email: bp.email,
          accentColor: savedAccent,
          bannerColor: savedBanner,
          nameFont: savedNameFont,
          bioFont: savedBioFont,
          aboutFont: savedAboutFont,
          bannerMediaUrl: savedBannerUrl,
          bannerMediaType: savedBannerType as 'image' | 'video' | undefined,
          joinedAt,
          isOwnProfile: !viewingOtherUser,
          plan: 'pro',
          socials: [],
          stats: { totalGenerations: 0, imagesCreated: 0, videosCreated: 0, creditsUsed: 0, modelsCreated: 0, gifCreated: 0 },
          gallery: [],
        }
        setProfile(p)
        if (!viewingOtherUser) {
          try {
            if (p.avatarUrl) localStorage.setItem('userAvatar', p.avatarUrl)
            const chatUserRaw = localStorage.getItem('chat-user')
            if (chatUserRaw) {
              const chatUser = JSON.parse(chatUserRaw)
              localStorage.setItem('chat-user', JSON.stringify({ ...chatUser, username: p.displayName, avatar_url: p.avatarUrl, avatar_urls: p.avatar_urls }))
            }
          } catch { /* empty */ }
        }
      } catch {
        setProfile({
          id: targetId,
          username: fallbackUsername,
          displayName: fallbackUsername,
          bio: '',
          aboutText: '',
          accentColor: '#f97316',
          bannerColor: '#7c3aed',
          nameFont: 'dm-sans',
          bioFont: 'dm-sans',
          aboutFont: 'dm-sans',
          bannerMediaUrl: undefined,
          bannerMediaType: undefined,
          joinedAt: 'Unknown',
          isOwnProfile: !viewingOtherUser,
          plan: 'free',
          socials: [],
          stats: { totalGenerations: 0, imagesCreated: 0, videosCreated: 0, creditsUsed: 0, modelsCreated: 0, gifCreated: 0 },
          gallery: [],
        })
      }
    }

    loadProfile()
  }, [router, searchParams, viewedUserId, viewedUsername])

  // ─── Follow state loading ──────────────────────────────────────────
  useEffect(() => {
    const storedUser = StorageUtils.safeGetItem('chat-user')
    if (storedUser) {
      const u = JSON.parse(storedUser)
      setCurrentUserId(u.id)
      setCurrentUserName(u.username || u.displayName || null)
      setCurrentUserAvatarUrls(u.avatar_urls || null)
    }
  }, [])

  useEffect(() => {
    if (!profile?.id || profile.id === 'unknown') return
    ;(async () => {
      try {
        const [followers, following] = await Promise.all([
          apiClient.getFollowers(profile.id),
          apiClient.getFollowing(profile.id),
        ])
        setFollowersCount(followers.length)
        setFollowingCount(following.length)
      } catch { /* empty */ }
    })()
    if (isViewOnly && currentUserId) {
      ;(async () => {
        try {
          const status = await apiClient.checkFollowing(profile.id, currentUserId)
          setIsFollowing(status.following)
        } catch { /* empty */ }
      })()
    }
  }, [profile?.id, isViewOnly, currentUserId])

  const handleToggleFollow = useCallback(async () => {
    if (!profile?.id || !currentUserId || followLoading) return
    setFollowLoading(true)
    try {
      const result = await apiClient.toggleFollow(profile.id, currentUserId)
      setIsFollowing(result.following)
      setFollowersCount(result.followers_count)
      setFollowingCount(result.following_count)
      toast.success(result.following ? `Following ${profile.displayName}` : `Unfollowed ${profile.displayName}`)
    } catch { toast.error('Failed to update follow status') }
    finally { setFollowLoading(false) }
  }, [profile?.id, profile?.displayName, currentUserId, followLoading])

  // ─── Post handlers ──────────────────────────────────────────────────
  const loadUserPosts = useCallback(async (userId: string) => {
    setPostsLoading(true)
    try {
      const posts = await apiClient.getUserPosts(userId)
      setMyPosts(posts)
    } catch {
      console.warn('Could not load user posts')
    } finally {
      setPostsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (profile?.id && profile.id !== 'unknown') {
      loadUserPosts(profile.id)
    }
  }, [profile?.id, loadUserPosts])

  // Load/persist store items via localStorage
  useEffect(() => {
    if (!profile?.id) return
    try {
      const saved = localStorage.getItem(`storeItems:${profile.id}`)
      if (saved) setStoreItems(JSON.parse(saved))
    } catch { /* empty */ }
  }, [profile?.id])

  const handlePostCreated = useCallback((newPost: any) => {
    setMyPosts(prev => [newPost, ...prev])
    toast.success('Post created!')
  }, [])

  const handlePostLike = useCallback(async (postId: string) => {
    if (!profile) return
    try {
      const result = await apiClient.likePost(postId, profile.id)
      setMyPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: result.liked ? p.likes_count + 1 : p.likes_count - 1, user_liked: result.liked }
          : p
      ))
    } catch { toast.error('Failed to like post') }
  }, [profile])

  const handlePostComment = useCallback(async (postId: string, content: string) => {
    if (!currentUserId) return
    try {
      await apiClient.commentOnPost(postId, currentUserId, content)
      setMyPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ))
      toast.success('Comment added!')
    } catch { toast.error('Failed to add comment') }
  }, [currentUserId])

  const handlePostShare = useCallback(async (postId: string) => {
    if (!profile) return
    try {
      await apiClient.sharePost(postId, profile.id)
      setMyPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, shares_count: p.shares_count + 1 } : p
      ))
      toast.success('Reposted!')
    } catch { toast.error('Failed to repost') }
  }, [profile])

  const handlePostDelete = useCallback(async (postId: string) => {
    try {
      await apiClient.deletePost(postId)
      setMyPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('Post deleted')
    } catch { toast.error('Failed to delete post') }
  }, [])

  const handlePostEdit = useCallback(async (postId: string, newContent: string) => {
    setMyPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent } : p))
    try {
      await apiClient.editPost(postId, newContent)
      toast.success('Post updated')
    } catch {
      // Revert on failure
      const posts = await apiClient.getUserPosts(currentUserId || '')
      setMyPosts(posts)
      toast.error('Failed to edit post')
    }
  }, [currentUserId])

  // ─── Banner media upload/delete ─────────────────────────────────────
  const handleBannerMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isVideo && !isImage) { toast.error(`Unsupported file type: ${file.type || 'unknown'}`); return }

    if (isVideo && file.size > 2 * 1024 * 1024 * 1024) { toast.error('Video must be under 2 GB'); return }
    if (isImage && file.size > 20 * 1024 * 1024) { toast.error('Image must be under 20 MB'); return }

    console.log(`📤 Banner upload: ${file.name}, type: ${file.type}, size: ${(file.size / 1024 / 1024).toFixed(1)} MB`)

    setUploadingBanner(true)
    try {
      const formData = new FormData()
      formData.append('files', file)
      formData.append('userId', profile.id)

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000) // 5 min timeout

      const uploadResponse = await fetch(`${backendUrl}/posts/upload-media`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text().catch(() => '')
        console.error('❌ Banner upload failed:', uploadResponse.status, errText)
        throw new Error(`Upload failed (${uploadResponse.status})`)
      }

      const uploadData = await uploadResponse.json()
      const url = uploadData.urls?.[0]
      if (!url) throw new Error('No URL returned')

      const mediaType = isVideo ? 'video' as const : 'image' as const
      setProfile(p => p ? { ...p, bannerMediaUrl: url, bannerMediaType: mediaType } : p)

      // Persist to localStorage
      try {
        localStorage.setItem(`bannerMedia:${profile.id}`, JSON.stringify({ url, type: mediaType }))
      } catch { /* empty */ }

      // Persist to backend
      try { await apiClient.updateProfile(profile.id, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, url, mediaType) } catch { /* empty */ }

      toast.success('Banner updated!')
    } catch (err: any) {
      const msg = err?.name === 'AbortError' ? 'Upload timed out — try a shorter video or lower resolution' : (err?.message || 'Failed to upload banner')
      toast.error(msg)
    } finally {
      setUploadingBanner(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoveBannerMedia = () => {
    if (!profile) return
    setProfile(p => p ? { ...p, bannerMediaUrl: undefined, bannerMediaType: undefined } : p)
    try { localStorage.removeItem(`bannerMedia:${profile.id}`) } catch { /* empty */ }
    // Clear from backend
    try { apiClient.updateProfile(profile.id, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, '', '') } catch { /* empty */ }
    toast.success('Banner media removed')
  }

  // ─── Gallery media load ─────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return
    apiClient.listGallery(profile.id)
      .then(items => setMediaItems(items.filter(i => i.caption !== '__dm__')))
      .catch(() => {})
  }, [profile?.id])

  // ─── Gallery upload handler ─────────────────────────────────────────
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length || !profile) return
    setUploadingGallery(true)
    try {
      const result = await apiClient.uploadGalleryFiles(profile.id, files, undefined, profile.username)
      setMediaItems(prev => [...result.items, ...prev])
      toast.success(`${result.items.length} photo${result.items.length > 1 ? 's' : ''} added to gallery!`)
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploadingGallery(false)
    }
  }

  // ─── Font upload handler ────────────────────────────────────────────
  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      toast.error('Upload a .ttf, .otf, .woff, or .woff2 font file')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '-')
      const fontData = ev.target?.result as string
      const styleId = `custom-font-${fontName}`
      let el = document.getElementById(styleId) as HTMLStyleElement | null
      if (!el) { el = document.createElement('style'); el.id = styleId; document.head.appendChild(el) }
      el.textContent = `@font-face { font-family: "${fontName}"; src: url("${fontData}"); }`
      setUploadedFonts(prev => [...prev.filter(f => f.name !== fontName), { name: fontName, family: `"${fontName}", sans-serif` }])
      const fontKey = fontSection === 'name' ? 'nameFont' : fontSection === 'bio' ? 'bioFont' : 'aboutFont'
      setProfile(p => p ? { ...p, [fontKey]: fontName } : p)
    }
    reader.readAsDataURL(file)
  }

  // ─── Avatar handling ────────────────────────────────────────────────
  const handleAvatarChange = async (avatarUrls: AvatarUrls | null) => {
    if (!profile || isViewOnly) return
    if (avatarUrls) {
      setProfile(p => p ? { ...p, avatar_urls: avatarUrls, avatarUrl: avatarUrls.medium || p.avatarUrl } : p)
      if (avatarUrls.medium) {
        localStorage.setItem('userAvatar', avatarUrls.medium)
        try {
          const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}')
          const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}')
          byId[profile.id] = avatarUrls.medium
          byName[profile.username] = avatarUrls.medium
          localStorage.setItem('userAvatarCacheById', JSON.stringify(byId))
          localStorage.setItem('userAvatarCache', JSON.stringify(byName))
        } catch { /* empty */ }
      }
      try {
        const result = await apiClient.updateProfile(profile.id, profile.username, avatarUrls.medium, avatarUrls)
        toast.success('Avatar uploaded!')
        try {
          const chatUserRaw = localStorage.getItem('chat-user')
          if (chatUserRaw) {
            const chatUser = JSON.parse(chatUserRaw)
            localStorage.setItem('chat-user', JSON.stringify({ ...chatUser, avatar_url: result.user?.avatar_url || avatarUrls.medium, avatar_urls: result.user?.avatar_urls || avatarUrls }))
          }
        } catch { /* empty */ }
        try {
          const detail = { userId: profile.id, username: profile.username, avatar: avatarUrls.medium }
          window.dispatchEvent(new CustomEvent('avatar-updated', { detail }))
          const bc = new BroadcastChannel('avatar-updates'); bc.postMessage(detail); bc.close()
        } catch { /* empty */ }
      } catch {
        toast.error('Failed to save avatar')
      }
    } else {
      setProfile(p => p ? { ...p, avatarUrl: '', avatar_urls: undefined } : p)
      localStorage.removeItem('userAvatar')
      toast.success('Avatar removed')
    }
  }

  // ─── Profile video upload/delete ────────────────────────────────────
  const handleProfileVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!allowed.includes(file.type)) { toast.error('Accepted formats: MP4, WebM, MOV, AVI'); return }
    if (file.size > 2 * 1024 * 1024 * 1024) { toast.error('Video must be under 2 GB'); return }
    setUploadingVideo(true)
    try {
      const result = await apiClient.uploadProfileVideo(profile.id, file)
      if (result.success && result.video_url) {
        setProfile(p => p ? { ...p, profile_video_url: result.video_url } : p)
        try { localStorage.setItem(`profileVideo:${profile.id}`, JSON.stringify({ url: result.video_url })) } catch { /* empty */ }
        // Persist to backend so other users can see it
        try { await apiClient.updateProfile(profile.id, undefined, undefined, undefined, undefined, undefined, result.video_url) } catch { /* empty */ }
        toast.success(`Video uploaded (${result.size_mb.toFixed(1)} MB)`)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload video')
    } finally {
      setUploadingVideo(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleDeleteProfileVideo = async () => {
    if (!profile) return
    try {
      await apiClient.deleteProfileVideo(profile.id)
      setProfile(p => p ? { ...p, profile_video_url: undefined } : p)
      try { localStorage.removeItem(`profileVideo:${profile.id}`) } catch { /* empty */ }
      // Clear on backend so other users don't see stale video
      try { await apiClient.updateProfile(profile.id, undefined, undefined, undefined, undefined, undefined, '') } catch { /* empty */ }
      toast.success('Profile video removed')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete video')
    }
  }

  // ─── Profile audio upload/delete ──────────────────────────────────
  const handleChangePassword = async () => {
    if (!profile) return
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChangingPassword(true)
    try {
      const result = await apiClient.updatePassword(profile.id, newPassword)
      if (result.notSupported) {
        toast.error('Password change is not supported by the server yet')
      } else if (result.success) {
        toast.success('Password updated!')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleProfileAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Audio must be under 20 MB'); return }
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/webm']
    if (!allowed.includes(file.type)) { toast.error('Accepted formats: MP3, WAV, OGG, M4A, AAC'); return }
    setUploadingAudio(true)
    try {
      const result = await apiClient.uploadProfileAudio(profile.id, file)
      if (result.success && result.audio_url) {
        const trackName = file.name.replace(/\.[^/.]+$/, '')
        setProfile(p => p ? { ...p, profile_audio_url: result.audio_url, profileTrackName: trackName } : p)
        try { localStorage.setItem(`profileAudio:${profile.id}`, JSON.stringify({ url: result.audio_url, trackName })) } catch { /* empty */ }
        // Persist to backend so other users can see it
        try { await apiClient.updateProfile(profile.id, undefined, undefined, undefined, undefined, undefined, undefined, result.audio_url) } catch { /* empty */ }
        toast.success(`Audio uploaded (${result.size_mb.toFixed(1)} MB)`)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload audio')
    } finally {
      setUploadingAudio(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleDeleteProfileAudio = async () => {
    if (!profile) return
    try {
      await apiClient.deleteProfileAudio(profile.id)
      setProfile(p => p ? { ...p, profile_audio_url: undefined, profileTrackName: undefined } : p)
      try { localStorage.removeItem(`profileAudio:${profile.id}`) } catch { /* empty */ }
      // Clear on backend
      try { await apiClient.updateProfile(profile.id, undefined, undefined, undefined, undefined, undefined, undefined, '') } catch { /* empty */ }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
      toast.success('Profile audio removed')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete audio')
    }
  }

  // ─── Store handlers ────────────────────────────────────────────────
  const resetItemForm = () => {
    setItemFormData({ name: '', description: '', price: '', category: 'Digital Art', tags: '', condition: 'Digital download', imageUrls: [], videoUrl: '' })
    setEditingItemId(null)
    setShowItemForm(false)
  }

  const editStoreItem = (item: StoreItem) => {
    setItemFormData({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      tags: item.tags.join(', '),
      condition: item.condition,
      imageUrls: item.imageUrls ?? [],
      videoUrl: item.videoUrl ?? '',
    })
    setEditingItemId(item.id)
    setShowItemForm(true)
    setSelectedItem(null)
  }

  const addStoreItem = () => {
    if (!profile || !itemFormData.name.trim() || !itemFormData.price) return
    const baseFields = {
      name: itemFormData.name.trim(),
      description: itemFormData.description.trim(),
      price: parseFloat(itemFormData.price) || 0,
      category: itemFormData.category,
      tags: itemFormData.tags.split(',').map(t => t.trim()).filter(Boolean),
      imageUrls: itemFormData.imageUrls.length > 0 ? itemFormData.imageUrls : undefined,
      videoUrl: itemFormData.videoUrl || undefined,
      condition: itemFormData.condition.trim() || 'Digital download',
    }
    if (editingItemId) {
      // Update existing item
      setStoreItems(prev => {
        const next = prev.map(i => i.id === editingItemId ? { ...i, ...baseFields } : i)
        try { localStorage.setItem(`storeItems:${profile.id}`, JSON.stringify(next)) } catch { /* empty */ }
        return next
      })
      resetItemForm()
      toast.success('Listing updated!')
    } else {
      // Create new item
      const item: StoreItem = { id: Date.now().toString(), ...baseFields, createdAt: new Date().toISOString() }
      setStoreItems(prev => {
        const next = [item, ...prev]
        try { localStorage.setItem(`storeItems:${profile.id}`, JSON.stringify(next)) } catch { /* empty */ }
        return next
      })
      resetItemForm()
      toast.success('Item listed!')
    }
  }

  const deleteStoreItem = (id: string) => {
    if (!profile) return
    if (!window.confirm('Remove this listing?')) return
    setStoreItems(prev => {
      const next = prev.filter(i => i.id !== id)
      try { localStorage.setItem(`storeItems:${profile.id}`, JSON.stringify(next)) } catch { /* empty */ }
      return next
    })
    toast.success('Listing removed')
  }

  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !profile) return
    const remaining = 8 - itemFormData.imageUrls.length
    if (remaining <= 0) { toast.error('Maximum 8 images reached'); return }
    const toUpload = files.slice(0, remaining)
    if (files.length > remaining) toast.error(`Only ${remaining} slot${remaining !== 1 ? 's' : ''} left — uploading first ${remaining}`)
    setUploadingItemImage(true)
    let uploaded = 0
    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image`); continue }
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} must be under 20 MB`); continue }
      try {
        const formData = new FormData()
        formData.append('files', file)
        formData.append('userId', profile.id)
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com'
        const res = await fetch(`${backendUrl}/posts/upload-media`, { method: 'POST', body: formData })
        if (!res.ok) throw new Error(`Upload failed (${res.status})`)
        const data = await res.json()
        const url = data.urls?.[0]
        if (!url) throw new Error('No URL returned')
        setItemFormData(p => ({ ...p, imageUrls: [...p.imageUrls, url] }))
        uploaded++
      } catch (err: any) {
        toast.error(err?.message || 'Failed to upload image')
      }
    }
    setUploadingItemImage(false)
    if (e.target) e.target.value = ''
    if (uploaded > 0) toast.success(`${uploaded} image${uploaded !== 1 ? 's' : ''} uploaded!`)
  }

  const handleItemVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (!file.type.startsWith('video/')) { toast.error('Please upload a video file'); return }
    if (file.size > 500 * 1024 * 1024) { toast.error('Video must be under 500 MB'); return }
    setUploadingItemVideo(true)
    try {
      const formData = new FormData()
      formData.append('files', file)
      formData.append('userId', profile.id)
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com'
      const res = await fetch(`${backendUrl}/posts/upload-media`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      const data = await res.json()
      const url = data.urls?.[0]
      if (!url) throw new Error('No URL returned')
      setItemFormData(p => ({ ...p, videoUrl: url }))
      toast.success('Video uploaded!')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload video')
    } finally {
      setUploadingItemVideo(false)
      if (e.target) e.target.value = ''
    }
  }

  // ─── Save all edits ────────────────────────────────────────────────
  const saveEdits = async () => {
    if (!profile) return
    const newName = nameRef.current?.value || profile.displayName
    const newBio = bioRef.current?.value ?? profile.bio
    const newAbout = aboutRef.current?.value ?? profile.aboutText
    const newEmail = emailRef.current?.value ?? profile.email
    const prevUsername = profile.username

    setProfile(p => p ? { ...p, displayName: newName, bio: newBio, aboutText: newAbout, email: newEmail } : p)

    // Persist accent, banner & font to localStorage
    try {
      localStorage.setItem(`profileColors:${profile.id}`, JSON.stringify({ accent: profile.accentColor, banner: profile.bannerColor, nameFont: profile.nameFont, bioFont: profile.bioFont, aboutFont: profile.aboutFont, bio: newBio, aboutText: newAbout }))
    } catch { /* empty */ }

    try {
      const result = await apiClient.updateProfile(
        profile.id, newName, profile.avatarUrl || undefined,
        profile.avatar_urls, newBio, newEmail,
        undefined, undefined,
        profile.accentColor, profile.bannerColor,
        profile.nameFont, profile.bioFont, profile.aboutFont,
        profile.bannerMediaUrl, profile.bannerMediaType,
        newAbout
      )
      if (result.success) {
        try { updateUsernameEverywhere(profile.id, prevUsername, newName) } catch { /* empty */ }
        StorageUtils.safeSetItem('userProfile', JSON.stringify({ id: profile.id, username: newName, bio: newBio }))
        try {
          const chatUserRaw = localStorage.getItem('chat-user')
          if (chatUserRaw) {
            const chatUser = JSON.parse(chatUserRaw)
            localStorage.setItem('chat-user', JSON.stringify({ ...chatUser, username: newName, avatar_url: profile.avatarUrl, avatar_urls: profile.avatar_urls }))
          }
          const detail = { userId: profile.id, username: newName, prevUsername, email: newEmail, bio: newBio, avatar: profile.avatarUrl }
          window.dispatchEvent(new CustomEvent('profile-updated', { detail }))
          const bc = new BroadcastChannel('profile-updates'); bc.postMessage(detail); bc.close()
        } catch { /* empty */ }
        toast.success('Profile saved!')
      }
    } catch {
      toast.error('Failed to save profile')
    }
    setEditMode(false)
  }

  // ─── Derived values ──────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="lp-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: '0.12em' }}>
          LOADING...
        </div>
      </div>
    )
  }

  const accent = profile.accentColor
  const banner = profile.bannerColor
  const resolveFont = (key: string) => {
    const preset = FONT_PRESETS.find(f => f.key === key)
    const uploaded = uploadedFonts.find(f => f.name === key)
    return { family: preset?.family || uploaded?.family || "'DM Sans',sans-serif", url: preset?.url || '' }
  }
  const nameFont = resolveFont(profile.nameFont || 'dm-sans')
  const bioFont = resolveFont(profile.bioFont || 'dm-sans')
  const aboutFont = resolveFont(profile.aboutFont || 'dm-sans')
  const activeSectionFontKey = fontSection === 'name' ? profile.nameFont : fontSection === 'bio' ? profile.bioFont : profile.aboutFont
  const fontUrls = Array.from(new Set([nameFont.url, bioFont.url, aboutFont.url].filter(Boolean)))
  const filtered = filterType === 'all' ? profile.gallery : profile.gallery.filter(i => i.type === filterType)
  const plan = PLAN_LABELS[profile.plan]
  const canEdit = profile.isOwnProfile && !isViewOnly

  const toggleLike = (id: string) =>
    setProfile(p => p ? { ...p, gallery: p.gallery.map(i => i.id === id ? { ...i, liked: !i.liked } : i) } : p)

  return (
    <>
      {fontUrls.map(u => <link key={u} rel="stylesheet" href={u} />)}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap');

        *{box-sizing:border-box;margin:0;padding:0;}

        .lp-root {
          font-family:'DM Sans',sans-serif;
          background:#0a0a0a;
          min-height:100vh;
          padding:24px 16px 80px;
          padding-top:calc(env(safe-area-inset-top, 0px) + 24px);
          position:relative;
        }
        @media(min-width:768px){ .lp-root { padding:40px 32px 80px; padding-top:calc(env(safe-area-inset-top, 0px) + 40px); } }

        .lp-root::before {
          content:'';
          position:fixed;
          top:0; left:50%;
          transform:translateX(-50%);
          width:900px; height:600px;
          background:radial-gradient(ellipse at 50% 0%,
            color-mix(in srgb,var(--accent) 12%,transparent) 0%,
            transparent 65%);
          pointer-events:none;
          z-index:0;
        }

        .lp-back {
          position:relative; z-index:2;
          margin:0 0 20px;
        }

        .lp-back a {
          font-family:'Space Mono',monospace;
          font-size:10px;
          letter-spacing:0.12em;
          text-transform:uppercase;
          color:rgba(255,255,255,0.85);
          text-decoration:none;
          transition:color 0.15s;
          display:inline-flex;
          align-items:center;
          gap:4px;
          line-height:1;
        }
        .lp-back a:hover { color:#ffffff; }

        .lp-nav-btn {
          display:flex; align-items:center; gap:6px;
          padding:6px 12px;
          font-family:'DM Sans',sans-serif;
          font-size:13px; font-weight:500;
          color:rgba(255,255,255,0.7);
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:8px;
          cursor:pointer;
          backdrop-filter:blur(12px);
          -webkit-backdrop-filter:blur(12px);
          transition:all 0.15s;
        }
        .lp-nav-btn:hover {
          background:rgba(255,255,255,0.12);
          color:#fff;
        }
        .lp-nav-btn-primary {
          background:rgba(6,182,212,0.15);
          border-color:rgba(6,182,212,0.3);
          color:rgba(6,182,212,0.9);
        }
        .lp-nav-btn-primary:hover {
          background:rgba(6,182,212,0.25);
          color:#06b6d4;
        }
        .lp-nav-label { display:none; }
        .lp-nav-label-sm { display:inline; }
        @media(min-width:640px){
          .lp-nav-btn { padding:8px 16px; font-size:14px; }
          .lp-nav-label { display:inline; }
          .lp-nav-label-sm { display:none; }
        }

        /* Desktop: two-column layout */
        .lp-layout {
          position:relative; z-index:1;
          display:grid;
          grid-template-columns:1fr;
          gap:20px;
        }

        .lp-card {
          background:transparent;
          border-radius:0;
          border:none;
          overflow:hidden;
          box-shadow:none;
        }

        .profile-post-card .glass-card {
          background:transparent;
          border:none;
          box-shadow:none;
          backdrop-filter:none;
          -webkit-backdrop-filter:none;
        }

        /* Shrink avatar in profile posts */
        .profile-post-card .glass-card > div:first-child .relative.flex-shrink-0.overflow-hidden.rounded-full {
          width:32px !important;
          height:32px !important;
        }
        @media(min-width:640px){
          .profile-post-card .glass-card > div:first-child .relative.flex-shrink-0.overflow-hidden.rounded-full {
            width:36px !important;
            height:36px !important;
          }
        }

        /* Enlarge post media in profile posts */
        .profile-post-card img,
        .profile-post-card video {
          max-height:40rem !important;
          width:100% !important;
        }
        .profile-post-card .grid img,
        .profile-post-card .grid video {
          aspect-ratio:auto !important;
          object-fit:contain !important;
        }

        .lp-banner {
          height:220px;
          position:relative;
          overflow:hidden;
          background:#0a0a12;
        }
        @media(min-width:768px){
          .lp-banner { height:auto; overflow:visible; min-height:44px; }
          .lp-banner-media { position:static !important; width:100% !important; height:auto !important; display:block; object-fit:unset !important; }
        }

        .lp-banner-orb {
          position:absolute;
          border-radius:50%;
          pointer-events:none;
        }

        .lp-banner-tag {
          position:absolute;
          bottom:14px; left:20px;
          font-family:'Space Mono',monospace;
          font-size:9px;
          letter-spacing:0.2em;
          text-transform:uppercase;
          color:rgba(255,255,255,0.3);
        }

        .lp-plan {
          position:absolute;
          top:14px; right:14px;
          font-family:'Space Mono',monospace;
          font-size:9px;
          font-weight:700;
          letter-spacing:0.12em;
          text-transform:uppercase;
          padding:4px 10px;
          border-radius:20px;
          border:1px solid;
        }

        .lp-banner-edit {
          position:absolute;
          top:14px; left:14px;
          width:30px; height:30px;
          border-radius:50%;
          background:rgba(0,0,0,0.55);
          border:1px solid rgba(255,255,255,0.35);
          color:rgba(255,255,255,0.9);
          display:flex; align-items:center; justify-content:center;
          font-size:14px;
          cursor:pointer;
          transition:all 0.15s;
          backdrop-filter:blur(8px);
        }
        .lp-banner-edit:hover {
          background:rgba(0,0,0,0.75);
          color:#ffffff;
          border-color:rgba(255,255,255,0.7);
        }

        .lp-body { padding:0 24px 28px; }

        .lp-avatar-row {
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          margin-top:-44px;
          margin-bottom:18px;
        }

        .lp-avatar {
          width:88px; height:88px;
          border-radius:50%;
          background:linear-gradient(135deg,var(--accent),var(--banner));
          border:3px solid #111;
          display:flex;
          align-items:center;
          justify-content:center;
          font-family:'Playfair Display',serif;
          font-size:34px;
          font-weight:900;
          color:#fff;
          position:relative;
          overflow:hidden;
          flex-shrink:0;
          cursor:pointer;
        }

        .lp-avatar-hover {
          position:absolute; inset:0;
          background:rgba(0,0,0,0.5);
          display:flex; align-items:center; justify-content:center;
          font-size:16px; color:#fff;
          opacity:0; transition:opacity 0.15s;
        }
        .lp-avatar:hover .lp-avatar-hover { opacity:1; }

        .lp-action-row { display:flex; gap:8px; }

        .lp-follow-btn {
          padding:8px 20px;
          border-radius:20px;
          border:none;
          background:var(--accent);
          color:#000;
          font-family:'Space Mono',monospace;
          font-size:10px;
          font-weight:700;
          letter-spacing:0.08em;
          cursor:pointer;
          transition:opacity 0.15s;
        }
        .lp-follow-btn:hover { opacity:0.85; }

        .lp-icon-btn {
          width:34px; height:34px;
          border-radius:50%;
          background:rgba(255,255,255,0.06);
          border:0.5px solid rgba(255,255,255,0.1);
          color:rgba(255,255,255,0.5);
          display:flex; align-items:center; justify-content:center;
          font-size:14px;
          cursor:pointer;
          transition:all 0.15s;
        }
        .lp-icon-btn:hover {
          background:rgba(255,255,255,0.1);
          color:rgba(255,255,255,0.9);
        }

        .lp-name {
          font-family:'Playfair Display',serif;
          font-size:17px;
          font-weight:900;
          color:#f0ede8;
          letter-spacing:-0.02em;
          line-height:1.0;
          margin-bottom:4px;
        }
        @media(min-width:768px){ .lp-name { font-size:19px; } }

        .lp-handle {
          font-family:'Space Mono',monospace;
          font-size:10px;
          color:rgba(240,237,232,0.75);
          letter-spacing:0.1em;
          margin-bottom:14px;
        }

        .lp-bio {
          font-size:13px;
          color:rgba(240,237,232,0.5);
          line-height:1.7;
          font-weight:300;
          margin-bottom:18px;
        }

        .lp-details {
          display:flex;
          flex-wrap:wrap;
          gap:14px;
          margin-bottom:22px;
        }

        .lp-detail {
          display:flex;
          align-items:center;
          gap:5px;
          font-family:'Space Mono',monospace;
          font-size:9px;
          letter-spacing:0.08em;
          color:rgba(240,237,232,0.28);
        }

        .lp-detail-dot {
          width:4px; height:4px;
          border-radius:50%;
          background:var(--accent);
          opacity:0.6;
          flex-shrink:0;
        }

        .lp-stats-strip {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          background:rgba(255,255,255,0.03);
          border:0.5px solid rgba(255,255,255,0.06);
          border-radius:14px;
          overflow:hidden;
          margin-bottom:24px;
        }

        .lp-stat {
          padding:14px 12px;
          text-align:center;
          border-right:0.5px solid rgba(255,255,255,0.05);
          position:relative;
          transition:background 0.2s;
        }
        .lp-stat:last-child { border-right:none; }
        .lp-stat:hover { background:rgba(255,255,255,0.03); }

        .lp-stat::before {
          content:'';
          position:absolute;
          top:0; left:0; right:0;
          height:2px;
          background:var(--accent);
          transform:scaleX(0);
          transform-origin:left;
          transition:transform 0.35s ease;
        }
        .lp-stat:hover::before { transform:scaleX(1); }

        .lp-stat-n {
          font-family:'Space Mono',monospace;
          font-size:18px;
          font-weight:700;
          color:var(--accent);
          line-height:1;
          margin-bottom:4px;
        }

        .lp-stat-l {
          font-size:10px;
          color:rgba(240,237,232,0.75);
          font-weight:300;
          line-height:1.2;
        }

        .lp-socials {
          display:flex;
          gap:8px;
          margin-bottom:24px;
          flex-wrap:wrap;
        }

        .lp-soc {
          display:flex;
          align-items:center;
          gap:7px;
          padding:7px 12px;
          border-radius:20px;
          background:rgba(255,255,255,0.04);
          border:0.5px solid rgba(255,255,255,0.08);
          text-decoration:none;
          color:rgba(240,237,232,0.45);
          font-family:'Space Mono',monospace;
          font-size:9px;
          letter-spacing:0.08em;
          transition:all 0.15s;
        }
        .lp-soc:hover {
          background:rgba(255,255,255,0.08);
          border-color:var(--accent);
          color:var(--accent);
        }

        .lp-soc-icon {
          font-size:11px;
          color:var(--accent);
          opacity:0.7;
        }

        .lp-divider {
          height:0.5px;
          background:rgba(255,255,255,0.06);
          margin:0 -24px 20px;
        }



        /* Tab bar */
        .lp-tabs {
          display:flex;
          gap:0;
          margin-bottom:20px;
          border-bottom:0.5px solid rgba(255,255,255,0.06);
        }

        .lp-tab {
          font-family:'Space Mono',monospace;
          font-size:9px;
          letter-spacing:0.14em;
          text-transform:uppercase;
          padding:10px 16px;
          border:none;
          background:none;
          color:rgba(255,255,255,0.6);
          cursor:pointer;
          position:relative;
          transition:color 0.15s;
        }
        .lp-tab.active { color:rgba(240,237,232,0.9); }
        .lp-tab.active::after {
          content:'';
          position:absolute;
          bottom:-0.5px; left:16px; right:16px;
          height:2px;
          background:var(--accent);
          border-radius:1px;
        }
        .lp-tab:hover:not(.active) { color:rgba(255,255,255,0.8); }

        .lp-filters {
          display:flex;
          gap:6px;
          margin-bottom:16px;
          flex-wrap:wrap;
        }

        .lp-chip {
          font-family:'Space Mono',monospace;
          font-size:8px;
          letter-spacing:0.12em;
          text-transform:uppercase;
          padding:4px 10px;
          border-radius:20px;
          border:0.5px solid rgba(255,255,255,0.08);
          background:transparent;
          color:rgba(255,255,255,0.25);
          cursor:pointer;
          transition:all 0.15s;
        }
        .lp-chip.active {
          border-color:var(--accent);
          color:var(--accent);
          background:color-mix(in srgb,var(--accent) 10%,#111);
        }
        .lp-chip:hover:not(.active) {
          border-color:rgba(255,255,255,0.18);
          color:rgba(255,255,255,0.5);
        }

        .lp-gallery {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:8px;
        }
        @media(min-width:768px){ .lp-gallery { grid-template-columns:repeat(3,1fr); } }

        /* Stats cards */
        .lp-stats-cards {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          margin-bottom:20px;
        }

        .lp-scard {
          background:rgba(255,255,255,0.03);
          border:0.5px solid rgba(255,255,255,0.06);
          border-radius:12px;
          padding:16px;
          position:relative;
          overflow:hidden;
        }
        .lp-scard::after {
          content:'';
          position:absolute;
          top:0; left:0;
          width:100%; height:2px;
          background:var(--accent);
          opacity:0.6;
          border-radius:12px 12px 0 0;
        }

        .lp-scard-n {
          font-family:'Playfair Display',serif;
          font-size:28px;
          font-weight:900;
          color:#f0ede8;
          line-height:1;
          margin-bottom:4px;
        }

        .lp-scard-l {
          font-size:11px;
          color:rgba(240,237,232,0.28);
          font-weight:300;
        }

        .lp-bar { margin-bottom:14px; }
        .lp-bar-row { display:flex; justify-content:space-between; margin-bottom:5px; }
        .lp-bar-name { font-size:12px; color:rgba(240,237,232,0.45); font-weight:300; }
        .lp-bar-val { font-family:'Space Mono',monospace; font-size:10px; color:var(--accent); }
        .lp-bar-track { height:3px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; }
        .lp-bar-fill { height:100%; border-radius:2px; background:var(--accent); transition:width 1s cubic-bezier(0.34,1.56,0.64,1); }

        .lp-about-bio {
          font-family:'Playfair Display',serif;
          font-size:15px;
          font-weight:700;
          font-style:italic;
          color:rgba(240,237,232,0.8);
          line-height:1.7;
          margin-bottom:20px;
        }

        .lp-about-detail {
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:10px;
          font-size:12px;
          color:rgba(240,237,232,0.4);
          font-weight:300;
        }

        .lp-about-icon {
          width:26px; height:26px;
          border-radius:8px;
          background:color-mix(in srgb,var(--accent) 12%,#111);
          border:0.5px solid color-mix(in srgb,var(--accent) 25%,transparent);
          display:flex; align-items:center; justify-content:center;
          font-size:11px;
          color:var(--accent);
          flex-shrink:0;
        }

        .lp-soc-cards {
          display:flex;
          flex-direction:column;
          gap:8px;
          margin-top:20px;
        }

        .lp-soc-card {
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px 14px;
          border-radius:12px;
          background:rgba(255,255,255,0.03);
          border:0.5px solid rgba(255,255,255,0.06);
          text-decoration:none;
          transition:border-color 0.15s, background 0.15s;
        }
        .lp-soc-card:hover {
          background:rgba(255,255,255,0.05);
          border-color:color-mix(in srgb,var(--accent) 40%,transparent);
        }

        .lp-soc-card-icon {
          width:32px; height:32px;
          border-radius:10px;
          background:color-mix(in srgb,var(--accent) 12%,#111);
          border:0.5px solid color-mix(in srgb,var(--accent) 25%,transparent);
          display:flex; align-items:center; justify-content:center;
          font-size:13px;
          color:var(--accent);
          flex-shrink:0;
        }

        .lp-soc-card-platform {
          font-family:'Space Mono',monospace;
          font-size:8px;
          letter-spacing:0.14em;
          text-transform:uppercase;
          color:rgba(240,237,232,0.2);
          margin-bottom:2px;
        }

        .lp-soc-card-handle {
          font-family:'Space Mono',monospace;
          font-size:11px;
          color:rgba(240,237,232,0.55);
        }

        /* Edit panel */
        .lp-edit-panel {
          background:rgba(255,255,255,0.03);
          border:0.5px solid rgba(255,255,255,0.08);
          border-radius:14px;
          padding:20px;
          margin-bottom:20px;
          animation:lpIn 0.2s ease both;
        }
        @keyframes lpIn {
          from{opacity:0;transform:translateY(-8px);}
          to{opacity:1;transform:translateY(0);}
        }

        .lp-edit-title {
          font-family:'Space Mono',monospace;
          font-size:9px;
          letter-spacing:0.18em;
          text-transform:uppercase;
          color:rgba(255,255,255,0.25);
          margin-bottom:16px;
        }

        .lp-edit-row { margin-bottom:14px; }

        .lp-edit-label {
          display:block;
          font-size:10px;
          color:rgba(255,255,255,0.3);
          margin-bottom:6px;
          font-family:'Space Mono',monospace;
          letter-spacing:0.08em;
        }

        .lp-input {
          width:100%;
          padding:9px 12px;
          border:0.5px solid rgba(255,255,255,0.1);
          border-radius:8px;
          background:rgba(255,255,255,0.04);
          color:#f0ede8;
          font-family:'DM Sans',sans-serif;
          font-size:14px;
          outline:none;
          transition:border-color 0.2s;
        }
        .lp-input:focus { border-color:var(--accent); }

        .lp-textarea {
          width:100%;
          padding:9px 12px;
          border:0.5px solid rgba(255,255,255,0.1);
          border-radius:8px;
          background:rgba(255,255,255,0.04);
          color:#f0ede8;
          font-family:'DM Sans',sans-serif;
          font-size:14px;
          font-weight:300;
          outline:none;
          resize:vertical;
          min-height:80px;
          line-height:1.65;
          transition:border-color 0.2s;
        }
        .lp-textarea:focus { border-color:var(--accent); }

        .lp-color-section { margin-bottom:4px; }
        .lp-color-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }

        .lp-dot {
          width:26px; height:26px;
          border-radius:50%;
          cursor:pointer;
          border:2px solid transparent;
          transition:transform 0.15s,border-color 0.15s;
        }
        .lp-dot.active { border-color:#fff; transform:scale(1.2); }

        .lp-edit-actions { display:flex; gap:8px; margin-top:16px; }

        .lp-save {
          flex:1;
          padding:10px;
          border-radius:10px;
          border:none;
          background:var(--accent);
          color:#000;
          font-family:'Space Mono',monospace;
          font-size:10px;
          font-weight:700;
          letter-spacing:0.1em;
          text-transform:uppercase;
          cursor:pointer;
          transition:opacity 0.15s;
        }
        .lp-save:hover { opacity:0.85; }

        .lp-cancel {
          padding:10px 16px;
          border-radius:10px;
          border:0.5px solid rgba(255,255,255,0.1);
          background:transparent;
          color:rgba(255,255,255,0.35);
          font-family:'Space Mono',monospace;
          font-size:10px;
          letter-spacing:0.1em;
          text-transform:uppercase;
          cursor:pointer;
          transition:all 0.15s;
        }
        .lp-cancel:hover {
          border-color:rgba(255,255,255,0.2);
          color:rgba(255,255,255,0.6);
        }

        .lp-empty {
          grid-column:1/-1;
          padding:40px 20px;
          text-align:center;
          color:rgba(255,255,255,0.15);
          font-size:12px;
          font-weight:300;
          border:0.5px dashed rgba(255,255,255,0.08);
          border-radius:10px;
        }

        /* Video upload button */
        .lp-video-btn {
          display:flex;
          align-items:center;
          gap:8px;
          padding:10px 16px;
          border-radius:10px;
          border:0.5px dashed rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.03);
          color:rgba(255,255,255,0.35);
          font-family:'Space Mono',monospace;
          font-size:10px;
          letter-spacing:0.08em;
          cursor:pointer;
          transition:all 0.15s;
        }
        .lp-video-btn:hover {
          border-color:rgba(255,255,255,0.25);
          color:rgba(255,255,255,0.6);
          background:rgba(255,255,255,0.05);
        }
        .lp-video-btn:disabled {
          opacity:0.5;
          cursor:not-allowed;
        }

        .lp-spinner {
          width:12px; height:12px;
          border:2px solid currentColor;
          border-top-color:transparent;
          border-radius:50%;
          animation:spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* ── Store ── */
        .lp-store-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
          gap:12px;
        }
        @media(min-width:480px){ .lp-store-grid { grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); } }

        .lp-store-card {
          background:rgba(255,255,255,0.03);
          border:0.5px solid rgba(255,255,255,0.07);
          border-radius:12px;
          overflow:hidden;
          cursor:pointer;
          transition:border-color 0.15s,transform 0.15s,box-shadow 0.15s;
          position:relative;
        }
        .lp-store-card:hover {
          border-color:rgba(255,255,255,0.14);
          transform:translateY(-2px);
          box-shadow:0 6px 20px rgba(0,0,0,0.4);
        }

        .lp-store-preview {
          position:relative;
          width:100%;
          aspect-ratio:4/3;
          background:#0a0a0a;
          overflow:hidden;
        }

        .lp-store-video-badge {
          position:absolute;
          top:8px; left:8px;
          background:rgba(0,0,0,0.65);
          color:#fff;
          font-size:10px;
          font-weight:500;
          padding:3px 9px 3px 7px;
          border-radius:20px;
          display:flex;
          align-items:center;
          gap:5px;
        }

        .lp-store-edit-btn, .lp-store-delete-btn {
          position:absolute;
          top:6px;
          width:26px; height:26px;
          border-radius:50%;
          background:rgba(0,0,0,0.7);
          border:0.5px solid rgba(255,255,255,0.2);
          color:rgba(255,255,255,0.8);
          display:flex; align-items:center; justify-content:center;
          font-size:11px;
          cursor:pointer;
          transition:background 0.15s,color 0.15s;
          z-index:2;
        }
        .lp-store-edit-btn { right:36px; }
        .lp-store-delete-btn { right:6px; }
        .lp-store-edit-btn:hover { background:rgba(99,102,241,0.8); color:#fff; border-color:transparent; }
        .lp-store-delete-btn:hover { background:rgba(239,68,68,0.8); color:#fff; border-color:transparent; }

        .lp-store-info { padding:10px 12px 12px; }
        .lp-store-name {
          font-size:13.5px;
          font-weight:500;
          color:rgba(240,237,232,0.85);
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          margin-bottom:8px;
        }
        .lp-store-footer {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:6px;
        }
        .lp-store-price {
          font-size:14px;
          font-weight:700;
          font-family:'Space Mono',monospace;
        }
        .lp-store-cat {
          font-size:9px;
          background:rgba(255,255,255,0.05);
          color:rgba(255,255,255,0.35);
          border-radius:20px;
          padding:2px 7px;
          border:0.5px solid rgba(255,255,255,0.08);
          font-family:'Space Mono',monospace;
          letter-spacing:0.04em;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          max-width:80px;
        }

        .lp-store-modal-backdrop {
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.75);
          z-index:999;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:1rem;
          backdrop-filter:blur(4px);
          -webkit-backdrop-filter:blur(4px);
        }
        .lp-store-modal {
          background:#111;
          border-radius:16px;
          border:0.5px solid rgba(255,255,255,0.1);
          width:100%;
          max-width:520px;
          overflow:hidden;
          animation:lpIn 0.2s ease both;
          max-height:90vh;
          overflow-y:auto;
        }
        .lp-store-modal-media {
          width:100%;
          aspect-ratio:16/9;
          background:#0a0a0a;
          overflow:hidden;
          flex-shrink:0;
        }
        .lp-store-modal-body { padding:1.25rem; }
      `}</style>

      <div
        className="lp-root"
        style={{ '--accent': accent, '--banner': banner } as React.CSSProperties}
      >
        {/* Back nav */}
        <div className="lp-back">
          <Link href="/"><span style={{fontSize:'11px',lineHeight:1}}>←</span><span style={{fontSize:'10px',lineHeight:1}}>BACK</span></Link>
        </div>

        {/* Top-right navigation */}
        <div style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          zIndex: 50,
          display: 'flex', gap: 8,
        }}>
          <button
            onClick={() => router.push('/feed')}
            className="lp-nav-btn"
          >
            <Newspaper style={{ width: 16, height: 16 }} />
            <span className="lp-nav-label">Social Feed</span>
            <span className="lp-nav-label-sm">Feed</span>
          </button>
          <button
            onClick={() => router.push('/messages')}
            className="lp-nav-btn"
          >
            <Mail style={{ width: 16, height: 16 }} />
            <span className="lp-nav-label">Messages</span>
            <span className="lp-nav-label-sm">DMs</span>
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="lp-nav-btn lp-nav-btn-primary"
          >
            <MessageSquare style={{ width: 16, height: 16 }} />
            <span className="lp-nav-label">Chat Rooms</span>
            <span className="lp-nav-label-sm">Rooms</span>
          </button>
        </div>

        <div className="lp-layout">
          {/* ═══ LEFT: Profile Card ═══ */}
          <div className="lp-card">
            {/* Banner */}
            <div className="lp-banner" style={{
              background: profile.bannerMediaUrl || profile.profile_video_url
                ? '#000'
                : `linear-gradient(135deg, color-mix(in srgb,${banner} 90%,#000) 0%, color-mix(in srgb,${accent} 20%,#0a0a12) 100%)`,
            }}>
              {profile.bannerMediaUrl ? (
                profile.bannerMediaType === 'video' ? (
                  <video
                    src={profile.bannerMediaUrl}
                    autoPlay muted loop playsInline
                    className="lp-banner-media"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={profile.bannerMediaUrl}
                    alt="Banner"
                    className="lp-banner-media"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )
              ) : profile.profile_video_url ? (
                <video
                  src={profile.profile_video_url}
                  autoPlay muted loop playsInline
                  className="lp-banner-media"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <div className="lp-banner-orb" style={{
                    width: 220, height: 220, top: -70, left: -50,
                    background: `radial-gradient(circle,color-mix(in srgb,${accent} 30%,transparent),transparent 65%)`,
                  }} />
                  <div className="lp-banner-orb" style={{
                    width: 160, height: 160, top: -40, right: -30,
                    background: `radial-gradient(circle,color-mix(in srgb,${banner} 40%,transparent),transparent 65%)`,
                  }} />
                  <div className="lp-banner-orb" style={{
                    width: 100, height: 100, bottom: -20, right: 60,
                    background: `radial-gradient(circle,color-mix(in srgb,${accent} 20%,transparent),transparent 65%)`,
                  }} />
                </>
              )}

            </div>

            {/* Body */}
            <div className="lp-body">
              {/* Avatar + actions */}
              <div className="lp-avatar-row">
                <div className="lp-avatar">
                  {profile.avatarUrl ? (
                    <ResponsiveAvatar
                      avatarUrls={profile.avatar_urls || { medium: profile.avatarUrl }}
                      username={profile.displayName}
                      size="large"
                      className="w-full h-full"
                    />
                  ) : (
                    profile.displayName[0]
                  )}
                  {canEdit && <div className="lp-avatar-hover">📷</div>}
                </div>
                <div className="lp-action-row">
                  {isViewOnly && currentUserId && (
                    <button
                      className="lp-follow-btn"
                      onClick={handleToggleFollow}
                      disabled={followLoading}
                      style={{ opacity: followLoading ? 0.5 : 1 }}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                  {isViewOnly && currentUserId && (
                    <Link href={`/messages?userId=${profile.id}&username=${profile.displayName}`}>
                      <button className="lp-icon-btn" title="Message">✉</button>
                    </Link>
                  )}
                  {canEdit && (
                    <button className="lp-icon-btn" onClick={() => setEditMode(v => !v)} title="Edit">✎</button>
                  )}
                </div>
              </div>

              {/* Identity */}
              <div className="lp-name" style={{ fontFamily: nameFont.family }}>{profile.displayName}</div>
              <div className="lp-handle">@{profile.username}</div>
              {profile.bio && <div className="lp-bio" style={{ fontFamily: bioFont.family }}>{profile.bio}</div>}

              {/* Profile audio player */}
              {profile.profile_audio_url && (
                <ProfileAudioPlayer
                  audioUrl={profile.profile_audio_url}
                  trackName={profile.profileTrackName || 'Profile track'}
                  accentColor={accent}
                  audioRef={audioRef}
                />
              )}

              {/* Details */}
              <div className="lp-details">
                {profile.location && (
                  <div className="lp-detail">
                    <div className="lp-detail-dot" />
                    {profile.location}
                  </div>
                )}
                {profile.website && (
                  <div className="lp-detail">
                    <div className="lp-detail-dot" />
                    <a href={`https://${profile.website}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none' }}>
                      {profile.website}
                    </a>
                  </div>
                )}
                {profile.email && (
                  <div className="lp-detail">
                    <div className="lp-detail-dot" />
                    {profile.email}
                  </div>
                )}
              </div>

              {/* Stats strip */}
              <div className="lp-stats-strip">
                {[
                  { n: followersCount.toLocaleString(), l: 'Followers' },
                  { n: followingCount.toLocaleString(), l: 'Following' },
                  { n: profile.stats.totalGenerations.toLocaleString(), l: 'Creations' },
                ].map(s => (
                  <div key={s.l} className="lp-stat">
                    <div className="lp-stat-n">{s.n}</div>
                    <div className="lp-stat-l">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Socials */}
              {profile.socials.length > 0 && (
                <div className="lp-socials">
                  {profile.socials.map(s => (
                    <a key={s.platform} href={s.url} className="lp-soc" target="_blank" rel="noopener noreferrer">
                      <span className="lp-soc-icon">{SOCIAL_ICONS[s.platform]}</span>
                      {s.handle}
                    </a>
                  ))}
                </div>
              )}

              <div className="lp-divider" />

              {/* Edit panel */}
              {editMode && canEdit && (
                <div className="lp-edit-panel">
                  <div className="lp-edit-title">Edit profile</div>

                  {/* Avatar Upload */}
                  <div className="lp-edit-row">
                    <label className="lp-edit-label">Avatar</label>
                    <AvatarUpload
                      userId={profile.id}
                      currentAvatar={profile.avatar_urls ?? (profile.avatarUrl ? { thumbnail: profile.avatarUrl, small: profile.avatarUrl, medium: profile.avatarUrl, large: profile.avatarUrl } : undefined)}
                      username={profile.username}
                      onAvatarChange={handleAvatarChange}
                    />
                  </div>

                  {/* Gallery Upload */}
                  <div className="lp-edit-row">
                    <label className="lp-edit-label">Gallery Photos / Videos</label>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleGalleryUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploadingGallery}
                      className="lp-video-btn"
                    >
                      {uploadingGallery ? (
                        <><div className="lp-spinner" /> Uploading…</>
                      ) : (
                        <><ImageIcon style={{ width: 14, height: 14 }} /> Upload to Gallery</>
                      )}
                    </button>
                    <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                      Images or videos — select multiple at once
                    </p>
                  </div>

                  {/* Banner Media Upload */}
                  <div className="lp-edit-row">
                    <label className="lp-edit-label">Banner Media</label>
                    {profile.bannerMediaUrl ? (
                      <div>
                        {profile.bannerMediaType === 'video' ? (
                          <video src={profile.bannerMediaUrl} autoPlay muted loop playsInline
                            style={{ width: '100%', maxHeight: 120, borderRadius: 8, background: '#000', objectFit: 'cover', marginBottom: 8 }} />
                        ) : (
                          <img src={profile.bannerMediaUrl} alt="Banner preview"
                            style={{ width: '100%', maxHeight: 120, borderRadius: 8, objectFit: 'cover', marginBottom: 8 }} />
                        )}
                        <button onClick={handleRemoveBannerMedia} className="lp-video-btn" style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.7)' }}>
                          <Trash2 style={{ width: 12, height: 12 }} /> Remove Banner Media
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={bannerMediaInputRef}
                          type="file"
                          accept="image/*,video/mp4,video/webm,video/quicktime"
                          onChange={handleBannerMediaUpload}
                          style={{ display: 'none' }}
                        />
                        <button
                          onClick={() => bannerMediaInputRef.current?.click()}
                          disabled={uploadingBanner}
                          className="lp-video-btn"
                        >
                          {uploadingBanner ? (
                            <><div className="lp-spinner" /> Uploading…</>
                          ) : (
                            <><ImageIcon style={{ width: 14, height: 14 }} /> Upload Banner Image or Video</>
                          )}
                        </button>
                        <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                          Image or MP4/WebM/MOV — videos up to 2 GB
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="lp-edit-row">
                    <label className="lp-edit-label">Display name</label>
                    <input ref={nameRef} className="lp-input" defaultValue={profile.displayName} />
                  </div>
                  <div className="lp-edit-row">
                    <label className="lp-edit-label">Email</label>
                    <input ref={emailRef} className="lp-input" type="email" defaultValue={profile.email || ''} />
                  </div>
                  <div className="lp-edit-row">
                    <label className="lp-edit-label">Something Catchy</label>
                    <input ref={bioRef} className="lp-input" defaultValue={profile.bio} placeholder="Something Catchy" maxLength={80} />
                  </div>
                  <div className="lp-edit-row">
                    <label className="lp-edit-label">something catchy</label>
                    <textarea ref={aboutRef} className="lp-textarea" defaultValue={profile.aboutText} placeholder="Tell people about yourself..." />
                  </div>

                  {/* Profile Audio Upload */}
                  <div className="lp-edit-row">
                    <label className="lp-edit-label">Profile Audio</label>
                    {profile.profile_audio_url ? (
                      <div>
                        <audio controls preload="metadata" src={profile.profile_audio_url}
                          style={{ width: '100%', marginBottom: 8, borderRadius: 8, height: 36 }} />
                        <button onClick={handleDeleteProfileAudio} className="lp-video-btn" style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.7)' }}>
                          <Trash2 style={{ width: 12, height: 12 }} /> Remove Audio
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={profileAudioInputRef}
                          type="file"
                          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,audio/webm,.mp3,.wav,.ogg,.m4a,.aac"
                          onChange={handleProfileAudioUpload}
                          style={{ display: 'none' }}
                        />
                        <button
                          onClick={() => profileAudioInputRef.current?.click()}
                          disabled={uploadingAudio}
                          className="lp-video-btn"
                        >
                          {uploadingAudio ? (
                            <><div className="lp-spinner" /> Uploading…</>
                          ) : (
                            <><Music style={{ width: 14, height: 14 }} /> Upload Profile Audio</>
                          )}
                        </button>
                        <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                          MP3, WAV, OGG, M4A or AAC — max 20 MB
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="lp-color-section lp-edit-row">
                    <label className="lp-edit-label">Accent colour</label>
                    <div className="lp-color-row">
                      {ACCENT_PRESETS.map(c => (
                        <div
                          key={c}
                          className={`lp-dot ${profile.accentColor === c ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setProfile(p => p ? { ...p, accentColor: c } : p)}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Font selection — per section */}
                  <div className="lp-edit-row">
                    <label className="lp-edit-label">Section Fonts</label>
                    {/* Section tab selector */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {([['name', 'Name'], ['bio', 'Bio'], ['about', 'About']] as const).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setFontSection(key)}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            fontFamily: "'Space Mono',monospace", letterSpacing: '0.06em',
                            border: fontSection === key ? `1.5px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
                            background: fontSection === key ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'rgba(255,255,255,0.03)',
                            color: fontSection === key ? accent : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                      {FONT_PRESETS.map(f => {
                        const fontKey = fontSection === 'name' ? 'nameFont' : fontSection === 'bio' ? 'bioFont' : 'aboutFont'
                        return (
                          <button
                            key={f.key}
                            onClick={() => setProfile(p => p ? { ...p, [fontKey]: f.key } : p)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '8px 12px',
                              borderRadius: 8,
                              border: activeSectionFontKey === f.key ? `1.5px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
                              background: activeSectionFontKey === f.key ? `color-mix(in srgb, ${accent} 12%, transparent)` : 'rgba(255,255,255,0.03)',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontFamily: f.family, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{f.name}</div>
                            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>{f.style}</div>
                          </button>
                        )
                      })}
                      {uploadedFonts.map(f => {
                        const fontKey = fontSection === 'name' ? 'nameFont' : fontSection === 'bio' ? 'bioFont' : 'aboutFont'
                        return (
                          <button
                            key={f.name}
                            onClick={() => setProfile(p => p ? { ...p, [fontKey]: f.name } : p)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '8px 12px',
                              borderRadius: 8,
                              border: activeSectionFontKey === f.name ? `1.5px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
                              background: activeSectionFontKey === f.name ? `color-mix(in srgb, ${accent} 12%, transparent)` : 'rgba(255,255,255,0.03)',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontFamily: f.family, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{f.name}</div>
                            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>Custom Upload</div>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <input
                        ref={fontInputRef}
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={handleFontUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => fontInputRef.current?.click()}
                        className="lp-video-btn"
                      >
                        ↑ Upload Custom Font
                      </button>
                      <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                        TTF, OTF, WOFF or WOFF2
                      </p>
                    </div>
                  </div>

                  <div className="lp-color-section lp-edit-row">
                    <label className="lp-edit-label">Banner colour</label>
                    <div className="lp-color-row">
                      {BANNER_PRESETS.map(c => (
                        <div
                          key={c}
                          className={`lp-dot ${profile.bannerColor === c ? 'active' : ''}`}
                          style={{ background: c, border: c === '#0a0f1a' ? '0.5px solid rgba(255,255,255,0.2)' : undefined }}
                          onClick={() => setProfile(p => p ? { ...p, bannerColor: c } : p)}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Change Password */}
                  <div className="lp-edit-row">
                    <label className="lp-edit-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Lock style={{ width: 12, height: 12 }} /> Change Password
                    </label>
                    <input
                      type="password"
                      className="lp-input"
                      placeholder="New password (min 8 chars)"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <input
                      type="password"
                      className="lp-input"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      style={{ marginTop: 6 }}
                      autoComplete="new-password"
                    />
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword || !newPassword || !confirmPassword}
                      className="lp-video-btn"
                      style={{ marginTop: 8 }}
                    >
                      {changingPassword ? (
                        <><div className="lp-spinner" /> Updating…</>
                      ) : (
                        <><Lock style={{ width: 14, height: 14 }} /> Update Password</>
                      )}
                    </button>
                  </div>

                  <div className="lp-edit-actions">
                    <button className="lp-save" onClick={saveEdits}>Save changes</button>
                    <button className="lp-cancel" onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="lp-tabs">
                {(['gallery', 'posts', 'store', 'about'] as const).map(tab => (
                  <button
                    key={tab}
                    className={`lp-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Gallery tab – mock items */}
              {activeTab === 'gallery' && (
                <>
                  {/* User-uploaded photos/videos */}
                  {mediaItems.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 10 }}>Photos &amp; Videos</div>
                      <div className="lp-gallery">
                        {mediaItems.map(item => (
                          <div key={item.id} className="group/media" style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                            {item.media_type === 'video' ? (
                              <video src={item.url} controls style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.url} alt={item.caption || 'photo'} style={{ width: '100%', display: 'block', aspectRatio: '1', objectFit: 'cover' }} />
                            )}
                            {canEdit && (
                              <button
                                onClick={async () => {
                                  if (!profile) return
                                  try {
                                    await apiClient.deleteGalleryItem(profile.id, item.id)
                                    setMediaItems(prev => prev.filter(i => i.id !== item.id))
                                    toast.success('Removed from gallery')
                                  } catch {
                                    toast.error('Could not delete item')
                                  }
                                }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/70 flex items-center justify-center text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-red-600/80"
                                title="Delete"
                              >
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="lp-filters">
                    {(['all', 'image', 'video', '3d', 'gif'] as const).map(f => (
                      <button
                        key={f}
                        className={`lp-chip ${filterType === f ? 'active' : ''}`}
                        onClick={() => setFilterType(f)}
                      >
                        {f === 'all' ? 'All' : TYPE_LABEL[f as GenerationType] ?? f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="lp-gallery">
                    {filtered.length === 0
                      ? <div className="lp-empty">No {filterType} generations yet</div>
                      : filtered.map((item, i) => (
                        <div
                          key={item.id}
                          style={item.type === 'video' && i % 3 === 1 ? { gridColumn: 'span 2' } : {}}
                        >
                          <GalleryCard item={item} accent={accent} onLike={toggleLike} />
                        </div>
                      ))
                    }
                  </div>
                </>
              )}

              {/* Posts tab */}
              {activeTab === 'posts' && (
                <>
                  {/* Post Composer (own profile only) */}
                  {canEdit && (
                    <div style={{ marginBottom: 20 }}>
                      <PostComposer
                        userId={profile.id}
                        username={profile.username}
                        avatarUrl={profile.avatarUrl}
                        avatarUrls={profile.avatar_urls}
                        onPostCreated={handlePostCreated}
                      />
                    </div>
                  )}

                  {/* Posts list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {postsLoading ? (
                      <div style={{
                        textAlign: 'center', padding: '32px 0',
                        color: 'rgba(255,255,255,0.25)', fontSize: 12,
                        fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em',
                      }}>
                        LOADING POSTS...
                      </div>
                    ) : myPosts.length === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '32px 0',
                        color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 300,
                      }}>
                        {isViewOnly ? 'No posts yet.' : 'No posts yet. Share something!'}
                      </div>
                    ) : (
                      myPosts.map(post => (
                        <div key={post.id} className="profile-post-card">
                          <PostCard
                            post={post}
                            currentUserId={currentUserId || ''}
                            currentUsername={currentUserName || profile.username}
                            currentAvatarUrls={currentUserAvatarUrls || profile.avatar_urls}
                            onLike={handlePostLike}
                            onComment={handlePostComment}
                            onShare={handlePostShare}
                            onDelete={handlePostDelete}
                            onEdit={handlePostEdit}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* Store tab */}
              {activeTab === 'store' && (
                <>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
                      {storeItems.length} item{storeItems.length !== 1 ? 's' : ''}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setShowItemForm(v => !v)}
                        className="lp-video-btn"
                        style={showItemForm ? { borderColor: 'rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.7)' } : {}}
                      >
                        {showItemForm ? '✕ Cancel' : '+ List an item'}
                      </button>
                    )}
                  </div>

                  {/* Add-item form */}
                  {showItemForm && canEdit && (
                    <div className="lp-edit-panel" style={{ marginBottom: 16 }}>
                      <div className="lp-edit-title">{editingItemId ? 'Edit Listing' : 'New Listing'}</div>

                      <div className="lp-edit-row">
                        <label className="lp-edit-label">Item Name</label>
                        <input className="lp-input" placeholder="What are you selling?" value={itemFormData.name} onChange={e => setItemFormData(p => ({ ...p, name: e.target.value }))} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="lp-edit-row">
                          <label className="lp-edit-label">Price ($)</label>
                          <input className="lp-input" type="number" min="0" step="0.01" placeholder="0.00" value={itemFormData.price} onChange={e => setItemFormData(p => ({ ...p, price: e.target.value }))} />
                        </div>
                        <div className="lp-edit-row">
                          <label className="lp-edit-label">Category</label>
                          <select className="lp-input" style={{ color: '#f0ede8' }} value={itemFormData.category} onChange={e => setItemFormData(p => ({ ...p, category: e.target.value }))}>
                            {['Digital Art', 'Music', 'Physical Art', 'Design', 'Commission', 'Photography', 'Software', 'Other'].map(c => <option key={c} style={{ background: '#111', color: '#f0ede8' }}>{c}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="lp-edit-row">
                        <label className="lp-edit-label">Condition / Delivery</label>
                        <input className="lp-input" placeholder="Digital download, ships in 3 days…" value={itemFormData.condition} onChange={e => setItemFormData(p => ({ ...p, condition: e.target.value }))} />
                      </div>

                      <div className="lp-edit-row">
                        <label className="lp-edit-label">Description</label>
                        <textarea className="lp-textarea" placeholder="Describe your item…" value={itemFormData.description} onChange={e => setItemFormData(p => ({ ...p, description: e.target.value }))} />
                      </div>

                      <div className="lp-edit-row">
                        <label className="lp-edit-label">Tags (comma-separated)</label>
                        <input className="lp-input" placeholder="digital, art, neon…" value={itemFormData.tags} onChange={e => setItemFormData(p => ({ ...p, tags: e.target.value }))} />
                      </div>

                      <div className="lp-edit-row">
                        <label className="lp-edit-label">Images ({itemFormData.imageUrls.length}/8)</label>
                        {itemFormData.imageUrls.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 8 }}>
                            {itemFormData.imageUrls.map((url, idx) => (
                              <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', background: '#0a0a0a', border: '0.5px solid rgba(255,255,255,0.1)' }}>
                                <img src={url} alt={`img ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                                <button
                                  onClick={() => setItemFormData(p => ({ ...p, imageUrls: p.imageUrls.filter((_, i) => i !== idx) }))}
                                  style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: '0.5px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {itemFormData.imageUrls.length < 8 && (
                          <>
                            <input ref={itemImageInputRef} type="file" accept="image/*" multiple onChange={handleItemImageUpload} style={{ display: 'none' }} />
                            <button onClick={() => itemImageInputRef.current?.click()} disabled={uploadingItemImage} className="lp-video-btn">
                              {uploadingItemImage ? <><div className="lp-spinner" /> Uploading…</> : <><ImageIcon style={{ width: 14, height: 14 }} /> {itemFormData.imageUrls.length === 0 ? 'Add Images' : 'Add More'}</>}
                            </button>
                          </>
                        )}
                      </div>

                      <div className="lp-edit-row">
                        <label className="lp-edit-label">Video Preview (optional)</label>
                        {itemFormData.videoUrl ? (
                          <div>
                            <video src={itemFormData.videoUrl} controls muted style={{ width: '100%', maxHeight: 120, borderRadius: 8, background: '#000', objectFit: 'cover', marginBottom: 8 }} />
                            <button onClick={() => setItemFormData(p => ({ ...p, videoUrl: '' }))} className="lp-video-btn" style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.7)' }}>
                              <Trash2 style={{ width: 12, height: 12 }} /> Remove Video
                            </button>
                          </div>
                        ) : (
                          <>
                            <input ref={itemVideoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleItemVideoUpload} style={{ display: 'none' }} />
                            <button onClick={() => itemVideoInputRef.current?.click()} disabled={uploadingItemVideo} className="lp-video-btn">
                              {uploadingItemVideo ? <><div className="lp-spinner" /> Uploading…</> : <><Video style={{ width: 14, height: 14 }} /> Upload Video Preview</>}
                            </button>
                          </>
                        )}
                      </div>

                      <div className="lp-edit-actions">
                        <button className="lp-save" onClick={addStoreItem} disabled={!itemFormData.name.trim() || !itemFormData.price}>
                          {editingItemId ? 'Save Changes' : 'List Item'}
                        </button>
                        <button className="lp-cancel" onClick={resetItemForm}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Store grid */}
                  {storeItems.length === 0 ? (
                    <div className="lp-empty">
                      {canEdit ? 'Your store is empty. List your first item above.' : 'No items listed yet.'}
                    </div>
                  ) : (
                    <div className="lp-store-grid">
                      {storeItems.map(item => (
                        <div key={item.id} className="lp-store-card" onClick={() => setSelectedItem(item)}>
                          <div className="lp-store-preview">
                            {item.imageUrls?.[0] ? (
                              <>
                                <img src={item.imageUrls[0]} alt={item.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  onError={e => {
                                    const img = e.currentTarget as HTMLImageElement;
                                    img.style.display = 'none';
                                    const fb = img.nextElementSibling as HTMLElement | null;
                                    if (fb) fb.style.display = 'flex';
                                  }}
                                />
                                <div style={{ width: '100%', height: '100%', display: 'none', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb,${accent} 10%,#111)`, fontSize: 26 }}>🛍️</div>
                              </>
                            ) : item.videoUrl ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a12', fontSize: 28, color: 'rgba(255,255,255,0.5)' }}>▶</div>
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb,${accent} 10%,#111)`, fontSize: 26 }}>🛍️</div>
                            )}
                            {(item.imageUrls?.length ?? 0) > 1 && (
                              <div style={{ position: 'absolute', bottom: 7, right: 7, background: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '2px 8px', fontSize: 10, color: 'rgba(255,255,255,0.8)', fontFamily: "'Space Mono',monospace" }}>
                                1/{item.imageUrls!.length}
                              </div>
                            )}
                            {item.videoUrl && (
                              <div className="lp-store-video-badge">
                                <span style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '7px solid #fff', display: 'inline-block' }} />
                                Preview
                              </div>
                            )}
                            {canEdit && (
                              <>
                                <button className="lp-store-edit-btn" onClick={e => { e.stopPropagation(); editStoreItem(item) }} title="Edit listing">✎</button>
                                <button className="lp-store-delete-btn" onClick={e => { e.stopPropagation(); deleteStoreItem(item.id) }} title="Remove listing">✕</button>
                              </>
                            )}
                          </div>
                          <div className="lp-store-info">
                            <div className="lp-store-name">{item.name}</div>
                            <div className="lp-store-footer">
                              <span className="lp-store-price" style={{ color: accent }}>${item.price.toFixed(2)}</span>
                              <span className="lp-store-cat">{item.category}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Item detail modal */}
                  {selectedItem && (
                    <div className="lp-store-modal-backdrop" onClick={() => setSelectedItem(null)}>
                      <div className="lp-store-modal" onClick={e => e.stopPropagation()}>
                        <div className="lp-store-modal-media" style={{ position: 'relative' }}>
                          {selectedItem.videoUrl ? (
                            <video src={selectedItem.videoUrl} controls autoPlay muted loop style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                          ) : (selectedItem.imageUrls?.length ?? 0) > 0 ? (
                            <>
                              <img src={selectedItem.imageUrls![modalImageIdx]} alt={selectedItem.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                              {selectedItem.imageUrls!.length > 1 && (
                                <>
                                  <button onClick={() => setModalImageIdx(i => (i - 1 + selectedItem.imageUrls!.length) % selectedItem.imageUrls!.length)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, cursor: 'pointer' }}>‹</button>
                                  <button onClick={() => setModalImageIdx(i => (i + 1) % selectedItem.imageUrls!.length)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, cursor: 'pointer' }}>›</button>
                                  <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                                    {selectedItem.imageUrls!.map((_, i) => (
                                      <button key={i} onClick={() => setModalImageIdx(i)} style={{ width: i === modalImageIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === modalImageIdx ? accent : 'rgba(255,255,255,0.3)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.15s' }} />
                                    ))}
                                  </div>
                                </>
                              )}
                            </>
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, background: `color-mix(in srgb,${accent} 10%,#111)` }}>🛍️</div>
                          )}
                          {(selectedItem.imageUrls?.length ?? 0) > 0 && selectedItem.imageUrls!.length > 1 && (
                            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '2px 9px', fontSize: 10, color: 'rgba(255,255,255,0.8)', fontFamily: "'Space Mono',monospace" }}>
                              {modalImageIdx + 1}/{selectedItem.imageUrls!.length}
                            </div>
                          )}
                        </div>
                        <div className="lp-store-modal-body">
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#f0ede8', lineHeight: 1.3 }}>{selectedItem.name}</div>
                            <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: 30, height: 30, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'inherit' }}>✕</button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                              <ResponsiveAvatar
                                avatarUrls={profile.avatar_urls ?? (profile.avatarUrl ? { thumbnail: profile.avatarUrl, small: profile.avatarUrl, medium: profile.avatarUrl, large: profile.avatarUrl } : undefined)}
                                username={profile.displayName}
                                size="thumbnail"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{profile.displayName}</span>
                          </div>
                          {selectedItem.description && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 14 }}>{selectedItem.description}</p>}
                          {selectedItem.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                              {selectedItem.tags.map(t => <span key={t} style={{ fontSize: 12, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', borderRadius: 20, padding: '3px 10px', border: '0.5px solid rgba(255,255,255,0.08)' }}>{t}</span>)}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '0.5px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: "'Space Mono',monospace" }}>${selectedItem.price.toFixed(2)}</div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{selectedItem.condition}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {isViewOnly && currentUserId && (
                                <Link href={`/messages?userId=${profile.id}&username=${encodeURIComponent(profile.displayName)}`}>
                                  <button style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans',sans-serif" }}>Message seller</button>
                                </Link>
                              )}
                              {isViewOnly && (
                                <button style={{ background: accent, color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }} onClick={() => toast.success('Checkout coming soon!')}>Buy now</button>
                              )}
                              {canEdit && (
                                <>
                                  <button style={{ background: 'none', border: '0.5px solid rgba(99,102,241,0.4)', borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer', color: 'rgba(99,102,241,0.9)', fontFamily: "'DM Sans',sans-serif" }} onClick={() => { editStoreItem(selectedItem!); }}>Edit listing</button>
                                  <button style={{ background: 'none', border: '0.5px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer', color: 'rgba(239,68,68,0.8)', fontFamily: "'DM Sans',sans-serif" }} onClick={() => { deleteStoreItem(selectedItem!.id); setSelectedItem(null); }}>Delete</button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* About tab */}
              {activeTab === 'about' && (
                <>
                  {profile.aboutText && <div className="lp-about-bio" style={{ fontFamily: aboutFont.family }}>&ldquo;{profile.aboutText}&rdquo;</div>}
                  {profile.location && (
                    <div className="lp-about-detail">
                      <div className="lp-about-icon">📍</div>
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <div className="lp-about-detail">
                      <div className="lp-about-icon">↗</div>
                      <a href={`https://${profile.website}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: accent, textDecoration: 'none' }}>
                        {profile.website}
                      </a>
                    </div>
                  )}
                  {profile.email && (
                    <div className="lp-about-detail">
                      <div className="lp-about-icon">✉</div>
                      {profile.email}
                    </div>
                  )}
                  {profile.socials.length > 0 && (
                    <div className="lp-soc-cards">
                      {profile.socials.map(s => (
                        <a key={s.platform} href={s.url} className="lp-soc-card" target="_blank" rel="noopener noreferrer">
                          <div className="lp-soc-card-icon">{SOCIAL_ICONS[s.platform]}</div>
                          <div>
                            <div className="lp-soc-card-platform">{s.platform}</div>
                            <div className="lp-soc-card-handle">{s.handle}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>


        </div>
      </div>
    </>
  )
}

// ─── Page Export ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <MediaPlaybackProvider>
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: '0.12em' }}>
          LOADING...
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
    </MediaPlaybackProvider>
  )
}
