import { apiClient, getActiveScope } from '@/lib/api-client'

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return fallback
}

function normalizeType(raw: any): MediaItem['type'] {
  const candidate = String(raw?.type || raw?.mediaType || raw?.category || 'video').toLowerCase()
  if (candidate.includes('audio')) return 'audio'
  if (candidate.includes('image')) return 'image'
  if (candidate.includes('document')) return 'document'
  return 'video'
}

function normalizeMediaRow(raw: any): MediaItem | null {
  if (!raw || typeof raw !== 'object') return null

  const id = String(raw.id || raw.mediaId || raw._id || '')
  if (!id) return null

  const title = String(raw.title || raw.name || 'Untitled media')
  const url = String(raw.url || raw.videoUrl || raw.video_url || raw.youtubeUrl || raw.youtube_url || raw.thumbnail || '')
  const thumbnail = String(
    raw.thumbnail ?? raw.thumbnailUrl ?? raw.image ?? raw.coverImage ?? raw.poster ?? raw.imageUrl ?? ''
  )

  return {
    id,
    title,
    description: typeof raw.description === 'string' ? raw.description : '',
    thumbnail,
    videoUrl: url,
    youtubeUrl: typeof raw.youtubeUrl === 'string' ? raw.youtubeUrl : undefined,
    backdropImage: typeof raw.backdropImage === 'string' ? raw.backdropImage : undefined,
    genre: Array.isArray(raw.genre)
      ? raw.genre.map(String)
      : Array.isArray(raw.genres)
        ? raw.genres.map(String)
        : [],
    type: normalizeType(raw),
    duration: typeof raw.duration === 'number' ? raw.duration : undefined,
    releaseYear: typeof raw.releaseYear === 'number' ? raw.releaseYear : undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    views: toNumber(raw.views ?? raw.viewCount ?? raw.viewsCount, 0),
    likes: toNumber(raw.likes ?? raw.likeCount ?? raw.likesCount, 0),
    featured: Boolean(raw.featured ?? raw.isFeatured ?? false),
    hidden: Boolean(raw.hidden ?? false),
    isYouTube: Boolean(raw.isYoutube ?? raw.is_youtube ?? (raw.youtubeUrl || raw.youtube_url)),
    forHQ: Boolean(raw.forHq ?? raw.for_hq ?? (raw.isHqOnly ?? false)),
    createdByName: typeof raw.createdByName === 'string' ? raw.createdByName : undefined,
    createdAt: toDate(raw.createdAt ?? raw.created_at ?? new Date()),
    updatedAt: toDate(raw.updatedAt ?? raw.updated_at ?? new Date()),
  }
}

function unwrapResults(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, unknown>
  if (Array.isArray(record.data)) return record.data
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.results)) return record.results
  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>
    if (Array.isArray(nested.items)) return nested.items
    if (Array.isArray(nested.data)) return nested.data
  }
  return []
}

function getLocalHistoryKey(userId: string): string {
  return `lwsrh-media-history:${userId}`
}

function getLocalFavoritesKey(userId: string): string {
  return `lwsrh-media-favorites:${userId}`
}

function readJson<T>(key: string): T[] {
  if (typeof window === 'undefined') return [] as T[]
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return [] as T[]
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] as T[]
  }
}

function writeJson<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore quota or unavailable local storage issues.
  }
}

// Types
export interface AdminPlaylist {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  coverImage?: string;
  videoIds?: string[];
  videos?: any[];
  childPlaylistIds?: string[];
  order?: number;
  isPublished?: boolean;
  [key: string]: any;
}

export async function getAdminPlaylist(id: string): Promise<AdminPlaylist | null> {
  void id;
  return null;
}

export interface MediaItem {
  id: string
  title: string
  description: string
  thumbnail: string
  videoUrl: string
  youtubeUrl?: string
  backdropImage?: string
  genre: string[]
  type: string
  duration?: number
  releaseYear?: number
  rating?: number
  views: number
  likes: number
  featured: boolean
  hidden?: boolean
  isYouTube?: boolean
  forHQ?: boolean
  createdByName?: string
  createdAt: Date
  updatedAt: Date
}

export interface Genre {
  id: string
  name: string
  slug: string
}

export type MediaVideo = MediaItem;

export interface MediaCategory {
  id: string;
  name: string;
  description?: string;
  order?: number;
  icon?: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  subscriberCount: number;
  videoCount: number;
  isHQOnly?: boolean;
  allowedZones?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWatchHistory {
  id: string
  userId: string
  mediaId: string
  progress: number
  lastWatched: Date
}

export interface UserFavorite {
  id: string
  userId: string
  mediaId: string
  createdAt: Date
}

class MediaLibraryService {
  async getAll(): Promise<MediaItem[]> { return this.getAllMedia(); }
  async create(data: any): Promise<string> { return this.createMedia(data); }
  async update(id: string, data: any): Promise<void> { void id; void data; }
  async delete(id: string): Promise<void> { void id; }
  async createBatch(items: any[]): Promise<void> { void items; }

  private mediaCollection = 'media_videos'
  private genresCollection = 'media_genres'
  private watchHistoryCollection = 'watch_history'
  private favoritesCollection = 'user_favorites'

  async createMedia(mediaData: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const res = await apiClient.post<{ success?: boolean; data?: any }>('/media', mediaData)
    if (res?.success && res.data) {
      return String((res.data as any).id || '')
    }
    return ''
  }

  async getAllMedia(limitCount: number = 24): Promise<MediaItem[]> {
    const params = new URLSearchParams({ limit: String(limitCount), type: 'video' })
    const scope = getActiveScope()
    if (scope.zoneId) params.set('zoneId', scope.zoneId)
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>(`/media?${params.toString()}`)
    return unwrapResults(res)
      .map((item) => normalizeMediaRow(item))
      .filter((item): item is MediaItem => Boolean(item))
  }

  async getMediaForZone(isHQZone: boolean, limitCount: number = 24): Promise<MediaItem[]> {
    const params = new URLSearchParams({ limit: String(limitCount), type: 'video' })
    const scope = getActiveScope()
    if (scope.zoneId) params.set('zoneId', scope.zoneId)
    if (isHQZone) params.set('isHqOnly', 'true')
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>(`/media?${params.toString()}`)
    return unwrapResults(res)
      .map((item) => normalizeMediaRow(item))
      .filter((item): item is MediaItem => Boolean(item))
  }

  async loadMoreMedia(lastCreatedAt: Date, limitCount: number = 12): Promise<MediaItem[]> {
    const params = new URLSearchParams({ limit: String(limitCount), type: 'video' })
    const scope = getActiveScope()
    if (scope.zoneId) params.set('zoneId', scope.zoneId)
    if (lastCreatedAt) params.set('after', toDate(lastCreatedAt).toISOString())
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>(`/media?${params.toString()}`)
    return unwrapResults(res)
      .map((item) => normalizeMediaRow(item))
      .filter((item): item is MediaItem => Boolean(item))
  }

  async getMediaByType(type: MediaItem['type']): Promise<MediaItem[]> {
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>(`/media?type=${encodeURIComponent(type)}`)
    return unwrapResults(res)
      .map((item) => normalizeMediaRow(item))
      .filter((item): item is MediaItem => Boolean(item))
  }

  async getMediaByGenre(genre: string): Promise<MediaItem[]> {
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>(`/media?search=${encodeURIComponent(genre)}`)
    return unwrapResults(res)
      .map((item) => normalizeMediaRow(item))
      .filter((item): item is MediaItem => Boolean(item))
  }

  async getFeaturedMedia(): Promise<MediaItem[]> {
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>('/media?featured=true&limit=12')
    return unwrapResults(res)
      .map((item) => normalizeMediaRow(item))
      .filter((item): item is MediaItem => Boolean(item))
  }

  async getMediaById(mediaId: string): Promise<MediaItem | null> {
    if (!mediaId) return null
    const res = await apiClient.get<{ success?: boolean; data?: any }>(`/media/${encodeURIComponent(mediaId)}`)
    const item = res?.data ?? null
    return item ? normalizeMediaRow(item) : null
  }

  async getMediaByIds(mediaIds: string[]): Promise<MediaItem[]> {
    if (!mediaIds.length) return []
    const results = await Promise.all(mediaIds.map((id) => this.getMediaById(id)))
    return results.filter((item): item is MediaItem => Boolean(item))
  }

  async getRelatedMedia(mediaId: string, limitCount: number = 10): Promise<MediaItem[]> {
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>(`/media?limit=${limitCount}&search=${encodeURIComponent(mediaId)}`)
    return unwrapResults(res)
      .map((item) => normalizeMediaRow(item))
      .filter((item): item is MediaItem => item !== null && item.id !== mediaId)
  }

  async searchMedia(searchTerm: string): Promise<MediaItem[]> {
    if (!searchTerm.trim()) return []
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>(`/media?search=${encodeURIComponent(searchTerm)}`)
    return unwrapResults(res)
      .map((item) => normalizeMediaRow(item))
      .filter((item): item is MediaItem => Boolean(item))
  }

  async incrementViews(mediaId: string): Promise<void> {
    await apiClient.post(`/media/${encodeURIComponent(mediaId)}/views`, {}).catch(() => undefined)
  }

  async incrementLikes(mediaId: string): Promise<void> {
    await apiClient.post(`/media/${encodeURIComponent(mediaId)}/likes`, {}).catch(() => undefined)
  }

  async getAllGenres(): Promise<Genre[]> {
    const res = await apiClient.get<{ success?: boolean; data?: any[] }>('/media/categories')
    return unwrapResults(res)
      .map((row) => ({
        id: String(row.id || row.slug || row.name || ''),
        name: String(row.name || row.title || 'Category'),
        slug: String(row.slug || String(row.name || '').toLowerCase().replace(/\s+/g, '-')),
      }))
      .filter((row) => row.id)
  }

  async saveWatchProgress(userId: string, mediaId: string, progress: number): Promise<void> {
    if (!userId || !mediaId) return

    const key = getLocalHistoryKey(userId)
    const entries = readJson<UserWatchHistory>(key)
    const timestamp = new Date().toISOString()
    const next = { id: `${mediaId}_${Date.now()}`, userId, mediaId, progress, lastWatched: new Date(timestamp) }

    const filtered = entries.filter((entry) => entry.mediaId !== mediaId)
    filtered.unshift(next)
    writeJson(key, filtered.slice(0, 50))
  }

  async getUserWatchHistory(userId: string): Promise<UserWatchHistory[]> {
    if (!userId) return []
    const entries = readJson<UserWatchHistory>(getLocalHistoryKey(userId))
    return entries
      .map((entry) => ({
        ...entry,
        lastWatched: typeof entry.lastWatched === 'string' ? new Date(entry.lastWatched) : new Date(),
      }))
      .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime())
  }

  async removeFromWatchHistory(historyId: string): Promise<void> {
    if (!historyId) return
    const keys = Object.keys(localStorage || {})
    for (const key of keys) {
      if (!key.startsWith('lwsrh-media-history:')) continue
      const entries = readJson<UserWatchHistory>(key)
      const next = entries.filter((entry) => entry.id !== historyId)
      writeJson(key, next)
    }
  }

  async clearUserWatchHistory(userId: string): Promise<void> {
    if (!userId) return
    writeJson(getLocalHistoryKey(userId), [])
  }

  async getContinueWatching(userId: string): Promise<MediaItem[]> {
    try {
      const history = await this.getUserWatchHistory(userId)
      const mediaIds = history
        .filter(h => h.progress > 5 && h.progress < 95)
        .slice(0, 10)
        .map(h => h.mediaId)

      if (mediaIds.length === 0) return []

      return await this.getMediaByIds(mediaIds)
    } catch (error) {
      console.error('Error fetching continue watching:', error)
      return []
    }
  }

  async addToFavorites(userId?: string, mediaId?: string): Promise<void> {
    if (!userId || !mediaId) return
    const key = getLocalFavoritesKey(userId)
    const current = readJson<{ id: string; mediaId: string; createdAt: string }>(key)
    const next = current.filter((entry) => entry.mediaId !== mediaId)
    next.unshift({ id: `${userId}_${mediaId}`, mediaId, createdAt: new Date().toISOString() })
    writeJson(key, next)
  }

  async removeFromFavorites(userId?: string, mediaId?: string): Promise<void> {
    if (!userId || !mediaId) return
    const key = getLocalFavoritesKey(userId)
    const current = readJson<{ id: string; mediaId: string; createdAt: string }>(key)
    writeJson(key, current.filter((entry) => entry.mediaId !== mediaId))
  }

  async getUserFavorites(userId?: string): Promise<MediaItem[]> {
    if (!userId) return []
    const key = getLocalFavoritesKey(userId)
    const ids = readJson<{ mediaId: string }>(key).map((entry) => entry.mediaId)
    if (!ids.length) return []
    const items = await this.getMediaByIds(Array.from(new Set(ids)))
    return items
  }

  async isFavorite(userId?: string, mediaId?: string): Promise<boolean> {
    if (!userId || !mediaId) return false
    const key = getLocalFavoritesKey(userId)
    const current = readJson<{ mediaId: string }>(key)
    return current.some((entry) => entry.mediaId === mediaId)
  }

  subscribeToMedia(callback: (media: MediaItem[]) => void): () => void {
    let active = true;
    this.getAllMedia().then(media => {
      if (active) callback(media);
    });
    const interval = setInterval(async () => {
      if (!active) return;
      const media = await this.getAllMedia();
      if (active) callback(media);
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }
}

export const mediaLibraryService = new MediaLibraryService();
export const mediaService = mediaLibraryService;
export const mediaVideosService = mediaLibraryService;

export const channelService = {
  getAllChannels: async () => [] as Channel[],
  getChannelById: async (_id: string) => null as Channel | null,
  createChannel: async (_data: any) => '',
  updateChannel: async (_id: string, _data: any) => {},
  deleteChannel: async (_id: string) => {}
};

export const getAdminPlaylists = async () => [] as AdminPlaylist[];
export const getPublicAdminPlaylists = async (..._args: any[]) => [] as AdminPlaylist[];
export const createAdminPlaylist = async (_data: any) => '';
export const updateAdminPlaylist = async (_id: string, _data: any) => {};
export const deleteAdminPlaylist = async (_id: string) => {};
export const addVideoToPlaylist = async (_pId: string, _vId: string) => {};
export const removeVideoFromPlaylist = async (_pId: string, _vId: string) => {};

export const getCategories = async () => [] as MediaCategory[];
export const createCategory = async (_data: any) => '';
export const updateCategory = async (_id: string, _data: any) => {};
export const deleteCategory = async (_id: string) => {};

export default mediaLibraryService;
