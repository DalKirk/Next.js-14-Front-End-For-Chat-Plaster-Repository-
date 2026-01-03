'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import type { AvatarUrls } from '@/types/backend';

interface GalleryUploadProps {
  userId: string;
  username: string;
  onItemsAdded?: (items: AvatarUrls[]) => void;
}

/**
 * Gallery uploader that processes images client-side and uploads to CDN
 * using the same multi-size pipeline as avatars. Returns URLs per image.
 */
export function GalleryUpload({ userId, username, onItemsAdded }: GalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const results: AvatarUrls[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await apiClient.uploadGalleryImage(userId, file, username);
        if (res?.image_urls) {
          results.push(res.image_urls);
        }
      }
      onItemsAdded?.(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="text-slate-200"
        />
        <Button variant="glass" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</Button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
