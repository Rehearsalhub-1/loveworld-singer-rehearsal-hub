/**
 * Media Library - Standalone Module
 *
 * Media CRUD / history / favorites via mediaLibraryService.
 * Temporary Firestore setup export until realtime migrates to WebSocket.
 */

// Media service
export { mediaLibraryService, mediaLibraryService as mediaService } from './media-library-service'
export { default } from './media-library-service'

// Types
export type {
  MediaItem,
  Genre,
  UserWatchHistory,
  UserFavorite,
} from './media-library-service'


