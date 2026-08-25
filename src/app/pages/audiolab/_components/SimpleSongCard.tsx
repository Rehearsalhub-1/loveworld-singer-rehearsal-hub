import React, { useState } from 'react';

import { Play, Pause, Music, ChevronDown, Mic, BookOpen, Plus, Trash2 } from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import type { Song, VocalPart } from '../_types';

export interface SimpleSongCardProps {
    song: Song;
    songNumber: number;
    isPlaying: boolean;
    isLoading: boolean;
    currentPart: VocalPart | null;
    currentTime: number;
    duration: number;
    onClick?: () => void;
    onAdd?: () => void;
    onRemove?: () => void;
    isHighlighted?: boolean;
    searchTerm?: string;
}



export function SimpleSongCard({
    song,
    songNumber,
    isPlaying,
    isLoading,
    currentPart,
    currentTime,
    duration,
    onClick,
    onAdd,
    onRemove,
    isHighlighted = false,
    searchTerm = '',
}: SimpleSongCardProps) {

    const availableParts = song.availableParts || ['full'];
    const hasAudio = !!(song.audioUrls && Object.values(song.audioUrls).some(url => url && url.length > 0)) || !!song.audioUrl;

    const getPartLabel = (part: VocalPart) => {
        const labels: Record<string, string> = {
            full: 'Full Mix',
            soprano: 'Soprano',
            alto: 'Alto',
            tenor: 'Tenor',
            bass: 'Bass',
        };
        return labels[part] || part;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
        if (!highlight.trim()) return <>{text}</>;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <>
                {parts.map((part, i) => (
                    part.toLowerCase() === highlight.toLowerCase() 
                        ? <span key={i} className="text-violet-400 font-bold underline decoration-violet-500/30 underline-offset-2">{part}</span> 
                        : part
                ))}
            </>
        );
    };

    return (
        <div 
            className={`
            rounded-xl border transition-all hover:shadow-lg hover:shadow-violet-500/10 overflow-hidden
            ${isHighlighted ? 'bg-violet-900/40 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)] ring-2 ring-violet-500/20' : 'bg-[#261933] border-white/10'}
            ${isHighlighted ? 'animate-pulse-subtle' : ''}
        `}>
            {isHighlighted && (
                <style>{`
                    @keyframes pulse-subtle {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.85; }
                    }
                    .animate-pulse-subtle {
                        animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                `}</style>
            )}
            {/* Main Row - Always Visible */}
            <div
                onClick={onClick}
                className={`
          flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all
          hover:bg-white/5 active:scale-[0.99]
          ${isPlaying ? 'bg-violet-500/10 border-l-4 border-l-violet-500' : ''}
        `}
            >
                {/* Number / Playing Indicator */}
                <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${isPlaying
                        ? 'bg-violet-600'
                        : hasAudio
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                            : 'bg-slate-700'
                    }
        `}>
                    {isPlaying ? (
                        <div className="flex gap-0.5">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="w-0.5 bg-white rounded-full animate-pulse"
                                    style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.1}s` }}
                                />
                            ))}
                        </div>
                    ) : (
                        hasAudio ? (
                            <span className="text-white font-bold text-sm">{songNumber}</span>
                        ) : (
                            <BookOpen className="w-5 h-5 text-slate-400" />
                        )
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className={`font-medium text-sm truncate ${isPlaying ? 'text-violet-200' : 'text-white'}`}>
                            <HighlightedText text={song.title} highlight={searchTerm} />
                        </h3>
                        {!hasAudio && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md bg-slate-800 text-[8px] font-bold text-slate-400 uppercase tracking-tighter border border-white/5">
                                Lyrics Only
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-200 truncate font-medium">
                        <HighlightedText text={song.artist || 'Unknown artist'} highlight={searchTerm} />
                        {song.key && ` • ${song.key}`}
                    </p>
                </div>

                {/* Optional Action Button (e.g., Add/Remove) */}
                {(onAdd || onRemove) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onAdd) onAdd();
                            if (onRemove) onRemove();
                        }}
                        className={`
                            p-2 rounded-lg transition-all active:scale-90 flex-shrink-0
                            ${onRemove ? 'text-red-400 hover:bg-red-400/10' : 'text-violet-400 hover:bg-violet-400/10'}
                        `}
                    >
                        {onRemove ? <Trash2 size={18} /> : <Plus size={18} />}
                    </button>
                )}
            </div>


        </div>
    );
}
