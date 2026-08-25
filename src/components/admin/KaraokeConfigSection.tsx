"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Mic, Search, CheckCircle, XCircle, X, FileText, Save,
  Clock, Music, RefreshCw, Play, Pause, AlertCircle,
  Layers, Volume2, Wand2, ChevronLeft, ChevronRight,
  RotateCcw, RotateCw, FastForward, Check, Copy, Sliders,
  Tag, Info, Sparkles
} from 'lucide-react';
import { MasterLibraryService } from '@/lib/master-library';
import { getSongLyrics, saveKaraokeLrcText } from '@/app/pages/audiolab/_lib/lyrics-service';
import CustomLoader from '@/components/CustomLoader';
import { useZone } from '@/hooks/useZone';

// ── In-Memory Cache (15-min TTL) for instant tab switching ──
interface SongsCache {
  data: any[];
  timestamp: number;
}
let globalKaraokeSongsCache: SongsCache | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export default function KaraokeConfigSection() {
  const { currentZone } = useZone();

  // Data State
  const [allSongs, setAllSongs] = useState<any[]>(() => {
    if (globalKaraokeSongsCache && Date.now() - globalKaraokeSongsCache.timestamp < CACHE_TTL_MS) {
      return globalKaraokeSongsCache.data;
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !(globalKaraokeSongsCache && Date.now() - globalKaraokeSongsCache.timestamp < CACHE_TTL_MS);
  });
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [lrcText, setLrcText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Advanced In-Modal Audio Player State
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh && globalKaraokeSongsCache && Date.now() - globalKaraokeSongsCache.timestamp < CACHE_TTL_MS) {
      setAllSongs(globalKaraokeSongsCache.data);
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const masterSongs = await MasterLibraryService.getMasterSongs();
      const merged: any[] = [
        ...masterSongs.map((s: any) => ({ ...s, _source: 'Master' }))
      ];
      merged.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      
      // Update Cache
      globalKaraokeSongsCache = {
        data: merged,
        timestamp: Date.now()
      };

      setAllSongs(merged);
    } catch (error) {
      console.error('[KaraokeConfigSection] Error loading songs:', error);
      showToast('error', 'Failed to load songs repertoire');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Audio player cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Filter songs based on search
  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return allSongs;
    const term = searchTerm.toLowerCase().trim();
    return allSongs.filter(song =>
      song.title?.toLowerCase().includes(term) ||
      song.writer?.toLowerCase().includes(term) ||
      song.leadSinger?.toLowerCase().includes(term) ||
      song.category?.toLowerCase().includes(term)
    );
  }, [allSongs, searchTerm]);

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSongs = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredSongs.slice(startIndex, startIndex + pageSize);
  }, [filteredSongs, safeCurrentPage, pageSize]);

  const openConfigModal = async (song: any) => {
    setSelectedSong(song);
    setIsPlayingPreview(false);
    setCurrentTime(0);
    setDuration(0);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // 1. Instant check on song object itself
    let initialLrc = song.karaokeLrcText || song.rawData?.karaokeLrcText || '';

    // Convert syncedLyrics array to LRC if string is not set
    const syncedArr = song.syncedLyrics || song.rawData?.syncedLyrics;
    if (!initialLrc && Array.isArray(syncedArr) && syncedArr.length > 0) {
      initialLrc = syncedArr.map((line: any) => {
        const time = typeof line.time === 'number' ? line.time : 0;
        const minutes = Math.floor(time / 60);
        const seconds = (time % 60).toFixed(2).padStart(5, '0');
        return `[${String(minutes).padStart(2, '0')}:${seconds}] ${line.text || ''}`;
      }).join('\n');
    }

    // Fallback to plain lyrics if neither LRC nor synced exists
    const rawLyrics = song.lyrics || song.rawData?.lyrics;
    if (!initialLrc && rawLyrics && typeof rawLyrics === 'string') {
      const cleanLines = rawLyrics
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      if (cleanLines.length > 0) {
        initialLrc = cleanLines.map((l: string) => `[00:00.00] ${l}`).join('\n');
      }
    }

    setLrcText(initialLrc);
    setIsLoadingLyrics(!initialLrc);

    // 2. Fetch fresh lyrics from API
    try {
      const data = await getSongLyrics(song.id);
      if (data && data.karaokeLrcText) {
        setLrcText(data.karaokeLrcText);
      } else if (data && data.lyrics && Array.isArray(data.lyrics) && data.lyrics.length > 0) {
        const formatted = data.lyrics.map((line: any) => {
          const time = typeof line.time === 'number' ? line.time : 0;
          const minutes = Math.floor(time / 60);
          const seconds = (time % 60).toFixed(2).padStart(5, '0');
          return `[${String(minutes).padStart(2, '0')}:${seconds}] ${line.text || ''}`;
        }).join('\n');
        setLrcText(formatted);
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const initAudio = (audioUrl: string) => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackRate;
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
    };
    audio.onended = () => {
      setIsPlayingPreview(false);
    };
    audio.onerror = () => {
      setIsPlayingPreview(false);
      showToast('error', 'Audio playback failed');
    };
    audioRef.current = audio;
    return audio;
  };

  const handleTogglePreviewAudio = () => {
    if (!selectedSong) return;
    const audioUrl = selectedSong.audioUrls?.full || selectedSong.audioFile || selectedSong.audioUrl;
    if (!audioUrl) {
      showToast('error', 'No audio stream available for this song');
      return;
    }

    const audio = initAudio(audioUrl);

    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
    } else {
      audio.play().catch(() => setIsPlayingPreview(false));
      setIsPlayingPreview(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const handleSkipTime = (seconds: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Stamp current timestamp e.g. [01:23.45] at textarea cursor
  const handleInsertTimestampAtCursor = () => {
    const curTime = audioRef.current ? audioRef.current.currentTime : currentTime;
    const mins = Math.floor(curTime / 60);
    const secs = (curTime % 60).toFixed(2).padStart(5, '0');
    const stamp = `[${String(mins).padStart(2, '0')}:${secs}]`;

    const textarea = textareaRef.current;
    if (!textarea) {
      setLrcText(prev => (prev ? `${prev}\n${stamp} ` : `${stamp} `));
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const text = lrcText;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newText = `${before}${stamp} ${after}`;
    setLrcText(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + stamp.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleSaveLrc = async () => {
    if (!selectedSong) return;

    setIsSaving(true);
    try {
      const success = await saveKaraokeLrcText(selectedSong.id || '', lrcText);
      if (success) {
        showToast('success', 'Playback Mode LRC Synced Lyrics saved successfully!');
        
        // Update local cache & song object
        selectedSong.karaokeLrcText = lrcText;
        if (selectedSong.rawData) {
          selectedSong.rawData.karaokeLrcText = lrcText;
          selectedSong.rawData.hasSyncedLyrics = true;
        }

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setSelectedSong(null);
      } else {
        showToast('error', 'Failed to save LRC text.');
      }
    } catch (error) {
      showToast('error', 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatAudioTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00.00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  const lrcLineCount = useMemo(() => {
    if (!lrcText) return 0;
    return lrcText.split('\n').filter(line => line.trim().length > 0).length;
  }, [lrcText]);

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar relative font-sans">
      {/* ── Dynamic Purple / Indigo Studio Glows ── */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[600] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white transition-all animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="relative flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">

        {/* ── 1. STUDIO HEADER ── */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Playback Mode</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-700 border border-purple-200">
                  LRC Timings
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage precision millisecond word-by-word synced LRC lyrics for Playback Mode, teleprompters, and AudioLab practice.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              title="Refresh songs repertoire"
              className="p-2.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── 2. SEARCH TOOLBAR & STATS ── */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by song title, writer, lead singer, or category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {filteredSongs.length.toLocaleString()} Repertoire Songs
            </span>
          </div>
        </div>

        {/* ── 3. SONGS LIST ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-600" />
              <h3 className="font-black text-sm text-slate-900">Songs Repertoire Catalog</h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Showing {(safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, filteredSongs.length)} of {filteredSongs.length.toLocaleString()}
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Loading catalog songs...</p>
              <p className="text-xs text-slate-400 mt-1">Fetching AudioLab and Master Library metadata</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="py-20 text-center p-6">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <Mic className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                {searchTerm ? `No songs matching "${searchTerm}"` : 'No songs found in catalog'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchTerm ? 'Try searching with another keyword or writer name.' : 'Songs published in Master Library will automatically appear here for LRC syncing.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedSongs.map((song) => {
                const hasAudio = Boolean(song.audioUrls?.full || song.audioFile || song.audioUrl);
                const hasLrc = Boolean(song.karaokeLrcText || song.rawData?.karaokeLrcText || (song.syncedLyrics && song.syncedLyrics.length > 0) || (song.rawData?.syncedLyrics && song.rawData.syncedLyrics.length > 0));

                return (
                  <div
                    key={song.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0 border border-purple-100">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                            {song.title}
                          </h4>
                          {song.category && (
                            <span className="px-2 py-0.2 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600">
                              {song.category}
                            </span>
                          )}
                          {hasLrc && (
                            <span className="px-2 py-0.2 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Timed LRC Ready
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {song.writer ? `By ${song.writer}` : (song.leadSinger ? `Lead: ${song.leadSinger}` : 'Rehearsal Song')}
                          {hasAudio && ' • Audio Track Ready'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => openConfigModal(song)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{hasLrc ? 'Edit LRC Timings' : 'Configure LRC Lyrics'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Page <strong className="text-slate-800">{safeCurrentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none font-bold transition-all shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = safeCurrentPage;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (safeCurrentPage <= 3) pageNum = i + 1;
                    else if (safeCurrentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = safeCurrentPage - 2 + i;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-xl text-xs font-bold transition-all ${
                          safeCurrentPage === pageNum
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none font-bold transition-all shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── 4. EXPANSIVE PRO PLAYBACK MODE STUDIO MODAL ── */}
      {selectedSong && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[500] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] max-h-[850px] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-200 shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">{selectedSong.title}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>Playback Mode Synced LRC Editor</span>
                    <span>•</span>
                    <span className="font-bold text-purple-700">{lrcLineCount} Timed Lines</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current = null;
                    }
                    setSelectedSong(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 flex flex-col space-y-4 overflow-hidden bg-[#fbfbfe]">
              
              {/* ── Precision Audio Player Bar (Pure Real-time Controls) ── */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Playback Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTogglePreviewAudio}
                      className="w-11 h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-200 transition-all active:scale-95 shrink-0"
                      title={isPlayingPreview ? 'Pause audio' : 'Play audio'}
                    >
                      {isPlayingPreview ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSkipTime(-3)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all"
                      title="Skip back 3 seconds"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSkipTime(3)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all"
                      title="Skip forward 3 seconds"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Digital Time Display */}
                    <div className="px-3 py-1.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs font-bold tracking-wider shrink-0 ml-1">
                      <span>{formatAudioTime(currentTime)}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-slate-400">{formatAudioTime(duration)}</span>
                    </div>
                  </div>

                  {/* Right: Stamp Timestamp Button & Playback Speed Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Playback speed selector */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                      {[0.5, 0.75, 1.0, 1.25].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleChangePlaybackRate(rate)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                            playbackRate === rate
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    {/* Timestamp Insert Button */}
                    <button
                      type="button"
                      onClick={handleInsertTimestampAtCursor}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-200 transition-all active:scale-95"
                      title="Insert [mm:ss.xx] timestamp at cursor position"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Stamp Timestamp ({formatAudioTime(currentTime)})</span>
                    </button>
                  </div>
                </div>

                {/* Scrubber Progress Slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.05}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>

              {/* ── Big Expansive LRC Editor Stage ── */}
              <div className="flex-1 flex flex-col space-y-2 min-h-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Playback Mode Synced LRC Code
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      Format: [mm:ss.xx] Lyric text
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 font-medium">
                    Tip: Play audio and click <strong className="text-purple-700">Stamp Timestamp</strong> on each lyric line.
                  </span>
                </div>

                {isLoadingLyrics ? (
                  <div className="flex-1 flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={lrcText}
                    onChange={e => setLrcText(e.target.value)}
                    placeholder="[00:12.50] Praise the Lord oh my soul&#10;[00:18.20] All that is within me praise His holy name&#10;[00:24.00] Bless the Lord oh my soul..."
                    className="flex-1 w-full p-5 bg-slate-950 text-emerald-400 font-mono text-sm leading-relaxed rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 custom-scrollbar resize-none shadow-inner"
                  />
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Synced lines update instantly on Singer Hub Playback Teleprompters.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current = null;
                    }
                    setSelectedSong(null);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLrc}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-7 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaving ? 'Saving Timings...' : 'Save Synced LRC'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
