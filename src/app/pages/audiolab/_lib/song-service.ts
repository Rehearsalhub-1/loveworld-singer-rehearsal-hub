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
  console.warn('[migration] song-service.ts: getSongsByProgram — no JWT API route yet');
  void programId;
  return [];
}

/**
 * Get songs from Master Library with pagination support
 */
export async function getSongsPaginated(
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  limitCount: number = 20
): Promise<{ songs: AudioLabSong[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  console.warn('[migration] song-service.ts: getSongsPaginated — no JWT API route yet');
  void lastDoc;
  void limitCount;
  return { songs: [], lastDoc: null };
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
  console.warn('[migration] song-service.ts: getTotalSongCount — no JWT API route yet');
  return 0;
}

export async function getSongs(zoneId?: string, limitCount: number = 500): Promise<AudioLabSong[]> {
  console.warn('[migration] song-service.ts: getSongs — no JWT API route yet');
  void zoneId;
  void limitCount;
  return [];
}

/**
 * Get ALL songs from Master Library (including those without audio)
 * Used for browsing/viewing lyrics
 */
export async function getAllMasterSongs(limitCount: number = 200): Promise<AudioLabSong[]> {
  console.warn('[migration] song-service.ts: getAllMasterSongs — no JWT API route yet');
  void limitCount;
  return [];
}

/**
 * Get a single song by ID (checks Master Library first)
 */
export async function getSongById(songId: string): Promise<AudioLabSong | null> {
  console.warn('[migration] song-service.ts: getSongById — no JWT API route yet');
  void songId;
  return null;
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
  console.warn('[migration] song-service.ts: createSong — no JWT API route yet');
  void input;
  return { success: false, error: 'Song create unavailable during migration' };
}

/**
 * Update an existing song
 */
export async function updateSong(
  songId: string,
  updates: Partial<Omit<AudioLabSong, 'id' | 'createdAt' | 'createdBy'>>
): Promise<{ success: boolean; error?: string }> {
  console.warn('[migration] song-service.ts: updateSong — no JWT API route yet');
  void songId;
  void updates;
  return { success: false, error: 'Song update unavailable during migration' };
}

/**
 * Delete a song
 */
export async function deleteSong(songId: string): Promise<{ success: boolean; error?: string }> {
  console.warn('[migration] song-service.ts: deleteSong — no JWT API route yet');
  void songId;
  return { success: false, error: 'Song delete unavailable during migration' };
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
  console.warn('[migration] song-service.ts: updateSongAudioPart — no JWT API route yet');
  void songId;
  void part;
  void url;
  return { success: false, error: 'Song audio part update unavailable during migration' };
}

/**
 * Remove a specific vocal part from a song
 */
export async function removeSongAudioPart(
  songId: string,
  part: VocalPart
): Promise<{ success: boolean; error?: string }> {
  try {

    console.warn('[migration] song-service.ts: removeSongAudioPart — no JWT API route yet');
    void songId;
    void part;
    return { success: false, error: 'Song audio part removal unavailable during migration' };
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
  console.warn('[migration] song-service.ts: updateSongLyrics — no JWT API route yet');
  void songId;
  void lyrics;
  return { success: false, error: 'Song lyrics update unavailable during migration' };
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
