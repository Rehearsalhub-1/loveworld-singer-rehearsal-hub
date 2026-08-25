"use client";

import { X, Sparkles, Crown, ArrowRight } from 'lucide-react'

interface CelebrationOverlayProps {
    show: boolean
    onClose: () => void
}

export default function CelebrationOverlay({ show, onClose }: CelebrationOverlayProps) {
    if (!show) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40 animate-in fade-in duration-500">
            <div className="relative w-full max-w-sm bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-center shadow-2xl border border-white/10 animate-in zoom-in-95 duration-500">
                {/* Animated Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-600/30 rounded-full blur-[50px]"></div>

                <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12 animate-bounce">
                        <Crown className="w-12 h-12 text-white" />
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                        <span className="text-[10px] font-black tracking-[0.3em] text-purple-400 uppercase">Premium Member</span>
                        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </div>

                    <h2 className="text-4xl font-black text-white mb-4 tracking-tighter leading-none">
                        WELCOME <br />TO THE ELITE!
                    </h2>

                    <p className="text-gray-400 text-sm mb-10 leading-relaxed px-2">
                        Your account is now fully upgraded. Explore the Media Lab, Audio Studio, and all exclusive rehearsals.
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-white text-gray-950 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
                    >
                        START EXPLORING
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
