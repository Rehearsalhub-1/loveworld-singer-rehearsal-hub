import React from 'react';
import { useRouter } from 'next/navigation';
import { Music, RefreshCw, Calendar, Archive, Clock, MapPin, User, ChevronRight, Search } from 'lucide-react';
import { PageCategory } from '@/types/supabase';

interface GlobalArchiveResultsProps {
  archiveSearchQuery: string;
  isGlobalSearchLoading: boolean;
  globalSearchResults: any[];
  pageCategories: PageCategory[];
  handleSongClick: (song: any, index: number) => void;
}

export const GlobalArchiveResults: React.FC<GlobalArchiveResultsProps> = ({
  archiveSearchQuery,
  isGlobalSearchLoading,
  globalSearchResults,
  pageCategories,
  handleSongClick,
}) => {
  const router = useRouter();

  if (archiveSearchQuery.trim().length < 1) return null;

  return (
    <div className="mt-4 mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-600" />
          {isGlobalSearchLoading ? 'Searching archive...' : `Search Results (${globalSearchResults.length})`}
        </h3>
        {isGlobalSearchLoading && (
          <RefreshCw className="w-4 h-4 text-purple-600 animate-spin" />
        )}
      </div>

      {isGlobalSearchLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white/50 animate-pulse rounded-2xl border border-slate-100 shadow-sm"></div>
          ))}
        </div>
      ) : globalSearchResults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {globalSearchResults.map((result: any, index) => (
            <button
              key={`${result.id}-${index}`}
              onClick={() => {
                if (result.type === 'page') {
                  router.push(`/pages/praise-night?category=archive&page=${result.id}`);
                } else {
                  handleSongClick(result, index);
                }
              }}
              className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between min-h-[120px]"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                {result.type === 'page' ? (
                  <Calendar className="w-16 h-16 text-slate-900" />
                ) : (
                  <Music className="w-16 h-16 text-slate-900" />
                )}
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${
                    result.type === 'page' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {result.type === 'page' ? (
                      <Calendar className="w-4 h-4" />
                    ) : (
                      <Music className="w-4 h-4" />
                    )}
                  </div>
                  {result.status && (
                    <span className={`px-2 py-0.5 text-[9px] rounded-full font-black uppercase tracking-wider shadow-sm border border-black/5 ${
                      result.status === 'heard' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {result.status}
                    </span>
                  )}
                </div>

                <h4 className="font-black text-slate-900 leading-snug mb-1 line-clamp-2 group-hover:text-purple-700 transition-colors">
                  {result.type === 'page' ? result.name : result.title}
                </h4>

                {result.type === 'song' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 bg-purple-50/50 w-fit px-2 py-0.5 rounded-lg mb-3">
                    <Archive className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{result.parentPageName}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-50 relative z-10">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {result.date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {result.date}
                    </span>
                  )}
                  {result.leadSinger && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {result.leadSinger}
                    </span>
                  )}
                </div>
                <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Only show "No results found" if no categories match either */
        !pageCategories.some(c => c.name?.toLowerCase().includes(archiveSearchQuery.toLowerCase())) && (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No results found matching "{archiveSearchQuery}"</p>
            <p className="text-slate-400 text-sm mt-1">Try a different title, program name, or writer</p>
          </div>
        )
      )}
      <div className="h-px bg-slate-200 my-8 mx-auto w-1/4 opacity-50"></div>
    </div>
  );
};

export default GlobalArchiveResults;
