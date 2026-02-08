'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    username: string;
    avatar_url?: string;
    content: string;
    media_urls: string[];
    likes_count: number;
    comments_count: number;
    shares_count: number;
    created_at: string;
    user_liked: boolean;
  };
  currentUserId: string;
  currentUsername?: string;
  currentAvatarUrls?: { thumbnail?: string; small?: string; medium?: string; large?: string };
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onShare: (postId: string) => void;
  onDelete: (postId: string) => void;
}

export function PostCard({
  post,
  currentUserId,
  currentUsername,
  currentAvatarUrls,
  onLike,
  onComment,
  onShare,
  onDelete
}: PostCardProps) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const isOwnPost = post.user_id === currentUserId;

  return (
    <div className="glass-card p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0"
          onClick={() => router.push(`/profile?userId=${post.user_id}`)}
        >
          <ResponsiveAvatar
            avatarUrls={post.avatar_url ? { small: post.avatar_url, medium: post.avatar_url } : undefined}
            username={post.username}
            size="small"
            className="flex-shrink-0 sm:hidden"
          />
          <ResponsiveAvatar
            avatarUrls={post.avatar_url ? { small: post.avatar_url, medium: post.avatar_url } : undefined}
            username={post.username}
            size="medium"
            className="flex-shrink-0 hidden sm:block"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm sm:text-base truncate">{post.username}</h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {isOwnPost && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-40 sm:w-48 glass-card p-2 z-10">
                <button
                  onClick={() => {
                    onDelete(post.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded flex items-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <p className="text-slate-200 mb-3 sm:mb-4 whitespace-pre-wrap text-sm sm:text-base">{post.content}</p>

      {/* Media */}
      {post.media_urls.length > 0 && (
        <div className={`grid gap-1.5 sm:gap-2 mb-3 sm:mb-4 ${
          post.media_urls.length === 1 ? 'grid-cols-1' :
          post.media_urls.length === 2 ? 'grid-cols-2' :
          post.media_urls.length === 3 ? 'grid-cols-2 sm:grid-cols-3' :
          'grid-cols-2'
        }`}>
          {post.media_urls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Post media ${index + 1}`}
              className="w-full h-36 sm:h-64 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 sm:gap-6 py-2 sm:py-3 border-y border-slate-700/50 text-xs sm:text-sm text-slate-400">
        <span>{post.likes_count} likes</span>
        <span>{post.comments_count} comments</span>
        <span>{post.shares_count} shares</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 pt-2 sm:pt-3">
        <Button
          onClick={() => onLike(post.id)}
          variant="glass"
          size="sm"
          className={`px-2 sm:px-3 ${post.user_liked ? 'text-red-400' : ''}`}
        >
          <Heart className={`w-4 h-4 sm:mr-2 ${post.user_liked ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">Like</span>
        </Button>

        <Button
          onClick={() => setShowComments(!showComments)}
          variant="glass"
          size="sm"
          className="px-2 sm:px-3"
        >
          <MessageCircle className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Comment</span>
        </Button>

        <Button
          onClick={() => onShare(post.id)}
          variant="glass"
          size="sm"
          className="px-2 sm:px-3"
        >
          <Share2 className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>

      {/* Comment Section */}
      {showComments && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/50">
          <div className="flex gap-2 sm:gap-3">
            <ResponsiveAvatar
              avatarUrls={currentAvatarUrls}
              username={currentUsername || currentUserId}
              size="small"
              className="flex-shrink-0 hidden sm:block"
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 min-w-0 bg-white/5 border border-slate-700 rounded-lg px-3 py-2 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    onComment(post.id, commentText);
                    setCommentText('');
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (commentText.trim()) {
                    onComment(post.id, commentText);
                    setCommentText('');
                  }
                }}
                variant="primary"
                size="sm"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
