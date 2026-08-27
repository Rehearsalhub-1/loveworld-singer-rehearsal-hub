"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Film, Plus, RefreshCw, Search, X, Link as LinkIcon,
  Grid3x3, List, Play, Pause, ExternalLink, Trash2, Edit3,
  FileVideo, FileAudio, FileImage, Layers, Sparkles, Check,
  Copy, Volume2, Globe2, ChevronDown, ArrowUpDown, Clock,
  Eye, AlertCircle, Upload, CheckCircle2, ShieldCheck, Download,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import { adminApi as apiClient } from '@/lib/admin-api';

export type MediaType = 'video' | 'audio' | 'image';
export type ViewMode = 'grid' | 'table';
export type FilterType = 'all' | 'video' | 'audio' | 'image';
export type SortOption = 'newest' | 'oldest' | 'title_asc' | 'title_desc';

export interface MediaItem {
  id: string;
  title: string;
  url: string;
  videoUrl?: string;
  type: MediaType;
  thumbnail?: string | null;
  description?: string;
  zoneId?: string;
  forHq?: boolean;
  isYoutube?: boolean;
  views?: number;
  likes?: number;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

const TYPE_CONFIG = {
  all: {
    label: 'All Media',
    icon: Layers,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    activeBg: 'bg-white text-purple-700 shadow-xs',
    badge: 'bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
  },
  video: {
    label: 'Videos',
    icon: FileVideo,
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    activeBg: 'bg-white text-violet-700 shadow-xs',
    badge: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
  },
  audio: {
    label: 'Audio & Stems',
    icon: FileAudio,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    activeBg: 'bg-white text-amber-700 shadow-xs',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
  },
  image: {
    label: 'Sheets & Images',
    icon: FileImage,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    activeBg: 'bg-white text-emerald-700 shadow-xs',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
} as const;

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Global in-memory cache across tab switches (avoids refetching when navigating back)
let globalMediaCache: {
  zoneKey: string;
  items: MediaItem[];
  timestamp: number;
} | null = null;
const CLIENT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

export function invalidateClientMediaCache() {
  globalMediaCache = null;
}

export default function MediaUploadSection() {
  const { selectedZoneId, isGlobalView, selectedZone } = useAdminZone();
  const effectiveZoneId = isGlobalView ? null : (selectedZoneId || selectedZone?.id || null);
  const zoneKey = effectiveZoneId || 'global';

  // Media Data State (initialized from cache if available)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    if (globalMediaCache && globalMediaCache.zoneKey === zoneKey && Date.now() - globalMediaCache.timestamp < CLIENT_CACHE_TTL_MS) {
      return globalMediaCache.items;
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (globalMediaCache && globalMediaCache.zoneKey === zoneKey && Date.now() - globalMediaCache.timestamp < CLIENT_CACHE_TTL_MS) {
      return false;
    }
    return true;
  });
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search & Pagination State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(48);

  // Modal State (Add / Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formType, setFormType] = useState<MediaType>('video');
  const [formDesc, setFormDesc] = useState('');
  const [formForHq, setFormForHq] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Full Screen Preview Modal
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Audio Playback State (In-Card & In-Modal)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Media from Backend API (cached across tab navigation)
  const loadMedia = useCallback(async (isRefresh = false) => {
    // If cache is fresh and not an explicit refresh, don't refetch
    if (!isRefresh && globalMediaCache && globalMediaCache.zoneKey === zoneKey && Date.now() - globalMediaCache.timestamp < CLIENT_CACHE_TTL_MS) {
      setMediaItems(globalMediaCache.items);
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else if (!globalMediaCache || globalMediaCache.items.length === 0) setLoading(true);

    try {
      const res = await apiClient.media.list({ zoneId: effectiveZoneId, limit: 10000 });
      let items: MediaItem[] = [];
      if (Array.isArray(res)) items = res;
      else if (res && typeof res === 'object') {
        if (Array.isArray((res as any).data)) items = (res as any).data;
        else if (Array.isArray((res as any).media)) items = (res as any).media;
        else if (Array.isArray((res as any).items)) items = (res as any).items;
      }

      globalMediaCache = {
        zoneKey,
        items,
        timestamp: Date.now(),
      };
      setMediaItems(items);
    } catch (err) {
      console.error('[MediaUploadSection] Error loading media items:', err);
      if (!globalMediaCache) setMediaItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveZoneId, zoneKey]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm, sortBy, pageSize]);

  // Audio player cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleToggleAudioPlay = (item: MediaItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const audioUrl = item.url || item.videoUrl;
    if (!audioUrl) return;

    if (playingAudioId === item.id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);
    audio.play().catch(() => setPlayingAudioId(null));
    audioRef.current = audio;
    setPlayingAudioId(item.id);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormUrl('');
    setFormType('video');
    setFormDesc('');
    setFormForHq(false);
    setFormError(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: MediaItem) => {
    setEditingItem(item);
    setFormTitle(item.title || '');
    setFormUrl(item.url || item.videoUrl || '');
    setFormType(item.type || 'video');
    setFormDesc(item.description || '');
    setFormForHq(Boolean(item.forHq));
    setFormError(null);
    setShowModal(true);
  };

  // Auto detect type when URL changes in Modal
  const handleUrlChange = (newUrl: string) => {
    setFormUrl(newUrl);
    const lower = newUrl.toLowerCase().trim();
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.match(/\.(mp4|webm|mov|mkv)$/)) {
      setFormType('video');
    } else if (lower.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/)) {
      setFormType('audio');
    } else if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf)$/)) {
      setFormType('image');
    }
  };

  // Save Media (Create / Update)
  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formUrl.trim()) {
      setFormError('Title and Media URL are required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const isYt = Boolean(formUrl.includes('youtube.com') || formUrl.includes('youtu.be'));
    const ytThumb = formType === 'video' ? getYouTubeThumbnail(formUrl) : null;

    const payload = {
      title: formTitle.trim(),
      url: formUrl.trim(),
      videoUrl: formUrl.trim(),
      type: formType,
      thumbnail: ytThumb,
      description: formDesc.trim(),
      zoneId: effectiveZoneId || 'global',
      forHq: formForHq,
      isYoutube: isYt,
    };

    try {
      if (editingItem) {
        // Update
        const res = await apiClient.media.update(editingItem.id, payload);
        const updated: MediaItem = (res && res.data ? res.data : { ...editingItem, ...payload, updatedAt: new Date().toISOString() }) as MediaItem;
        setMediaItems(prev => prev.map(m => m.id === editingItem.id ? updated : m));
      } else {
        // Create
        const res = await apiClient.media.create(payload);
        const created: MediaItem = (res && res.data ? res.data : {
          id: (res?.data as { id?: string } | undefined)?.id || `media_${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        }) as MediaItem;
        setMediaItems(prev => [created, ...(Array.isArray(prev) ? prev : [])]);
      }
      setShowModal(false);
    } catch (err: any) {
      console.error('[MediaUploadSection] Save error:', err);
      setFormError(err?.message || 'Failed to save media asset. Please verify details and connection.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Media
  const handleDelete = async (item: MediaItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    setDeletingId(item.id);

    try {
      await apiClient.media.remove(item.id);
      setMediaItems(prev => prev.filter(m => m.id !== item.id));
      if (previewItem?.id === item.id) setPreviewItem(null);
      if (playingAudioId === item.id) {
        audioRef.current?.pause();
        setPlayingAudioId(null);
      }
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      console.error('[MediaUploadSection] Delete failed:', err);
      alert('Failed to delete media asset.');
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected media assets?`)) return;

    const ids = Array.from(selectedIds);
    setLoading(true);
    try {
      await Promise.all(ids.map(id => apiClient.media.remove(id).catch(() => null)));
      setMediaItems(prev => prev.filter(m => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  // Copy Link to Clipboard
  const handleCopyLink = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url || item.videoUrl || '');
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Safe Filter & Sort
  const safeItems = useMemo(() => (Array.isArray(mediaItems) ? mediaItems : []), [mediaItems]);

  const filteredItems = useMemo(() => {
    return safeItems
      .filter(item => {
        if (!item) return false;
        const matchType = filterType === 'all' || item.type === filterType;
        const q = searchTerm.toLowerCase().trim();
        const matchSearch =
          !q ||
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.url && item.url.toLowerCase().includes(q));
        return matchType && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
        if (sortBy === 'title_desc') return (b.title || '').localeCompare(a.title || '');
        return 0;
      });
  }, [safeItems, filterType, searchTerm, sortBy]);

  const stats = useMemo(() => {
    return {
      all: safeItems.length,
      video: safeItems.filter(m => m?.type === 'video').length,
      audio: safeItems.filter(m => m?.type === 'audio').length,
      image: safeItems.filter(m => m?.type === 'image').length,
    };
  }, [safeItems]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedItems = useMemo(() => {
    if (pageSize >= 10000) return filteredItems;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  const allSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedItems.map(item => item.id)));
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative font-sans">
      {/* ── Dynamic Purple / Indigo Studio Glows ── */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">

        {/* ── 1. STUDIO HEADER & QUICK STATS ── */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-3 w-full">
          <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 w-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Media Studio & Assets</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-700 border border-purple-200">
                    Pro Studio
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-bold text-purple-700">{stats.all.toLocaleString()}</span> assets in catalog ({stats.audio.toLocaleString()} Audio & Stems, {stats.image.toLocaleString()} Sheets, {stats.video.toLocaleString()} Videos)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => loadMedia(true)}
                disabled={refreshing}
                title="Refresh media"
                className="p-2.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
              </button>

              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Media Asset</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. FILTER & TOOLBAR ── */}
        <div className="px-4 sm:px-6 lg:px-8 py-2 space-y-3 w-full">
          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap w-full">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {(Object.keys(TYPE_CONFIG) as FilterType[]).map(key => {
                const meta = TYPE_CONFIG[key];
                const Icon = meta.icon;
                const isActive = filterType === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterType(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? meta.activeBg : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{meta.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? meta.badge : 'bg-slate-200 text-slate-600'
                    }`}>
                      {stats[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bulk Actions Pill Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-1 bg-purple-50 border border-purple-200 rounded-2xl animate-in fade-in duration-200">
                <span className="text-xs font-bold text-purple-800 px-2.5">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Selected</span>
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Main Filter / Search Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets by title, description, or URL..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
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

            {/* Controls: Sort & View Mode */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title_asc">Title (A - Z)</option>
                  <option value="title_desc">Title (Z - A)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-xs text-purple-700' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Grid Studio View"
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table' ? 'bg-white shadow-xs text-purple-700' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Table Data View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. MAIN MEDIA DISPLAY (GRID / TABLE) ── */}
        <div className="px-4 sm:px-6 lg:px-8 pb-12 flex-1 w-full">
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-20 text-center shadow-xs w-full">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Loading media studio assets...</p>
              <p className="text-xs text-slate-400 mt-1">Connecting to Media Catalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 lg:p-16 text-center shadow-xs w-full">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <Film className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                {searchTerm ? `No assets matching "${searchTerm}"` : 'No media assets in this category'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {searchTerm ? 'Try searching with different keywords or switch the filter tab.' : 'Publish video recordings, multitrack audio stems, or chord sheets directly to this zone.'}
              </p>
              {!searchTerm && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Media Asset</span>
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ─ Studio Grid Mode ─ */
            <div className="space-y-6 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 w-full">
                {paginatedItems.map(item => {
                  const meta = TYPE_CONFIG[item.type] || TYPE_CONFIG.video;
                  const Icon = meta.icon;
                  const isImg = item.type === 'image' || Boolean(item.url?.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i)) || Boolean(item.url?.includes('/image/upload/'));
                  const isYt = Boolean(item.url?.includes('youtube.com') || item.url?.includes('youtu.be'));
                  const thumb = item.thumbnail || (isImg ? (item.url || item.videoUrl) : isYt ? getYouTubeThumbnail(item.url) : null);
                  const isSelected = selectedIds.has(item.id);
                  const isAudioPlaying = playingAudioId === item.id;
                  const isDeleting = deletingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden group flex flex-col relative ${
                        isSelected
                          ? 'border-purple-500 ring-2 ring-purple-200 shadow-md'
                          : isAudioPlaying
                          ? 'border-purple-400 ring-2 ring-purple-100 shadow-lg'
                          : 'border-slate-200/80 hover:border-purple-300 hover:shadow-md'
                      }`}
                    >
                      {/* Media Card Thumbnail / Preview Stage */}
                      <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={item.title}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className={`w-14 h-14 rounded-2xl ${meta.bg} flex items-center justify-center`}>
                            <Icon className={`w-7 h-7 ${meta.color}`} />
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 backdrop-blur-md ${meta.bg} ${meta.color} pointer-events-auto`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>

                          {/* Select Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSelectItem(item.id);
                            }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all pointer-events-auto shadow-xs ${
                              isSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/90 backdrop-blur-xs text-slate-400 opacity-0 group-hover:opacity-100 hover:text-purple-600'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>

                        {/* Prominent In-Card Audio Play/Pause Button (Always visible on audio cards) */}
                        {item.type === 'audio' && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleAudioPlay(item, e)}
                            className={`absolute bottom-2.5 right-2.5 z-20 px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95 ${
                              isAudioPlaying
                                ? 'bg-purple-600 text-white ring-2 ring-purple-300 animate-pulse'
                                : 'bg-white/95 text-purple-700 hover:bg-purple-600 hover:text-white'
                            }`}
                          >
                            {isAudioPlaying ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Playing</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                <span>Play</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Active Audio Soundwave Indicator Bar */}
                        {isAudioPlaying && (
                          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 animate-pulse z-10" />
                        )}

                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                          {item.type === 'audio' ? (
                            <button
                              type="button"
                              onClick={(e) => handleToggleAudioPlay(item, e)}
                              className="w-12 h-12 rounded-full bg-white text-purple-700 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                            >
                              {isAudioPlaying ? (
                                <Pause className="w-6 h-6 fill-purple-700" />
                              ) : (
                                <Play className="w-6 h-6 fill-purple-700 ml-0.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPreviewItem(item);
                              }}
                              className="w-12 h-12 rounded-full bg-white text-purple-700 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                              title="View full preview"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          )}
                        </div>

                        {/* Zone / HQ Pill */}
                        {item.forHq && (
                          <div className="absolute bottom-2.5 left-2.5 z-10">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500/90 text-white shadow-xs backdrop-blur-xs flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> HQ Only
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Content Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 line-clamp-1 group-hover:text-purple-700 transition-colors" title={item.title}>
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 min-h-[32px]">
                            {item.description || item.url || 'No description added.'}
                          </p>
                        </div>

                        {/* Card Bottom Meta & Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(item.createdAt)}
                          </span>

                          <div className="flex items-center gap-1">
                            {item.type === 'audio' && (
                              <button
                                type="button"
                                onClick={(e) => handleToggleAudioPlay(item, e)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isAudioPlaying
                                    ? 'text-purple-600 bg-purple-50'
                                    : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                                title={isAudioPlaying ? 'Pause audio' : 'Play audio directly on card'}
                              >
                                {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopyLink(item)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                              title="Copy URL"
                            >
                              {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={item.url || item.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                              title="Open direct link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                              title="Edit metadata"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={isDeleting}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                              title="Delete asset"
                            >
                              {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Showing <span className="font-bold text-slate-800">{filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-bold text-slate-800">{Math.min(safeCurrentPage * pageSize, filteredItems.length)}</span> of{' '}
                    <span className="font-bold text-slate-800">{filteredItems.length.toLocaleString()}</span> items
                  </span>
                  
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                    <span className="text-[11px] text-slate-400">Show:</span>
                    <select
                      value={pageSize}
                      onChange={e => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                      <option value={96}>96</option>
                      <option value={240}>240</option>
                      <option value={10000}>All</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none font-bold transition-all shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = safeCurrentPage;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (safeCurrentPage <= 3) pageNum = i + 1;
                        else if (safeCurrentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = safeCurrentPage - 2 + i;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-xl text-xs font-bold transition-all ${
                              safeCurrentPage === pageNum
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none font-bold transition-all shadow-2xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ─ Studio Table Mode ─ */
            <div className="space-y-6 w-full">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-3.5 w-10">
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              allSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </button>
                        </th>
                        <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Asset Title</th>
                        <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                        <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Direct URL</th>
                        <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Uploaded</th>
                        <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedItems.map(item => {
                        const meta = TYPE_CONFIG[item.type] || TYPE_CONFIG.video;
                        const Icon = meta.icon;
                        const isImg = item.type === 'image' || Boolean(item.url?.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i)) || Boolean(item.url?.includes('/image/upload/'));
                        const isYt = Boolean(item.url?.includes('youtube.com') || item.url?.includes('youtu.be'));
                        const thumb = item.thumbnail || (isImg ? (item.url || item.videoUrl) : isYt ? getYouTubeThumbnail(item.url) : null);
                        const isSelected = selectedIds.has(item.id);
                        const isAudioPlaying = playingAudioId === item.id;
                        const isDeleting = deletingId === item.id;

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/80 transition-colors group ${
                              isSelected ? 'bg-purple-50/40' : isAudioPlaying ? 'bg-purple-50/20' : ''
                            }`}
                          >
                            <td className="px-5 py-3">
                              <button
                                type="button"
                                onClick={() => toggleSelectItem(item.id)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'
                                }`}
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </button>
                            </td>

                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                {/* Play trigger / preview thumb */}
                                {item.type === 'audio' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleAudioPlay(item, e)}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                                      isAudioPlaying ? 'bg-purple-600 text-white animate-pulse' : `${meta.bg} ${meta.color}`
                                    }`}
                                    title={isAudioPlaying ? 'Pause audio' : 'Play audio'}
                                  >
                                    {isAudioPlaying ? (
                                      <Pause className="w-4 h-4 fill-current" />
                                    ) : (
                                      <Play className="w-4 h-4 fill-current ml-0.5" />
                                    )}
                                  </button>
                                ) : thumb ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewItem(item)}
                                    className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 hover:opacity-80 transition-opacity"
                                  >
                                    <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewItem(item)}
                                    className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 transition-transform active:scale-95`}
                                  >
                                    <Icon className={`w-4 h-4 ${meta.color}`} />
                                  </button>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate max-w-[240px]">{item.title}</p>
                                  {item.description && (
                                    <p className="text-[10px] text-slate-400 truncate max-w-[240px]">{item.description}</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3 hidden sm:table-cell">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                            </td>

                            <td className="px-5 py-3 hidden lg:table-cell">
                              <a
                                href={item.url || item.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-slate-400 hover:text-purple-600 flex items-center gap-1 max-w-[200px] truncate"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.url || item.videoUrl}</span>
                              </a>
                            </td>

                          <td className="px-5 py-3 hidden md:table-cell">
                            <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
                          </td>

                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(item)}
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                title="Copy URL"
                              >
                                {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                disabled={isDeleting}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                                title="Delete"
                              >
                                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

            {/* Table Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Showing <span className="font-bold text-slate-800">{filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-bold text-slate-800">{Math.min(safeCurrentPage * pageSize, filteredItems.length)}</span> of{' '}
                    <span className="font-bold text-slate-800">{filteredItems.length.toLocaleString()}</span> items
                  </span>
                  
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                    <span className="text-[11px] text-slate-400">Show:</span>
                    <select
                      value={pageSize}
                      onChange={e => setPageSize(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                      <option value={96}>96</option>
                      <option value={240}>240</option>
                      <option value={10000}>All ({filteredItems.length})</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-bold text-slate-700 px-2">
                      Page {safeCurrentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 4. FULL STANDARD STUDIO MODAL (ADD / EDIT) ── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    {editingItem ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingItem ? 'Edit Media Asset' : 'Add Media Asset'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Register multitrack stream, YouTube video, or sheet charts
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveMedia} className="p-6 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Asset Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Praise Night 27 - Opening Ministration"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Stream / Media URL (YouTube, Cloudinary, MP3, MP4) *
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=... or https://res.cloudinary.com/..."
                      value={formUrl}
                      onChange={e => handleUrlChange(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Media Type & Scope */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Type</label>
                    <div className="relative">
                      <select
                        value={formType}
                        onChange={e => setFormType(e.target.value as MediaType)}
                        className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                      >
                        <option value="video">Video Stream</option>
                        <option value="audio">Audio & Stems</option>
                        <option value="image">Sheet / Graphic</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Visibility</label>
                    <div className="flex items-center gap-2 pt-1.5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={formForHq}
                          onChange={e => setFormForHq(e.target.checked)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>HQ Only / Internal</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief notes, solfa references, or vocal assignment..."
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
                  />
                </div>

                {/* Live Preview Pill if URL exists */}
                {formUrl && (
                  <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center gap-3">
                    {getYouTubeThumbnail(formUrl) ? (
                      <img
                        src={getYouTubeThumbnail(formUrl)!}
                        alt="Preview"
                        className="w-16 h-12 object-cover rounded-xl shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        {formType === 'video' ? <FileVideo className="w-5 h-5 text-purple-600" /> : formType === 'audio' ? <FileAudio className="w-5 h-5 text-amber-600" /> : <FileImage className="w-5 h-5 text-emerald-600" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{formTitle || 'Asset Preview'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{formUrl}</p>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95 disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </span>
                    ) : (
                      editingItem ? 'Save Changes' : 'Add Media'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 5. FULL PREVIEW PLAYER MODAL (VIDEO / AUDIO / IMAGE) ── */}
        {previewItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase tracking-wider">
                    {previewItem.type}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate max-w-md">{previewItem.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Player Stage */}
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[350px]">
                {previewItem.type === 'video' && getYouTubeId(previewItem.url || previewItem.videoUrl || '') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(previewItem.url || previewItem.videoUrl || '')}?autoplay=1`}
                    title={previewItem.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full min-h-[400px] border-0"
                  />
                ) : previewItem.type === 'video' ? (
                  <video
                    src={previewItem.url || previewItem.videoUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[500px]"
                  />
                ) : previewItem.type === 'audio' ? (
                  <div className="p-10 text-center space-y-5 w-full max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                      <FileAudio className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-white">{previewItem.title}</h4>
                    <audio
                      src={previewItem.url || previewItem.videoUrl}
                      controls
                      autoPlay
                      className="w-full"
                    />
                  </div>
                ) : (
                  <img
                    src={previewItem.url}
                    alt={previewItem.title}
                    className="max-h-[500px] object-contain mx-auto"
                  />
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <span className="truncate max-w-sm">{previewItem.url}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(previewItem)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                  >
                    {copiedId === previewItem.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Link
                  </button>
                  <a
                    href={previewItem.url || previewItem.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Source
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
