"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PraiseNightSong, HistoryEntry } from "@/types/supabase";
import { useAudio } from "@/contexts/AudioContext";
import { useZone } from "@/hooks/useZone";
import { isHQGroup } from "@/config/zones";
import { NavigationManager } from "@/utils/navigation";
import { formatTime } from "@/utils/string-utils";
import { apiClient } from "@/lib/api-client";
import { useWebSocket } from "@/hooks/useWebSocket";

import { SongLyrics } from "./song-detail/SongLyrics";
import { SongSolfas } from "./song-detail/SongSolfas";
import { SongComments } from "./song-detail/SongComments";
import { SongAudioPlayer } from "./song-detail/SongAudioPlayer";
import { SongDetailHeader } from "./song-detail/SongDetailHeader";
import { SongDetailTabsContent } from "./song-detail/SongDetailTabsContent";

interface SongDetailModalProps {
  selectedSong: PraiseNightSong | null;
  isOpen: boolean;
  onClose: () => void;
  onSongChange?: (song: PraiseNightSong) => void;
  currentFilter?: 'heard' | 'unheard';
  songs?: PraiseNightSong[];
  activeCategory?: string;
  isSubGroup?: boolean;
}

export default function SongDetailModal({
  selectedSong,
  isOpen,
  onClose,
  onSongChange,
  currentFilter = 'heard',
  songs = [],
  activeCategory = '',
  isSubGroup = false
}: SongDetailModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'lyrics' | 'solfas' | 'comments' | 'history' | 'notation'>('lyrics');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Click outside handler for more menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  const [activeHistoryTab, setActiveHistoryTab] = useState<'lyrics' | 'audio' | 'solfas' | 'comments' | 'metadata' | 'notation'>('lyrics');
  const [isRepeating, setIsRepeating] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [categorySongs, setCategorySongs] = useState<PraiseNightSong[]>([]);
  
  // Navigation lock
  const isNavigatingRef = useRef(false);

  // Fullscreen state
  const [isFullscreenLyrics, setIsFullscreenLyrics] = useState(false);
  const [isFullscreenComments, setIsFullscreenComments] = useState(false);
  const [isFullscreenSolfas, setIsFullscreenSolfas] = useState(false);
  const [isNavigatingToAudioLab, setIsNavigatingToAudioLab] = useState(false);

  // Get zone context to determine comment terminology
  const { currentZone } = useZone();

  // Get zone color for theming
  const zoneColor = currentZone?.themeColor || '#9333EA';

  // Helper to darken color for gradients
  const darkenColor = (color: string, percent: number) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  // Helper function to get correct comment terminology based on zone
  const getCommentLabel = () => {
    if (isSubGroup) return "Church Coordinator";
    return isHQGroup(currentZone?.id) ? "Pastor" : "Coordinator";
  };

  // Toggle fullscreen functions
  const toggleFullscreenLyrics = () => {
    setIsFullscreenLyrics(!isFullscreenLyrics);
  };

  const toggleFullscreenComments = () => {
    setIsFullscreenComments(!isFullscreenComments);
  };

  const toggleFullscreenSolfas = () => {
    setIsFullscreenSolfas(!isFullscreenSolfas);
  };

  // State for history audio players
  const [historyAudioStates, setHistoryAudioStates] = useState<{ [key: string]: { isPlaying: boolean, currentTime: number, duration: number } }>({});
  const historyAudioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const [mainPlayerWasPlaying, setMainPlayerWasPlaying] = useState(false);

  // Collapsible history cards state
  const [expandedHistoryEntries, setExpandedHistoryEntries] = useState<Set<string>>(new Set());

  const toggleHistoryEntry = (entryId: string) => {
    setExpandedHistoryEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // History state management
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistoryEntries = useCallback(async () => {
    if (!selectedSong?.id) {
      setHistoryEntries([]);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: HistoryEntry[] }>(
        `/songs/history?songId=${encodeURIComponent(selectedSong.id)}`
      );
      if (res?.success && Array.isArray(res?.data)) {
        setHistoryEntries(res.data);
      } else {
        setHistoryEntries([]);
      }
    } catch (err) {
      console.error('Error loading song history in modal:', err);
      setHistoryEntries([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedSong?.id]);

  useEffect(() => {
    if (isOpen && selectedSong?.id) {
      loadHistoryEntries();
    }
  }, [isOpen, selectedSong?.id, loadHistoryEntries]);

  // Use global audio context
  const { currentSong, isPlaying, currentTime, duration, isLoading, hasError, togglePlayPause, audioRef, setCurrentSong, setCurrentTime: setCurrentTimeManual } = useAudio();

  const currentSongData = selectedSong;

  // Realtime song live state
  const [liveSongUpdate, setLiveSongUpdate] = useState<Partial<PraiseNightSong> | null>(null);

  // Active song ID for real-time WebSocket subscription
  const activeSongId = selectedSong?.id ? String(selectedSong.id) : null;

  // Real-time WebSocket subscription for active song updates
  useWebSocket(
    'song',
    activeSongId || '',
    (data: any) => {
      if (data && typeof data === 'object') {
        setLiveSongUpdate(prev => ({ ...prev, ...data }));
      }
    },
    Boolean(isOpen && activeSongId)
  );

  // Real-time WebSocket subscription for broadcast updates
  useWebSocket(
    'song',
    'all',
    (data: any) => {
      if (data && typeof data === 'object') {
        if (String(data.id) === String(selectedSong?.id) || data.title === selectedSong?.title) {
          setLiveSongUpdate(prev => ({ ...prev, ...data }));
        }
      }
    },
    Boolean(isOpen)
  );

  // Also listen for local window dispatch events (instant zero-latency client sync)
  useEffect(() => {
    const handleSongEvent = (e: any) => {
      const updated = e.detail?.song || e.detail;
      if (updated && (String(updated.id) === String(selectedSong?.id) || updated.title === selectedSong?.title)) {
        setLiveSongUpdate(prev => ({ ...prev, ...updated }));
      }
    };

    window.addEventListener('songUpdated', handleSongEvent);
    window.addEventListener('songDataChanged', handleSongEvent);
    return () => {
      window.removeEventListener('songUpdated', handleSongEvent);
      window.removeEventListener('songDataChanged', handleSongEvent);
    };
  }, [selectedSong?.id, selectedSong?.title]);

  // Reset live update when selectedSong changes to a different song
  useEffect(() => {
    setLiveSongUpdate(null);
  }, [selectedSong?.id]);

  // Single source of truth for what the UI should display (live update → selectedSong → currentSongData)
  const displayedSongData = {
    ...(currentSongData || {}),
    ...(selectedSong || {}),
    ...(liveSongUpdate || {}),
  } as PraiseNightSong;

  // Set the current song when modal opens (only if it's a different song)
  useEffect(() => {
    if (selectedSong && isOpen) {
      if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
        return;
      }

      if (currentSong?.id !== selectedSong.id) {
        setCurrentSong(selectedSong, false);
      }
    }
  }, [selectedSong?.title, isOpen, currentSong?.id, setCurrentSong, selectedSong]);

  // Load songs from the same category AND current filter, find current song index
  useEffect(() => {
    if (selectedSong) {
      const songsInCategory = songs.filter(song => {
        let matchesCategory = false;
        if (activeCategory && activeCategory.toLowerCase() !== 'ongoing' && activeCategory.toLowerCase() !== 'all') {
          if (song.categories && Array.isArray(song.categories) && song.categories.length > 0) {
            matchesCategory = song.categories.some((cat: string) => cat.trim() === activeCategory.trim());
          } else {
            matchesCategory = (song.category || '').trim() === activeCategory.trim();
          }
        } else {
          const targetCat = selectedSong.category || (selectedSong.categories && selectedSong.categories[0]);
          if (targetCat) {
            if (song.categories && Array.isArray(song.categories) && song.categories.length > 0) {
              matchesCategory = song.categories.some((cat: string) => cat.trim() === targetCat.trim());
            } else {
              matchesCategory = (song.category || '').trim() === targetCat.trim();
            }
          } else {
            matchesCategory = true;
          }
        }
        return matchesCategory;
      });
      
      setCategorySongs(songsInCategory);

      const index = songsInCategory.findIndex(song => song.id === selectedSong.id || song.title === selectedSong.title);
      setCurrentSongIndex(index >= 0 ? index : 0);
    }
  }, [selectedSong, currentFilter, songs, activeCategory]);

  // Handle audio ended event for repeat functionality and auto-skip
  useEffect(() => {
    const handleAudioEnded = (event: CustomEvent) => {
      const isCurrentSong = event.detail.song?.title === currentSongData?.title ||
        event.detail.song?.id === currentSongData?.id;

      if (isRepeating && isCurrentSong) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((error) => {
            console.error('Error repeating song:', error);
          });
        }
      } else if (!isRepeating && isCurrentSong) {
        if (currentSongIndex < categorySongs.length - 1 && categorySongs.length > 0) {
          const nextSong = categorySongs[currentSongIndex + 1];
          if (nextSong && onSongChange) {
            isNavigatingRef.current = true;
            setCurrentSongIndex(currentSongIndex + 1);
            onSongChange(nextSong);
            setCurrentSong(nextSong, true);
          }
        } else {
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
      }
    };

    window.addEventListener('audioEnded', handleAudioEnded as EventListener);
    return () => {
      window.removeEventListener('audioEnded', handleAudioEnded as EventListener);
    };
  }, [isRepeating, currentSongData?.title, currentSongIndex, categorySongs, onSongChange, setCurrentSong, currentSongData?.id, audioRef]);

  const handlePrevious = () => {
    if (currentSongIndex > 0 && categorySongs.length > 0) {
      const prevSong = categorySongs[currentSongIndex - 1];
      if (prevSong && onSongChange) {
        isNavigatingRef.current = true;
        setCurrentSongIndex(currentSongIndex - 1);
        onSongChange(prevSong);
        setCurrentSong(prevSong, true);
      }
    } else if (audioRef.current && duration > 0) {
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      setCurrentTimeManual(newTime);
    }
  };

  const handleNext = () => {
    if (currentSongIndex < categorySongs.length - 1 && categorySongs.length > 0) {
      const nextSong = categorySongs[currentSongIndex + 1];
      if (nextSong && onSongChange) {
        isNavigatingRef.current = true;
        setCurrentSongIndex(currentSongIndex + 1);
        onSongChange(nextSong);
        setCurrentSong(nextSong, true);
      }
    } else if (audioRef.current && duration > 0) {
      const newTime = Math.min(duration, audioRef.current.currentTime + 10);
      setCurrentTimeManual(newTime);
    }
  };

  const toggleRepeat = () => {
    const newRepeatState = !isRepeating;
    setIsRepeating(newRepeatState);
  };

  const handleMusicPage = () => {
    if (currentSongData?.title) {
      setIsNavigatingToAudioLab(true);
      setTimeout(() => {
        const targetId = currentSongData.title;
        router.push(`/pages/audiolab?view=library&program=ongoing&song=${encodeURIComponent(targetId)}`);
        NavigationManager.push();
      }, 500);
    }
  };

  // History audio player functions
  const handleHistoryAudioPlayPause = (audioId: string) => {
    const historyAudioRef = historyAudioRefs.current[audioId];
    if (!historyAudioRef) return;

    // Pause all other history audios
    Object.keys(historyAudioRefs.current).forEach(id => {
      if (id !== audioId && historyAudioRefs.current[id]) {
        historyAudioRefs.current[id]!.pause();
        setHistoryAudioStates(prev => ({
          ...prev,
          [id]: { ...prev[id], isPlaying: false }
        }));
      }
    });

    if (historyAudioStates[audioId]?.isPlaying) {
      historyAudioRef.pause();
      setHistoryAudioStates(prev => ({
        ...prev,
        [audioId]: { ...prev[audioId], isPlaying: false }
      }));

      if (mainPlayerWasPlaying) {
        togglePlayPause();
        setMainPlayerWasPlaying(false);
      }
    } else {
      if (isPlaying) {
        setMainPlayerWasPlaying(true);
        togglePlayPause();
      }

      historyAudioRef.play();
      setHistoryAudioStates(prev => ({
        ...prev,
        [audioId]: { ...prev[audioId], isPlaying: true }
      }));
    }
  };

  const handleHistoryAudioTimeUpdate = (audioId: string) => {
    const audioElement = historyAudioRefs.current[audioId];
    if (audioElement) {
      setHistoryAudioStates(prev => ({
        ...prev,
        [audioId]: { ...prev[audioId], currentTime: audioElement.currentTime }
      }));
    }
  };

  const handleHistoryAudioLoadedMetadata = (audioId: string) => {
    const audioElement = historyAudioRefs.current[audioId];
    if (audioElement) {
      setHistoryAudioStates(prev => ({
        ...prev,
        [audioId]: { ...prev[audioId], duration: audioElement.duration }
      }));
    }
  };

  const handleHistoryAudioEnded = (audioId: string) => {
    setHistoryAudioStates(prev => ({
      ...prev,
      [audioId]: { ...prev[audioId], isPlaying: false, currentTime: 0 }
    }));

    if (mainPlayerWasPlaying) {
      togglePlayPause();
      setMainPlayerWasPlaying(false);
    }
  };

  const formatDateTime = (dateInput: any) => {
    let date: Date;
    if (dateInput && typeof dateInput === 'object') {
      if (dateInput.toDate && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
      } else if (dateInput.seconds) {
        date = new Date(dateInput.seconds * 1000);
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        date = new Date(dateInput);
      }
    } else if (dateInput) {
      date = new Date(dateInput);
    } else {
      date = new Date();
    }

    if (isNaN(date.getTime())) {
      return {
        date: 'Invalid Date',
        time: ''
      };
    }

    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const [isDragging, setIsDragging] = useState(false);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);

  const seekToTime = (newTime: number) => {
    if (audioRef.current && duration > 0) {
      const clampedTime = Math.max(0, Math.min(duration, newTime));
      if (audioRef.current.readyState >= 2) {
        setCurrentTimeManual(clampedTime);
      } else {
        const handleCanPlay = () => {
          if (audioRef.current) {
            setCurrentTimeManual(clampedTime);
            audioRef.current.removeEventListener('canplay', handleCanPlay);
          }
        };
        audioRef.current.addEventListener('canplay', handleCanPlay);
      }
    }
  };

  const skipBackward10 = () => {
    if (audioRef.current && duration > 0) {
      const newTime = Math.max(0, currentTime - 10);
      seekToTime(newTime);
    }
  };

  const skipForward10 = () => {
    if (audioRef.current && duration > 0) {
      const newTime = Math.min(duration, currentTime + 10);
      seekToTime(newTime);
    }
  };

  const getTimeFromMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    return percentage * duration;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration > 0) {
      const newTime = getTimeFromMouseEvent(e);
      seekToTime(newTime);
    }
  };

  const dragStartPos = useRef<{ x: number; time: number } | null>(null);

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStartPos.current = { x: e.clientX, time: Date.now() };
    setWasPlayingBeforeDrag(isPlaying);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragStartPos.current && audioRef.current && duration > 0) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      
      if (!isDragging && dx > 3) {
        setIsDragging(true);
        if (isPlaying && audioRef.current) {
          audioRef.current.pause();
        }
      }

      if (isDragging) {
        const newTime = getTimeFromMouseEvent(e);
        seekToTime(newTime);
      }
    }
  };

  const handleProgressMouseUp = () => {
    dragStartPos.current = null;
    if (isDragging) {
      setIsDragging(false);
      if (wasPlayingBeforeDrag && audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error('Error resuming after drag:', error);
        });
      }
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragStartPos.current && audioRef.current && duration > 0) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x);
        
        if (!isDragging && dx > 3) {
          setIsDragging(true);
          if (wasPlayingBeforeDrag && audioRef.current) {
            audioRef.current.pause();
          }
        }

        if (isDragging) {
          const progressBar = document.querySelector('.progress-bar') as HTMLElement;
          if (progressBar) {
            const rect = progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            const newTime = percentage * duration;
            seekToTime(newTime);
          }
        }
      }
    };

    const handleGlobalMouseUp = () => {
      dragStartPos.current = null;
      if (isDragging) {
        setIsDragging(false);
        if (wasPlayingBeforeDrag && audioRef.current) {
          audioRef.current.play().catch(error => {
            console.error('Error resuming after drag:', error);
          });
        }
      }
    };

    if (dragStartPos.current || isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, duration, wasPlayingBeforeDrag]);

  if (!isOpen || !selectedSong) return null;

  return (
    <>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .bg-music-doodle {
          background-color: #ffffff;
          background-image: url("data:image/svg+xml,%3Csvg width='250' height='250' viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D946EF' fill-opacity='0.06'%3E%3C!-- Official IoMic Path --%3E%3Cpath d='M110 50c1.66 0 3-1.34 3-3V35c0-1.66-1.34-3-3-3s-3 1.34-3 3v12c0 1.66 1.34 3 3 3zM115.3 41c0 2.54-2.04 4.63-4.57 4.93V49h-1.46v-3.07a4.996 4.996 0 01-4.57-4.93h-1.48c0 3.19 2.39 5.8 5.48 6.4v3.13h-2.19c-.43 0-.78.35-.78.78s.35.78.78.78h5.83c.43 0 .78-.35.78-.78s-.35-.78-.78-.78h-2.19v-3.13c3.09-.6 5.48-3.21 5.48-6.4h-1.48z' transform='scale(1.2)'/%3E%3C!-- Official IoHeadset Path --%3E%3Cpath d='M50 20c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8h-4v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z' transform='scale(1.3) translate(15, 0)'/%3E%3C!-- Official IoMusicalNotes Path --%3E%3Cpath d='M180 30l-10 2.45v10.55c-.5-.15-1-.24-1.5-.24-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-11.4l8-1.96V37.5c-.5-.15-1-.24-1.5-.24-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-11z' transform='scale(1.3)'/%3E%3C!-- Official GiGuitar Path --%3E%3Cpath d='M30 150c0 5 4 9 9 9s9-4 9-9c0-6-4.5-8-4.5-13 0-4 1.5-6 1.5-6h-12s1.5 2 1.5 6c0 5-4.5 7-4.5 13z' transform='scale(1.2) rotate(15, 39, 150)'/%3E%3C!-- Official GiPianoKeys Path --%3E%3Cpath d='M160 140h28v20h-28z M164 140v12h2v-12z M168 140v12h2v-12z M174 140v12h2v-12z M178 140v12h2v-12z' transform='scale(1.4) rotate(10, 174, 150)'/%3E%3C/g%3E%3C/svg%3E");
          background-repeat: repeat;
        }
      `}</style>
      <div className="fixed inset-0 bg-white bg-music-doodle z-[1000] flex flex-col">
        {/* Responsive Container */}
        <div className="mx-auto max-w-2xl w-full h-full flex flex-col">

          {/* Fullscreen Lyrics View */}
          {isFullscreenLyrics && activeTab === 'lyrics' ? (
            <SongLyrics 
              isFullscreen={true}
              onToggleFullscreen={toggleFullscreenLyrics}
              lyrics={displayedSongData?.lyrics}
              title={displayedSongData?.title}
              writer={displayedSongData?.writer}
            />
          ) : isFullscreenComments && activeTab === 'comments' ? (
            <SongComments 
              isFullscreen={true}
              onToggleFullscreen={toggleFullscreenComments}
              comments={displayedSongData?.comments}
              zoneColor={zoneColor}
              commentLabel={getCommentLabel()}
              title={displayedSongData?.title}
            />
          ) : isFullscreenSolfas && activeTab === 'solfas' ? (
            <SongSolfas 
              isFullscreen={true}
              onToggleFullscreen={toggleFullscreenSolfas}
              solfas={displayedSongData?.solfas}
              title={displayedSongData?.title}
            />
          ) : (
            <>
              {/* Normal Modal Content */}
              <SongDetailHeader
                onClose={onClose}
                displayedSongData={displayedSongData}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isSubGroup={isSubGroup}
                showMoreMenu={showMoreMenu}
                setShowMoreMenu={setShowMoreMenu}
                moreMenuRef={moreMenuRef}
              />

              <SongDetailTabsContent
                activeTab={activeTab}
                displayedSongData={displayedSongData}
                toggleFullscreenLyrics={toggleFullscreenLyrics}
                toggleFullscreenSolfas={toggleFullscreenSolfas}
                toggleFullscreenComments={toggleFullscreenComments}
                zoneColor={zoneColor}
                commentLabel={getCommentLabel()}
                historyProps={{
                  activeHistoryTab,
                  setActiveHistoryTab,
                  isLoadingHistory,
                  historyEntries,
                  loadHistoryEntries,
                  expandedHistoryEntries,
                  toggleHistoryEntry,
                  darkenColor,
                  formatDateTime,
                  formatTime,
                  getCommentLabel,
                  historyAudioStates,
                  handleHistoryAudioPlayPause,
                  historyAudioRefs,
                  handleHistoryAudioTimeUpdate,
                  handleHistoryAudioLoadedMetadata,
                  handleHistoryAudioEnded
                }}
              />

              {/* Floating Fullscreen Buttons */}
              {activeTab === 'lyrics' && !isFullscreenLyrics && (
                <SongLyrics 
                  isFullscreen={false}
                  onToggleFullscreen={toggleFullscreenLyrics}
                  showFloatingButtonOnly={true}
                  zoneColor={zoneColor}
                  darkenColor={darkenColor}
                />
              )}

              {activeTab === 'comments' && !isFullscreenComments && (
                <SongComments 
                  isFullscreen={false}
                  onToggleFullscreen={toggleFullscreenComments}
                  showFloatingButtonOnly={true}
                  zoneColor={zoneColor}
                  darkenColor={darkenColor}
                />
              )}

              {activeTab === 'solfas' && !isFullscreenSolfas && (
                <SongSolfas 
                  isFullscreen={false}
                  onToggleFullscreen={toggleFullscreenSolfas}
                  showFloatingButtonOnly={true}
                  zoneColor={zoneColor}
                  darkenColor={darkenColor}
                />
              )}

              <SongAudioPlayer 
                currentTime={currentTime}
                duration={duration}
                formatTime={formatTime}
                isDragging={isDragging}
                handleProgressClick={handleProgressClick}
                handleProgressMouseDown={handleProgressMouseDown}
                handleProgressMouseMove={handleProgressMouseMove}
                handleProgressMouseUp={handleProgressMouseUp}
                isRepeating={isRepeating}
                toggleRepeat={toggleRepeat}
                handlePrevious={handlePrevious}
                skipBackward10={skipBackward10}
                togglePlayPause={togglePlayPause}
                isLoading={isLoading}
                hasError={hasError}
                isPlaying={isPlaying}
                skipForward10={skipForward10}
                handleNext={handleNext}
                handleMusicPage={handleMusicPage}
                isNavigatingToAudioLab={isNavigatingToAudioLab}
                zoneColor={zoneColor}
                darkenColor={darkenColor}
                historyAudioRefs={historyAudioRefs}
                setHistoryAudioStates={setHistoryAudioStates}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
