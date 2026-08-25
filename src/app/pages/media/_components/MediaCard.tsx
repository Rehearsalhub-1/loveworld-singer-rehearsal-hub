"use client";

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { MediaItem } from '../_lib'
import { useAuth } from '@/hooks/useAuth'
import AddToPlaylistModal from './AddToPlaylistModal'
import { isYouTubeUrl } from '@/utils/youtube'
import { getCloudinaryThumbnailUrl } from '@/utils/cloudinary'

interface MediaCardProps {
  media: MediaItem
  categoryMap?: Map<string, string> // slug -> name mapping passed from parent
}

export default function MediaCard({ media, categoryMap }: MediaCardProps) {
  const router = useRouter()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const { user } = useAuth()

  const isYouTubeVideo = media.isYouTube || isYouTubeUrl(media.youtubeUrl || '')

  const handleClick = () => {
    router.push(`/pages/media/player/${media.id}`)
  }

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Format views
  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`
    }
    return `${views} views`
  }

  // Get time ago - handle both Date objects and Firestore Timestamps
  const getTimeAgo = (date: Date | { toDate?: () => Date } | any) => {
    try {
      if (!date) return 'Recently'

      // Convert to Date if it's a Firestore Timestamp or other types
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
      if (isNaN(dateObj.getTime())) return 'Recently'

      const now = new Date()
      const diff = now.getTime() - dateObj.getTime()

      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      const months = Math.floor(days / 30)
      const years = Math.floor(days / 365)

      if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`
      if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`
      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      return 'Just now'
    } catch {
      return 'Recently'
    }
  }

  // Use thumbnail directly - it's already a proper URL from admin upload
  // Apply repair logic if it looks like a direct video URL or is missing
  const thumbnailUrl = media.thumbnail || getCloudinaryThumbnailUrl(media.videoUrl || media.youtubeUrl)

  return (
    <div
      className="flex flex-col cursor-pointer group w-full"
      onClick={handleClick}
    >
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video rounded-[20px] sm:rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-white/5 transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-2xl group-hover:shadow-indigo-500/20">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-800 animate-pulse" />
        )}
        <img
          src={thumbnailUrl}
          alt={media.title}
          className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-110 transition-transform duration-700 ease-out`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            setImageLoaded(true)
            const fallback = '/movie/default-hero.jpeg'
            if (e.currentTarget.src !== fallback) {
              const repaired = getCloudinaryThumbnailUrl(media.videoUrl)
              if (repaired && e.currentTarget.src !== repaired) {
                e.currentTarget.src = repaired
              } else {
                e.currentTarget.src = fallback
              }
            }
          }}
        />

        {/* Duration Badge */}
        {media.duration && (
          <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md text-slate-200 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-lg tabular-nums tracking-tight border border-white/10">
            {formatDuration(media.duration)}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex gap-3.5 pt-4 pr-1 relative">
        <div className="flex-shrink-0 w-10 sm:w-11 h-10 sm:h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 text-slate-200 font-black text-[15px] sm:text-base shadow-xl mt-0.5 transform transition-transform group-hover:scale-105">
          {media.title.charAt(0).toUpperCase()}
        </div>

        <div className="flex flex-col min-w-0 pb-6 relative">
          <h3 className="text-slate-100 font-bold text-[14px] sm:text-[15px] lg:text-[16px] line-clamp-2 leading-[1.4] mb-1.5 group-hover:text-indigo-300 transition-colors tracking-tight">
            {media.title}
          </h3>

          <div className="flex flex-col text-slate-500 text-[12px] sm:text-[13px] font-bold">
            <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors cursor-pointer group/official uppercase tracking-wider text-[11px] sm:text-[12px]">
              Official Session
              <CheckCircle className="w-3.5 h-3.5 text-indigo-500/80 group-hover/official:text-indigo-400" strokeWidth={3} />
            </span>
            <div className="flex items-center gap-2 mt-1 font-medium opacity-80">
              <span className="truncate">{formatViews(media.views || 0)}</span>
              <span className="text-[10px] opacity-40">•</span>
              <span className="truncate">{getTimeAgo(media.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {user?.uid && (
        <AddToPlaylistModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          videoId={media.id}
          videoThumbnail={thumbnailUrl}
          userId={user.uid}
        />
      )}
    </div>
  )
}
