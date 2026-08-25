"use client";

"use client";

import React, { useEffect, useState } from 'react';
import { useAudio } from '@/contexts/AudioContext';

interface AudioWaveProps {
  className?: string;
}

export default function AudioWave({ className = "" }: AudioWaveProps) {
  const { isPlaying, currentTime, duration } = useAudio();
  const [waveData, setWaveData] = useState<number[]>([]);

  // Generate wave data based on audio progress
  useEffect(() => {
    const generateWave = () => {
      const bars = 20; // Number of wave bars
      const progress = duration > 0 ? currentTime / duration : 0;
      
      const newWaveData = Array.from({ length: bars }, (_, i) => {
        // Create a wave pattern that's more active when playing
        const baseHeight = isPlaying ? 0.3 + Math.random() * 0.7 : 0.1;
        const progressFactor = Math.sin((i / bars) * Math.PI * 2 + progress * Math.PI * 4) * 0.3;
        return Math.max(0.1, Math.min(1, baseHeight + progressFactor));
      });
      
      setWaveData(newWaveData);
    };

    generateWave();
    
        const interval = isPlaying ? 100 : 500;
    const timer = setInterval(generateWave, interval);
    
    return () => clearInterval(timer);
  }, [isPlaying, currentTime, duration]);

  if (!isPlaying && currentTime === 0) {
    return null; // Don't show wave when not playing
  }

  return (
    <div className={`flex items-center justify-center space-x-0.5 ${className}`}>
      {waveData.slice(0, 8).map((height, index) => ( // Only show first 8 bars for compact view
        <div
          key={index}
          className="bg-purple-500 rounded-full transition-all duration-150"
          style={{
            width: '2px',
            height: `${height * 16}px`,
            opacity: isPlaying ? 0.9 : 0.5,
            transform: isPlaying ? 'scaleY(1)' : 'scaleY(0.6)',
          }}
        />
      ))}
    </div>
  );
}
