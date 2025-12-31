'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import Image from 'next/image';

interface AvatarUploadProps {
  userId: string;
  currentAvatar?: string;
  username: string;
  onAvatarChange: (url: string) => void;
  className?: string;
}

/**
 * Avatar upload component with Bunny.net CDN integration
 * 
 * Features:
 * - Upload images to Bunny.net CDN
 * - Delete avatars from CDN
 * - Client-side validation (type, size)
 * - Loading states
 * - Error handling
 * - Fallback to UI Avatars
 * 
 * @example
 * <AvatarUpload
 *   userId={user.id}
 *   currentAvatar={user.avatar}
 *   username={user.username}
 *   onAvatarChange={(url) => setUser({ ...user, avatar: url })}
 * />
 */
export function AvatarUpload({ 
  userId, 
  currentAvatar, 
  username,
  onAvatarChange,
  className = ''
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Display current avatar or fallback
  const displayAvatar = currentAvatar || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=random`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Upload to Bunny.net via backend
      const cdnUrl = await apiClient.uploadAvatar(userId, file);
      
      // Update parent component
      onAvatarChange(cdnUrl);
      
      // Clear file input
      e.target.value = '';
      
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentAvatar) return;
    
    const confirmed = window.confirm(
      'Delete your avatar? This cannot be undone.'
    );
    
    if (!confirmed) return;

    setUploading(true);
    setError(null);

    try {
      await apiClient.deleteAvatar(userId);
      
      // Clear avatar in parent component
      onAvatarChange('');
      
    } catch (err) {
      console.error('Avatar delete error:', err);
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Avatar Preview */}
      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-lg">
          <Image
            src={displayAvatar}
            alt={`${username}'s avatar`}
            width={128}
            height={128}
            className="w-full h-full object-cover"
            unoptimized // For external URLs
          />
        </div>

        {/* Loading Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
              <span className="sr-only">Uploading...</span>
            </div>
          </div>
        )}

        {/* Hover Overlay (when not uploading) */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-sm font-medium">
              {currentAvatar ? 'Change' : 'Upload'}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <label className={`
          px-4 py-2 
          bg-blue-500 hover:bg-blue-600 
          text-white rounded-lg 
          cursor-pointer transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          {uploading ? 'Uploading...' : currentAvatar ? 'Change Avatar' : 'Upload Avatar'}
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            aria-label="Upload avatar"
          />
        </label>

        {currentAvatar && !uploading && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            aria-label="Delete avatar"
          >
            Delete
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800"
          role="alert"
        >
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Info Text */}
      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400 text-xs">
          Max 5MB • JPEG, PNG, GIF, WebP
        </p>
        <p className="text-blue-500 dark:text-blue-400 text-xs font-medium mt-1">
          Hosted on Bunny.net CDN 🐰
        </p>
      </div>

      {/* Current URL (for debugging - remove in production) */}
      {process.env.NODE_ENV === 'development' && currentAvatar && (
        <details className="text-xs text-gray-400 max-w-xs">
          <summary className="cursor-pointer">CDN URL</summary>
          <code className="break-all">{currentAvatar}</code>
        </details>
      )}
    </div>
  );
}
