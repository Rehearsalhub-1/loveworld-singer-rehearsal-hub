"use client";

import React, { useState } from 'react';
import { Search, Filter, ChevronDown, Music, ArrowUpDown, X, History, Eye, EyeOff, Trash2, Plus, Settings2 } from 'lucide-react';
import { MasterProgram } from '@/lib/master-library';

interface MasterLibraryFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  selectedLeadSinger: string;
  setSelectedLeadSinger: (singer: string) => void;
  isLeadSingerDropdownOpen: boolean;
  setIsLeadSingerDropdownOpen: (open: boolean) => void;
  leadSingers: string[];
  selectedProgramId: string;
  setSelectedProgramId: (id: string) => void;
  isProgramsDropdownOpen: boolean;
  setIsProgramsDropdownOpen: (open: boolean) => void;
  programs: MasterProgram[];
  canManage: boolean;
  setShowCreateProgramModal: (show: boolean) => void;
  setShowOrderProgramsModal: (show: boolean) => void;
  handleDeleteProgram: (id: string) => void;
  activeTab?: 'active' | 'history' | 'hidden' | 'all';
  setActiveTab?: (tab: 'active' | 'history' | 'hidden' | 'all') => void;
  stats?: {
    totalSongs: number;
    activeSongs: number;
    historySongs: number;
    hiddenSongs: number;
  };
  selectedSongIds?: Set<string>;
  onBulkHide?: (hide: boolean) => void;
  onBulkMoveToHistory?: (toHistory: boolean) => void;
  onClearSelection?: () => void;
}

export const MasterLibraryFilters: React.FC<MasterLibraryFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  sortOrder,
  setSortOrder,
  selectedLeadSinger,
  setSelectedLeadSinger,
  isLeadSingerDropdownOpen,
  setIsLeadSingerDropdownOpen,
  leadSingers,
  selectedProgramId,
  setSelectedProgramId,
  isProgramsDropdownOpen,
  setIsProgramsDropdownOpen,
  programs,
  activeTab = 'active',
  setActiveTab,
  stats,
  selectedSongIds = new Set(),
  onBulkHide,
  onBulkMoveToHistory,
  onClearSelection,
  canManage,
  setShowCreateProgramModal,
  setShowOrderProgramsModal,
  handleDeleteProgram,
}) => {
  const selectedCount = selectedSongIds.size;
  const [programDropdownSearch, setProgramDropdownSearch] = useState('');

  const filteredPrograms = programs.filter(p =>
    !programDropdownSearch.trim() ||
    p.name.toLowerCase().includes(programDropdownSearch.toLowerCase())
  );

  return (
    <div className="px-4 lg:px-6 py-2 space-y-3">
      {/* Tab Navigation: Active vs History vs Hidden vs All */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setActiveTab?.('active')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Active Songs</span>
            {stats?.activeSongs !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'active' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {stats.activeSongs}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab?.('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Ministered History</span>
            {stats?.historySongs !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'history' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {stats.historySongs}
              </span>
            )}
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab?.('hidden')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'hidden'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hidden / HQ Only</span>
              {stats?.hiddenSongs !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'hidden' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {stats.hiddenSongs}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab?.('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>All ({stats?.totalSongs || 0})</span>
          </button>
        </div>

        {/* Bulk Action Pill Bar (When items are selected) */}
        {selectedCount > 0 && canManage && (
          <div className="flex items-center gap-2 p-1 bg-purple-50 border border-purple-200 rounded-2xl animate-in fade-in slide-in-from-right-4 duration-200">
            <span className="text-xs font-bold text-purple-800 px-2.5">
              {selectedCount} selected
            </span>

            {activeTab !== 'history' ? (
              <button
                onClick={() => onBulkMoveToHistory?.(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                <History className="w-3 h-3" />
                <span>Move to History</span>
              </button>
            ) : (
              <button
                onClick={() => onBulkMoveToHistory?.(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                <Music className="w-3 h-3" />
                <span>Restore to Active</span>
              </button>
            )}

            {activeTab !== 'hidden' ? (
              <button
                onClick={() => onBulkHide?.(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                <EyeOff className="w-3 h-3" />
                <span>Hide</span>
              </button>
            ) : (
              <button
                onClick={() => onBulkHide?.(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                <Eye className="w-3 h-3" />
                <span>Unhide</span>
              </button>
            )}

            <button
              onClick={onClearSelection}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ministered songs by title, writer, lead singer, lyrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Programs / Collection Filter */}
          <div className="relative">
            <button
              onClick={() => setIsProgramsDropdownOpen(!isProgramsDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedProgramId && selectedProgramId !== 'all'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>
                {programs.find(p => p.id === selectedProgramId)?.name || 'All Collections'}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isProgramsDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => { setIsProgramsDropdownOpen(false); setProgramDropdownSearch(''); }} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-slate-200 z-30 w-64 overflow-hidden">
                  
                  {/* Search inside dropdown */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search collections..."
                        value={programDropdownSearch}
                        onChange={e => setProgramDropdownSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full pl-7 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white"
                        autoFocus
                      />
                      {programDropdownSearch && (
                        <button
                          type="button"
                          onClick={() => setProgramDropdownSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                    {!programDropdownSearch && (
                      <button
                        onClick={() => { setSelectedProgramId(''); setIsProgramsDropdownOpen(false); setProgramDropdownSearch(''); }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-xl"
                      >
                        All Collections
                      </button>
                    )}
                    {filteredPrograms.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">
                        {programDropdownSearch ? `No match for "${programDropdownSearch}"` : 'No collections yet'}
                      </div>
                    ) : (
                      filteredPrograms.map(p => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between rounded-xl group transition-all ${
                            selectedProgramId === p.id ? 'bg-purple-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <button
                            onClick={() => { setSelectedProgramId(p.id); setIsProgramsDropdownOpen(false); setProgramDropdownSearch(''); }}
                            className={`flex-1 text-left px-3 py-2 text-xs font-semibold rounded-xl ${
                              selectedProgramId === p.id ? 'text-purple-700 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <span className="block truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-400">{p.songIds?.length || 0} songs</span>
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete collection "${p.name}"? Songs inside won't be deleted.`)) {
                                  handleDeleteProgram(p.id);
                                  if (selectedProgramId === p.id) setSelectedProgramId('');
                                }
                              }}
                              className="mr-1.5 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete collection"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer actions */}
                  {canManage && (
                    <div className="p-1.5 border-t border-slate-100 flex gap-1">
                      <button
                        type="button"
                        onClick={() => { setIsProgramsDropdownOpen(false); setProgramDropdownSearch(''); setShowCreateProgramModal(true); }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        New Collection
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsProgramsDropdownOpen(false); setProgramDropdownSearch(''); setShowOrderProgramsModal(true); }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all"
                      >
                        <Settings2 className="w-3 h-3" />
                        Manage
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>


          {/* Lead Singer Filter */}
          {leadSingers.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsLeadSingerDropdownOpen(!isLeadSingerDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedLeadSinger
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{selectedLeadSinger || 'All Singers'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isLeadSingerDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsLeadSingerDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 min-w-[200px] max-h-60 overflow-y-auto p-1.5">
                    <button
                      onClick={() => { setSelectedLeadSinger(''); setIsLeadSingerDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg"
                    >
                      All Vocalists
                    </button>
                    {leadSingers.map(singer => (
                      <button
                        key={singer}
                        onClick={() => { setSelectedLeadSinger(singer); setIsLeadSingerDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg ${
                          selectedLeadSinger === singer ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {singer}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
            title={sortOrder === 'asc' ? 'Sort Z-A' : 'Sort A-Z'}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-600" />
            <span>{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
