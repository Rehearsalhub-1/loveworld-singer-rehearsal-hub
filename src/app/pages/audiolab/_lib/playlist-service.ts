"use client";

import type { Playlist } from '../_types';
import { apiClient } from '@/lib/api-client';

type ApiEnvelope<T = unknown> = { success?: boolean; data?: T; error?: string };

/**
 * Get all playlists for a specific user
 */
export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  void userId;
  const response = await apiClient.get<ApiEnvelope<Playlist[]>>('/playlists/me');
  return response?.success === false ? [] : (response?.data || []);
}

/**
 * Get a single playlist by ID
 */
export async function getPlaylistById(playlistId: string): Promise<Playlist | null> {
  const response = await apiClient.get<ApiEnvelope<Playlist>>(`/playlists/${encodeURIComponent(playlistId)}`);
  return response?.success === false ? null : (response?.data || null);
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
  const response = await apiClient.post<ApiEnvelope<{ id?: string }>>('/playlists', data);
  if (response?.success === false || !response.data?.id) throw new Error(response?.error || 'Failed to create playlist');
  return response.data.id;
}

/**
 * Update a playlist's details
 */
export async function updatePlaylist(
  playlistId: string,
  data: Partial<Omit<Playlist, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>
): Promise<void> {
  const response = await apiClient.patch<ApiEnvelope<unknown>>(`/playlists/${encodeURIComponent(playlistId)}`, data);
  if (response?.success === false) throw new Error(response.error || 'Failed to update playlist');
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  const response = await apiClient.delete<ApiEnvelope<unknown>>(`/playlists/${encodeURIComponent(playlistId)}`);
  if (response?.success === false) throw new Error(response.error || 'Failed to delete playlist');
}

/**
 * Add a song to a playlist
 */
export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  const response = await apiClient.post<ApiEnvelope<unknown>>(`/playlists/${encodeURIComponent(playlistId)}/songs`, { songId });
  if (response?.success === false) throw new Error(response.error || 'Failed to add song to playlist');
}

/**
 * Remove a song from a playlist
 */
export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  const response = await apiClient.delete<ApiEnvelope<unknown>>(`/playlists/${encodeURIComponent(playlistId)}/songs/${encodeURIComponent(songId)}`);
  if (response?.success === false) throw new Error(response.error || 'Failed to remove song from playlist');
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
