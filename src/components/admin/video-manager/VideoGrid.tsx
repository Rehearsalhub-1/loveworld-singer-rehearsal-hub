"use client";

import React from 'react'
import VideoCard from './VideoCard'
import { MediaVideo } from '@/app/pages/media/_lib/media-library-service'
import { Search, Filter, LayoutGrid, List } from 'lucide-react'

interface VideoGridProps {
  videos: MediaVideo[]
  searchQuery: string
  onSearchChange: (query: string) => void
  onEdit: (video: MediaVideo) => void
  onDelete: (video: MediaVideo) => void
}

export default function VideoGrid({ videos, searchQuery, onSearchChange, onEdit, onDelete }: VideoGridProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Search and Filters Bar */}
      <div className="p-6 bg-white/40 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search library..." 
              className="w-full pl-11 pr-4 py-3 bg-white/80 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm font-medium"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-3 bg-white/80 border border-slate-200 rounded-2xl text-slate-600 hover:text-purple-600 hover:border-purple-200 transition-all">
              <Filter className="w-4 h-4" />
            </button>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
              <button className="p-2 bg-white rounded-xl shadow-sm text-purple-600"><LayoutGrid className="w-4 h-4" /></button>
              <button className="p-2 text-slate-400 hover:text-slate-600"><List className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
          ))}
        </div>
        
        {videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg">No videos found</h3>
            <p className="text-slate-500 max-w-[240px] text-center text-sm">We couldn't find any videos matching your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
