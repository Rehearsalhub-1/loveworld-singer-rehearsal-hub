import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export interface MasterSong {
  [key: string]: any;
  id: string;
  title: string;
  lyrics?: string;
  artist?: string;
  writer?: string;
  leadSinger?: string;
  key?: string;
  tempo?: string;
  category?: string;
  audioUrls?: Record<string, string>;
  audioFile?: string;
  isHQOnly?: boolean;
  isHqOnly?: boolean;
  isHistory?: boolean;
  status?: 'active' | 'history' | 'hidden' | string;
  importCount?: number;
  categories?: string[];
  customParts?: Record<string, string>;
  publishedAt?: string;
}

export interface MasterProgram {
  [key: string]: any;
  id: string;
  name: string;
  description?: string;
  date?: string;
  songIds?: string[];
}

export const MasterLibraryService = {
  getMasterSongs: async (): Promise<MasterSong[]> => {
    try {
      const endpoints = ['/ministered_songs', '/ministered-songs', '/master', '/songs/master', '/songs/ministered'];
      for (const ep of endpoints) {
        try {
          const res = await apiClient.get<{ success?: boolean; data?: MasterSong[] }>(ep);
          if (res && Array.isArray(res.data) && res.data.length > 0) {
            return res.data;
          }
          if (Array.isArray(res)) {
            return res;
          }
        } catch {
          // fallback
        }
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch ministered songs:', err);
      return [];
    }
  },
  createMasterSong: async (data: any) => await apiClient.post('/master', data),
  duplicateMasterSong: async (song: MasterSong): Promise<any> => {
    const { id, importCount, createdAt, updatedAt, ...rest } = song;
    const duplicatedData = {
      ...rest,
      title: `${song.title || 'Untitled'} (Copy)`,
      isHqOnly: true,
      status: 'hidden',
      sourceType: 'duplicate',
    };
    return await apiClient.post('/master', duplicatedData);
  },
  updateMasterSong: async (id: string, data: any) => await apiClient.patch(`/master/${encodeURIComponent(id)}`, data),
  deleteMasterSong: async (id: string) => await apiClient.delete(`/master/${encodeURIComponent(id)}`),
  importMasterSongToZone: async (song: any, zoneId: string) => await apiClient.post('/songs/praise-night', { ...song, zoneId })
};

export const useMasterLibrary = (isHQAdmin: boolean = false) => {
  const [masterSongs, setMasterSongs] = useState<MasterSong[]>([]);
  const [programs, setPrograms] = useState<MasterProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedLeadSinger, setSelectedLeadSinger] = useState('');
  const [isLeadSingerDropdownOpen, setIsLeadSingerDropdownOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [isProgramsDropdownOpen, setIsProgramsDropdownOpen] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'hidden' | 'all'>('active');

  // Modals & Selection
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [showOrderProgramsModal, setShowOrderProgramsModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<MasterSong | null>(null);
  const [isAssigningToProgram, setIsAssigningToProgram] = useState(false);
  const [songsToAssign, setSongsToAssign] = useState<MasterSong[]>([]);

  // Import from Internal State
  const [availableForPublish, setAvailableForPublish] = useState<any[]>([]);
  const [selectedForPublish, setSelectedForPublish] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const songsData = await MasterLibraryService.getMasterSongs();
      setMasterSongs(songsData);

      // Fetch programs
      try {
        const progRes = await apiClient.get<{ success?: boolean; data?: MasterProgram[] }>('/programs');
        if (progRes && Array.isArray(progRes.data)) {
          setPrograms(progRes.data);
        }
      } catch {
        // non-blocking
      }

      // Fetch internal songs for Import from Internal
      try {
        const intRes = await apiClient.get<{ success?: boolean; data?: any[] }>('/songs');
        if (intRes && Array.isArray(intRes.data)) {
          setAvailableForPublish(intRes.data);
        } else if (Array.isArray(intRes)) {
          setAvailableForPublish(intRes);
        }
      } catch {
        // non-blocking
      }
    } catch (err: any) {
      console.error('Error loading master library:', err);
      setError(err?.message || 'Failed to load master library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Lead Singers list
  const leadSingers = useMemo(() => {
    const set = new Set<string>();
    masterSongs.forEach(s => {
      if (s.leadSinger?.trim()) set.add(s.leadSinger.trim());
    });
    return Array.from(set).sort();
  }, [masterSongs]);

  // Filtered and Sorted Songs
  const filteredSongs = useMemo(() => {
    return masterSongs.filter(song => {
      const isHidden = !!song.isHQOnly || !!song.isHqOnly || song.status === 'hidden';
      const isHistory = !!song.isHistory || song.status === 'history';

      if (activeTab === 'active') {
        if (isHidden || isHistory) return false;
      } else if (activeTab === 'history') {
        if (!isHistory) return false;
      } else if (activeTab === 'hidden') {
        if (!isHidden) return false;
      }

      if (selectedLeadSinger && song.leadSinger !== selectedLeadSinger) return false;
      if (selectedProgramId && selectedProgramId !== 'all') {
        const prog = programs.find(p => p.id === selectedProgramId);
        if (prog && !prog.songIds?.includes(song.id)) return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const title = String(song.title || '').toLowerCase();
      const writer = String(song.writer || song.artist || '').toLowerCase();
      const singer = String(song.leadSinger || '').toLowerCase();
      const category = String(song.category || '').toLowerCase();
      return title.includes(q) || writer.includes(q) || singer.includes(q) || category.includes(q);
    }).sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
    });
  }, [masterSongs, activeTab, searchTerm, selectedLeadSinger, selectedProgramId, sortOrder, programs]);

  // Paginated Songs
  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage) || 1;
  const paginatedSongs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSongs.slice(start, start + itemsPerPage);
  }, [filteredSongs, currentPage, itemsPerPage]);

  // Stats
  const stats = useMemo(() => {
    const totalImports = masterSongs.reduce((acc, s) => acc + (s.importCount || 0), 0);
    const sortedByImports = [...masterSongs].sort((a, b) => (b.importCount || 0) - (a.importCount || 0));
    const activeCount = masterSongs.filter(s => !s.isHQOnly && !s.isHqOnly && !s.isHistory && s.status !== 'hidden' && s.status !== 'history').length;
    const historyCount = masterSongs.filter(s => s.isHistory || s.status === 'history').length;
    const hiddenCount = masterSongs.filter(s => s.isHQOnly || s.isHqOnly || s.status === 'hidden').length;

    return {
      totalSongs: masterSongs.length,
      activeSongs: activeCount,
      historySongs: historyCount,
      hiddenSongs: hiddenCount,
      totalImports,
      mostImported: sortedByImports.slice(0, 5)
    };
  }, [masterSongs]);

  // Hide / Unhide Action
  const handleToggleHideSong = async (id: string, currentHidden: boolean) => {
    const newHidden = !currentHidden;
    try {
      await MasterLibraryService.updateMasterSong(id, {
        isHqOnly: newHidden,
        status: newHidden ? 'hidden' : 'active'
      });
      setMasterSongs(prev => prev.map(s => s.id === id ? { ...s, isHQOnly: newHidden, isHqOnly: newHidden, status: newHidden ? 'hidden' : 'active' } : s));
    } catch (e) {
      console.error('Failed to toggle hide:', e);
    }
  };

  // Move to / Remove from History Action
  const handleToggleHistorySong = async (id: string, currentHistory: boolean) => {
    const newHistory = !currentHistory;
    try {
      await MasterLibraryService.updateMasterSong(id, {
        isHistory: newHistory,
        status: newHistory ? 'history' : 'active'
      });
      setMasterSongs(prev => prev.map(s => s.id === id ? { ...s, isHistory: newHistory, status: newHistory ? 'history' : 'active' } : s));
    } catch (e) {
      console.error('Failed to toggle history:', e);
    }
  };

  // Bulk Hide / Unhide
  const handleBulkHide = async (hide: boolean) => {
    const ids = Array.from(selectedSongIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => MasterLibraryService.updateMasterSong(id, { isHqOnly: hide, status: hide ? 'hidden' : 'active' })));
      setMasterSongs(prev => prev.map(s => ids.includes(s.id) ? { ...s, isHQOnly: hide, isHqOnly: hide, status: hide ? 'hidden' : 'active' } : s));
      setSelectedSongIds(new Set());
    } catch (e) {
      console.error('Failed bulk hide:', e);
    }
  };

  // Bulk Move to / Remove from History
  const handleBulkMoveToHistory = async (toHistory: boolean) => {
    const ids = Array.from(selectedSongIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => MasterLibraryService.updateMasterSong(id, { isHistory: toHistory, status: toHistory ? 'history' : 'active' })));
      setMasterSongs(prev => prev.map(s => ids.includes(s.id) ? { ...s, isHistory: toHistory, status: toHistory ? 'history' : 'active' } : s));
      setSelectedSongIds(new Set());
    } catch (e) {
      console.error('Failed bulk history:', e);
    }
  };

  // Duplicate Song
  const handleDuplicateSong = async (song: MasterSong) => {
    try {
      await MasterLibraryService.duplicateMasterSong(song);
      await loadData(true);
      return { success: true };
    } catch (err) {
      console.error('Failed to duplicate song:', err);
      return { success: false };
    }
  };

  // Optimistic Updates (no full page reload)
  const onSongUpdated = (updatedSong: MasterSong) => {
    setMasterSongs(prev => prev.map(s => s.id === updatedSong.id ? { ...s, ...updatedSong } : s));
    loadData(true); // silent background re-sync
  };

  const onSongCreated = (newSong: MasterSong) => {
    setMasterSongs(prev => [newSong, ...prev.filter(s => s.id !== newSong.id)]);
    loadData(true); // silent background re-sync
  };

  // Publish / Import from Internal to Master
  const handlePublish = async () => {
    if (selectedForPublish.length === 0) return;
    setPublishing(true);
    try {
      const selectedSongs = availableForPublish.filter(s => selectedForPublish.includes(s.id));
      for (const s of selectedSongs) {
        const { id, zoneId, praiseNightId, createdAt, updatedAt, ...rest } = s;
        await MasterLibraryService.createMasterSong({
          ...rest,
          sourceType: 'imported_from_internal',
          status: 'active',
          isHqOnly: false,
        });
      }
      setShowPublishModal(false);
      setSelectedForPublish([]);
      await loadData(true);
    } catch (e) {
      console.error('Failed to import internal songs to master:', e);
    } finally {
      setPublishing(false);
    }
  };

  // Actions
  const handleCreateSong = async (data: any) => {
    await MasterLibraryService.createMasterSong(data);
    await loadData(true);
    return { success: true };
  };

  const updateMasterSong = async (id: string, data: any) => {
    await MasterLibraryService.updateMasterSong(id, data);
    await loadData(true);
    return { success: true };
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this master song?')) return;
    await MasterLibraryService.deleteMasterSong(id);
    await loadData(true);
    return { success: true };
  };

  const handleCreateProgram = async (name: string, description: string) => {
    try {
      const res = await apiClient.post<any>('/programs', { name, description });
      const newProgram: MasterProgram = {
        id: res?.data?.id || res?.id || `prog_${Date.now()}`,
        name: name.trim(),
        description: description?.trim() || '',
        songIds: [],
        createdAt: new Date().toISOString()
      };
      setPrograms(prev => [newProgram, ...prev]);
      setShowCreateProgramModal(false);
      loadData(true);
      return { success: true };
    } catch (e) {
      console.error('Failed to create program:', e);
      return { success: false };
    }
  };

  const handleUpdateProgramOrder = async (updatedPrograms: MasterProgram[]) => {
    try {
      setPrograms(updatedPrograms);
      await apiClient.post('/programs/reorder', { programs: updatedPrograms });
      setShowOrderProgramsModal(false);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  };

  const handleDeleteProgram = async (id: string) => {
    try {
      await apiClient.delete(`/programs/${encodeURIComponent(id)}`);
      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Failed to delete program:', e);
      throw e;
    }
  };

  const handleToggleSongInProgram = async (songId: string, programId: string) => {
    const prog = programs.find(p => p.id === programId);
    if (!prog) return;
    const ids = new Set(prog.songIds || []);
    if (ids.has(songId)) ids.delete(songId);
    else ids.add(songId);
    try {
      await apiClient.patch(`/programs/${encodeURIComponent(programId)}`, { songIds: Array.from(ids) });
      setPrograms(prev => prev.map(p => p.id === programId ? { ...p, songIds: Array.from(ids) } : p));
    } catch (e) {
      console.error(e);
    }
  };

  return {
    masterSongs,
    programs,
    paginatedSongs,
    filteredSongs,
    loading,
    error,
    stats,
    canManage: !!isHQAdmin,
    searchTerm,
    setSearchTerm: (term: string) => { setSearchTerm(term); setCurrentPage(1); },
    sortOrder,
    setSortOrder,
    selectedLeadSinger,
    setSelectedLeadSinger: (singer: string) => { setSelectedLeadSinger(singer); setCurrentPage(1); },
    isLeadSingerDropdownOpen,
    setIsLeadSingerDropdownOpen,
    leadSingers,
    selectedProgramId,
    setSelectedProgramId: (id: string) => { setSelectedProgramId(id); setCurrentPage(1); },
    isProgramsDropdownOpen,
    setIsProgramsDropdownOpen,
    selectedSongIds,
    setSelectedSongIds,
    activeTab,
    setActiveTab: (tab: 'active' | 'history' | 'hidden' | 'all') => { setActiveTab(tab); setCurrentPage(1); },
    currentPage,
    totalPages,
    setCurrentPage,
    isLoadingMore: false,
    hasMoreMasterSongs: false,
    loadMoreMasterSongs: async () => {},
    isAssigningToProgram,
    setIsAssigningToProgram,
    songsToAssign,
    setSongsToAssign,
    handleToggleSongInProgram,
    handleToggleHideSong,
    handleToggleHistorySong,
    handleBulkHide,
    handleBulkMoveToHistory,
    handleDuplicateSong,
    onSongUpdated,
    onSongCreated,
    refresh: () => loadData(true),
    loadData,
    showCreateModal,
    setShowCreateModal,
    showPublishModal,
    setShowPublishModal,
    showEditModal,
    setShowEditModal,
    showCreateProgramModal,
    setShowCreateProgramModal,
    showOrderProgramsModal,
    setShowOrderProgramsModal,
    showDetailsModal,
    setShowDetailsModal,
    showImportModal,
    setShowImportModal,
    selectedSong,
    setSelectedSong,
    availableForPublish,
    selectedForPublish,
    setSelectedForPublish,
    handlePublish,
    publishing,
    hasMoreInternalSongs: false,
    loadMoreInternalSongs: async () => {},
    zonePraiseNights: [] as any[],
    selectedPraiseNight: '',
    setSelectedPraiseNight: (_p: string) => {},
    handleImport: () => {},
    importing: false,
    handleCreateProgram,
    handleUpdateProgramOrder,
    handleCreateSong,
    handleDelete,
    handleDeleteProgram,
    importSongToZone: async (song: any, zoneId: string) => await MasterLibraryService.importMasterSongToZone(song, zoneId),
    addMasterSong: handleCreateSong,
    duplicateSong: handleDuplicateSong,
    updateMasterSong,
    deleteMasterSong: handleDelete,
    deleteSong: handleDelete
  };
};
