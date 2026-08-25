"use client";

import { useState, useEffect, useRef } from 'react'
import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, PhoneOff, ArrowLeft, MoreVertical, Search, Check, 
  MessageCircle, Loader2, ChevronDown, Info, Settings, Trash2, LogOut, X, Edit3, Download, Pin, Video,
  Reply, Forward, Copy, Smile, BellOff, ImageIcon
} from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
import { useChatV2 } from '../_context/ChatContextV2'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { useAuth } from '@/hooks/useAuth'
import { SyncAvatar } from './SyncAvatar'
import { MessageSearchSidebar } from './MessageSearchSidebar'
import { ReactionType } from '../_lib/chat-service'

interface ChatWindowProps {
  primaryColor: string
  onBackToList: () => void
  onOpenGroupInfo?: () => void
  onForward?: (message: any) => void
  onPin?: (messageId: string | null) => void
}

const HEARTBEAT_THRESHOLD_MS = 120000 // 2 minutes (heartbeat window)
const MINUTE_MS = 60000
const HOUR_MS = 3600000
const DAY_MS = 86400000

export function ChatWindow({
  primaryColor,
  onBackToList,
  onOpenGroupInfo,
  onForward,
  onPin
}: ChatWindowProps) {
  const { user } = useAuth()
  const { 
    selectedChat, 
    messages, 
    isMessagesLoading,
    getChatDisplayName,
    getChatAvatar,
    typingUsers,
    deleteMessage,
    toggleReaction,
    editMessage,
    userPresence
  } = useChatV2()

  const { startCall, callState } = useCall()

  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; senderName: string } | null>(null)
  const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [visibleMessageCount, setVisibleMessageCount] = useState(50)

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return ''
    const date = new Date(lastSeen.seconds * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < MINUTE_MS) return 'just now'
    if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m ago`
    if (diff < DAY_MS) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString()
  }
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const REACTIONS: ReactionType[] = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯', '✨']

  // Toggle search bar
  const handleSearchToggle = () => {
    setShowSearch(prev => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      return !prev
    })
    setSearchQuery('')
  }

  // Filter messages for search
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  // Auto-scroll to bottom
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth')
    }
  }, [messages.length])

  // Handle scroll to show/hide "go to bottom" button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100
    setShowScrollBottom(!isAtBottom)
  }

  const handleMessageAction = (msgId: string, action: string) => {
    // Implement other actions if needed
  }

  const safeDate = (val: any): Date => {
    if (!val) return new Date()
    if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val
    if (typeof val === 'object') {
      const sec = val._seconds ?? val.seconds
      if (sec !== undefined && sec !== null) {
        const s = Number(sec)
        const nano = Number(val._nanoseconds ?? val.nanoseconds ?? 0)
        if (!isNaN(s)) return new Date(s * 1000 + Math.floor(nano / 1000000))
      }
      if (typeof val.toDate === 'function') {
        const d = val.toDate()
        if (d instanceof Date && !isNaN(d.getTime())) return d
      }
      if (typeof val.toMillis === 'function') {
        const d = new Date(val.toMillis())
        if (!isNaN(d.getTime())) return d
      }
    }
    if (typeof val === 'number') {
      if (val > 1e11) return new Date(val)
      if (val > 1e8) return new Date(val * 1000)
    }
    if (typeof val === 'string') {
      const num = Number(val)
      if (!isNaN(num) && num > 1e8) {
        return num > 1e11 ? new Date(num) : new Date(num * 1000)
      }
    }
    const d = new Date(val)
    return isNaN(d.getTime()) ? new Date() : d
  }

  // DOM Limiting & Chronological sorting guarantee
  const sortedMessages = [...messages].sort((a, b) => {
    const aTime = safeDate(a.timestamp).getTime()
    const bTime = safeDate(b.timestamp).getTime()
    return aTime - bTime
  })

  const displayMessages = searchQuery.trim() 
    ? sortedMessages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedMessages.slice(-visibleMessageCount)

  // Date Grouping Helper
  const groupMessagesByDate = () => {
    const groups: { [key: string]: typeof displayMessages } = {}
    displayMessages.forEach(msg => {
      const d = safeDate(msg.timestamp)
      const dateKey = d.toDateString()
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(msg)
    })
    return groups
  }

  const formatGroupDate = (dateStr: string) => {
    const date = safeDate(dateStr)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)

    if (date.toDateString() === now.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  }

  // Jump to reply logic
  const jumpToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('animate-message-highlight')
      setTimeout(() => element.classList.remove('animate-message-highlight'), 2000)
    }
  }

  if (!selectedChat) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.04)_0%,_transparent_70%)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center max-w-xs px-8 text-center z-10"
        >
          <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-5">
            <MessageCircle className="w-9 h-9 text-purple-500" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Rehearsal Hub</h2>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Select a conversation to start chatting with your team.
          </p>
          <div className="mt-8 flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Zone Connected</span>
          </div>
        </motion.div>
      </div>
    )
  }

  const displayName = getChatDisplayName(selectedChat)
  const avatar = getChatAvatar(selectedChat)
  const groupedMessages = groupMessagesByDate()

  return (
    <div className="flex-1 flex flex-col bg-slate-50/80 relative overflow-x-hidden w-full h-full font-sans">
      {/* ── Top Header (Zone / Theme Branded) ── */}
      <div 
        className="flex-shrink-0 flex items-center justify-between px-4 h-[64px] z-30 min-w-0 gap-2 shadow-md transition-colors"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
          color: '#ffffff'
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onBackToList}
            className="md:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center hover:bg-white/15 rounded-full transition-all text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              if (selectedChat.type === 'group' || onOpenGroupInfo) {
                onOpenGroupInfo?.()
              }
            }}
            className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer group/hdr"
            title={selectedChat.type === 'group' ? 'View group info' : 'View contact info'}
          >
            {(() => {
              const otherId = selectedChat.type === 'direct' ? selectedChat.participants.find(id => id !== (user?.id || user?.uid)) : undefined
              const presence = otherId ? userPresence[otherId] : null
              const isOnline = presence?.status === 'online' && (
                presence.lastSeen?.seconds 
                  ? (Date.now() - presence.lastSeen.seconds * 1000 < HEARTBEAT_THRESHOLD_MS)
                  : presence.lastSeen 
                    ? (Date.now() - new Date(presence.lastSeen).getTime() < HEARTBEAT_THRESHOLD_MS)
                    : true
              )

              return (
                <div className="relative flex-shrink-0">
                  <SyncAvatar
                    userId={otherId}
                    initialAvatar={getChatAvatar(selectedChat)}
                    fallbackName={getChatDisplayName(selectedChat)}
                    isGroup={selectedChat.type === 'group'}
                    bgColor="rgba(255, 255, 255, 0.25)"
                    size="w-10 h-10"
                    className="rounded-full overflow-hidden ring-2 ring-white/50 shadow-xs text-white group-hover/hdr:ring-white/80 transition-all"
                  />
                  {selectedChat.type === 'direct' && isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full shadow-xs" />
                  )}
                </div>
              )
            })()}

            <div className="flex flex-col min-w-0">
              <h2 className="font-bold text-[15.5px] text-white truncate leading-tight tracking-tight group-hover/hdr:underline">
                {getChatDisplayName(selectedChat)}
              </h2>
              <div className="min-h-[14px]">
                {typingUsers && typingUsers.length > 0 ? (
                  <span className="text-[12px] font-bold text-white/95 animate-pulse">
                    {typingUsers[0].userName.split(' ')[0]} is typing…
                  </span>
                ) : (
                  <span className="text-[12px] text-white/80 font-medium truncate block">
                    {selectedChat.type === 'group'
                      ? `${selectedChat.participants.length} members • Click for info`
                      : (() => {
                          const otherId = selectedChat.participants.find(id => id !== (user?.id || user?.uid))
                          const presence = otherId ? userPresence[otherId] : null
                          if (presence?.status === 'online') {
                            const lastSeenMs = presence.lastSeen.seconds * 1000
                            if (Date.now() - lastSeenMs < HEARTBEAT_THRESHOLD_MS) {
                              return <span className="text-white font-bold">● online</span>
                            }
                          }
                          if (presence?.lastSeen) return `last seen ${formatLastSeen(presence.lastSeen)}`
                          return 'offline'
                        })()
                    }
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 text-white">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
              showSearch ? 'bg-white/25 text-white' : 'hover:bg-white/15 text-white/90'
            }`}
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Sidebar Integration */}
      <MessageSearchSidebar 
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        messages={messages}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onJumpToMessage={jumpToMessage}
        primaryColor={primaryColor}
      />

      {/* Pinned Message Banner */}
      <AnimatePresence>
        {selectedChat?.pinnedMessageId && messages.find(m => m.id === selectedChat.pinnedMessageId) && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-[70px] left-0 right-0 z-20 px-4 py-2 pointer-events-none"
          >
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-2.5 flex items-center gap-3 pointer-events-auto">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                <Pin className="w-4 h-4" />
              </div>
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                   const msg = messages.find(m => m.id === selectedChat.pinnedMessageId)
                   if (msg) {
                     const element = document.getElementById(`msg-${msg.id}`)
                     element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                   }
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: primaryColor }}>Pinned Message</p>
                <p className="text-[13px] text-slate-800 truncate font-medium">
                  {messages.find(m => m.id === selectedChat.pinnedMessageId)?.text || 'Pinned attachment'}
                </p>
              </div>
              <button 
                onClick={() => onPin?.(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                title="Unpin message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        id="chat-messages-container"
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-6 pt-4 pb-8 scroll-smooth relative bg-slate-50/70"
      >
        
        <div className="relative z-10 min-h-full flex flex-col justify-end">
        {isMessagesLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-70 flex-1 text-slate-400">
             <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
             <p className="font-bold text-xs tracking-widest uppercase text-slate-400">Loading Messages</p>
          </div>
        ) : (
          <div className="flex flex-col justify-end flex-1">
            {messages.length > visibleMessageCount && !searchQuery && (
              <div className="flex justify-center my-4">
                <button 
                  onClick={() => setVisibleMessageCount(prev => prev + 50)}
                  className="px-5 py-2 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 shadow-xs hover:bg-slate-50 transition-all"
                >
                  Load previous messages
                </button>
              </div>
            )}
            
            {Object.entries(groupedMessages).map(([date, msgs], groupIdx) => (
              <React.Fragment key={date}>
                {/* Date Separator */}
                <div className="flex justify-center my-3 first:mt-0">
                  <div className="px-3.5 py-1 bg-white rounded-full text-[11.5px] font-bold text-slate-400 shadow-xs border border-slate-200/80 uppercase tracking-wider">
                    {formatGroupDate(date)}
                  </div>
                </div>

                {/* Messages in Group */}
                {(() => {
                  const activeMsgs = searchQuery 
                    ? filteredMessages.filter(m => new Date(m.timestamp).toDateString() === date) 
                    : msgs;
                    
                  return activeMsgs.map((message, i) => {
                    const isFirstInBatch = i === 0 || activeMsgs[i-1].senderId !== message.senderId
                    const isLastInBatch = i === activeMsgs.length - 1 || activeMsgs[i+1].senderId !== message.senderId
                    
                    return (
                      <div key={message.id} id={`msg-${message.id}`}>
                        <MessageBubble 
                          message={message}
                          isOwn={message.senderId === (user?.id || user?.uid)}
                          showAvatar={isFirstInBatch && selectedChat.type === 'group'}
                          hasTail={isLastInBatch}
                          isFirstInGroup={isFirstInBatch}
                          isLastInGroup={isLastInBatch}
                          primaryColor={primaryColor}
                          onReply={(reply) => setReplyingTo({ id: reply.id, text: reply.text, senderName: reply.senderName })}
                          onJumpToReply={(id) => jumpToMessage(id)}
                          onReaction={(id, reaction) => {
                            toggleReaction(id, reaction)
                          }}
                          onDelete={deleteMessage}
                          onEdit={(id, text) => {
                            setEditingMessage({ id, text })
                          }}
                          onImageClick={setSelectedImage}
                          onForward={onForward}
                          onPin={onPin}
                          searchQuery={searchQuery}
                        />
                      </div>
                    )
                  })
                })()}
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} className="h-6 flex-shrink-0" />
          </div>
        )}
        </div>
      </div>

      {/* Scroll to Bottom */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-20 right-4 w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-full shadow-lg z-30 hover:bg-slate-50 transition-colors flex items-center justify-center"
          >
            <ChevronDown className="w-5 h-5" />
            {selectedChat && (user?.id || user?.uid) && (selectedChat.unreadCount[(user?.id || user?.uid) as string] || 0) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-purple-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {selectedChat.unreadCount[(user?.id || user?.uid) as string]}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Edit Banner */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden border-t border-blue-100 bg-blue-50"
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <Edit3 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs text-blue-600 font-bold flex-1 truncate">Editing: {editingMessage.text}</span>
              <button onClick={() => setEditingMessage(null)} className="text-blue-400 hover:text-blue-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex-shrink-0 relative z-20">
        <ChatInput 
          primaryColor={primaryColor}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onEditComplete={(newText) => {
            if (editingMessage) {
              editMessage(editingMessage.id, newText)
              setEditingMessage(null)
            }
          }}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>
      
      {/* Image Viewer Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedImage(null)}
          >
            {/* Action Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-end gap-3 bg-gradient-to-b from-black/50 to-transparent">
              <a 
                href={selectedImage} 
                download
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur text-white flex items-center justify-center"
              >
                <Download className="w-5 h-5" />
              </a>
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              src={selectedImage}
              alt="Viewed attachment"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
