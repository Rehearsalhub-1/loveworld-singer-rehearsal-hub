import React from 'react';
import { Music, ChevronRight } from 'lucide-react';
import AudioWave from '@/components/AudioWave';

interface PraiseNightSongListProps {
  songsLoading: boolean;
  filteredSongs: any[];
  currentSong: any;
  isPlaying: boolean;
  activeCategory: string;
  categoryTotalCount: number;
  categoryHeardCount: number;
  categoryUnheardCount: number;
  activeFilter: 'heard' | 'unheard';
  zoneColor: string;
  currentPraiseNight: any;
  handleSongClick: (song: any, index: number) => void;
}

export const PraiseNightSongList: React.FC<PraiseNightSongListProps> = ({
  songsLoading,
  filteredSongs,
  currentSong,
  isPlaying,
  activeCategory,
  categoryTotalCount,
  categoryHeardCount,
  categoryUnheardCount,
  activeFilter,
  zoneColor,
  currentPraiseNight,
  handleSongClick
}) => {
  return (
    <div className="px-1 py-4 lg:max-h-none overflow-y-auto lg:overflow-visible">
      {/* CRITICAL FIX: Show loading skeleton while fetching, not empty state */}
      {songsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-0 rounded-2xl p-3 lg:p-4 shadow-sm bg-white animate-pulse">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-200"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-6 bg-slate-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <Music className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-slate-500 text-sm mb-2 font-medium">
            {!currentPraiseNight && 'No praise night selected'}
            {currentPraiseNight && !activeCategory && 'No category selected'}
            {currentPraiseNight && activeCategory && categoryTotalCount === 0 && `No songs in ${activeCategory} category yet`}
            {currentPraiseNight && activeCategory && categoryTotalCount > 0 && activeFilter === 'heard' && categoryHeardCount === 0 && `No heard songs in ${activeCategory} yet`}
            {currentPraiseNight && activeCategory && categoryTotalCount > 0 && activeFilter === 'unheard' && categoryUnheardCount === 0 && `No unheard songs in ${activeCategory} yet`}
          </div>
          <div className="text-slate-400 text-xs">
            {!currentPraiseNight && 'Select a praise night from the dropdown above'}
            {currentPraiseNight && !activeCategory && 'Select a category from the bottom navigation'}
            {currentPraiseNight && activeCategory && categoryTotalCount === 0 && 'Songs will appear here when added to this category'}
            {currentPraiseNight && activeCategory && categoryTotalCount > 0 && activeFilter === 'heard' && categoryHeardCount === 0 && 'Songs will appear here when marked as heard'}
            {currentPraiseNight && activeCategory && categoryTotalCount > 0 && activeFilter === 'unheard' && categoryUnheardCount === 0 && 'Songs will appear here when marked as unheard'}
          </div>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
          {filteredSongs.map((song, index) => (
            <div
              key={index}
              onClick={() => handleSongClick(song, index)}
              className={`border-0 rounded-2xl p-3 lg:p-4 shadow-sm hover:shadow-lg transition-all duration-300 active:scale-[0.97] group mb-3 lg:mb-0 w-full cursor-pointer touch-optimized ${(song as any).isActive
                ? 'ring-4 ring-green-500 shadow-lg shadow-green-200/50 bg-white hover:bg-gray-50 animate-pulse-ring' // Admin marked as ACTIVE - blinking green border
                : (() => {
                  const isActive = currentSong?.id === song.id;
                  return isActive;
                })()
                  ? 'ring-2 shadow-lg' // Playing - use zone color
                  : 'bg-white hover:bg-gray-50 ring-1 ring-black/5'
                }`}
              style={(() => {
                const isActive = currentSong?.id === song.id;
                if (isActive) {
                  return {
                    backgroundColor: `${zoneColor}40`,
                    borderColor: zoneColor,
                    boxShadow: `0 0 0 2px ${zoneColor}, 0 10px 15px -3px ${zoneColor}30, 0 4px 6px -2px ${zoneColor}20`
                  };
                }
                return {};
              })()}
            >
              {/* Song Header - Rehearsal Style */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm"
                    style={{ backgroundColor: `${zoneColor}20` }}
                  >
                    {currentSong?.id === song.id && isPlaying ? (
                      <AudioWave className="h-6 w-6" />
                    ) : (
                      <span
                        className="text-sm lg:text-base font-semibold"
                        style={{ color: zoneColor }}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 text-sm lg:text-base group-hover:text-black leading-tight">
                      {song.title}
                    </h3>
                    <p className="text-xs lg:text-sm text-slate-500 mt-0.5 leading-tight font-bold">
                      Singer: {song.leadSinger || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Rehearsal Count */}
                  <div
                    className="px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${zoneColor}20` }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: zoneColor }}
                    >
                      x{song.rehearsalCount ?? 0}
                    </span>
                  </div>
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
