'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import type { GalleryItem } from '@/types/backend';

interface GalleryUploadProps {
  userId: string;
  username: string;
  onItemsAdded?: (items: GalleryItem[]) => void;
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
    try {
      const fileArray = Array.from(files);
      const res = await apiClient.uploadGalleryFiles(userId, fileArray, undefined, username);
      const items = Array.isArray(res.items) ? res.items : [];
      // Guard: if backend attached user_id to items, filter to current user
      const safeItems = items.filter((it) => !('user_id' in it) || (it as any).user_id === userId);
      onItemsAdded?.(safeItems);
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
