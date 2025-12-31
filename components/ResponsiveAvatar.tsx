'use client';

import Image from 'next/image';
import { useState } from 'react';

export interface AvatarUrls {
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
}

interface ResponsiveAvatarProps {
  avatarUrls?: AvatarUrls;
  username: string;
  size?: 'thumbnail' | 'small' | 'medium' | 'large';
  className?: string;
}

const SIZE_MAP = {
  thumbnail: 40,
  small: 80,
  medium: 200,
  large: 400,
} as const;

/**
 * Responsive avatar component that automatically loads optimal size
 * Mimics Facebook/Instagram architecture with multi-size support
 * 
 * Features:
 * - Lazy loading
 * - Automatic size selection
 * - Fallback to UI Avatars
 * - Error handling
 * 
 * @example
 * <ResponsiveAvatar
 *   avatarUrls={user.avatar_urls}
 *   username={user.username}
 *   size="medium"
 * />
 */
export function ResponsiveAvatar({
  avatarUrls,
  username,
  size = 'medium',
  className = '',
}: ResponsiveAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const pixelSize = SIZE_MAP[size];

  const getImageUrl = (): string => {
    if (imageError || !avatarUrls) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=${pixelSize}&background=random`;
    }

    // Try requested size, fall back to medium, then generate
    const url = avatarUrls[size] || avatarUrls.medium;

    if (!url) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=${pixelSize}&background=random`;
    }

    return url;
  };

  const imageUrl = getImageUrl();

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: pixelSize, height: pixelSize }}>
      <Image
        src={imageUrl}
        alt={`${username}'s avatar`}
        width={pixelSize}
        height={pixelSize}
        className="rounded-full object-cover"
        onError={() => setImageError(true)}
        loading="lazy"
        unoptimized
      />
    </div>
  );
}
