"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, ListVideo, Award } from 'lucide-react'
import { mediaLibraryService } from '../_lib/media-library-service'

// Generic playlist type that works with both user and admin playlists
interface DisplayPlaylist {
  id: string
  name: string
  description?: string
  thumbnail?: string
  videoIds: string[]
  type?: string
  isAdmin?: boolean
}

interface PlaylistCardProps {
  playlist: DisplayPlaylist
  categoryMap?: Map<string, string>
}

export default function PlaylistCard({ playlist, categoryMap }: PlaylistCardProps) {
  const router = useRouter()
  const [firstVideoThumbnail, setFirstVideoThumbnail] = useState<string | null>(null)

  // Fetch first video's thumbnail if playlist has no thumbnail set
  useEffect(() => {
    const fetchFirstVideoThumbnail = async () => {
      if (!playlist.thumbnail && playlist.videoIds.length > 0) {
        try {
          const firstVideo = await mediaLibraryService.getMediaById(playlist.videoIds[0])
          if (firstVideo?.thumbnail) {
            setFirstVideoThumbnail(firstVideo.thumbnail)
          }
        } catch (error) {
 console.error('Error fetching first video thumbnail:', error)
        }
      }
    }
    fetchFirstVideoThumbnail()
  }, [playlist.thumbnail, playlist.videoIds])

  const handleClick = () => {
    // Handle admin playlist routing (remove admin_ prefix)
    if (playlist.isAdmin) {
      const actualId = playlist.id.replace('admin_', '')
      router.push(`/pages/media/playlists/admin/${actualId}`)
    } else {
      router.push(`/pages/media/playlists/${playlist.id}`)
    }
  }

  const categoryName = playlist.type && categoryMap?.get(playlist.type)
  const displayThumbnail = playlist.thumbnail || firstVideoThumbnail

  return (
    <div onClick={handleClick} className="cursor-pointer group flex flex-col gap-3.5">
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/5 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-indigo-500/10">
        {displayThumbnail ? (
          <img
            src={displayThumbnail}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <ListVideo className="w-12 h-12 text-slate-500 opacity-40" />
          </div>
        )}

        {/* Playlist identity overlay - Bottom Right like YT */}
        <div className="absolute bottom-2 right-2 bg-slate-950/90 backdrop-blur-md text-slate-100 px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border border-white/10 shadow-lg">
          <ListVideo className="w-4 h-4 text-indigo-400" strokeWidth={2.5} />
          <span className="tracking-tight">{playlist.videoIds.length} VIDEOS</span>
        </div>

        {/* Play Overlay on Hover */}
        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-3 px-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] sm:text-[16px] text-slate-100 line-clamp-2 leading-snug mb-1 group-hover:text-indigo-300 transition-colors">
            {playlist.name}
          </h3>
          <div className="flex flex-col text-slate-400 text-[13px] font-medium">
            <span className="hover:text-slate-200 transition-colors inline-flex items-center gap-1.5">
              {playlist.isAdmin ? (
                <>
                  LWS Official
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                </>
              ) : 'View full playlist'}
            </span>
            {categoryName && (
              <span className="text-[11px] opacity-60 mt-0.5 uppercase tracking-wider font-bold text-indigo-400/80">{categoryName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Add CheckCircle import
import { CheckCircle } from 'lucide-react'
