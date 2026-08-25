"use client";

import { Music, Play, Pause, ChevronDown, Mic, RefreshCw } from 'lucide-react';
import type { Song, VocalPart } from '../_types';

export interface CollapsibleSongCardProps {
  song: Song;
  isExpanded: boolean;
  isPlaying: boolean;
  isHighlighted?: boolean;
  currentPart: VocalPart | null;
  currentTime: number;
  duration: number;
  onToggleExpand: () => void;
  onPlayPart: (part: VocalPart) => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  isBufferLoading?: boolean;
  loadingTarget?: string | null;
}

const partColors: Record<string, { bg: string; text: string; activeBg: string; bar: string }> = {
  full: { bg: 'bg-violet-500/10', text: 'text-violet-400', activeBg: 'bg-violet-500/20', bar: 'bg-violet-500' },
  soprano: { bg: 'bg-pink-500/10', text: 'text-pink-400', activeBg: 'bg-pink-500/20', bar: 'bg-pink-500' },
  alto: { bg: 'bg-amber-500/10', text: 'text-amber-400', activeBg: 'bg-amber-500/20', bar: 'bg-amber-500' },
  tenor: { bg: 'bg-blue-500/10', text: 'text-blue-400', activeBg: 'bg-blue-500/20', bar: 'bg-blue-500' },
  bass: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', activeBg: 'bg-emerald-500/20', bar: 'bg-emerald-500' },
};

// Default colors for custom parts
const customPartColors = [
  { bg: 'bg-orange-500/10', text: 'text-orange-400', activeBg: 'bg-orange-500/20', bar: 'bg-orange-500' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-400', activeBg: 'bg-cyan-500/20', bar: 'bg-cyan-500' },
  { bg: 'bg-lime-500/10', text: 'text-lime-400', activeBg: 'bg-lime-500/20', bar: 'bg-lime-500' },
  { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', activeBg: 'bg-fuchsia-500/20', bar: 'bg-fuchsia-500' },
  { bg: 'bg-rose-500/10', text: 'text-rose-400', activeBg: 'bg-rose-500/20', bar: 'bg-rose-500' },
];

const getPartColors = (part: VocalPart, index: number) => {
  if (partColors[part]) return partColors[part];
  return customPartColors[index % customPartColors.length];
};

const partLabels: Record<string, string> = {
  full: 'Full Mix',
  soprano: 'Soprano',
  alto: 'Alto',
  tenor: 'Tenor',
  bass: 'Bass',
};

const getPartLabel = (part: VocalPart) => {
  return partLabels[part] || part;
};

export function CollapsibleSongCard({
  song,
  isExpanded,
  isPlaying,
  isHighlighted,
  currentPart,
  currentTime,
  duration,
  onToggleExpand,
  onPlayPart,
  onPause,
  onSeek,
  isBufferLoading,
  loadingTarget,
}: CollapsibleSongCardProps) {
  const availableParts = song.availableParts || ['full'];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`rounded-xl bg-[#261933] border overflow-hidden transition-all duration-300 ${isHighlighted
      ? 'border-violet-400 ring-4 ring-violet-500/30 shadow-xl shadow-violet-500/30 bg-violet-500/5'
      : 'border-white/5'
      }`}>
      {/* Card Header - Always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-sm">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: song.albumArt ? `url('${song.albumArt}')` : 'none',
              backgroundColor: '#1a0f24'
            }}
          />
          {!song.albumArt && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Music size={18} className="text-slate-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{song.title}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-200">
            <span className="truncate font-medium">{song.artist}</span>
          </div>
          {availableParts.length > 1 && (
            <div className="flex gap-1 mt-1">
              {availableParts.filter(p => p !== 'full').slice(0, 4).map((part, index) => {
                const colors = getPartColors(part, index);
                return (
                  <span
                    key={part}
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase ${colors.bg} ${colors.text}`}
                  >
                    {part.charAt(0)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <ChevronDown
          size={20}
          className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-3 pb-4 pt-1 border-t border-white/5">

          <div className="space-y-2">
            {availableParts.map((part, index) => {
              const isActive = isPlaying && currentPart === part;
              const isPartLoading = isBufferLoading && loadingTarget === part;
              const colors = getPartColors(part, index);
              const partProgress = isActive ? progress : 0;

              return (
                <div key={part} className="flex flex-col gap-1 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPartLoading) return;
                      // Toggle play/pause if active
                      if (isActive) {
                        if (isPlaying) onPause();
                        else onPlayPart(part); // resume
                      } else {
                        onPlayPart(part);
                      }
                    }}
                    className={`group relative w-full flex items-center gap-4 p-4 rounded-xl transition-all overflow-hidden border ${isActive
                      ? 'bg-[#3b2d4a] border-violet-500/30 shadow-lg scale-[1.02] z-10'
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                      }`}
                  >
                    {/* Active Background Glow */}
                    {isActive && (
                      <div className={`absolute inset-0 ${colors.bg} opacity-20 pointer-events-none`} />
                    )}

                    {/* Play/Pause Icon - Larger when active */}
                    <div className={`
                      relative z-10 flex items-center justify-center rounded-full transition-all shadow-lg shrink-0
                      ${isActive ? 'w-12 h-12 bg-white text-black' : 'w-10 h-10 bg-black/20 text-slate-400 group-hover:text-white group-hover:bg-black/40'}
                    `}>
                      {isPartLoading ? (
                        <RefreshCw size={20} className={`animate-spin ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                      ) : isActive && isPlaying ? (
                        <Pause size={24} fill="currentColor" className="ml-0.5" />
                      ) : (
                        <Play size={24} fill="currentColor" className={isActive ? 'ml-1' : 'ml-1 opacity-80'} />
                      )}
                    </div>

                    <div className="relative z-10 flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`font-bold text-base ${isActive ? 'text-white' : 'text-slate-200'}`}>
                          {getPartLabel(part)}
                        </span>
                        {isActive && (
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-mono text-violet-200 tabular-nums font-medium">
                              {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Subtitle/Status */}
                      <p className={`text-xs truncate transition-colors ${isActive ? 'text-violet-100/90' : 'text-slate-300'}`}>
                        {isPartLoading ? 'Buffering...' : isActive ? (isPlaying ? 'Now Playing' : 'Paused') : 'Tap to play'}
                      </p>
                    </div>
                  </button>

                  {/* Enhanced Progress Slider (Only when active) */}
                  {isActive && (
                    <div className="px-2 pb-2 mt-[-4px] relative z-20 animate-in fade-in slide-in-from-top-1">
                      <div
                        className="relative w-full h-8 flex items-center cursor-pointer group touch-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const percentage = x / rect.width;
                          onSeek(percentage * duration);
                        }}
                      >
                        {/* Track Background */}
                        <div className="absolute left-0 right-0 h-1.5 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                          {/* Buffer/Loading Animation */}
                          {isPartLoading && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1s_infinite] w-full" />
                          )}
                          {/* Progress Fill */}
                          <div
                            className={`h-full ${colors.bar} transition-all duration-100 ease-out`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {/* Interactive Thumb (Visual feedback) */}
                        <div
                          className="absolute h-4 w-4 bg-white rounded-full shadow-lg shadow-black/50 border-2 border-violet-100 transform -translate-x-1/2 transition-transform duration-100 group-active:scale-125"
                          style={{ left: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
