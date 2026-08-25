/**
 * Media Service
 * 
 * Wrapper around Firebase media operations
 * All media-related business logic goes here
 */

import mediaLibraryService from './media-library-service'

// Re-export types
export type { MediaItem, Genre, UserWatchHistory } from './media-library-service'

// Re-export the service
export { default as mediaService } from './media-library-service'
export default mediaLibraryService
