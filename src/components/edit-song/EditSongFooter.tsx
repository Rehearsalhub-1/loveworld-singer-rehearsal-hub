"use client";

import React from 'react';
import { Save, History } from 'lucide-react';
import { PraiseNightSong } from '@/types/supabase';

interface EditSongFooterProps {
  song: PraiseNightSong | null;
  onUpdate: () => void;
  onClose: () => void;
  onViewHistory: () => void;
  isFirebaseConfigured: boolean;
  historyEntriesCount: number;
  theme: any;
}

export const EditSongFooter: React.FC<EditSongFooterProps> = ({
  song,
  onUpdate,
  onClose,
  onViewHistory,
  isFirebaseConfigured,
  historyEntriesCount,
  theme
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-4 sm:p-6 border-t border-slate-200 flex-shrink-0">
      <button
        onClick={onUpdate}
        className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 ${theme.primary} text-white ${theme.primaryHover} rounded-lg transition-colors font-medium`}
      >
        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base">{song ? 'Update Song' : 'Add Song'}</span>
      </button>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onViewHistory}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium relative ${!isFirebaseConfigured
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : `${theme.primary} text-white ${theme.primaryHover}`
            }`}
          disabled={!isFirebaseConfigured}
        >
          <History className="w-4 h-4" />
          <span className="text-sm sm:text-base">View History</span>
          {historyEntriesCount > 0 && isFirebaseConfigured && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {historyEntriesCount}
            </span>
          )}
          {!isFirebaseConfigured && (
            <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" title="Firebase not configured">
              ⚠️
            </span>
          )}
        </button>
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-4 sm:px-6 py-3 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
