'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { ResponsiveAvatar } from './ResponsiveAvatar';
import { AvatarUrls } from '@/types/backend';

interface AvatarUploadProps {
  userId: string;
  currentAvatar?: AvatarUrls;
  username: string;
  onAvatarChange: (avatarUrls: AvatarUrls | null) => void;
  className?: string;
}

/**
 * Multi-size avatar upload component with Bunny.net CDN
 * Processes images into 4 sizes (40x40 to 400x400) before upload
 * Mimics Facebook/Instagram architecture
 * 
 * @example
 * <AvatarUpload
 *   userId={user.id}
 *   currentAvatar={user.avatar_urls}
 *   username={user.username}
 *   onAvatarChange={handleAvatarChange}
 * />
 */
export function AvatarUpload({
  userId,
  currentAvatar,
  username,
  onAvatarChange,
  className = '',
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress('Processing image...');

    try {
      // Upload with multi-size processing
      const response = await apiClient.uploadAvatar(userId, file, username);

      setUploadProgress('Upload complete!');
      onAvatarChange(response.avatar_urls);

      // Clear success message after 2s
      setTimeout(() => setUploadProgress(''), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(message);
      console.error('Avatar upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete your avatar? You can upload a new one anytime.')) {
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      await apiClient.deleteAvatar(userId);
      onAvatarChange(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete avatar';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Avatar Preview */}
      <div className="w-full flex items-center justify-center sm:justify-start gap-0 sm:gap-4 py-2">
        <ResponsiveAvatar
          avatarUrls={currentAvatar}
          username={username}
          size="medium"
          className="w-24 h-24 sm:w-32 sm:h-32 ring-1 ring-white/10"
        />

        <div className="hidden sm:block flex-1">
          <p className="text-sm font-medium text-white">{username}</p>
          <p className="text-xs text-gray-400">
            {currentAvatar ? 'Custom avatar' : 'Generated avatar'}
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-gray-500'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-2">
          {isUploading ? (
            <>
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-300">{uploadProgress}</p>
            </>
          ) : (
            <>
              <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-300">
                <span className="text-green-400 font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                JPEG, PNG, GIF or WebP (max 10MB)
              </p>
              <p className="text-xs text-gray-500">
                Will be optimized into 4 sizes automatically
              </p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {currentAvatar && !isUploading && (
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-400/50 hover:border-red-300 rounded-lg transition-colors"
        >
          Remove Avatar
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
