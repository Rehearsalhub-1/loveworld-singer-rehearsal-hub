"use client";

import React from 'react'
import { 
  Film, ListVideo, Tag, FolderOpen, 
  Settings, ChevronRight 
} from 'lucide-react'

interface ManagementSidebarProps {
  activeView: string
  onViewChange: (view: any) => void
  counts: {
    videos: number
    playlists: number
    categories: number
  }
}

export default function ManagementSidebar({ activeView, onViewChange, counts }: ManagementSidebarProps) {
  const menuItems = [
    { id: 'videos', label: 'Videos', icon: Film, count: counts.videos },
    { id: 'playlists', label: 'Playlists', icon: ListVideo, count: counts.playlists },
    { id: 'categories', label: 'Categories', icon: Tag, count: counts.categories },
  ]

  return (
    <div className="w-64 bg-white/40 backdrop-blur-xl border-r border-slate-200/50 flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Library</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id || (activeView === 'playlist-detail' && item.id === 'playlists')
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200/50' 
                    : 'text-slate-600 hover:bg-white/60 hover:text-purple-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-500'}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {item.count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-200/50">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white shadow-xl shadow-purple-200">
          <p className="text-xs font-medium text-purple-100 mb-1">Storage used</p>
          <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-white w-2/3 rounded-full" />
          </div>
          <p className="text-[10px] text-purple-100">65% of 50GB used</p>
        </div>
      </div>
    </div>
  )
}
