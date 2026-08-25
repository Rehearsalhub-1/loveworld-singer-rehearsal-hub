"use client";

import React from 'react'
import { Eye, Heart, Edit2, Trash2, Youtube, Play, MoreVertical, Star } from 'lucide-react'
import { MediaVideo } from '@/app/pages/media/_lib/media-library-service'

interface VideoCardProps {
  video: MediaVideo
  onEdit: (video: MediaVideo) => void
  onDelete: (video: MediaVideo) => void
}

export default function VideoCard({ video, onEdit, onDelete }: VideoCardProps) {
  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/50 overflow-hidden flex flex-col">
      {/* Thumbnail Area */}
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300 bg-white/90 backdrop-blur-md p-3 rounded-full text-purple-600 shadow-xl">
            <Play className="w-6 h-6 fill-current" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {video.isYouTube && (
            <div className="px-2 py-0.5 bg-red-600 text-white text-[10px] rounded-lg font-bold flex items-center gap-1 shadow-lg">
              <Youtube className="w-3 h-3" /> YT
            </div>
          )}
          {video.featured && (
            <div className="px-2 py-0.5 bg-amber-500 text-white text-[10px] rounded-lg font-bold flex items-center gap-1 shadow-lg">
              <Star className="w-3 h-3 fill-current" /> FEATURED
            </div>
          )}
        </div>

        {/* Bottom Metadata Overlay */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white text-[10px] font-medium">
          4:20
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight flex-1">
            {video.title}
          </h3>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mb-4">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-purple-400" /> {video.views || 0}</span>
          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" /> {video.likes || 0}</span>
          <span className="uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 rounded text-[9px] ml-auto">
            {video.type}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
          <button 
            onClick={() => onEdit(video)}
            className="flex-1 py-2 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button 
            onClick={() => onDelete(video)}
            className="px-3 py-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
