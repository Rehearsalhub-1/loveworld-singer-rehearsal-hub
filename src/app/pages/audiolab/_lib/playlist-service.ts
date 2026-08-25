"use client";

import type { Playlist } from '../_types';

/**
 * Get all playlists for a specific user
 */
export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  console.warn('[migration] playlist-service.ts: getUserPlaylists — no JWT API route yet');
  void userId;
  return [];
}

/**
 * Get a single playlist by ID
 */
export async function getPlaylistById(playlistId: string): Promise<Playlist | null> {
  console.warn('[migration] playlist-service.ts: getPlaylistById — no JWT API route yet');
  void playlistId;
  return null;
}

/**
 * Create a new playlist
 */
export async function createPlaylist(data: {
  title: string;
  description?: string;
  userId: string;
  zoneId?: string;
  isPublic?: boolean;
}): Promise<string> {
  console.warn('[migration] playlist-service.ts: createPlaylist — no JWT API route yet');
  void data;
  return '';
}

/**
 * Update a playlist's details
 */
export async function updatePlaylist(
  playlistId: string,
  data: Partial<Omit<Playlist, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>
): Promise<void> {
  console.warn('[migration] playlist-service.ts: updatePlaylist — no JWT API route yet');
  void playlistId;
  void data;
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  console.warn('[migration] playlist-service.ts: deletePlaylist — no JWT API route yet');
  void playlistId;
}

/**
 * Add a song to a playlist
 */
export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  console.warn('[migration] playlist-service.ts: addSongToPlaylist — no JWT API route yet');
  void playlistId;
  void songId;
}

/**
 * Remove a song from a playlist
 */
export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  console.warn('[migration] playlist-service.ts: removeSongFromPlaylist — no JWT API route yet');
  void playlistId;
  void songId;
}

/**
 * Check which playlists contain a specific song
 */
export async function getPlaylistsContainingSong(userId: string, songId: string): Promise<string[]> {
  try {
    const playlists = await getUserPlaylists(userId);
    return playlists
      .filter(p => p.songIds.includes(songId))
      .map(p => p.id);
  } catch (error) {
    console.error('[AudioLabPlaylistService] Error checking song in playlists:', error);
    return [];
  }
}
