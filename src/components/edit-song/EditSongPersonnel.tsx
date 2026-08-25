"use client";

import React from 'react';
import { History } from 'lucide-react';

interface EditSongPersonnelProps {
  songLeadSinger: string;
  setSongLeadSinger: (value: string) => void;
  songWriter: string;
  setSongWriter: (value: string) => void;
  songConductor: string;
  setSongConductor: (value: string) => void;
  songLeadKeyboardist: string;
  setSongLeadKeyboardist: (value: string) => void;
  songLeadGuitarist: string;
  setSongLeadGuitarist: (value: string) => void;
  songDrummer: string;
  setSongDrummer: (value: string) => void;
  handleCreateHistory: (type: any) => void;
  handlePaste: (e: React.ClipboardEvent, currentValue: string, setValue: (value: string) => void) => void;
}

export const EditSongPersonnel: React.FC<EditSongPersonnelProps> = ({
  songLeadSinger,
  setSongLeadSinger,
  songWriter,
  setSongWriter,
  songConductor,
  setSongConductor,
  songLeadKeyboardist,
  setSongLeadKeyboardist,
  songLeadGuitarist,
  setSongLeadGuitarist,
  songDrummer,
  setSongDrummer,
  handleCreateHistory,
  handlePaste
}) => {
  return (
    <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h4 className="text-base sm:text-lg font-semibold text-slate-900">Personnel</h4>
        <button
          onClick={() => handleCreateHistory('personnel')}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
        >
          <History className="w-3 h-3" />
          Add History
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Lead Singer
          </label>
          <input
            type="text"
            value={songLeadSinger}
            onChange={(e) => setSongLeadSinger(e.target.value)}
            onPaste={(e) => handlePaste(e, songLeadSinger, setSongLeadSinger)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="Enter lead singer name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Writer
          </label>
          <input
            type="text"
            value={songWriter}
            onChange={(e) => setSongWriter(e.target.value)}
            onPaste={(e) => handlePaste(e, songWriter, setSongWriter)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="Enter writer name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Conductor's Guide
          </label>
          <input
            type="text"
            value={songConductor}
            onChange={(e) => setSongConductor(e.target.value)}
            onPaste={(e) => handlePaste(e, songConductor, setSongConductor)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="Enter conductor name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Lead Keyboardist
          </label>
          <input
            type="text"
            value={songLeadKeyboardist}
            onChange={(e) => setSongLeadKeyboardist(e.target.value)}
            onPaste={(e) => handlePaste(e, songLeadKeyboardist, setSongLeadKeyboardist)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="Enter lead keyboardist name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Bass Guitarist
          </label>
          <input
            type="text"
            value={songLeadGuitarist}
            onChange={(e) => setSongLeadGuitarist(e.target.value)}
            onPaste={(e) => handlePaste(e, songLeadGuitarist, setSongLeadGuitarist)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="Enter bass guitarist name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Drummer
          </label>
          <input
            type="text"
            value={songDrummer}
            onChange={(e) => setSongDrummer(e.target.value)}
            onPaste={(e) => handlePaste(e, songDrummer, setSongDrummer)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="Enter drummer name"
          />
        </div>
      </div>
    </div>
  );
};
