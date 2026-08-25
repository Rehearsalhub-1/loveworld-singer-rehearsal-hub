"use client";

import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { PraiseNightSong } from '@/types/supabase';

interface EditSongHeaderProps {
  song: PraiseNightSong | null;
  onClose: () => void;
  onDelete: () => void;
  title: string;
}

export const EditSongHeader: React.FC<EditSongHeaderProps> = ({
  song,
  onClose,
  onDelete,
  title
}) => {
  return (
    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
          {song ? `Edit: ${title}` : 'Add New Song'}
        </h3>
      </div>
      <div className="flex items-center gap-2">
        {song && (
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Song"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
