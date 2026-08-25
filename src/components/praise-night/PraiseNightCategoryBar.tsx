import React from 'react';

interface PraiseNightCategoryBarProps {
  categoryFilter: string | null;
  pageParam: string | null;
  mainCategories: string[];
  activeCategory: string;
  handleCategorySelect: (category: string) => void;
  finalSongData: any[];
  zoneColor: string;
}

export const PraiseNightCategoryBar: React.FC<PraiseNightCategoryBarProps> = ({
  categoryFilter,
  pageParam,
  mainCategories,
  activeCategory,
  handleCategorySelect,
  finalSongData,
  zoneColor
}) => {
  // Common render function for the category bar
  const renderCategoryButtons = (isArchivePage: boolean) => (
    <div
      className="bottom-bar-enhanced flex-shrink-0 z-[100] backdrop-blur-md shadow-sm border-t border-gray-200/50 w-full"
      style={{
        background: `linear-gradient(to top, ${zoneColor}20, ${zoneColor}10, rgba(255, 255, 255, 0.2))`
      }}
    >
      <div className="w-full flex items-center px-3 sm:px-4 lg:px-6 py-4 gap-2">
        <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div className="flex gap-2 min-w-max px-1">
            {mainCategories.map((category) => {
              const hasActiveSong = finalSongData.some((song: any) => 
                (isArchivePage ? song.category === category : song.category === category) && song.isActive
              );
              
              return (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`flex-shrink-0 px-3 py-3 rounded-xl text-xs font-semibold transition-all duration-200 text-center whitespace-nowrap category-button ${
                    hasActiveSong
                      ? 'bg-green-600 text-white border-2 border-green-700 shadow-md'
                      : activeCategory === category
                        ? 'text-white shadow-md'
                        : isArchivePage 
                          ? 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200'
                          : 'bg-white/90 backdrop-blur-sm text-slate-900 font-bold hover:bg-white border border-gray-200'
                  }`}
                  style={activeCategory === category && !hasActiveSong ? {
                    backgroundColor: zoneColor,
                    boxShadow: `0 4px 6px -1px ${zoneColor}40, 0 2px 4px -1px ${zoneColor}20`
                  } : {}}
                >
                  <span className="block leading-tight">{category}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Archive Individual Page Category Bar
  if (categoryFilter === 'archive' && pageParam) {
    return renderCategoryButtons(true);
  }

  // Regular (Ongoing/Pre-Rehearsal) Category Bar
  if (categoryFilter !== 'archive') {
    return renderCategoryButtons(false);
  }

  return null;
};
