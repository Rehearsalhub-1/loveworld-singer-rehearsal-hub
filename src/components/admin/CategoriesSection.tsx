"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus,
  Edit2,
  Trash2,
  Tag,
  X,
  Music,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowLeft,
  Layers,
  Sparkles,
  Play,
  Pause,
  Eye,
  Folder,
  Volume2
} from "lucide-react";
import { Category, PraiseNightSong } from '../../types/supabase';
import { Toast } from '../Toast';
import { adminApi as apiClient } from '@/lib/admin-api';
import { useAdminZone } from '@/contexts/AdminZoneContext';

interface CategoriesSectionProps {
  allCategories?: Category[];
  allSongs?: PraiseNightSong[];
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  statusFilter?: 'all' | 'heard' | 'unheard';
  setStatusFilter?: (filter: 'all' | 'heard' | 'unheard') => void;
  categoryFilter?: string;
  setCategoryFilter?: (filter: string) => void;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  itemsPerPage?: number;
  showCategoryModal?: boolean;
  setShowCategoryModal?: (show: boolean) => void;
  editingCategory?: Category | null;
  setEditingCategory?: (category: Category | null) => void;
  newPageCategoryName?: string;
  setNewPageCategoryName?: (name: string) => void;
  showDeleteCategoryDialog?: boolean;
  setShowDeleteCategoryDialog?: (show: boolean) => void;
  categoryToDelete?: Category | null;
  setCategoryToDelete?: (category: Category | null) => void;
  handleAddCategory?: () => void;
  handleEditCategory?: (categoryName: string) => void;
  handleUpdateCategory?: () => void;
  handleDeleteCategory?: (category: Category) => void;
  confirmDeleteCategory?: () => void;
  cancelDeleteCategory?: () => void;
  handleEditCategoryContent?: (content: any) => void;
  handleDeleteCategoryContent?: (id: string) => void;
  addToast?: (toast: Omit<Toast, 'id'>) => void;
}

export default function CategoriesSection(props: CategoriesSectionProps) {
  const { selectedZoneId, isGlobalView, selectedZone } = useAdminZone();
  const effectiveZoneId = isGlobalView ? null : (selectedZoneId || selectedZone?.id || null);

  const [internalSongs, setInternalSongs] = useState<any[]>(props.allSongs || []);
  const [internalCategories, setInternalCategories] = useState<Category[]>(props.allCategories || []);
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState(props.searchTerm || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Local Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<{ id?: string; name: string; description?: string; color?: string } | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  // Local Audio Player
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handlePlaySong = (songId: string, audioUrl?: string) => {
    if (!audioUrl) return;
    if (playingSongId === songId) {
      audioElement?.pause();
      setPlayingSongId(null);
      return;
    }
    audioElement?.pause();
    const newAudio = new Audio(audioUrl);
    newAudio.onended = () => setPlayingSongId(null);
    newAudio.onerror = () => setPlayingSongId(null);
    newAudio.play().catch(() => setPlayingSongId(null));
    setAudioElement(newAudio);
    setPlayingSongId(songId);
  };

  useEffect(() => {
    return () => {
      audioElement?.pause();
    };
  }, [audioElement]);

  // Fetch real songs and categories scoped to selected admin zone
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const zoneQuery = effectiveZoneId ? `?zoneId=${encodeURIComponent(effectiveZoneId)}` : '';

      // 1. Fetch categories
      try {
        const catRes = await apiClient.get<any>(`/categories${zoneQuery}`);
        if (catRes && Array.isArray(catRes.data)) {
          setInternalCategories(catRes.data);
        } else if (Array.isArray(catRes)) {
          setInternalCategories(catRes);
        } else {
          setInternalCategories([]);
        }
      } catch {
        setInternalCategories([]);
      }

      // 2. Fetch songs scoped to current zone (only fetch global master songs if in global HQ view)
      const fetchedSongs: any[] = [];
      if (isGlobalView || !effectiveZoneId) {
        try {
          const minRes = await apiClient.get<any>('/ministered_songs');
          if (minRes && Array.isArray(minRes.data)) {
            fetchedSongs.push(...minRes.data);
          } else if (Array.isArray(minRes)) {
            fetchedSongs.push(...minRes);
          }
        } catch {
          // non-blocking
        }
      }

      try {
        const songsRes = await apiClient.get<any>(`/songs${zoneQuery}`);
        if (songsRes && Array.isArray(songsRes.data)) {
          // Merge unique by title/id
          songsRes.data.forEach((s: any) => {
            if (!fetchedSongs.some(f => f.id === s.id || (f.title && f.title.toLowerCase() === (s.title || '').toLowerCase()))) {
              fetchedSongs.push(s);
            }
          });
        } else if (Array.isArray(songsRes)) {
          songsRes.forEach((s: any) => {
            if (!fetchedSongs.some(f => f.id === s.id || (f.title && f.title.toLowerCase() === (s.title || '').toLowerCase()))) {
              fetchedSongs.push(s);
            }
          });
        }
      } catch {
        // non-blocking
      }

      try {
        const progRes = await apiClient.get<any>(`/programs${zoneQuery}`);
        const progs = (progRes && Array.isArray(progRes.data)) ? progRes.data : (Array.isArray(progRes) ? progRes : []);
        progs.forEach((p: any) => {
          if (Array.isArray(p.songs)) {
            p.songs.forEach((s: any) => {
              if (!fetchedSongs.some(f => f.id === s.id || (f.title && f.title.toLowerCase() === (s.title || '').toLowerCase()))) {
                fetchedSongs.push(s);
              }
            });
          }
        });
      } catch {
        // non-blocking
      }

      if (Array.isArray(props.allSongs) && props.allSongs.length > 0) {
        props.allSongs.forEach((s: any) => {
          if (!fetchedSongs.some(f => f.id === s.id || (f.title && f.title.toLowerCase() === (s.title || '').toLowerCase()))) {
            fetchedSongs.push(s);
          }
        });
      }

      setInternalSongs(fetchedSongs);
    } catch (e) {
      console.error('Failed to load categories and songs:', e);
    } finally {
      setLoading(false);
    }
  }, [effectiveZoneId, isGlobalView, props.allSongs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Merge categories with dynamic categories found across songs
  const combinedCategories = useMemo(() => {
    const songCategories = new Set<string>();
    internalSongs.forEach(s => {
      const cat = (s.category || '').trim();
      if (cat) {
        cat.split(',').forEach((c: string) => {
          const trimmed = c.trim();
          if (trimmed) songCategories.add(trimmed);
        });
      }
    });

    const existingNames = new Set(internalCategories.map((c: any) => (c.name || '').trim().toLowerCase()));

    const generated: Category[] = Array.from(songCategories)
      .filter(name => !existingNames.has(name.toLowerCase()))
      .map((name, idx) => ({
        id: `gen-${idx + 1}`,
        name,
        description: `Collection of songs cataloged under ${name}`,
        icon: 'Music',
        color: '#9333ea',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

    return [...internalCategories, ...generated];
  }, [internalCategories, internalSongs]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!localSearch.trim()) return combinedCategories;
    const term = localSearch.toLowerCase().trim();
    return combinedCategories.filter(cat => 
      cat.name.toLowerCase().includes(term) || 
      (cat.description || '').toLowerCase().includes(term)
    );
  }, [combinedCategories, localSearch]);

  // Category statistics helper
  const getCategoryStats = (categoryName: string) => {
    const norm = categoryName.trim().toLowerCase();
    const songs = internalSongs.filter(s => {
      const cat = (s.category || '').toLowerCase();
      return cat.includes(norm);
    });
    const total = songs.length;
    const heard = songs.filter(s => s.status === 'heard').length;
    return { total, heard, pending: total - heard, songs };
  };

  // Global statistics
  const globalStats = useMemo(() => {
    const categorizedCount = internalSongs.filter(s => !!s.category).length;
    return {
      totalCategories: combinedCategories.length,
      totalSongs: internalSongs.length,
      categorizedSongs: categorizedCount,
    };
  }, [combinedCategories, internalSongs]);

  // Handle Save Category
  const handleSaveModalCategory = async () => {
    if (!modalCategory?.name.trim()) return;
    setSavingCategory(true);
    try {
      if (modalCategory.id && !modalCategory.id.startsWith('gen-')) {
        // Update existing
        await apiClient.patch(`/categories/${encodeURIComponent(modalCategory.id)}`, {
          name: modalCategory.name.trim(),
          description: modalCategory.description?.trim() || '',
          color: modalCategory.color || '#9333ea',
          zoneId: effectiveZoneId
        });
        setInternalCategories(prev => prev.map(c => c.id === modalCategory.id ? { ...c, ...modalCategory, zoneId: effectiveZoneId } : c));
      } else {
        // Create new
        const res = await apiClient.post<any>('/categories', {
          name: modalCategory.name.trim(),
          description: modalCategory.description?.trim() || '',
          color: modalCategory.color || '#9333ea',
          zoneId: effectiveZoneId
        });
        const created = res?.data || {
          id: `cat_${Date.now()}`,
          name: modalCategory.name.trim(),
          description: modalCategory.description?.trim() || '',
          color: modalCategory.color || '#9333ea',
          zoneId: effectiveZoneId,
          isActive: true
        };
        setInternalCategories(prev => [created, ...prev]);
      }
      setShowModal(false);
      setModalCategory(null);
      props.addToast?.({ message: 'Category saved successfully', type: 'success' });
    } catch (e: any) {
      console.error(e);
      props.addToast?.({ message: e?.message || 'Failed to save category', type: 'error' });
    } finally {
      setSavingCategory(false);
    }
  };

  // Handle Delete Category
  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Delete the category "${category.name}"?`)) return;
    try {
      if (category.id && !category.id.startsWith('gen-')) {
        await apiClient.delete(`/categories/${encodeURIComponent(category.id)}`);
      }
      setInternalCategories(prev => prev.filter(c => c.id !== category.id && c.name !== category.name));
      props.addToast?.({ message: 'Category deleted', type: 'success' });
    } catch (e: any) {
      console.error(e);
      props.addToast?.({ message: 'Failed to delete category', type: 'error' });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden font-sans relative">
      {/* Ambient Studio Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Scroll Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── 1. EXECUTIVE HERO COMMAND BAR ── */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Song Categories</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  {isGlobalView ? 'Global HQ Scope' : selectedZone?.name || 'Selected Zone'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                  {combinedCategories.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Classify and manage repertoire songs by genre, service theme, and liturgical category.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setModalCategory({ name: '', description: '', color: '#9333ea' });
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-2xl shadow-md shadow-purple-200 flex items-center gap-2 transition-transform active:scale-95 self-start lg:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>

        {/* ── 2. METRIC KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Categories</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tabular-nums">{globalStats.totalCategories}</span>
              <span className="text-xs font-bold text-slate-400">genres & tags</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Catalog Diversity</span>
              <span className="font-bold text-purple-700">Repertoire</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-fuchsia-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-fuchsia-600 uppercase tracking-widest">Repertoire Songs</span>
              <div className="w-9 h-9 rounded-xl bg-fuchsia-50 text-fuchsia-700 flex items-center justify-center border border-fuchsia-100">
                <Music className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-fuchsia-700 tabular-nums">{globalStats.totalSongs}</span>
              <span className="text-xs font-bold text-fuchsia-600/80">total songs</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Zone Song Library</span>
              <span className="font-bold text-fuchsia-700">Indexed</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Categorized Index</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-700 tabular-nums">{globalStats.categorizedSongs}</span>
              <span className="text-xs font-bold text-emerald-600/80">assigned songs</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Coverage Ratio</span>
              <span className="font-bold text-emerald-700">
                {globalStats.totalSongs > 0 ? `${Math.round((globalStats.categorizedSongs / globalStats.totalSongs) * 100)}%` : '100%'}
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. SEARCH CONTROL BAR ── */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search song categories..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      {/* Selected Category Drill-down */}
      {selectedCategory ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {(() => {
            const stats = getCategoryStats(selectedCategory);
            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Category: "{selectedCategory}"</h3>
                      <p className="text-xs text-slate-400">{stats.total} songs assigned to this category</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all active:scale-95 self-start sm:self-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Categories</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.songs.map((song) => {
                    const audioUrl = song.audioUrls?.full || song.audioFile || (song.audioUrls && Object.values(song.audioUrls)[0]);
                    const isPlaying = playingSongId === song.id;

                    return (
                      <div
                        key={song.id}
                        className="bg-white border border-slate-100 rounded-3xl p-4 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {audioUrl ? (
                            <button
                              type="button"
                              onClick={() => handlePlaySong(song.id, audioUrl)}
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                                isPlaying
                                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200 animate-pulse'
                                  : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                              }`}
                              title={isPlaying ? 'Pause' : 'Play song preview'}
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>
                          ) : (
                            <div className="w-9 h-9 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                              <Music className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate">{song.title}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {song.leadSinger ? `Lead: ${song.leadSinger}` : song.writer ? `By: ${song.writer}` : 'No vocalist'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {song.key && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                              Key {song.key}
                            </span>
                          )}
                          {song.tempo && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold">
                              {song.tempo}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {stats.songs.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xs">
                    <Music className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No songs currently cataloged under "{selectedCategory}"</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        /* Categories Cards Grid */
        filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => {
              const stats = getCategoryStats(category.name);

              return (
                <div
                  key={category.id}
                  className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between group shadow-xs"
                >
                  <div
                    className="cursor-pointer space-y-3"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-200">
                        <Tag className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                        {stats.total} Songs
                      </span>
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900 text-base group-hover:text-purple-600 transition-colors truncate">
                        {category.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {category.description || `Collection of songs under ${category.name}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(category.name);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl text-xs font-bold transition-all border border-purple-200 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Songs ({stats.total})</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalCategory({
                          id: category.id,
                          name: category.name,
                          description: category.description || '',
                          color: category.color || '#9333ea'
                        });
                        setShowModal(true);
                      }}
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all border border-slate-200/60 active:scale-95"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(category);
                      }}
                      className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-2xl transition-all border border-slate-200/60 active:scale-95"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-xs">
            <div className="w-20 h-20 bg-purple-50 text-purple-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
              <Tag className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">No Categories Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
              {localSearch ? 'No song categories match your search.' : 'Create a category to group ministered praise songs.'}
            </p>
          </div>
        )
      )}
      </div>

      {/* Add / Edit Category Modal */}
      {showModal && modalCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[500] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {modalCategory.id ? 'Edit Song Category' : 'New Song Category'}
                  </h3>
                  <p className="text-xs text-slate-400">Classify songs for ministering rehearsals</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalCategory(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalCategory.name}
                  onChange={(e) => setModalCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="e.g., Worship & Adoration, Hymns of Praise, Anthems"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={modalCategory.description || ''}
                  onChange={(e) => setModalCategory(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Describe this category..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setModalCategory(null);
                }}
                className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalCategory}
                disabled={savingCategory || !modalCategory.name.trim()}
                className="flex-1 px-4 py-2.5 text-white bg-purple-600 hover:bg-purple-700 rounded-2xl font-bold text-xs transition-all shadow-md shadow-purple-200 active:scale-95 disabled:opacity-50"
              >
                {savingCategory ? 'Saving...' : modalCategory.id ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
