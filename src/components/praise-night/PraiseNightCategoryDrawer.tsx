"use client";

import React from 'react';
import { X } from 'lucide-react';

interface PraiseNightCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  otherCategories: string[];
  activeCategory: string;
  handleCategorySelect: (category: string) => void;
  finalSongData: any[];
}

export const PraiseNightCategoryDrawer: React.FC<PraiseNightCategoryDrawerProps> = ({
  isOpen,
  onClose,
  otherCategories,
  activeCategory,
  handleCategorySelect,
  finalSongData
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 transform transition-transform duration-300 animate-slide-up modal-bottom-safe">
        <div className="px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Filter by Category</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Total Songs Count */}
          <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
            <p className="text-sm text-purple-700 font-medium">{finalSongData.length} Total Scheduled Songs</p>
          </div>

          {/* Category Options */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {otherCategories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${activeCategory === category
                  ? 'bg-purple-100 border-2 border-purple-300 text-purple-800'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent text-gray-700'
                  }`}
              >
                <div className="font-medium text-slate-900 text-sm leading-tight">{category}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">
                  {finalSongData.filter(song => song.category === category).length} songs
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
