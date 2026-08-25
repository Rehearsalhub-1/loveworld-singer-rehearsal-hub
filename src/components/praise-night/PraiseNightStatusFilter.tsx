import React from 'react';

interface PraiseNightStatusFilterProps {
  activeFilter: 'heard' | 'unheard';
  setActiveFilter: (filter: 'heard' | 'unheard') => void;
  activeCategory: string;
  categoryHeardCount: number;
  categoryUnheardCount: number;
}

export const PraiseNightStatusFilter: React.FC<PraiseNightStatusFilterProps> = ({
  activeFilter,
  setActiveFilter,
  activeCategory,
  categoryHeardCount,
  categoryUnheardCount
}) => {
  return (
    <div className="mb-4 sm:mb-6 px-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setActiveFilter('heard')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 shadow-sm border whitespace-nowrap ${activeFilter === 'heard'
            ? 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
        >
          Heard ({categoryHeardCount})
        </button>

        <div className="flex-1 text-center max-w-[55%] sm:max-w-none">
          {/* Mobile: show first 3 words then ... if too long */}
          <span className="block sm:hidden text-black text-xs font-medium truncate">
            {(() => {
              if (!activeCategory) return '';
              const words = activeCategory.split(' ').filter(Boolean);
              const firstThree = words.slice(0, 3).join(' ');
              return words.length > 3 ? `${firstThree}...` : firstThree;
            })()}
          </span>
          {/* Desktop / tablet: show full category */}
          <span className="hidden sm:inline text-black text-sm font-medium">
            {activeCategory}
          </span>
        </div>

        <button
          onClick={() => setActiveFilter('unheard')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 shadow-sm border whitespace-nowrap ${activeFilter === 'unheard'
            ? 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
        >
          Unheard ({categoryUnheardCount})
        </button>
      </div>
    </div>
  );
};
