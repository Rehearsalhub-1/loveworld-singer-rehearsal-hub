"use client";

import { MasterLibraryService, useMasterLibrary, MasterSong, MasterProgram } from '@/lib/master-library';

import { useState, useEffect } from 'react';
import { X, Music, Play, Pause, Key, Clock, Mic, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BackendAPI } from '@/lib/api-client';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';
import { useAudio } from '@/contexts/AudioContext';
import CustomLoader from '@/components/CustomLoader';

interface MasterSongDetailSheetProps {
  song: MasterSong;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  onSongUpdated?: (updatedSong: MasterSong) => void;
  songs?: MasterSong[];
  onSongChange?: (song: MasterSong) => void;
}

// Helper function to convert HTML back to plain text for display (matching edit modal format)
const formatLyricsForDisplay = (html: string): string => {
  if (!html) return '';

  // Convert HTML back to plain text format like the edit modal shows
  let text = html
    // Convert <div>...</div> to content followed by double newlines for proper paragraph/stanza spacing
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n\n')
    // Convert <br> to single newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Keep bold tags for display
    .replace(/<b>/gi, '<b>')
    .replace(/<\/b>/gi, '</b>')
    .replace(/<strong>/gi, '<b>')
    .replace(/<\/strong>/gi, '</b>')
    // Remove any other HTML tags but keep content
    .replace(/<(?!b>|\/b>)[^>]*>/g, '')
    // Convert HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    // Clean up excessive newlines (max 2 for paragraph breaks)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
};

export function MasterSongDetailSheet({
  song,
  isOpen,
  onClose,
  songs,
  onSongChange,
}: MasterSongDetailSheetProps) {
  const router = useRouter();
  const { currentZone } = useZone();
  const { currentSong, isPlaying, currentTime, duration, setCurrentSong, togglePlayPause, setCurrentTime: seekTo } = useAudio();
  const [currentSongData, setCurrentSongData] = useState<MasterSong>(song);
  
  useEffect(() => {
    setCurrentSongData(song);
  }, [song]);

  const isHQ = currentZone ? isHQGroup(currentZone.id) : true;
  const [activeTab, setActiveTab] = useState<'lyrics' | 'solfas' | 'history'>('lyrics');
  const [isNavigating, setIsNavigating] = useState(false);

  // Only use Full Mix audio in the detail sheet - other parts are for AudioLab


  const handlePlayPause = () => {
    if (!fullMixUrl) return;

    if (isCurrentSong) {
      togglePlayPause();
    } else {
      const audioSong = {
        id: song.id,
        title: song.title,
        audioFile: fullMixUrl,
        writer: song.writer,
        leadSinger: song.leadSinger,
      };
      setCurrentSong(audioSong as any, true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const goToAudioLab = () => {
    setIsNavigating(true);
    // Navigate to AudioLab library with song title to auto-search
    router.push(`/pages/audiolab?view=library&program=ongoing&song=${encodeURIComponent(currentSongData.title)}`);
    onClose();
  };

  const handleNext = () => {
    if (!songs || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSongData.id);
    if (currentIndex !== -1 && currentIndex < songs.length - 1) {
      const nextSong = songs[currentIndex + 1];
      setCurrentSongData(nextSong);
      if (onSongChange) onSongChange(nextSong);
    }
  };

  const handlePrevious = () => {
    if (!songs || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSongData.id);
    if (currentIndex > 0) {
      const prevSong = songs[currentIndex - 1];
      setCurrentSongData(prevSong);
      if (onSongChange) onSongChange(prevSong);
    }
  };

  if (!isOpen) return null;

  const isCurrentSong = currentSong?.id === currentSongData.id;
  const fullMixUrl = currentSongData.audioUrls?.full || currentSongData.audioFile;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[200] animate-fadeIn"
        onClick={onClose}
      />

      {/* Sheet - Full screen on all screen sizes as requested */}
      <div className="fixed inset-0 z-[200] bg-white shadow-2xl animate-slide-up flex flex-col safe-area-inset-bottom overflow-hidden">
        {/* Close Button - Sticky/Fixed at top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[210] w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-black/10 backdrop-blur-md text-slate-800 hover:bg-black/20 shadow-sm transition-colors flex items-center justify-center"
        >
          <X size={20} className="sm:w-4 sm:h-4" />
        </button>

        {/* Scrollable Container - The whole modal now scrolls */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Handle - Only show on larger screens */}
          <div className="hidden sm:flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-4 sm:px-5 pt-3 sm:pt-0 pb-4 border-b border-gray-100 relative">

          <div className="relative overflow-hidden rounded-2xl">
            {/* Background image + soft overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('/images/DSC_6155_scaled.jpg')`,
                filter: 'blur(8px)',
                transform: 'scale(1.1)',
              }}
            />
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

            <div className="relative px-4 pt-4 pb-3">
              <div className="flex items-start gap-3 pr-10">
                <div className="w-12 h-12 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Music className="w-6 h-6 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-base font-semibold text-slate-900 line-clamp-2">
                    {currentSongData.title}
                  </h3>
                  <p className="text-sm sm:text-xs text-slate-600 truncate mt-0.5">
                    {currentSongData.writer || 'Unknown writer'}
                  </p>
                </div>
              </div>

              {/* Metadata rows */}
              <div className="mt-4 sm:mt-3 space-y-2 sm:space-y-1.5 text-sm sm:text-xs text-slate-700">
                {currentSongData.leadSinger && (
                  <div className="flex justify-between border-b border-white/60 pb-1.5 sm:pb-1">
                    <span className="font-semibold uppercase tracking-wide text-[11px] sm:text-[10px] text-slate-600">
                      Lead Singer
                    </span>
                    <span className="font-medium text-slate-900">
                      {currentSongData.leadSinger}
                    </span>
                  </div>
                )}
                {currentSongData.writer && (
                  <div className="flex justify-between border-b border-white/60 pb-1.5 sm:pb-1">
                    <span className="font-semibold uppercase tracking-wide text-[11px] sm:text-[10px] text-slate-600">
                      Writer
                    </span>
                    <span className="text-slate-900">
                      {currentSongData.writer}
                    </span>
                  </div>
                )}
                {currentSongData.category && (
                  <div className="flex justify-between border-b border-white/60 pb-1.5 sm:pb-1">
                    <span className="font-semibold uppercase tracking-wide text-[11px] sm:text-[10px] text-slate-600">
                      Category
                    </span>
                    <span className="text-slate-900">
                      {currentSongData.category}
                    </span>
                  </div>
                )}
                {(currentSongData.key || currentSongData.tempo) && (
                  <div className="flex justify-between border-b border-white/60 pb-1.5 sm:pb-1">
                    <span className="font-semibold uppercase tracking-wide text-[11px] sm:text-[10px] text-slate-600">
                      Key / Tempo
                    </span>
                    <span className="flex items-center gap-2 text-slate-900">
                      {currentSongData.key && (
                        <span className="inline-flex items-center gap-1">
                          <Key size={14} className="sm:w-3 sm:h-3 text-violet-500" />
                          {currentSongData.key}
                        </span>
                      )}
                      {currentSongData.tempo && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} className="sm:w-3 sm:h-3 text-violet-500" />
                          {currentSongData.tempo}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {currentSongData.conductor && (
                  <div className="flex justify-between border-b border-white/60 pb-1.5 sm:pb-1">
                    <span className="font-semibold uppercase tracking-wide text-[11px] sm:text-[10px] text-slate-600">
                      Conductor
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-900 italic">
                      <Mic size={14} className="sm:w-3 sm:h-3 text-violet-500" />
                      {currentSongData.conductor}
                    </span>
                  </div>
                )}
                {currentSongData.leadKeyboardist && (
                  <div className="flex justify-between border-b border-white/60 pb-1.5 sm:pb-1">
                    <span className="font-semibold uppercase tracking-wide text-[11px] sm:text-[10px] text-slate-600">
                      Lead Keyboard
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <Music size={14} className="sm:w-3 sm:h-3 text-violet-500" />
                      {currentSongData.leadKeyboardist}
                    </span>
                  </div>
                )}
                {currentSongData.bassGuitarist && (
                  <div className="flex justify-between border-b border-white/60 pb-1.5 sm:pb-1">
                    <span className="font-semibold uppercase tracking-wide text-[11px] sm:text-[10px] text-slate-600">
                      Bass Guitar
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <Music size={14} className="sm:w-3 sm:h-3 text-violet-500" />
                      {currentSongData.bassGuitarist}
                    </span>
                  </div>
                )}
                {currentSongData.drummer && (
                  <div className="flex justify-between border-b border-white/60 pb-1.5 sm:pb-1">
                    <span className="font-semibold uppercase tracking-wide text-[11px] sm:text-[10px] text-slate-600">
                      Drummer
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <Music size={14} className="sm:w-3 sm:h-3 text-violet-500" />
                      {currentSongData.drummer}
                    </span>
                  </div>
                )}
              </div>
              </div>
            </div>
            
            {/* Tab Navigation inside header - Styled like SongDetailModal */}
            <div className="flex justify-center items-center gap-2 mt-4 sm:mt-2 px-1 relative z-10">
              <button
                onClick={() => setActiveTab('lyrics')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 border ${
                  activeTab === 'lyrics'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Lyrics</span>
              </button>
              
              <button
                onClick={() => setActiveTab('solfas')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 border ${
                  activeTab === 'solfas'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <Music className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Conductor's Guide</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 border ${
                  activeTab === 'history'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">History</span>
              </button>
            </div>
          </div>


        {/* Content Area */}
        <div className="px-4 sm:px-5 py-4 bg-slate-50/80">
          {/* Audio Player */}
          {fullMixUrl && (
            <div className="bg-white rounded-2xl p-4 mb-4 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center text-white hover:bg-slate-800 active:scale-95 transition-all shrink-0"
                >
                  {isCurrentSong && isPlaying ? <Pause size={20} className="sm:w-[18px] sm:h-[18px]" /> : <Play size={20} className="sm:w-[18px] sm:h-[18px] ml-0.5" />}
                </button>

                {/* Skip Controls */}
                <div className="flex items-center gap-1 ml-auto">
                   <button
                    onClick={handlePrevious}
                    disabled={!songs || songs.findIndex(s => s.id === currentSongData.id) <= 0}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-all shrink-0"
                  >
                    <ChevronUp size={20} className="-rotate-90 sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!songs || songs.findIndex(s => s.id === currentSongData.id) >= songs.length - 1}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-all shrink-0"
                  >
                    <ChevronDown size={20} className="-rotate-90 sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>

                <span className="text-sm sm:text-xs text-slate-500 w-10 sm:w-9 text-right tabular-nums shrink-0 ml-2">
                  {formatTime(isCurrentSong ? currentTime : 0)}
                </span>
                <div className="flex-1 relative h-8 sm:h-6 flex items-center">
                  <div className="absolute inset-x-0 h-1.5 sm:h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${isCurrentSong && duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={isCurrentSong ? duration || 100 : 100}
                    value={isCurrentSong ? currentTime : 0}
                    onChange={handleSeek}
                    disabled={!isCurrentSong}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-sm sm:text-xs text-slate-500 w-10 sm:w-9 tabular-nums shrink-0">
                  {formatTime(isCurrentSong ? duration : 0)}
                </span>
              </div>
            </div>
          )}

          {/* Conditional Content based on activeTab */}
          <div className="mb-4">
            {activeTab === 'lyrics' && currentSongData.lyrics && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-4 overflow-hidden">
                <style>{`
                  .lyrics-content {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: inherit;
                    font-size: 16px;
                    line-height: 1.6;
                  }
                  .lyrics-content b, .lyrics-content strong {
                    font-weight: 800;
                    color: #4a1d96;
                  }
                `}</style>
                <pre
                  className="lyrics-content text-slate-800 whitespace-pre-wrap font-mono"
                  dangerouslySetInnerHTML={{ __html: formatLyricsForDisplay(currentSongData.lyrics) }}
                />
              </div>
            )}

            {activeTab === 'solfas' && currentSongData.solfa && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-4 overflow-hidden">
                <style>{`
                  .solfa-content {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 14px;
                    line-height: 1.6;
                    font-style: italic;
                    color: #065f46;
                  }
                `}</style>
                <pre
                  className="solfa-content whitespace-pre-wrap font-mono"
                  dangerouslySetInnerHTML={{ __html: formatLyricsForDisplay(currentSongData.solfa) }}
                />
              </div>
            )}

            {activeTab === 'history' && currentSongData.history && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-4 overflow-hidden">
                <style>{`
                  .history-content {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: inherit;
                    font-size: 15px;
                    line-height: 1.7;
                    color: #334155;
                  }
                  .history-content b, .history-content strong {
                    font-weight: 700;
                    color: #1e293b;
                  }
                `}</style>
                <pre
                  className="history-content whitespace-pre-wrap font-sans"
                  dangerouslySetInnerHTML={{ __html: formatLyricsForDisplay(currentSongData.history) }}
                />
              </div>
            )}
            
            {activeTab === 'lyrics' && !currentSongData.lyrics && (
               <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                  <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No lyrics available for this song.</p>
               </div>
            )}
            
            {activeTab === 'solfas' && !currentSongData.solfa && (
               <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                  <Music className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No conductor's guide available.</p>
               </div>
            )}

            {activeTab === 'history' && !currentSongData.history && (
               <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                  <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No history available.</p>
               </div>
            )}
          </div>
        </div>
      </div>

        {/* Footer Actions - Only show for non-HQ zones */}
        {!isHQ && (
          <div className="shrink-0 p-4 border-t border-slate-200 bg-white sm:rounded-b-3xl safe-area-inset-bottom">
            <button
              onClick={goToAudioLab}
              disabled={isNavigating}
              className="w-full py-4 sm:py-3.5 bg-slate-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-sm text-base sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isNavigating ? (
                <>
                  <CustomLoader size="sm" />
                  <span className="ml-2">Opening AudioLab...</span>
                </>
              ) : (
                <>
                  <Mic size={22} className="sm:w-5 sm:h-5" />
                  Practice in AudioLab
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
