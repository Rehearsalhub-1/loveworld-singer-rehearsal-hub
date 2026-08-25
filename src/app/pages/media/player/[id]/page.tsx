"use client";

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useMedia } from '../../_context/MediaContext'
import {
  ChevronDown, ThumbsUp, ThumbsDown, Share2, Bell, BellOff,
  Plus, MoreVertical, Send, ArrowLeft, Trash2, ListVideo
} from 'lucide-react'
import { mediaLibraryService, MediaItem } from '../../_lib/media-library-service'
import CustomVideoPlayer from '../../_components/CustomVideoPlayer'
import { toggleLikeVideo, isVideoLiked } from '../../_lib/playlist-service'
import { mediaCommentService, MediaComment } from '../../_lib/media-comment-service'
import AddToPlaylistModal from '../../_components/AddToPlaylistModal'
import { NavigationManager } from '@/utils/navigation'

function PlayerContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, profile } = useAuth()
  const { incrementViews, saveWatchProgress, allMedia } = useMedia()

  const mediaId = params?.id as string
  const playlistId = searchParams?.get('playlist')
  const userId = user?.uid

  const [media, setMedia] = useState<MediaItem | null>(null)
  const [relatedVideos, setRelatedVideos] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [comments, setComments] = useState<MediaComment[]>([])
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    loadPageData()
  }, [mediaId])

  useEffect(() => {
    if (!mediaId) return
    const unsubscribe = mediaCommentService.subscribeToComments(mediaId, (data) => {
      setComments(data)
    })
    return () => unsubscribe()
  }, [mediaId])

  useEffect(() => {
    if (userId && mediaId) {
      checkUserStatus()
    }
  }, [userId, mediaId])

  useEffect(() => {
    if (media) {
      incrementViews(media.id)
      setLikeCount(media.likes || 0)
    }
  }, [media?.id])

  const loadPageData = async () => {
    setIsLoading(true)
    try {
      const mediaData = await mediaLibraryService.getMediaById(mediaId)
      setMedia(mediaData)

      const related = await mediaLibraryService.getRelatedMedia(mediaId, 10)
      setRelatedVideos(related)
    } catch (error) {
 console.error('Error loading media:', error)
    }
    setIsLoading(false)
  }


  const checkUserStatus = async () => {
    if (!userId) return
    try {
      const liked = await isVideoLiked(userId, mediaId)
      setIsLiked(liked)
    } catch (error) {
 console.error('Error checking status:', error)
    }
  }

  const handleLike = async () => {
    if (!userId) {
      alert('Please sign in to like videos')
      return
    }
    try {
      const newState = await toggleLikeVideo(userId, mediaId, media?.thumbnail)
      setIsLiked(newState)
      setLikeCount(prev => newState ? prev + 1 : prev - 1)
    } catch (error) {
 console.error('Error toggling like:', error)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: media?.title,
          url: window.location.href
        })
      } catch (err) {
        // Share cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard! You can now share it with others.')
      } catch (err) {
        console.error('Failed to copy link:', err)
        alert('Failed to copy link. Please copy the URL from your browser address bar.')
      }
    }
  }

  const handleAddComment = async (parentId?: string, parentName?: string) => {
    const text = parentId ? replyText : newComment
    if (!text.trim() || !userId) return

    const userName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : profile?.display_name || user?.displayName || user?.email?.split('@')[0] || 'User'

    try {
      await mediaCommentService.addComment(
        mediaId,
        userId,
        userName,
        user?.email || '',
        text,
        parentId,
        parentName
      )
      if (parentId) {
        setReplyText('')
        setReplyTo(null)
      } else {
        setNewComment('')
      }
    } catch (error) {
 console.error('Error adding comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    // Optimistic Update
    const originalComments = [...comments]
    setComments(prev => prev.filter(c => c.id !== commentId))

    try {
      await mediaCommentService.deleteComment(commentId)
    } catch (error) {
 console.error('Error deleting comment:', error)
      setComments(originalComments) // Rollback
      alert('Failed to delete comment. Please try again.')
    }
  }

  const handleToggleCommentLike = async (commentId: string) => {
    if (!userId) {
      alert('Please sign in to like comments')
      return
    }
    try {
      await mediaCommentService.toggleLike(commentId, userId)
    } catch (error) {
 console.error('Error toggling comment like:', error)
    }
  }

  const handleToggleCommentDislike = async (commentId: string) => {
    if (!userId) {
      alert('Please sign in to dislike comments')
      return
    }
    try {
      await mediaCommentService.toggleDislike(commentId, userId)
    } catch (error) {
 console.error('Error toggling comment dislike:', error)
    }
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeAgo = (date: any) => {
    try {
      if (!date) return ''
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
      const now = new Date()
      const diff = now.getTime() - dateObj.getTime()

      const seconds = Math.floor(diff / 1000)
      if (seconds < 60) return 'Just now'

      const minutes = Math.floor(seconds / 60)
      if (minutes < 60) return `${minutes}m ago`

      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}h ago`

      const days = Math.floor(hours / 24)
      if (days < 30) return `${days}d ago`

      const months = Math.floor(days / 30)
      if (months < 12) return `${months}mo ago`

      return dateObj.toLocaleDateString()
    } catch {
      return ''
    }
  }

  if (isLoading || !media) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen overflow-y-auto bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Back Button Overlay - Mobile Friendly */}
      <button
        onClick={() => NavigationManager.safeBack(router)}
        className="fixed top-6 left-6 z-[70] w-12 h-12 flex items-center justify-center bg-slate-950/40 hover:bg-slate-900 rounded-full backdrop-blur-xl transition-all border border-white/10 group active:scale-90 shadow-2xl"
        title="Go Back"
      >
        <ArrowLeft className="w-6 h-6 text-slate-100 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      {/* Video Player Section */}
      <div className="relative bg-black transition-all">
        <div className="max-w-[1400px] mx-auto w-full aspect-video overflow-hidden">
          <CustomVideoPlayer
            url={media.youtubeUrl || media.videoUrl || ''}
            poster={media.thumbnail}
            isYouTube={!!media.youtubeUrl}
            onProgress={(progress) => {
              if (progress.played * 100 > 5 && progress.played * 100 < 95) {
                saveWatchProgress(mediaId, progress.played * 100)
              }
            }}
          />
        </div>
      </div>

      {/* Content Section - Responsive Wrapper */}
      <div className="max-w-[1500px] mx-auto flex flex-col lg:flex-row gap-8 p-6 lg:p-10">
        {/* Main Content Info */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 leading-tight tracking-tight mb-2">
            {media.title}
          </h1>

          {/* Views & Date */}
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-500 mb-6 uppercase tracking-widest">
            <span>{formatViews(media.views || 0)} views</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>{getTimeAgo(media.createdAt)}</span>
          </div>

          {/* Channel Row */}
          <div className="flex items-center justify-between mb-8 bg-slate-900/50 backdrop-blur-sm p-4 rounded-[24px] border border-white/5 shadow-inner">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg border border-indigo-400/20">
                {media.title.charAt(0).toUpperCase()}
              </div>

              {/* Channel Info */}
              <div>
                <p className="text-[15px] font-black text-slate-100 tracking-tight">Official Hub</p>
                <p className="text-[12px] font-bold text-indigo-400/80 uppercase tracking-wider">Premium Media</p>
              </div>
            </div>
          </div>

          {/* Action Buttons Row - Scrollable on mobile */}
          <div className="flex items-center gap-3 mb-10 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {/* Like/Dislike Pill */}
            <div className="flex items-center bg-slate-900 rounded-2xl h-11 border border-white/5 shadow-sm">
              <button
                onClick={handleLike}
                className={`flex items-center justify-center gap-2.5 px-5 h-full hover:bg-slate-800 rounded-l-2xl transition-all ${isLiked ? 'text-indigo-400' : 'text-slate-400'
                  }`}
              >
                <ThumbsUp className={`w-4.5 h-4.5 ${isLiked ? 'fill-indigo-400' : ''}`} />
                <span className="text-sm font-black">{formatCount(likeCount)}</span>
              </button>
              <div className="w-px h-5 bg-white/5" />
              <button className="flex items-center justify-center px-4 h-full hover:bg-slate-800 rounded-r-2xl transition-all text-slate-400">
                <ThumbsDown className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2.5 px-5 h-11 bg-slate-900 rounded-2xl hover:bg-slate-800 transition-all border border-white/5 flex-shrink-0 text-slate-300 font-bold text-sm"
            >
              <Share2 className="w-4.5 h-4.5" />
              <span>Share</span>
            </button>

            {/* Save to Playlist */}
            <button
              onClick={() => userId ? setShowPlaylistModal(true) : alert('Sign in to save to playlists')}
              className="flex items-center justify-center gap-2.5 px-5 h-11 bg-slate-900 rounded-2xl hover:bg-slate-800 transition-all border border-white/5 flex-shrink-0 text-slate-300 font-bold text-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Save</span>
            </button>
          </div>

          {/* Description Card */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-[32px] p-8 mb-10 border border-white/5 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span>About this video</span>
            </div>
            <p className={`text-[15px] font-medium text-slate-300 leading-relaxed max-w-4xl ${!showFullDescription ? 'line-clamp-3' : ''}`}>
              {media.description || 'No description available for this session.'}
            </p>
            {media.description && media.description.length > 150 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-[13px] font-black text-indigo-400 mt-4 hover:text-indigo-300 transition-colors uppercase tracking-widest"
              >
                {showFullDescription ? 'Collapse' : 'Show more'}
              </button>
            )}
          </div>

          {/* Comments Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-100 tracking-tight">Community</h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-slate-500 text-sm font-bold border border-white/5">{comments.length}</span>
              </div>
              <button className="text-[13px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Newest</button>
            </div>

            {/* Add Comment Input */}
            {userId && (
              <div className="flex gap-5 mb-12 bg-slate-900/40 p-6 rounded-[24px] border border-white/5 ring-1 ring-white/5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-[0_8px_20px_rgba(79,70,229,0.3)]">
                  {profile?.first_name?.[0].toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      rows={1}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts..."
                      className="w-full bg-transparent border-b-2 border-slate-800 py-3 text-[15px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none custom-scrollbar"
                    />
                    <div className={`flex justify-end gap-3 mt-4 transition-all duration-300 ${newComment ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-2'}`}>
                      <button
                        onClick={() => setNewComment('')}
                        className="px-6 h-10 text-[13px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        onClick={() => handleAddComment()}
                        className="flex items-center justify-center gap-2 px-8 h-10 bg-indigo-600 text-white text-[13px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-8">
              {comments.length === 0 ? (
                <div className="py-20 text-center text-slate-600 bg-slate-900/20 rounded-[40px] border-2 border-dashed border-slate-800/50">
                   <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-6 border border-white/5 opacity-50">
                      <Send className="w-8 h-8 rotate-12" />
                   </div>
                   <p className="text-lg font-bold">No comments yet.</p>
                   <p className="text-sm font-medium mt-1">Be the first to share your experience!</p>
                </div>
              ) : (
                comments
                  .filter(c => c.parentId === null || c.parentId === undefined)
                  .map((comment) => (
                    <div key={comment.id} className="space-y-6">
                      <div className="flex gap-5 group">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-indigo-400 font-black text-lg flex-shrink-0 shadow-sm border border-white/5">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[15px] font-black text-slate-200 tracking-tight">{comment.userName}</span>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{getTimeAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-[15px] text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap font-medium">{comment.content}</p>
                          <div className="flex items-center gap-6">
                            <button
                              onClick={() => handleToggleCommentLike(comment.id)}
                              className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-all"
                            >
                              <ThumbsUp className={`w-4 h-4 ${comment.likedBy?.includes(userId || '') ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                              <span className="text-xs font-black">{comment.likes > 0 ? formatCount(comment.likes) : ''}</span>
                            </button>
                            <button
                              onClick={() => handleToggleCommentDislike(comment.id)}
                              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-all"
                            >
                              <ThumbsDown className={`w-4 h-4 ${comment.dislikedBy?.includes(userId || '') ? 'fill-white text-white rotate-0' : ''}`} />
                            </button>
                            <button
                              onClick={() => setReplyTo(replyTo?.id === comment.id ? null : { id: comment.id, name: comment.userName })}
                              className="text-[11px] font-black text-slate-600 uppercase tracking-widest hover:text-indigo-400 transition-all"
                            >
                              Reply
                            </button>
                            {comment.userId === userId && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-slate-700 hover:text-red-500 transition-all ml-auto opacity-0 group-hover:opacity-100 flex items-center justify-center p-2 rounded-xl border border-transparent hover:border-red-500/10 hover:bg-red-500/5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Reply Input Box */}
                          {replyTo?.id === comment.id && (
                            <div className="mt-6 flex gap-4 p-5 bg-slate-900/60 rounded-[20px] border border-white/5 animate-in slide-in-from-top-2 duration-300">
                               <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                 {profile?.first_name?.[0].toUpperCase() || 'U'}
                               </div>
                               <div className="flex-1">
                                 <input
                                   type="text"
                                   autoFocus
                                   value={replyText}
                                   onChange={(e) => setReplyText(e.target.value)}
                                   onKeyDown={(e) => e.key === 'Enter' && handleAddComment(comment.id, comment.userName)}
                                   placeholder={`Reply to ${comment.userName}...`}
                                   className="w-full bg-transparent border-b border-slate-700 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                                 />
                                 <div className="flex justify-end gap-3 mt-3">
                                   <button onClick={() => setReplyTo(null)} className="px-4 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest">Discard</button>
                                   <button
                                     disabled={!replyText.trim()}
                                     onClick={() => handleAddComment(comment.id, comment.userName)}
                                     className="px-6 py-1.5 bg-indigo-600 text-[11px] font-black text-white hover:bg-indigo-500 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                                   >
                                     Reply
                                   </button>
                                 </div>
                               </div>
                            </div>
                          )}

                          {/* Nested Replies */}
                          <div className="mt-6 space-y-4">
                            {comments.filter(c => c.parentId && String(c.parentId) === String(comment.id)).map(reply => (
                              <div key={reply.id} className="flex gap-4 p-4 rounded-[20px] bg-slate-900/30 border border-white/5 group/reply hover:bg-slate-900/50 transition-all">
                                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs flex-shrink-0 border border-white/5">
                                  {reply.userName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="text-[13px] font-black text-slate-300 tracking-tight">{reply.userName}</span>
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{getTimeAgo(reply.createdAt)}</span>
                                  </div>
                                  <p className="text-[13px] text-slate-400 leading-relaxed mb-3 font-medium">{reply.content}</p>
                                  <div className="flex items-center gap-4">
                                    <button onClick={() => handleToggleCommentLike(reply.id)} className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-400 transition-all">
                                      <ThumbsUp className={`w-3.5 h-3.5 ${reply.likedBy?.includes(userId || '') ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                                      <span className="text-[10px] font-black">{reply.likes > 0 ? formatCount(reply.likes) : ''}</span>
                                    </button>
                                    {reply.userId === userId && (
                                      <button onClick={() => handleDeleteComment(reply.id)} className="text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover/reply:opacity-100 flex items-center justify-center p-1.5 rounded-lg">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Related Videos (Tablets & Desktops) */}
        <div className="lg:w-[400px] xl:w-[450px] flex-shrink-0">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[17px] font-black text-slate-100 uppercase tracking-widest">Recommended</h3>
            <button className="text-[11px] font-black text-slate-500 hover:text-indigo-400 transition-all uppercase tracking-widest">Feed</button>
          </div>
          <div className="flex flex-col gap-5">
            {relatedVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => router.push(`/pages/media/player/${video.id}`)}
                className="group flex gap-4 p-3 rounded-[24px] cursor-pointer bg-slate-900/30 border border-transparent hover:border-white/5 hover:bg-slate-900/80 transition-all hover:shadow-2xl hover:shadow-indigo-500/5 active:scale-[0.98]"
              >
                {/* Thumbnail */}
                <div className="relative w-36 sm:w-44 aspect-video bg-slate-900 rounded-[18px] overflow-hidden flex-shrink-0 shadow-md border border-white/5 ring-1 ring-white/10">
                  <img
                    src={video.thumbnail || '/movie/default-hero.jpeg'}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-slate-950/90 backdrop-blur-sm text-slate-100 text-[10px] font-black px-1.5 py-0.5 rounded-lg border border-white/5 shadow-lg">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-xl translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                       <Plus className="w-5 h-5 fill-white" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <h4 className="text-[14px] font-bold text-slate-100 line-clamp-2 leading-tight mb-2 group-hover:text-indigo-300 transition-colors tracking-tight">
                    {video.title}
                  </h4>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-widest">Official Stream</p>
                    <p className="text-[11px] font-medium text-slate-500 tracking-wide">
                      {formatViews(video.views || 0)} views • {getTimeAgo(video.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Playlist Modal */}
      {userId && (
        <AddToPlaylistModal
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          videoId={mediaId}
          videoThumbnail={media.thumbnail}
          userId={userId}
        />
      )}
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <PlayerContent />
    </Suspense>
  )
}
