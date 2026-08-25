"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ListVideo, MoreVertical, Trash2, Play, ThumbsUp, Clock,
  Globe, Plus, Lock, X, AlertTriangle, Search, Mic, Music, RefreshCw, ChevronDown, Sparkles, ArrowLeft, ListMusic
} from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useSearchParams, useRouter } from 'next/navigation';
import CustomLoader from '@/components/CustomLoader';
import { useAudio } from '@/contexts/AudioContext';
import { useAudioLab } from '../_context/AudioLabContext';
import {
  getSongsPaginated,
  searchSongsDeep,
  toLegacySong,
  getSongsByProgram,
  getSongById
} from '../_lib/song-service';
import { useZone } from '@/hooks/useZone';
import { useProgramStore } from '@/stores/programStore';
import { SimpleSongCard } from './SimpleSongCard';
import { AudioLabSongDetailModal } from './AudioLabSongDetailModal';
import { CreatePlaylistModal } from './CreatePlaylistModal';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { useAuth } from '@/hooks/useAuth';
import type { Song, VocalPart, AudioLabSong, LyricLine } from '../_types';
import type { PraiseNightSong } from '@/types/supabase';

type QueryDocumentSnapshot<T = any> = any;
type DocumentData = any;

const MetadataService = {
  subscribeToPraiseNightSongsMetadata: (_z?: string, _p?: string, _cb?: (ts: number) => void) => () => {}
};

function useRealtimeData(_zoneId?: string, _userId?: string) {
  return {
    pages: [] as any[],
    getCurrentSongs: async (_id: string) => [] as any[]
  };
}

type ProgramId = 'all' | 'ongoing' | 'playlists' | string;

export function LibraryView() {
  const { currentSong, isPlaying, setCurrentSong, togglePlayPause, currentTime, duration, setCurrentTime, isLoading: isAudioLoading, pause: stopSimpleAudio } = useAudio();
  const { setView, playSong: playInAudioLab, state, loadLibraryData, deleteUserPlaylist, loadPlaylists, openPlaylist, createUserPlaylist, removeSongFromUserPlaylist } = useAudioLab();
  const { currentView, activePlaylist, playlists } = state;
  const isPlaylistView = currentView === 'playlist-detail';
  const { user, profile } = useAuth();
  const { currentZone } = useZone();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Program selection state
  const [selectedProgramId, setSelectedProgramId] = useState<ProgramId>('all');
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const isFetchingRef = useRef(false);

  // Initialize from global cache if available
  const [totalCount, setTotalCount] = useState(state.libraryData.totalCount || 0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageStack, setPageStack] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([]);
  const ITEMS_PER_PAGE = 500;

  // Detail Modal State
  const [selectedDetailSong, setSelectedDetailSong] = useState<Song | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);

  // Observer for Infinite Scroll
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(state.libraryData.songs.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(state.libraryData.lastDoc || null);
  const [hasMore, setHasMore] = useState(state.libraryData.hasMore);
  const [error, setError] = useState<string | null>(null);

  // Confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'playlist' | 'song'>('playlist');
  const [itemToDelete, setItemToDelete] = useState<{ id: string, title: string, playlistId?: string } | null>(null);

  // Helper for de-duplication
  const getUniqueSongs = useCallback((inputSongs: Song[] | AudioLabSong[]) => {
    const uniqueSongsMap = new Map<string, Song | AudioLabSong>();

    inputSongs.forEach(song => {
      if (!song.title) return;
      const normalizedTitle = song.title.toLowerCase().trim();
      const existingSong = uniqueSongsMap.get(normalizedTitle);

      if (!existingSong) {
        uniqueSongsMap.set(normalizedTitle, song);
      } else {
        const existingHasAudio = (existingSong as any).audioUrl || ((existingSong as any).audioUrls && Object.keys((existingSong as any).audioUrls).length > 0) || (existingSong as any).audioFile;
        const newHasAudio = (song as any).audioUrl || ((song as any).audioUrls && Object.keys((song as any).audioUrls).length > 0) || (song as any).audioFile;

        if (!existingHasAudio && newHasAudio) {
          uniqueSongsMap.set(normalizedTitle, song);
        } else if (existingHasAudio === newHasAudio) {
          if (!existingSong.artist && song.artist) {
            uniqueSongsMap.set(normalizedTitle, song);
          }
        }
      }
    });
    return Array.from(uniqueSongsMap.values());
  }, []);

  // Sync with global cache when it updates
  useEffect(() => {
    if (selectedProgramId === 'all' && !searchQuery && state.libraryData.songs.length > 0) {
      const rawList = state.libraryData.songs.map(toLegacySong);
      const uniqueList = getUniqueSongs(rawList) as Song[];
      setSongs(uniqueList);
      setTotalCount(state.libraryData.totalCount || uniqueList.length);
      setLastVisibleDoc(state.libraryData.lastDoc);
      setHasMore(state.libraryData.hasMore);
      setIsLoading(false);
    } else if (state.isLoading && songs.length === 0) {
      setIsLoading(true);
    } else if (!state.isLoading) {
      setIsLoading(false);
    }
  }, [state.libraryData.songs, state.libraryData.totalCount, state.libraryData.lastFetched, state.isLoading, selectedProgramId, searchQuery, getUniqueSongs]);

  // Track highlighted song
  const [highlightedSongId, setHighlightedSongId] = useState<string | null>(null);
  const handledSongParamRef = useRef<string | null>(null);

  // Real-time data for "Ongoing" tab
  const { pages: praiseNightPages, getCurrentSongs: getPraiseNightSongs } = useRealtimeData(currentZone?.id, user?.uid);
  const [metadataTimestamp, setMetadataTimestamp] = useState(0);

  // Helper: Convert PraiseNightSong to AudioLabSong
  const praiseNightSongToAudioLabSong = useCallback((pnSong: PraiseNightSong): AudioLabSong => {
    let parsedLyrics: LyricLine[] = [];
    const lyricsSource = pnSong.lyrics;
    if (lyricsSource) {
      if (typeof lyricsSource === 'string') {
        const text = lyricsSource.replace(/<[^>]*>/g, '');
        parsedLyrics = text.split('\n').map((line, i) => ({
          time: i * 5,
          text: line,
          duration: 5
        })).filter(l => l.text.trim());
      } else if (Array.isArray(lyricsSource)) {
        parsedLyrics = lyricsSource as unknown as LyricLine[];
      }
    }

    const mergedAudioUrls = {
      full: pnSong.audioFile || '',
      ...(pnSong.audioUrls || {})
    };

    const availableParts = Object.keys(mergedAudioUrls).filter(
      key => !!(mergedAudioUrls as any)[key]
    );

    return {
      id: pnSong.id || `pn-${Math.random()}`,
      title: pnSong.title,
      artist: pnSong.leadSinger || pnSong.writer || 'Praise Night',
      duration: 300,
      audioUrls: mergedAudioUrls,
      availableParts: availableParts,
      genre: pnSong.category || 'Praise Night',
      key: pnSong.key || '',
      tempo: pnSong.tempo ? parseInt(pnSong.tempo) || 0 : 0,
      albumArt: '',
      lyrics: pnSong.lyrics || [],
      zoneId: currentZone?.id || '',
      isHQSong: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }, [currentZone]);

  const loadSongs = useCallback(async (isManualRefresh = false) => {
    if (isFetchingRef.current || (selectedProgramId === 'playlists' && !isPlaylistView)) return;
    isFetchingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);
      setCurrentPage(1);
      setPageStack([null]);
      setHasMore(false);
      setLastVisibleDoc(null);
      setSongs([]); // Clear songs for new load

      let songsList: Song[] = [];

      if (isPlaylistView && activePlaylist) {
        setSongs([]); // Clear old songs to prevent flashing
        const songPromises = activePlaylist.songIds.map(id => getSongById(id));
        const audioLabSongs = await Promise.all(songPromises);
        const validSongs = audioLabSongs.filter(Boolean) as AudioLabSong[];
        songsList = validSongs.map(toLegacySong);
        setTotalCount(songsList.length);
        setHasMore(false);
      } else if (selectedProgramId === 'ongoing') {
        const ongoingPage = [...praiseNightPages]
          .filter(p => p.category === 'ongoing')
          .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];

        if (ongoingPage) {
          const pnSongs = await getPraiseNightSongs(ongoingPage.id);
          const validSongs = pnSongs.map(praiseNightSongToAudioLabSong);
          const rawList = validSongs.map(toLegacySong);
          songsList = getUniqueSongs(rawList) as Song[];
          setTotalCount(songsList.length);
          setHasMore(false);
        } else {
          setTotalCount(0);
          setHasMore(false);
        }
      } else {
        const specificPNPage = praiseNightPages.find((p: any) => p.id === selectedProgramId);

        if (specificPNPage) {
          const pnSongs = await getPraiseNightSongs(specificPNPage.id);
          const validSongs = pnSongs.map(praiseNightSongToAudioLabSong);
          const rawList = validSongs.map(toLegacySong);
          songsList = getUniqueSongs(rawList) as Song[];
          setTotalCount(songsList.length);
          setHasMore(false);
        } else if (selectedProgramId !== 'all') {
          const programSongs = await getSongsByProgram(selectedProgramId);
          const rawList = programSongs.map(toLegacySong);
          songsList = getUniqueSongs(rawList) as Song[];
          setTotalCount(songsList.length);
          setHasMore(false);
        } else {
          if (!isManualRefresh && state.libraryData.songs.length > 0) {
            const rawList = state.libraryData.songs.map(toLegacySong);
            songsList = getUniqueSongs(rawList) as Song[];
            setTotalCount(state.libraryData.totalCount);
            setLastVisibleDoc(state.libraryData.lastDoc);
            setHasMore(state.libraryData.hasMore);
          } else {
            await loadLibraryData(currentZone?.id || '', ITEMS_PER_PAGE, isManualRefresh);
            if (!isManualRefresh && state.libraryData.songs.length > 0) {
              const rawList = state.libraryData.songs.map(toLegacySong);
              songsList = getUniqueSongs(rawList) as Song[];
              setTotalCount(state.libraryData.totalCount);
              setLastVisibleDoc(state.libraryData.lastDoc);
              setHasMore(state.libraryData.hasMore);
            }
          }
        }
      }

      setSongs(songsList);
      if (selectedProgramId === 'all') {
        setHasMore(songsList.length >= ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('[LibraryView] Error loading songs:', err);
      setError('Failed to load songs');
      setSongs([]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      isFetchingRef.current = false;
    }
  }, [selectedProgramId, isPlaylistView, activePlaylist, praiseNightPages, getPraiseNightSongs, praiseNightSongToAudioLabSong, getUniqueSongs, state.libraryData, loadLibraryData, currentZone?.id]);

  // Initial load
  useEffect(() => {
    if (selectedProgramId !== 'playlists' || isPlaylistView) {
      loadSongs();
    }
  }, [currentZone?.id, loadSongs, isPlaylistView]);

  // Handle program/pill change
  useEffect(() => {
    const programParam = searchParams?.get('program');
    const songParam = searchParams?.get('song');

    if (programParam && programParam !== selectedProgramId) {
      setSelectedProgramId(programParam as ProgramId);
    }

    if (songParam && songParam !== searchQuery) {
      setSearchQuery(songParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedProgramId === 'playlists' && user?.uid) {
      loadPlaylists(user.uid);
    }
  }, [selectedProgramId, user?.uid, loadPlaylists]);

  useEffect(() => {
    if (selectedProgramId !== 'playlists' || isPlaylistView) {
      loadSongs();
    }
  }, [selectedProgramId, metadataTimestamp, praiseNightPages.length, isPlaylistView, activePlaylist?.id, loadSongs]);

  const loadMoreSongs = useCallback(async () => {
    if (isLoadingMore || !hasMore || !!searchQuery || selectedProgramId !== 'all') return;
    setIsLoadingMore(true);

    try {
      await loadLibraryData(currentZone?.id || '', ITEMS_PER_PAGE, false, '', lastVisibleDoc);
    } catch (err) {
      console.error('[LibraryView] Error loading more:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, searchQuery, selectedProgramId, loadLibraryData, currentZone?.id, lastVisibleDoc, ITEMS_PER_PAGE]);

  // Setup Intersection Observer for Infinite Scroll
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '400px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
        loadMoreSongs();
      }
    }, options);

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, loadMoreSongs]);

  // Real-time Song Sync
  useEffect(() => {
    if (!currentZone?.id || !praiseNightPages.length) return;

    let pageIdToSubscribe: string | null = null;
    if (selectedProgramId === 'ongoing') {
      const ongoingPage = [...praiseNightPages]
        .filter(p => p.category === 'ongoing')
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
      if (ongoingPage) pageIdToSubscribe = ongoingPage.id;
    } else if (selectedProgramId !== 'all' && selectedProgramId !== 'playlists') {
      if (praiseNightPages.some((p: any) => p.id === selectedProgramId)) {
        pageIdToSubscribe = selectedProgramId;
      }
    }

    if (!pageIdToSubscribe) return;
    const unsubscribe = MetadataService.subscribeToPraiseNightSongsMetadata(
      currentZone.id,
      pageIdToSubscribe,
      (timestamp: any) => setMetadataTimestamp(timestamp)
    );
    return () => unsubscribe();
  }, [currentZone?.id, selectedProgramId, praiseNightPages]);

  const openDeletePlaylistConfirm = () => {
    if (!activePlaylist) return;
    setDeleteType('playlist');
    setItemToDelete({ id: activePlaylist.id, title: activePlaylist.title });
    setShowDeleteModal(true);
  };

  const openDeleteSongConfirm = (song: Song) => {
    if (!activePlaylist) return;
    setDeleteType('song');
    setItemToDelete({ id: song.id, title: song.title, playlistId: activePlaylist.id });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    if (deleteType === 'playlist') {
      const success = await deleteUserPlaylist(itemToDelete.id);
      if (success) {
        setView('home');
      }
    } else if (deleteType === 'song' && itemToDelete.playlistId) {
      await removeSongFromUserPlaylist(itemToDelete.playlistId, itemToDelete.id);
    }

    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleCreatePlaylist = useCallback(() => {
    if (!user?.uid) {
      alert('Please log in to create a playlist.');
      return;
    }
    setIsCreateModalOpen(true);
  }, [user?.uid]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !lastVisibleDoc || (selectedProgramId as string) !== 'all' || searchQuery || selectedProgramId === 'playlists') return;

    setIsLoadingMore(true);
    try {
      const { songs: audioLabSongs, lastDoc } = await getSongsPaginated(lastVisibleDoc, ITEMS_PER_PAGE);
      const legacySongs = audioLabSongs.map(toLegacySong);

      if (legacySongs.length > 0) {
        setSongs(prev => [...prev, ...legacySongs]);
        setLastVisibleDoc(lastDoc);
        setHasMore(legacySongs.length >= ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('[LibraryView] Error loading more songs:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading && selectedProgramId === 'all' && !searchQuery) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, selectedProgramId, searchQuery, handleLoadMore]);

  // Deep Search fallback
  useEffect(() => {
    const handler = setTimeout(async () => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery.length >= 3) {
        const localMatches = songs.filter(s =>
          s.title.toLowerCase().includes(trimmedQuery.toLowerCase())
        );
        if (localMatches.length < 2 && selectedProgramId !== 'playlists') {
          setIsSearching(true);
          try {
            const results = await searchSongsDeep(trimmedQuery, currentZone?.id || undefined);
            if (results.length > 0) {
              setSongs(results.map(toLegacySong));
              setTotalCount(results.length);
              setHasMore(false);
            }
          } catch (error) {
            console.error('[LibraryView] Deep search failed:', error);
          } finally {
            setIsSearching(false);
          }
        }
      } else if (trimmedQuery.length === 0 && !isLoading && !isSearching && selectedProgramId !== 'playlists') {
        if (handledSongParamRef.current || (songs.length !== state.libraryData.songs.length && selectedProgramId === 'all')) {
          loadSongs();
          handledSongParamRef.current = null;
        }
      }
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedProgramId, songs, currentZone?.id, isLoading, isSearching, state.libraryData.songs.length, loadSongs]);

  // Intelligent Local Filtering
  const filteredSongs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return songs;
    return songs.filter(song =>
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query)
    );
  }, [songs, searchQuery]);

  // Filtered Playlists for search
  const filteredPlaylists = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query || selectedProgramId !== 'playlists') return playlists;
    return playlists.filter(playlist =>
      playlist.title.toLowerCase().includes(query) ||
      (playlist.description && playlist.description.toLowerCase().includes(query))
    );
  }, [playlists, searchQuery, selectedProgramId]);

  const handleOpenDetail = useCallback((song: Song) => {
    setSelectedDetailSong(song);
    setIsDetailModalOpen(true);
  }, []);

  // Auto-play Next Song
  useEffect(() => {
    const handleAudioEnded = (e: any) => {
      const endedSong = e.detail?.song;
      if (!endedSong) return;
      const baseEndedSongId = endedSong.id?.split('-')[0] || endedSong.id;
      const currentIndex = filteredSongs.findIndex(s => s.id === baseEndedSongId);
      if (currentIndex === -1) return;
      let nextIndex = currentIndex + 1;
      while (nextIndex < filteredSongs.length) {
        const nextSong = filteredSongs[nextIndex];
        const hasAudio = (nextSong as any).audioUrl || nextSong.audioUrls?.full || (nextSong as any).audioFile;
        if (hasAudio) {
          const audioUrl = (nextSong as any).audioUrl || nextSong.audioUrls?.full || (nextSong as any).audioFile;
          const audioSong = { id: `${nextSong.id}-full`, title: `${nextSong.title} (full)`, audioFile: audioUrl, writer: nextSong.artist };
          setCurrentSong(audioSong as any, true);
          if (isDetailModalOpen) setSelectedDetailSong(nextSong);
          setTimeout(() => {
            const element = document.getElementById(`song-${nextSong.id}`);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
          return;
        }
        nextIndex++;
      }
    };
    window.addEventListener('audioEnded', handleAudioEnded);
    return () => window.removeEventListener('audioEnded', handleAudioEnded);
  }, [filteredSongs, setCurrentSong, isDetailModalOpen]);

  // Deep linking to song
  useEffect(() => {
    const songParam = searchParams?.get('song');
    if (!songParam || isLoading || songs.length === 0 || selectedProgramId === 'playlists') return;
    if (handledSongParamRef.current === songParam) return;
    const decodedSong = decodeURIComponent(songParam);
    const matchedSong = songs.find(s => s.id === decodedSong || s.title.toLowerCase() === decodedSong.toLowerCase() || s.title.toLowerCase().includes(decodedSong.toLowerCase()));
    if (matchedSong) {
      handleOpenDetail(matchedSong);
      setHighlightedSongId(matchedSong.id);
      handledSongParamRef.current = songParam;
      setTimeout(() => {
        const element = document.getElementById(`song-${matchedSong.id}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 600);
      setTimeout(() => setHighlightedSongId(null), 5000);
    }
  }, [searchParams, isLoading, songs, handleOpenDetail, selectedProgramId]);

  return (
    <div className="flex flex-col pb-24">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent pointer-events-none z-0" />
      
      <main className="relative z-10 flex flex-col gap-4 sm:gap-6 px-3 sm:px-4 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => {
              if (isPlaylistView) {
                setView('library');
                setSelectedProgramId('playlists');
              } else {
                setView('home');
              }
            }}
            className="text-white/70 hover:text-white flex items-center justify-center p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
          >
            <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
            <div className="flex flex-col gap-0.5 sm:gap-1 flex-1">
            <h1 className="text-white text-xl sm:text-[28px] font-bold leading-tight tracking-tight truncate">
              {isPlaylistView && activePlaylist ? activePlaylist.title : 'Library'}
            </h1>
            <p className="text-slate-400 text-[10px] sm:text-sm">
              {isPlaylistView && activePlaylist
                ? activePlaylist.description || 'Your custom music set'
                : 'Tap a song to access vocal parts'}
            </p>
          </div>
          {isPlaylistView && (
            <button
              onClick={openDeletePlaylistConfirm}
              className="text-red-400/70 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              Delete
            </button>
          )}
        </div>

        {/* Navigation Pills */}
        {!isPlaylistView && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            <button
              onClick={() => setSelectedProgramId('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedProgramId === 'all' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/10' : 'bg-white/5 text-slate-200 border border-white/5 hover:bg-white/10'}`}
            >
              All Songs
            </button>
            <button
              onClick={() => setSelectedProgramId('ongoing')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${selectedProgramId === 'ongoing' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 'bg-white/5 text-slate-300 border border-white/5 hover:bg-white/10'}`}
            >
              Ongoing
            </button>
            <button
              onClick={() => setSelectedProgramId('playlists')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${selectedProgramId === 'playlists' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20 shadow-lg shadow-violet-500/10' : 'bg-white/5 text-slate-300 border border-white/5 hover:bg-white/10'}`}
            >
              <ListMusic size={14} />
              My Playlists
            </button>
          </div>
        )}

        {isPlaylistView && activePlaylist && (
          <div className="flex items-center gap-4 px-1 py-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles size={12} className="text-violet-400" />
              <span>{activePlaylist.songIds.length} {activePlaylist.songIds.length === 1 ? 'Song' : 'Songs'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <RefreshCw size={12} className="text-violet-400" />
              <span>Personal Collection</span>
            </div>
          </div>
        )}

        {/* Dynamic Search / Header Section */}
        {selectedProgramId !== 'playlists' ? (
          <div className="pt-1 pb-2 sticky top-0 z-10 bg-[#191022]">
            <div className="flex flex-col gap-3">
              <label className="flex w-full items-center gap-2 rounded-xl bg-[#261933] px-3 sm:px-4 py-3 shadow-sm border border-white/5 focus-within:ring-2 focus-within:ring-violet-500/50 transition-all">
                <Search size={18} className={isSearching ? "text-violet-400 animate-pulse" : "text-slate-500"} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none p-0 text-sm sm:text-base text-white placeholder:text-slate-400 focus:ring-0 focus:outline-none"
                  placeholder="Search entire library..."
                  autoComplete="off"
                />
                {isSearching && <RefreshCw size={16} className="text-violet-400 animate-spin" />}
              </label>
              <div className="flex items-center justify-between px-1">
                <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">
                  Showing {filteredSongs.length} of {totalCount} {totalCount === 1 ? 'Song' : 'Songs'}
                </p>
                {isSearching && (
                  <div className="flex items-center gap-2">
                    <RefreshCw size={12} className="text-violet-400 animate-spin" />
                    <span className="text-violet-400 text-[10px] font-medium">Searching Cloud...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Simplified Playlist Header (No Search, No Refresh Icon) */
          !isPlaylistView && (
            <div className="flex items-center justify-between px-1 mt-2 mb-2">
              <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Your Collections</h2>
              <button
                onClick={handleCreatePlaylist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/10 text-violet-400 text-[11px] font-bold hover:bg-violet-600/20 transition-all active:scale-95 border border-violet-500/10"
              >
                <Plus size={12} />
                <span>New Set</span>
              </button>
            </div>
          )
        )}

        {/* Playlists View Content */}
        {selectedProgramId === 'playlists' && !isPlaylistView && (
          <div className="flex-1 overflow-y-auto space-y-2 pt-2 pb-24">
            {filteredPlaylists.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filteredPlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => {
                        setSongs([]); // Clear songs immediately when clicking a playlist
                        openPlaylist(playlist);
                    }}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl bg-[#261933]/40 border border-white/5 hover:border-violet-500/20 transition-all group text-left"
                  >
                    <div className="size-11 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                      <ListMusic size={18} className="text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[15px] font-semibold truncate group-hover:text-violet-300 transition-colors">
                        {playlist.title}
                      </p>
                      <p className="text-slate-200 text-xs font-semibold mt-0.5">
                        {playlist.songIds.length} {playlist.songIds.length === 1 ? 'Song' : 'Songs'}
                      </p>
                    </div>
                    <ChevronDown size={16} className="text-slate-300 -rotate-90 group-hover:text-violet-400 transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                <ListMusic size={48} className="text-slate-400" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  {searchQuery ? 'No playlists match your search' : 'Your playlists will appear here'}
                </p>
              </div>
            )}
          </div>
        )}

        {(selectedProgramId !== 'playlists' || isPlaylistView) && (
          <div className="flex-1 space-y-3 pb-24 overflow-y-auto">
            {(isLoading || state.isLoading) && songs.length === 0 ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-[#261933] rounded-xl border border-white/5 p-3 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/10 rounded-full w-3/4" />
                      <div className="h-2 bg-white/5 rounded-full w-1/2" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredSongs.map((song, index) => {
                  const isThisSongPlaying = (currentSong?.id?.startsWith(song.id) && isPlaying) || false;
                  const songNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  return (
                    <div key={song.id} id={`song-${song.id}`}>
                      <SimpleSongCard
                        song={song}
                        songNumber={songNumber}
                        isPlaying={isThisSongPlaying}
                        isLoading={isThisSongPlaying && isAudioLoading}
                        currentPart={isThisSongPlaying ? (currentSong?.id?.split('-')[1] as VocalPart || 'full') : null}
                        currentTime={isThisSongPlaying ? currentTime : 0}
                        duration={isThisSongPlaying ? duration : (song.duration || 0)}
                        onClick={() => handleOpenDetail(song)}
                        onRemove={isPlaylistView ? async () => {
                          openDeleteSongConfirm(song);
                        } : undefined}
                        onAdd={!isPlaylistView ? () => {
                          setSongToAddToPlaylist(song);
                          setIsAddToPlaylistOpen(true);
                        } : undefined}
                        isHighlighted={highlightedSongId === song.id}
                        searchTerm={searchQuery}
                      />
                    </div>
                  );
                })}
                {!searchQuery && hasMore && selectedProgramId === 'all' && (
                  <div className="py-12 flex flex-col items-center justify-center min-h-[100px]">
                    {isLoadingMore ? (
                      <div className="flex flex-col items-center gap-3">
                        <CustomLoader size="md" />
                        <p className="text-violet-400 text-sm font-bold animate-pulse">Loading next batch...</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleLoadMore}
                        className="group relative flex items-center gap-3 px-8 py-4 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-2xl transition-all active:scale-95 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <RefreshCw size={20} className="text-violet-400 group-hover:rotate-180 transition-transform duration-500" />
                        <span className="text-white font-bold tracking-wide">Load More Songs</span>
                      </button>
                    )}
                  </div>
                )}
                {songs.length === 0 && !isLoading && (
                  <div className="py-20 text-center flex flex-col items-center gap-3">
                    <Music size={48} className="text-slate-700" />
                    <p className="text-slate-500">No songs found in the cloud.</p>
                  </div>
                )}
                <div ref={observerTarget} className="h-10 w-full" />
              </div>
            )}
          </div>
        )}
      </main>

      {selectedDetailSong && (
        <AudioLabSongDetailModal
          song={selectedDetailSong}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            // Clear the song parameter from the URL to prevent reopening
            if (searchParams?.has('song')) {
              handledSongParamRef.current = null; // Reset the ref so it can trigger again later if needed
              const params = new URLSearchParams(searchParams.toString());
              params.delete('song');
              router.replace(`/pages/audiolab?${params.toString()}`);
            }
          }}
        />
      )}

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(playlistId) => {
          const newPlaylist = state.playlists.find(p => p.id === playlistId);
          if (newPlaylist) openPlaylist(newPlaylist);
        }}
      />

      {songToAddToPlaylist && (
        <AddToPlaylistModal
          song={songToAddToPlaylist}
          isOpen={isAddToPlaylistOpen}
          onClose={() => {
            setIsAddToPlaylistOpen(false);
            setSongToAddToPlaylist(null);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        title={deleteType === 'playlist' ? 'Delete Playlist' : 'Remove Song'}
        message={
          deleteType === 'playlist' 
            ? `Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`
            : `Are you sure you want to remove "${itemToDelete?.title}" from this playlist?`
        }
        confirmLabel={deleteType === 'playlist' ? 'Delete' : 'Remove'}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        isDanger={true}
      />
    </div>
  );
}
