"use client";

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function AboutSection() {
    const [openAbout, setOpenAbout] = useState<number | null>(null)

    const toggleAbout = (index: number) => {
        setOpenAbout(openAbout === index ? null : index)
    }

    return (
        <div className="pb-6">
            <h2 className="text-lg font-outfit-semibold text-gray-800 mb-4">ABOUT</h2>
            <div className="space-y-2">
                <div className="bg-white/70 backdrop-blur-sm border-0 rounded-2xl shadow-sm overflow-hidden ring-1 ring-black/5">
                    <button
                        onClick={() => toggleAbout(0)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors active:bg-gray-100 focus:outline-none"
                    >
                        <h4 className="text-sm font-medium text-gray-800 pr-2">What is LoveWorld Singers Rehearsal Hub?</h4>
                        <div className="flex-shrink-0">
                            {openAbout === 0 ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </div>
                    </button>
                    {openAbout === 0 && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                            <p className="text-sm text-gray-600 leading-relaxed pt-3">A comprehensive platform for managing rehearsal schedules, song collections, and ministry activities. Connect with fellow singers, access audio resources, and stay updated with the latest rehearsal updates.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
