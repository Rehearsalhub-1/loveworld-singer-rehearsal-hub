"use client";

import React, { useState, useMemo } from 'react';
import { adminApi as apiClient } from '@/lib/admin-api';
import {
  Search,
  Calendar,
  FileText,
  Plus,
  ChevronLeft,
  Edit,
  Trash2,
  Music,
  ArrowDownUp,
  Radio,
  Clock,
  MapPin,
  Sparkles,
  Layers,
  CheckCircle2,
  Volume2,
  Flame,
  Check,
  Filter,
  BarChart3,
  SlidersHorizontal,
  ChevronRight,
  Disc3,
  ListMusic,
  Share2
} from "lucide-react";
import { PraiseNightSong, PraiseNight, Category } from '../../types/supabase';
import { Toast } from '../Toast';
import { useAdminTheme } from './AdminThemeProvider';
import CustomLoader from '@/components/CustomLoader';
import { normalizeSearchString, matchesSearchTokens } from '@/utils/string-utils';
import CloneFromMasterModal from './CloneFromMasterModal';

interface PagesSectionProps {
  allPraiseNights: PraiseNight[] | null;
  loading: boolean;
  selectedPage: PraiseNight | null;
  setSelectedPage: (page: PraiseNight | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  allSongs: PraiseNightSong[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'all' | 'heard' | 'unheard';
  setStatusFilter: (filter: 'all' | 'heard' | 'unheard') => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  showPageModal: boolean;
  setShowPageModal: (show: boolean) => void;
  editingPage: PraiseNight | null;
  setEditingPage: (page: PraiseNight | null) => void;
  newPageName: string;
  setNewPageName: (name: string) => void;
  newPageDate: string;
  setNewPageDate: (date: string) => void;
  newPageLocation: string;
  setNewPageLocation: (location: string) => void;
  newPageDescription: string;
  setNewPageDescription: (description: string) => void;
  newPageCategory: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive';
  setNewPageCategory: (category: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive') => void;
  newPagePageCategory: string;
  setNewPagePageCategory: (pageCategory: string) => void;
  newPageDays: number;
  setNewPageDays: (days: number) => void;
  newPageHours: number;
  setNewPageHours: (hours: number) => void;
  newPageMinutes: number;
  setNewPageMinutes: (minutes: number) => void;
  newPageSeconds: number;
  setNewPageSeconds: (seconds: number) => void;
  newPageBannerImage: string;
  setNewPageBannerImage: (image: string) => void;
  newPageBannerFile: File | null;
  setNewPageBannerFile: (file: File | null) => void;
  isCreatingPage: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  pageToDelete: PraiseNight | null;
  setPageToDelete: (page: PraiseNight | null) => void;
  showCategoryOrderModal: boolean;
  setShowCategoryOrderModal: (show: boolean) => void;
  handleAddPage: () => void;
  handleEditPage: (page: PraiseNight) => void;
  handleUpdatePage: () => void;
  handleDeletePage: (page: PraiseNight) => void;
  confirmDeletePage: () => void;
  cancelDeletePage: () => void;
  handleEditSong: (song: PraiseNightSong) => void;
  handleDeleteSong: (song: PraiseNightSong) => void;
  handleToggleSongStatus: (song: PraiseNightSong) => void;
  handleToggleSongActive: (song: PraiseNightSong) => void;
  allCategories: Category[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  pageCategories: any[];
  showPageCategoryOrderModal: boolean;
  setShowPageCategoryOrderModal: (show: boolean) => void;
  handleUpdatePageCategoryOrder: (updatedCategories: any[]) => Promise<void>;
}

export default function PagesSection(props: PagesSectionProps) {
  const { theme } = useAdminTheme();
  const [pagesDisplayLimit, setPagesDisplayLimit] = useState(25);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [programFilterTab, setProgramFilterTab] = useState<'all' | 'ongoing' | 'pre-rehearsal' | 'archive'>('all');
  const [songSearchQuery, setSongSearchQuery] = useState('');

  const {
    allPraiseNights,
    loading,
    selectedPage,
    setSelectedPage,
    selectedCategory,
    setSelectedCategory,
    allSongs,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setShowPageModal,
    setNewPageName,
    setNewPageDate,
    setNewPageLocation,
    setNewPageDescription,
    setNewPageCategory,
    setNewPageDays,
    setNewPageHours,
    setNewPageMinutes,
    setNewPageSeconds,
    setNewPageBannerImage,
    setNewPageBannerFile,
    handleEditPage,
    handleDeletePage,
    handleEditSong,
    handleDeleteSong,
    handleToggleSongStatus,
    handleToggleSongActive,
    setShowCategoryOrderModal,
    setShowPageCategoryOrderModal
  } = props;

  // Helper to format date safely
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'Date TBD';
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Sorted Pages
  const pages = useMemo(() => {
    if (loading || !allPraiseNights) return [];
    return [...allPraiseNights].sort((a, b) => {
      if (a.category === 'ongoing' && b.category !== 'ongoing') return -1;
      if (a.category !== 'ongoing' && b.category === 'ongoing') return 1;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });
  }, [allPraiseNights, loading]);

  // Filtered pages by tab & search query
  const filteredPages = useMemo(() => {
    let result = pages;
    if (programFilterTab !== 'all') {
      result = result.filter(p => p.category === programFilterTab);
    }
    if (searchTerm) {
      result = result.filter(page =>
        matchesSearchTokens([page.pageCategory, page.name, page.location, (page as any).description], searchTerm)
      );
    }
    return result;
  }, [pages, programFilterTab, searchTerm]);

  // Songs belonging to selected page
  const selectedPageSongs = useMemo<PraiseNightSong[]>(() => {
    if (!selectedPage) return [];
    if (Array.isArray((selectedPage as any).songs) && (selectedPage as any).songs.length > 0) {
      return (selectedPage as any).songs;
    }
    if (allSongs.length > 0) {
      const matching = allSongs.filter(song => {
        const songPageId = song.praiseNightId || (song as any).praisenightid || (song as any).praisenight_id || (song as any).programId || (song as any).pageId;
        return !songPageId || songPageId === selectedPage.id || songPageId === selectedPage.id.toString();
      });
      return matching.length > 0 ? matching : allSongs;
    }
    return [];
  }, [allSongs, selectedPage]);

  // Available song categories for filtering
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    selectedPageSongs.forEach(song => {
      if (song.category && song.category.trim()) categories.add(song.category.trim());
    });
    return Array.from(categories);
  }, [selectedPageSongs]);

  // Progress metrics for selected page
  const pageMetrics = useMemo(() => {
    const total = selectedPageSongs.length;
    const heard = selectedPageSongs.filter(s => s.status === 'heard').length;
    const activeLive = selectedPageSongs.filter(s => (s as any).isActive).length;
    const progressPercent = total > 0 ? Math.round((heard / total) * 100) : 0;
    return { total, heard, unheard: total - heard, activeLive, progressPercent };
  }, [selectedPageSongs]);

  // Filtered songs in right panel
  const filteredSongs = useMemo(() => {
    return selectedPageSongs.filter(song => {
      // Status filter
      if (statusFilter !== 'all' && song.status !== statusFilter) return false;

      // Category filter
      if (selectedCategory && song.category !== selectedCategory) return false;
      if (categoryFilter !== 'all' && song.category !== categoryFilter) return false;

      // Search query: supports spaces, multi-words in any order, trailing space
      if (songSearchQuery) {
        return matchesSearchTokens(
          [
            song.title,
            song.leadSinger,
            song.writer,
            song.conductor,
            song.category,
            song.key,
            (song as any).notes,
            (song as any).lyrics
          ],
          songSearchQuery
        );
      }
      return true;
    });
  }, [selectedPageSongs, songSearchQuery, statusFilter, categoryFilter, selectedCategory]);

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  const handleSelectProgram = (page: PraiseNight) => {
    setSelectedPage(page);
    setSelectedCategory(null);
    setCategoryFilter('all');
    setStatusFilter('all');
    setSongSearchQuery('');
    setCurrentPage(1);
  };

  const openNewPageModal = () => {
    setNewPageName('');
    setNewPageDate('');
    setNewPageLocation('');
    setNewPageDescription('');
    setNewPageCategory('pre-rehearsal');
    setNewPageDays(0);
    setNewPageHours(0);
    setNewPageMinutes(0);
    setNewPageSeconds(0);
    setNewPageBannerImage('');
    setNewPageBannerFile(null);
    setShowPageModal(true);
  };

  if (loading && pages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900/5 h-full">
        <CustomLoader message="Loading Rehearsal Programs & Setlists..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50/50">

      {/* ------------------------------------------------------------- */}
      {/* LEFT COLUMN: Master Rehearsal Programs & Sets Navigator       */}
      {/* ------------------------------------------------------------- */}
      <div className={`w-full lg:w-80 xl:w-96 bg-white border-r border-slate-200/90 flex flex-col h-full z-10 ${selectedPage ? 'hidden lg:flex' : 'flex'}`}>

        {/* Header with Search & Tab Controls */}
        <div className="p-4 border-b border-slate-200/80 space-y-3 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">
                    Programs
                  </h2>
                  <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                    {pages.length}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Rehearsal programs & setlists</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPageCategoryOrderModal(true)}
                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all border border-slate-200/80"
                title="Sort Categories"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={openNewPageModal}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all text-xs font-bold shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search sets, dates, venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-purple-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Program Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl">
            {(['all', 'ongoing', 'pre-rehearsal', 'archive'] as const).map((tab) => {
              const active = programFilterTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setProgramFilterTab(tab)}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg capitalize transition-all ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'pre-rehearsal' ? 'Pre-Reh' : tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Programs List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredPages.slice(0, pagesDisplayLimit).map((page) => {
            const isSelected = selectedPage?.id === page.id;
            const isOngoing = page.category === 'ongoing';
            const isPreRehearsal = page.category === 'pre-rehearsal';

            const thisPageSongs = allSongs.filter(s => {
              const sPid = s.praiseNightId || (s as any).praisenightid || (s as any).praisenight_id || (s as any).pageId;
              return sPid === page.id || sPid === page.id.toString();
            });
            const songCount = page.songCount !== undefined && page.songCount !== null ? page.songCount : thisPageSongs.length;
            const heardCount = thisPageSongs.filter(s => s.status === 'heard').length;
            const percent = songCount > 0 ? Math.round((heardCount / songCount) * 100) : 0;

            return (
              <div
                key={page.id}
                onClick={() => handleSelectProgram(page)}
                className={`group p-3.5 rounded-xl border transition-all duration-150 cursor-pointer relative ${
                  isSelected
                    ? 'bg-purple-50/80 border-purple-300 shadow-xs ring-1 ring-purple-400/30'
                    : 'bg-white border-slate-200/80 hover:border-purple-200 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    
                    {/* Title & Live Status */}
                    <div className="flex items-center gap-1.5">
                      <h3 className={`font-bold text-xs tracking-tight truncate ${isSelected ? 'text-purple-950' : 'text-slate-900'}`} title={page.name}>
                        {page.name}
                      </h3>
                      {isOngoing && (
                        <span className="flex h-1.5 w-1.5 relative flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>

                    {/* Date and Location */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-1">
                      <span className="flex items-center gap-1 truncate">
                        <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{formatDisplayDate(page.date)}</span>
                      </span>
                    </div>

                    {/* Progress Bar & Song Count */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span>{songCount} {songCount === 1 ? 'track' : 'tracks'}</span>
                        <span className={`font-mono ${percent === 100 ? 'text-emerald-600' : 'text-purple-600'}`}>
                          {percent}% heard
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percent === 100 ? 'bg-emerald-500' : 'bg-purple-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Badge Row */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        isOngoing
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isPreRehearsal
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {page.category || 'Standard'}
                      </span>
                      {page.pageCategory && (
                        <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                          {page.pageCategory}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit/Delete Quick Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPage(page);
                      }}
                      className="p-1 hover:bg-white rounded text-slate-400 hover:text-purple-600 transition-colors"
                      title="Edit Program"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(page);
                      }}
                      className="p-1 hover:bg-white rounded text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Program"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPages.length > pagesDisplayLimit && (
            <button
              onClick={() => setPagesDisplayLimit(p => p + 15)}
              className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-xl transition-all shadow-2xs"
            >
              Load More ({filteredPages.length - pagesDisplayLimit} remaining)
            </button>
          )}

          {filteredPages.length === 0 && (
            <div className="p-6 text-center bg-white rounded-xl border border-slate-200">
              <ListMusic className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">No programs found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Try changing filters</p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT COLUMN: Clean, Executive Setlist Rehearsal Manager Workspace */}
      {/* ------------------------------------------------------------- */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden ${!selectedPage ? 'hidden lg:flex' : 'flex'}`}>
        {selectedPage ? (
          <>
            {/* ── Sleek Command Header ───────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200/90 px-4 lg:px-7 py-3.5 flex-shrink-0 shadow-2xs">
              
              {/* Row 1: Set Identity & Primary Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Left: Program Title & Meta */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => setSelectedPage(null)}
                    className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl border border-slate-200 flex-shrink-0 flex items-center gap-1 text-xs font-bold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden xs:inline">Sets</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                        {selectedPage.name}
                      </h1>
                      <select
                        aria-label="Change Program Category"
                        value={selectedPage.category || 'archive'}
                        onChange={async (e) => {
                          const newCat = e.target.value;
                          if (!selectedPage?.id) return;
                          try {
                            const res = await apiClient.patch<{ success: boolean; error?: string }>(
                              `/programs/${encodeURIComponent(selectedPage.id)}`,
                              { category: newCat, status: newCat }
                            );
                            if (res?.success !== false) {
                              props.addToast({
                                message: `Program status changed to ${newCat.toUpperCase()}`,
                                type: 'success',
                              });
                              setSelectedPage({ ...selectedPage, category: newCat as any });
                            }
                          } catch (err: any) {
                            props.addToast({
                              message: err?.message || 'Could not update status',
                              type: 'error',
                            });
                          }
                        }}
                        className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border cursor-pointer outline-none transition-all ${
                          selectedPage.category === 'ongoing'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : selectedPage.category === 'pre-rehearsal'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                            : (selectedPage.category as string) === 'draft'
                            ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <option value="ongoing">🟢 Ongoing</option>
                        <option value="pre-rehearsal">🟡 Pre-Rehearsal</option>
                        <option value="archive">📦 Archive</option>
                        <option value="draft">📝 Draft</option>
                      </select>
                      {pageMetrics.activeLive > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                          <Radio className="w-3 h-3 text-rose-600" /> {pageMetrics.activeLive} LIVE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-400" />
                        {formatDisplayDate(selectedPage.date)}
                      </span>
                      {selectedPage.location && (
                        <span className="hidden sm:flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="w-3 h-3 text-purple-400" />
                          <span className="truncate">{selectedPage.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Consolidated Metrics & Clean Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0">
                  
                  {/* Clean stats pill */}
                  <div className="flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 text-[11px] sm:text-xs">
                      {pageMetrics.heard}/{pageMetrics.total}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono font-bold text-purple-600 text-[11px] sm:text-xs">
                      {pageMetrics.progressPercent}%
                    </span>
                    <div className="w-10 sm:w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${pageMetrics.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditSong({
                        id: '', title: '', status: 'unheard',
                        category: selectedCategory || '',
                        praiseNightId: selectedPage?.id || '',
                        leadSinger: '', writer: '', conductor: '', key: '',
                        tempo: '', leadKeyboardist: '', leadGuitarist: '',
                        drummer: '', comments: [], audioFile: '', history: []
                      })}
                      className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Track</span>
                    </button>

                    <button
                      onClick={() => handleEditPage(selectedPage)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                      title="Edit program details, banner artwork, and countdown timer"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Edit Page</span>
                    </button>

                    <button
                      onClick={() => setShowCloneModal(true)}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                      title="Clone tracks from Master Library"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <span className="hidden md:inline">Clone</span>
                    </button>

                    <button
                      onClick={() => setShowCategoryOrderModal(true)}
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all"
                      title="Reorder category sequences"
                    >
                      <ArrowDownUp className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>

              {/* Row 2: Search, Category Filter & Status Control */}
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                
                {/* Search & Segmented Filter on Mobile/Tablet/Desktop */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  
                  {/* Search box */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search title, singers, keys, tempo..."
                      value={songSearchQuery}
                      onChange={(e) => setSongSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium outline-none focus:border-purple-400 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                    {songSearchQuery && (
                      <button
                        onClick={() => setSongSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Segmented Status Switcher */}
                  <div className="flex items-center p-1 bg-slate-100/90 rounded-xl text-xs font-semibold self-start sm:self-auto w-full sm:w-auto">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg transition-all text-center ${
                        statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All ({selectedPageSongs.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('heard')}
                      className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg transition-all text-center ${
                        statusFilter === 'heard' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-emerald-700'
                      }`}
                    >
                      Heard ({pageMetrics.heard})
                    </button>
                    <button
                      onClick={() => setStatusFilter('unheard')}
                      className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg transition-all text-center ${
                        statusFilter === 'unheard' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-amber-700'
                      }`}
                    >
                      Unheard ({pageMetrics.unheard})
                    </button>
                  </div>
                </div>

                {/* Modern Category Pill Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1 -mx-1 px-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      !selectedCategory
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    <span>All Categories</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      !selectedCategory ? 'bg-purple-700/80 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {selectedPageSongs.length}
                    </span>
                  </button>

                  {availableCategories.map((cat) => {
                    const count = selectedPageSongs.filter(s => s.category === cat).length;
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(isSelected ? null : cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-600 text-white font-bold shadow-xs'
                            : 'bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200/80'
                        }`}
                      >
                        <span>{cat}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-purple-700/80 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Main Song Workspace (Table on Desktop, Cards on Mobile) ── */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 custom-scrollbar">
              {filteredSongs.length > 0 ? (
                <>
                  {/* DESKTOP VIEW: Data Table (Hidden on Mobile) */}
                  <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-3.5 w-10 text-center text-slate-400">#</th>
                            <th className="py-3 px-4">Track & Personnel</th>
                            <th className="py-3 px-3">Category</th>
                            <th className="py-3 px-3 text-center">Key</th>
                            <th className="py-3 px-3 text-center">Tempo</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-3 text-center">Live</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/90">
                          {(songSearchQuery ? filteredSongs : filteredSongs.slice(startIndex, startIndex + itemsPerPage)).map((song, index) => {
                            const isHeard = song.status === 'heard';
                            const isActive = (song as any).isActive;

                            return (
                              <tr key={song.id || index} className="hover:bg-slate-50/60 transition-colors group">
                                
                                {/* Index */}
                                <td className="py-2.5 px-3.5 font-mono font-medium text-slate-400 text-center text-xs">
                                  {startIndex + index + 1}
                                </td>

                                {/* Title & Vocalists */}
                                <td className="py-2.5 px-4 min-w-[200px]">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold flex-shrink-0 transition-colors ${
                                      isActive
                                        ? 'bg-rose-500 text-white shadow-xs animate-pulse'
                                        : isHeard
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-purple-50 text-purple-600'
                                    }`}>
                                      {isActive ? <Radio className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate text-xs group-hover:text-purple-700 transition-colors">
                                        {song.title}
                                      </p>
                                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                                        {song.leadSinger && (
                                          <span className="text-slate-600 truncate font-medium">
                                            {song.leadSinger}
                                          </span>
                                        )}
                                        {song.writer && (
                                          <span className="text-slate-400 truncate">
                                            • {song.writer}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Category */}
                                <td className="py-2.5 px-3">
                                  <span className="inline-block bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                                    {song.category || 'Standard'}
                                  </span>
                                </td>

                                {/* Key */}
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block font-mono font-bold text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {song.key || '—'}
                                  </span>
                                </td>

                                {/* Tempo */}
                                <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                                  {song.tempo ? `${song.tempo}` : '—'}
                                </td>

                                {/* Rehearsal Status Toggle */}
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleToggleSongStatus(song)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                                      isHeard
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                                    }`}
                                    title="Click to toggle Heard / Unheard"
                                  >
                                    {isHeard ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span>Heard</span>
                                      </>
                                    ) : (
                                      <span>Unheard</span>
                                    )}
                                  </button>
                                </td>

                                {/* Live Active Toggle */}
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleToggleSongActive(song)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                                      isActive
                                        ? 'bg-rose-600 text-white shadow-2xs animate-pulse'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                    }`}
                                    title={isActive ? 'Song is currently LIVE broadcast' : 'Click to activate LIVE broadcast'}
                                  >
                                    {isActive ? '● LIVE' : 'OFF'}
                                  </button>
                                </td>

                                {/* Action Buttons */}
                                <td className="py-2.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleEditSong(song)}
                                      className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                      title="Edit Track"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSong(song)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                      title="Delete Track"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* MOBILE VIEW: Touch-Friendly Responsive Song Cards */}
                  <div className="md:hidden space-y-2.5">
                    {(songSearchQuery ? filteredSongs : filteredSongs.slice(startIndex, startIndex + itemsPerPage)).map((song, index) => {
                      const isHeard = song.status === 'heard';
                      const isActive = (song as any).isActive;

                      return (
                        <div
                          key={song.id || index}
                          className={`p-3.5 rounded-2xl border transition-all bg-white shadow-2xs ${
                            isActive
                              ? 'border-rose-300 ring-1 ring-rose-400/20'
                              : 'border-slate-200/90'
                          }`}
                        >
                          {/* Top Row: Track Number, Title, Rehearsal Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="font-mono text-xs font-bold text-slate-400 pt-0.5">
                                #{startIndex + index + 1}
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">
                                  {song.title}
                                </h4>
                                {(song.leadSinger || song.writer) && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {song.leadSinger ? `Vocals: ${song.leadSinger}` : ''}
                                    {song.writer ? ` • By ${song.writer}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Heard Toggle */}
                            <button
                              onClick={() => handleToggleSongStatus(song)}
                              className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase transition-all ${
                                isHeard
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {isHeard ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Heard</span>
                                </>
                              ) : (
                                <span>Unheard</span>
                              )}
                            </button>
                          </div>

                          {/* Middle Row: Category, Key, Tempo Meta Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100 text-xs">
                            <span className="bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                              {song.category || 'Standard'}
                            </span>
                            {song.key && (
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                                Key: {song.key}
                              </span>
                            )}
                            {song.tempo && (
                              <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {song.tempo} BPM
                              </span>
                            )}
                          </div>

                          {/* Bottom Row: Quick Actions (Live Broadcast, Edit, Delete) */}
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleToggleSongActive(song)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                                isActive
                                  ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <Radio className="w-3 h-3" />
                              <span>{isActive ? 'Live Broadcast' : 'Go Live'}</span>
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditSong(song)}
                                className="flex items-center gap-1 px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteSong(song)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {!songSearchQuery && totalPages > 1 && (
                    <div className="mt-4 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium text-[11px]">
                        {songSearchQuery
                          ? `${filteredSongs.length} result${filteredSongs.length !== 1 ? 's' : ''} matching "${songSearchQuery}"`
                          : `Showing ${startIndex + 1}–${Math.min(startIndex + itemsPerPage, filteredSongs.length)} of ${filteredSongs.length} tracks`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold disabled:opacity-30 border border-slate-200 transition-all"
                        >
                          Prev
                        </button>
                        <span className="px-2 text-xs font-mono text-slate-500">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold disabled:opacity-30 border border-slate-200 transition-all"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-16 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 p-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5">
                    <Music className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No tracks found</h3>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
                    {songSearchQuery || selectedCategory || statusFilter !== 'all'
                      ? 'No songs match your current filter criteria.'
                      : 'Add new songs or clone existing master tracks to build this set.'}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => handleEditSong({
                        id: '',
                        title: '',
                        status: 'unheard',
                        category: selectedCategory || '',
                        praiseNightId: selectedPage?.id || '',
                        leadSinger: '',
                        writer: '',
                        conductor: '',
                        key: '',
                        tempo: '',
                        leadKeyboardist: '',
                        leadGuitarist: '',
                        drummer: '',
                        comments: [],
                        audioFile: '',
                        history: []
                      })}
                      className="flex items-center gap-1 px-3.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Track</span>
                    </button>
                    <button
                      onClick={() => setShowCloneModal(true)}
                      className="flex items-center gap-1 px-3.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <span>Clone from Master</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
              <Disc3 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Select a Program</h3>
            <p className="text-xs text-slate-400 mt-0.5">Choose a rehearsal set from the left panel to manage songs.</p>
          </div>
        )}
      </div>

      {/* Clone From Master Modal */}
      {selectedPage && (
        <CloneFromMasterModal
          isOpen={showCloneModal}
          onClose={() => setShowCloneModal(false)}
          onClone={handleEditSong}
          praiseNightId={selectedPage.id}
          defaultCategory={availableCategories.length > 0 ? availableCategories[0] : ''}
        />
      )}

    </div>
  );
}
