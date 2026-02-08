'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api';

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
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsFetched, setCommentsFetched] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const isOwnPost = post.user_id === currentUserId;

  const toggleComments = useCallback(async () => {
    const willShow = !showComments;
    setShowComments(willShow);

    if (willShow && !commentsFetched) {
      setCommentsLoading(true);
      setCommentsError(null);
      try {
        console.log(`[PostCard] Fetching comments for post ${post.id}...`);
        const fetched = await apiClient.getComments(post.id);
        console.log(`[PostCard] Got ${fetched?.length ?? 0} comments for post ${post.id}:`, fetched);
        setComments(Array.isArray(fetched) ? fetched : []);
        setCommentsFetched(true);
      } catch (err: any) {
        console.error(`[PostCard] Failed to fetch comments for post ${post.id}:`, err);
        setCommentsError(err?.message || 'Failed to load comments');
      } finally {
        setCommentsLoading(false);
      }
    }
  }, [showComments, commentsFetched, post.id]);

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    // Optimistically add the comment to the local list
    const optimistic = {
      id: `temp-${Date.now()}`,
      post_id: post.id,
      user_id: currentUserId,
      username: currentUsername || currentUserId,
      avatar_url: currentAvatarUrls?.small || currentAvatarUrls?.medium,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
    };
    setComments(prev => [...prev, optimistic]);
    onComment(post.id, commentText.trim());
    setCommentText('');
  };

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

      {/* Stats — tap comments count to expand */}
      <div className="flex items-center gap-3 sm:gap-6 py-2 sm:py-3 border-y border-slate-700/50 text-xs sm:text-sm text-slate-400">
        <span>{post.likes_count} likes</span>
        <button
          onClick={toggleComments}
          className="hover:text-cyan-400 transition-colors flex items-center gap-1"
        >
          {post.comments_count + (comments.length > 0 ? Math.max(0, comments.length - post.comments_count) : 0)} comments
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
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
          onClick={toggleComments}
          variant="glass"
          size="sm"
          className={`px-2 sm:px-3 ${showComments ? 'text-cyan-400' : ''}`}
        >
          <MessageCircle className={`w-4 h-4 sm:mr-2 ${showComments ? 'fill-current' : ''}`} />
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

      {/* Comment Section — expandable thread */}
      {showComments && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/50 space-y-3">
          {/* Existing comments */}
          {commentsLoading ? (
            <div className="flex items-center justify-center gap-2 py-3 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading comments...
            </div>
          ) : commentsError ? (
            <div className="text-center py-2 space-y-1">
              <p className="text-xs sm:text-sm text-red-400">{commentsError}</p>
              <button
                onClick={async () => {
                  setCommentsError(null);
                  setCommentsLoading(true);
                  try {
                    const fetched = await apiClient.getComments(post.id);
                    setComments(Array.isArray(fetched) ? fetched : []);
                    setCommentsFetched(true);
                  } catch (err: any) {
                    setCommentsError(err?.message || 'Failed to load comments');
                  } finally {
                    setCommentsLoading(false);
                  }
                }}
                className="text-xs text-cyan-400 hover:underline"
              >
                Tap to retry
              </button>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 sm:gap-3">
                  <ResponsiveAvatar
                    avatarUrls={c.avatar_url ? { small: c.avatar_url, medium: c.avatar_url } : undefined}
                    username={c.username || 'User'}
                    size="small"
                    className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8"
                  />
                  <div className="flex-1 min-w-0 bg-white/5 rounded-xl px-3 py-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className="text-xs sm:text-sm font-semibold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                        onClick={() => router.push(`/profile?userId=${c.user_id}`)}
                      >
                        {c.username || 'User'}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-500">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-0.5 break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500 text-center py-2">No comments yet — be the first!</p>
          )}

          {/* New comment input */}
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
                  if (e.key === 'Enter') handleSubmitComment();
                }}
              />
              <Button
                onClick={handleSubmitComment}
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
