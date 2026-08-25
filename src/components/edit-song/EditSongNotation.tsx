"use client";

import React from 'react';
import { History } from 'lucide-react';
import BasicTextEditor from '../BasicTextEditor';

interface EditSongNotationProps {
  songSolfas: string;
  setSongSolfas: (value: string) => void;
  songNotation: string;
  setSongNotation: (value: string) => void;
  handleCreateHistory: (type: any) => void;
  historyButtonClasses: string;
}

export const EditSongNotation: React.FC<EditSongNotationProps> = ({
  songSolfas,
  setSongSolfas,
  songNotation,
  setSongNotation,
  handleCreateHistory,
  historyButtonClasses
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Conductor's Guide Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Conductor's Guide Notation
            </h4>
            <button
              onClick={() => handleCreateHistory('solfas')}
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
            Rich text editor - Use the toolbar above to format your solfas
          </div>

          <div className="relative">
            <BasicTextEditor
              id="solfas-editor"
              value={songSolfas}
              onChange={(value) => {
                setSongSolfas(value);
              }}
              placeholder="Enter solfas notation here...

Example:
Do Re Mi Fa Sol La Ti Do
Do Re Mi Fa Sol La Ti Do
Do Ti La Sol Fa Mi Re Do

Chorus:
Do Re Mi Fa Sol La Ti Do
Do Re Mi Fa Sol La Ti Do"
              className="w-full font-mono"
            />
          </div>
        </div>
      </div>

      {/* Solfa Notation Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Solfa Notation
            </h4>
            <button
              onClick={() => handleCreateHistory('notation')}
              className={historyButtonClasses}
            >
              <History className="w-3 h-3" />
              Add History
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
            Rich text editor - Enter the primary Solfas notation here
          </div>

          <div className="relative">
            <BasicTextEditor
              id="notation-editor"
              value={songNotation}
              onChange={(value) => {
                setSongNotation(value);
              }}
              placeholder="Enter solfas notation (primary version) here..."
              className="w-full font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
