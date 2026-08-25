"use client";

import { useRouter } from 'next/navigation'
import { Radio } from 'lucide-react'

export default function LiveCard() {
    const router = useRouter()

    return (
        <div
            onClick={() => router.push('/pages/media/live')}
            className="w-full max-w-[1280px] mx-auto mb-8 cursor-pointer group"
        >
            <div className="relative aspect-[21/9] sm:aspect-[3/1] rounded-2xl overflow-hidden bg-gradient-to-r from-purple-900 to-blue-900 shadow-xl border border-white/10">
                {/* Background Decoration */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-500 mix-blend-overlay"></div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full mb-4 animate-pulse shadow-lg">
                        <Radio className="w-4 h-4 text-white" />
                        <span className="text-white font-bold text-xs tracking-widest uppercase">Live Now</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-xl tracking-tight">
                        Main Stage Live
                    </h2>
                    <p className="text-blue-100 font-medium text-lg drop-shadow-md">
                        Click to watch and chat with the team
                    </p>

                    <div className="mt-6 px-8 py-3 bg-white text-black font-bold rounded-full transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        Watch Stream
                    </div>
                </div>
            </div>
        </div>
    )
}
