import React from 'react';
import { useRouter } from 'next/navigation';
import { Music, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { PraiseNight } from '@/types/supabase';

interface ArchiveProgramListProps {
  loading: boolean;
  loadingPageCategories: boolean;
  selectedPageCategory: string | null;
  pageCategories: any[];
  filteredPraiseNights: PraiseNight[];
  displayedPraiseNights: PraiseNight[];
  currentPraiseNight: PraiseNight | null;
  categoryFilter: string | null;
  archiveSearchQuery: string;
  setArchiveSearchQuery: (query: string) => void;
  setSelectedPageCategory: (category: string | null) => void;
}

export const ArchiveProgramList: React.FC<ArchiveProgramListProps> = ({
  loading,
  loadingPageCategories,
  selectedPageCategory,
  pageCategories,
  filteredPraiseNights,
  displayedPraiseNights,
  currentPraiseNight,
  categoryFilter,
  archiveSearchQuery,
  setArchiveSearchQuery,
  setSelectedPageCategory,
}) => {
  const router = useRouter();

  if (loading || loadingPageCategories) return null;

  const showList = (selectedPageCategory || pageCategories.length === 0 || archiveSearchQuery.trim().length > 0) && filteredPraiseNights.length > 0;

  if (showList) {
    return (
      <div className="flex flex-col">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {displayedPraiseNights.map((praiseNight) => (
            <button
              key={praiseNight.id}
              onClick={() => {
                router.push(`/pages/praise-night?category=${categoryFilter || 'archive'}&page=${praiseNight.id}`);
              }}
              className={`group relative bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 overflow-hidden flex flex-col ${currentPraiseNight?.id === praiseNight.id ? 'ring-2 ring-purple-500 bg-purple-50/30' : ''}`}
            >
              {/* Banner Image */}
              <div className="aspect-video sm:aspect-[16/10] bg-gradient-to-br from-purple-500 to-pink-500 relative overflow-hidden flex-shrink-0">
                {praiseNight.bannerImage ? (
                  <img
                    src={praiseNight.bannerImage}
                    alt={praiseNight.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-black text-xl opacity-20 tracking-tighter italic">LOVEWORLD</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                
                {/* Overlay Badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg border border-white/20">
                  <span className="text-[9px] font-black text-white uppercase tracking-wider">{praiseNight.date?.split(',')[1]?.trim() || 'Program'}</span>
                </div>
              </div>

              {/* Page Info */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-2 group-hover:text-purple-700 transition-colors">{praiseNight.name}</h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{praiseNight.location || 'Global Broadcast'}</p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                   <p className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">{praiseNight.date?.split(',')[0] || 'Recently'}</p>
                   <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (filteredPraiseNights.length === 0 && !loading && !archiveSearchQuery.trim()) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <Music className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium italic">
          No programs found in this category
        </p>
      </div>
    );
  }

  if (selectedPageCategory) {
    return (
      <div className="text-center py-12 flex flex-col items-center">
        <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        {archiveSearchQuery.trim() ? (
          <>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No results found</h3>
            <p className="text-slate-500 mb-6">
              No programs in "{selectedPageCategory}" match "{archiveSearchQuery}"
            </p>
            <button
              onClick={() => setArchiveSearchQuery('')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Clear Search
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No pages in this category</h3>
            <p className="text-slate-500 mb-6">
              No archived pages have been assigned to "{selectedPageCategory}" yet
            </p>
            <button
              onClick={() => setSelectedPageCategory(null)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to All Categories
            </button>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default ArchiveProgramList;
