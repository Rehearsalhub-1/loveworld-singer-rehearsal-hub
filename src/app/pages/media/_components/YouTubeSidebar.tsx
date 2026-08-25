"use client";

import {
    Home as HomeIcon, Play, ListVideo, History,
    PlaySquare, Clock, ThumbsUp, FolderOpen, X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface SidebarItemProps {
    icon: any
    label: string
    active?: boolean
    onClick?: () => void
    compact?: boolean
}

function SidebarItem({ icon: Icon, label, active = false, onClick, compact = false }: SidebarItemProps) {
    if (compact) {
        return (
            <button
                onClick={onClick}
                className={`flex flex-col items-center gap-1.5 py-[16px] w-[64px] mx-auto rounded-xl transition-all duration-300 hover:bg-slate-800 ${active ? 'bg-indigo-500/10' : ''}`}
                title={label}
            >
                <Icon className={`w-6 h-6 transition-colors ${active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'}`} strokeWidth={active ? 2 : 1.5} />
                <span className={`text-[10px] w-full px-1 truncate leading-tight font-medium ${active ? 'text-indigo-400' : 'text-slate-400'}`}>{label}</span>
            </button>
        )
    }

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-5 px-3 h-12 w-full rounded-xl transition-all duration-300 hover:bg-slate-800/80 active:bg-slate-800 ${active ? 'bg-indigo-500/10 font-bold' : 'font-medium'}`}
        >
            <Icon className={`w-6 h-6 transition-colors ${active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} strokeWidth={active ? 2.5 : 1.5} />
            <span className={`text-[14px] truncate transition-colors ${active ? 'text-indigo-400' : 'text-slate-300'}`}>{label}</span>
        </button>
    )
}

export interface YouTubeSidebarProps {
    sidebarOpen?: boolean
    viewMode?: 'all' | 'shorts'
    selectedCategory?: string
    setViewMode?: (mode: 'all' | 'shorts') => void
    setSelectedCategory?: (category: string) => void
    categories?: any[]
    onClose?: () => void
    activeTab?: string
    onTabChange?: (tab: string) => void
    isExpanded?: boolean
}

export default function YouTubeSidebar({
    sidebarOpen = false,
    viewMode = 'all',
    selectedCategory = 'all',
    setViewMode = () => {},
    setSelectedCategory = () => {},
    categories = [],
    onClose,
    activeTab,
    onTabChange,
    isExpanded
}: YouTubeSidebarProps) {
    const router = useRouter()
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

    const { user } = useAuth()
    const userId = user?.uid || user?.id

    const isMediaHome = pathname === '/pages/media' || pathname.includes('/player/')
    const isHistory = pathname.includes('/history')
    const isLiked = pathname.includes('_liked')
    const isOpen = isExpanded ?? sidebarOpen

    return (
        <aside className="flex-1 w-full flex flex-col gap-1 py-4 overflow-y-auto scrollbar-hide bg-slate-950 px-2 z-[120]">
            {/* Mobile Sidebar Header */}
            {isOpen && (
                <div className="flex lg:hidden items-center gap-4 px-2 mb-6 h-14 shrink-0 border-b border-slate-800 pb-2">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white flex items-center justify-center"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}
                    <div className="flex items-center gap-1">
                        <span className="text-slate-100 font-bold tracking-tight text-lg pl-1">MEDIA HUB</span>
                    </div>
                </div>
            )}

            <SidebarItem
                icon={HomeIcon}
                label="Home"
                active={false}
                onClick={() => router.push('/home')}
                compact={!isOpen}
            />
            
            <SidebarItem
                icon={Play}
                label="Media Home"
                active={isMediaHome}
                onClick={() => {
                    if (pathname !== '/pages/media') {
                        router.push('/pages/media')
                    }
                    setViewMode('all');
                    setSelectedCategory('all');
                }}
                compact={!isOpen}
            />

            {isOpen && <hr className="my-4 border-slate-800 mx-3" />}
            
            <SidebarItem
                icon={History}
                label="History"
                active={isHistory}
                compact={!isOpen}
                onClick={() => router.push('/pages/media/history')}
            />
            <SidebarItem
                icon={ThumbsUp}
                label="Liked videos"
                active={isLiked}
                compact={!isOpen}
                onClick={() => userId && router.push(`/pages/media/playlists/${userId}_liked`)}
            />
        </aside>
    )
}
