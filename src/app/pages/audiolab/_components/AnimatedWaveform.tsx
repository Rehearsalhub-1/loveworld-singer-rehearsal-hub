"use client";

'use client';

import { useEffect, useRef } from 'react';

interface AnimatedWaveformProps {
  isPlaying: boolean;
  isRecording?: boolean;
  inputLevel?: number; // 0-1 for recording input level
  staticHeights?: number[]; // Pre-recorded waveform heights
  currentTime?: number;
  duration?: number;
  height?: number;
  className?: string;
}

/**
 * Flowing wave visualizer like TikTok/music players
 * Shows smooth water-like wave animation that responds to audio
 */
export function AnimatedWaveform({
  isPlaying,
  isRecording = false,
  inputLevel = 0,
  staticHeights = [],
  currentTime = 0,
  duration = 0,
  height = 60,
  className = ''
}: AnimatedWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const waveDataRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size - use actual container height if available, otherwise use height prop
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const actualHeight = rect.height > 0 ? rect.height : height;
    canvas.width = rect.width * dpr;
    canvas.height = actualHeight * dpr;
    ctx.scale(dpr, dpr);

    // Initialize wave data if empty
    if (waveDataRef.current.length === 0) {
      waveDataRef.current = staticHeights.length > 0 
        ? [...staticHeights]
        : Array(64).fill(0).map(() => Math.random() * 30 + 10);
    }

    const barCount = 64;
    const centerY = actualHeight / 2;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

            ctx.fillStyle = 'rgba(32, 22, 42, 0.3)';
      ctx.fillRect(0, 0, rect.width, actualHeight);

      const barWidth = rect.width / barCount;
      const gap = 2;
      const actualBarWidth = Math.max(1.5, barWidth - gap);

      // Progress position
      const progress = duration > 0 ? currentTime / duration : 0;

      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth + gap / 2;
        
        // Get base height from static data or generate
        let baseHeight = 20;
        if (staticHeights.length > 0) {
          const dataIndex = Math.floor((i / barCount) * staticHeights.length);
          baseHeight = staticHeights[dataIndex] || 20;
        }

        // Calculate animated height
        let barHeight: number;
        
        if (isRecording) {
          // Recording: responsive to input level with flowing wave
          const wave1 = Math.sin((i / barCount) * Math.PI * 3 + phaseRef.current * 3) * 0.4;
          const wave2 = Math.sin((i / barCount) * Math.PI * 5 + phaseRef.current * 2) * 0.2;
          const wave3 = Math.cos((i / barCount) * Math.PI * 2 + phaseRef.current * 4) * 0.3;
          const combinedWave = (wave1 + wave2 + wave3) / 3;
          
          const levelBoost = inputLevel * 0.8 + 0.2;
          barHeight = (0.3 + combinedWave * levelBoost) * actualHeight * 0.85;
          barHeight = Math.max(4, barHeight);
        } else if (isPlaying) {
          // Playing: smooth flowing wave animation
          const wave1 = Math.sin((i / barCount) * Math.PI * 4 + phaseRef.current * 2) * 0.25;
          const wave2 = Math.sin((i / barCount) * Math.PI * 2 - phaseRef.current * 1.5) * 0.15;
          const wave3 = Math.cos((i / barCount) * Math.PI * 6 + phaseRef.current * 3) * 0.1;
          
          const flowingWave = 1 + wave1 + wave2 + wave3;
          barHeight = (baseHeight / 100) * actualHeight * 0.8 * flowingWave;
          barHeight = Math.max(3, barHeight);
        } else {
          // Idle: static with subtle breathing
          const breath = Math.sin(phaseRef.current * 0.5) * 0.05 + 1;
          barHeight = (baseHeight / 100) * actualHeight * 0.7 * breath;
          barHeight = Math.max(2, barHeight);
        }

        // Determine if past playhead
        const barProgress = i / barCount;
        const isPastPlayhead = barProgress < progress;

        // Colors - purple theme
        let barColor: string;
        let glowColor: string;
        
        if (isRecording) {
          barColor = '#ef4444'; // Red
          glowColor = 'rgba(239, 68, 68, 0.5)';
        } else if (isPastPlayhead && duration > 0) {
          barColor = '#a855f7'; // Bright purple for played
          glowColor = 'rgba(168, 85, 247, 0.4)';
        } else {
          barColor = '#8b5cf6'; // Purple
          glowColor = 'rgba(139, 92, 246, 0.3)';
        }

        const halfHeight = barHeight / 2;

        // Draw glow effect when playing/recording
        if (isPlaying || isRecording) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }

        // Draw bar (mirrored from center)
        const gradient = ctx.createLinearGradient(x, centerY - halfHeight, x, centerY + halfHeight);
        gradient.addColorStop(0, `${barColor}dd`);
        gradient.addColorStop(0.5, barColor);
        gradient.addColorStop(1, `${barColor}88`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, centerY - halfHeight, actualBarWidth, barHeight, 1);
        ctx.fill();
      }

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw playhead
      if (duration > 0 && !isRecording) {
        const playheadX = progress * rect.width;
        
        // Glowing playhead line
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, actualHeight);
        ctx.stroke();
        
        // Playhead dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(playheadX, 4, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
      }

            if (isPlaying) {
        phaseRef.current += 0.08;
      } else if (isRecording) {
        phaseRef.current += 0.12;
      } else {
        phaseRef.current += 0.02; // Subtle idle animation
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isRecording, inputLevel, staticHeights, currentTime, duration, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: `${height}px` }}
    />
  );
}
