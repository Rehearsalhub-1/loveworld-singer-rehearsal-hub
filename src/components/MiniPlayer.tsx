"use client";

import React from "react";
import { Play, Pause, X } from "lucide-react";
import { PraiseNightSong } from "@/types/supabase";
import AudioWave from "./AudioWave";

interface MiniPlayerProps {
  currentSong: PraiseNightSong | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onClose: () => void;
  onOpenFullPlayer: () => void;
}

export default function MiniPlayer({
  currentSong,
  isPlaying,
  onPlayPause,
  onClose,
  onOpenFullPlayer
}: MiniPlayerProps) {

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-center">
      {/* Close Button - Above Mini Player */}
      <button
        onClick={onClose}
        className="w-8 h-8 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 mb-2"
        title="Close mini player"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={onPlayPause}
        className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
      >
        {isPlaying ? (
          <Pause className="w-6 h-6 text-white" />
        ) : (
          <Play className="w-6 h-6 text-white ml-0.5" />
        )}
      </button>
    </div>
  );
}
