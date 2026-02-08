'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { ImageIcon, Smile, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

interface PostComposerProps {
  userId: string;
  username: string;
  avatarUrl?: string;
  onPostCreated: (post: any) => void;
}

export function PostComposer({
  userId,
  username,
  avatarUrl,
  onPostCreated
}: PostComposerProps) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length + mediaFiles.length > 4) {
      toast.error('Maximum 4 media files allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setMediaFiles(prev => [...prev, ...validFiles]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Post cannot be empty');
      return;
    }

    setPosting(true);

    try {
      let mediaUrls: string[] = [];

      if (mediaFiles.length > 0) {
        const formData = new FormData();
        mediaFiles.forEach(file => formData.append('files', file));
        formData.append('userId', userId);

        const uploadResponse = await fetch('/api/upload-post-media', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Media upload failed');
        }

        const uploadData = await uploadResponse.json();
        mediaUrls = uploadData.urls;
      }

      const newPost = await apiClient.createPost({
        user_id: userId,
        content: content.trim(),
        media_urls: mediaUrls
      });

      onPostCreated(newPost);

      setContent('');
      setMediaFiles([]);
      setMediaPreviews([]);

    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex gap-4">
        <ResponsiveAvatar
          avatarUrls={avatarUrl ? { small: avatarUrl } : undefined}
          username={username}
          size="medium"
          className="flex-shrink-0"
        />

        <div className="flex-1 space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-white/5 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 min-h-[100px] resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
            maxLength={5000}
          />

          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-black transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaSelect}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="glass"
                size="sm"
                disabled={mediaFiles.length >= 4}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Photo/Video
              </Button>

              <Button variant="glass" size="sm">
                <Smile className="w-4 h-4 mr-2" />
                Emoji
              </Button>
            </div>

            <Button
              onClick={handlePost}
              variant="primary"
              disabled={posting || (!content.trim() && mediaFiles.length === 0)}
            >
              {posting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
