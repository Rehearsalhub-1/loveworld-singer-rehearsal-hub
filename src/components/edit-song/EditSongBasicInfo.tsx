"use client";

import React from 'react';
import { History } from 'lucide-react';
import { Category } from '@/types/supabase';

interface EditSongBasicInfoProps {
  songTitle: string;
  setSongTitle: (value: string) => void;
  songCategories: string[];
  setSongCategories: (categories: string[]) => void;
  setSongCategory: (category: string) => void;
  songStatus: 'heard' | 'unheard';
  setSongStatus: (status: 'heard' | 'unheard') => void;
  songPraiseNight: string;
  setSongPraiseNight: (value: string) => void;
  categories: Category[];
  praiseNightCategories: any[];
  inputClasses: string;
  handlePaste: (e: React.ClipboardEvent, currentValue: string, setValue: (value: string) => void) => void;
  handleCreateHistory: (type: any) => void;
  songImageUrl: string;
  setSongImageUrl: (value: string) => void;
  handleOpenMediaSelectorForPart: (part: string) => void;
}

export const EditSongBasicInfo: React.FC<EditSongBasicInfoProps> = ({
  songTitle,
  setSongTitle,
  songCategories,
  setSongCategories,
  setSongCategory,
  songStatus,
  setSongStatus,
  songPraiseNight,
  setSongPraiseNight,
  categories,
  praiseNightCategories,
  inputClasses,
  handlePaste,
  handleCreateHistory,
  songImageUrl,
  setSongImageUrl,
  handleOpenMediaSelectorForPart
}) => {
  return (
    <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h4 className="text-base sm:text-lg font-semibold text-slate-900">Song Details</h4>
        <button
          onClick={() => handleCreateHistory('song-details')}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
        >
          <History className="w-3 h-3" />
          Add History
        </button>
      </div>
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Song Title *
          </label>
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            onPaste={(e) => handlePaste(e, songTitle, setSongTitle)}
            dir="ltr"
            style={{ textAlign: 'left', direction: 'ltr' }}
            className={`${inputClasses} text-lg font-medium`}
            placeholder="Enter song title"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categories * (Select one or more)
            </label>
            <div className="border-2 border-slate-300 rounded-lg p-3 bg-slate-50 max-h-48 overflow-y-auto">
              {categories.map(category => (
                <label key={category.id} className="flex items-center space-x-3 py-2 hover:bg-slate-100 rounded px-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={songCategories.includes(category.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newCategories = [...songCategories, category.name];
                        setSongCategories(newCategories);
                        setSongCategory(newCategories[0] || '');
                      } else {
                        const newCategories = songCategories.filter(cat => cat !== category.name);
                        setSongCategories(newCategories);
                        setSongCategory(newCategories[0] || '');
                      }
                    }}
                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <span className="text-sm text-slate-700">{category.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Selected: {songCategories.length > 0 ? songCategories.join(', ') : 'None'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={songStatus}
              onChange={(e) => setSongStatus(e.target.value as 'heard' | 'unheard')}
              className={inputClasses}
            >
              <option value="heard">Heard</option>
              <option value="unheard">Unheard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Praise Night
          </label>
          <select
            value={songPraiseNight}
            onChange={(e) => setSongPraiseNight(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
          >
            <option value="">Select Praise Night</option>
            {praiseNightCategories.map(praiseNight => (
              <option key={praiseNight.id} value={praiseNight.name}>{praiseNight.name}</option>
            ))}
          </select>
        </div>

        {/* Song Artwork */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Song Artwork
          </label>
          <div className="flex items-center gap-4">
            {songImageUrl ? (
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 border-slate-200">
                <img src={songImageUrl} alt="Song Artwork" className="w-full h-full object-cover" />
                <button
                  onClick={() => setSongImageUrl('')}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mb-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span className="text-xs text-slate-400">No Image</span>
              </div>
            )}
            <div className="flex-1">
              <button
                onClick={() => handleOpenMediaSelectorForPart('image')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Select Artwork
              </button>
              <p className="text-xs text-slate-500 mt-2 max-w-sm">
                This image will be used as the song's cover art in the mobile app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
