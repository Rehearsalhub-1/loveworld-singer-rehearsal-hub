"use client";

import { useState, useMemo } from 'react';
import { Radio, MessageSquare, Maximize2, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import { ZONES } from '@/config/zones';

interface LiveStreamPlayerProps {
    isPreview?: boolean;
    zoneId?: string;
}

export default function LiveStreamPlayer({ isPreview = false, zoneId }: LiveStreamPlayerProps) {
    const zone = useMemo(() => zoneId ? ZONES.find(z => z.id === zoneId) : null, [zoneId]);
    const streams = zone?.streams || [];

    // Default stream state
    const [activeStreamId, setActiveStreamId] = useState<string | null>(streams.length > 0 ? streams[0].id : null);

    const activeStream = useMemo(() => {
        if (streams.length === 0) return null;
        return streams.find(s => s.id === (activeStreamId || streams[0].id)) || streams[0];
    }, [activeStreamId, streams]);

    // Default stream details fallback
    const defaultPublicId = "live_stream_789e522db80d47b2bfd6c156f9d52813_hls";

    const playerUrl = activeStream?.playerLink ||
        `https://player.cloudinary.com/embed/?cloud_name=dvtjjt3js&public_id=${defaultPublicId}&profile=cld-live-streaming`;

    return (
        <div className="w-full mb-12 group relative">
            {/* Stream Switcher - Only if multiple streams and not in preview */}
            {!isPreview && streams.length > 1 && (
                <div className="flex gap-2 mb-4 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-fit backdrop-blur-sm">
                    {streams.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveStreamId(s.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeStreamId === s.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                }`}
                        >
                            <MonitorPlay className="w-4 h-4" />
                            {s.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Video Container - Pure 16:9 */}
            <div className="aspect-video w-full bg-slate-950 rounded-lg overflow-hidden shadow-2xl relative border border-white/10 transition-all">
                <iframe
                    key={activeStream?.id || 'default'}
                    src={playerUrl}
                    className="w-full h-full border-0 absolute inset-0"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title="Live Stream"
                ></iframe>

                {/* Live Overlay Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-white z-10 pointer-events-none border border-white/10 ring-1 ring-black/20">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                    <span className="text-xs font-bold uppercase tracking-wider">LIVE</span>
                    {activeStream && streams.length > 1 && (
                        <>
                            <span className="w-px h-3 bg-white/20 mx-1"></span>
                            <span className="text-[10px] opacity-70 font-medium">{activeStream.name}</span>
                        </>
                    )}
                </div>

                {/* Interactive Overlay for Preview Mode */}
                {isPreview && (
                    <Link
                        href="/pages/media/live"
                        className="absolute inset-0 bg-transparent hover:bg-slate-950/20 transition-colors flex items-center justify-center group/overlay"
                    >
                        <div className="bg-indigo-600 text-white px-8 py-3.5 rounded-full font-bold flex items-center gap-3 opacity-0 group-hover/overlay:opacity-100 transform translate-y-4 group-hover/overlay:translate-y-0 transition-all duration-300 shadow-2xl shadow-indigo-500/40 border border-indigo-400/20">
                            <MessageSquare className="w-5 h-5" />
                            <span className="text-base">Join Chat & Watch</span>
                            <Maximize2 className="w-4 h-4 ml-1 opacity-70" />
                        </div>
                    </Link>
                )}
            </div>

            {/* Simple Label if Preview */}
            {isPreview && (
                <div className="mt-4 flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping opacity-75"></div>
                        </div>
                        <span className="text-[15px] font-semibold text-slate-100 tracking-tight">
                            {streams.length > 1 ? 'Multiple Live Streams' : 'Live Stream Active'}
                        </span>
                    </div>
                    <Link href="/pages/media/live" className="text-sm font-medium text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition-colors group/link">
                        Click to chat <Maximize2 className="w-3.5 h-3.5 group-hover/link:scale-110 transition-transform" />
                    </Link>
                </div>
            )}
        </div>
    )
}
