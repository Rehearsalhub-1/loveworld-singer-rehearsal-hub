// Media library service

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
    console.warn('[migration] media-library-service.ts: createMedia — no JWT write route yet');
    void mediaData;
    return '';
  }

  async getAllMedia(limitCount: number = 24): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: getAllMedia — no JWT API route yet');
    void limitCount;
    return [];
  }

  async getMediaForZone(isHQZone: boolean, limitCount: number = 24): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: getMediaForZone — no JWT API route yet');
    void isHQZone;
    void limitCount;
    return [];
  }

  async loadMoreMedia(lastCreatedAt: Date, limitCount: number = 12): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: loadMoreMedia — no JWT API route yet');
    void lastCreatedAt;
    void limitCount;
    return [];
  }

  async getMediaByType(type: MediaItem['type']): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: getMediaByType — no JWT API route yet');
    void type;
    return [];
  }

  async getMediaByGenre(genre: string): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: getMediaByGenre — no JWT API route yet');
    void genre;
    return [];
  }

  async getFeaturedMedia(): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: getFeaturedMedia — no JWT API route yet');
    return [];
  }

  async getMediaById(mediaId: string): Promise<MediaItem | null> {
    console.warn('[migration] media-library-service.ts: getMediaById — no JWT API route yet');
    void mediaId;
    return null;
  }

  async getMediaByIds(mediaIds: string[]): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: getMediaByIds — no JWT API route yet');
    void mediaIds;
    return [];
  }

  async getRelatedMedia(mediaId: string, limitCount: number = 10): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: getRelatedMedia — no JWT API route yet');
    void mediaId;
    void limitCount;
    return [];
  }

  async searchMedia(searchTerm: string): Promise<MediaItem[]> {
    console.warn('[migration] media-library-service.ts: searchMedia — no JWT API route yet');
    void searchTerm;
    return [];
  }

  async incrementViews(mediaId: string): Promise<void> {
    console.warn('[migration] media-library-service.ts: incrementViews — no JWT write route yet');
    void mediaId;
  }

  async incrementLikes(mediaId: string): Promise<void> {
    console.warn('[migration] media-library-service.ts: incrementLikes — no JWT write route yet');
    void mediaId;
  }

  async getAllGenres(): Promise<Genre[]> {
    console.warn('[migration] media-library-service.ts: getAllGenres — no JWT API route yet');
    return [];
  }

  async saveWatchProgress(userId: string, mediaId: string, progress: number): Promise<void> {
    console.warn('[migration] media-library-service.ts: saveWatchProgress — no JWT write route yet');
    void userId;
    void mediaId;
    void progress;
  }

  async getUserWatchHistory(userId: string): Promise<UserWatchHistory[]> {
    console.warn('[migration] media-library-service.ts: getUserWatchHistory — no JWT API route yet');
    void userId;
    return [];
  }

  async removeFromWatchHistory(historyId: string): Promise<void> {
    console.warn('[migration] media-library-service.ts: removeFromWatchHistory — no JWT write route yet');
    void historyId;
  }

  async clearUserWatchHistory(userId: string): Promise<void> {
    console.warn('[migration] media-library-service.ts: clearUserWatchHistory — no JWT API route yet');
    void userId;
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
    void userId;
    void mediaId;
  }

  async removeFromFavorites(userId?: string, mediaId?: string): Promise<void> {
    void userId;
    void mediaId;
  }

  async getUserFavorites(userId?: string): Promise<MediaItem[]> {
    void userId;
    return [];
  }

  async isFavorite(userId?: string, mediaId?: string): Promise<boolean> {
    void userId;
    void mediaId;
    return false;
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
