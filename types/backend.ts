/**
 * Backend user response type
 */
export interface BackendUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;  // CDN URL or null
  joined_at: string;    // ISO 8601 timestamp
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
  avatar_url?: string;  // User's avatar at time of message
  timestamp: string;    // ISO 8601 timestamp
}

/**
 * Avatar upload response
 */
export interface AvatarUploadResponse {
  success: boolean;
  avatar_url: string;   // CDN URL where avatar is hosted
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
