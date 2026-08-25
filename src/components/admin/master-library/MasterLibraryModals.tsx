"use client";

import React, { useState } from 'react';
import {
  X, Search, Check, Download, Upload, Music, Plus,
  ArrowUpDown, Trash2, FolderPlus, Layers, Sparkles, AlertCircle
} from 'lucide-react';
import { MasterSong, MasterProgram } from '@/lib/master-library';

interface MasterLibraryModalsProps {
  // Publish Modal
  showPublishModal: boolean;
  setShowPublishModal: (show: boolean) => void;
  availableForPublish: any[];
  selectedForPublish: string[];
  setSelectedForPublish: (ids: string[]) => void;
  handlePublish: () => void;
  publishing: boolean;
  isLoadingMore: boolean;
  hasMoreInternal: boolean;
  onLoadMoreInternal: () => void;

  // Import Modal
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  selectedSong: MasterSong | null;
  zonePraiseNights: any[];
  selectedPraiseNight: string;
  setSelectedPraiseNight: (id: string) => void;
  handleImport: () => void;
  importing: boolean;

  // Program Modals
  showCreateProgramModal: boolean;
  setShowCreateProgramModal: (show: boolean) => void;
  handleCreateProgram: (name: string, description: string) => void;
  showOrderProgramsModal: boolean;
  setShowOrderProgramsModal: (show: boolean) => void;
  programs: MasterProgram[];
  handleUpdateProgramOrder: (updatedPrograms: MasterProgram[]) => void;
  handleDeleteProgram?: (id: string) => void;
}

export const MasterLibraryModals: React.FC<MasterLibraryModalsProps> = ({
  showPublishModal,
  setShowPublishModal,
  availableForPublish = [],
  selectedForPublish = [],
  setSelectedForPublish,
  handlePublish,
  publishing,
  showImportModal,
  setShowImportModal,
  selectedSong,
  zonePraiseNights = [],
  selectedPraiseNight,
  setSelectedPraiseNight,
  handleImport,
  importing,
  showCreateProgramModal,
  setShowCreateProgramModal,
  handleCreateProgram,
  showOrderProgramsModal,
  setShowOrderProgramsModal,
  programs = [],
  handleUpdateProgramOrder,
  handleDeleteProgram,
}) => {
  const [progName, setProgName] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [reorderingPrograms, setReorderingPrograms] = useState<MasterProgram[]>(programs);
  const [creatingProg, setCreatingProg] = useState(false);
  const [publishSearch, setPublishSearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);

  const filteredReorderingPrograms = reorderingPrograms.filter(p =>
    !programSearch.trim() ||
    p.name.toLowerCase().includes(programSearch.toLowerCase())
  );

  const handleDeleteProgramLocal = async (id: string) => {
    if (!handleDeleteProgram) return;
    setDeletingProgramId(id);
    try {
      await handleDeleteProgram(id);
      setReorderingPrograms(prev => prev.filter(p => p.id !== id));
    } finally {
      setDeletingProgramId(null);
    }
  };

  const filteredPublishSongs = availableForPublish.filter((song: any) => {
    if (!publishSearch.trim()) return true;
    const q = publishSearch.toLowerCase();
    const title = String(song.title || '').toLowerCase();
    const writer = String(song.writer || '').toLowerCase();
    const singer = String(song.leadSinger || '').toLowerCase();
    return title.includes(q) || writer.includes(q) || singer.includes(q);
  });

  // Reorder helper
  const moveProgram = (index: number, direction: 'up' | 'down') => {
    const newItems = [...reorderingPrograms];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    setReorderingPrograms(newItems);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim()) return;
    setCreatingProg(true);
    try {
      await handleCreateProgram(progName.trim(), progDesc.trim());
      setProgName('');
      setProgDesc('');
    } finally {
      setCreatingProg(false);
    }
  };

  return (
    <>
      {/* 1. Create Program / Service Collection Modal */}
      {showCreateProgramModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">New Program Collection</h3>
                  <p className="text-[11px] text-slate-400">Group ministered songs into a service set</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateProgramModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProgram} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Program / Event Name *</label>
                <input
                  type="text"
                  required
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  placeholder="e.g., Praise Night 24, Communion Service"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  placeholder="e.g., Official ministrations for November 2026..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-800 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateProgramModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProg || !progName.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-200 active:scale-95 disabled:opacity-50"
                >
                  {creatingProg ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Create Collection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Organize & Reorder Programs Modal */}
      {showOrderProgramsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Organize Collections</h3>
                  <p className="text-[11px] text-slate-400">{reorderingPrograms.length} program{reorderingPrograms.length !== 1 ? 's' : ''} — reorder, search, and delete</p>
                </div>
              </div>
              <button
                onClick={() => setShowOrderProgramsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-5 pt-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search program collections..."
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
                {programSearch && (
                  <button
                    type="button"
                    onClick={() => setProgramSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2 space-y-2">
              {filteredReorderingPrograms.length === 0 ? (
                <div className="text-center py-10">
                  <FolderPlus className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">
                    {programSearch ? `No collections match "${programSearch}"` : 'No program collections created yet.'}
                  </p>
                </div>
              ) : (
                filteredReorderingPrograms.map((prog) => {
                  const idx = reorderingPrograms.findIndex(p => p.id === prog.id);
                  const isDeleting = deletingProgramId === prog.id;
                  return (
                    <div
                      key={prog.id}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 group hover:bg-white hover:border-purple-200/60 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{prog.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {prog.songIds?.length || 0} songs
                            {prog.description ? ` • ${prog.description}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Reorder Up/Down — only shown when not searching */}
                        {!programSearch && (
                          <>
                            <button
                              type="button"
                              onClick={() => moveProgram(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-white rounded-lg disabled:opacity-30 border border-transparent hover:border-slate-200 transition-all"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveProgram(idx, 'down')}
                              disabled={idx === reorderingPrograms.length - 1}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-white rounded-lg disabled:opacity-30 border border-transparent hover:border-slate-200 transition-all"
                              title="Move down"
                            >
                              ↓
                            </button>
                          </>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete the collection "${prog.name}"? This won't delete the songs inside.`)) {
                              handleDeleteProgramLocal(prog.id);
                            }
                          }}
                          disabled={isDeleting}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all disabled:opacity-50"
                          title="Delete collection"
                        >
                          {isDeleting ? (
                            <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-400">
                {reorderingPrograms.length} total collections
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOrderProgramsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateProgramOrder(reorderingPrograms)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95"
                >
                  Save Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Publish / Import from HQ Internal Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Import from Internal Songs</h3>
                  <p className="text-[11px] text-slate-400">Select internal repertoire songs to publish into the Master Library</p>
                </div>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Select-All Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search internal songs..."
                  value={publishSearch}
                  onChange={(e) => setPublishSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {filteredPublishSongs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedForPublish.length === filteredPublishSongs.length) {
                      setSelectedForPublish([]);
                    } else {
                      setSelectedForPublish(filteredPublishSongs.map((s: any) => s.id));
                    }
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 text-purple-700 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0"
                >
                  {selectedForPublish.length === filteredPublishSongs.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {filteredPublishSongs.length === 0 ? (
                <div className="text-center py-10">
                  <Music className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No internal songs found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {publishSearch ? 'Try a different search query.' : 'All internal songs have already been imported.'}
                  </p>
                </div>
              ) : (
                filteredPublishSongs.map((song: any) => {
                  const isSelected = selectedForPublish.includes(song.id);
                  return (
                    <div
                      key={song.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedForPublish(selectedForPublish.filter(id => id !== song.id));
                        } else {
                          setSelectedForPublish([...selectedForPublish, song.id]);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-50 border-purple-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-bold text-slate-900 truncate">{song.title}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {song.leadSinger ? `Lead: ${song.leadSinger}` : ''}
                          {song.leadSinger && song.writer ? ' • ' : ''}
                          {song.writer ? `Written by ${song.writer}` : ''}
                        </p>
                      </div>

                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700">
                {selectedForPublish.length} songs selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing || selectedForPublish.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 disabled:opacity-50"
                >
                  {publishing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{publishing ? 'Importing...' : 'Import to Master'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Import Master Song to Local Zone Modal */}
      {showImportModal && selectedSong && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Import to Local Zone</h3>
                  <p className="text-[11px] text-slate-400">Deploy "{selectedSong.title}" to local repertoire</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Praise Night Set</label>
                <select
                  value={selectedPraiseNight}
                  onChange={(e) => setSelectedPraiseNight(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                >
                  <option value="">General Repertoire (No Set)</option>
                  {zonePraiseNights.map((pn: any) => (
                    <option key={pn.id} value={pn.id}>
                      {pn.name || `Praise Night ${pn.edition || ''}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-start gap-2.5">
                <Music className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-purple-900 font-medium leading-relaxed">
                  All stems, lyrics, and metadata will be cloned into your local zonal repertoire immediately.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Import Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
