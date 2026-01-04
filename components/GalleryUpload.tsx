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
      const envUser = (res as { user_id?: string }).user_id;
      const items: GalleryItem[] = Array.isArray(res.items) ? res.items : [];
      // Accept only items scoped to current user. If envelope user_id matches and
      // item-level user_id is missing, accept; otherwise require item-level match.
      const safeItems = items.filter((it: GalleryItem) => {
        if (typeof it.user_id === 'string') return it.user_id === userId;
        if (envUser) return envUser === userId;
        return false;
      });
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
