"use client";

import { useState, useEffect } from 'react'
import { X, Plus, Check, ListVideo } from 'lucide-react'
import {
  getUserPlaylists,
  createPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  getPlaylistsContainingVideo,
  Playlist
} from '../_lib/playlist-service'

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string
  videoThumbnail?: string
  userId: string
}

export default function AddToPlaylistModal({
  isOpen,
  onClose,
  videoId,
  videoThumbnail,
  userId
}: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadPlaylists()
    }
  }, [isOpen, userId, videoId])

  const loadPlaylists = async () => {
    setLoading(true)
    try {
      const [userPlaylists, containingIds] = await Promise.all([
        getUserPlaylists(userId),
        getPlaylistsContainingVideo(userId, videoId)
      ])
      setPlaylists(userPlaylists)
      setSelectedIds(containingIds)
    } catch (error) {
 console.error('Error loading playlists:', error)
    }
    setLoading(false)
  }

  const handleTogglePlaylist = async (playlistId: string) => {
    const isSelected = selectedIds.includes(playlistId)
    try {
      if (isSelected) {
        await removeFromPlaylist(playlistId, videoId)
        setSelectedIds(prev => prev.filter(id => id !== playlistId))
      } else {
        await addToPlaylist(playlistId, videoId, videoThumbnail)
        setSelectedIds(prev => [...prev, playlistId])
      }
    } catch (error) {
 console.error('Error toggling playlist:', error)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !userId) {
      return
    }
    setCreating(true)
    try {
      const newId = await createPlaylist(userId, newPlaylistName.trim())
      await addToPlaylist(newId, videoId, videoThumbnail)
      setNewPlaylistName('')
      setShowCreate(false)
      await loadPlaylists()
    } catch (error) {
 console.error(' Error creating playlist:', error)
    }
    setCreating(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-slate-900 w-full sm:w-[420px] sm:rounded-[32px] rounded-t-[32px] max-h-[85vh] flex flex-col border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-7 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex flex-col">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-400">Curate Library</h3>
            <p className="text-xl font-bold text-slate-100 tracking-tight mt-0.5">Save to playlists</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-all flex items-center justify-center border border-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-950/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div className="w-12 h-12 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-lg shadow-indigo-500/10" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 animate-pulse">Syncing Hub...</p>
            </div>
          ) : (
            <>
              {playlists.map((playlist) => {
                const isSelected = selectedIds.includes(playlist.id);
                return (
                  <button
                    key={playlist.id}
                    onClick={() => handleTogglePlaylist(playlist.id)}
                    className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 group ${isSelected ? 'bg-indigo-600/10 border border-indigo-500/20' : 'hover:bg-slate-800 border border-transparent'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                        ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                        : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'
                      }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                    </div>
                    <div className="flex flex-col flex-1 text-left min-w-0">
                        <span className={`text-[15px] font-bold truncate tracking-tight ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                          {playlist.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <ListVideo className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className={`text-[10px] font-bold tracking-widest ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`}>{playlist.videoIds.length} VIDEOS</span>
                        </div>
                    </div>
                  </button>
                );
              })}

              {playlists.length === 0 && !showCreate && (
                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                  <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6 border border-white/5">
                    <ListVideo className="w-10 h-10 text-slate-500" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Your Hub is Empty</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create New Navigation */}
        <div className="p-6 border-t border-slate-800/60 bg-slate-900/50 backdrop-blur-sm">
          {showCreate ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="ENTER PLAYLIST NAME..."
                className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl px-6 py-4 text-xs font-bold tracking-widest text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCreate(false); setNewPlaylistName('') }}
                  className="flex-1 px-4 py-4 bg-slate-800 hover:bg-slate-750 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-all border border-white/5"
                >
                  ABORT
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || creating}
                  className="flex-1 px-4 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(79,70,229,0.3)] transition-all border border-indigo-400/20"
                >
                  {creating ? 'SYNCING...' : 'INITIATE'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center gap-3 w-full p-5 bg-slate-950/50 hover:bg-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 border border-indigo-500/20 transition-all group group-hover:shadow-lg group-hover:shadow-indigo-500/5 shadow-inner"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              Create New Playlist
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
