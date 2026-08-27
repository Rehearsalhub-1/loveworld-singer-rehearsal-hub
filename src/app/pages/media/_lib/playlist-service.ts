"use client";

'use client'

import { apiClient } from '@/lib/api-client'

export interface PlaylistItem {
  id: string
  type: 'video' | 'playlist'
  addedAt: Date
}

export interface Playlist {
  id: string
  name: string
  description?: string
  userId: string
  videoIds: string[] // Legacy: just video IDs
  items?: PlaylistItem[] // New: mixed content (videos + playlists)
  childPlaylistIds?: string[] // IDs of nested playlists
  thumbnail?: string
  isPublic: boolean
  isSystem?: boolean // For Liked Videos, Watch Later
  systemType?: 'liked' | 'watch_later'
  type?: string // Category type (same as video categories)
  totalVideos?: number // Computed: total videos including nested playlists
  isAdmin?: boolean // For LWS Official label
  createdAt: Date
  updatedAt: Date
}

function toDate(val: unknown): Date {
  if (val instanceof Date) return val
  if (val && typeof val === 'object' && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate()
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function mapPlaylistRow(row: Record<string, unknown>, fallbackUserId?: string): Playlist {
  const songs = Array.isArray(row.videoIds)
    ? (row.videoIds as string[])
    : Array.isArray(row.songIds)
      ? (row.songIds as string[])
      : Array.isArray(row.songs)
        ? (row.songs as string[])
        : []

  return {
    id: String(row.id ?? ''),
    name: String(row.name || row.title || 'Playlist'),
    description: typeof row.description === 'string' ? row.description : undefined,
    userId: String(row.userId ?? row.user_id ?? fallbackUserId ?? ''),
    videoIds: songs.map(String),
    items: Array.isArray(row.items) ? (row.items as PlaylistItem[]) : undefined,
    childPlaylistIds: Array.isArray(row.childPlaylistIds) ? (row.childPlaylistIds as string[]) : undefined,
    thumbnail: typeof row.thumbnail === 'string' ? row.thumbnail : undefined,
    isPublic: Boolean(row.isPublic ?? row.is_public),
    isSystem: Boolean(row.isSystem ?? row.is_system),
    systemType: row.systemType as Playlist['systemType'],
    type: typeof row.type === 'string' ? row.type : undefined,
    totalVideos: typeof row.totalVideos === 'number' ? row.totalVideos : undefined,
    isAdmin: Boolean(row.isAdmin),
    createdAt: toDate(row.createdAt ?? row.created_at),
    updatedAt: toDate(row.updatedAt ?? row.updated_at),
  }
}

async function fetchMyPlaylists(userId?: string): Promise<Playlist[]> {
  const res = await apiClient.get<{ success?: boolean; data?: unknown[] }>('/playlists/me')
  const rows = Array.isArray(res.data) ? res.data : []
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => mapPlaylistRow(row, userId))
}

// System playlist IDs
export const getSystemPlaylistId = (userId: string, type: 'liked' | 'watch_later') =>
  `${userId}_${type}`

// Ensure system playlists exist for user
export async function ensureSystemPlaylists(userId: string): Promise<void> {
  const playlists = await fetchMyPlaylists(userId)
  for (const systemType of ['liked', 'watch_later'] as const) {
    const id = getSystemPlaylistId(userId, systemType)
    if (!playlists.some((playlist) => playlist.id === id)) {
      await apiClient.post('/playlists', {
        id,
        title: systemType === 'liked' ? 'Liked Videos' : 'Watch Later',
        name: systemType === 'liked' ? 'Liked Videos' : 'Watch Later',
        isPublic: false,
        songIds: [],
      })
    }
  }
}

// Toggle like on a video
export async function toggleLikeVideo(userId: string, videoId: string, thumbnail?: string): Promise<boolean> {
  void thumbnail;
  await ensureSystemPlaylists(userId)
  const playlistId = getSystemPlaylistId(userId, 'liked')
  const liked = await isVideoLiked(userId, videoId)
  if (liked) await removeFromPlaylist(playlistId, videoId)
  else await addToPlaylist(playlistId, videoId)
  return !liked
}

// Toggle watch later on a video
export async function toggleWatchLater(userId: string, videoId: string, thumbnail?: string): Promise<boolean> {
  void thumbnail;
  await ensureSystemPlaylists(userId)
  const playlistId = getSystemPlaylistId(userId, 'watch_later')
  const saved = await isInWatchLater(userId, videoId)
  if (saved) await removeFromPlaylist(playlistId, videoId)
  else await addToPlaylist(playlistId, videoId)
  return !saved
}

export async function isVideoLiked(userId: string, videoId: string): Promise<boolean> {
  const playlistId = getSystemPlaylistId(userId, 'liked')
  const playlist = await getPlaylist(playlistId)
  return playlist?.videoIds.includes(videoId) || false
}

export async function isInWatchLater(userId: string, videoId: string): Promise<boolean> {
  const playlistId = getSystemPlaylistId(userId, 'watch_later')
  const playlist = await getPlaylist(playlistId)
  return playlist?.videoIds.includes(videoId) || false
}

// Create a new playlist
export async function createPlaylist(
  userId: string,
  name: string,
  description?: string,
  isPublic: boolean = false,
  type?: string // Category type
): Promise<string> {
  void userId
  const response = await apiClient.post<{ success?: boolean; data?: { id?: string }; error?: string }>('/playlists', {
    name,
    title: name,
    description,
    isPublic,
    type,
  })
  if (response.success === false || !response.data?.id) throw new Error(response.error || 'Failed to create playlist')
  return response.data.id
}

// Get user's playlists
export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  try {
    const playlists = await fetchMyPlaylists(userId)
    return playlists.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  } catch (error) {
 console.error(' Error getting playlists:', error)
    throw error
  }
}

// Get single playlist
export async function getPlaylist(playlistId: string): Promise<Playlist | null> {
  try {
    const response = await apiClient.get<{ success?: boolean; data?: Record<string, unknown>; error?: string }>(`/playlists/${encodeURIComponent(playlistId)}`)
    return response.success === false || !response.data ? null : mapPlaylistRow(response.data)
  } catch (error) {
    console.error(' Error getting playlist:', error)
    return null
  }
}

// Add video to playlist
export async function addToPlaylist(playlistId: string, videoId: string, thumbnail?: string): Promise<void> {
  void thumbnail;
  const response = await apiClient.post<{ success?: boolean; error?: string }>(`/playlists/${encodeURIComponent(playlistId)}/songs`, { songId: videoId })
  if (response.success === false) throw new Error(response.error || 'Failed to add video to playlist')
}

// Remove video from playlist
export async function removeFromPlaylist(playlistId: string, videoId: string): Promise<void> {
  const response = await apiClient.delete<{ success?: boolean; error?: string }>(`/playlists/${encodeURIComponent(playlistId)}/songs/${encodeURIComponent(videoId)}`)
  if (response.success === false) throw new Error(response.error || 'Failed to remove video from playlist')
}

export async function updatePlaylist(
  playlistId: string,
  data: { name?: string; description?: string; isPublic?: boolean; type?: string }
): Promise<void> {
  const response = await apiClient.patch<{ success?: boolean; error?: string }>(`/playlists/${encodeURIComponent(playlistId)}`, data)
  if (response.success === false) throw new Error(response.error || 'Failed to update playlist')
}

// Delete playlist
export async function deletePlaylist(playlistId: string): Promise<void> {
  const response = await apiClient.delete<{ success?: boolean; error?: string }>(`/playlists/${encodeURIComponent(playlistId)}`)
  if (response.success === false) throw new Error(response.error || 'Failed to delete playlist')
}

export async function getPlaylistsContainingVideo(userId: string, videoId: string): Promise<string[]> {
  const playlists = await getUserPlaylists(userId)
  return playlists.filter(p => p.videoIds.includes(videoId)).map(p => p.id)
}

// Add a playlist to another playlist (nested playlist)
export async function addPlaylistToPlaylist(parentPlaylistId: string, childPlaylistId: string): Promise<void> {
  console.warn('[migration] playlist-service.ts: addPlaylistToPlaylist — no JWT write route yet');
  void parentPlaylistId;
  void childPlaylistId;
}

// Remove a playlist from another playlist
export async function removePlaylistFromPlaylist(parentPlaylistId: string, childPlaylistId: string): Promise<void> {
  console.warn('[migration] playlist-service.ts: removePlaylistFromPlaylist — no JWT write route yet');
  void parentPlaylistId;
  void childPlaylistId;
}

// Get all items (videos + playlists) for a playlist with full data
export async function getPlaylistItems(playlistId: string): Promise<{
  videos: any[]
  playlists: Playlist[]
  allVideoIds: string[] // Flattened list of all video IDs including nested
}> {
  const playlist = await getPlaylist(playlistId)
  if (!playlist) return { videos: [], playlists: [], allVideoIds: [] }

  const { mediaLibraryService } = await import('./media-library-service')

  // Get direct videos
  const videoPromises = playlist.videoIds.map(id => mediaLibraryService.getMediaById(id))
  const videos = (await Promise.all(videoPromises)).filter(Boolean)

  // Get nested playlists
  const childPlaylistIds = playlist.childPlaylistIds || []
  const playlistPromises = childPlaylistIds.map(id => getPlaylist(id))
  const playlists = (await Promise.all(playlistPromises)).filter(Boolean) as Playlist[]

  // Flatten all video IDs (including from nested playlists)
  let allVideoIds = [...playlist.videoIds]
  for (const childPlaylist of playlists) {
    allVideoIds = [...allVideoIds, ...childPlaylist.videoIds]
  }

  return { videos, playlists, allVideoIds: [...new Set(allVideoIds)] }
}

// Get user's playlists that can be added to another playlist (excludes system playlists and self)
export async function getAddablePlaylistsForUser(userId: string, excludePlaylistId?: string): Promise<Playlist[]> {
  const playlists = await getUserPlaylists(userId)
  return playlists.filter(p =>
    !p.isSystem &&
    p.id !== excludePlaylistId
  )
}

// Get all public playlists (for browsing)
export async function getPublicPlaylists(limitCount: number = 20): Promise<Playlist[]> {
  try {
    // Backend only exposes /playlists/me — filter public from current user list
    const playlists = await fetchMyPlaylists()
    return playlists
      .filter((p) => p.isPublic && !p.isSystem)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limitCount)
  } catch (error) {
 console.error(' Error getting public playlists:', error)
    return []
  }
}
