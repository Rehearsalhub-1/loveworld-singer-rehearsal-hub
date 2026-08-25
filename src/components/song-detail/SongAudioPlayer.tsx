import React from 'react';
import { RotateCcw, SkipBack, RotateCw, Play, Pause, SkipForward, Loader2, Music2 } from 'lucide-react';

interface SongAudioPlayerProps {
  duration: number;
  currentTime: number;
  formatTime: (seconds: number) => string;
  isDragging: boolean;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleProgressMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleProgressMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleProgressMouseUp: () => void;
  isRepeating: boolean;
  toggleRepeat: () => void;
  handlePrevious: () => void;
  skipBackward10: () => void;
  togglePlayPause: () => void;
  isLoading: boolean;
  hasError: boolean;
  isPlaying: boolean;
  skipForward10: () => void;
  handleNext: () => void;
  handleMusicPage: () => void;
  isNavigatingToAudioLab: boolean;
  zoneColor: string;
  darkenColor: (color: string, amount: number) => string;
  historyAudioRefs: React.MutableRefObject<{ [key: string]: HTMLAudioElement | null }>;
  setHistoryAudioStates?: React.Dispatch<React.SetStateAction<{ [key: string]: { isPlaying: boolean; currentTime: number; duration: number } }>>;
}

export const SongAudioPlayer: React.FC<SongAudioPlayerProps> = ({
  duration,
  currentTime,
  formatTime,
  isDragging,
  handleProgressClick,
  handleProgressMouseDown,
  handleProgressMouseMove,
  handleProgressMouseUp,
  isRepeating,
  toggleRepeat,
  handlePrevious,
  skipBackward10,
  togglePlayPause,
  isLoading,
  hasError,
  isPlaying,
  skipForward10,
  handleNext,
  handleMusicPage,
  isNavigatingToAudioLab,
  zoneColor,
  darkenColor,
  historyAudioRefs,
  setHistoryAudioStates,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 px-6 modal-bottom-safe bg-white border-t border-gray-100 z-[100]">
      {/* Progress Bar */}
      <div className="mb-2">
        <div
          className="progress-bar w-full h-1 bg-gray-300 rounded-full relative cursor-pointer hover:h-1.5 transition-all duration-200 select-none touch-optimized"
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={handleProgressMouseMove}
          onMouseUp={handleProgressMouseUp}
        >
          <div
            className="h-full bg-gray-600 rounded-full relative transition-all duration-200"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          >
            <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 rounded-full transition-all duration-200 ${isDragging ? 'w-4 h-4 bg-blue-600' : 'w-3 h-3 bg-gray-600 hover:w-4 hover:h-4'
              }`}></div>
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-600 text-xs">{formatTime(currentTime)}</span>
          <span className="text-gray-600 text-xs">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-evenly px-2">
        {/* Repeat Button */}
        <button
          onClick={toggleRepeat}
          className={`w-5 h-5 flex items-center justify-center transition-colors ${isRepeating ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          title={isRepeating ? "Disable repeat" : "Enable repeat"}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isRepeating ? 'text-blue-600' : ''}`} />
        </button>

        {/* Previous Track */}
        <button
          onClick={handlePrevious}
          className="w-5 h-5 flex items-center justify-center hover:text-gray-800 transition-colors"
        >
          <SkipBack className="w-4 h-4 text-gray-600 fill-gray-600" />
        </button>

        {/* 10 Second Backward */}
        <button
          onClick={skipBackward10}
          className="relative w-4 h-4 flex items-center justify-center hover:text-gray-800 transition-colors"
          title="Skip backward 10 seconds"
        >
          <RotateCcw className="w-3 h-3 text-gray-600" />
          <span className="absolute text-[4px] text-gray-600 font-bold leading-none top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">10</span>
        </button>

        {/* Center Play/Pause Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // Stop any active history playback
            Object.keys(historyAudioRefs.current).forEach(id => {
              if (historyAudioRefs.current[id]) {
                historyAudioRefs.current[id]!.pause();
                setHistoryAudioStates?.(prev => ({
                  ...prev,
                  [id]: { ...prev[id], isPlaying: false }
                }));
              }
            });

            togglePlayPause();
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: zoneColor,
            boxShadow: `0 4px 12px ${zoneColor}40`
          }}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : hasError ? (
            <div className="w-4 h-4 text-white text-xs">!</div>
          ) : isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>

        {/* 10 Second Forward */}
        <button
          onClick={skipForward10}
          className="relative w-4 h-4 flex items-center justify-center hover:text-gray-800 transition-colors"
          title="Skip forward 10 seconds"
        >
          <RotateCw className="w-3 h-3 text-gray-600" />
          <span className="absolute text-[4px] text-gray-600 font-bold leading-none top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">10</span>
        </button>

        {/* Next Track */}
        <button
          onClick={handleNext}
          className="w-5 h-5 flex items-center justify-center hover:text-gray-800 transition-colors"
        >
          <SkipForward className="w-4 h-4 text-gray-600 fill-gray-600" />
        </button>

        {/* Music Page Button */}
        <button
          onClick={handleMusicPage}
          disabled={isNavigatingToAudioLab}
          className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          {isNavigatingToAudioLab ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Music2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default SongAudioPlayer;
