"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { mediaLibraryService, UserWatchHistory, MediaItem } from '../_lib/media-library-service'
import YouTubeHeader from '../_components/YouTubeHeader'
import YouTubeSidebar from '../_components/YouTubeSidebar'
import MediaCard from '../_components/MediaCard'
import { History, Trash2, Clock, X } from 'lucide-react'
import { getCloudinaryThumbnailUrl } from '@/utils/cloudinary'

// Helper to deduce duration since we don't store full media object in history immediately
// We need to fetch media items based on history
export default function HistoryPage() {
    const router = useRouter()
    const { user, profile, isLoading: authLoading } = useAuth()

    const [historyItems, setHistoryItems] = useState<{ history: UserWatchHistory, media: MediaItem }[]>([])
    const [loading, setLoading] = useState(true)

    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [showMobileSearch, setShowMobileSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Mobile Sidebar Auto-Close
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false)
            } else {
                setSidebarOpen(true)
            }
        }

        window.addEventListener('resize', handleResize)
        handleResize()

        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (user?.uid) {
            loadHistory()
        } else if (!authLoading && !user) {
            setLoading(false)
        }
    }, [user?.uid, authLoading])

    const loadHistory = async () => {
        if (!user?.uid) return
        setLoading(true)
        try {
            const history = await mediaLibraryService.getUserWatchHistory(user.uid)

            // Uniqueify by mediaId - keep only the most recent entry
            const uniqueHistory: UserWatchHistory[] = []
            const seenMediaIds = new Set<string>()
            
            history.forEach(h => {
                if (!seenMediaIds.has(h.mediaId)) {
                    uniqueHistory.push(h)
                    seenMediaIds.add(h.mediaId)
                }
            })

            // Fetch associated media details
            const items: { history: UserWatchHistory; media: MediaItem }[] = []

            // Get unique media IDs
            const mediaIds = [...seenMediaIds]
            const mediaList = await mediaLibraryService.getMediaByIds(mediaIds)
            const mediaMap = new Map(mediaList.map(m => [m.id, m]))

            uniqueHistory.forEach(h => {
                const media = mediaMap.get(h.mediaId)
                if (media) {
                    items.push({ history: h, media })
                }
            })

            setHistoryItems(items)
        } catch (error) {
 console.error('Error loading history:', error)
        } finally {
            setLoading(false)
        }
    }

    const clearHistory = async () => {
        if (!user?.uid) return
        if (!confirm('Are you sure you want to clear your entire watch history? This action cannot be undone.')) return
        
        try {
            await mediaLibraryService.clearUserWatchHistory(user.uid)
            setHistoryItems([])
        } catch (error) {
            console.error('Error clearing history:', error)
            alert('Failed to clear history. Please try again.')
        }
    }

    const removeItem = async (historyId: string) => {
        try {
            await mediaLibraryService.removeFromWatchHistory(historyId)
            setHistoryItems(prev => prev.filter(item => item.history.id !== historyId))
        } catch (error) {
            console.error('Error removing item from history:', error)
            alert('Failed to remove item. Please try again.')
        }
    }

    // Mock props for sidebar
    const [viewMode, setViewMode] = useState<'all' | 'shorts'>('all')
    const [selectedCategory, setSelectedCategory] = useState('all')

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center flex-col gap-4">
                <History className="w-16 h-16 text-slate-800" />
                <p className="text-xl font-bold">Sign in to view your history</p>
                <button
                    onClick={() => router.push('/login')}
                    className="px-8 py-3 bg-indigo-600 rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                    Sign In
                </button>
            </div>
        )
    }

    return (
        <div className="h-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col selection:bg-indigo-500/30 font-sans">
            {/* 1. Fixed Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800/80 shadow-md">
                <YouTubeHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showMobileSearch={showMobileSearch}
                    setShowMobileSearch={setShowMobileSearch}
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    userName={profile?.first_name || profile?.display_name || user?.email || undefined}
                />
            </div>

            {/* 2. Main Body Container starting below Header (pt-16) */}
            <div className="flex flex-1 pt-16 overflow-hidden relative">
                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-200"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar Container */}
                <div className={`fixed lg:relative top-16 lg:top-0 left-0 h-[calc(100vh-64px)] z-[110] transition-all duration-300 bg-slate-950 border-r border-slate-800/80 flex flex-col ${sidebarOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full lg:translate-x-0 lg:w-[72px]'}`}>
                    <YouTubeSidebar
                        sidebarOpen={sidebarOpen}
                        viewMode={viewMode}
                        selectedCategory={selectedCategory}
                        setViewMode={setViewMode}
                        setSelectedCategory={setSelectedCategory}
                        categories={[]}
                        onClose={() => setSidebarOpen(false)}
                    />
                </div>

                {/* Main Content Container */}
                <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#0B0F19]">
                    <main className="flex-1 max-w-[2100px] w-full mx-auto px-6 pt-8 pb-32 overflow-y-auto custom-scrollbar bg-[#0B0F19]">
                        <div className="max-w-5xl mx-auto space-y-8">
                            {/* Minimalist Title & Actions Bar (Responsive & Elegant) */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
                                <div>
                                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/[0.08]">
                                            <History className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <span>Watch history</span>
                                    </h1>
                                    <p className="text-xs text-slate-400 font-medium mt-1">{historyItems.length} {historyItems.length === 1 ? 'session' : 'sessions'} watched</p>
                                </div>

                                {historyItems.length > 0 && (
                                    <div className="flex items-center flex-shrink-0">
                                        <button
                                            onClick={clearHistory}
                                            className="flex items-center justify-center gap-2 px-6 h-12 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white rounded-2xl text-sm font-bold transition-all active:scale-95 backdrop-blur-md shadow-xl"
                                        >
                                            <Trash2 className="w-4.5 h-4.5 text-red-400" />
                                            <span>Clear History</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-20 bg-white/[0.02] rounded-2xl animate-pulse border border-white/[0.05]" />
                                    ))}
                                </div>
                            ) : historyItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] rounded-[32px] border border-dashed border-white/[0.08]">
                                    <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 border border-white/[0.05]">
                                        <Clock className="w-6 h-6 text-slate-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-200">Your history is clear</h3>
                                    <p className="text-slate-500 text-sm mt-1 font-medium">Videos you watch will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historyItems
                                        .filter(item => 
                                            item.media.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            item.media.description?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((item) => {
                                            const videoFrameUrl = getCloudinaryThumbnailUrl(item.media.videoUrl);
                                            const thumbnailUrl = (item.media.videoUrl && item.media.videoUrl.includes('cloudinary.com')) 
                                                ? videoFrameUrl 
                                                : (item.media.thumbnail || videoFrameUrl);

                                            return (
                                                <div 
                                                    key={item.history.id} 
                                                    className="group flex items-center gap-4 p-3.5 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/[0.05] hover:border-white/[0.1] transition-all relative cursor-pointer shadow-sm hover:shadow-xl" 
                                                    onClick={() => router.push(`/pages/media/player/${item.media.id}`)}
                                                >
                                                    {/* Thumbnail Container */}
                                                    <div className="w-24 sm:w-32 aspect-video bg-slate-900/80 rounded-xl overflow-hidden flex-shrink-0 relative shadow-md border border-white/10 flex items-center justify-center">
                                                        <img
                                                            src={thumbnailUrl || '/movie/default-hero.jpeg'}
                                                            alt={item.media.title}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                            onError={(e) => {
                                                                const fallback = '/movie/default-hero.jpeg';
                                                                if (e.currentTarget.src !== fallback) {
                                                                    e.currentTarget.src = fallback;
                                                                }
                                                            }}
                                                        />
                                                        
                                                        {/* Play Overlay */}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                            <div className="w-10 h-10 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300">
                                                                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-slate-950 border-b-[5px] border-b-transparent ml-0.5" />
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        {item.history.progress > 0 && (
                                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-950/40 backdrop-blur-md">
                                                                <div
                                                                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)] rounded-r-full"
                                                                    style={{ width: `${item.history.progress}%` }}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Duration Badge */}
                                                        {item.media.duration && (
                                                            <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 shadow-xl">
                                                                {Math.floor(item.media.duration / 60)}:{String(Math.floor(item.media.duration % 60)).padStart(2, '0')}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content Info */}
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <h4 className="font-bold text-base text-slate-100 group-hover:text-indigo-300 transition-colors tracking-tight line-clamp-2">
                                                            {item.media.title}
                                                        </h4>
                                                        
                                                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                                                            <span>Rehearsal Video</span>
                                                            <span className="text-slate-600">•</span>
                                                            <span>{item.history.lastWatched ? new Date(item.history.lastWatched).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'}</span>
                                                            {item.history.progress > 0 && item.history.progress < 95 && (
                                                                <>
                                                                    <span className="text-slate-600">•</span>
                                                                    <span className="text-indigo-400 font-semibold">{Math.round(item.history.progress)}% Watched</span>
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>

                                                    {/* Remove Button */}
                                                    <div className="relative flex-shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                removeItem(item.history.id)
                                                            }}
                                                            className="p-2.5 hover:bg-white/[0.08] rounded-xl text-slate-500 hover:text-red-400 transition-colors active:scale-95"
                                                            title="Remove from history"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}
