"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart, MessageCircle, Share2, Plus, Play, Pause,
  Volume2, VolumeX, Send, Music2, X, ChevronLeft, ChevronRight,
  Globe, MapPin, Loader2, Bookmark, MoreHorizontal, Smile, Film, Camera
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { apiClient } from '@/lib/api-client';
import { uploadToCloudinary } from '@/lib/cloudinary-storage';
import { SyncAvatar } from './SyncAvatar';
import { motion, AnimatePresence } from 'framer-motion';

interface MomentMedia {
  url: string;
  type?: 'photo' | 'video' | 'audio';
}

interface Moment {
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
  createdAt: string;
}

interface MomentComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

interface MomentsFeedEmbedProps {
  primaryColor?: string;
  onDirectMessage?: (userId: string, userName: string) => void;
}



export function MomentsFeedEmbed({ primaryColor = '#9333ea', onDirectMessage }: MomentsFeedEmbedProps) {
  const { user, profile } = useAuth();
  const { currentZone } = useZone();

  const [feedType, setFeedType] = useState<'global' | 'zone'>('global');
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);

  // Active video play/mute state
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Heart burst animation
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);

  // Bookmarks
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  // Inline comment state
  const [inlineComments, setInlineComments] = useState<Record<string, string>>({});
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null);

  // Active comments sheet
  const [activeMomentForComments, setActiveMomentForComments] = useState<Moment | null>(null);
  const [comments, setComments] = useState<MomentComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Create Moment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [songTag, setSongTag] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchMoments = useCallback(async () => {
    try {
      setLoading(true);
      const zoneParam = feedType === 'zone' ? ((profile as any)?.zone_id || currentZone?.id || '') : '';
      const query = zoneParam ? `?feed=zone&zoneId=${encodeURIComponent(zoneParam)}` : `?feed=global`;
      const res = await apiClient.get<any>(`/moments${query}`);
      if (res && res.success) {
        setMoments(res.data || []);
      }
    } catch (err) {
      console.error('[MomentsFeedEmbed] fetch moments error:', err);
    } finally {
      setLoading(false);
    }
  }, [feedType, profile, currentZone]);

  const realStories = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string }>();
    moments.forEach(m => {
      if (!map.has(m.userId)) {
        map.set(m.userId, {
          id: m.userId,
          name: m.userName,
          avatar: m.userAvatar,
        });
      }
    });
    return Array.from(map.values());
  }, [moments]);

  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string | null>(null);

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

  const openComments = async (moment: Moment) => {
    setActiveMomentForComments(moment);
    setComments([]);
    setCommentsLoading(true);
    try {
      const res = await apiClient.get<any>(`/moments/${moment.id}/comments`);
      if (res && res.success) {
        setComments(res.data || []);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden relative font-sans">
      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 px-6 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              Choir Moments & Reels
            </h2>
          </div>
        </div>

        {/* Global vs Zone Feed Switcher */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setFeedType('global')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                feedType === 'global'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global HQ</span>
            </button>
            <button
              onClick={() => setFeedType('zone')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                feedType === 'zone'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>My Zone</span>
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-purple-900/10 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Post Moment</span>
          </button>
        </div>
      </div>

      {/* ── Feed Container ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex justify-center">
        <div className="w-full max-w-lg space-y-6 pb-20">
          
          {/* Stories Tray */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
              <div
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="relative p-0.5 rounded-full ring-2 ring-slate-200 group-hover:scale-105 transition-transform">
                  <div className="w-13 h-13 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center">
                    <Plus className="w-5 h-5 text-pink-400" />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[60px] text-center">
                  Your Story
                </span>
              </div>

              {realStories.map(story => (
                <div
                  key={story.id}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                  onClick={() => setSelectedAuthorFilter(story.id === selectedAuthorFilter ? null : story.id)}
                >
                  <div className={`relative p-[2px] rounded-full transition-transform group-hover:scale-105 ${
                    story.id === selectedAuthorFilter
                      ? 'bg-slate-900 ring-2 ring-pink-500'
                      : 'bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400'
                  }`}>
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white p-0.5">
                      <SyncAvatar userId={story.id} fallbackName={story.name} size="w-full h-full" className="rounded-full" />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[60px] text-center">
                    {story.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Feed Cards */}
          {loading ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading choir feed...</p>
            </div>
          ) : moments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Moments Posted Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Be the first to share a rehearsal video, vocal highlight, or praise clip!
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md"
              >
                Post First Moment
              </button>
            </div>
          ) : (
            moments.map(moment => {
              const firstMedia = moment.mediaUrls?.[0] || { url: '', type: 'photo' };
              const isVideo = firstMedia.type === 'video' || firstMedia.url.endsWith('.mp4') || firstMedia.url.endsWith('.webm');
              const isBookmarked = !!savedIds[moment.id];

              return (
                <article
                  key={moment.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Card Author Header */}
                  <div className="p-4 flex items-center justify-between">
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
                          {new Date(moment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {onDirectMessage && moment.userId !== user?.id && (
                      <button
                        onClick={() => onDirectMessage(moment.userId, moment.userName)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-pink-500" />
                        <span>Chat</span>
                      </button>
                    )}
                  </div>

                  {/* Media Frame with Double Tap Heart */}
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

                  {/* Card Actions Ribbon */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
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
                          onClick={() => openComments(moment)}
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
                              alert('Link copied to clipboard!');
                            }
                          }}
                          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bookmark Icon */}
                      <button
                        onClick={() => setSavedIds(prev => ({ ...prev, [moment.id]: !prev[moment.id] }))}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          isBookmarked ? 'text-pink-600 bg-pink-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-pink-600' : ''}`} />
                      </button>
                    </div>

                    {/* Likes summary line */}
                    {moment.likesCount > 0 && (
                      <p className="text-xs font-bold text-slate-800">
                        Liked by <span className="font-black text-slate-950">{moment.likesCount} singers</span>
                      </p>
                    )}

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

                    {/* View all comments link */}
                    {moment.commentsCount > 0 && (
                      <button
                        onClick={() => openComments(moment)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        View all {moment.commentsCount} comments
                      </button>
                    )}

                    {/* Direct Inline Add Comment Bar */}
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
        </div>
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
    </div>
  );
}
