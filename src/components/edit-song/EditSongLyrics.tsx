"use client";

import React from 'react';
import { History } from 'lucide-react';
import BasicTextEditor from '../BasicTextEditor';

interface EditSongLyricsProps {
  songLyrics: string;
  setSongLyrics: (value: string) => void;
  handleCreateHistory: (type: any) => void;
  historyButtonClasses: string;
}

export const EditSongLyrics: React.FC<EditSongLyricsProps> = ({
  songLyrics,
  setSongLyrics,
  handleCreateHistory,
  historyButtonClasses
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h4 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Song Lyrics
          </h4>
          <button
            onClick={() => handleCreateHistory('lyrics')}
            className={historyButtonClasses}
          >
            <History className="w-3 h-3" />
            Add History
          </button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {/* Rich Text Editor with formatting toolbar */}
        <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
          Rich text editor - Use the toolbar above to format your lyrics
        </div>

        <div className="relative">
          <BasicTextEditor
            id="lyrics-editor"
            value={songLyrics}
            onChange={(value) => {
              setSongLyrics(value);
            }}
            placeholder="Enter complete song lyrics here...

Example:
Verse 1:
[Your verse lyrics here]

Chorus:
[Your chorus lyrics here]

Verse 2:
[Your verse lyrics here]

Bridge:
[Your bridge lyrics here]"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
