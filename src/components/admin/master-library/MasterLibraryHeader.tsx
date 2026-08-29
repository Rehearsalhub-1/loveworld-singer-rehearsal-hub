"use client";

import React from 'react';
import { Library, Music, Download, Plus, Upload, FolderPlus, ArrowUpDown, History, EyeOff } from 'lucide-react';
import { MasterSong } from '@/lib/master-library';

interface MasterLibraryHeaderProps {
  stats: {
    totalSongs: number;
    activeSongs: number;
    historySongs: number;
    hiddenSongs: number;
    totalImports: number;
    mostImported: MasterSong[];
  };
  canManage: boolean;
  setShowCreateModal: (show: boolean) => void;
  setShowPublishModal: (show: boolean) => void;
  setShowCreateProgramModal: (show: boolean) => void;
  setShowOrderProgramsModal: (show: boolean) => void;
}

export const MasterLibraryHeader: React.FC<MasterLibraryHeaderProps> = ({
  stats,
  canManage,
  setShowCreateModal,
  setShowPublishModal,
  setShowCreateProgramModal,
  setShowOrderProgramsModal,
}) => {
  const safeStats = stats || {
    totalSongs: 0,
    activeSongs: 0,
    historySongs: 0,
    hiddenSongs: 0,
    totalImports: 0,
    mostImported: []
  };

  return (
    <div className="px-4 lg:px-6 pt-4 pb-2">
      {/* Sleek Compact Executive Header Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Left: Branding & Inline Key Stats */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-200 flex-shrink-0">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">All Ministered</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <Music className="w-3 h-3" />
                {safeStats.totalSongs.toLocaleString()} Songs
              </span>
              {safeStats.historySongs > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <History className="w-3 h-3" />
                  {safeStats.historySongs.toLocaleString()} in History
                </span>
              )}
              {safeStats.totalImports > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Download className="w-3 h-3" />
                  {safeStats.totalImports.toLocaleString()} Imports
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Global catalog of all ministered songs.</p>
          </div>
        </div>

        {/* Right: Actions */}
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <button
              onClick={() => setShowCreateProgramModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all font-bold text-xs active:scale-95 shadow-2xs"
              title="Create Program / Collection"
            >
              <FolderPlus className="w-3.5 h-3.5 text-purple-600" />
              <span>New Program</span>
            </button>
            <button
              onClick={() => setShowOrderProgramsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all font-bold text-xs active:scale-95 shadow-2xs"
              title="Reorder Program Collections"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-600" />
              <span>Organize</span>
            </button>
            <button
              onClick={() => setShowPublishModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 rounded-xl transition-all font-bold text-xs active:scale-95 shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Internal</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all font-bold text-xs active:scale-95 shadow-sm shadow-purple-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Song</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
