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
    avatar_urls?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
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

  // Prefer multi-size avatar URLs if provided by backend; otherwise synthesize from single URL
  const resolvedAvatarUrls = (() => {
    if (payload.avatar_urls && (payload.avatar_urls.thumbnail || payload.avatar_urls.small || payload.avatar_urls.medium || payload.avatar_urls.large)) {
      return payload.avatar_urls;
    }
    if (finalAvatar) {
      return {
        thumbnail: finalAvatar,
        small: finalAvatar,
        medium: finalAvatar,
        large: finalAvatar,
      };
    }
    return undefined;
  })();
  // Create a stable synthetic ID when none provided to avoid React key flicker
  const stableHash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0; // 32-bit
    }
    return Math.abs(h).toString(36);
  };
  const timestampNorm = payload.timestamp || payload.created_at || '';
  const composite = `${opts.roomId}|${incomingUserId}|${username}|${payload.title || ''}|${payload.playback_id || ''}|${timestampNorm}|${(payload.content || '')}`;
  const syntheticId = `synthetic-${stableHash(composite)}`;

  return {
    id: payload.id || payload.message_id || syntheticId,
    room_id: opts.roomId,
    user_id: incomingUserId,
    username,
    content,
    timestamp: payload.timestamp || payload.created_at || new Date().toISOString(),
    type: (payload.type || payload.message_type || 'message') as Message['type'],
    title: payload.title,
    playback_id: payload.playback_id,
    avatar: finalAvatar, // Now ALWAYS defined - never undefined
    avatar_urls: resolvedAvatarUrls,
  };
}

// Update avatar for a given user across all locally stored room messages
// Ensures historical messages reflect the latest avatar immediately when changed.
export function updateAvatarEverywhere(
  userId: string,
  username: string,
  newAvatar: string
): void {
  try {
    // Update caches by id and username
    const byId = JSON.parse(localStorage.getItem('userAvatarCacheById') || '{}');
    const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
    byId[userId] = newAvatar;
    byName[username] = newAvatar;
    localStorage.setItem('userAvatarCacheById', JSON.stringify(byId));
    localStorage.setItem('userAvatarCache', JSON.stringify(byName));

    // Patch all room message lists in localStorage
    const synthesize = (url: string) => ({ thumbnail: url, small: url, medium: url, large: url });
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (!key.startsWith('room-') || !key.endsWith('-messages')) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const msgs: Message[] = JSON.parse(raw);
        let changed = false;
        const updated = msgs.map(m => {
          if (m.user_id === userId || m.username === username) {
            changed = true;
            return {
              ...m,
              avatar: newAvatar,
              avatar_urls: synthesize(newAvatar),
            };
          }
          return m;
        });
        if (changed) {
          localStorage.setItem(key, JSON.stringify(updated));
        }
      } catch {
        // Ignore malformed entries
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('updateAvatarEverywhere failed:', e);
  }
}

// Update username for a given user across all locally stored room messages.
// Also migrate avatar caches keyed by the old username to the new username.
export function updateUsernameEverywhere(
  userId: string,
  oldUsername: string | undefined,
  newUsername: string
): void {
  try {
    // Migrate avatar cache entries from old to new username
    try {
      const byName = JSON.parse(localStorage.getItem('userAvatarCache') || '{}');
      if (oldUsername && byName[oldUsername]) {
        byName[newUsername] = byName[oldUsername];
        delete byName[oldUsername];
        localStorage.setItem('userAvatarCache', JSON.stringify(byName));
      }
      const nameMapRaw = localStorage.getItem('userNameMap');
      if (nameMapRaw) {
        const map = JSON.parse(nameMapRaw);
        map[userId] = newUsername;
        localStorage.setItem('userNameMap', JSON.stringify(map));
      }
    } catch {}

    // Patch all room message lists in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (!key.startsWith('room-') || !key.endsWith('-messages')) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const msgs: Message[] = JSON.parse(raw);
        let changed = false;
        const updated = msgs.map(m => {
          if (m.user_id === userId || (oldUsername && m.username === oldUsername)) {
            changed = true;
            return {
              ...m,
              username: newUsername,
            };
          }
          return m;
        });
        if (changed) {
          localStorage.setItem(key, JSON.stringify(updated));
        }
      } catch {
        // ignore malformed entries
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('updateUsernameEverywhere failed:', e);
  }
}
