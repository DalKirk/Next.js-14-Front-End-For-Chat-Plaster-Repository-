import { Message, User } from './types';

// Cache a user's profile (displayName + avatarUrl) into localStorage by id and username
export function cacheUserProfile(
  userId: string | undefined,
  displayName?: string,
  avatarUrl?: string
): void {
  if (!userId && !displayName) return;
  try {
    if (avatarUrl) {
      const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
      const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
      if (userId) byId[userId] = avatarUrl;
      if (displayName) byName[displayName] = avatarUrl;
      
      // Limit cache size to prevent quota exceeded errors - keep only 50 most recent
      const byIdEntries = Object.entries(byId);
      const byNameEntries = Object.entries(byName);
      
      const limitedById = byIdEntries.length > 50 
        ? Object.fromEntries(byIdEntries.slice(-50)) 
        : byId;
      const limitedByName = byNameEntries.length > 50 
        ? Object.fromEntries(byNameEntries.slice(-50)) 
        : byName;
      
      localStorage.setItem('userAvatarCacheById', JSON.stringify(limitedById));
      localStorage.setItem('userAvatarCache', JSON.stringify(limitedByName));
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('cacheUserProfile failed (likely quota exceeded):', e);
  }
}

// Normalize inbound payload to a renderable Message with avatar resolution
export function applyMessageForRender(
  payload: {
    id?: string;
    message_id?: string;
    room_id?: string;
    user_id?: string;
    sender_id?: string;
    username?: string;
    sender?: string;
    content?: string;
    timestamp?: string;
    created_at?: string;
    type?: string;
    message_type?: string;
    title?: string;
    playback_id?: string;
    avatar?: string;
    avatar_url?: string;
  },
  opts: {
    roomId: string;
    currentUser?: User | null;
    currentUserAvatar?: string | null;
  }
): Message {
  const incomingUserId = payload.user_id || payload.sender_id || 'unknown';
  let username = payload.username || payload.sender || 'Unknown User';
  let avatar = payload.avatar_url || payload.avatar;

  // If from current user, ALWAYS force their real profile avatar
  if (opts.currentUser && incomingUserId === opts.currentUser.id) {
    username = opts.currentUser.username;
    // Always use the real user avatar, even if server sent a different one
    avatar = opts.currentUserAvatar || avatar;
  }

  // Read caches
  const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
  const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');

  // Resolve final avatar with guaranteed fallback
  let finalAvatar = avatar || byId[incomingUserId] || byName[username];
  
  // If still no avatar for current user, use their stored avatar
  if (!finalAvatar && opts.currentUser && username === opts.currentUser.username) {
    finalAvatar = opts.currentUserAvatar || undefined;
  }
  
  // CRITICAL: If we still have no avatar, generate a fallback using ui-avatars
  // This ensures avatars NEVER disappear or become undefined
  if (!finalAvatar) {
    const displayName = username || 'User';
    finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=128`;
  }

  // Extract content with fallback
  let content = payload.content || '';
  if (!content && typeof payload === 'object') {
    const payloadObj = payload as Record<string, unknown>;
    if (typeof payloadObj.message === 'string') {
      content = payloadObj.message;
    }
  }

  return {
    id: payload.id || payload.message_id || `msg-${Date.now()}-${Math.random()}`,
    room_id: opts.roomId,
    user_id: incomingUserId,
    username,
    content,
    timestamp: payload.timestamp || payload.created_at || new Date().toISOString(),
    type: (payload.type || payload.message_type || 'message') as Message['type'],
    title: payload.title,
    playback_id: payload.playback_id,
    avatar: finalAvatar, // Now ALWAYS defined - never undefined
  };
}
