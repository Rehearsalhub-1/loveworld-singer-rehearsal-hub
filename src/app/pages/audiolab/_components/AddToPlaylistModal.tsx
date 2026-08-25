"use client";

import { useState, useEffect } from 'react';
import { X, Plus, ListMusic, CheckCircle2, ChevronRight, Search, Loader2 } from 'lucide-react';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';
import type { Song, Playlist } from '../_types';

interface AddToPlaylistModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
}

export function AddToPlaylistModal({ song, isOpen, onClose }: AddToPlaylistModalProps) {
  const { state, loadPlaylists, createUserPlaylist, addSongToUserPlaylist } = useAudioLab();
  const { user, profile } = useAuth();
  const { playlists } = state;

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successPlaylistId, setSuccessPlaylistId] = useState<string | null>(null);
  const [addingToId, setAddingToId] = useState<string | null>(null);

  // Load playlists on open if not loaded
  useEffect(() => {
    if (isOpen && user?.uid && playlists.length === 0) {
      loadPlaylists(user.uid);
    }
  }, [isOpen, user?.uid, playlists.length, loadPlaylists]);

  const handleCreateAndAdd = async () => {
    if (!newTitle.trim() || !user?.uid) return;
    setIsLoading(true);
    try {
      const id = await createUserPlaylist(
        newTitle.trim(),
        '',
        user.uid,
        profile?.zone || undefined
      );
      if (id) {
        await addSongToUserPlaylist(id, song.id);
        setSuccessPlaylistId(id);
        setTimeout(() => {
          onClose();
          setSuccessPlaylistId(null);
          setIsCreating(false);
          setNewTitle('');
        }, 1500);
      }
    } catch (error) {
      console.error('[AddToPlaylistModal] Error creating/adding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    setAddingToId(playlistId);
    try {
      const success = await addSongToUserPlaylist(playlistId, song.id);
      if (success) {
        setSuccessPlaylistId(playlistId);
        setTimeout(() => {
          onClose();
          setSuccessPlaylistId(null);
          setAddingToId(null);
        }, 1500);
      } else {
        setAddingToId(null);
      }
    } catch (error) {
      console.error('[AddToPlaylistModal] Error adding to playlist:', error);
      setAddingToId(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredPlaylists = playlists.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      {/* Backdrop Click to Close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#191022] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-1/2 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <ListMusic className="text-violet-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold">Add to Playlist</h3>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{song.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5">
          {!isCreating ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search playlists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#261933] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:text-slate-500"
                />
              </div>

              {/* Create New */}
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-500 text-white font-bold hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/20 active:scale-95 touch-manipulation"
              >
                <div className="size-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <span>Create New Playlist</span>
              </button>

              {/* List */}
              <div className="space-y-2 mt-2">
                {filteredPlaylists.map((playlist) => {
                  const alreadyIn = playlist.songIds.includes(song.id);
                  const isSuccess = successPlaylistId === playlist.id;

                  return (
                    <button
                      key={playlist.id}
                      disabled={alreadyIn || isLoading}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all touch-manipulation ${
                        isSuccess
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : alreadyIn
                          ? 'bg-white/5 border-transparent opacity-60 cursor-default'
                          : 'bg-[#261933] border-white/5 hover:border-violet-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-lg flex items-center justify-center ${isSuccess ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                          <ListMusic className={isSuccess ? 'text-emerald-400' : 'text-slate-400'} size={18} />
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-semibold ${isSuccess ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {playlist.title}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                            {playlist.songIds.length} {playlist.songIds.length === 1 ? 'Song' : 'Songs'}
                          </p>
                        </div>
                      </div>

                      {isSuccess ? (
                        <CheckCircle2 className="text-emerald-400" size={20} />
                      ) : addingToId === playlist.id ? (
                        <Loader2 className="text-violet-400 animate-spin" size={18} />
                      ) : alreadyIn ? (
                        <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded">ADDED</span>
                      ) : (
                        <ChevronRight className="text-slate-500" size={18} />
                      )}
                    </button>
                  );
                })}

                {filteredPlaylists.length === 0 && searchQuery && (
                  <div className="py-8 text-center">
                    <p className="text-slate-500 text-sm">No playlists matching "{searchQuery}"</p>
                  </div>
                )}
                
                {playlists.length === 0 && !searchQuery && !isLoading && (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-slate-500 text-sm">You haven't created any playlists yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Playlist Title</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., My Favorite Choruses"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#261933] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  disabled={!newTitle.trim() || isLoading}
                  onClick={handleCreateAndAdd}
                  className="flex-1 bg-violet-500 text-white py-3.5 rounded-xl font-bold hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Create & Add</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
