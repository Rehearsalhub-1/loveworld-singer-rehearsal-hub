import React from 'react';
import { BookOpen, Minimize2, Maximize2 } from 'lucide-react';
import { hasVisibleContent } from '@/utils/string-utils';

interface SongLyricsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  title?: string;
  writer?: string;
  lyrics?: string;
  showFloatingButtonOnly?: boolean;
  zoneColor?: string;
  darkenColor?: (color: string, amount: number) => string;
}

export const SongLyrics: React.FC<SongLyricsProps> = ({
  isFullscreen,
  onToggleFullscreen,
  title,
  writer,
  lyrics,
  showFloatingButtonOnly = false,
  zoneColor = '#9333EA',
  darkenColor,
}) => {
  if (showFloatingButtonOnly) {
    return (
      <button
        onClick={onToggleFullscreen}
        className="fixed bottom-28 right-3 sm:right-4 w-10 h-10 sm:w-11 sm:h-11 text-white rounded-full shadow-lg transition-all duration-200 z-[110] hover:scale-105 flex items-center justify-center"
        style={{
          backgroundColor: zoneColor
        }}
        onMouseEnter={(e) => {
          if (darkenColor) {
            e.currentTarget.style.backgroundColor = darkenColor(zoneColor, 10);
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = zoneColor;
        }}
        title="Fullscreen Lyrics"
      >
        <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white bg-music-doodle z-[100] flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Minimize2 className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-black">{title}</h2>
              <p className="text-sm text-gray-500">{writer}</p>
            </div>
          </div>
        </div>

        {/* Fullscreen Lyrics Content */}
        <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch p-6 h-[calc(100vh-80px)]">
          <div className="max-w-4xl mx-auto">
            <div className="text-black leading-relaxed space-y-6 text-base text-left font-poppins">
              {lyrics ? (
                <div
                  dangerouslySetInnerHTML={{ __html: lyrics }}
                  className="prose prose-slate prose-lg max-w-none text-black"
                />
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No lyrics available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-none">
      <div className="text-black leading-relaxed space-y-6 text-sm text-left font-poppins">
        {hasVisibleContent(lyrics) ? (
          <div
            dangerouslySetInnerHTML={{ __html: lyrics || '' }}
            dir="ltr"
            className="prose prose-slate max-w-none text-[14px] leading-[1.8] text-left ltr text-black"
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm mb-2">No Lyrics Available</div>
            <div className="text-gray-400 text-xs">Lyrics will be displayed here when available</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongLyrics;
