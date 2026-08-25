"use client";

import React from 'react';
import { Plus, Check, Trash2, FolderOpen, X } from 'lucide-react';

interface EditSongAudioLabProps {
  audioUrls: Record<string, string>;
  customParts: string[];
  showAddPart: boolean;
  setShowAddPart: (show: boolean) => void;
  newPartName: string;
  setNewPartName: (name: string) => void;
  handleAddCustomPart: () => void;
  handleRemoveAudioPart: (part: string) => void;
  handleRemoveCustomPart: (partName: string) => void;
  handleOpenMediaSelectorForPart: (part: string) => void;
}

export const EditSongAudioLab: React.FC<EditSongAudioLabProps> = ({
  audioUrls,
  customParts,
  showAddPart,
  setShowAddPart,
  newPartName,
  setNewPartName,
  handleAddCustomPart,
  handleRemoveAudioPart,
  handleRemoveCustomPart,
  handleOpenMediaSelectorForPart
}) => {
  return (
    <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h4 className="text-base sm:text-lg font-semibold text-slate-900">Audio Parts (for AudioLab)</h4>
          <p className="text-xs text-slate-500 mt-1">Upload separate tracks for each vocal part</p>
        </div>
        <button
          onClick={() => setShowAddPart(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Custom Part
        </button>
      </div>

      {/* Add Custom Part Input */}
      {showAddPart && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200 mb-4">
          <input
            type="text"
            value={newPartName}
            onChange={(e) => setNewPartName(e.target.value)}
            placeholder="Part name (e.g., Harmony, Lead 2)"
            className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPart()}
          />
          <button
            onClick={handleAddCustomPart}
            className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAddPart(false); setNewPartName(''); }}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Default Parts */}
        {[
          { key: 'soprano', label: 'Soprano' },
          { key: 'alto', label: 'Alto' },
          { key: 'tenor', label: 'Tenor' },
          { key: 'bass', label: 'Bass' },
        ].map(({ key, label }) => (
          <div
            key={key}
            className={`relative p-3 rounded-xl border-2 transition-all ${audioUrls[key]
              ? 'border-green-300 bg-green-50'
              : 'border-slate-200 bg-slate-50'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              {audioUrls[key] && (
                <Check size={16} className="text-green-600" />
              )}
            </div>

            {audioUrls[key] ? (
              <div className="flex items-center gap-2">
                <audio
                  src={audioUrls[key]}
                  controls
                  className="h-8 w-full max-w-[140px]"
                  style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}
                />
                <button
                  onClick={() => handleRemoveAudioPart(key)}
                  className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleOpenMediaSelectorForPart(key)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <FolderOpen size={14} />
                Select from Media
              </button>
            )}
          </div>
        ))}

        {/* Custom Parts */}
        {customParts.map((partName) => (
          <div
            key={partName}
            className={`relative p-3 rounded-xl border-2 transition-all ${audioUrls[partName]
              ? 'border-green-300 bg-green-50'
              : 'border-orange-200 bg-orange-50'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">{partName}</span>
              <div className="flex items-center gap-1">
                {audioUrls[partName] && (
                  <Check size={16} className="text-green-600" />
                )}
                <button
                  onClick={() => handleRemoveCustomPart(partName)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove this part"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {audioUrls[partName] ? (
              <div className="flex items-center gap-2">
                <audio
                  src={audioUrls[partName]}
                  controls
                  className="h-8 w-full max-w-[140px]"
                  style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}
                />
                <button
                  onClick={() => handleRemoveAudioPart(partName)}
                  className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleOpenMediaSelectorForPart(partName)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <FolderOpen size={14} />
                Select from Media
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
