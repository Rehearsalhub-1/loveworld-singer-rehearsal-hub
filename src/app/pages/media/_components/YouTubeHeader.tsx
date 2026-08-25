"use client";

import { Search, Menu, Bell, Plus, Play, ArrowLeft, Mic } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface YouTubeHeaderProps {
    searchQuery: string
    setSearchQuery: (query: string) => void
    showMobileSearch: boolean
    setShowMobileSearch: (show: boolean) => void
    toggleSidebar: () => void
    userName?: string
    userEmail?: string
}

export default function YouTubeHeader({
    searchQuery,
    setSearchQuery,
    showMobileSearch,
    setShowMobileSearch,
    toggleSidebar,
    userName,
    userEmail
}: YouTubeHeaderProps) {
    const router = useRouter()

    return (
        <>
            <header className="h-16 flex items-center justify-between px-2 sm:px-6 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 transition-all">
                <div className="flex items-center gap-1 sm:gap-4">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                    >
                        <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>
                    {/* Branding removed as requested */}
                </div>

                <div className="hidden md:flex flex-1 items-center max-w-[720px] mx-10 gap-4">
                    <div className="flex flex-1 items-center group/search relative">
                        {/* Search Input Container */}
                        <div className="flex flex-1 items-center bg-slate-900/50 border border-slate-700 rounded-l-full px-5 h-10 group-focus-within/search:ml-[-1px] group-focus-within/search:border-indigo-500 group-focus-within/search:ring-1 group-focus-within/search:ring-indigo-500 group-focus-within/search:pl-[44px] transition-all duration-200 relative z-10 overflow-hidden shadow-inner font-medium">
                            {/* Blue search icon that appears on focus */}
                            <div className="absolute left-4 hidden group-focus-within/search:flex items-center justify-center">
                                <Search className="w-5 h-5 text-indigo-400" strokeWidth={2} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent text-[15px] sm:text-[16px] text-slate-200 placeholder-slate-500 focus:outline-none w-full font-sans -mt-[2px]"
                            />
                        </div>
                        {/* Search Button */}
                        <button className="h-10 px-[24px] bg-slate-800 border border-slate-700 border-l-0 rounded-r-full hover:bg-slate-700 transition-colors group relative flex flex-shrink-0 items-center justify-center z-10" title="Search">
                            <Search className="w-5 h-5 text-slate-300 font-light" strokeWidth={1.5} />
                            <div className="absolute top-[52px] left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 shadow-xl border border-slate-700 rounded-md text-slate-200 text-[12px] font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity delay-300 z-50">
                                Search
                            </div>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-0.5 sm:gap-2">
                    <button onClick={() => setShowMobileSearch(true)} className="p-2 hover:bg-white/10 rounded-full md:hidden flex items-center justify-center">
                        <Search className="w-5 h-5 text-white font-bold" />
                    </button>
                    <div className="ml-1 sm:ml-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer text-white">
                            {(userName || userEmail)?.[0].toUpperCase() || 'U'}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Search Overlay */}
            {showMobileSearch && (
                <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl px-4 h-16 flex items-center gap-3 border-b border-slate-800">
                    <button onClick={() => setShowMobileSearch(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 transition-colors flex items-center justify-center">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 h-10 flex items-center focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-[15px] sm:text-[16px] text-slate-100 placeholder-slate-500 focus:outline-none"
                        />
                    </div>
                </div>
            )}
        </>
    )
}
