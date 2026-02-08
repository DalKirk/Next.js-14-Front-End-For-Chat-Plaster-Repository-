'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ResponsiveAvatar } from '@/components/ResponsiveAvatar';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, ChevronDown, ChevronUp, Loader2, Repeat2, Link2, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

interface SharedPost {
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
}

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
    // Repost fields
    shared_post_id?: string;
    shared_post?: SharedPost;
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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
        // Reverse so newest shows at top
        setComments(Array.isArray(fetched) ? [...fetched].reverse() : []);
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
    setComments(prev => [optimistic, ...prev]);
    onComment(post.id, commentText.trim());
    setCommentText('');
  };

  const isRepost = !!post.shared_post_id;
  const originalPost = post.shared_post;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/feed?post=${post.shared_post_id || post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
    setShowShareMenu(false);
  };

  const handleRepost = () => {
    onShare(post.shared_post_id || post.id); // repost the original, not a repost-of-repost
    setShowShareMenu(false);
  };

  return (
    <div className="glass-card p-2.5 xs:p-3 sm:p-6">
      {/* Repost header */}
      {isRepost && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Repeat2 className="w-3.5 h-3.5" />
            <span
              className="font-medium hover:text-cyan-400 cursor-pointer transition-colors"
              onClick={() => router.push(`/profile?userId=${post.user_id}`)}
            >
              {post.username}
            </span>
            <span>reposted</span>
          </div>
          {isOwnPost && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-slate-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-40 glass-card p-2 z-10">
                  {confirmDelete ? (
                    <>
                      <p className="px-3 py-1.5 text-xs text-slate-300">Delete this repost?</p>
                      <div className="flex gap-1 px-2 pb-1">
                        <button
                          onClick={() => { onDelete(post.id); setShowMenu(false); setConfirmDelete(false); }}
                          className="flex-1 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded font-medium"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => { setConfirmDelete(false); setShowMenu(false); }}
                          className="flex-1 px-2 py-1.5 text-xs text-slate-400 hover:bg-white/10 rounded"
                        >
                          No
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded flex items-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Repost
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Repost comment (if the user added text when sharing) */}
      {isRepost && post.content && (
        <p className="text-slate-300 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Original post embed (for reposts) or normal post */}
      {isRepost ? (
        originalPost ? (
        <div className="border border-slate-700/50 rounded-xl p-2 xs:p-3 sm:p-4 bg-white/[0.02]">
          {/* Original post header */}
          <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => router.push(`/profile?userId=${originalPost.user_id}`)}>
            <ResponsiveAvatar
              avatarUrls={originalPost.avatar_url ? { small: originalPost.avatar_url, medium: originalPost.avatar_url } : undefined}
              username={originalPost.username}
              size="small"
              className="flex-shrink-0 w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9"
            />
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-[13px] xs:text-sm truncate">{originalPost.username}</h3>
              <p className="text-[10px] text-slate-400">
                {formatDistanceToNow(new Date(originalPost.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {/* Original content */}
          <p className="text-slate-200 mb-2 whitespace-pre-wrap break-words text-[13px] xs:text-sm">{originalPost.content}</p>
          {/* Original media */}
          {originalPost.media_urls?.length > 0 && (
            <div className={`grid gap-1 xs:gap-1.5 mb-2 ${originalPost.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {originalPost.media_urls.map((url, i) => (
                <img key={i} src={url} alt={`Media ${i + 1}`} className="w-full h-24 xs:h-32 sm:h-48 object-cover rounded-lg" />
              ))}
            </div>
          )}
          {/* Original stats */}
          <div className="flex items-center gap-2 xs:gap-3 text-[10px] text-slate-500">
            <span>{originalPost.likes_count} likes</span>
            <span>{originalPost.comments_count} comments</span>
            <span>{originalPost.shares_count} shares</span>
          </div>
        </div>
        ) : (
          <div className="border border-slate-700/50 rounded-xl p-2 xs:p-3 sm:p-4 bg-white/[0.02]">
            <p className="text-slate-500 text-[13px] xs:text-sm italic">Original post unavailable</p>
          </div>
        )
      ) : (
        <>
      {/* Header */}
      <div className="flex items-start justify-between mb-2.5 xs:mb-3 sm:mb-4">
        <div
          className="flex items-center gap-2 cursor-pointer min-w-0"
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
            <h3 className="font-semibold text-white text-[13px] xs:text-sm sm:text-base truncate">{post.username}</h3>
            <p className="text-[10px] xs:text-[11px] sm:text-xs text-slate-400">
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
                {confirmDelete ? (
                  <>
                    <p className="px-3 py-1.5 text-xs text-slate-300">Delete this post?</p>
                    <div className="flex gap-1 px-2 pb-1">
                      <button
                        onClick={() => { onDelete(post.id); setShowMenu(false); setConfirmDelete(false); }}
                        className="flex-1 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded font-medium"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(false); setShowMenu(false); }}
                        className="flex-1 px-2 py-1.5 text-xs text-slate-400 hover:bg-white/10 rounded"
                      >
                        No
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Post
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <p className="text-slate-200 mb-2.5 xs:mb-3 sm:mb-4 whitespace-pre-wrap break-words text-[13px] xs:text-sm sm:text-base">{post.content}</p>

      {/* Media */}
      {post.media_urls.length > 0 && (
        <div className={`grid gap-1 xs:gap-1.5 sm:gap-2 mb-2.5 xs:mb-3 sm:mb-4 ${
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
              className="w-full h-28 xs:h-36 sm:h-64 object-cover rounded-lg"
            />
          ))}
        </div>
      )}
        </>
      )}

      {/* Stats — tap comments count to expand */}
      <div className="flex items-center gap-2 xs:gap-3 sm:gap-6 py-1.5 xs:py-2 sm:py-3 border-y border-slate-700/50 text-[11px] xs:text-xs sm:text-sm text-slate-400">
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
      <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2 pt-1.5 xs:pt-2 sm:pt-3">
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

        <div className="relative">
          <Button
            onClick={() => setShowShareMenu(!showShareMenu)}
            variant="glass"
            size="sm"
            className="px-2 sm:px-3"
          >
            <Share2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          {showShareMenu && (
            <div className="absolute left-0 bottom-full mb-2 w-44 glass-card p-2 z-10">
              <button
                onClick={handleRepost}
                className="w-full px-3 py-2 text-left text-white hover:bg-cyan-500/10 rounded flex items-center gap-2 text-sm"
              >
                <Repeat2 className="w-4 h-4 text-cyan-400" />
                Repost
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full px-3 py-2 text-left text-white hover:bg-cyan-500/10 rounded flex items-center gap-2 text-sm"
              >
                <Copy className="w-4 h-4 text-cyan-400" />
                Copy Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comment Section — chat-style thread */}
      {showComments && (
        <div className="mt-2.5 xs:mt-3 sm:mt-4 pt-2.5 xs:pt-3 sm:pt-4 border-t border-slate-700/50">
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
            <div className="max-h-72 overflow-y-auto mb-3" style={{ overflowX: 'hidden' }}>
              <div className="space-y-1">
                {comments.map((c) => {
                  const isOwn = c.user_id === currentUserId;
                  return (
                    <div key={c.id} className="flex w-full justify-start">
                        <div className="flex items-start gap-1.5 xs:gap-2 max-w-[95%] xs:max-w-[90%] sm:max-w-[85%]">
                        {/* Avatar */}
                        <div
                          className="flex-shrink-0 cursor-pointer"
                          onClick={() => router.push(`/profile?userId=${c.user_id}`)}
                        >
                          <ResponsiveAvatar
                            avatarUrls={c.avatar_url ? { small: c.avatar_url, medium: c.avatar_url } : undefined}
                            username={c.username || 'User'}
                            size="small"
                            className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7"
                          />
                        </div>
                        {/* Message bubble */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 xs:gap-2 mb-0.5">
                            <span
                              className={`text-[11px] xs:text-xs font-semibold cursor-pointer hover:text-cyan-400 transition-colors ${
                                isOwn ? 'text-cyan-300' : 'text-white'
                              }`}
                              onClick={() => router.push(`/profile?userId=${c.user_id}`)}
                            >
                              {c.username || 'User'}
                            </span>
                            <span className="text-[9px] xs:text-[10px] text-slate-500">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-[12px] xs:text-xs sm:text-sm text-slate-200 break-words whitespace-pre-wrap">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[11px] xs:text-xs sm:text-sm text-slate-500 text-center py-1.5 xs:py-2 mb-2 xs:mb-3">No comments yet — be the first!</p>
          )}

          {/* New comment input */}
          <div className="flex gap-1.5 xs:gap-2 sm:gap-3 pt-1.5 xs:pt-2 border-t border-slate-700/30">
            <ResponsiveAvatar
              avatarUrls={currentAvatarUrls}
              username={currentUsername || currentUserId}
              size="small"
              className="flex-shrink-0 w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 hidden sm:block"
            />
            <div className="flex-1 flex gap-1.5 xs:gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 min-w-0 bg-white/5 border border-slate-700 rounded-lg px-2 xs:px-3 py-1.5 xs:py-2 text-[13px] xs:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
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
