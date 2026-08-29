"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Film, Plus, RefreshCw, Search, X, Link as LinkIcon,
  Grid3x3, List, Play, Pause, ExternalLink, Trash2, Edit3,
  FileVideo, FileAudio, FileImage, Layers, Sparkles, Check,
  Copy, Volume2, Globe2, ChevronDown, ArrowUpDown, Clock,
  Eye, AlertCircle, Upload, CheckCircle2, ShieldCheck, Download,
  ChevronLeft, ChevronRight, MoreVertical
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

function getMediaThumbnail(item: MediaItem): string | null {
  if (item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')) {
    return item.thumbnail;
  }
  const url = item.url || item.videoUrl || '';
  if (!url) return null;

  // 1. YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return getYouTubeThumbnail(url);
  }

  // 2. Direct Image
  if (item.type === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i) || url.includes('/image/upload/')) {
    return url;
  }

  // 3. Cloudinary Video Poster
  if (url.includes('res.cloudinary.com') && (url.includes('/video/upload/') || url.match(/\.(mp4|mov|webm|mkv)$/i))) {
    return url.replace(/\/video\/upload\/(v\d+\/)?/, '/video/upload/so_1,w_600,h_360,c_fill/$1').replace(/\.[a-zA-Z0-9]+$/, '.jpg');
  }

  return null;
}

function getFormatBadge(url: string, type: string): string {
  if (!url) return type.toUpperCase();
  const clean = url.split('?')[0].toLowerCase();
  const ext = clean.match(/\.([a-z0-9]{2,4})$/);
  if (ext) return ext[1].toUpperCase();
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YOUTUBE';
  if (type === 'video') return 'MP4';
  if (type === 'audio') return 'MP3';
  if (type === 'image') return 'PNG';
  return 'FILE';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

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

  // Export CSV
  const handleExportCSV = () => {
    const itemsToExport = selectedIds.size > 0 
      ? safeItems.filter(i => selectedIds.has(i.id))
      : filteredItems;

    if (itemsToExport.length === 0) return;

    const headers = ['ID', 'Title', 'Type', 'Direct_URL', 'Zone', 'Created_At'];
    const rows = itemsToExport.map(i => [
      i.id,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      i.type,
      `"${i.url || i.videoUrl || ''}"`,
      i.zoneId || 'global',
      i.createdAt || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `media_library_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="relative flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6">

        {/* ── 1. HEADER ROW (Title, Subtitle, Export, Add Product) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Media Assets</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage inventory, pricing, streams, and stems availability across your workspace
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-200 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Product</span>
            </button>
          </div>
        </div>

        {/* ── 2. TOP 4 METRIC STAT CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Products */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Products</span>
              </div>
              <MoreVertical className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.all.toLocaleString()}</div>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="inline-flex items-center font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md text-[10px]">+4.2%</span>
                <span className="text-slate-400">Last 7 days</span>
              </div>
            </div>
          </div>

          {/* Card 2: Video Streams */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Video Streams</span>
              </div>
              <MoreVertical className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.video.toLocaleString()}</div>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="inline-flex items-center font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md text-[10px]">+12.5%</span>
                <span className="text-slate-400">Ministrations</span>
              </div>
            </div>
          </div>

          {/* Card 3: Audio & Stems */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Audio & Stems</span>
              </div>
              <MoreVertical className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.audio.toLocaleString()}</div>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="inline-flex items-center font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md text-[10px]">Multitracks</span>
                <span className="text-slate-400">Vocals & Bands</span>
              </div>
            </div>
          </div>

          {/* Card 4: Sheets & Covers */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sheets & Resources</span>
              </div>
              <MoreVertical className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{stats.image.toLocaleString()}</div>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="inline-flex items-center font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md text-[10px]">+2.1%</span>
                <span className="text-slate-400">Published</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. SEARCH, FILTER & TAB TOOLBAR (Dribbble Layout) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Left: Search input */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by product name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 placeholder-slate-400 shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white border border-slate-200/80 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Tabs (All, Active, Draft, Archived) */}
          <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-1 shadow-2xs self-start md:self-auto">
            {(Object.keys(TYPE_CONFIG) as FilterType[]).map(key => {
              const meta = TYPE_CONFIG[key];
              const isActive = filterType === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {meta.label}
                  <span className={`ml-1.5 text-[10px] ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {stats[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 4. DATA CONTENT: TABLE (Dribbble UI) OR GRID ── */}
        <div className="flex-1 pb-16">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-20 text-center shadow-xs">
              <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Loading catalog assets...</p>
              <p className="text-xs text-slate-400 mt-1">Connecting to Supabase repository...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <Film className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {searchTerm ? `No products matching "${searchTerm}"` : 'No media assets found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Try searching with different terms or click Add Product to upload new media.
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* ─ High-Fidelity Dribbble Product Table ─ */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 text-[11px] font-semibold">
                      <th className="px-4 py-3.5 w-10">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            allSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </button>
                      </th>
                      <th className="px-4 py-3.5">Product Name</th>
                      <th className="px-4 py-3.5 hidden sm:table-cell">ID & Created Date</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Type & Format</th>
                      <th className="px-4 py-3.5 hidden lg:table-cell">Scope / Church</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {paginatedItems.map(item => {
                      const meta = TYPE_CONFIG[item.type] || TYPE_CONFIG.video;
                      const thumb = getMediaThumbnail(item);
                      const formatBadge = getFormatBadge(item.url || item.videoUrl || '', item.type);
                      const isSelected = selectedIds.has(item.id);
                      const isAudioPlaying = playingAudioId === item.id;
                      const isDeleting = deletingId === item.id;
                      const cleanId = `#MED-${(item.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6) || '000000').toUpperCase()}`;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setPreviewItem(item)}
                          className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                            isSelected ? 'bg-indigo-50/30' : isAudioPlaying ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {/* Select Checkbox */}
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleSelectItem(item.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </button>
                          </td>

                          {/* Product / Asset Name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {/* Square Thumbnail */}
                              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60 relative flex items-center justify-center">
                                {thumb ? (
                                  <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                                ) : item.type === 'video' ? (
                                  <FileVideo className="w-5 h-5 text-indigo-500" />
                                ) : item.type === 'audio' ? (
                                  <FileAudio className="w-5 h-5 text-amber-500" />
                                ) : (
                                  <FileImage className="w-5 h-5 text-emerald-500" />
                                )}
                                {item.type === 'audio' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleAudioPlay(item, e)}
                                    className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    {isAudioPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                                  </button>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate max-w-[220px] group-hover:text-indigo-600 transition-colors">
                                  {item.title}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                  {item.type === 'video' ? 'Video Stream' : item.type === 'audio' ? 'Multitrack Vocal Stem' : 'Sheet Chart / Art'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* ID & Created Date */}
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div>
                              <p className="font-mono text-[11px] font-semibold text-slate-800">{cleanId}</p>
                              <p className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</p>
                            </div>
                          </td>

                          {/* Type & Format */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {formatBadge}
                            </span>
                          </td>

                          {/* Scope / Zone */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-[11px] text-slate-500">
                              {item.forHq ? 'HQ Executive' : 'Global Scope'}
                            </span>
                          </td>

                          {/* Status Badge (Shopify Style) */}
                          <td className="px-4 py-3">
                            {item.type === 'video' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Published
                              </span>
                            ) : item.type === 'audio' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Audio Stem
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                Resource
                              </span>
                            )}
                          </td>

                          {/* Actions Kebab Menu */}
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === `tbl-${item.id}` ? null : `tbl-${item.id}`);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                                title="More actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuId === `tbl-${item.id}` && (
                                <div
                                  onClick={e => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCopyLink(item);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                                  >
                                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                    <span>Copy URL</span>
                                  </button>

                                  <a
                                    href={item.url || item.videoUrl}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setOpenMenuId(null)}
                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Download</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleOpenEditModal(item);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit Details</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDelete(item);
                                      setOpenMenuId(null);
                                    }}
                                    disabled={isDeleting}
                                    className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 disabled:opacity-50"
                                  >
                                    {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    <span>Delete Asset</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/40">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800">{(safeCurrentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(safeCurrentPage * pageSize, filteredItems.length)}</span> of{' '}
                  <span className="font-bold text-slate-800">{filteredItems.length.toLocaleString()}</span> products
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs"
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
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ─ Studio Grid Mode ─ */
            <div className="space-y-6 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 w-full">
                {paginatedItems.map(item => {
                  const meta = TYPE_CONFIG[item.type] || TYPE_CONFIG.video;
                  const thumb = getMediaThumbnail(item);
                  const formatBadge = getFormatBadge(item.url || item.videoUrl || '', item.type);
                  const isSelected = selectedIds.has(item.id);
                  const isAudioPlaying = playingAudioId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setPreviewItem(item)}
                      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden group flex flex-col relative cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md'
                          : isAudioPlaying
                          ? 'border-amber-400 ring-2 ring-amber-100 shadow-lg'
                          : 'border-slate-200/80 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Media Card Thumbnail Stage */}
                      <div className="relative h-40 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                        {thumb ? (
                          <>
                            <img
                              src={thumb}
                              alt={item.title}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                          </>
                        ) : item.type === 'video' ? (
                          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex flex-col items-center justify-center text-white/80 p-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 mb-1.5 group-hover:scale-110 transition-transform">
                              <FileVideo className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-white/70 tracking-wide uppercase">Video Stream</span>
                          </div>
                        ) : item.type === 'audio' ? (
                          <div className="w-full h-full bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900/50 flex flex-col items-center justify-center text-white/80 p-4">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 backdrop-blur-md flex items-center justify-center text-amber-300 mb-1.5 group-hover:scale-110 transition-transform">
                              <FileAudio className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-amber-300/80 tracking-wide uppercase">Audio Stem</span>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <FileImage className="w-6 h-6" />
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-black/60 text-white/90 backdrop-blur-md border border-white/10 uppercase">
                            {formatBadge}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSelectItem(item.id);
                            }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all pointer-events-auto shadow-xs ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/90 backdrop-blur-xs text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors" title={item.title}>
                            {item.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── 5. FLOATING BOTTOM SELECTION DOCK (Dribbble Style) ── */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
            <span className="text-xs font-bold bg-indigo-600 px-2.5 py-1 rounded-xl">
              {selectedIds.size} Selected
            </span>
            <div className="h-4 w-px bg-slate-700" />
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-950/50 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-slate-400 hover:text-white rounded-lg ml-1"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[600] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="p-4 sm:p-5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase tracking-wider shrink-0">
                    {previewItem.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white/10 text-white/80 uppercase tracking-wider shrink-0">
                    {getFormatBadge(previewItem.url || previewItem.videoUrl || '', previewItem.type)}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate max-w-md">{previewItem.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewItem.url || previewItem.videoUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    title="Download original file"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewItem(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Player Stage */}
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[380px] relative">
                {previewItem.type === 'video' && getYouTubeId(previewItem.url || previewItem.videoUrl || '') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(previewItem.url || previewItem.videoUrl || '')}?autoplay=1`}
                    title={previewItem.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full min-h-[440px] border-0"
                  />
                ) : previewItem.type === 'video' ? (
                  <video
                    src={previewItem.url || previewItem.videoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full max-h-[540px] bg-black"
                  />
                ) : previewItem.type === 'audio' ? (
                  <div className="p-8 sm:p-12 text-center space-y-6 w-full max-w-lg">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl">
                      <FileAudio className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">{previewItem.title}</h4>
                      {previewItem.description && (
                        <p className="text-xs text-slate-400 mt-1">{previewItem.description}</p>
                      )}
                    </div>
                    <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 shadow-inner">
                      <audio
                        src={previewItem.url || previewItem.videoUrl}
                        controls
                        autoPlay
                        className="w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <img
                    src={previewItem.url}
                    alt={previewItem.title}
                    className="max-h-[540px] object-contain mx-auto"
                  />
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <span className="truncate max-w-sm font-mono text-[11px] text-slate-500">{previewItem.url}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(previewItem)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all active:scale-95"
                  >
                    {copiedId === previewItem.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy URL
                  </button>
                  <a
                    href={previewItem.url || previewItem.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-md shadow-purple-950 active:scale-95"
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
