"use client";

import { useRouter } from 'next/navigation'
import { ChevronLeft, Share2, ThumbsUp } from 'lucide-react'
import LiveStreamPlayer from '../_components/LiveStreamPlayer'
import { useZone } from '@/hooks/useZone'

export default function LivePage() {
    const router = useRouter()
    const { currentZone } = useZone()

    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col lg:flex-row overflow-hidden selection:bg-indigo-500/30">

            {/* Main Content: Video & Header - Full Width */}
            <div className="flex-1 flex flex-col h-full bg-slate-950 relative">

                {/* Simple Header */}
                <div className="h-16 flex items-center px-6 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl z-20">
                    <button onClick={() => router.back()} className="p-2.5 mr-4 hover:bg-slate-800 rounded-full text-slate-100 transition-all flex items-center justify-center border border-white/5 active:scale-90">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-tight">Main Stage Live</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Live</span>
                        </div>
                    </div>
                </div>

                {/* Video Area */}
                <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto custom-scrollbar">
                    <div className="w-full relative max-w-[1600px] mx-auto">
                        <div className="bg-black">
                           <LiveStreamPlayer zoneId={currentZone?.id} />
                        </div>
                    </div>

                    {/* Stream Info / Mobile Actions */}
                    <div className="p-8 max-w-[1600px] mx-auto w-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-black text-white text-2xl shadow-[0_10px_30px_rgba(79,70,229,0.3)] border border-indigo-400/20">L</div>
                                <div>
                                    <h2 className="text-slate-100 font-extrabold text-xl tracking-tight">Loveworld Singers</h2>
                                    <p className="text-indigo-400/80 text-[13px] font-bold uppercase tracking-widest mt-0.5">Global Session</p>
                                </div>
                            </div>
                        </div>

                        {/* Description Box */}
                        <div className="bg-slate-900/50 backdrop-blur-sm rounded-[32px] p-8 mt-4 border border-white/10 shadow-inner">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                <span>Started streaming less than a minute ago</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed text-[15px] font-medium max-w-3xl">
                                Welcome to the official Loveworld Singers Rehearsal Hub live stream.
                                Be part of the rehearsal session from anywhere in the world and experience 
                                the power of worship in real-time.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-2.5">
                                <div className="bg-slate-800/50 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/10 transition-all hover:bg-slate-800">#Live</div>
                                <div className="bg-slate-800/50 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 border border-white/5 transition-all hover:bg-slate-800">#Rehearsal</div>
                                <div className="bg-slate-800/50 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 border border-white/5 transition-all hover:bg-slate-800">#Music</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
