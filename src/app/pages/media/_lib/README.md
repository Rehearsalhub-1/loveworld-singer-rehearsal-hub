# Media Library Module

A complete, standalone Firebase-based media management system. This module is self-contained and can be easily copied to other projects.

## Features

- ✅ Media CRUD operations (Create, Read, Update, Delete)
- ✅ Watch history tracking with progress
- ✅ Favorites management
- ✅ File uploads to Firebase Storage (videos, images, thumbnails)
- ✅ Real-time subscriptions
- ✅ Search and filtering by type/genre
- ✅ Featured media support
- ✅ View and like counters

## Files Structure

```
_lib/
├── firebase-setup.ts              # Firebase initialization
├── media-library-service.ts      # Media CRUD & business logic
├── firebase-storage-service.ts    # File upload/download
├── media-service.ts               # Service wrapper
├── index.ts                       # Main exports
└── README.md                      # This file
```

## Setup

### 1. Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2. Firebase Collections

The module uses these Firestore collections:

- `media_items` - Main media content
- `media_genres` - Genre categories
- `watch_history` - User watch progress
- `user_favorites` - User favorites

### 3. Firebase Storage Structure

```
media/
├── videos/       # Video files
├── images/       # Images and backdrops
└── thumbnails/   # Video thumbnails
```

## Usage

### Import the services

```typescript
import { mediaService, storageService } from '@/app/pages/media/_lib'
```

### Get all media

```typescript
const allMedia = await mediaService.getAllMedia()
```

### Get media by type

```typescript
const sermons = await mediaService.getMediaByType('sermon')
const worship = await mediaService.getMediaByType('worship')
```

### Upload a video

```typescript
const result = await storageService.uploadVideo(
  videoFile,
  (progress) => {
    console.log(`Upload: ${progress.progress}%`)
  }
)
console.log('Video URL:', result.url)
```

### Track watch progress

```typescript
await mediaService.saveWatchProgress(userId, mediaId, 45) // 45% watched
```

### Add to favorites

```typescript
await mediaService.addToFavorites(userId, mediaId)
```

### Real-time updates

```typescript
const unsubscribe = mediaService.subscribeToMedia((media) => {
  console.log('Media updated:', media)
})

// Later: unsubscribe()
```

## Copy to New Project

To use this module in a new project:

1. Copy the entire `_lib` folder
2. Install dependencies:
   ```bash
   npm install firebase
   ```
3. Set up environment variables
4. Import and use the services

## Types

### MediaItem

```typescript
interface MediaItem {
  id: string
  title: string
  description: string
  thumbnail: string
  videoUrl: string
  backdropImage?: string
  genre: string[]
  type: 'movie' | 'tvshow' | 'sermon' | 'worship' | 'teaching'
  duration?: number
  releaseYear?: number
  rating?: number
  views: number
  likes: number
  featured: boolean
  createdAt: Date
  updatedAt: Date
}
```

### UploadProgress

```typescript
interface UploadProgress {
  progress: number
  bytesTransferred: number
  totalBytes: number
  state: 'running' | 'paused' | 'success' | 'error'
}
```

## API Reference

### Media Service

- `getAllMedia()` - Get all media items
- `getMediaByType(type)` - Filter by type
- `getMediaByGenre(genre)` - Filter by genre
- `getFeaturedMedia()` - Get featured items
- `getMediaById(id)` - Get single item
- `searchMedia(term)` - Search by title/description
- `incrementViews(id)` - Increment view count
- `incrementLikes(id)` - Increment like count
- `saveWatchProgress(userId, mediaId, progress)` - Save watch progress
- `getContinueWatching(userId)` - Get partially watched items
- `addToFavorites(userId, mediaId)` - Add to favorites
- `removeFromFavorites(userId, mediaId)` - Remove from favorites
- `getUserFavorites(userId)` - Get user's favorites
- `subscribeToMedia(callback)` - Real-time updates

### Storage Service

- `uploadVideo(file, onProgress)` - Upload video file
- `uploadImage(file, onProgress)` - Upload image file
- `uploadThumbnail(file, onProgress)` - Upload thumbnail
- `deleteFile(path)` - Delete file from storage
- `listFiles(folder)` - List all files in folder
- `formatFileSize(bytes)` - Format bytes to human-readable

## Notes

- Search is client-side. For production, consider Algolia or similar
- File uploads show progress via callback
- All timestamps are converted to JavaScript Date objects
- The module reuses existing Firebase app if already initialized
