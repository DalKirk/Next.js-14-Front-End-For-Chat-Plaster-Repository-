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
  avatarUrls?: { thumbnail?: string; small?: string; medium?: string; large?: string };
  onPostCreated: (post: any) => void;
}

export function PostComposer({
  userId,
  username,
  avatarUrl,
  avatarUrls,
  onPostCreated
}: PostComposerProps) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const EMOJI_LIST = [
    '😀','😂','🥹','😍','🥰','😎','🤩','🥳',
    '😭','😤','🤔','🫡','🙄','😴','🤯','🥶',
    '👍','👎','👏','🙌','🤝','✌️','🤞','💪',
    '❤️','🔥','💯','⭐','✨','🎉','🎊','🏆',
    '😈','👀','💀','🤡','👻','🫠','🤖','👽',
    '🌈','☀️','🌙','⚡','🌊','🍕','🎵','📸',
  ];

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + emoji + content.substring(end);
      setContent(newContent);
      // Restore cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setContent(content + emoji);
    }
  };

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

        // Upload directly to backend (bypasses Next.js body size limit)
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.starcyeed.com';
        const uploadResponse = await fetch(`${backendUrl}/posts/upload-media`, {
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
    <div className="glass-card p-3 sm:p-6">
      {/* Mobile: avatar + name row, then textarea below. Desktop: side-by-side */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:block">
          <ResponsiveAvatar
            avatarUrls={avatarUrls || (avatarUrl ? { small: avatarUrl, medium: avatarUrl } : undefined)}
            username={username}
            size="small"
            className="flex-shrink-0 sm:hidden"
          />
          <ResponsiveAvatar
            avatarUrls={avatarUrls || (avatarUrl ? { small: avatarUrl, medium: avatarUrl } : undefined)}
            username={username}
            size="medium"
            className="flex-shrink-0 hidden sm:block"
          />
          <span className="text-sm font-medium text-white sm:hidden">{username}</span>
        </div>

        <div className="flex-1 space-y-3 sm:space-y-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-white/5 border border-slate-700 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder:text-slate-500 min-h-[80px] sm:min-h-[100px] resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
            maxLength={5000}
          />

          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-28 sm:h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-1 right-1 sm:top-2 sm:right-2 p-1 sm:p-1.5 bg-black/70 rounded-full hover:bg-black transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
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
                className="px-2 sm:px-3"
              >
                <ImageIcon className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Photo/Video</span>
              </Button>

              <div className="relative">
                <Button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  variant="glass"
                  size="sm"
                  className={`px-2 sm:px-3 ${showEmojiPicker ? 'ring-1 ring-cyan-500' : ''}`}
                >
                  <Smile className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Emoji</span>
                </Button>

                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-[calc(100vw-2rem)] max-w-72 glass-card p-2 sm:p-3 z-50">
                    <div className="grid grid-cols-8 gap-0.5 sm:gap-1">
                      {EMOJI_LIST.map((emoji, i) => (
                        <button
                          key={i}
                          onClick={() => insertEmoji(emoji)}
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-base sm:text-lg hover:bg-white/10 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handlePost}
              variant="primary"
              size="sm"
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
