"use client";

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useMedia } from './_context/MediaContext'
import { Play, MoreVertical, ListVideo } from 'lucide-react'
import { useUnreadNotifications } from '@/stores/notificationStore'
import YouTubeHeader from './_components/YouTubeHeader'
import MediaCard from './_components/MediaCard'
import YouTubeSidebar from './_components/YouTubeSidebar'
import LiveStreamPlayer from './_components/LiveStreamPlayer'
import { useZone } from '@/hooks/useZone'
import { isHQGroup } from '@/config/zones'
import MediaCardSkeleton from './_components/MediaCardSkeleton'

export default function MediaPage() {
  const router = useRouter()
  const { currentZone } = useZone()
  const { user, profile } = useAuth()
  const {
    allMedia,
    isLoading,
    categories,
    isLoadingMore,
    hasMore,
    loadMore,
    refreshMedia
  } = useMedia()

  const { markMediaSeen } = useUnreadNotifications()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'all' | 'playlists'>('all')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    markMediaSeen()
  }, [markMediaSeen])

  useEffect(() => {
    refreshMedia()
  }, [])

  // Infinite Scroll
  useEffect(() => {
    if (!hasMore || isLoadingMore || viewMode !== 'all') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = document.getElementById('load-more-sentinel')
    if (sentinel) observer.observe(sentinel)

    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loadMore, viewMode])

  // Mobile Sidebar Auto-Close
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Filter media
  const filteredMedia = useMemo(() => {
    const safeMedia = Array.isArray(allMedia) ? allMedia : []
    let filtered = safeMedia.filter(m => m && !m.genre?.includes('Shorts'))

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(v => v?.type === selectedCategory)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(v => v?.title?.toLowerCase().includes(q) || v?.description?.toLowerCase().includes(q))
    }

    return filtered
  }, [allMedia, selectedCategory, searchQuery])

  const safeCategories = Array.isArray(categories) ? categories : []

  // Pre-calculate category map for MediaCard optimization
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    safeCategories.forEach((cat: any) => {
      if (cat && cat.slug) map.set(cat.slug, cat.name || cat.slug)
    })
    return map
  }, [safeCategories])

  if (isLoading && (!allMedia || allMedia.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-200 flex flex-col font-sans">
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-200"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar (Fixed on mobile, relative on desktop) */}
        <div className={`fixed lg:relative top-16 lg:top-0 left-0 h-[calc(100vh-64px)] z-[110] transition-all duration-300 bg-slate-950 border-r border-slate-800/80 flex flex-col ${sidebarOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full lg:translate-x-0 lg:w-[72px]'}`}>
          <YouTubeSidebar
            sidebarOpen={sidebarOpen}
            viewMode="all"
            selectedCategory={selectedCategory}
            setViewMode={(mode) => setViewMode(mode as any)}
            setSelectedCategory={setSelectedCategory}
            categories={safeCategories}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
          {/* Category Chips bar */}
          <div className="flex-shrink-0 px-4 py-3 flex gap-3 overflow-x-auto scrollbar-hide border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md z-40 shadow-sm">
            <button
              onClick={() => { setViewMode('all'); setSelectedCategory('all'); }}
              className={`px-5 h-[36px] rounded-xl text-[14px] font-bold transition-all whitespace-nowrap flex-shrink-0 ${viewMode === 'all' && selectedCategory === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            >
              All Media
            </button>
            <button
              onClick={() => router.push('/pages/media/history')}
              className="px-5 h-[36px] rounded-xl text-[14px] font-bold transition-all whitespace-nowrap flex-shrink-0 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Watch History
            </button>
            <button
              onClick={() => user?.uid && router.push(`/pages/media/playlists/${user.uid}_liked`)}
              className="px-5 h-[36px] rounded-xl text-[14px] font-bold transition-all whitespace-nowrap flex-shrink-0 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Liked Videos
            </button>
            {safeCategories.map((cat: any) => (
              <button
                key={cat.id || cat.slug}
                onClick={() => { setViewMode('all'); setSelectedCategory(cat.slug); }}
                className={`px-5 h-[36px] rounded-xl text-[14px] font-bold transition-all whitespace-nowrap flex-shrink-0 ${viewMode === 'all' && selectedCategory === cat.slug ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Scrollable Grid Content */}
          <main className="flex-1 overflow-y-auto bg-slate-950 px-4 sm:px-6 lg:px-8 py-6 max-w-[2400px] w-full mx-auto">
            {/* Live Stream Section - HQ ONLY */}
            {isHQGroup(currentZone?.id) && viewMode === 'all' && selectedCategory === 'all' && !searchQuery && (
              <div className="w-full max-w-[1280px] mx-auto mb-10 sm:mb-12">
                <LiveStreamPlayer isPreview={true} zoneId={currentZone?.id} />
              </div>
            )}
            
            <div className="flex flex-col gap-16 sm:gap-20">
              {/* Section 1: Recently Added */}
              {filteredMedia.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[18px] sm:text-[22px] lg:text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
                      Recently Added
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-x-5 gap-y-12 sm:gap-y-14">
                    {filteredMedia.slice(0, 14).map((video) => (
                      <MediaCard
                        key={video.id}
                        media={video}
                        categoryMap={categoryMap}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Section 2: More to Explore */}
              {filteredMedia.length > 14 && (
                <section>
                  <div className="flex items-center justify-between mb-8 pt-10 border-t border-slate-800/40">
                    <h2 className="text-[18px] sm:text-[22px] lg:text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
                      More to Explore
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-x-5 gap-y-12 sm:gap-y-14">
                    {filteredMedia.slice(14).map((video) => (
                      <MediaCard
                        key={video.id}
                        media={video}
                        categoryMap={categoryMap}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Loading State & Load More */}
              {(isLoading || hasMore) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-x-4 gap-y-12">
                  {isLoading && (
                    <>
                      {[...Array(10)].map((_, i) => (
                        <MediaCardSkeleton key={`skeleton-${i}`} />
                      ))}
                    </>
                  )}
                  
                  {hasMore && (
                    <div id="load-more-sentinel" className="col-span-full h-32 flex items-center justify-center">
                      {isLoadingMore && (
                        <div className="w-12 h-12 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-lg shadow-indigo-500/10" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
