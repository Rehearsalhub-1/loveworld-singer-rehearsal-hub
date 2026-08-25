"use client";

import { useState } from 'react';
import { X, Plus, ListMusic, CheckCircle2 } from 'lucide-react';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (playlistId: string) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) {
  const { createUserPlaylist } = useAudioLab();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const playlistId = await createUserPlaylist(
        title.trim(),
        description.trim(),
        user.uid,
        profile?.zone || undefined
      );

      if (playlistId && typeof playlistId === 'string') {
        setTitle('');
        setDescription('');
        if (onSuccess) onSuccess(playlistId);
        onClose();
      } else {
        setError('Failed to create playlist. Please try again.');
      }
    } catch (err) {
      console.error('[CreatePlaylistModal] Error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-[#191022] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-1/2 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-white font-bold text-lg px-2">New Playlist</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Playlist Title
              </label>
              <input
                autoFocus
                type="text"
                placeholder="Give your set a name..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#261933]/50 border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-slate-600 text-sm font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Description
              </label>
              <textarea
                placeholder="Optional notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-[#261933]/50 border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-slate-600 text-sm font-medium resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/5 text-white text-sm font-bold hover:bg-white/5 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isLoading}
              className="flex-[1.5] bg-violet-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/10 disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Create Playlist</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
