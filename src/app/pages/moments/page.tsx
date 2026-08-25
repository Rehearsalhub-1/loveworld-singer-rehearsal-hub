"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  Music2, 
  Globe, 
  MapPin, 
  Trash2, 
  X, 
  Send, 
  Image as ImageIcon, 
  Film, 
  Camera,
  Volume2, 
  VolumeX, 
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Smile,
  Bookmark,
  Compass,
  Home,
  Tv,
  BarChart3,
  Archive,
  QrCode,
  Settings,
  LogOut,
  Search,
  Check,
  Loader2,
  Users,
  ChevronDown,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { apiClient } from '@/lib/api-client';
import { uploadToCloudinary } from '@/lib/cloudinary-storage';
import { SyncAvatar } from '../groups/_components/SyncAvatar';
import { motion, AnimatePresence } from 'framer-motion';

export interface MomentMedia {
  url: string;
  thumbnailUrl?: string;
  type?: 'photo' | 'video' | 'audio';
}

export interface Moment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  zoneId: string;
  zoneName: string;
  type: 'photo' | 'video' | 'carousel' | 'audio';
  mediaUrls: MomentMedia[];
  caption: string;
  tags: string[];
  songTitle?: string;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  isFollowingAuthor?: boolean;
  createdAt: string;
}

export interface MomentComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export default function MomentsPage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { currentZone } = useZone();

  const [activeNav, setActiveNav] = useState<'feed' | 'explore' | 'reels' | 'messages' | 'saved' | 'insights' | 'archive' | 'settings'>('feed');
  const [feedFilter, setFeedFilter] = useState<'fyp' | 'following'>('fyp');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [suggestedSingers, setSuggestedSingers] = useState<{ id: string; name: string; role?: string; avatar?: string }[]>([]);

  // Filtered by selected story author (null = all)
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string | null>(null);

  // Inline comments input per moment: { [momentId]: string }
  const [inlineComments, setInlineComments] = useState<Record<string, string>>({});
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null);

  // Video playback & mute states
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Heart burst animation
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);

  // Saved/bookmarked moments
  const [savedMomentIds, setSavedMomentIds] = useState<Record<string, boolean>>({});

  // Create Moment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [songTag, setSongTag] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Active comments modal
  const [selectedMomentForComments, setSelectedMomentForComments] = useState<Moment | null>(null);
  const [activeCommentsList, setActiveCommentsList] = useState<MomentComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Fetch following IDs
  const fetchFollowingIds = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/moments/following/ids');
      if (res && res.success && Array.isArray(res.followingIds)) {
        setFollowingSet(new Set(res.followingIds));
      }
    } catch {}
  }, []);

  // Fetch real moments (FYP Algorithmic vs Following)
  const fetchMoments = useCallback(async () => {
    try {
      setLoading(true);
      const query = `?feed=${feedFilter}`;
      const res = await apiClient.get<any>(`/moments${query}`);
      if (res && res.success) {
        setMoments(res.data || []);
      }
    } catch (err) {
      console.error('[MomentsPage] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [feedFilter]);

  // Fetch real suggested singers
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/moments/following/suggestions');
      if (res && res.success && Array.isArray(res.data)) {
        setSuggestedSingers(res.data);
      } else {
        const userRes = await apiClient.get<any>('/users?limit=6');
        if (userRes && (userRes.users || userRes.data)) {
          const list = userRes.users || userRes.data;
          setSuggestedSingers(list.map((u: any) => ({
            id: u.id || u.uid,
            name: u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : (u.name || u.email || 'Singer'),
            role: u.zone_name || u.role || 'Choir Member',
            avatar: u.avatar_url || u.avatar || undefined
          })));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchFollowingIds();
    fetchSuggestions();
  }, [fetchFollowingIds, fetchSuggestions]);

  useEffect(() => {
    fetchMoments();
  }, [fetchMoments]);

  // Toggle follow/unfollow
  const handleToggleFollow = async (targetUserId: string) => {
    const isCurrentlyFollowing = followingSet.has(targetUserId);
    
    // Optimistic UI update
    setFollowingSet(prev => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) next.delete(targetUserId);
      else next.add(targetUserId);
      return next;
    });

    try {
      const res = await apiClient.post<any>(`/moments/follow/${targetUserId}`, {});
      if (res && res.success) {
        setFollowingSet(prev => {
          const next = new Set(prev);
          if (res.isFollowing) next.add(targetUserId);
          else next.delete(targetUserId);
          return next;
        });
      }
    } catch {
      // Revert on error
      setFollowingSet(prev => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) next.add(targetUserId);
        else next.delete(targetUserId);
        return next;
      });
    }
  };

  // Extract unique active story authors from real moments
  const realStories = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string; zoneName?: string }>();
    moments.forEach(m => {
      if (!map.has(m.userId)) {
        map.set(m.userId, {
          id: m.userId,
          name: m.userName,
          avatar: m.userAvatar,
          zoneName: m.zoneName
        });
      }
    });
    return Array.from(map.values());
  }, [moments]);

  const handleLike = async (moment: Moment) => {
    const originalLiked = moment.hasLiked;
    const originalCount = moment.likesCount;

    setMoments(prev =>
      prev.map(m =>
        m.id === moment.id
          ? {
              ...m,
              hasLiked: !originalLiked,
              likesCount: originalLiked ? Math.max(0, originalCount - 1) : originalCount + 1,
            }
          : m
      )
    );

    try {
      const res = await apiClient.post<any>(`/moments/${moment.id}/like`, {});
      if (res && res.success) {
        setMoments(prev =>
          prev.map(m =>
            m.id === moment.id
              ? { ...m, hasLiked: res.liked, likesCount: res.likesCount }
              : m
          )
        );
      }
    } catch {
      setMoments(prev =>
        prev.map(m =>
          m.id === moment.id
            ? { ...m, hasLiked: originalLiked, likesCount: originalCount }
            : m
        )
      );
    }
  };

  const handleDoubleTap = (moment: Moment) => {
    setHeartBurstId(moment.id);
    setTimeout(() => setHeartBurstId(null), 900);
    if (!moment.hasLiked) {
      handleLike(moment);
    }
  };

  const handleToggleBookmark = (momentId: string) => {
    setSavedMomentIds(prev => ({
      ...prev,
      [momentId]: !prev[momentId]
    }));
  };

  const handlePostInlineComment = async (moment: Moment) => {
    const text = inlineComments[moment.id]?.trim();
    if (!text || postingCommentId === moment.id) return;

    setPostingCommentId(moment.id);
    try {
      const res = await apiClient.post<any>(`/moments/${moment.id}/comments`, { content: text });
      if (res && res.success) {
        setMoments(prev =>
          prev.map(m =>
            m.id === moment.id ? { ...m, commentsCount: m.commentsCount + 1 } : m
          )
        );
        setInlineComments(prev => ({ ...prev, [moment.id]: '' }));
      }
    } catch (err) {
      alert('Failed to post comment');
    } finally {
      setPostingCommentId(null);
    }
  };

  const openCommentsModal = async (moment: Moment) => {
    setSelectedMomentForComments(moment);
    setActiveCommentsList([]);
    setCommentsLoading(true);
    try {
      const res = await apiClient.get<any>(`/moments/${moment.id}/comments`);
      if (res && res.success) {
        setActiveCommentsList(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePublishMoment = async () => {
    if (uploadFiles.length === 0) return;
    setIsPublishing(true);
    setUploadProgress(15);

    try {
      const uploadedMedia: MomentMedia[] = [];

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const url = await uploadToCloudinary(file, (p) => {
          setUploadProgress(Math.round(((i + p / 100) / uploadFiles.length) * 80) + 15);
        }, 'moments');

        if (url) {
          uploadedMedia.push({
            url,
            type: file.type.startsWith('video/') ? 'video' : 'photo',
          });
        }
      }

      if (uploadedMedia.length === 0) {
        throw new Error('Failed to upload selected media files.');
      }

      const res = await apiClient.post<any>('/moments', {
        type: uploadedMedia.some(m => m.type === 'video') ? 'video' : uploadedMedia.length > 1 ? 'carousel' : 'photo',
        mediaUrls: uploadedMedia,
        caption: caption.trim(),
        tags: ['#LoveworldSingers'],
        songTitle: songTag.trim() || undefined,
        zoneId: (profile as any)?.zone_id || currentZone?.id || 'hq',
        zoneName: (profile as any)?.zone_name || currentZone?.name || 'Loveworld Singers HQ',
      });

      if (res && res.success) {
        setMoments(prev => [res.data, ...prev]);
        setShowCreateModal(false);
        setUploadFiles([]);
        setCaption('');
        setSongTag('');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to post moment. Please check your connection and try again.');
    } finally {
      setIsPublishing(false);
      setUploadProgress(0);
    }
  };

  // Filter moments if author story clicked
  const displayedMoments = React.useMemo(() => {
    let list = moments;
    if (selectedAuthorFilter) {
      list = list.filter(m => m.userId === selectedAuthorFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.userName.toLowerCase().includes(q) || 
        m.caption?.toLowerCase().includes(q) ||
        m.songTitle?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [moments, selectedAuthorFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-pink-500 selection:text-white pb-20 md:pb-8">
      
      {/* ── TOP HEADER BAR ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedAuthorFilter(null); router.push('/pages/moments'); }}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">
              Moments <span className="text-pink-600 font-bold">& Reels</span>
            </h1>
          </div>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="hidden md:flex items-center relative w-72 lg:w-96">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search singers, songs, reels..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded-full text-xs font-medium focus:outline-none transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-purple-900/10 active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Post Moment</span>
          </button>

          <button
            onClick={() => router.push('/pages/groups')}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors relative"
            title="Messages & Groups"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          <div
            className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/30 cursor-pointer hidden sm:block"
            onClick={() => router.push('/pages/profile')}
          >
            <SyncAvatar
              userId={user?.id || user?.uid}
              fallbackName={user?.displayName || (user as any)?.name || 'Me'}
              size="w-10 h-10"
              className="rounded-full"
            />
          </div>
        </div>
      </header>

      {/* ── 3-COLUMN RESPONSIVE LAYOUT ── */}
      <div className="max-w-7xl mx-auto px-0 sm:px-6 py-4 sm:py-6 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* ═════════ 1. LEFT NAVIGATION SIDEBAR (Desktop >= md) ═════════ */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-22 space-y-5">
          {/* User Profile Card */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-pink-500/40 flex-shrink-0">
                <SyncAvatar
                  userId={user?.id || user?.uid}
                  fallbackName={user?.displayName || (user as any)?.name || 'Me'}
                  size="w-12 h-12"
                  className="rounded-full"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 truncate">
                  {user?.displayName || (user as any)?.name || 'Choir Singer'}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {followingSet.size} following
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/pages/profile')}
              className="text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors flex-shrink-0"
            >
              Profile
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-xs space-y-1">
            {[
              { id: 'feed', label: 'For You (FYP)', icon: Home, action: () => { setFeedFilter('fyp'); setSelectedAuthorFilter(null); setActiveNav('feed'); } },
              { id: 'following', label: 'Following', icon: Users, action: () => { setFeedFilter('following'); setSelectedAuthorFilter(null); setActiveNav('feed'); } },
              { id: 'reels', label: 'Reels & Videos', icon: Film, action: () => setActiveNav('reels') },
              { id: 'messages', label: 'Messages & Groups', icon: MessageCircle, action: () => router.push('/pages/groups') },
              { id: 'saved', label: 'Saved Moments', icon: Bookmark, action: () => setActiveNav('saved') },
              { id: 'archive', label: 'Rehearsals Hub', icon: Archive, action: () => router.push('/pages/rehearsals') },
              { id: 'settings', label: 'Settings', icon: Settings, action: () => router.push('/pages/profile') },
            ].map(item => {
              const Icon = item.icon;
              const isActive = (item.id === 'feed' && feedFilter === 'fyp' && activeNav === 'feed') ||
                               (item.id === 'following' && feedFilter === 'following' && activeNav === 'feed') ||
                               (activeNav === item.id);
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-pink-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-slate-100">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* ═════════ 2. CENTER NEWS FEED COLUMN ═════════ */}
        <main className="col-span-1 md:col-span-8 lg:col-span-6 space-y-4 sm:space-y-6">
          
          {/* Stories Highlights Tray (Real Choir Members) */}
          <div className="bg-white sm:rounded-3xl p-3.5 sm:p-4 border-y sm:border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Choir Highlights</h3>
              {selectedAuthorFilter && (
                <button
                  onClick={() => setSelectedAuthorFilter(null)}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700"
                >
                  Show All
                </button>
              )}
            </div>

            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
              {/* Your Story Button */}
              <div
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="relative p-0.5 rounded-full ring-2 ring-slate-200 group-hover:scale-105 transition-transform">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center">
                    <Plus className="w-5 h-5 text-pink-400" />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[64px] text-center">
                  Your Story
                </span>
              </div>

              {/* Real Story Posters */}
              {realStories.map(story => (
                <div
                  key={story.id}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                  onClick={() => setSelectedAuthorFilter(story.id === selectedAuthorFilter ? null : story.id)}
                >
                  <div className={`relative p-[2.5px] rounded-full transition-transform group-hover:scale-105 ${
                    story.id === selectedAuthorFilter
                      ? 'bg-slate-900 ring-2 ring-pink-500'
                      : 'bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400'
                  }`}>
                    <div className="w-13 h-13 rounded-full overflow-hidden bg-white p-0.5">
                      <SyncAvatar userId={story.id} fallbackName={story.name} size="w-full h-full" className="rounded-full" />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[64px] text-center">
                    {story.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TikTok / Instagram Style Feed Selector (For You vs Following) */}
          <div className="flex items-center justify-between px-3 sm:px-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-1 flex items-center shadow-xs">
              <button
                onClick={() => { setFeedFilter('fyp'); setSelectedAuthorFilter(null); }}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                  feedFilter === 'fyp'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                For You (FYP)
              </button>
              <button
                onClick={() => { setFeedFilter('following'); setSelectedAuthorFilter(null); }}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                  feedFilter === 'following'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Following
              </button>
            </div>

            {selectedAuthorFilter && (
              <span className="text-xs font-bold text-slate-400">
                Filtered by singer
              </span>
            )}
          </div>

          {/* Feed Cards */}
          {loading ? (
            <div className="bg-white sm:rounded-3xl p-12 border-y sm:border border-slate-200 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
              <p className="text-xs font-bold text-slate-500">Ranking choir feed algorithm...</p>
            </div>
          ) : displayedMoments.length === 0 ? (
            <div className="bg-white sm:rounded-3xl p-12 border-y sm:border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {feedFilter === 'following' ? 'No Posts from People You Follow' : 'No Moments in Feed'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {feedFilter === 'following'
                    ? 'Follow choir members and vocal leaders from the For You feed to see their updates here!'
                    : 'Be the first to share a rehearsal video, vocal harmony, or praise clip!'}
                </p>
              </div>
              <button
                onClick={() => feedFilter === 'following' ? setFeedFilter('fyp') : setShowCreateModal(true)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md"
              >
                {feedFilter === 'following' ? 'Browse For You Feed' : 'Post Moment'}
              </button>
            </div>
          ) : (
            displayedMoments.map(moment => {
              const firstMedia = moment.mediaUrls?.[0] || { url: '', type: 'photo' };
              const isVideo = firstMedia.type === 'video' || firstMedia.url.endsWith('.mp4') || firstMedia.url.endsWith('.webm');
              const isBookmarked = !!savedMomentIds[moment.id];
              const isFollowing = followingSet.has(moment.userId);
              const isSelf = moment.userId === user?.id;

              return (
                <article
                  key={moment.id}
                  className="bg-white sm:rounded-3xl border-y sm:border border-slate-200/90 shadow-sm overflow-hidden"
                >
                  {/* Author Header */}
                  <div className="p-3.5 sm:p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-pink-500/30">
                        <SyncAvatar userId={moment.userId} fallbackName={moment.userName} size="w-10 h-10" className="rounded-full" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{moment.userName}</h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-50 text-pink-600 border border-pink-100">
                            {moment.zoneName || 'HQ'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {new Date(moment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleFollow(moment.userId)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            isFollowing
                              ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}

                      <button
                        onClick={() => router.push('/pages/groups')}
                        className="text-xs font-bold text-pink-600 hover:text-pink-700 px-3 py-1 rounded-full bg-pink-50 hover:bg-pink-100 transition-colors"
                      >
                        Message
                      </button>
                    </div>
                  </div>

                  {/* Media Frame with Double-tap Heart */}
                  <div
                    className="relative w-full aspect-square bg-slate-950 flex items-center justify-center cursor-pointer select-none overflow-hidden"
                    onDoubleClick={() => handleDoubleTap(moment)}
                  >
                    {isVideo ? (
                      <div className="relative w-full h-full">
                        <video
                          src={firstMedia.url}
                          className="w-full h-full object-cover"
                          loop
                          playsInline
                          muted={isMuted}
                          autoPlay={playingVideoId === moment.id}
                          onClick={() => setPlayingVideoId(playingVideoId === moment.id ? null : moment.id)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                          }}
                          className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-all"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <img
                        src={firstMedia.url}
                        alt="Rehearsal Moment"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Double-tap Heart Burst */}
                    <AnimatePresence>
                      {heartBurstId === moment.id && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 1.4, 1], opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                        >
                          <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_10px_20px_rgba(244,63,94,0.6)]" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action Bar */}
                  <div className="p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Likes Pill */}
                        <button
                          onClick={() => handleLike(moment)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all active:scale-95 ${
                            moment.hasLiked
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${moment.hasLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                          <span>{moment.likesCount}</span>
                        </button>

                        {/* Comments Pill */}
                        <button
                          onClick={() => openCommentsModal(moment)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all active:scale-95"
                        >
                          <MessageCircle className="w-4 h-4 text-slate-600" />
                          <span>{moment.commentsCount}</span>
                        </button>

                        {/* Share Button */}
                        <button
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(firstMedia.url);
                              alert('Link copied!');
                            }
                          }}
                          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bookmark Icon */}
                      <button
                        onClick={() => handleToggleBookmark(moment.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          isBookmarked ? 'text-pink-600 bg-pink-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-pink-600' : ''}`} />
                      </button>
                    </div>

                    {/* Tagged Song Badge */}
                    {moment.songTitle && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-bold">
                        <Music2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Song: {moment.songTitle}</span>
                      </div>
                    )}

                    {/* Caption */}
                    {moment.caption && (
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong className="font-bold text-slate-900">{moment.userName} </strong>
                        {moment.caption}
                      </p>
                    )}

                    {/* View all comments */}
                    {moment.commentsCount > 0 && (
                      <button
                        onClick={() => openCommentsModal(moment)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        View all {moment.commentsCount} comments
                      </button>
                    )}

                    {/* Direct Inline Comment Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                        <SyncAvatar
                          userId={user?.id || user?.uid}
                          fallbackName={user?.displayName || 'Me'}
                          size="w-7 h-7"
                          className="rounded-full"
                        />
                      </div>
                      <input
                        type="text"
                        value={inlineComments[moment.id] || ''}
                        onChange={e => setInlineComments({ ...inlineComments, [moment.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handlePostInlineComment(moment)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none py-1"
                      />
                      <button
                        onClick={() => handlePostInlineComment(moment)}
                        disabled={!inlineComments[moment.id]?.trim() || postingCommentId === moment.id}
                        className="text-xs font-bold text-pink-600 hover:text-pink-700 disabled:opacity-30 transition-opacity"
                      >
                        {postingCommentId === moment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </main>

        {/* ═════════ 3. RIGHT SIDEBAR (Desktop >= lg) ═════════ */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-22 space-y-6">
          {/* Suggested Choir Members (Real Data with Follow Buttons) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Choir Connections</h3>
              <button onClick={() => router.push('/pages/groups')} className="text-xs font-bold text-pink-600 hover:text-pink-700">
                View All
              </button>
            </div>

            <div className="space-y-3.5">
              {suggestedSingers.slice(0, 5).map(member => {
                const isFollowing = followingSet.has(member.id);
                return (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-slate-200 flex-shrink-0">
                        <SyncAvatar userId={member.id} fallbackName={member.name} size="w-9 h-9" className="rounded-full" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{member.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{member.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFollow(member.id)}
                      className={`text-xs font-bold px-3 py-1 rounded-full transition-colors flex-shrink-0 ${
                        isFollowing
                          ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <footer className="text-[11px] text-slate-400 space-y-2 px-2">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <a href="/pages/rehearsals" className="hover:underline">Rehearsals</a> · 
              <a href="/pages/groups" className="hover:underline">Groups</a> · 
              <a href="/pages/profile" className="hover:underline">Profile</a>
            </div>
            <p>© 2026 LOVEWORLD SINGERS REHEARSAL HUB</p>
          </footer>
        </aside>
      </div>

      {/* ── STICKY MOBILE BOTTOM NAVIGATION BAR (< md) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-2.5 px-4 shadow-lg">
        <button
          onClick={() => { setFeedFilter('fyp'); setSelectedAuthorFilter(null); setActiveNav('feed'); }}
          className="flex flex-col items-center gap-1 text-slate-800"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">FYP</span>
        </button>

        <button
          onClick={() => { setFeedFilter('following'); setSelectedAuthorFilter(null); setActiveNav('feed'); }}
          className="flex flex-col items-center gap-1 text-slate-500"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Following</span>
        </button>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-md active:scale-95"
        >
          <Camera className="w-5 h-5" />
        </button>

        <button
          onClick={() => router.push('/pages/groups')}
          className="flex flex-col items-center gap-1 text-slate-500 relative"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] font-bold">Chats</span>
        </button>

        <button
          onClick={() => router.push('/pages/profile')}
          className="flex flex-col items-center gap-1 text-slate-500"
        >
          <div className="w-5 h-5 rounded-full overflow-hidden ring-1 ring-slate-300">
            <SyncAvatar
              userId={user?.id || user?.uid}
              fallbackName={user?.displayName || 'Me'}
              size="w-5 h-5"
              className="rounded-full"
            />
          </div>
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>

      {/* ── CREATE MOMENT MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-pink-600" />
                  Post Rehearsal Moment
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drag and Drop File Picker */}
              <label className="block w-full border-2 border-dashed border-slate-200 hover:border-pink-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) setUploadFiles(Array.from(e.target.files));
                  }}
                />
                <Plus className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-700 block">
                  {uploadFiles.length > 0
                    ? `${uploadFiles.length} file(s) selected`
                    : 'Select rehearsal video or photo'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">MP4, WebM, PNG, JPG (Cloudflare R2)</span>
              </label>

              <textarea
                placeholder="What's happening in rehearsal? (Caption)"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500"
              />

              <input
                type="text"
                placeholder="Tag a song (e.g. You Are Holy)"
                value={songTag}
                onChange={e => setSongTag(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500"
              />

              {isPublishing && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-pink-600 font-bold">
                    <span>Uploading directly to Cloudflare R2...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handlePublishMoment}
                disabled={isPublishing || uploadFiles.length === 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-pink-900/20 transition-all"
              >
                {isPublishing ? 'Publishing Moment...' : 'Publish to Feed'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMMENTS MODAL SHEET ── */}
      <AnimatePresence>
        {selectedMomentForComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedMomentForComments(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg h-[80vh] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Comments
                  <span className="text-xs text-slate-400">({activeCommentsList.length})</span>
                </h3>
                <button
                  onClick={() => setSelectedMomentForComments(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                {commentsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                  </div>
                ) : activeCommentsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No comments yet. Cheer on your fellow singer!
                  </div>
                ) : (
                  activeCommentsList.map(c => (
                    <div key={c.id} className="flex items-start gap-3">
                      <SyncAvatar userId={c.userId} fallbackName={c.userName} size="w-8 h-8" className="rounded-full" />
                      <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{c.userName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
