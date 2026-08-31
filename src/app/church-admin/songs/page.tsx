"use client";

/**
 * Church Admin — Songs
 * Lists the church's own songs and lets the coordinator import from the zone library.
 * API endpoints used:
 *   GET  /subgroups/songs?subGroupId=<id>          — church song list
 *   GET  /songs/praise-night?zoneId=<zoneId>        — zone library to import from
 *   POST /subgroups/songs/import                    — import a song into the church
 *   PATCH /songs/:id  { status }                    — toggle live / not live
 *   DELETE /subgroups/songs/:id                     — remove from church
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Eye, EyeOff, Trash2, RefreshCw, X, Check, Music } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useSubGroup } from '@/hooks/useSubGroup';
import CustomLoader from '@/components/CustomLoader';
import { useSearchParams } from 'next/navigation';

interface Song {
  id: string;
  title: string;
  leadSinger?: string;
  category?: string;
  status?: string;
  audioFile?: string;
  [key: string]: any;
}

export default function ChurchSongsPage() {
  const searchParams = useSearchParams();
  const { coordinatedSubGroups, isLoading: sgLoading } = useSubGroup();
  const church = coordinatedSubGroups[0] ?? null;

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [zoneSongs, setZoneSongs] = useState<Song[]>([]);
  const [loadingZone, setLoadingZone] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadSongs = useCallback(async () => {
    if (!church?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/subgroups/songs?subGroupId=${church.id}`);
      setSongs(Array.isArray(res?.data) ? res.data : []);
    } catch { setSongs([]); } finally { setLoading(false); }
  }, [church?.id]);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  // Auto-open import panel if ?import=1 in URL
  useEffect(() => {
    if (searchParams?.get('import') === '1') setShowImport(true);
  }, [searchParams]);

  const openImport = async () => {
    setShowImport(true);
    if (zoneSongs.length > 0) return;
    setLoadingZone(true);
    try {
      const res = await apiClient.get<any>(`/songs/praise-night?zoneId=${church?.zoneId || church?.organizationId}`);
      setZoneSongs(Array.isArray(res?.data) ? res.data : []);
    } catch { setZoneSongs([]); } finally { setLoadingZone(false); }
  };

  const handleImport = async () => {
    if (!church?.id || selectedForImport.size === 0) return;
    setImporting(true);
    let imported = 0;
    for (const songId of selectedForImport) {
      const song = zoneSongs.find(s => s.id === songId);
      if (!song) continue;
      try {
        await apiClient.post('/subgroups/songs/import', {
          songId: song.id,
          subGroupId: church.id,
          zoneId: church.zoneId || church.organizationId,
        });
        imported++;
      } catch { /* continue */ }
    }
    showMsg(`Imported ${imported} song${imported !== 1 ? 's' : ''}`);
    setSelectedForImport(new Set());
    setShowImport(false);
    await loadSongs();
    setImporting(false);
  };

  const toggleLive = async (song: Song) => {
    const next = song.status === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.patch(`/songs/${song.id}`, { status: next });
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, status: next } : s));
    } catch { showMsg('Failed to update status'); }
  };

  const removeSong = async (id: string, title: string) => {
    if (!confirm(`Remove "${title}" from your church?`)) return;
    try {
      await apiClient.delete(`/subgroups/songs/${id}?subGroupId=${church?.id}`);
      setSongs(prev => prev.filter(s => s.id !== id));
    } catch { showMsg('Failed to remove song'); }
  };

  const filtered = songs.filter(s =>
    !search.trim() ||
    (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.leadSinger || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredZone = zoneSongs.filter(s =>
    !importSearch.trim() ||
    (s.title || '').toLowerCase().includes(importSearch.toLowerCase()) ||
    (s.leadSinger || '').toLowerCase().includes(importSearch.toLowerCase())
  );

  if (sgLoading) return <div className="py-24 flex justify-center"><CustomLoader message="Loading..." /></div>;
  if (!church) return <div className="py-24 text-center text-sm text-slate-500">No church assigned.</div>;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-black text-slate-900">Songs ({songs.length})</h2>
        <button
          onClick={openImport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          Import from Zone
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search songs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Song list */}
      {loading ? (
        <div className="py-16 flex justify-center"><CustomLoader message="Loading songs..." /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Music className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">No songs yet.</p>
          <p className="text-xs text-slate-400 mt-1">Import songs from your zone library to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(song => (
              <div key={song.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{song.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {song.leadSinger ? `Lead: ${song.leadSinger}` : ''}{song.leadSinger && song.category ? ' · ' : ''}{song.category || ''}
                  </p>
                </div>
                <button
                  onClick={() => toggleLive(song)}
                  title={song.status === 'active' ? 'Mark as not live' : 'Mark as live'}
                  className={`p-1.5 rounded-lg transition-all ${song.status === 'active' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200'}`}
                >
                  {song.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => removeSong(song.id, song.title)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Import from Zone Library</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select songs to add to your church</p>
              </div>
              <button onClick={() => setShowImport(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search zone songs..."
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
              {loadingZone ? (
                <div className="py-12 flex justify-center"><CustomLoader message="Loading zone songs..." /></div>
              ) : filteredZone.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No songs found in zone library.</div>
              ) : (
                filteredZone.map(song => {
                  const sel = selectedForImport.has(song.id);
                  return (
                    <div
                      key={song.id}
                      onClick={() => setSelectedForImport(prev => {
                        const n = new Set(prev);
                        sel ? n.delete(song.id) : n.add(song.id);
                        return n;
                      })}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all
                        ${sel ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{song.title}</p>
                        {song.leadSinger && <p className="text-[10px] text-slate-400 truncate">Lead: {song.leadSinger}</p>}
                      </div>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                        {sel && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">{selectedForImport.size} selected</span>
              <div className="flex gap-2">
                <button onClick={() => setShowImport(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || selectedForImport.size === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 transition-all"
                >
                  {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {importing ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
