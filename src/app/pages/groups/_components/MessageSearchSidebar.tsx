"use client";

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Calendar, MessageSquare, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

interface MessageSearchSidebarProps {
  isOpen: boolean
  onClose: () => void
  messages: any[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  onJumpToMessage: (messageId: string) => void
  primaryColor: string
}

export function MessageSearchSidebar({
  isOpen,
  onClose,
  messages,
  searchQuery,
  setSearchQuery,
  onJumpToMessage,
  primaryColor
}: MessageSearchSidebarProps) {
  
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return []
    return messages
      .filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [messages, searchQuery])

  // Helper to highlight search text
  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 text-black px-0.5 rounded-sm font-bold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    )
  }

  // Color helper (local to avoid export issues)
  const adjustColor = (color: string, amount: number): string => {
    if (!color || color.length < 7) return color
    const hex = color.replace('#', '')
    const num = parseInt(hex, 16)
    const r = Math.max(0, Math.min(255, (num >> 16) + amount))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed right-0 top-0 bottom-0 w-full md:w-[380px] z-[120] bg-[#f0f2f5] border-l border-[#e9edef] flex flex-col shadow-2xl"
        >
          {/* Premium Header */}
          <div className="flex-shrink-0 relative h-[108px] overflow-hidden flex flex-col justify-end px-6 pb-4 shadow-xl z-20">
             <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)` }} />
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#ffffff_0%,_transparent_60%)]" />
             
             <div className="relative z-10 flex items-center gap-4">
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 flex items-center justify-center -ml-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
                <div>
                  <h2 className="text-[19px] font-bold text-white tracking-tight">Search Messages</h2>
                  <p className="text-white/70 text-[11px] font-medium uppercase tracking-widest">Find in conversation</p>
                </div>
             </div>
          </div>

          {/* Search Input Area */}
          <div className="p-4 bg-white border-b border-gray-100 shadow-sm z-10">
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                 <Search className="w-5 h-5 text-gray-400 group-focus-within:text-current transition-colors" style={{ color: searchQuery ? primaryColor : undefined }} />
               </div>
               <input 
                 autoFocus
                 type="text" 
                 value={searchQuery} 
                 onChange={(e) => setSearchQuery(e.target.value)} 
                 placeholder="Type to search..." 
                 className="w-full pl-12 pr-12 py-3.5 bg-[#f0f2f5] hover:bg-gray-100 focus:bg-white rounded-2xl text-[15px] text-[#111b21] transition-all focus:outline-none focus:ring-2 focus:ring-current/10 placeholder:text-gray-400 font-medium"
                 style={{ color: primaryColor }}
               />
               {searchQuery && (
                 <button 
                   onClick={() => setSearchQuery('')}
                   className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                 >
                   <X className="w-5 h-5" />
                 </button>
               )}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-2">
            {!searchQuery.trim() ? (
              <div className="h-full flex flex-col items-center justify-center p-8 opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                   <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-center text-[15px] text-gray-500 font-medium leading-relaxed">
                  Search for messages with anyone <br/> in this Hub conversation.
                </p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[12px] mb-2">No results found</p>
                <p className="text-gray-400 text-sm">Try different keywords</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="px-6 py-2">
                   <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                     {filteredMessages.length} Message{filteredMessages.length !== 1 ? 's' : ''} found
                   </p>
                </div>
                {filteredMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => {
                      onJumpToMessage(msg.id)
                      // Optionally close on mobile
                      if (window.innerWidth < 768) onClose()
                    }}
                    className="w-full px-6 py-4 flex flex-col gap-1 hover:bg-white transition-all text-left group relative active:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                       <span className="text-[13px] font-bold text-[#111b21] group-hover:text-current transition-colors" style={{ color: primaryColor }}>
                         {msg.senderName}
                       </span>
                       <span className="text-[11px] text-gray-400 font-medium">
                         {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                       </span>
                    </div>
                    <div className="flex items-start gap-2">
                       <div className="flex-1 text-[14px] text-[#3b4a54] line-clamp-2 leading-relaxed">
                         {highlightText(msg.text || '(attachment)', searchQuery)}
                       </div>
                       <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-0.5 transition-transform mt-1 flex-shrink-0" />
                    </div>
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-current opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: primaryColor }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
