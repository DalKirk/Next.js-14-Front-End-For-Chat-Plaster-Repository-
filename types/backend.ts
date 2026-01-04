/**
 * Avatar URLs for different sizes (Facebook/Instagram style)
 */
export interface AvatarUrls {
  thumbnail?: string;  // 40x40 - Chat messages, comments
  small?: string;      // 80x80 - User lists, mentions
  medium?: string;     // 200x200 - Profile cards
  large?: string;      // 400x400 - Profile header
}

/**
 * Backend user response type
 */
export interface BackendUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;       // Deprecated - use avatar_urls.medium
  avatar_urls?: AvatarUrls;  // Multi-size avatar support
  joined_at: string;         // ISO 8601 timestamp
}

/**
 * Backend message type (with avatar support)
 */
export interface BackendMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  avatar_url?: string;       // User's avatar at time of message
  avatar_urls?: AvatarUrls;  // Multi-size support
  timestamp: string;         // ISO 8601 timestamp
}

/**
 * Avatar upload response (multi-size)
 */
export interface AvatarUploadResponse {
  success: boolean;
  avatar_urls: AvatarUrls;   // All avatar sizes
  avatar_url: string;        // Default (medium) for compatibility
  total_size_mb: number;     // Combined size of all versions
  filename: string;     // Internal filename
  size_mb: number;      // File size in megabytes
  message: string;
}

/**
 * Avatar delete response
 */
export interface AvatarDeleteResponse {
  success: boolean;
  message: string;
}

/**
 * Avatar health check response
 */
export interface AvatarHealthResponse {
  status: 'healthy' | 'not_configured';
  bunny_net_configured: boolean;
  storage_zone: string | null;
  cdn_hostname: string | null;
  timestamp: string;
}

/**
 * User gallery item stored on CDN (multi-size URLs)
 */
export interface GalleryItem {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
  // Optional: present when backend includes owner in list responses
  user_id?: string;
}

export interface GalleryListResponse {
  user_id: string;
  items: GalleryItem[];
}
