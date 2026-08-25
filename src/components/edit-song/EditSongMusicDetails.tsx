"use client";

import React from 'react';
import { History, FolderOpen, Trash2 } from 'lucide-react';

interface EditSongMusicDetailsProps {
  songKey: string;
  setSongKey: (value: string) => void;
  songTempo: string;
  setSongTempo: (value: string) => void;
  rehearsalCount: number;
  setRehearsalCount: (value: number) => void;
  songAudioFile: string;
  setSongAudioFile: (value: string) => void;
  audioFile: any;
  setAudioFile: (file: any) => void;
  setShowMediaManager: (show: boolean) => void;
  handleCreateHistory: (type: any) => void;
  handlePaste: (e: React.ClipboardEvent, currentValue: string, setValue: (value: string) => void) => void;
  historyButtonClasses: string;
  buttonClasses: string;
}

export const EditSongMusicDetails: React.FC<EditSongMusicDetailsProps> = ({
  songKey,
  setSongKey,
  songTempo,
  setSongTempo,
  rehearsalCount,
  setRehearsalCount,
  songAudioFile,
  setSongAudioFile,
  audioFile,
  setAudioFile,
  setShowMediaManager,
  handleCreateHistory,
  handlePaste,
  historyButtonClasses,
  buttonClasses
}) => {
  return (
    <div className="bg-slate-50 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h4 className="text-base sm:text-lg font-semibold text-slate-900">Music Details</h4>
        <button
          onClick={() => handleCreateHistory('music-details')}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
        >
          <History className="w-3 h-3" />
          Add History
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Key
          </label>
          <input
            type="text"
            value={songKey}
            onChange={(e) => setSongKey(e.target.value)}
            onPaste={(e) => handlePaste(e, songKey, setSongKey)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="e.g., C, G, F#"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tempo
          </label>
          <input
            type="text"
            value={songTempo}
            onChange={(e) => setSongTempo(e.target.value)}
            onPaste={(e) => handlePaste(e, songTempo, setSongTempo)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="e.g., 120 BPM"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Rehearsal Count (Manual)
          </label>
          <input
            type="number"
            min="0"
            value={rehearsalCount}
            onChange={(e) => setRehearsalCount(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-600 focus:shadow-xl focus:bg-purple-50 transition-all duration-200"
            placeholder="Enter rehearsal count manually"
          />
        </div>
      </div>

      {/* Audio File - Full Width */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Audio File
          </label>
          <button
            onClick={() => handleCreateHistory('audio')}
            className={historyButtonClasses}
          >
            <History className="w-3 h-3" />
            Add History
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowMediaManager(true)}
          className={buttonClasses}
        >
          <FolderOpen className="w-4 h-4" />
          Browse Media Library
        </button>
        {audioFile && (
          <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></span>
                <span className="text-sm font-medium text-slate-700 break-all" title={audioFile.name}>
                  {audioFile.name}
                </span>
              </div>
              <span className="text-xs text-slate-500 ml-4">
                ({audioFile.size ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` : 'From Media Library'})
              </span>
            </div>
            <audio
              controls
              className="w-full h-8"
              style={{ outline: 'none' }}
            >
              <source src={audioFile.url} type="audio/mpeg" />
              <source src={audioFile.url} type="audio/wav" />
              <source src={audioFile.url} type="audio/ogg" />
              <source src={audioFile.url} type="audio/mp4" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
        {/* Current Audio Display */}
        <div className="mt-3">
          {songAudioFile && !audioFile ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                  <span className="text-sm font-medium text-slate-700">Current Audio:</span>
                </div>
                <button
                  onClick={() => {
                    setSongAudioFile('');
                    setAudioFile(null);
                  }}
                  className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded border border-red-200 hover:border-red-300 transition-colors"
                >
                  Delete
                </button>
              </div>
              <div className="text-sm text-slate-600 break-all mb-3" title={songAudioFile}>
                {songAudioFile.split('/').pop() || songAudioFile}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Source: {songAudioFile}
              </div>
              <audio
                controls
                className="w-full h-8"
                style={{ outline: 'none' }}
                preload="metadata"
              >
                <source src={songAudioFile} type="audio/mpeg" />
                <source src={songAudioFile} type="audio/wav" />
                <source src={songAudioFile} type="audio/ogg" />
                <source src={songAudioFile} type="audio/mp4" />
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : !songAudioFile && !audioFile ? (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <div className="text-gray-500 text-sm">
                No audio file selected
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Click "Browse Media Library" to select an audio file
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
