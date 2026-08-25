"use client";

import { useState, useEffect } from 'react';
import { X, Music, Play, Pause, Key, Clock, Mic, ChevronDown, ChevronUp, BookOpen, Volume2, ListMusic, Trash2 } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { useAudioLab } from '../_context/AudioLabContext';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import CustomLoader from '@/components/CustomLoader';
import type { Song, VocalPart, LyricLine } from '../_types';

interface AudioLabSongDetailModalProps {
    song: Song;
    isOpen: boolean;
    onClose: () => void;
}

export function AudioLabSongDetailModal({
    song,
    isOpen,
    onClose,
}: AudioLabSongDetailModalProps) {
    const { currentSong, isPlaying, currentTime, duration, setCurrentSong, togglePlayPause, setCurrentTime: seekTo } = useAudio();
    const { state } = useAudioLab();
    const [activePart, setActivePart] = useState<VocalPart>('full');
    const [showLyrics, setShowLyrics] = useState(true);

    const isPlaylistView = state.currentView === 'playlist-detail';
    const activePlaylist = state.activePlaylist;
    const hasAudio = !!(song.audioUrls && Object.values(song.audioUrls).some(url => url && url.length > 0)) || !!song.audioUrl;

    // Sync active part with current playing sub-id if applicable
    useEffect(() => {
        if (currentSong?.id?.startsWith(song.id)) {
            const part = currentSong.id.split('-')[1] as VocalPart;
            if (part) setActivePart(part);
        }
    }, [currentSong, song.id]);

    if (!isOpen) return null;

    const availableParts: VocalPart[] = (song.availableParts && song.availableParts.length > 0)
        ? song.availableParts
        : (song.audioUrls
            ? Object.keys(song.audioUrls).filter(k => !!song.audioUrls![k]) as VocalPart[]
            : ['full']);

    const handlePlayPart = (part: VocalPart) => {
        // Full Mix = main audio file from song.audioUrl or audioUrls.full
        const audioUrl = part === 'full'
            ? (song.audioUrl || song.audioUrls?.full)
            : song.audioUrls?.[part];

        if (!audioUrl) return;

        setActivePart(part);

        const audioSong = {
            id: `${song.id}-${part}`,
            title: `${song.title} (${part})`,
            audioFile: audioUrl,
            writer: song.artist,
        };

        if (currentSong?.id === audioSong.id) {
            togglePlayPause();
        } else {
            setCurrentSong(audioSong as any, true);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        seekTo(time);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isThisSongPlaying = currentSong?.id?.startsWith(song.id) && isPlaying;
    const normalizedLyrics: LyricLine[] = Array.isArray(song.lyrics)
        ? song.lyrics
        : typeof song.lyrics === 'string'
            ? [{ time: 0, text: song.lyrics }]
            : [];


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


    // Detect if lyrics contain HTML tags (to decide if we should show timed view or static view)
    const hasHtmlTags = (text: string) => /<[a-z][\s\S]*>/i.test(text);

    // Check if any line in the normalized lyrics has HTML
    const containsHtml = normalizedLyrics.some(line => hasHtmlTags(line.text));

    // Logic to determine if we should show Timed Lyrics or Static Text
    // Show static if:
    // 1. It's explicitly a string source
    // 2. OR the parsed array contains HTML tags (meaning it was likely an HTML blob split up)
    // 3. OR it's a single line of text
    const showStaticLyrics = typeof song.lyrics === 'string' || containsHtml || normalizedLyrics.length <= 1;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-[200] animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal Container - Full Screen AudioLab Style */}
            <div className="fixed inset-0 z-[200] bg-[#0f0f12] flex flex-col animate-slide-up overflow-hidden">
                {/* Responsive Content Wrapper to prevent "squeezed" feeling */}
                <div className="mx-auto w-full max-w-5xl h-full flex flex-col relative">

                    {/* Header Section */}
                    <div className="px-4 sm:px-6 pt-3 sm:pt-0 pb-4 border-b border-white/5 relative shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/5 text-slate-400 hover:bg-white/10 shadow-sm transition-colors flex items-center justify-center border border-white/10"
                        >
                            <X size={20} />
                        </button>

                        <div className="relative overflow-hidden rounded-2xl">
                            {/* Background Visual Overlay */}
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                    backgroundImage: `url('/images/DSC_6155_scaled.jpg')`,
                                    filter: 'blur(8px)',
                                    transform: 'scale(1.1)',
                                }}
                            />
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

                            <div className="relative px-5 pt-5 pb-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                                        <Music className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xl font-bold text-white line-clamp-1">
                                            {song.title}
                                        </h3>
                                        <p className="text-sm font-semibold text-white mt-0.5 opacity-90">
                                            {song.artist}
                                        </p>
                                    </div>
                                </div>

                                {/* Metadata rows */}
                                <div className="mt-5 space-y-2.5 text-xs">
                                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-300">Artist / Lead</span>
                                        <span className="font-bold text-white">{song.artist}</span>
                                    </div>
                                    {song.genre && (
                                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                                            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-300">Category</span>
                                            <span className="font-bold text-white">{song.genre}</span>
                                        </div>
                                    )}
                                    {(song.key || song.tempo) && (
                                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                                            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-300">Key / Tempo</span>
                                            <div className="flex items-center gap-3">
                                                {song.key && (
                                                    <span className="flex items-center gap-1 font-bold text-white">
                                                        <Key size={12} className="text-violet-400" />
                                                        {song.key}
                                                    </span>
                                                )}
                                                {song.tempo && (
                                                    <span className="flex items-center gap-1 font-bold text-white">
                                                        <Clock size={12} className="text-violet-400" />
                                                        {song.tempo} BPM
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 bg-[#0f0f12] space-y-6">

                        {/* Audio Player & Parts (Only if audio available) */}
                        {hasAudio && (
                            <div className="bg-[#191022] rounded-2xl p-5 border border-white/5 shadow-sm">
                                <div className="flex flex-col gap-6">
                                    {/* Player UI */}
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handlePlayPart(activePart)}
                                            className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 active:scale-95 transition-all shrink-0"
                                        >
                                            {isThisSongPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
                                        </button>

                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 tabular-nums">
                                                <span>{formatTime(isThisSongPlaying ? currentTime : 0)}</span>
                                                <span>{formatTime(isThisSongPlaying ? duration : (song.duration || 0))}</span>
                                            </div>
                                            <div className="relative h-6 flex items-center group">
                                                <div className="absolute inset-x-0 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-violet-500 rounded-full"
                                                        style={{ width: `${isThisSongPlaying && duration ? (currentTime / duration) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={isThisSongPlaying ? duration || 100 : 100}
                                                    value={isThisSongPlaying ? currentTime : 0}
                                                    onChange={handleSeek}
                                                    disabled={!isThisSongPlaying}
                                                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vocal Parts (Enhanced pills) */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Parts</p>
                                        <div className="flex flex-wrap gap-2">
                                            {availableParts.map((part) => (
                                                <button
                                                    key={part}
                                                    onClick={() => handlePlayPart(part)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${activePart === part && isThisSongPlaying
                                                        ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20'
                                                        : activePart === part
                                                            ? 'bg-white/10 text-white border-white/10'
                                                            : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    {getPartLabel(part)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lyrics Section */}
                        <div className="space-y-3 pb-6">
                            <button
                                onClick={() => setShowLyrics(!showLyrics)}
                                className="w-full flex items-center justify-between px-1 py-1"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-violet-500/10">
                                        <BookOpen size={18} className="text-violet-400" />
                                    </div>
                                    <span className="font-bold text-white text-sm">Lyrics Guide</span>
                                </div>
                                <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${showLyrics ? 'rotate-180' : ''}`} />
                            </button>

                            {showLyrics && (
                                <div className="rounded-2xl bg-[#191022] border border-white/5 p-6 shadow-sm overflow-hidden">
                                    <style>{`
                                        .lyrics-content {
                                          font-family: 'Poppins', sans-serif;
                                          font-size: 16px;
                                          line-height: 2;
                                          text-align: left;
                                          color: #FFFFFF !important;
                                          background-color: transparent !important;
                                        }
                                        /* Force EVERYTHING to white by default */
                                        .lyrics-content, 
                                        .lyrics-content *,
                                        .lyrics-content p, 
                                        .lyrics-content span,
                                        .lyrics-content div {
                                          color: #FFFFFF !important;
                                          background-color: transparent !important;
                                          font-family: inherit !important;
                                        }
                                        /* Exception for BOLD tags - make them Purple */
                                        .lyrics-content b,
                                        .lyrics-content strong,
                                        .lyrics-content b *,
                                        .lyrics-content strong * {
                                          font-weight: 800;
                                          color: #a78bfa !important; /* Vibrant Purple/Violet */
                                        }
                                        .lyrics-content p, 
                                        .lyrics-content div {
                                          margin-bottom: 0.75rem;
                                        }
                                    `}</style>

                                    {!showStaticLyrics ? (
                                        <div className="space-y-5">
                                            {normalizedLyrics.map((line, i) => {
                                                const isActive = isThisSongPlaying && currentTime >= line.time && (i === normalizedLyrics.length - 1 || currentTime < normalizedLyrics[i + 1].time);
                                                return (
                                                    <p
                                                        key={i}
                                                        className={`text-[16px] leading-relaxed font-bold transition-all duration-300 ${isActive
                                                            ? 'text-violet-400 scale-[1.02] transform origin-left'
                                                            : 'text-[#FFFFFF]'
                                                            }`}
                                                    >
                                                        {line.text}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    ) : song.lyrics ? (
                                        <div
                                            className={`lyrics-content text-[#FFFFFF] ${!containsHtml ? 'whitespace-pre-wrap' : ''}`}
                                            dangerouslySetInnerHTML={{
                                                __html: Array.isArray(song.lyrics)
                                                    ? song.lyrics.map(l => l.text).join('\n')
                                                    : song.lyrics || ''
                                            }}
                                        />
                                    ) : (
                                        <div className="py-12 flex flex-col items-center gap-3 text-slate-600">
                                            <BookOpen size={32} strokeWidth={1} />
                                            <p className="text-sm font-medium">No lyrics available.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
}
