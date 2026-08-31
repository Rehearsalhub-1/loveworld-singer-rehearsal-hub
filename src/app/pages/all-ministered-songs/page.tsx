"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Search, 
  Play, 
  Pause, 
  ArrowLeft, 
  Filter, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  X, 
  Volume2, 
  Music2,
  Check
} from 'lucide-react';
import SongDetailModal from '@/components/SongDetailModal';
import CustomLoader from '@/components/CustomLoader';
import { useAudio } from '@/contexts/AudioContext';
import { MasterLibraryService, MasterSong, MasterProgram } from '@/lib/master-library';
import { useAuth } from '@/hooks/useAuth';
import { PraiseNightSong } from '@/types/supabase';

export default function AllMinisteredSongsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { currentSong, isPlaying, setCurrentSong, play, pause } = useAudio();

  const [songs, setSongs] = useState<MasterSong[]>([]);
  const [programs, setPrograms] = useState<MasterProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSongs, setTotalSongs] = useState(0);
  const pageSize = 50;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Filters
  const [selectedLeadSinger, setSelectedLeadSinger] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [isSingerDropdownOpen, setIsSingerDropdownOpen] = useState(false);
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [programSearchQuery, setProgramSearchQuery] = useState('');

  // Feature Toggles from profile
  const hiddenFeatures = (profile as any)?.hidden_features || (profile as any)?.hiddenFeatures || {};
  const shouldHideHistory = !!hiddenFeatures.hideHistory || !!hiddenFeatures.hideMinisteredHistory;

  // Song Detail Modal State
  const [selectedSong, setSelectedSong] = useState<PraiseNightSong | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadMasterData = useCallback(async (page: number, search: string) => {
    try {
      setLoading(true);
      const [res, progs] = await Promise.all([
        MasterLibraryService.getMasterSongs(page, pageSize, search),
        MasterLibraryService.getPrograms(),
      ]);
      const songsList = Array.isArray(res) ? res : (res?.songs || []);
      setSongs(songsList);
      if (res && typeof res.totalPages === 'number') setTotalPages(res.totalPages);
      if (res && typeof res.total === 'number') setTotalSongs(res.total);
      if (progs && progs.length > 0) setPrograms(progs);
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMasterData(currentPage, searchTerm);
  }, [currentPage, searchTerm, loadMasterData]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter out hidden drafts and optionally history
  const visibleSongs = useMemo(() => {
    return songs.filter(song => {
      const isHiddenDraft = !!song.isHQOnly || !!song.isHqOnly || song.status === 'hidden';
      if (isHiddenDraft) return false;

      if (shouldHideHistory) {
        const isHistory = !!song.isHistory || !!song.is_history || song.status === 'history' || song.status === 'archived';
        if (isHistory) return false;
      }
      return true;
    });
  }, [songs, shouldHideHistory]);

  // Extract unique lead singers from visible songs
  const leadSingers = useMemo(() => {
    const set = new Set<string>();
    visibleSongs.forEach(s => {
      if (s.leadSinger && typeof s.leadSinger === 'string' && s.leadSinger.trim()) {
        set.add(s.leadSinger.trim());
      }
    });
    return Array.from(set).sort();
  }, [visibleSongs]);

  // Filtered Programs for dropdown
  const filteredProgramsList = useMemo(() => {
    if (!programSearchQuery.trim()) return programs;
    const q = programSearchQuery.toLowerCase().trim();
    return programs.filter(p => (p.name || '').toLowerCase().includes(q));
  }, [programs, programSearchQuery]);

  // Filtered Songs
  const filteredSongs = useMemo(() => {
    let result = visibleSongs;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.writer || '').toLowerCase().includes(q) ||
        (s.leadSinger || '').toLowerCase().includes(q) ||
        (s.lyrics || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q)
      );
    }

    if (selectedLeadSinger !== 'all') {
      result = result.filter(s => 
        (s.leadSinger || '').trim().toLowerCase() === selectedLeadSinger.trim().toLowerCase()
      );
    }

    if (selectedProgram !== 'all') {
      const prog = programs.find(p => p.id === selectedProgram || p.name === selectedProgram);
      result = result.filter(s => {
        const inSongIds = prog?.songIds?.includes(s.id);
        const inPraiseNightId = (s as any)?.praiseNightId === selectedProgram || (s as any)?.programId === selectedProgram || (prog && ((s as any)?.praiseNightId === prog.id || (s as any)?.programId === prog.id));
        const inCategory = (prog && s.category === prog.name) || s.category === selectedProgram ||
          (Array.isArray(s.categories) && (s.categories.includes(selectedProgram) || (prog && s.categories.includes(prog.name))));
        return inSongIds || inPraiseNightId || inCategory;
      });
    }

    return result;
  }, [visibleSongs, programs, searchTerm, selectedLeadSinger, selectedProgram]);

  const handleOpenSong = (song: MasterSong) => {
    const audioSrc = song.audioFile || (song.audioUrls ? Object.values(song.audioUrls)[0] : undefined);
    const praiseSong: PraiseNightSong = {
      id: song.id,
      title: song.title,
      lyrics: song.lyrics || '',
      category: song.category || 'Ministered Song',
      writer: song.writer,
      lead_singer: song.leadSinger,
      key: song.key,
      tempo: song.tempo,
      solfa: song.solfa,
      audio_file: audioSrc,
      audioFile: audioSrc,
      audio_urls: song.audioUrls,
      audioUrls: song.audioUrls,
      custom_parts: song.customParts,
      created_at: song.publishedAt || new Date().toISOString(),
    } as any;

    setSelectedSong(praiseSong);
    setIsDetailOpen(true);
  };

  const handlePlaySong = (e: React.MouseEvent, song: MasterSong) => {
    e.stopPropagation();
    const isThisPlaying = currentSong?.id === song.id && isPlaying;
    
    if (isThisPlaying) {
      pause();
      return;
    }

    const audioSrc = song.audioFile || (song.audioUrls ? Object.values(song.audioUrls)[0] : undefined);
    const praiseSong: PraiseNightSong = {
      id: song.id,
      title: song.title,
      lyrics: song.lyrics || '',
      category: song.category || 'Ministered Song',
      audio_file: audioSrc,
      audioFile: audioSrc,
      audio_urls: song.audioUrls,
      audioUrls: song.audioUrls,
    } as any;

    setCurrentSong(praiseSong, true);
    play();
  };

  return (
    <div
      className="fixed inset-0 h-screen w-screen flex flex-col overflow-hidden bg-white text-slate-900 font-sans selection:bg-purple-600 selection:text-white"
      style={{ height: '100dvh' }}
    >
      
      {/* ── TOP HEADER BAR ── */}
      <header className="flex-shrink-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => router.push('/pages/rehearsals')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          All Ministered Songs
        </h1>

        <div className="w-10 h-10 flex items-center justify-end">
          <div className="w-6 h-6 relative">
            <Image
              src="/logo.png"
              alt="Loveworld Singers Logo"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
        </div>
      </header>

      {/* ── SCROLLABLE BODY CONTAINER ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-28">
        
        {/* Total Count */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {totalSongs > 0 ? `${totalSongs} songs` : songs.length > 0 ? `${filteredSongs.length} songs` : 'All Songs'}
          </h2>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by title, writer, or lead singer..."
            className="w-full pl-11 pr-10 py-3 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none transition-all placeholder:text-slate-400 shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Row (Filter button + Lead Singer + Programs) */}
        <div className="flex items-center gap-2.5 relative">
          
          {/* Quick Clear Filter Button */}
          <button
            onClick={() => {
              setSelectedLeadSinger('all');
              setSelectedProgram('all');
              setSearchTerm('');
            }}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
              selectedLeadSinger !== 'all' || selectedProgram !== 'all' || searchTerm
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
            }`}
            title="Reset Filters"
          >
            <Filter className="w-4 h-4" />
          </button>

          {/* Lead Singer Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsSingerDropdownOpen(!isSingerDropdownOpen);
                setIsProgramDropdownOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all ${
                selectedLeadSinger !== 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200/80'
              }`}
            >
              <span className="truncate max-w-[130px]">
                {selectedLeadSinger !== 'all' ? selectedLeadSinger : 'Lead Singer'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>

            {isSingerDropdownOpen && (
              <div className="absolute top-12 left-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 max-h-64 overflow-y-auto no-scrollbar">
                <button
                  onClick={() => { setSelectedLeadSinger('all'); setIsSingerDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                    selectedLeadSinger === 'all' ? 'text-purple-600 font-bold bg-purple-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>All Lead Singers</span>
                  {selectedLeadSinger === 'all' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </button>
                {leadSingers.map(singer => (
                  <button
                    key={singer}
                    onClick={() => { setSelectedLeadSinger(singer); setIsSingerDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                      selectedLeadSinger === singer ? 'text-purple-600 font-bold bg-purple-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{singer}</span>
                    {selectedLeadSinger === singer && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Collections / Programs Dropdown */}
          <div className="relative ml-auto">
            <button
              onClick={() => {
                setIsProgramDropdownOpen(!isProgramDropdownOpen);
                setIsSingerDropdownOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all ${
                selectedProgram !== 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200/80'
              }`}
            >
              <Music2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate max-w-[130px]">
                {selectedProgram !== 'all'
                  ? (programs.find(p => p.id === selectedProgram || p.name === selectedProgram)?.name || selectedProgram)
                  : 'Collections'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>

            {isProgramDropdownOpen && (
              <div className="absolute top-12 right-0 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 max-h-72 flex flex-col">
                {/* Search collections bar */}
                {programs.length > 8 && (
                  <div className="px-3 pb-2 border-b border-slate-100">
                    <input
                      type="text"
                      placeholder="Search collections..."
                      value={programSearchQuery}
                      onChange={(e) => setProgramSearchQuery(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                )}

                <div className="overflow-y-auto max-h-60 no-scrollbar py-1">
                  <button
                    onClick={() => { setSelectedProgram('all'); setIsProgramDropdownOpen(false); setProgramSearchQuery(''); }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                      selectedProgram === 'all' ? 'text-purple-600 font-bold bg-purple-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>All Collections & Programs</span>
                    {selectedProgram === 'all' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </button>
                  {filteredProgramsList.map(prog => (
                    <button
                      key={prog.id}
                      onClick={() => { setSelectedProgram(prog.id); setIsProgramDropdownOpen(false); setProgramSearchQuery(''); }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 ${
                        selectedProgram === prog.id ? 'text-purple-600 font-bold bg-purple-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{prog.name}</span>
                      {selectedProgram === prog.id && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── SONGS LIST ── */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <CustomLoader />
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-12 text-center space-y-3 border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
              <Music2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Ministered Songs Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              No songs matched your current search or filters.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSongs.map((song, idx) => {
              const isCurrentPlaying = currentSong?.id === song.id && isPlaying;
              const hasAudio = Boolean(song.audioFile || (song.audioUrls && Object.keys(song.audioUrls).length > 0));

              // Format subtitle line: e.g. "EVANG • E-FLAT" or "OSAS AND DAVEROCK"
              const singerOrWriter = (song.leadSinger || song.writer || 'LOVEWORLD SINGERS').toUpperCase();
              const keyPart = song.key ? ` • ${song.key.toUpperCase()}` : '';
              const subtitle = `${singerOrWriter}${keyPart}`;

              return (
                <div
                  key={song.id || idx}
                  onClick={() => handleOpenSong(song)}
                  className="group bg-white rounded-3xl p-3.5 border border-slate-100/90 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                >
                  {/* Left Number Box (Purple 1, 2, 3, etc.) */}
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
                    {(currentPage - 1) * pageSize + idx + 1}
                  </div>

                  {/* Center Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate group-hover:text-purple-600 transition-colors">
                      {song.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold tracking-wider truncate mt-0.5">
                      {subtitle}
                    </p>
                  </div>

                  {/* Right Play Button */}
                  <button
                    onClick={(e) => hasAudio && handlePlaySong(e, song)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isCurrentPlaying
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20 animate-pulse'
                        : hasAudio
                        ? 'bg-slate-50 hover:bg-purple-50 text-slate-400 hover:text-purple-600'
                        : 'bg-slate-50 text-slate-300 opacity-60'
                    }`}
                    title={hasAudio ? (isCurrentPlaying ? 'Pause' : 'Play Song') : 'No Audio File'}
                  >
                    {isCurrentPlaying ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        {!loading && totalPages > 1 && (
          <div className="pt-4 pb-4 flex items-center justify-between gap-3 border-t border-slate-100 mt-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="text-center">
              <span className="text-xs font-black text-slate-800 tracking-tight">
                Page {currentPage} of {totalPages}
              </span>
              {totalSongs > 0 && (
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {totalSongs} total songs
                </p>
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-30 disabled:pointer-events-none rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Song Detail & Stems Audio Player Modal */}
      {selectedSong && (
        <SongDetailModal
          selectedSong={selectedSong}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          songs={filteredSongs as any}
        />
      )}
    </div>
  );
}
