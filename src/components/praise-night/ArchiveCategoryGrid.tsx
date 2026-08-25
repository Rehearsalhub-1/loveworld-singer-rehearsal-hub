import { Archive, ChevronRight } from 'lucide-react';
import { sanitizeImageUrl } from '@/utils/image-utils';
import { PageCategory } from '@/types/supabase';

interface ArchiveCategoryGridProps {
  pageCategories: PageCategory[];
  archiveSearchQuery: string;
  allPraiseNights: any[];
  setSelectedPageCategory: (category: string) => void;
}

export const ArchiveCategoryGrid: React.FC<ArchiveCategoryGridProps> = ({
  pageCategories,
  archiveSearchQuery,
  allPraiseNights,
  setSelectedPageCategory,
}) => {
  const filteredCategories = pageCategories.filter(category => 
    archiveSearchQuery.trim().length < 2 || 
    category.name?.toLowerCase().includes(archiveSearchQuery.toLowerCase()) || 
    category.description?.toLowerCase().includes(archiveSearchQuery.toLowerCase())
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Browse by Category</h3>
        <span className="text-sm text-slate-500">{pageCategories.length} categories</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredCategories.map((category) => {
          // Count pages in this category
          const pagesInCategory = allPraiseNights.filter(p => {
            const isArchive = p.category === 'archive';
            const matchesCategory = p.pageCategory === category.name;
            return isArchive && matchesCategory;
          });
          const pageCount = pagesInCategory.length;

          // Only show categories that have pages
          if (pageCount === 0) return null;

          return (
            <button
              key={category.id}
              onClick={() => {
                setSelectedPageCategory(category.name);
              }}
              className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 text-left flex flex-col group relative overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <Archive className="w-24 h-24 text-slate-900" />
              </div>

              {category.image && (
                <div className="relative aspect-video mb-4 overflow-hidden rounded-xl border border-slate-100 flex-shrink-0">
                  <img
                    src={sanitizeImageUrl(category.image)}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              )}
              
              <div className="relative z-10 flex-1 flex flex-col">
                <h4 className="text-base font-black text-slate-900 mb-1 group-hover:text-purple-700 transition-colors">{category.name}</h4>
                <p className="text-[11px] font-medium text-slate-500 mb-4 line-clamp-2 leading-relaxed">{category.description}</p>
                
                <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-purple-100">
                    {pageCount} {pageCount === 1 ? 'Program' : 'Programs'}
                  </span>
                  <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ArchiveCategoryGrid;
