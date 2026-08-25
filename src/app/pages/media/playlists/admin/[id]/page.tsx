"use client";

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getAdminPlaylist, AdminPlaylist } from '@/app/pages/media/_lib/media-library-service'
import { mediaLibraryService, MediaItem } from '../../../_lib/media-library-service'
import YouTubeHeader from '../../../_components/YouTubeHeader'
import YouTubeSidebar from '../../../_components/YouTubeSidebar'
import {
  ArrowLeft,
  Play,
  Shuffle,
  ListVideo,
  MoreVertical,
  Layers,
  ChevronRight,
  Clock,
  Share2,
  CheckCircle,
  X,
  Search
} from 'lucide-react'

export default function AdminPlaylistDetailPage() {
  const router = useRouter()
  const params = useParams()
  const playlistId = params?.id as string
  const { profile, isLoading: authLoading } = useAuth()

  const [playlist, setPlaylist] = useState<AdminPlaylist | null>(null)
  const [videos, setVideos] = useState<MediaItem[]>([])
  const [nestedPlaylists, setNestedPlaylists] = useState<AdminPlaylist[]>([])
  const [loading, setLoading] = useState(true)

  // Header State
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const loadPlaylist = async () => {
    setLoading(true)
    try {
      // 1. Fetch Playlist Metadata
      const data = await getAdminPlaylist(playlistId)
      setPlaylist(data)

      if (data) {
        // 2. Fetch Videos efficiently (Batch limit handled in service)
        if (data.videoIds?.length) {
          const fetchedVideos = await mediaLibraryService.getMediaByIds(data.videoIds)
          setVideos(fetchedVideos)
        }

        // 3. Fetch Nested Playlists
        if (data.childPlaylistIds?.length) {
          const nestedPromises = data.childPlaylistIds.map((id: string) => getAdminPlaylist(id))
          const nestedResults = await Promise.all(nestedPromises)
          setNestedPlaylists(nestedResults.filter(Boolean) as AdminPlaylist[])
        }
      }
    } catch (error) {
      console.error('Error loading playlist:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (playlistId) {
      loadPlaylist()
    }
  }, [playlistId])

  const playAll = () => {
    if (videos.length > 0) {
      router.push(`/pages/media/player/${videos[0].id}?adminPlaylist=${playlistId}`)
    }
  }

  const shufflePlay = () => {
    if (videos.length > 0) {
      const randomIndex = Math.floor(Math.random() * videos.length)
      router.push(`/pages/media/player/${videos[randomIndex].id}?adminPlaylist=${playlistId}&shuffle=1`)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (authLoading && !profile) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-gray-700 border-t-red-600 rounded-full animate-spin" />
      </div>
    )
  }

  const totalItems = videos.length + nestedPlaylists.length

  const handleBack = () => {
    router.push('/pages/media')
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col selection:bg-indigo-500/30">
      <YouTubeHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showMobileSearch={showMobileSearch}
        setShowMobileSearch={setShowMobileSearch}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        userName={profile?.first_name || profile?.display_name || profile?.email || undefined}
      />

      <div className="flex flex-1 pt-16 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[100] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div className={`fixed lg:relative top-0 left-0 h-screen lg:h-auto z-[110] transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full lg:translate-x-0 lg:w-[72px]'}`}>
          <YouTubeSidebar
            activeTab="playlists"
            onTabChange={() => {}}
            isExpanded={sidebarOpen}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-40">
              <div className="w-10 h-10 border-3 border-gray-700 border-t-red-600 rounded-full animate-spin" />
            </div>
          ) : playlist ? (
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Media</span>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Playlist Info */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative shadow-2xl">
                    <img
                      src={playlist.thumbnailUrl || playlist.thumbnail || ''}
                      alt={playlist.title || playlist.name || 'Playlist'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-white">
                        {totalItems} items
                      </span>
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-white">{playlist.title || playlist.name}</h1>
                  {playlist.description && (
                    <p className="text-sm text-slate-400">{playlist.description}</p>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={playAll}
                      disabled={videos.length === 0}
                      className="flex-1 py-3 bg-white hover:bg-slate-100 disabled:opacity-40 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Play className="w-5 h-5 fill-black" />
                      Play All
                    </button>
                    <button
                      onClick={shufflePlay}
                      disabled={videos.length === 0}
                      className="py-3 px-4 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Shuffle className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Videos & Nested Playlists */}
                <div className="lg:col-span-2 space-y-6">
                  {nestedPlaylists.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sub-Playlists</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {nestedPlaylists.map((nested) => (
                          <div
                            key={nested.id}
                            onClick={() => router.push(`/pages/media/playlists/admin/${nested.id}`)}
                            className="flex items-center gap-4 p-2 bg-transparent hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
                          >
                            <div className="w-32 aspect-video bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 relative shadow-lg">
                              <img src={nested.thumbnailUrl || nested.thumbnail || ''} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                              <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 rounded text-[10px] font-bold">
                                {nested.videoIds?.length || 0}
                              </div>
                              <div className="absolute right-0 top-0 bottom-0 w-8 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                                <Layers className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[15px] line-clamp-1 group-hover:text-white transition-colors">{nested.title || nested.name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">Playlist</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {videos
                      .filter(v =>
                        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        v.description?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((video, index) => (
                        <div
                          key={video.id}
                          onClick={() => router.push(`/pages/media/player/${video.id}?adminPlaylist=${playlistId}`)}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer"
                        >
                          <div className="w-6 text-sm text-slate-400 font-medium flex items-center justify-center flex-shrink-0">
                            <span className="group-hover:hidden">{index + 1}</span>
                            <Play className="hidden group-hover:block w-3.5 h-3.5 text-white fill-white" />
                          </div>

                          <div className="w-28 sm:w-40 xl:w-52 aspect-video bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
                            <img src={video.thumbnail} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {formatDuration(video.duration)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[15px] sm:text-[16px] xl:text-[17px] line-clamp-2 leading-tight mb-1">{video.title}</h4>
                            <div className="flex items-center gap-1 text-[13px] text-slate-400">
                              <span className="flex items-center gap-1 text-[12px] sm:text-[13px]">Official <CheckCircle className="w-3.5 h-3.5 fill-[#aaa] text-[#0f0f0f]" /></span>
                              <span className="text-[10px]">•</span>
                              <span>{(video.views || 0).toLocaleString()} views</span>
                            </div>
                          </div>

                          <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-full transition-opacity">
                            <MoreVertical className="w-5 h-5 text-slate-400" />
                          </button>
                        </div>
                      ))}
                  </div>

                  {totalItems === 0 && (
                    <div className="flex flex-col items-center justify-center py-40 text-center px-6">
                      <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                        <ListVideo className="w-10 h-10 text-slate-400" />
                      </div>
                      <h2 className="text-xl font-bold mb-2">This playlist is empty</h2>
                      <p className="text-slate-400 text-sm">Videos added by admin will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40">
              <p className="text-slate-400">Playlist not found</p>
              <button onClick={handleBack} className="mt-4 text-blue-500 hover:underline">
                Go back
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
