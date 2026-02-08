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
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push(`/profile?userId=${post.user_id}`)}
        >
          <ResponsiveAvatar
            avatarUrls={post.avatar_url ? { small: post.avatar_url, medium: post.avatar_url } : undefined}
            username={post.username}
            size="medium"
          />
          <div>
            <h3 className="font-semibold text-white">{post.username}</h3>
            <p className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {isOwnPost && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 glass-card p-2 z-10">
                <button
                  onClick={() => {
                    onDelete(post.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded flex items-center gap-2"
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
      <p className="text-slate-200 mb-4 whitespace-pre-wrap">{post.content}</p>

      {/* Media */}
      {post.media_urls.length > 0 && (
        <div className={`grid gap-2 mb-4 ${
          post.media_urls.length === 1 ? 'grid-cols-1' :
          post.media_urls.length === 2 ? 'grid-cols-2' :
          post.media_urls.length === 3 ? 'grid-cols-3' :
          'grid-cols-2'
        }`}>
          {post.media_urls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Post media ${index + 1}`}
              className="w-full h-64 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-6 py-3 border-y border-slate-700/50 text-sm text-slate-400">
        <span>{post.likes_count} likes</span>
        <span>{post.comments_count} comments</span>
        <span>{post.shares_count} shares</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3">
        <Button
          onClick={() => onLike(post.id)}
          variant="glass"
          size="sm"
          className={post.user_liked ? 'text-red-400' : ''}
        >
          <Heart className={`w-4 h-4 mr-2 ${post.user_liked ? 'fill-current' : ''}`} />
          Like
        </Button>

        <Button
          onClick={() => setShowComments(!showComments)}
          variant="glass"
          size="sm"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Comment
        </Button>

        <Button
          onClick={() => onShare(post.id)}
          variant="glass"
          size="sm"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Comment Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex gap-3">
            <ResponsiveAvatar
              avatarUrls={currentAvatarUrls}
              username={currentUsername || currentUserId}
              size="small"
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-white/5 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
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
