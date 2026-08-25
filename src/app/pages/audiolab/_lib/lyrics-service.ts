/**
 * Lyrics Service for AudioLab & Playback Mode
 * Handles fetching, syncing, and storing lyrics for songs
 */

import type { LyricLine } from '../_types';
import { apiClient } from '@/lib/api-client';

interface SyncLyricsResponse {
  success: boolean;
  lyrics?: LyricLine[];
  rawText?: string;
  error?: string;
}

/**
 * Generate synced lyrics using Groq Whisper
 */
export async function generateSyncedLyrics(
  audioUrl: string,
  songId: string,
  existingLyrics?: string
): Promise<SyncLyricsResponse> {
  try {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('jwt') : null;

    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
    const response = await fetch(`${backendUrl}/api/lyrics-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ audioUrl, songId, existingLyrics }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to sync lyrics' };
    }

    const data = await response.json();
    return {
      success: true,
      lyrics: data.lyrics,
      rawText: data.rawText,
    };
  } catch (error) {
    console.error('[LyricsService] Error generating synced lyrics:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Save synced lyrics to a song document
 */
export async function saveLyricsToSong(
  songId: string,
  lyrics: LyricLine[],
  rawText?: string,
  _isHQSong?: boolean
): Promise<boolean> {
  try {
    if (!songId) return false;
    const res = await apiClient.patch<any>(`/songs/${songId}/lyrics`, {
      syncedLyrics: lyrics,
      lyrics: rawText,
    });
    return Boolean(res && (res.success || res.data));
  } catch (error) {
    console.error('[LyricsService] Error saving lyrics to song:', error);
    return false;
  }
}

/**
 * Get lyrics for a song
 * Returns synced lyrics if available, otherwise plain text or converted LRC
 */
export async function getSongLyrics(songId: string): Promise<{
  lyrics: LyricLine[] | null;
  lyricsText: string | null;
  karaokeLrcText: string | null;
  hasSyncedLyrics: boolean;
}> {
  try {
    if (!songId) {
      return { lyrics: null, lyricsText: null, karaokeLrcText: null, hasSyncedLyrics: false };
    }

    const res = await apiClient.get<any>(`/songs/${songId}/lyrics`);
    const data = (res && res.data) ? res.data : res;

    if (data) {
      let karaokeLrcText = data.karaokeLrcText || null;
      let syncedLyrics = data.syncedLyrics || null;
      let lyricsText = data.lyricsText || data.lyrics || null;

      // 1. If karaokeLrcText is missing but syncedLyrics array exists, convert to standard [mm:ss.xx] LRC
      if (!karaokeLrcText && Array.isArray(syncedLyrics) && syncedLyrics.length > 0) {
        karaokeLrcText = syncedLyrics.map((line: any) => {
          const time = typeof line.time === 'number' ? line.time : 0;
          const minutes = Math.floor(time / 60);
          const seconds = (time % 60).toFixed(2).padStart(5, '0');
          return `[${String(minutes).padStart(2, '0')}:${seconds}] ${line.text || ''}`;
        }).join('\n');
      }

      // 2. If both synced lyrics and LRC text are missing but raw lyrics text exists, strip HTML and provide initial template
      if (!karaokeLrcText && lyricsText && typeof lyricsText === 'string') {
        const cleanLines = lyricsText
          .replace(/<br\s*[\/]?>/gi, '\n')
          .replace(/<\/?[^>]+(>|$)/g, '')
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);

        if (cleanLines.length > 0) {
          karaokeLrcText = cleanLines.map((l: string) => `[00:00.00] ${l}`).join('\n');
        }
      }

      return {
        lyrics: syncedLyrics,
        lyricsText,
        karaokeLrcText,
        hasSyncedLyrics: Boolean(data.hasSyncedLyrics || karaokeLrcText || (syncedLyrics && syncedLyrics.length > 0)),
      };
    }

    return { lyrics: null, lyricsText: null, karaokeLrcText: null, hasSyncedLyrics: false };
  } catch (error) {
    console.error('[LyricsService] Error getting song lyrics:', error);
    return { lyrics: null, lyricsText: null, karaokeLrcText: null, hasSyncedLyrics: false };
  }
}

/**
 * Save raw LRC text specifically for Playback Mode & Dedicated Karaoke
 */
export async function saveKaraokeLrcText(songId: string, lrcText: string): Promise<boolean> {
  try {
    if (!songId) return false;
    const res = await apiClient.patch<any>(`/songs/${songId}/lyrics`, {
      karaokeLrcText: lrcText,
    });
    return Boolean(res && (res.success || res.data));
  } catch (error) {
    console.error('[LyricsService] Error saving karaoke LRC text:', error);
    return false;
  }
}

/**
 * Parse plain text lyrics into auto-timed lines
 */
export function parseAutoTimedLyrics(
  plainText: string,
  songDuration: number
): LyricLine[] {
  const lines = plainText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) return [];

  const startBuffer = 2;
  const endBuffer = 3;
  const availableDuration = Math.max(1, songDuration - startBuffer - endBuffer);
  const timePerLine = availableDuration / lines.length;

  return lines.map((text, index) => ({
    time: startBuffer + (index * timePerLine),
    duration: timePerLine * 0.9,
    text,
  }));
}

/**
 * Format seconds to MM:SS display
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse raw LRC formatted string into LyricLine array
 */
export function parseLRCLyrics(lrcContent: string): { time: number; text: string; duration?: number }[] {
  if (!lrcContent || typeof lrcContent !== 'string') return [];

  const lines = lrcContent.split('\n');
  const result: { time: number; text: string; duration?: number }[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    timeRegex.lastIndex = 0;
    const match = timeRegex.exec(trimmed);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const timeInSec = minutes * 60 + seconds + ms / 1000;
      const text = trimmed.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
      result.push({ time: timeInSec, text });
    }
  }

  result.sort((a, b) => a.time - b.time);

  // Calculate durations between consecutive lines
  for (let i = 0; i < result.length; i++) {
    if (i < result.length - 1) {
      result[i].duration = Math.max(1, result[i + 1].time - result[i].time);
    } else {
      result[i].duration = 5;
    }
  }

  return result;
}

