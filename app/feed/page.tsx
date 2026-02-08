'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostCard } from '@/components/feed/PostCard';
import { apiClient } from '@/lib/api';
import { StorageUtils } from '@/lib/storage-utils';
import { Home, TrendingUp, Users, Bell, User } from 'lucide-react';
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

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following' | 'trending'>('foryou');

  useEffect(() => {
    // Check authentication
    const userData = StorageUtils.safeGetItem('chat-user');
    if (!userData) {
      router.push('/');
      return;
    }
    const user = JSON.parse(userData);
    setCurrentUser(user);
    loadFeed(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, router]);

  const loadFeed = async (userId?: string) => {
    setLoading(true);
    try {
      const feedPosts = await apiClient.getFeed(activeTab, userId);
      setPosts(feedPosts);
    } catch (error) {
      console.error('Failed to load feed:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts([newPost, ...posts]);
    toast.success('Post created!');
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    try {
      const result = await apiClient.likePost(postId, currentUser.id);
      setPosts(posts.map(post =>
        post.id === postId
          ? {
              ...post,
              likes_count: result.liked ? post.likes_count + 1 : post.likes_count - 1,
              user_liked: result.liked
            }
          : post
      ));
    } catch (error) {
      toast.error('Failed to like post');
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!currentUser) return;
    try {
      await apiClient.commentOnPost(postId, currentUser.id, content);
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      ));
      toast.success('Comment added!');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleShare = async (postId: string) => {
    if (!currentUser) return;
    try {
      const result = await apiClient.sharePost(postId, currentUser.id);
      // If backend returns a new repost object, add it to the top of the feed
      if (result && result.id) {
        setPosts(prev => [result, ...prev]);
      }
      // Also increment the share count on the original post
      setPosts(prev => prev.map(post =>
        post.id === postId || (post.shared_post_id === postId)
          ? { ...post, shares_count: post.shares_count + 1 }
          : post
      ));
      toast.success('Reposted!');
    } catch (error) {
      toast.error('Failed to repost');
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await apiClient.deletePost(postId);
      setPosts(posts.filter(post => post.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
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
          {loading ? (
            <div className="glass-card p-6 xs:p-8 text-center">
              <p className="text-sm xs:text-base text-slate-400">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-6 xs:p-8 text-center">
              <p className="text-sm xs:text-base text-slate-400">No posts yet. Be the first to post!</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
