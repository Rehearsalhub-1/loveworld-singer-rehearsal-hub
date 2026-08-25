"use client";

'use client';

import { useEffect, useRef, useState } from 'react';

interface LiveWaveformProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  color?: string;
  height?: number;
  barCount?: number;
  className?: string;
}

/**
 * Real-time audio visualizer using Web Audio API AnalyserNode
 * Shows actual frequency data from the audio being played
 */
export function LiveWaveform({
  audioElement,
  isPlaying,
  color = '#8b5cf6',
  height = 60,
  barCount = 32,
  className = ''
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Connect audio element to analyser
  useEffect(() => {
    if (!audioElement || isConnected) return;

    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;

      // Create analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect audio element to analyser
            if (!sourceRef.current) {
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        sourceRef.current = source;
        setIsConnected(true);
      }
    } catch (error) {
 console.error('[LiveWaveform] Error connecting audio:', error);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioElement, isConnected]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate bar dimensions
      const barWidth = canvas.width / barCount;
      const gap = 2;
      const actualBarWidth = barWidth - gap;

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        // Sample from frequency data
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex] || 0;
        
        // Calculate bar height (normalize to canvas height)
        const barHeight = isPlaying 
          ? Math.max(4, (value / 255) * canvas.height * 0.9)
          : 4; // Minimum height when not playing

        // Calculate position (centered vertically)
        const x = i * barWidth + gap / 2;
        const y = (canvas.height - barHeight) / 2;

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, `${color}66`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, actualBarWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, color, barCount]);

  // Resume audio context on user interaction (browser autoplay policy)
  useEffect(() => {
    const resumeContext = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    document.addEventListener('click', resumeContext, { once: true });
    document.addEventListener('touchstart', resumeContext, { once: true });

    return () => {
      document.removeEventListener('click', resumeContext);
      document.removeEventListener('touchstart', resumeContext);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={height}
      className={`w-full ${className}`}
      style={{ height: `${height}px` }}
    />
  );
}
