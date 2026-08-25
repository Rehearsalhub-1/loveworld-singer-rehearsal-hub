"use client";

const SubGroupDatabaseService = {
  getUserSubGroups: async (..._args: any[]): Promise<any[]> => [],
  subscribeToUserSubGroups: (_uid: any, cb: any) => { cb([]); return () => {}; },
  subscribeToMemberRehearsals: (_z: any, _u: any, cb: any) => { cb([]); return () => {}; }
};

import React, { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { sanitizeImageUrl } from '@/utils/image-utils';

import { ChevronRight, Music, Users, Shield, Search, X, Home, Calendar, BookOpen, Mic, CheckCircle, Clock } from "lucide-react";

import SongDetailModal from "@/components/SongDetailModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import CustomLoader from "@/components/CustomLoader";
import AudioWave from "@/components/AudioWave";
import { PraiseNightSong } from "@/types/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useZone } from '@/hooks/useZone';

import { BackendAPI } from '@/lib/api-client';
export interface SubGroupSong { [key: string]: any; id: string; title: string; lyrics?: string; category?: string; status?: 'heard' | 'unheard'; }
export interface SubGroupRehearsal { [key: string]: any; id: string; name: string; date: string; time?: string; location?: string; songIds?: string[]; }

import { useAudio } from "@/contexts/AudioContext";
import { useSubGroup } from "@/hooks/useSubGroup";

function SubGroupHubPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentZone, isInitialized } = useZone();
  const { user } = useAuth();
  
  const pageParam = searchParams?.get('page');
  const songParam = searchParams?.get('song');
  
  const { currentSong, isPlaying, setCurrentSong } = useAudio();
  const { isSubGroupCoordinator } = useSubGroup();

  const [rehearsals, setRehearsals] = useState<SubGroupRehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPraiseNight, setCurrentPraiseNight] = useState<SubGroupRehearsal | null>(null);
  const [songs, setSongs] = useState<SubGroupSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'heard' | 'unheard'>('heard');
  
  const [isSongDetailOpen, setIsSongDetailOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SubGroupSong | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const zoneColor = currentZone?.themeColor || '#9333EA';

  // 1. REAL-TIME REHEARSAL LISTENER
  useEffect(() => {
    if (!isInitialized || !currentZone?.id || !user?.id) return;

    setLoading(true);
    const unsubscribe = SubGroupDatabaseService.subscribeToMemberRehearsals(
      currentZone.id, 
      user.id, 
      (data: any) => {
        // Filter out HQ/Zone rehearsals, ONLY show Subgroup rehearsals on the Subgroup Hub
        const onlySubgroups = data.filter((r: any) => r.scope === 'subgroup' || r.subGroupId);
        setRehearsals(onlySubgroups);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isInitialized, currentZone?.id, user?.id]);

  // 2. SET CURRENT REHEARSAL
  useEffect(() => {
    if (rehearsals.length > 0) {
      if (pageParam) {
        const found = rehearsals.find(r => r.id === pageParam);
        if (found) setCurrentPraiseNight(found);
      } else if (!currentPraiseNight) {
        // PRIORITIZE ONGOING SESSIONS
        const ongoing = rehearsals.find(r => r.category === 'ongoing');
        setCurrentPraiseNight(ongoing || rehearsals[0]);
      }
    }
  }, [rehearsals, pageParam]);

  // 3. FETCH SONGS
  useEffect(() => {
    const fetchSongs = async () => {
      if (!currentPraiseNight?.id) return;
      setSongsLoading(true);
      try {
        const data = await BackendAPI.generic.list('subgroup_songs', 100).then(r => r.data || []);
        setSongs(data.map((s: any) => ({
          ...s,
          praiseNightId: s.id,
          history: []
        })));
      } catch (error) {
        console.error('Error fetching songs:', error);
      } finally {
        setSongsLoading(false);
      }
    };
    fetchSongs();
  }, [currentPraiseNight?.id]);

  // 4. SYNC URL TO STATE
  useEffect(() => {
    if (songParam && songs.length > 0) {
      const decoded = decodeURIComponent(songParam);
      const song = songs.find(s => s.title === decoded);
      if (song) {
        setSelectedSong(song as any);
        setIsSongDetailOpen(true);
      }
    } else {
      setIsSongDetailOpen(false);
      setSelectedSong(null);
    }
  }, [songParam, songs]);

  const handleSongClick = (song: any) => {
    const params = new URLSearchParams(window.location.search);
    params.set('song', song.title);
    if (currentPraiseNight?.id) params.set('page', currentPraiseNight.id);
    router.push(`?${params.toString()}`);
    
    if (song.audioFile && song.audioFile.trim() !== '') {
       setCurrentSong(song, true);
    } else {
       setCurrentSong(song, false);
    }
  };

  const handleCloseSongDetail = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('song');
    router.push(`?${params.toString()}`);
  };

  const { filteredSongs, heardCount, unheardCount } = useMemo(() => {
    let base = songs;
    if (searchQuery) {
      base = base.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.leadSinger || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    const heard = base.filter(s => s.status === 'heard');
    const unheard = base.filter(s => s.status === 'unheard');
    
    return {
      filteredSongs: activeFilter === 'heard' ? heard : unheard,
      heardCount: heard.length,
      unheardCount: unheard.length
    };
  }, [songs, searchQuery, activeFilter]);

  if (loading && rehearsals.length === 0) {
    return <CustomLoader />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col font-outfit select-none">
      <style jsx global>{`
        .breathe-animation { animation: breathe 3s ease-in-out infinite; }
        @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.98); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .pulse-ring { animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse-ring { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>

      <ScreenHeader
        title="Subgroup Hub"
        showBackButton={true}
        backPath="/pages/rehearsals"
        rightButtons={
          <div className="flex items-center gap-2">
             <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-slate-600">
               <Search className="w-5 h-5" />
             </button>
             {isSubGroupCoordinator && (
               <button onClick={() => router.push('/subgroup-admin')} className="p-2 text-purple-600">
                 <Shield className="w-5 h-5" />
               </button>
             )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24">
          
          {/* Rehearsal Switcher */}
          {rehearsals.length > 1 && (
            <div className="mb-6 flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
              {rehearsals.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set('page', r.id);
                    params.delete('song');
                    router.push(`?${params.toString()}`);
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                    currentPraiseNight?.id === r.id
                      ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  {r.category === 'ongoing' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  )}
                  {r.name}
                </button>
              ))}
            </div>
          )}

          {/* Search Box */}
          {isSearchOpen && (
            <div className="mb-6 animate-in slide-in-from-top duration-300">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border-b border-slate-200/50 bg-white leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-0 sm:text-sm transition-all rounded-xl shadow-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                    <X className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* E-card Banner - EXACT MATCH */}
          {currentPraiseNight && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-2xl shadow-black/10 breathe-animation ring-1 ring-black/5">
              <div className="relative aspect-[16/9] sm:aspect-[21/9]">
                <Image
                  src={sanitizeImageUrl(currentPraiseNight.bannerImage, 'banner')}
                  alt="Session Banner"
                  fill
                  unoptimized
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                   <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 bg-yellow-500 rounded text-[8px] font-black text-black uppercase tracking-widest leading-none">Sub-Group Hub</span>
                      {currentPraiseNight.category === 'ongoing' && (
                        <span className="px-2 py-0.5 bg-green-500 rounded text-[8px] font-black text-white uppercase tracking-widest leading-none pulse-ring">LIVE SESSION</span>
                      )}
                   </div>
                   <h1 className="text-white text-xl sm:text-2xl font-black uppercase tracking-tight leading-none mb-1">{currentPraiseNight.name}</h1>
                   <div className="flex items-center gap-4 text-white/60">
                      <div className="flex items-center gap-1.5">
                         <Calendar className="w-3.5 h-3.5" />
                         <span className="text-[10px] font-bold uppercase tracking-wide">{currentPraiseNight.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <Users className="w-3.5 h-3.5" />
                         <span className="text-[10px] font-bold uppercase tracking-wide">{currentPraiseNight.subGroupName || "Subgroup"}</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Filter Bar - EXACT MATCH FOR PRAISE NIGHT */}
          <div className="mb-6 px-1">
             <div className="flex items-center justify-between gap-3 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <button
                  onClick={() => setActiveFilter('heard')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === 'heard'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <CheckCircle className={`w-3.5 h-3.5 ${activeFilter === 'heard' ? 'text-green-600' : 'text-slate-300'}`} />
                  Heard ({heardCount})
                </button>
                <div className="w-px h-6 bg-slate-100"></div>
                <button
                  onClick={() => setActiveFilter('unheard')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === 'unheard'
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 ${activeFilter === 'unheard' ? 'text-orange-600' : 'text-slate-300'}`} />
                  Unheard ({unheardCount})
                </button>
             </div>
          </div>

          {/* Song List */}
          <div className="space-y-3">
            {songsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="border-0 rounded-2xl p-4 shadow-sm bg-white animate-pulse h-20"></div>
                ))}
              </div>
            ) : filteredSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/50 rounded-3xl border-2 border-dashed border-slate-100">
                <Music className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No {activeFilter} songs yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredSongs.map((song, index) => (
                  <button
                    key={song.id}
                    onClick={() => handleSongClick(song)}
                    className={`w-full text-left bg-white border border-slate-200/60 rounded-2xl p-4 hover:border-purple-300 hover:shadow-lg transition-all duration-300 active:scale-[0.98] group flex items-center justify-between relative overflow-hidden ${
                      song.isActive 
                        ? 'ring-4 ring-green-500 shadow-xl shadow-green-500/20 z-10' 
                        : currentSong?.id === song.id 
                          ? 'ring-2 ring-purple-500 bg-purple-50' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    {song.isActive && (
                      <div className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
                    )}
                    <div className="flex items-center gap-4 min-w-0 relative z-10">
                       <div 
                         className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm shrink-0"
                         style={{ backgroundColor: `${zoneColor}15` }}
                       >
                          {currentSong?.id === song.id && isPlaying ? (
                            <AudioWave className="w-6 h-6 text-purple-600" />
                          ) : (
                            <span className="text-sm font-black" style={{ color: zoneColor }}>{index + 1}</span>
                          )}
                       </div>
                       <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-purple-700 transition-colors truncate leading-tight mb-0.5">
                            {song.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
                            {song.leadSinger || "Subgroup Song"}
                          </p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                       </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>



      {isSongDetailOpen && selectedSong && (
        <SongDetailModal
          isOpen={isSongDetailOpen}
          onClose={handleCloseSongDetail}
          selectedSong={selectedSong as any}
          songs={songs as any}
          isSubGroup={true}
          onSongChange={(newSong) => {
            const params = new URLSearchParams(window.location.search);
            params.set('song', newSong.title);
            router.replace(`?${params.toString()}`);
            setSelectedSong(newSong as any);
          }}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<CustomLoader />}>
      <SubGroupHubPageContent />
    </Suspense>
  );
}
