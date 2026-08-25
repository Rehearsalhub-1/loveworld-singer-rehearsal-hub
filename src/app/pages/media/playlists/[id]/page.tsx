"use client";

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  getPlaylist,
  removeFromPlaylist,
  getPlaylistItems,
  getAddablePlaylistsForUser,
  addPlaylistToPlaylist,
  removePlaylistFromPlaylist,
  Playlist
} from '../../_lib/playlist-service'
import { MediaItem } from '../../_lib/media-library-service'
import {
  Play, Shuffle, MoreVertical, Trash2, ListVideo,
  Plus, X, Globe, Lock
} from 'lucide-react'
import YouTubeHeader from '../../_components/YouTubeHeader'
import YouTubeSidebar from '../../_components/YouTubeSidebar'

export default function PlaylistDetailPage() {
  const router = useRouter()
  const params = useParams()
  const playlistId = params?.id as string
  const { user, profile, isLoading: authLoading } = useAuth()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [videos, setVideos] = useState<MediaItem[]>([])
  const [nestedPlaylists, setNestedPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false)
  const [addablePlaylists, setAddablePlaylists] = useState<Playlist[]>([])
  const [loadingAddable, setLoadingAddable] = useState(false)

  // YouTube UI States
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'all' | 'shorts'>('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Mobile Sidebar Auto-Close
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (playlistId) loadPlaylist()
  }, [playlistId])

  const loadPlaylist = async () => {
    setLoading(true)
    try {
      const data = await getPlaylist(playlistId)
      setPlaylist(data)

      if (data) {
        const { videos: vids, playlists: nested } = await getPlaylistItems(playlistId)
        setVideos(vids)
        setNestedPlaylists(nested)
      }
    } catch (error) {
 console.error('Error loading playlist:', error)
    }
    setLoading(false)
  }

  const loadAddablePlaylists = async () => {
    if (!user?.uid) return
    setLoadingAddable(true)
    try {
      const data = await getAddablePlaylistsForUser(user.uid, playlistId)
      const existingIds = nestedPlaylists.map(p => p.id)
      setAddablePlaylists(data.filter(p => !existingIds.includes(p.id)))
    } catch (error) {
 console.error('Error loading addable playlists:', error)
    }
    setLoadingAddable(false)
  }

  const handleRemoveVideo = async (videoId: string) => {
    if (!playlist) return
    try {
      await removeFromPlaylist(playlist.id, videoId)
      setVideos(prev => prev.filter(v => v.id !== videoId))
      setPlaylist(prev => prev ? { ...prev, videoIds: prev.videoIds.filter(id => id !== videoId) } : null)
    } catch (error) {
 console.error('Error removing video:', error)
    }
    setMenuOpen(null)
  }

  const handleRemoveNestedPlaylist = async (childId: string) => {
    if (!playlist) return
    try {
      await removePlaylistFromPlaylist(playlist.id, childId)
      setNestedPlaylists(prev => prev.filter(p => p.id !== childId))
    } catch (error) {
 console.error('Error removing nested playlist:', error)
    }
    setMenuOpen(null)
  }

  const handleAddPlaylist = async (childId: string) => {
    if (!playlist) return
    try {
      await addPlaylistToPlaylist(playlist.id, childId)
      setShowAddPlaylistModal(false)
      await loadPlaylist()
    } catch (error: any) {
      alert(error.message || 'Failed to add playlist')
    }
  }

  const playAll = () => {
    if (videos.length > 0) {
      router.push(`/pages/media/player/${videos[0].id}?playlist=${playlistId}`)
    }
  }

  const shufflePlay = () => {
    if (videos.length > 0) {
      const randomIndex = Math.floor(Math.random() * videos.length)
      router.push(`/pages/media/player/${videos[randomIndex].id}?playlist=${playlistId}&shuffle=1`)
    }
  }

  const totalItems = videos.length + nestedPlaylists.length
  const isOwner = user?.uid === playlist?.userId

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col selection:bg-indigo-500/30 font-sans">
      {/* 1. Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800/80 shadow-md">
        <YouTubeHeader
          searchQuery=""
          setSearchQuery={() => {}}
          showMobileSearch={showMobileSearch}
          setShowMobileSearch={setShowMobileSearch}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          userEmail={user?.email || undefined}
        />
      </div>

      {/* 2. Main Body Container starting below Header (pt-16) */}
      <div className="flex flex-1 pt-16 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-200"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div className={`fixed lg:relative top-16 lg:top-0 left-0 h-[calc(100vh-64px)] z-[110] transition-all duration-300 bg-slate-950 border-r border-slate-800/80 flex flex-col ${sidebarOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full lg:translate-x-0 lg:w-[72px]'}`}>
          <YouTubeSidebar
            sidebarOpen={sidebarOpen}
            viewMode={viewMode}
            selectedCategory={selectedCategory}
            setViewMode={setViewMode}
            setSelectedCategory={setSelectedCategory}
            categories={[]}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#0B0F19]">
          <main className="flex-1 overflow-y-auto px-6 lg:px-16 pt-8 pb-32 custom-scrollbar bg-[#0B0F19]">
            {loading ? (
              <div className="max-w-[1500px] mx-auto space-y-6 animate-pulse">
                <div className="h-12 bg-white/[0.03] rounded-2xl w-1/3" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/[0.02] rounded-2xl" />)}
                </div>
              </div>
            ) : playlist ? (
              <div className="max-w-[1500px] mx-auto space-y-8">
                {/* Minimalist Title & Actions Bar (Responsive & Elegant) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight truncate">{playlist.name}</h1>
                    <p className="text-xs text-slate-400 font-medium mt-1">{videos.length} {videos.length === 1 ? 'video' : 'videos'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                    <button
                      onClick={playAll}
                      disabled={videos.length === 0}
                      className="flex items-center justify-center gap-2 px-7 h-12 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl text-sm font-extrabold shadow-xl hover:shadow-white/10 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-5 h-5 fill-slate-950" /> Play
                    </button>

                    {isOwner && (
                      <button
                        onClick={() => { loadAddablePlaylists(); setShowAddPlaylistModal(true) }}
                        className="flex items-center justify-center gap-2 px-6 h-12 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white rounded-2xl text-sm font-bold transition-all active:scale-95 backdrop-blur-md"
                      >
                        <Plus className="w-5 h-5 text-indigo-400" /> Add Items
                      </button>
                    )}
                  </div>
                </div>

                {/* Tracklist & Folders (Beautifully Structured Cards) */}
                <div className="space-y-8">
                  {/* Sub-Playlists (Folders) */}
                  {nestedPlaylists.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {nestedPlaylists.map(nested => (
                        <div
                          key={nested.id}
                          onClick={() => router.push(`/pages/media/playlists/${nested.id}`)}
                          className="group flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl cursor-pointer transition-all border border-white/[0.06] hover:border-white/[0.12] shadow-sm hover:shadow-xl"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors flex-shrink-0">
                              <ListVideo className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-base text-slate-100 group-hover:text-indigo-300 transition-colors truncate tracking-tight">{nested.name}</h4>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">{nested.videoIds.length} videos</p>
                            </div>
                          </div>
                          {isOwner && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveNestedPlaylist(nested.id); }}
                              className="p-2.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-colors active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Video Tracklist (Gorgeous Minimalist Cards) */}
                  <div className="space-y-3">
                    {videos.map((video) => (
                      <div
                        key={video.id}
                        onClick={() => router.push(`/pages/media/player/${video.id}?playlist=${playlistId}`)}
                        className="group flex items-center gap-4 p-3.5 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/[0.05] hover:border-white/[0.1] transition-all relative cursor-pointer shadow-sm hover:shadow-xl"
                      >
                        {/* Thumbnail */}
                        <div className="w-24 sm:w-32 aspect-video bg-slate-900/80 rounded-xl overflow-hidden flex-shrink-0 relative shadow-md border border-white/10 flex items-center justify-center">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-950">
                              <ListVideo className="w-6 h-6 text-slate-700" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <div className="w-10 h-10 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="font-bold text-base text-slate-100 group-hover:text-indigo-300 transition-colors tracking-tight line-clamp-2">{video.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                            <span>Rehearsal Video</span>
                            {typeof video.duration === 'number' && video.duration > 0 && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-300 font-semibold">
                                  {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Options Menu */}
                        {isOwner && (
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === video.id ? null : video.id) }}
                              className="p-2.5 hover:bg-white/[0.08] rounded-xl text-slate-400 hover:text-white transition-colors active:scale-95"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {menuOpen === video.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                                <div className="absolute right-0 top-11 bg-[#131A2B] rounded-2xl shadow-2xl z-20 py-1.5 min-w-[200px] border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                                  <button
                                    onClick={() => handleRemoveVideo(video.id)}
                                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" /> Remove from playlist
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {totalItems === 0 && (
                      <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/[0.08] mt-6">
                        <ListVideo className="w-12 h-12 text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-slate-200">Empty playlist</h3>
                        <p className="text-slate-500 text-sm mt-1 font-medium">No videos or sub-playlists have been added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-center">
                <p className="text-slate-400 font-bold text-lg">Playlist not found</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Add Playlist Modal */}
      {showAddPlaylistModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddPlaylistModal(false)} />
          <div className="relative w-full max-w-sm bg-[#212121] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-xl font-bold">Add to playlist</h2>
              <button onClick={() => setShowAddPlaylistModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {loadingAddable ? (
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-900 rounded-xl animate-pulse" />)}
                </div>
              ) : addablePlaylists.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {addablePlaylists.map(p => (
                    <button key={p.id} onClick={() => handleAddPlaylist(p.id)}
                      className="flex items-center gap-4 w-full p-2.5 rounded-xl hover:bg-slate-900 text-left group transition-all">
                      <div className="w-24 aspect-video bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ListVideo className="w-8 h-8 text-white/10" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[15px] font-bold line-clamp-1">{p.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{p.videoIds.length} videos</p>
                      </div>
                      <Plus className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400">
                  <p className="text-sm font-bold uppercase tracking-widest">No playlists available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
