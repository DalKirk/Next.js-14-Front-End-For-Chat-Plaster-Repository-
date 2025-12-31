import { AvatarUrls } from './backend';

/**
 * Frontend user profile type
 */
export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;           // Deprecated - use avatar_urls.medium
  avatar_urls?: AvatarUrls;  // Multi-size avatar support
  email?: string;
  bio?: string;
  displayName?: string;
  joinedDate: string;
  totalRooms?: number;
  totalMessages?: number;
  favoriteLanguage?: string;
  theme: 'purple' | 'blue' | 'green';
  notifications: boolean;
}
