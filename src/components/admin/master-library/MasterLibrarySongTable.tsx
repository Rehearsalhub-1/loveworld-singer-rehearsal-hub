"use client";

import React, { useState, useRef } from 'react';
import {
  Music, Plus, FileText, Trash2, Download,
  CheckSquare, Square, ChevronLeft, ChevronRight,
  Play, Pause, Volume2, Key, Sparkles, FolderPlus, Layers,
  Eye, EyeOff, History, Undo2, Copy
} from 'lucide-react';
import { MasterSong, MasterProgram } from '@/lib/master-library';

interface MasterLibrarySongTableProps {
  songs: MasterSong[];
  canManage: boolean;
  selectedSongIds: Set<string>;
  setSelectedSongIds: (ids: Set<string>) => void;
  onSongClick: (song: MasterSong) => void;
  onEditClick: (song: MasterSong) => void;
  onDeleteClick: (id: string) => void;
  onImportClick: (song: MasterSong) => void;
  onDuplicateClick?: (song: MasterSong) => void;
  onToggleHide?: (id: string, currentlyHidden: boolean) => void;
  onToggleHistory?: (id: string, currentlyHistory: boolean) => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isAssigningToProgram?: boolean;
  setIsAssigningToProgram?: (assigning: boolean) => void;
  setSongsToAssign?: (songs: MasterSong[]) => void;
  programs: MasterProgram[];
  handleToggleSongInProgram: (songId: string, programId: string) => void;
}

export const MasterLibrarySongTable: React.FC<MasterLibrarySongTableProps> = ({
  songs,
  canManage,
  selectedSongIds,
  setSelectedSongIds,
  onSongClick,
  onEditClick,
  onDeleteClick,
  onImportClick,
  onDuplicateClick,
  onToggleHide,
  onToggleHistory,
  currentPage,
  totalPages,
  setCurrentPage,
  programs,
  handleToggleSongInProgram
}) => {
  const safeSongs = Array.isArray(songs) ? songs : [];
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAudio = (e: React.MouseEvent, song: MasterSong) => {
    e.stopPropagation();
    const audioUrl = song.audioUrls?.full || song.audioFile || Object.values(song.audioUrls || {})[0];
    if (!audioUrl) return;

    if (playingSongId === song.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingSongId(null);
      return;
    }

    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingSongId(song.id);

    audio.onended = () => setPlayingSongId(null);
    audio.play().catch(() => setPlayingSongId(null));
  };

  const toggleAll = () => {
    if (selectedSongIds.size === safeSongs.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(safeSongs.map(s => s.id)));
    }
  };

  const toggleOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedSongIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSongIds(newSet);
  };

  if (safeSongs.length === 0) {
    return (
      <div className="px-4 lg:px-6 py-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3 border border-purple-100">
            <Music className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No songs found in this view</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Try switching filter tabs (Active, History, or Hidden) or search with different keywords.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-2 pb-12 space-y-4">
      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                {canManage && (
                  <th className="px-4 py-3 w-10 text-center">
                    <button onClick={toggleAll} className="text-slate-400 hover:text-purple-600 transition-colors">
                      {selectedSongIds.size > 0 && selectedSongIds.size === safeSongs.length ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-4 py-3">Song Details</th>
                <th className="hidden md:table-cell px-4 py-3 text-center">Category</th>
                <th className="hidden sm:table-cell px-4 py-3 text-center">Key & Tempo</th>
                <th className="hidden lg:table-cell px-4 py-3 text-center">Audio Stems</th>
                <th className="hidden xl:table-cell px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {safeSongs.map((song) => {
                const hasAudio = !!(song.audioUrls?.full || song.audioFile || (song.audioUrls && Object.keys(song.audioUrls).length > 0));
                const isPlaying = playingSongId === song.id;
                const stemCount = song.audioUrls ? Object.keys(song.audioUrls).filter(k => song.audioUrls![k]).length : 0;
                const isHidden = !!song.isHQOnly || !!song.isHqOnly || song.status === 'hidden';
                const isHistory = !!song.isHistory || song.status === 'history';

                return (
                  <tr
                    key={song.id}
                    onClick={() => onSongClick(song)}
                    className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Checkbox */}
                    {canManage && (
                      <td className="px-4 py-3 text-center" onClick={(e) => toggleOne(e, song.id)}>
                        <button className="text-slate-400 hover:text-purple-600">
                          {selectedSongIds.has(song.id) ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    )}

                    {/* Song Details */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Audio Play Button Halo */}
                        {hasAudio && (
                          <button
                            onClick={(e) => handlePlayAudio(e, song)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                              isPlaying
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700'
                            }`}
                            title={isPlaying ? 'Pause' : 'Play preview'}
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                              {song.title}
                            </span>
                            {isHidden && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-200 uppercase">
                                Hidden
                              </span>
                            )}
                            {isHistory && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                History
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {song.leadSinger ? `Lead: ${song.leadSinger}` : ''}
                            {song.leadSinger && song.writer ? ' • ' : ''}
                            {song.writer ? `Written by ${song.writer}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="hidden md:table-cell px-4 py-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full border border-purple-100 uppercase">
                        {song.category || 'General'}
                      </span>
                    </td>

                    {/* Key & Tempo */}
                    <td className="hidden sm:table-cell px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {song.key && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                            {song.key}
                          </span>
                        )}
                        {song.tempo && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-semibold">
                            {song.tempo}
                          </span>
                        )}
                        {!song.key && !song.tempo && <span className="text-slate-300 text-xs">—</span>}
                      </div>
                    </td>

                    {/* Audio Stems */}
                    <td className="hidden lg:table-cell px-4 py-3 text-center">
                      {stemCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                          <Volume2 className="w-3 h-3" />
                          {stemCount} {stemCount === 1 ? 'Stem' : 'Stems'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-medium">No Audio</span>
                      )}
                    </td>

                    {/* Status / Imports */}
                    <td className="hidden xl:table-cell px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                        {song.importCount || 0} Imports
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {canManage ? (
                          <>
                            {/* Hide / Unhide Toggle Button */}
                            <button
                              onClick={() => onToggleHide?.(song.id, isHidden)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isHidden
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                              }`}
                              title={isHidden ? 'Unhide song (make visible)' : 'Hide song (HQ only)'}
                            >
                              {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>

                            {/* Move to / Restore from History Toggle */}
                            <button
                              onClick={() => onToggleHistory?.(song.id, isHistory)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isHistory
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-slate-400 hover:bg-slate-100 hover:text-amber-600'
                              }`}
                              title={isHistory ? 'Restore to Active Repertoire' : 'Move to Ministered History'}
                            >
                              {isHistory ? <Undo2 className="w-4 h-4" /> : <History className="w-4 h-4" />}
                            </button>

                            {/* Add to Program Dropdown */}
                            {programs.length > 0 && (
                              <div className="relative">
                                <button
                                  onClick={() => setOpenDropdownId(openDropdownId === song.id ? null : song.id)}
                                  className="p-1.5 hover:bg-purple-100 hover:text-purple-700 text-slate-400 rounded-lg transition-colors"
                                  title="Add to Program"
                                >
                                  <FolderPlus className="w-4 h-4" />
                                </button>

                                {openDropdownId === song.id && (
                                  <>
                                    <div className="fixed inset-0 z-20" onClick={() => setOpenDropdownId(null)} />
                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 min-w-[180px] p-1.5 text-left">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-1 border-b border-slate-100 mb-1">Add to Program</p>
                                      {programs.map(p => {
                                        const isIn = p.songIds?.includes(song.id);
                                        return (
                                          <button
                                            key={p.id}
                                            onClick={() => {
                                              handleToggleSongInProgram(song.id, p.id);
                                              setOpenDropdownId(null);
                                            }}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                                              isIn ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                          >
                                            <span className="truncate">{p.name}</span>
                                            {isIn && <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Duplicate Song Button */}
                            <button
                              onClick={() => onDuplicateClick?.(song)}
                              className="p-1.5 hover:bg-purple-100 hover:text-purple-700 text-slate-400 rounded-lg transition-colors"
                              title="Duplicate Song"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onEditClick(song)}
                              className="p-1.5 hover:bg-purple-100 hover:text-purple-700 text-slate-400 rounded-lg transition-colors"
                              title="Edit song"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onDeleteClick(song.id)}
                              className="p-1.5 hover:bg-rose-100 hover:text-rose-600 text-slate-400 rounded-lg transition-colors"
                              title="Delete song"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onImportClick(song)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <Download className="w-3 h-3" />
                            <span>Import</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compact Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:border-purple-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:border-purple-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
