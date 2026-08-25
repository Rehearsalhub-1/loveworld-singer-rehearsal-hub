import React from 'react';
import { Archive, ChevronRight, Search, X } from 'lucide-react';

interface ArchiveSearchProps {
  selectedPageCategory: string | null;
  setSelectedPageCategory: (category: string | null) => void;
  archiveSearchQuery: string;
  setArchiveSearchQuery: (query: string) => void;
}

export const ArchiveSearch: React.FC<ArchiveSearchProps> = ({
  selectedPageCategory,
  setSelectedPageCategory,
  archiveSearchQuery,
  setArchiveSearchQuery,
}) => {
  return (
    <div className="mb-6 sticky top-0 z-20 bg-transparent pt-2 pb-4 -mx-1 px-1">
      {/* Breadcrumbs Navigation */}
      <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm max-w-full overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
        <button 
          onClick={() => {
            setSelectedPageCategory(null);
            setArchiveSearchQuery('');
          }}
          className={`font-medium transition-colors flex items-center gap-1.5 shrink-0 ${!selectedPageCategory ? 'text-purple-600' : 'text-slate-500 hover:text-purple-600'}`}
        >
          <Archive className="w-4 h-4" />
          All Categories
        </button>
        {selectedPageCategory && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-900 truncate">{selectedPageCategory}</span>
          </>
        )}
      </div>

      {/* Persistent Archive Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4.5 w-4.5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder={selectedPageCategory ? `Search inside ${selectedPageCategory}...` : "Search all archive categories..."}
          value={archiveSearchQuery}
          onChange={(e) => setArchiveSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-10 py-3 border-b border-slate-200/50 bg-transparent rounded-none leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-0 sm:text-sm transition-all duration-300"
        />
        {archiveSearchQuery && (
          <button
            onClick={() => setArchiveSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ArchiveSearch;
