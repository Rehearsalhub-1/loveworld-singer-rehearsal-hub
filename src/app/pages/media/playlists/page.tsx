"use client";

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  getUserPlaylists,
  deletePlaylist,
  ensureSystemPlaylists,
  createPlaylist,
  Playlist
} from '../_lib/playlist-service'
import {
  ListVideo, MoreVertical, Trash2, Play, ThumbsUp, Clock,
  Globe, Plus, Lock, X, Search, SlidersHorizontal, ChevronDown
} from 'lucide-react'
import YouTubeHeader from '../_components/YouTubeHeader'
import YouTubeSidebar from '../_components/YouTubeSidebar'

import ConfirmationModal from '@/components/ConfirmationModal'

export default function PlaylistsPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [creating, setCreating] = useState(false)

  // Confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null)

  // UX States
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'count'>('date')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

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
    if (user?.uid) {
      initAndLoad(user.uid)
    } else if (!authLoading && profile) {
      setLoading(false)
    }
  }, [user?.uid, authLoading, profile])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const initAndLoad = async (userId: string) => {
    setLoading(true)
    try {
      await ensureSystemPlaylists(userId)
      const data = await getUserPlaylists(userId)
      setPlaylists(data)
    } catch (error) {
      console.error('Error loading playlists:', error)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!playlistToDelete) return
    try {
      await deletePlaylist(playlistToDelete)
      setPlaylists(prev => prev.filter(p => p.id !== playlistToDelete))
    } catch (error) {
      console.error('Error deleting playlist:', error)
    }
    setPlaylistToDelete(null)
    setShowDeleteModal(false)
    setMenuOpen(null)
  }

  const handleCreatePlaylist = async () => {
    if (!user?.uid || !newPlaylistName.trim()) return
    setCreating(true)
    try {
      const id = await createPlaylist(user.uid, newPlaylistName.trim(), '', false)
      setShowCreateModal(false)
      setNewPlaylistName('')
      await initAndLoad(user.uid)
      router.push(`/pages/media/playlists/${id}`)
    } catch (error) {
 console.error('Error creating playlist:', error)
    }
    setCreating(false)
  }

  const getFilteredAndSorted = (list: Playlist[]) => {
    return list
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'count') return (b.videoIds.length || 0) - (a.videoIds.length || 0)
        
        // Date sort (System first, then updatedAt)
        if (a.isSystem && !b.isSystem) return -1
        if (!a.isSystem && b.isSystem) return 1
        
        const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime()
        const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime()
        return bTime - aTime
      })
  }

  const systemPlaylists = getFilteredAndSorted(playlists.filter(p => p.isSystem))
  const customPlaylists = getFilteredAndSorted(playlists.filter(p => !p.isSystem))
  const hasNoResults = searchQuery && systemPlaylists.length === 0 && customPlaylists.length === 0

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col selection:bg-indigo-500/30 font-sans">
      {/* 1. Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800/80 shadow-md">
        <YouTubeHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
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
          <main className="flex-1 max-w-[2100px] w-full mx-auto px-6 lg:px-12 pt-8 pb-28 overflow-y-auto bg-[#0B0F19] custom-scrollbar">
            {/* Ultra-Clean Minimalist Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-white/[0.05]">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">Playlists</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3.5">
                {/* Minimalist search */}
                <div className="relative w-full sm:w-72 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-indigo-500/50 focus:bg-white/[0.06] rounded-2xl pl-11 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      <X className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 h-12 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl text-sm font-extrabold shadow-xl hover:shadow-white/10 transition-all active:scale-95 hover:scale-105"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                  New Playlist
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="aspect-video bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                    <div className="h-4 bg-white/[0.03] rounded-lg w-3/4" />
                  </div>
                ))}
              </div>
            ) : hasNoResults ? (
              <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/[0.08]">
                <Search className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-200">No playlists found</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {customPlaylists.map(playlist => (
                  <div key={playlist.id} className="group flex flex-col gap-4 relative bg-white/[0.02] hover:bg-white/[0.04] p-4 rounded-[28px] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/5">
                    <div
                      onClick={() => router.push(`/pages/media/playlists/${playlist.id}`)}
                      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-md cursor-pointer flex-shrink-0"
                    >
                      {playlist.thumbnail ? (
                        <img src={playlist.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                          <ListVideo className="w-12 h-12 text-slate-800 group-hover:text-slate-700 transition-colors" />
                        </div>
                      )}
                      <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-white/10 shadow-xl text-slate-200">
                        <ListVideo className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{playlist.videoIds.length}</span>
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <div className="w-12 h-12 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300">
                          <Play className="w-6 h-6 fill-slate-950 ml-1" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 px-1">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/pages/media/playlists/${playlist.id}`)}>
                        <h3 className="font-bold text-base leading-snug text-slate-100 group-hover:text-indigo-300 transition-colors tracking-tight line-clamp-1">{playlist.name}</h3>
                      </div>

                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === playlist.id ? null : playlist.id) }}
                          className="p-2 hover:bg-white/[0.08] rounded-xl text-slate-500 hover:text-slate-200 transition-colors active:scale-95"
                        >
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>
                        {menuOpen === playlist.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-9 bg-[#131A2B] rounded-2xl shadow-2xl z-20 py-1.5 min-w-[180px] border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                              <button
                                onClick={() => {
                                  setPlaylistToDelete(playlist.id)
                                  setShowDeleteModal(true)
                                }}
                                className="flex items-center gap-2.5 w-full px-4 py-3 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Playlist
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && customPlaylists.length === 0 && !hasNoResults && (
              <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/[0.08]">
                <ListVideo className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-200">No playlists yet</h3>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 px-8 h-12 bg-white hover:bg-slate-100 text-slate-950 rounded-full text-sm font-extrabold transition-all shadow-xl hover:shadow-white/10 active:scale-95 hover:scale-105"
                >
                  Create first playlist
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Playlist"
        message="Are you sure you want to delete this playlist? This action cannot be undone and all organization within this list will be lost."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false)
          setPlaylistToDelete(null)
          setMenuOpen(null)
        }}
        isDanger={true}
      />

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-100 tracking-tight">New Playlist</h2>
              <p className="text-slate-400 text-sm mb-8 font-medium">Add a title to organize your sessions</p>
              
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl px-5 py-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all mb-8 shadow-inner"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 h-12 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || creating}
                  className="px-8 h-12 bg-indigo-600 rounded-2xl text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
