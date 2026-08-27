/**
 * AUDIOLAB SONG SERVICE
 * 
 * Master Library songs for AudioLab
 */

import type {
  AudioLabSong,
  CreateSongInput,
  VocalPart,
  AudioUrls,
  LyricLine
} from '../_types';
import { apiClient } from '@/lib/api-client';

type QueryDocumentSnapshot<T = any> = any;
type DocumentData = any;

// Collection names
const MASTER_SONGS_COLLECTION = 'master_songs'; // Primary source - HQ published songs
const AUDIOLAB_SONGS_COLLECTION = 'audiolab_songs'; // Zone-specific songs (future use)
const COLLECTION_NAME = AUDIOLAB_SONGS_COLLECTION; // Default collection for CRUD operations

// Cache for songs (5 min TTL)
const songCache: Map<string, { data: AudioLabSong[]; timestamp: number }> = new Map();
const paginatedCache: Map<string, { data: { songs: AudioLabSong[]; lastDoc: any }; timestamp: number }> = new Map();
const countCache: { value: number; timestamp: number } | null = { value: 0, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000;

// TYPES

export interface MasterProgram {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  sortOrder?: number;
}

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string };

function toAudioLabSong(data: Record<string, any>): AudioLabSong {
  const audioUrls: AudioUrls = data.audioUrls || data.audio_urls || {};
  const audioFile = data.audioFile || data.audio_file;
  if (!audioUrls.full && audioFile) audioUrls.full = audioFile;

  return {
    id: String(data.id),
    title: String(data.title || ''),
    artist: String(data.artist || data.writer || data.leadSinger || ''),
    duration: Number(data.duration || 0),
    audioUrls,
    availableParts: determineAvailableParts(audioUrls),
    genre: data.genre || data.category || '',
    key: data.key || '',
    tempo: typeof data.tempo === 'string' ? parseInt(data.tempo, 10) || 0 : Number(data.tempo || 0),
    albumArt: data.albumArt || data.imageUrl || data.image_url || '',
    lyricsUrl: data.lyricsUrl || '',
    lyrics: parseLyrics(data.lyrics),
    zoneId: data.zoneId || undefined,
    isHQSong: data.isHQSong ?? data.isHqOnly ?? true,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    createdBy: String(data.createdBy || data.publishedBy || ''),
  };
}

async function fetchMasterSongs(): Promise<AudioLabSong[]> {
  const response = await apiClient.get<ApiEnvelope<Record<string, any>[]>>('/songs/master');
  if (response?.success === false) throw new Error(response.error || 'Failed to load songs');
  return (Array.isArray(response?.data) ? response.data : []).map(toAudioLabSong);
}

// FETCH OPERATIONS

/**
 * Get all programs (categories)
 */
export async function getPrograms(): Promise<MasterProgram[]> {
  console.warn('[migration] song-service.ts: getPrograms — no JWT API route yet');
  return [];
}

/**
 * Get songs for a specific program
 */
export async function getSongsByProgram(programId: string): Promise<AudioLabSong[]> {
  const songs = await fetchMasterSongs();
  return songs.filter((song) => (song as any).programId === programId);
}

/**
 * Get songs from Master Library with pagination support
 */
export async function getSongsPaginated(
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  limitCount: number = 20
): Promise<{ songs: AudioLabSong[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const allSongs = await fetchMasterSongs();
  const offset = lastDoc && typeof lastDoc.offset === 'number' ? lastDoc.offset : 0;
  const songs = allSongs.slice(offset, offset + limitCount);
  const nextOffset = offset + songs.length;
  return {
    songs,
    lastDoc: nextOffset < allSongs.length ? { offset: nextOffset } : null,
  };
}

/**
 * Deep search songs across Master Library and Praise Night (Local filtering on full set for better results)
 */
export async function searchSongsDeep(searchTerm: string, zoneId?: string): Promise<AudioLabSong[]> {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const queryTerm = searchTerm.toLowerCase().trim();
    
    // Fetch all Master Library songs (cached)
    const masterSongs = await getSongs(undefined, 5000);
    
    // Filter locally for better flexibility (matches anywhere in title/artist/genre)
    return masterSongs.filter(song => 
      song.title.toLowerCase().includes(queryTerm) ||
      song.artist.toLowerCase().includes(queryTerm) ||
      (song.genre && song.genre.toLowerCase().includes(queryTerm))
    );
  } catch (error) {
    console.error('[SongService] Error performing deep search:', error);
    return [];
  }
}

/**
 * Get total number of songs in Master Library
 */
export async function getTotalSongCount(): Promise<number> {
  return (await fetchMasterSongs()).length;
}

export async function getSongs(zoneId?: string, limitCount: number = 500): Promise<AudioLabSong[]> {
  const songs = await fetchMasterSongs();
  return songs.filter((song) => !zoneId || !song.zoneId || song.zoneId === zoneId).slice(0, limitCount);
}

/**
 * Get ALL songs from Master Library (including those without audio)
 * Used for browsing/viewing lyrics
 */
export async function getAllMasterSongs(limitCount: number = 200): Promise<AudioLabSong[]> {
  return (await fetchMasterSongs()).slice(0, limitCount);
}

/**
 * Get a single song by ID (checks Master Library first)
 */
export async function getSongById(songId: string): Promise<AudioLabSong | null> {
  const response = await apiClient.get<ApiEnvelope<Record<string, any>>>(`/songs/master/${encodeURIComponent(songId)}`);
  return response?.data ? toAudioLabSong(response.data) : null;
}

/**
 * Search songs by title, artist, or genre
 */
export async function searchSongs(queryStr: string, zoneId?: string): Promise<AudioLabSong[]> {
  try {
    // Get all songs and filter client-side (Firestore doesn't support full-text search)
    const allSongs = await getSongs(zoneId);
    const searchLower = queryStr.toLowerCase();

    return allSongs.filter(song =>
      song.title.toLowerCase().includes(searchLower) ||
      song.artist.toLowerCase().includes(searchLower) ||
      (song.genre?.toLowerCase().includes(searchLower)) ||
      (song.key?.toLowerCase().includes(searchLower))
    );
  } catch (error) {
 console.error('[SongService] Error searching songs:', error);
    return [];
  }
}

/**
 * Get songs that have a specific vocal part available
 * Filters from Master Library songs
 */
export async function getSongsByVocalPart(part: VocalPart, zoneId?: string): Promise<AudioLabSong[]> {
  try {

    // Get all songs from Master Library and filter client-side
    // (Master songs don't have availableParts field, we derive it from audioUrls)
    const allSongs = await getSongs(zoneId);

    const filteredSongs = allSongs.filter(song =>
      song.availableParts?.includes(part)
    );

    return filteredSongs;
  } catch (error) {
 console.error('[SongService] Error fetching songs by part:', error);
    return [];
  }
}

// CRUD OPERATIONS (Admin)

/**
 * Create a new song
 */
export async function createSong(input: CreateSongInput): Promise<{ success: boolean; id?: string; error?: string }> {
  const response = await apiClient.post<ApiEnvelope<{ id?: string }>>('/master', {
    ...input,
    writer: input.artist,
    category: input.genre,
    audioFile: input.audioUrls.full,
  });
  return { success: response?.success !== false, id: response?.data?.id, error: response?.error };
}

/**
 * Update an existing song
 */
export async function updateSong(
  songId: string,
  updates: Partial<Omit<AudioLabSong, 'id' | 'createdAt' | 'createdBy'>>
): Promise<{ success: boolean; error?: string }> {
  const response = await apiClient.patch<ApiEnvelope<unknown>>(`/master/${encodeURIComponent(songId)}`, updates);
  return { success: response?.success !== false, error: response?.error };
}

/**
 * Delete a song
 */
export async function deleteSong(songId: string): Promise<{ success: boolean; error?: string }> {
  const response = await apiClient.delete<ApiEnvelope<unknown>>(`/master/${encodeURIComponent(songId)}`);
  return { success: response?.success !== false, error: response?.error };
}

// AUDIO PART MANAGEMENT

/**
 * Upload/update a specific vocal part for a song
 */
export async function updateSongAudioPart(
  songId: string,
  part: VocalPart,
  url: string
): Promise<{ success: boolean; error?: string }> {
  const song = await getSongById(songId);
  if (!song) return { success: false, error: 'Song not found' };
  const response = await apiClient.patch<ApiEnvelope<unknown>>(`/master/${encodeURIComponent(songId)}`, {
    audioUrls: { ...song.audioUrls, [part]: url },
  });
  return { success: response?.success !== false, error: response?.error };
}

/**
 * Remove a specific vocal part from a song
 */
export async function removeSongAudioPart(
  songId: string,
  part: VocalPart
): Promise<{ success: boolean; error?: string }> {
  try {

    const song = await getSongById(songId);
    if (!song) return { success: false, error: 'Song not found' };
    const audioUrls = { ...song.audioUrls };
    delete audioUrls[part];
    const response = await apiClient.patch<ApiEnvelope<unknown>>(`/master/${encodeURIComponent(songId)}`, { audioUrls });
    return { success: response?.success !== false, error: response?.error };
  } catch (error) {
 console.error('[SongService] Error removing audio part:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove audio part'
    };
  }
}

// LYRICS MANAGEMENT

/**
 * Update lyrics for a song
 */
export async function updateSongLyrics(
  songId: string,
  lyrics: LyricLine[]
): Promise<{ success: boolean; error?: string }> {
  const response = await apiClient.patch<ApiEnvelope<unknown>>(`/songs/${encodeURIComponent(songId)}/lyrics`, { lyrics });
  return { success: response?.success !== false, error: response?.error };
}

// HELPER FUNCTIONS

/**
 * Convert Firestore document to AudioLabSong
 */
function docToSong(doc: any): AudioLabSong {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || '',
    artist: data.artist || '',
    duration: data.duration || 0,
    audioUrls: data.audioUrls || {},
    availableParts: data.availableParts || [],
    genre: data.genre || '',
    key: data.key || '',
    tempo: data.tempo || 0,
    albumArt: data.albumArt || '',
    lyricsUrl: data.lyricsUrl || '',
    lyrics: data.lyrics || [],
    zoneId: data.zoneId || '',
    isHQSong: data.isHQSong ?? true,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    createdBy: data.createdBy || ''
  };
}

/**
 * Convert Master Library song to AudioLabSong format
 * Master songs have slightly different field names
 */
function masterSongToAudioLabSong(doc: any): AudioLabSong {
  const data = doc.data();

  // Determine available parts from audioUrls (including custom parts)
  const audioUrls: AudioUrls = data.audioUrls || {};
  const customParts: string[] = data.customParts || [];
  const availableParts: VocalPart[] = [];

  // Check standard parts
  if (audioUrls.full) availableParts.push('full');
  if (audioUrls.soprano) availableParts.push('soprano');
  if (audioUrls.alto) availableParts.push('alto');
  if (audioUrls.tenor) availableParts.push('tenor');
  if (audioUrls.bass) availableParts.push('bass');

  // Add custom parts that have audio URLs
  customParts.forEach(part => {
    if (audioUrls[part]) {
      availableParts.push(part);
    }
  });

  // If no multi-part audio but has single audioFile, use it as 'full'
  if (availableParts.length === 0 && data.audioFile) {
    audioUrls.full = data.audioFile;
    availableParts.push('full');
  }

  return {
    id: doc.id,
    title: data.title || '',
    artist: data.writer || data.leadSinger || 'Unknown Artist', // Master songs use writer/leadSinger
    duration: data.duration || 0,
    audioUrls,
    availableParts,
    genre: data.category || '', // Master songs use category
    key: data.key || '',
    tempo: typeof data.tempo === 'string' ? parseInt(data.tempo) || 0 : data.tempo || 0,
    albumArt: data.albumArt || '',
    lyricsUrl: data.lyricsUrl || '',
    lyrics: parseLyrics(data.lyrics), // Parse lyrics string to LyricLine[]
    zoneId: '', // Master songs are available to all zones
    isHQSong: true,
    createdAt: data.publishedAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    createdBy: data.publishedBy || ''
  };
}

/**
 * Parse lyrics from string or array format to LyricLine[]
 */
function parseLyrics(lyrics: any): LyricLine[] {
  if (!lyrics) return [];

  // If already in LyricLine[] format
  if (Array.isArray(lyrics) && lyrics.length > 0 && typeof lyrics[0] === 'object') {
    return lyrics;
  }

  // If string format, convert to simple lines (no timing)
  if (typeof lyrics === 'string') {
    const lines = lyrics.split('\n').filter(line => line.trim());
    return lines.map((text, index) => ({
      time: index * 5, // Default 5 seconds per line
      text: text.trim(),
      duration: 5
    }));
  }

  return [];
}

/**
 * Determine available parts from audioUrls (including custom parts)
 */
function determineAvailableParts(audioUrls: AudioUrls): VocalPart[] {
  const parts: VocalPart[] = [];
  const standardParts: VocalPart[] = ['full', 'soprano', 'alto', 'tenor', 'bass'];

  // Check all keys in audioUrls
  Object.keys(audioUrls).forEach(key => {
    if (audioUrls[key]) {
      parts.push(key as VocalPart);
    }
  });

  return parts;
}

/**
 * Clear song cache
 */
export function clearSongCache(): void {
  songCache.clear();
}

// CONVERSION UTILITIES

/**
 * Convert AudioLabSong to legacy Song format (for backward compatibility)
 */
export function toLegacySong(song: AudioLabSong) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    genre: song.genre,
    key: song.key,
    tempo: song.tempo,
    albumArt: song.albumArt,
    audioUrl: song.audioUrls.full || Object.values(song.audioUrls)[0] || '',
    lyricsUrl: song.lyricsUrl,
    audioUrls: song.audioUrls,
    availableParts: song.availableParts,
    isHQSong: song.isHQSong,
    lyrics: song.lyrics
  };
}
