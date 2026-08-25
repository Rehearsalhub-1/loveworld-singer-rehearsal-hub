"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';
import { mediaService as mediaLibraryService, getCategories, getPublicAdminPlaylists } from '../_lib/media-library-service';
import { getPublicPlaylists } from '../_lib/playlist-service';
import type { MediaItem, Genre } from '../_lib';

const MediaCache = {
  loadMedia: (key: string) => {
    try {
      if (typeof window === 'undefined') return null;
      const d = localStorage.getItem('lwsrh-media-' + key);
      const parsed = d ? JSON.parse(d) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  saveMedia: (media: any[], key: string) => {
    try {
      if (typeof window !== 'undefined' && Array.isArray(media)) {
        localStorage.setItem('lwsrh-media-' + key, JSON.stringify(media));
      }
    } catch {}
  }
};

interface MediaContextType {
  allMedia: MediaItem[];
  featuredMedia: MediaItem[];
  continueWatching: MediaItem[];
  favorites: MediaItem[];
  categories: any[];
  playlists: any[];
  adminPlaylists: any[];
  isLoading: boolean;
  isLoadingPlaylists: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  getMediaByType: (type: MediaItem['type']) => Promise<MediaItem[]>;
  getMediaByCategory: (category: string) => Promise<MediaItem[]>;
  searchMedia: (query: string) => Promise<MediaItem[]>;
  addToFavorites: (mediaId: string) => Promise<void>;
  removeFromFavorites: (mediaId: string) => Promise<void>;
  saveWatchProgress: (mediaId: string, progress: number) => Promise<void>;
  incrementViews: (mediaId: string) => Promise<void>;
  refreshMedia: () => Promise<void>;
  refreshPlaylists: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined)

export function MediaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { currentZone } = useZone()

  const [allMedia, setAllMedia] = useState<MediaItem[]>([])
  const [featuredMedia, setFeaturedMedia] = useState<MediaItem[]>([])
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([])
  const [favorites, setFavorites] = useState<MediaItem[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [adminPlaylists, setAdminPlaylists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const userIsHQ = isHQGroup(currentZone?.id)

  const loadInitialData = async () => {
    const cacheKey = userIsHQ ? 'hq' : 'regular'
    const cachedMedia = MediaCache.loadMedia(cacheKey)

    if (Array.isArray(cachedMedia) && cachedMedia.length > 0) {
      setAllMedia(cachedMedia)
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }

    try {
      const [media, featured, categoriesList, pubPlaylists, admPlaylists] = await Promise.all([
        mediaLibraryService.getMediaForZone(userIsHQ, 24),
        mediaLibraryService.getFeaturedMedia(),
        getCategories(),
        getPublicPlaylists(20),
        getPublicAdminPlaylists(userIsHQ, currentZone?.id)
      ])

      const safeMedia = Array.isArray(media) ? media : []
      setAllMedia(safeMedia)
      setFeaturedMedia(Array.isArray(featured) ? featured : [])
      setCategories(Array.isArray(categoriesList) ? categoriesList : [])
      setPlaylists(Array.isArray(pubPlaylists) ? pubPlaylists : [])
      setAdminPlaylists(Array.isArray(admPlaylists) ? admPlaylists : [])
      setHasMore(safeMedia.length >= 24)

      MediaCache.saveMedia(safeMedia, cacheKey)
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingPlaylists(false)
    }
  }

  const loadUserData = async () => {
    if (!user) return
    const userId = user.id || user.uid || ''

    try {
      const [continueWatch, userFavorites] = await Promise.all([
        mediaLibraryService.getContinueWatching(userId),
        mediaLibraryService.getUserFavorites(userId)
      ])

      setContinueWatching(continueWatch)
      setFavorites(userFavorites)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [currentZone?.id])

  useEffect(() => {
    if (user) {
      loadUserData()
    } else {
      setContinueWatching([])
      setFavorites([])
    }
  }, [user])

  useEffect(() => {
    const handleMediaUploaded = () => {
      loadInitialData()
      if (user) {
        loadUserData()
      }
    }

    window.addEventListener('mediaUploaded', handleMediaUploaded)
    return () => window.removeEventListener('mediaUploaded', handleMediaUploaded)
  }, [user])

  const refreshPlaylists = async () => {
    setIsLoadingPlaylists(true)
    try {
      const [pubPlaylists, admPlaylists] = await Promise.all([
        getPublicPlaylists(20),
        getPublicAdminPlaylists(userIsHQ, currentZone?.id)
      ])

      setPlaylists(pubPlaylists)
      setAdminPlaylists(admPlaylists)
    } catch (error) {
      console.error('Error refreshing playlists:', error)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || allMedia.length === 0) return

    setIsLoadingMore(true)
    try {
      const lastMedia = allMedia[allMedia.length - 1]
      if (!lastMedia?.createdAt) return

      const moreMedia = await mediaLibraryService.loadMoreMedia(lastMedia.createdAt, 12)

      if (moreMedia.length === 0) {
        setHasMore(false)
      } else {
        setAllMedia(prev => [...prev, ...moreMedia])
        setHasMore(moreMedia.length >= 12)
      }
    } catch (error) {
      console.error('Error loading more media:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const getMediaByType = async (type: MediaItem['type']) => {
    return await mediaLibraryService.getMediaByType(type)
  }

  const getMediaByCategory = async (category: string) => {
    return await mediaLibraryService.getMediaByGenre(category)
  }

  const searchMedia = async (query: string) => {
    return await mediaLibraryService.searchMedia(query)
  }

  const addToFavorites = async (mediaId: string) => {
    if (!user) return
    const userId = user.id || user.uid || ''

    try {
      await mediaLibraryService.addToFavorites(userId, mediaId)
      await loadUserData()
    } catch (error) {
      console.error('Error adding to favorites:', error)
    }
  }

  const removeFromFavorites = async (mediaId: string) => {
    if (!user) return
    const userId = user.id || user.uid || ''

    try {
      await mediaLibraryService.removeFromFavorites(userId, mediaId)
      await loadUserData()
    } catch (error) {
      console.error('Error removing from favorites:', error)
    }
  }

  const saveWatchProgress = async (mediaId: string, progress: number) => {
    if (!user) return
    const userId = user.id || user.uid || ''

    try {
      await mediaLibraryService.saveWatchProgress(userId, mediaId, progress)
      await loadUserData()
    } catch (error) {
      console.error('Error saving watch progress:', error)
    }
  }

  const incrementViews = async (mediaId: string) => {
    try {
      await mediaLibraryService.incrementViews(mediaId)
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  const refreshMedia = async () => {
    await loadInitialData()
    if (user) {
      await loadUserData()
    }
  }

  const value: MediaContextType = {
    allMedia,
    featuredMedia,
    continueWatching,
    favorites,
    categories,
    playlists,
    adminPlaylists,
    isLoading,
    isLoadingPlaylists,
    isLoadingMore,
    hasMore,
    getMediaByType,
    getMediaByCategory,
    searchMedia,
    addToFavorites,
    removeFromFavorites,
    saveWatchProgress,
    incrementViews,
    refreshMedia,
    refreshPlaylists,
    loadMore
  }

  return (
    <MediaContext.Provider value={value}>
      {children}
    </MediaContext.Provider>
  )
}

export function useMedia() {
  const context = useContext(MediaContext)
  if (context === undefined) {
    throw new Error('useMedia must be used within a MediaProvider')
  }
  return context
}
