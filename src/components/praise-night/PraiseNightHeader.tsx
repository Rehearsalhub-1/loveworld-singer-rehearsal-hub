import React from 'react';
import { Search, X, ChevronDown, RefreshCw, Music } from 'lucide-react';
import { ScreenHeader } from '@/components/ScreenHeader';

interface PraiseNightHeaderProps {
  categoryFilter: string | null;
  pageParam: string | null;
  currentPraiseNight: any;
  selectedPageCategory: string | null;
  setSelectedPageCategory: (category: string | null) => void;
  archiveSearchQuery: string;
  setArchiveSearchQuery: (query: string) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  timeLeft: { days: number; hours: number; minutes: number; seconds: number };
  formatNumber: (num: number) => string;
  displayedPraiseNights: any[];
  switchPraiseNight: (praiseNight: any) => void;
  loading: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const PraiseNightHeader: React.FC<PraiseNightHeaderProps> = ({
  categoryFilter,
  pageParam,
  currentPraiseNight,
  selectedPageCategory,
  setSelectedPageCategory,
  archiveSearchQuery,
  setArchiveSearchQuery,
  showDropdown,
  setShowDropdown,
  isSearchOpen,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
  timeLeft,
  formatNumber,
  displayedPraiseNights,
  switchPraiseNight,
  loading,
  searchInputRef
}) => {
  return (
    <div className="flex-shrink-0 w-full relative z-40">
      <div className="relative bg-white/80 backdrop-blur-xl border-b border-gray-100/50 min-h-[60px] sm:min-h-[70px]">
        {/* Normal Header Content */}
        <div className={`transition-all duration-300 ease-out ${isSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <ScreenHeader
            title={categoryFilter === 'archive' ? (pageParam ? (currentPraiseNight?.name || 'Archive Page') : 'Archives') :
              categoryFilter === 'pre-rehearsal' && displayedPraiseNights.length === 0 ? 'Pre-Rehearsal' :
                (currentPraiseNight?.name || '')}
            showBackButton={true}
            backPath={categoryFilter === 'archive' && pageParam ? `/pages/praise-night?category=archive` : "/pages/rehearsals"}
            onBackClick={
              categoryFilter === 'archive' && !pageParam && (selectedPageCategory || archiveSearchQuery.trim()) 
                ? () => {
                    if (archiveSearchQuery.trim() && !selectedPageCategory) {
                      setArchiveSearchQuery('');
                    } else {
                      setSelectedPageCategory(null);
                      setArchiveSearchQuery('');
                    }
                  } 
                : undefined
            }
            showMenuButton={false}
            rightImageSrc="/logo.png"
            leftButtons={categoryFilter !== 'archive' && (
              <button
                aria-label="Switch Praise Night"
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition border border-slate-200 touch-optimized"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
            rightButtons={(categoryFilter !== 'archive' || pageParam) && (
              <button
                onClick={() => setIsSearchOpen((v: boolean) => !v)}
                aria-label="Toggle search"
                className="p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-0 focus:border-0 active:scale-95 hover:bg-gray-100/70 active:bg-gray-200/90 touch-optimized"
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              >
                <Search className="w-5 h-5 text-gray-600 transition-all duration-200" />
              </button>
            )}
            timer={currentPraiseNight && categoryFilter !== 'archive' && (timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0) && (
              <div className="flex items-center gap-1.5 mt-[-10px] text-xs sm:text-sm font-bold text-indigo-950 tracking-tight animate-in fade-in duration-500">
                <span>{formatNumber(timeLeft.days)}d</span>
                <span>{formatNumber(timeLeft.hours)}h</span>
                <span>{formatNumber(timeLeft.minutes)}m</span>
                <span className="text-purple-600 animate-pulse">{formatNumber(timeLeft.seconds)}s</span>
              </div>
            )}
          />
        </div>

        {/* Header Search Overlay */}
        <div className={`absolute inset-0 bg-white/95 backdrop-blur-xl transition-all duration-300 ease-out ${isSearchOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
          }`}>
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 h-full">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Search songs, lyrics, solfas, writer, lead singer..."
                inputMode="search"
                aria-label="Search"
                className="w-full text-lg bg-transparent px-0 py-3 text-gray-800 placeholder-gray-400 border-0 outline-none appearance-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none font-poppins-medium"
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              />
              <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-300/40" />
              <div className="absolute left-0 bottom-0 h-0.5 bg-purple-500 w-full shadow-sm"
                style={{ boxShadow: '0 0 8px rgba(147, 51, 234, 0.4)' }} />
            </div>
            <button
              onClick={() => {
                setIsSearchOpen(false)
                setSearchQuery('')
              }}
              aria-label="Close search"
              className="p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-0 focus:border-0 active:scale-95 hover:bg-gray-100/70 active:bg-gray-200/90 ml-4"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            >
              <X className="w-6 h-6 text-gray-700 transition-all duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Header-level Praise Night Dropdown */}
      {showDropdown && categoryFilter !== 'archive' && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-[75]"
            onClick={() => setShowDropdown(false)}
          />
          <div className="fixed right-3 left-3 sm:right-4 sm:left-auto top-16 sm:top-16 z-[80] w-auto sm:w-64 max-w-2xl mx-auto sm:mx-0 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-3 sm:px-4 py-12 text-center">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                <div className="text-slate-500 text-sm font-medium">Loading sessions...</div>
              </div>
            ) : (
              <div className="flex flex-col">
                {displayedPraiseNights.length > 0 ? (
                  displayedPraiseNights.map((praiseNight) => (
                    <button
                      key={praiseNight.id}
                      onClick={() => switchPraiseNight(praiseNight)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-slate-50 transition-colors ${praiseNight.id === currentPraiseNight?.id ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-500' : ''}`}
                    >
                      <div className="font-semibold text-sm sm:text-base mb-1">{praiseNight.name}</div>
                      <div className="text-xs sm:text-sm text-slate-600">{praiseNight.location} • {praiseNight.date}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-12 text-center">
                    <Music className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs italic">No sessions available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
