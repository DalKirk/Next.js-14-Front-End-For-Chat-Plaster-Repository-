/**
 * Frontend user profile type
 */
export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;      // Mapped from backend avatar_url
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
