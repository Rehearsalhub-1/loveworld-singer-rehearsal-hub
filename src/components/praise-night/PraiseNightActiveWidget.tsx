import React from 'react';
import AudioWave from '@/components/AudioWave';
import { Play, X, ChevronRight, ChevronUp } from 'lucide-react';

interface PraiseNightActiveWidgetProps {
  finalSongData: any[];
  isSongDetailOpen: boolean;
  showActiveMenu: boolean;
  setShowActiveMenu: (show: boolean) => void;
  handleSongClick: (song: any, index: number) => void;
}

export const PraiseNightActiveWidget: React.FC<PraiseNightActiveWidgetProps> = ({
  finalSongData,
  isSongDetailOpen,
  showActiveMenu,
  setShowActiveMenu,
  handleSongClick
}) => {
  const activeSongs = finalSongData
    .filter((song: any) => song.isActive)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  if (activeSongs.length === 0 || isSongDetailOpen) {
    return null;
  }

  if (activeSongs.length === 1) {
    // Single active song
    const activeSongDisplay = activeSongs[0];
    return (
      <div 
        className="fixed bottom-24 right-4 z-50 animate-bounce-in cursor-pointer touch-optimized group"
        onClick={() => handleSongClick(activeSongDisplay, finalSongData.indexOf(activeSongDisplay))}
      >
        <div className="bg-white px-5 py-4 rounded-2xl shadow-2xl ring-2 ring-green-500 shadow-green-200/60 flex items-center gap-4 animate-pulse-ring max-w-[280px] sm:max-w-[320px]">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 shadow-sm">
            <AudioWave className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1 leading-none">Live Now</div>
            <div className="text-sm font-bold text-slate-900 truncate leading-tight">
              {activeSongDisplay.title}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors flex-shrink-0">
            <Play className="w-4 h-4 text-green-600 ml-0.5" />
          </div>
        </div>
      </div>
    );
  } else {
    // Multiple active songs
    return (
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end">
        {/* Expanding Menu */}
        {showActiveMenu && (
          <div className="mb-3 bg-white rounded-2xl shadow-2xl border border-green-100 overflow-hidden w-72 animate-slide-up">
            <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex justify-between items-center">
              <span className="text-xs font-black text-green-700 uppercase tracking-wider">Live Rehearsal Sessions</span>
              <button onClick={() => setShowActiveMenu(false)} className="p-1.5 hover:bg-green-200 rounded-full transition-colors">
                <X className="w-4 h-4 text-green-700" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {activeSongs.map((song: any, i: number) => (
                <button
                  key={song.id}
                  className="w-full text-left px-4 py-3.5 hover:bg-green-50 border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors group"
                  onClick={() => {
                    setShowActiveMenu(false);
                    handleSongClick(song, finalSongData.indexOf(song));
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-xs font-bold text-green-700">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{song.title}</div>
                    <div className="text-[11px] text-slate-500 font-medium truncate">{song.category}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-green-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Floating Button */}
        <div 
          className="animate-bounce-in cursor-pointer touch-optimized group"
          onClick={() => setShowActiveMenu(!showActiveMenu)}
        >
          <div className={`bg-white px-5 py-4 rounded-2xl shadow-2xl ring-2 ring-green-500 flex items-center gap-4 transition-all duration-300 ${!showActiveMenu ? 'animate-pulse-ring shadow-green-200/60' : 'bg-green-50'}`}>
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-green-100">
              <span className="text-white text-sm font-black">{activeSongs.length}</span>
            </div>
            <div className="flex-1 pr-2">
              <div className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1 leading-none">Live Now</div>
              <div className="text-sm font-bold text-slate-900 whitespace-nowrap">
                Multiple Songs
              </div>
            </div>
            <ChevronUp className={`w-5 h-5 text-green-600 transition-transform duration-300 ${showActiveMenu ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>
    );
  }
};
