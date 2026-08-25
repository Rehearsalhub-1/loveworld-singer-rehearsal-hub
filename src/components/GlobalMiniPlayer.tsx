"use client";

import React, { useState } from "react";
import { useAudio } from "@/contexts/AudioContext";
import MiniPlayer from "./MiniPlayer";

export default function GlobalMiniPlayer() {
  const { currentSong, isPlaying, togglePlayPause, stop, setCurrentSong } = useAudio();
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [isSongDetailOpen, setIsSongDetailOpen] = useState(false);

  // Listen for song detail modal state changes
  React.useEffect(() => {
    const handleSongDetailOpen = () => setIsSongDetailOpen(true);
    const handleSongDetailClose = () => setIsSongDetailOpen(false);

    window.addEventListener('songDetailOpen', handleSongDetailOpen);
    window.addEventListener('songDetailClose', handleSongDetailClose);
    
    return () => {
      window.removeEventListener('songDetailOpen', handleSongDetailOpen);
      window.removeEventListener('songDetailClose', handleSongDetailClose);
    };
  }, []);

  // Show mini player only when:
  // 1. There's a current song
  // 2. Song detail modal is NOT open
  // 3. Song has audio file
  // 4. Song is actually playing (more conservative)
  React.useEffect(() => {
    if (currentSong && !isSongDetailOpen && currentSong.audioFile && currentSong.audioFile.trim() !== '' && isPlaying) {
      setShowMiniPlayer(true);
    } else {
      setShowMiniPlayer(false);
    }
  }, [currentSong, isSongDetailOpen, isPlaying]);

  const handleClose = () => {
    setShowMiniPlayer(false);
    stop();
    setCurrentSong(null);
  };

  const handleOpenFullPlayer = () => {
    // Dispatch a custom event that pages can listen to
    const event = new CustomEvent('openFullPlayer', { 
      detail: { song: currentSong } 
    });
    window.dispatchEvent(event);
  };

  if (!showMiniPlayer || !currentSong) return null;

  return (
    <MiniPlayer
      currentSong={currentSong}
      isPlaying={isPlaying}
      onPlayPause={togglePlayPause}
      onClose={handleClose}
      onOpenFullPlayer={handleOpenFullPlayer}
    />
  );
}
