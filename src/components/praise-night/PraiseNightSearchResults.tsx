import React from 'react';
import { Music, Flag, ChevronRight, Search } from 'lucide-react';
export interface PageSearchResult { id: string; type: "song" | "category"; title: string; subtitle?: string; description?: string; category?: string; status?: "heard" | "unheard"; }

interface PraiseNightSearchResultsProps {
  isSearchOpen: boolean;
  searchQuery: string;
  typedSearchResults: PageSearchResult[];
  finalSongData: any[];
  handleSongClick: (song: any, index: number) => void;
  setActiveCategory: (category: string) => void;
  setIsSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const PraiseNightSearchResults: React.FC<PraiseNightSearchResultsProps> = ({
  isSearchOpen,
  searchQuery,
  typedSearchResults,
  finalSongData,
  handleSongClick,
  setActiveCategory,
  setIsSearchOpen,
  setSearchQuery
}) => {
  if (!isSearchOpen) return null;

  return (
    <div className="fixed left-0 right-0 top-16 z-[65] bg-white border border-gray-200 shadow-lg max-h-96 overflow-y-auto">
      <div className="mx-auto max-w-2xl lg:max-w-6xl xl:max-w-7xl px-4 py-2">
        <div className="text-xs text-gray-500 mb-2 font-medium">
          {searchQuery ? (
            `${typedSearchResults.length} result${typedSearchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
          ) : (
            'Start typing to search songs, artists, or events...'
          )}
        </div>
        {typedSearchResults.length > 0 ? (
          <div className="space-y-1">
            {typedSearchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  if (result.type === 'song') {
                    const song = finalSongData.find(s => s.title === result.title);
                    if (song) {
                      const songIndex = finalSongData.indexOf(song);
                      handleSongClick(song, songIndex);
                    }
                  } else {
                    setActiveCategory(result.category || '');
                  }
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="w-full text-left block p-3 rounded-xl hover:bg-gray-100/70 active:bg-gray-200/90 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {result.type === 'song' ? (
                        <Music className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      ) : (
                        <Flag className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                      <h4 className="font-medium text-gray-900 text-sm truncate group-hover:text-purple-700 transition-colors">
                        {result.title}
                      </h4>
                    </div>
                    {result.subtitle && <p className="text-xs text-purple-600 font-medium mb-0.5">{result.subtitle}</p>}
                    {result.description && <p className="text-xs text-gray-500 truncate">{result.description}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 ml-2" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
};
