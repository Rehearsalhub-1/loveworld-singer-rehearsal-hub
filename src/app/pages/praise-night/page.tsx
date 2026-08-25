"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sanitizeImageUrl } from '@/utils/image-utils';
import { Clock, Music, Play, X, Archive, BookOpen, Piano, HandMetal, Volume2, SkipForward, Heart, Sparkles } from "lucide-react";
import SongDetailModal from "@/components/SongDetailModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import SharedDrawer from "@/components/SharedDrawer";
import CustomLoader from "@/components/CustomLoader";
import { PraiseNightSong, PraiseNight } from "@/types/supabase";
import { ArchiveSearch } from "@/components/praise-night/ArchiveSearch";
import { ArchiveCategoryGrid } from "@/components/praise-night/ArchiveCategoryGrid";
import { ArchiveProgramList } from "@/components/praise-night/ArchiveProgramList";
import { GlobalArchiveResults } from "@/components/praise-night/GlobalArchiveResults";
import { PraiseNightHeader } from "@/components/praise-night/PraiseNightHeader";
import { PraiseNightEmptyState } from "@/components/praise-night/PraiseNightEmptyState";
import { PraiseNightBanner } from "@/components/praise-night/PraiseNightBanner";
import { PraiseNightQuickActions } from "@/components/praise-night/PraiseNightQuickActions";
import { PraiseNightStatusFilter } from "@/components/praise-night/PraiseNightStatusFilter";
import { PraiseNightSongList } from "@/components/praise-night/PraiseNightSongList";
import { PraiseNightCategoryDrawer } from "@/components/praise-night/PraiseNightCategoryDrawer";
import { PraiseNightCategoryBar } from "@/components/praise-night/PraiseNightCategoryBar";
import { PraiseNightActiveWidget } from "@/components/praise-night/PraiseNightActiveWidget";
import { PraiseNightSearchResults } from "@/components/praise-night/PraiseNightSearchResults";
import { useProgramStore } from '@/stores/programStore';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';
import { getMenuItems } from "@/config/menuItems";
import { useAudio } from "@/contexts/AudioContext";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { handleAppRefresh } from "@/utils/refresh-utils";
import { NavigationManager } from "@/utils/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";

const lowDataOptimizer = {
  get: (_k: string) => null,
  set: (_k: string, _v: any) => {}
};

function useServerCountdown(_params: any) {
  return { timeLeft: { days: 0, hours: 0, minutes: 0, seconds: 0 }, isLoading: false, error: null };
}

function useRealtimeSong(_zoneId?: string, _praiseNightId?: string, songId?: string) {
  const [song, setSong] = useState<PraiseNightSong | null>(null);

  useWebSocket(
    'song',
    songId ? String(songId) : '',
    (data: any) => {
      if (data && typeof data === 'object') {
        setSong(prev => ({ ...(prev || {}), ...data }));
      }
    },
    Boolean(songId)
  );

  useWebSocket(
    'song',
    'all',
    (data: any) => {
      if (data && typeof data === 'object' && songId && String(data.id) === String(songId)) {
        setSong(prev => ({ ...(prev || {}), ...data }));
      }
    },
    Boolean(songId)
  );

  useEffect(() => {
    setSong(null);
  }, [songId]);

  return { song, loading: false };
}

const isSongHeard = (s: any): boolean => {
  if (!s) return false;
  if (s.status === 'heard') return true;
  if (s.status === 'unheard') return false;
  if (s.rehearsalStatus === 'heard') return true;
  if (s.rehearsalStatus === 'unheard') return false;
  if (s.heard === true || s.isHeard === true) return true;
  if (s.heard === false || s.isHeard === false) return false;
  const title = (s.title || '').toLowerCase();
  if (title.includes('(heard)')) return true;
  if (title.includes('(unheard)')) return false;
  return false;
};

const songMatchesCategory = (s: any, targetCategory: string): boolean => {
  if (!targetCategory || targetCategory === 'all' || targetCategory === 'All Songs') return true;
  const target = targetCategory.trim().toLowerCase();
  const sCat = (s.category || '').trim().toLowerCase();
  if (sCat === target) return true;
  if (Array.isArray(s.categories)) {
    return s.categories.some((c: string) => typeof c === 'string' && c.trim().toLowerCase() === target);
  }
  return false;
};

function usePraiseNightSongsData({
  finalSongData,
  activeCategory,
  activeFilter,
  currentPraiseNight,
  setActiveCategory
}: any) {
  // Extract all unique categories from finalSongData
  const categoriesWithActiveSongs = useMemo(() => {
    const cats = new Set<string>();
    if (Array.isArray(finalSongData)) {
      finalSongData.forEach((s: any) => {
        if (s.category && typeof s.category === 'string' && s.category.trim()) cats.add(s.category.trim());
        if (Array.isArray(s.categories)) {
          s.categories.forEach((c: string) => { if (c && typeof c === 'string' && c.trim()) cats.add(c.trim()); });
        }
      });
    }
    return Array.from(cats);
  }, [finalSongData]);

  // Auto-select first category if activeCategory is empty or invalid
  useEffect(() => {
    if (categoriesWithActiveSongs.length > 0) {
      if (!activeCategory || !categoriesWithActiveSongs.includes(activeCategory)) {
        setActiveCategory(categoriesWithActiveSongs[0]);
      }
    } else if (Array.isArray(finalSongData) && finalSongData.length > 0) {
      if (!activeCategory) {
        setActiveCategory('All Songs');
      }
    }
  }, [categoriesWithActiveSongs, activeCategory, setActiveCategory, finalSongData]);

  // Songs belonging to the active category
  const songsInActiveCategory = useMemo(() => {
    if (!Array.isArray(finalSongData)) return [];
    if (!activeCategory || activeCategory === 'all' || activeCategory === 'All Songs') {
      return finalSongData;
    }
    return finalSongData.filter((s: any) => songMatchesCategory(s, activeCategory));
  }, [finalSongData, activeCategory]);

  // Category-specific counts
  const categoryHeardCount = useMemo(() => {
    return songsInActiveCategory.filter((s: any) => isSongHeard(s)).length;
  }, [songsInActiveCategory]);

  const categoryUnheardCount = useMemo(() => {
    return songsInActiveCategory.filter((s: any) => !isSongHeard(s)).length;
  }, [songsInActiveCategory]);

  const categoryTotalCount = songsInActiveCategory.length;

  // Filter songs by Heard / Unheard strictly within active category
  const filteredSongs = useMemo(() => {
    if (songsInActiveCategory.length === 0) return [];

    if (activeFilter === 'heard') {
      return songsInActiveCategory.filter((s: any) => isSongHeard(s));
    } else if (activeFilter === 'unheard') {
      return songsInActiveCategory.filter((s: any) => !isSongHeard(s));
    }

    return songsInActiveCategory;
  }, [songsInActiveCategory, activeFilter]);

  const resolvedCategories = categoriesWithActiveSongs.length > 0 ? categoriesWithActiveSongs : ['All Songs'];

  return {
    songCategories: resolvedCategories,
    categoriesWithActiveSongs: resolvedCategories,
    mainCategories: resolvedCategories,
    filteredSongs,
    categoryCounts: {
      heard: categoryHeardCount,
      unheard: categoryUnheardCount,
      total: categoryTotalCount
    }
  };
}

export interface PageSearchResult {
  id: string;
  type: "song" | "category";
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  status?: "heard" | "unheard";
  [key: string]: any;
}

function usePageSearch(data: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useMemo((): PageSearchResult[] => {
    if (!searchQuery.trim() || !data?.songs) return [];
    const q = searchQuery.toLowerCase();
    return data.songs
      .filter((s: any) => s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q))
      .map((s: any): PageSearchResult => ({
        id: String(s.id || Math.random()),
        type: 'song',
        title: String(s.title || ''),
        category: s.category
      }));
  }, [searchQuery, data]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    hasResults: searchResults.length > 0
  };
}

function PraiseNightPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentZone, userRole, isInitialized, isZoneCoordinator } = useZone();
  const categoryFilter = searchParams?.get('category');
  const pageParam = searchParams?.get('page');
  const songParam = searchParams?.get('song');
  const { currentSong, isPlaying, setCurrentSong, play, isLoading, hasError, audioRef } = useAudio();
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [isSongDetailOpen, setIsSongDetailOpen] = useState(false);
  const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(null);
  const internalSongChangeRef = useRef<string | null>(null);

  useEffect(() => {
    if (isInitialized && !categoryFilter && currentZone?.id) {
      router.replace('/pages/praise-night?category=ongoing');
    }
  }, [isInitialized, categoryFilter, currentZone?.id, router]);
  
  const zoneColor = currentZone?.themeColor || '#9333EA';
  const { user, profile, isProfileLoading, signOut } = useAuth();
  const [allPraiseNights, setAllPraiseNights] = useState<PraiseNight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPraiseNight, setCurrentPraiseNightState] = useState<PraiseNight | null>(null);
  const getCurrentPage = () => currentPraiseNight;

  const getCurrentSongs = useCallback(async (programId?: string, _force?: boolean): Promise<any[]> => {
    const targetProgId = programId || currentPraiseNight?.id;
    if (!targetProgId) return [];
    try {
      const effectiveZone = currentZone?.id ? `&zoneId=${encodeURIComponent(currentZone.id)}` : '';
      const res = await apiClient.get<any>(`/songs/praise-night?programId=${encodeURIComponent(targetProgId)}${effectiveZone}`);
      return Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      console.error('Failed to load songs:', e);
      return [];
    }
  }, [currentPraiseNight?.id, currentZone?.id]);

  useEffect(() => {
    const loadZonePrograms = async () => {
      if (!currentZone?.id) return;
      setLoading(true);
      try {
        const res = await apiClient.get<any>(`/programs?zoneId=${encodeURIComponent(currentZone.id)}`);
        const data = (res?.data && Array.isArray(res.data)) ? res.data : [];
        setAllPraiseNights(data);
        if (data.length > 0) {
          const target = (categoryFilter || 'ongoing').toLowerCase();
          const match = data.find((p: any) => {
            const cat = (p.category || '').toLowerCase().trim();
            return cat === target;
          }) || data[0];
          setCurrentPraiseNightState(match);
        } else {
          setCurrentPraiseNightState(null);
        }
      } catch (err) {
        console.error('Failed to load programs for zone:', err);
      } finally {
        setLoading(false);
      }
    };
    loadZonePrograms();
  }, [currentZone?.id, categoryFilter]);

  const refreshData = async () => {
    if (!currentZone?.id) return;
    try {
      const res = await apiClient.get<any>(`/programs?zoneId=${encodeURIComponent(currentZone.id)}`);
      const data = (res?.data && Array.isArray(res.data)) ? res.data : [];
      setAllPraiseNights(data);
    } catch (err) {}
  };
  const [showDropdown, setShowDropdown] = useState(false);
  useEffect(() => {
    if (showDropdown) {
    }
  }, [showDropdown, categoryFilter]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [selectedPageCategory, setSelectedPageCategory] = useState<string | null>(null);
  const [pageCategories, setPageCategories] = useState<any[]>([]);
  const [loadingPageCategories, setLoadingPageCategories] = useState(true);
  const [allArchiveSongs, setAllArchiveSongs] = useState<PraiseNightSong[]>([]);
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [hasLoadedAllSongs, setHasLoadedAllSongs] = useState(false);
  const [allSongsFromFirebase, setAllSongsFromFirebase] = useState<PraiseNightSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  useEffect(() => {
    setArchiveSearchQuery('');
  }, [selectedPageCategory]);
  const [showActiveMenu, setShowActiveMenu] = useState(false);
  useEffect(() => {
    const loadPageCategories = async () => {
      if (!currentZone?.id) {
        return;
      }
      const cacheKey = `page-categories-${currentZone.id}`;
      const cached = lowDataOptimizer.get(cacheKey);
      if (cached) {
        setPageCategories(cached);
        setLoadingPageCategories(false);
        return;
      }
      setLoadingPageCategories(true);
      try {
        const res = await apiClient.get<any>('/categories/page').catch(() => null);
        let categories = Array.isArray(res?.data) ? res.data : [];
        if (categories.length === 0 && allPraiseNights.length > 0) {
          const pageCatNames = new Set<string>();
          allPraiseNights.forEach((p: any) => {
            if (p.pageCategory) pageCatNames.add(p.pageCategory);
          });
          categories = Array.from(pageCatNames).map((name) => ({ id: name, name }));
        }
        setPageCategories(categories);
        lowDataOptimizer.set(cacheKey, categories);
      } catch (error) {
        console.error('Error loading page categories:', error);
        setPageCategories([]);
      } finally {
        setLoadingPageCategories(false);
      }
    };
    loadPageCategories();
  }, [currentZone?.id]);
  const filteredPraiseNights = useMemo(() => {
    if (loading || !allPraiseNights) return [];
    let filtered = allPraiseNights;
    if (categoryFilter && categoryFilter !== 'all') {
      const target = categoryFilter.toLowerCase().trim();
      filtered = filtered.filter(praiseNight => {
        const cat = (praiseNight.category || '').toLowerCase().trim();
        return cat === target;
      });
    } else {
      filtered = filtered.filter(praiseNight => praiseNight.category !== 'unassigned');
    }
    if (selectedPageCategory) {
      filtered = filtered.filter(praiseNight => praiseNight.pageCategory === selectedPageCategory);
    }
    if (categoryFilter === 'archive' && archiveSearchQuery.trim().length >= 2 && selectedPageCategory) {
      const query = archiveSearchQuery.toLowerCase();
      filtered = filtered.filter(praiseNight => 
        praiseNight.name?.toLowerCase().includes(query) || 
        praiseNight.date?.toLowerCase().includes(query)
      );
    }
    return filtered
      .filter(pn => pn.scope !== 'subgroup')
      .sort((a, b) => {
        if (a.category === 'ongoing' && b.category !== 'ongoing') return -1;
        if (a.category !== 'ongoing' && b.category === 'ongoing') return 1;
        const getTime = (p: any) => {
          const raw = (p.rawData || {}) as any;
          if (raw?.createdAt?._seconds) return Number(raw.createdAt._seconds) * 1000;
          if (raw?.createdAt?.seconds) return Number(raw.createdAt.seconds) * 1000;
          if (p.createdAt?.toDate) return p.createdAt.toDate().getTime();
          if (p.createdAt) {
            const t = new Date(p.createdAt).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (p.date) {
            const t = new Date(p.date).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          return 0;
        };
        return getTime(b) - getTime(a);
      });
  }, [allPraiseNights, categoryFilter, selectedPageCategory, loading, archiveSearchQuery]);
  const displayedPraiseNights = filteredPraiseNights;
  useEffect(() => {
    const fetchAllSongsForSearch = async () => {
      if (
        categoryFilter === 'archive' && 
        !pageParam && 
        archiveSearchQuery.trim().length >= 1 && 
        !hasLoadedAllSongs && 
        currentZone?.id
      ) {
        setIsGlobalSearchLoading(true);
        try {
          const songs = await Promise.resolve([]);
          setAllArchiveSongs(songs);
          setHasLoadedAllSongs(true);
        } catch (error) {
  console.error('Error fetching global archive songs:', error);
        } finally {
          setIsGlobalSearchLoading(false);
        }
      }
    };
    fetchAllSongsForSearch();
  }, [categoryFilter, pageParam, archiveSearchQuery, hasLoadedAllSongs, currentZone?.id]);
  const globalSearchResults = useMemo(() => {
    if (categoryFilter !== 'archive' || pageParam || archiveSearchQuery.trim().length < 1) {
      return [];
    }
    const query = archiveSearchQuery.toLowerCase().trim();
    const matchingPages = allPraiseNights.filter(page => {
      if (page.category !== 'archive') return false;
      const name = page.name?.toLowerCase() || '';
      const date = page.date?.toLowerCase() || '';
      const loc = page.location?.toLowerCase() || '';
      return name.includes(query) || date.includes(query) || loc.includes(query);
    }).map(page => ({
      ...page,
      type: 'page' as const
    }));
    const matchingSongs = allArchiveSongs.filter(song => {
      const matchesQuery = 
        song.title?.toLowerCase().includes(query) ||
        song.writer?.toLowerCase().includes(query) ||
        song.leadSinger?.toLowerCase().includes(query) ||
        song.lyrics?.toLowerCase().includes(query) ||
        song.conductor?.toLowerCase().includes(query);
      if (!matchesQuery) return false;
      const parentPage = allPraiseNights.find(p => p.id === song.praiseNightId);
      return parentPage?.category === 'archive';
    }).map(song => {
      const parentPage = allPraiseNights.find(p => p.id === song.praiseNightId);
      return {
        ...song,
        type: 'song' as const,
        parentPageName: parentPage?.name || 'Unknown Program',
        parentPageDate: parentPage?.date || ''
      };
    });
    return [...matchingPages, ...matchingSongs];
  }, [allPraiseNights, allArchiveSongs, categoryFilter, pageParam, archiveSearchQuery]);
  useEffect(() => {
   
  }, []); // Removed refreshData dependency naturally
  useEffect(() => {
    if (!isInitialized || isProfileLoading) return;
    const hiddenFeatures = (profile as any)?.hidden_features || (profile as any)?.hiddenFeatures || {};

    if (categoryFilter === 'pre-rehearsal') {
      if (hiddenFeatures.hidePreRehearsal) {
        console.warn(' Access Denied: Pre-Rehearsal hidden for user');
        router.replace('/pages/rehearsals');
        return;
      }
      const isHQ = currentZone ? isHQGroup(currentZone.id) : false;
      const hasAccess = isZoneCoordinator || profile?.can_access_pre_rehearsal === true || (profile as any)?.has_hq_access === true;
      if (isHQ || !hasAccess) {
        console.warn(' Access Denied to Pre-Rehearsal category');
        router.replace('/pages/rehearsals');
      }
    }
  }, [categoryFilter, currentZone, isZoneCoordinator, profile, isInitialized, isProfileLoading, router]);

  useEffect(() => {
    if (!isInitialized || isProfileLoading) return;
    const hiddenFeatures = (profile as any)?.hidden_features || (profile as any)?.hiddenFeatures || {};

    if (categoryFilter === 'archive') {
      if (hiddenFeatures.hideArchives) {
        console.warn(' Access Denied: Archives hidden for user');
        router.replace('/pages/rehearsals');
        return;
      }

      const isSpecialZone = 
        currentZone?.id === 'zone-president' || 
        currentZone?.id === 'zone-president-2' ||
        currentZone?.id === 'zone-director' || 
        currentZone?.id === 'zone-oftp' ||
        currentZone?.id === 'zone-oftd' ||
        currentZone?.id === 'zone-sa-1' ||
        currentZone?.id === 'zone-sa-2' ||
        currentZone?.id === 'zone-sa-3' ||
        currentZone?.id === 'zone-sa-4' ||
        currentZone?.id === 'zone-sa-5';
      const isAdmin = 
        profile?.role === 'admin' || 
        profile?.role === 'boss' || 
        userRole === 'hq_admin' || 
        userRole === 'super_admin' || 
        userRole === 'boss';

      const hasArchivePermission = Boolean(
        (profile as any)?.can_access_archive ||
        (profile as any)?.canSeeArchive ||
        (profile as any)?.has_hq_access
      );

      const hasAccess = isSpecialZone || isZoneCoordinator || isAdmin || hasArchivePermission;
      if (!hasAccess) {
        console.warn(' Access Denied to Archive category');
        router.replace('/pages/rehearsals');
      }
    }
  }, [categoryFilter, currentZone, isZoneCoordinator, profile, userRole, isInitialized, isProfileLoading, router]);
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      refreshData();
    }, 60000); // Refresh every 60 seconds (reduced from 30s to save Firebase reads)
    return () => {
      clearInterval(refreshInterval);
    };
  }, [refreshData]);
  useEffect(() => {
    if (pageParam && allPraiseNights.length > 0) {
      const targetPage = allPraiseNights.find(page =>
        page.id === pageParam ||
        page.id === pageParam.toString() ||
        page.id === parseInt(pageParam).toString()
      );
      if (targetPage) {
        if (targetPage.scope === 'subgroup') {
          router.replace(`/pages/subgroup-rehearsal?id=${targetPage.id}`);
          return;
        }
        setCurrentPraiseNightState(targetPage);
      } else {
      }
    }
  }, [pageParam, allPraiseNights]);
  useEffect(() => {
    if (currentPraiseNight && allSongsFromFirebase.length > 0) {
      const decodedUrlSong = songParam ? decodeURIComponent(songParam) : null;
      if (internalSongChangeRef.current && internalSongChangeRef.current !== decodedUrlSong) {
        return;
      }
      if (internalSongChangeRef.current === decodedUrlSong) {
        internalSongChangeRef.current = null;
      }
      if (songParam) {
        const targetSong = allSongsFromFirebase.find(song => song.title === decodedUrlSong);
        if (targetSong && selectedSong?.id !== targetSong.id) {
          const songIndex = allSongsFromFirebase.indexOf(targetSong);
          setSelectedSongIndex(songIndex);
          setSelectedSong({ ...targetSong, imageIndex: songIndex });
          setIsSongDetailOpen(true);
          if (currentSong?.id !== targetSong.id) {
            setCurrentSong(targetSong, false);
          }
        }
      } else if (isSongDetailOpen) {
        setIsSongDetailOpen(false);
        setSelectedSong(null);
      }
    }
  }, [songParam, currentPraiseNight, allSongsFromFirebase, isSongDetailOpen, selectedSong?.id, currentSong?.id, setCurrentSong]);
  useEffect(() => {
    const categoryMismatch = currentPraiseNight && categoryFilter && currentPraiseNight.category !== categoryFilter;
    if (filteredPraiseNights.length > 0 && (!currentPraiseNight || categoryMismatch) && !pageParam) {
      const firstPage = filteredPraiseNights[0];
      setCurrentPraiseNightState(firstPage);
    }
  }, [filteredPraiseNights, currentPraiseNight, pageParam, categoryFilter]);
  useEffect(() => {
  }, [categoryFilter, pageParam, currentPraiseNight, filteredPraiseNights, allPraiseNights]);
  useEffect(() => {
    if (currentPraiseNight && !currentPraiseNight.countdown && allPraiseNights.length > 0) {
      const pageWithCountdown = allPraiseNights.find(p => p.countdown && (p.countdown.days > 0 || p.countdown.hours > 0 || p.countdown.minutes > 0 || p.countdown.seconds > 0));
      if (pageWithCountdown) {
        setCurrentPraiseNightState(pageWithCountdown);
      }
    }
  }, [currentPraiseNight, allPraiseNights]);
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('lyrics');
  const [activeFilter, setActiveFilter] = useState<'heard' | 'unheard'>('heard');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [previousPageId, setPreviousPageId] = useState<string | null>(null);
  useEffect(() => {
    if (currentPraiseNight && currentPraiseNight.id !== previousPageId) {
      setActiveFilter('heard');
      setPreviousPageId(currentPraiseNight.id);
    }
  }, [currentPraiseNight, previousPageId]);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  React.useEffect(() => {
    const handleOpenFullPlayer = (event: CustomEvent) => {
      const song = event.detail.song;
      if (song) {
        setSelectedSong(song);
        setIsSongDetailOpen(true);
        window.dispatchEvent(new CustomEvent('songDetailOpen'));
      }
    };
    window.addEventListener('openFullPlayer', handleOpenFullPlayer as EventListener);
    return () => {
      window.removeEventListener('openFullPlayer', handleOpenFullPlayer as EventListener);
    };
  }, []);
  const ecardSrc = useMemo(() => {
    return sanitizeImageUrl(currentPraiseNight?.bannerImage, 'banner');
  }, [currentPraiseNight]);
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  }
  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
 console.error('Logout error:', error)
    }
  }
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await handleAppRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }
  const menuItems = getMenuItems(handleLogout, handleRefresh)
  const { timeLeft, isLoading: countdownLoading, error: countdownError } = useServerCountdown({
    countdownData: currentPraiseNight?.countdown,
    praiseNightId: currentPraiseNight?.id,
    targetDateString: currentPraiseNight?.date
  })
  useEffect(() => {
  }, [currentPraiseNight, timeLeft, countdownLoading, countdownError, categoryFilter, filteredPraiseNights.length]);
  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
    setIsCategoryDrawerOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const handleSongClick = (song: any, index: number) => {
    internalSongChangeRef.current = song.title;
    const params = new URLSearchParams(window.location.search);
    params.set('song', song.title);
    if (song.praiseNightId && song.praiseNightId !== currentPraiseNight?.id) {
      params.set('page', song.praiseNightId);
    }
    router.push(`?${params.toString()}`);
    window.dispatchEvent(new CustomEvent('songDetailOpen'));
  };
  const handleSongSwitch = (song: any, index: number) => {
    internalSongChangeRef.current = song.title;
    const params = new URLSearchParams(window.location.search);
    params.set('song', song.title);
    if (song.praiseNightId && song.praiseNightId !== currentPraiseNight?.id) {
      params.set('page', song.praiseNightId);
    }
    router.push(`?${params.toString()}`);
    if (song.audioFile && song.audioFile.trim() !== '') {
      setCurrentSong(song, true); // Enable auto-play
    } else {
      setCurrentSong(song, false); // No auto-play
    }
    window.dispatchEvent(new CustomEvent('songDetailOpen'));
  };
  const getSongImage = (index: number) => {
    const images = [
      "/images/DSC_6155_scaled.jpg",
      "/images/DSC_6303_scaled.jpg",
      "/images/DSC_6446_scaled.jpg",
      "/images/DSC_6506_scaled.jpg",
      "/images/DSC_6516_scaled.jpg",
      "/images/DSC_6636_1_scaled.jpg",
      "/images/DSC_6638_scaled.jpg",
      "/images/DSC_6644_scaled.jpg",
      "/images/DSC_6658_1_scaled.jpg",
      "/images/DSC_6676_scaled.jpg"
    ];
    return images[index % images.length]; // Cycle through images if more songs than images
  };
  const handleCloseSongDetail = () => {
    if (songParam) {
      NavigationManager.handleBack(router);
    } else {
      setIsSongDetailOpen(false);
      setSelectedSong(null);
    }
    window.dispatchEvent(new CustomEvent('songDetailClose'));
  };
  useEffect(() => {
    const handleBeforeUnload = () => {
      setShowDropdown(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  const formatNumber = (num: number) => {
    if (isNaN(num) || num === undefined || num === null) return '00';
    return num < 10 ? `0${num}` : num.toString();
  }
  const getCategoryIcon = (categoryName: string) => {
    const categoryIconMap: { [key: string]: any } = {
      'worship': Heart,
      'praise': Sparkles,
      'hymn': BookOpen,
      'contemporary': Music,
      'traditional': Piano,
      'gospel': HandMetal,
      'ballad': Volume2,
      'fast': SkipForward,
      'slow': Clock,
      'medium': Play,
      'default': Music
    };
    const normalizedCategory = categoryName.toLowerCase();
    return categoryIconMap[normalizedCategory] || Music; // Default icon
  };
  const [songMetadataTimestamp, setSongMetadataTimestamp] = useState<number>(0);
  useEffect(() => {
    if (!currentPraiseNight || !currentZone?.id) return;
  }, [currentPraiseNight?.id, currentZone?.id]);

  useEffect(() => {
    if (!currentZone?.id) return;
  }, [currentZone?.id]); // refreshData removed to prevent listener recreation
  useEffect(() => {
    if (currentPraiseNight && allPraiseNights.length > 0) {
      const updatedPage = allPraiseNights.find(p => p.id === currentPraiseNight.id);
      if (updatedPage && (
        updatedPage.categoryOrder?.join(',') !== currentPraiseNight.categoryOrder?.join(',') ||
        updatedPage.name !== currentPraiseNight.name ||
        updatedPage.category !== currentPraiseNight.category
      )) {
        setCurrentPraiseNightState(updatedPage);
      }
    }
  }, [allPraiseNights, currentPraiseNight]);
  useEffect(() => {
    if (currentPraiseNight) {
      if (Array.isArray((currentPraiseNight as any).songs) && (currentPraiseNight as any).songs.length > 0) {
        setAllSongsFromFirebase((currentPraiseNight as any).songs);
      } else if (allSongsFromFirebase.length === 0) {
        setSongsLoading(true);
      }
      getCurrentSongs(currentPraiseNight.id, true).then((songs: any) => {
        if (Array.isArray(songs) && songs.length > 0) {
          setAllSongsFromFirebase(songs);
        }
        setSongsLoading(false);
      }).catch((error: any) => {
        console.error('Error loading songs:', error);
        setSongsLoading(false);
      });
    } else {
      setAllSongsFromFirebase([]);
    }
  }, [currentPraiseNight?.id, songMetadataTimestamp, getCurrentSongs]);
  // Live real-time WebSocket song updates for active program
  useWebSocket(
    'song',
    'all',
    (data: any) => {
      if (data && typeof data === 'object' && data.id) {
        setAllSongsFromFirebase(prev => {
          const index = prev.findIndex(s => s.id === data.id || (s as any).firebaseId === data.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = { ...next[index], ...data };
            return next;
          }
          return prev;
        });
        if (selectedSong && (selectedSong.id === data.id || (selectedSong as any).firebaseId === data.id)) {
          setSelectedSong((prev: any) => prev ? { ...prev, ...data } : prev);
        }
      }
    },
    Boolean(currentPraiseNight?.id)
  );

  // Local window event listener for instant zero-latency client sync
  useEffect(() => {
    const handleSongEvent = (e: any) => {
      const updated = e.detail?.song || e.detail;
      if (updated && updated.id) {
        setAllSongsFromFirebase(prev => {
          const index = prev.findIndex(s => s.id === updated.id || (s as any).firebaseId === updated.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = { ...next[index], ...updated };
            return next;
          }
          return prev;
        });
        if (selectedSong && (selectedSong.id === updated.id || (selectedSong as any).firebaseId === updated.id)) {
          setSelectedSong((prev: any) => prev ? { ...prev, ...updated } : prev);
        }
      }
    };

    window.addEventListener('songUpdated', handleSongEvent);
    window.addEventListener('songDataChanged', handleSongEvent);
    return () => {
      window.removeEventListener('songUpdated', handleSongEvent);
      window.removeEventListener('songDataChanged', handleSongEvent);
    };
  }, [selectedSong?.id]);

  const {
    song: realtimeSongData,
    loading: realtimeSongLoading
  } = useRealtimeSong(
    currentZone?.id,
    currentPraiseNight?.id,
    selectedSong?.id
  );
  const finalSongData = useMemo(() => {
    return allSongsFromFirebase;
  }, [currentPraiseNight, allSongsFromFirebase]);
  const isDataLoaded = !loading && !songsLoading && currentPraiseNight !== null;
  const {
    songCategories,
    categoriesWithActiveSongs,
    mainCategories,
    filteredSongs,
    categoryCounts
  } = usePraiseNightSongsData({
    finalSongData,
    activeCategory,
    activeFilter,
    currentPraiseNight,
    setActiveCategory
  });
  const categoryHeardCount = categoryCounts.heard;
  const categoryUnheardCount = categoryCounts.unheard;
  const categoryTotalCount = categoryCounts.total;
  const otherCategories: string[] = [];
  const switchPraiseNight = (praiseNight: PraiseNight) => {
    if (praiseNight.scope === 'subgroup') {
      router.push(`/pages/subgroup-rehearsal?id=${praiseNight.id}`);
      return;
    }
    setCurrentPraiseNightState(praiseNight);
    setShowDropdown(false);
    const params = new URLSearchParams(window.location.search);
    params.set('page', praiseNight.id.toString());
    params.delete('song'); // Clear song when switching page
    router.push(`?${params.toString()}`);
  };
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { searchQuery, setSearchQuery, searchResults, hasResults } = usePageSearch(
    currentPraiseNight ? {
      ...currentPraiseNight,
      songs: allSongsFromFirebase
    } : null
  );
  const typedSearchResults = searchResults as PageSearchResult[];
  const onHeaderSearchClick = () => {
    setIsSearchOpen(true);
    const el = searchInputRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.focus(), 300);
    }
  };
  const onCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery(''); // Clear search query when closing
  };
  if (loading && allPraiseNights.length === 0 && !currentPraiseNight) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading program...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 font-medium mb-2">Error loading data</p>
          <p className="text-slate-600 text-sm">{error}</p>
        </div>
        {/* Header with back button */}
        <ScreenHeader
          title="Error"
          showBackButton={true}
          backPath="/pages/rehearsals"
          rightImageSrc="/logo.png"
        />
      </div>
    );
  }
  const isArchiveBrowsing = categoryFilter === 'archive' && !pageParam && (pageCategories.length > 0 || archiveSearchQuery.trim().length > 0);
  if (!loading && (!allPraiseNights || allPraiseNights.length === 0 || (filteredPraiseNights.length === 0 && !isArchiveBrowsing))) {
    return (
      <PraiseNightEmptyState 
        categoryFilter={categoryFilter}
        zoneColor={zoneColor}
      />
    );
  }
  const isRestoring = isInitialized && !categoryFilter && currentZone?.id;
  if (loading || !isInitialized || isRestoring || (filteredPraiseNights.length === 0 && !currentPraiseNight && allPraiseNights.length === 0)) {
    return (
      <div
        className="h-screen safe-area-bottom flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${zoneColor}12, #fdfbff)` }}
      >
        <CustomLoader />
      </div>
    );
  }
  return (
    <div
      className="h-screen safe-area-bottom overflow-y-auto"
      style={{ background: `linear-gradient(135deg, ${zoneColor}12, #fdfbff)` }}
    >
      {/* Main Content with Apple-style reveal effect */}
      <div
        className={`
          h-full flex flex-col
          transition-all duration-300 ease-out
          ${isMenuOpen
            ? 'translate-x-72 scale-[0.88] rounded-2xl shadow-2xl origin-left overflow-hidden'
            : 'translate-x-0 scale-100 rounded-none'
          }
        `}
        onClick={() => isMenuOpen && setIsMenuOpen(false)}
      >
        <style jsx global>{`
        html { scroll-behavior: smooth; }
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in-left {
          animation: fadeInLeft 0.6s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }
        .animate-fade-in-right {
          animation: fadeInRight 0.6s ease-out 0.4s both;
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.95); }
        }
        .breathe-animation {
          animation: breathe 2s ease-in-out infinite;
        }
        @keyframes pulse-border {
          0%, 100% { 
            border-color: rgb(147 51 234);
            box-shadow: 0 0 0 2px rgb(147 51 234);
          }
          50% { 
            border-color: rgb(196 181 253);
            box-shadow: 0 0 0 2px rgb(196 181 253);
          }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
          width: 200%;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
        /* Allow manual scrolling by pausing animation on scroll */
        .animate-scroll.manual-scroll {
          animation-play-state: paused;
        }
        /* Alternative approach - use transform instead of animation for better manual control */
        .animate-scroll-alt {
          width: 200%;
          animation: none;
        }
        .animate-scroll-alt.auto-scroll {
          animation: scroll 20s linear infinite;
        }
        /* Custom scrollbar styling */
        .scrollbar-thin::-webkit-scrollbar {
          height: 4px;
        }
        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 2px;
        }
        }
      `}</style>
        {/* Fixed Header - Full Width */}
        <PraiseNightHeader 
          categoryFilter={categoryFilter}
          pageParam={pageParam}
          currentPraiseNight={currentPraiseNight}
          selectedPageCategory={selectedPageCategory}
          setSelectedPageCategory={setSelectedPageCategory}
          archiveSearchQuery={archiveSearchQuery}
          setArchiveSearchQuery={setArchiveSearchQuery}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          timeLeft={timeLeft}
          formatNumber={formatNumber}
          displayedPraiseNights={displayedPraiseNights}
          switchPraiseNight={switchPraiseNight}
          loading={loading}
          searchInputRef={searchInputRef}
        />
        <PraiseNightSearchResults 
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          typedSearchResults={typedSearchResults}
          finalSongData={finalSongData}
          handleSongClick={handleSongClick}
          setActiveCategory={setActiveCategory}
          setIsSearchOpen={setIsSearchOpen}
          setSearchQuery={setSearchQuery}
        />
        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-4 relative mobile-content-with-bottom-nav">            {/* Archive Cards Grid - Special layout for archive category */}
            {categoryFilter === 'archive' && !pageParam ? (
              <div className="mb-6 px-1">
                {/* Archive Search & Breadcrumbs */}
                <ArchiveSearch 
                  selectedPageCategory={selectedPageCategory}
                  setSelectedPageCategory={setSelectedPageCategory}
                  archiveSearchQuery={archiveSearchQuery}
                  setArchiveSearchQuery={setArchiveSearchQuery}
                />
                <GlobalArchiveResults 
                  archiveSearchQuery={archiveSearchQuery}
                  isGlobalSearchLoading={isGlobalSearchLoading}
                  globalSearchResults={globalSearchResults}
                  pageCategories={pageCategories}
                  handleSongClick={handleSongClick}
                />
                {/* Show skeleton while loading page categories */}
                {loadingPageCategories && !selectedPageCategory && !archiveSearchQuery.trim() && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white border-2 border-slate-200 rounded-xl p-6">
                          <div className="w-full h-40 bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
                          <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse mb-3"></div>
                          <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Show page categories if in archive and no category selected AND categories exist */}
                {!loadingPageCategories && !selectedPageCategory && (pageCategories.length > 0 || archiveSearchQuery.trim().length > 0) && (
                  <ArchiveCategoryGrid 
                    pageCategories={pageCategories}
                    archiveSearchQuery={archiveSearchQuery}
                    allPraiseNights={allPraiseNights}
                    setSelectedPageCategory={setSelectedPageCategory}
                  />
                )}
                <ArchiveProgramList 
                  loading={loading}
                  loadingPageCategories={loadingPageCategories}
                  selectedPageCategory={selectedPageCategory}
                  pageCategories={pageCategories}
                  filteredPraiseNights={filteredPraiseNights}
                  displayedPraiseNights={displayedPraiseNights}
                  currentPraiseNight={currentPraiseNight}
                  categoryFilter={categoryFilter}
                  archiveSearchQuery={archiveSearchQuery}
                  setArchiveSearchQuery={setArchiveSearchQuery}
                  setSelectedPageCategory={setSelectedPageCategory}
                />
                {!loadingPageCategories && pageCategories.length === 0 && (
                  <div className="text-center py-12">
                    <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Page Categories</h3>
                    <p className="text-slate-500 mb-4">
                      Page categories help organize your archived programs.
                    </p>
                    <p className="text-sm text-slate-400">
                      Create page categories in the Admin Panel → Page Categories section
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {(categoryFilter !== 'archive' || !!pageParam) && currentPraiseNight && (
                  <PraiseNightBanner ecardSrc={ecardSrc} />
                )}
                {(categoryFilter !== 'archive' || !!pageParam) && currentPraiseNight && filteredPraiseNights.length > 0 && !(categoryFilter === 'pre-rehearsal' && filteredPraiseNights.length === 0) && (
                  <PraiseNightQuickActions />
                )}
                {/* Status Filter buttons/pills with category-specific count - Show for archive individual pages */}
                {currentPraiseNight && (categoryFilter !== 'archive' || pageParam) && (
                  <PraiseNightStatusFilter 
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    activeCategory={activeCategory}
                    categoryHeardCount={categoryHeardCount}
                    categoryUnheardCount={categoryUnheardCount}
                  />
                )}
                {/* Song Title Cards - Scrollable - Show for archive individual pages */}
                {currentPraiseNight && (categoryFilter !== 'archive' || pageParam) && (
                  <PraiseNightSongList 
                    songsLoading={songsLoading}
                    filteredSongs={filteredSongs}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    activeCategory={activeCategory}
                    categoryTotalCount={categoryTotalCount}
                    categoryHeardCount={categoryHeardCount}
                    categoryUnheardCount={categoryUnheardCount}
                    activeFilter={activeFilter}
                    zoneColor={zoneColor}
                    currentPraiseNight={currentPraiseNight}
                    handleSongClick={handleSongClick}
                  />
                )}
              </div>
            )}
            {/* Add bottom padding to prevent content from being hidden behind sticky categories and safe areas */}
            <div className="h-40"></div> {/* Spacer for fixed bottom category bar (~100px) + safe area */}
          </div>
        </div>
        {/* End of Scrollable Content */}
      < SharedDrawer
        open={isMenuOpen}
        onClose={toggleMenu}
        title="Menu"
        items={menuItems}
        key={`drawer-${categoryFilter}`} // Force re-render when category changes
      />
      <PraiseNightCategoryBar 
        categoryFilter={categoryFilter}
        pageParam={pageParam}
        mainCategories={mainCategories}
        activeCategory={activeCategory}
        handleCategorySelect={handleCategorySelect}
        finalSongData={finalSongData}
        zoneColor={zoneColor}
      />
      {/* Category Filter Drawer */}
      <PraiseNightCategoryDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
        otherCategories={otherCategories}
        activeCategory={activeCategory}
        handleCategorySelect={handleCategorySelect}
        finalSongData={finalSongData}
      />
      {/* Floating Active Song Widget */}
      <PraiseNightActiveWidget 
        finalSongData={finalSongData}
        isSongDetailOpen={isSongDetailOpen}
        showActiveMenu={showActiveMenu}
        setShowActiveMenu={setShowActiveMenu}
        handleSongClick={handleSongClick}
      />
      {/* Song Detail Modal */}
      {
        isSongDetailOpen && selectedSong && (() => {
          const matchingRealtimeData = realtimeSongData && (realtimeSongData as any).id === selectedSong.id ? realtimeSongData : null;
          const latestSongData = matchingRealtimeData || finalSongData.find(s => s.id === selectedSong.id) || selectedSong;
          return (
            <SongDetailModal
              selectedSong={latestSongData}
              isOpen={isSongDetailOpen}
              onClose={handleCloseSongDetail}
              currentFilter={activeFilter}
              songs={finalSongData}
              activeCategory={activeCategory}
              onSongChange={(newSong) => {
                internalSongChangeRef.current = newSong.title;
                setSelectedSong(newSong);
                const params = new URLSearchParams(window.location.search);
                params.set('song', newSong.title);
                router.replace(`?${params.toString()}`, { scroll: false });
              }}
            />
          );
        })()}
    </div>
    </div>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<CustomLoader />}>
      <PraiseNightPageContent />
    </Suspense>
  );
}
