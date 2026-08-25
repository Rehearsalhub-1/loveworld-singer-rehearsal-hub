"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface CommentAudioPlayerProps {
    src: string;
    accentColor?: string;
}

export default function CommentAudioPlayer({ src, accentColor = '#8B5CF6' }: CommentAudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
        };

        const setAudioTime = () => setCurrentTime(audio.currentTime);

        // Events
        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', () => setIsPlaying(false));

        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', () => setIsPlaying(false));
        };
    }, [src]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-2 w-full max-w-md bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-slate-200/60 shadow-sm transition-all hover:shadow-md group">
            <audio ref={audioRef} src={src} muted={isMuted} preload="none" />

            <div className="flex items-center gap-4">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm hover:shadow"
                    style={{ backgroundColor: accentColor, color: 'white' }}
                >
                    {isPlaying ? (
                        <Pause size={18} fill="currentColor" />
                    ) : (
                        <Play size={18} fill="currentColor" className="ml-1" />
                    )}
                </button>

                <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex justify-between items-end mb-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                            {isPlaying ? 'Playing Voice Note' : 'Voice Note'}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-slate-400">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleProgressChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-100"
                            style={{
                                width: `${(currentTime / (duration || 1)) * 100}%`,
                                backgroundColor: accentColor
                            }}
                        />
                    </div>
                </div>

                {/* Mute toggle - optional but nice */}
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100/50"
                >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
            </div>
        </div>
    );
}
