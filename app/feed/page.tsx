'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostCard } from '@/components/feed/PostCard';
import { apiClient } from '@/lib/api';
import { StorageUtils } from '@/lib/storage-utils';
import { Home, TrendingUp, Users, Bell, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Post {
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
  shared_post_id?: string;
  shared_post?: {
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
  };
}

const POSTS_PER_PAGE = 20;

export default function FeedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following' | 'trending'>('foryou');
  const loaderRef = useRef<HTMLDivElement>(null);

  // Check auth on mount
  useEffect(() => {
    const userData = StorageUtils.safeGetItem('chat-user');
    if (!userData) {
      router.push('/');
      return;
    }
    setCurrentUser(JSON.parse(userData));
  }, [router]);

  // React Query infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', activeTab, currentUser?.id],
    queryFn: async ({ pageParam = 1 }) => {
      return apiClient.getFeed(activeTab, currentUser?.id, pageParam, POSTS_PER_PAGE);
    },
    getNextPageParam: (lastPage, allPages) => {
      // If last page has fewer than POSTS_PER_PAGE, no more pages
      return lastPage.length < POSTS_PER_PAGE ? undefined : allPages.length + 1;
    },
    initialPageParam: 1,
    enabled: !!currentUser, // Only fetch when we have a user
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  // Flatten all pages into a single posts array
  const posts: Post[] = data?.pages.flat() ?? [];

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Helper to update a post in the cache
  const updatePostInCache = useCallback((postId: string, updater: (post: Post) => Post) => {
    queryClient.setQueryData(['feed', activeTab, currentUser?.id], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: Post[]) =>
          page.map((post) => (post.id === postId ? updater(post) : post))
        ),
      };
    });
  }, [queryClient, activeTab, currentUser?.id]);

  const handlePostCreated = (newPost: Post) => {
    // Optimistically add new post to the top of the first page
    queryClient.setQueryData(['feed', activeTab, currentUser?.id], (oldData: any) => {
      if (!oldData) return { pages: [[newPost]], pageParams: [1] };
      return {
        ...oldData,
        pages: [[newPost, ...oldData.pages[0]], ...oldData.pages.slice(1)],
      };
    });
    toast.success('Post created!');
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    
    // Find current state
    const currentPost = posts.find(p => p.id === postId);
    if (!currentPost) return;
    
    // Optimistic update
    updatePostInCache(postId, (post) => ({
      ...post,
      likes_count: post.user_liked ? post.likes_count - 1 : post.likes_count + 1,
      user_liked: !post.user_liked,
    }));

    try {
      await apiClient.likePost(postId, currentUser.id);
    } catch (error) {
      // Revert on error
      updatePostInCache(postId, (post) => ({
        ...post,
        likes_count: currentPost.likes_count,
        user_liked: currentPost.user_liked,
      }));
      toast.error('Failed to like post');
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!currentUser) return;
    
    // Optimistic update
    updatePostInCache(postId, (post) => ({
      ...post,
      comments_count: post.comments_count + 1,
    }));

    try {
      await apiClient.commentOnPost(postId, currentUser.id, content);
      toast.success('Comment added!');
    } catch (error) {
      // Revert on error
      updatePostInCache(postId, (post) => ({
        ...post,
        comments_count: post.comments_count - 1,
      }));
      toast.error('Failed to add comment');
    }
  };

  const handleShare = async (postId: string) => {
    if (!currentUser) return;
    
    // Optimistic update for share count
    updatePostInCache(postId, (post) => ({
      ...post,
      shares_count: post.shares_count + 1,
    }));

    try {
      const result = await apiClient.sharePost(postId, currentUser.id);
      // If backend returns a new repost object, add it to the top
      if (result && result.id) {
        queryClient.setQueryData(['feed', activeTab, currentUser?.id], (oldData: any) => {
          if (!oldData) return { pages: [[result]], pageParams: [1] };
          return {
            ...oldData,
            pages: [[result, ...oldData.pages[0]], ...oldData.pages.slice(1)],
          };
        });
      }
      toast.success('Reposted!');
    } catch (error) {
      // Revert on error
      updatePostInCache(postId, (post) => ({
        ...post,
        shares_count: post.shares_count - 1,
      }));
      toast.error('Failed to repost');
    }
  };

  const handleDelete = async (postId: string) => {
    // Optimistically remove from cache
    queryClient.setQueryData(['feed', activeTab, currentUser?.id], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: Post[]) =>
          page.filter((post) => post.id !== postId)
        ),
      };
    });

    try {
      await apiClient.deletePost(postId);
      toast.success('Post deleted');
    } catch (error) {
      // Refetch on error to restore
      refetch();
      toast.error('Failed to delete post');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black">
      {/* Navigation Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md sm:backdrop-blur-xl bg-black/70 sm:bg-black/50 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 sm:py-3">
          {/* Top row: title + nav buttons */}
          <div className="flex items-center justify-between mb-1.5 xs:mb-2 sm:mb-0">
            <h1 className="text-lg xs:text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Feed
            </h1>

            <div className="flex items-center gap-2">
              {/* Tab Navigation — inline on desktop */}
              <div className="hidden sm:flex gap-2">
                {[
                  { id: 'foryou', label: 'For You', icon: TrendingUp },
                  { id: 'following', label: 'Following', icon: Users },
                  { id: 'trending', label: 'Trending', icon: Bell }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'bg-cyan-500 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={() => router.push('/profile')}
                variant="glass"
                size="sm"
                className="px-2 sm:px-3"
              >
                <User className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="glass"
                size="sm"
                className="px-2 sm:px-3"
              >
                <Home className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tab Navigation — row on mobile */}
          <div className="flex sm:hidden gap-0.5 xs:gap-1">
            {[
              { id: 'foryou', label: 'For You', icon: TrendingUp },
              { id: 'following', label: 'Following', icon: Users },
              { id: 'trending', label: 'Trending', icon: Bell }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-1.5 xs:px-2 py-1.5 rounded-lg text-[11px] xs:text-xs font-medium transition-all flex items-center justify-center gap-0.5 xs:gap-1 ${
                    activeTab === tab.id
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-2 xs:px-3 sm:px-4 py-3 xs:py-4 sm:py-6 space-y-3 xs:space-y-4 sm:space-y-6">
        {/* Post Composer */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PostComposer
              userId={currentUser.id}
              username={currentUser.username}
              avatarUrl={currentUser.avatar_url}
              avatarUrls={currentUser.avatar_urls}
              onPostCreated={handlePostCreated}
            />
          </motion.div>
        )}

        {/* Posts Feed */}
        <div className="space-y-3 xs:space-y-4">
          {isLoading ? (
            <div className="glass-card p-6 xs:p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              <p className="text-sm xs:text-base text-slate-400">Loading posts...</p>
            </div>
          ) : isError ? (
            <div className="glass-card p-6 xs:p-8 text-center">
              <p className="text-sm xs:text-base text-red-400 mb-2">Failed to load posts</p>
              <Button onClick={() => refetch()} variant="glass" size="sm">
                Try Again
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-6 xs:p-8 text-center">
              <p className="text-sm xs:text-base text-slate-400">No posts yet. Be the first to post!</p>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.5) }}
                >
                  <PostCard
                    post={post}
                    currentUserId={currentUser?.id}
                    currentUsername={currentUser?.username}
                    currentAvatarUrls={currentUser?.avatar_urls}
                    onLike={handleLike}
                    onComment={handleComment}
                    onShare={handleShare}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
              
              {/* Infinite scroll loader */}
              <div ref={loaderRef} className="py-4 text-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                ) : hasNextPage ? (
                  <p className="text-sm text-slate-500">Scroll for more</p>
                ) : posts.length > POSTS_PER_PAGE - 1 ? (
                  <p className="text-sm text-slate-500">You've reached the end ✨</p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
