"use client";

import React, { useState } from 'react'
import { 
  Search, Edit3, Users, Loader2, MessageSquarePlus, CheckCheck, Check, 
  MoreVertical, Plus, BellOff, X, ArrowLeft, Pin, Image as ImageIcon,
  Mic, FileText, Star, User, Camera
} from 'lucide-react'
import { useChatV2 } from '../_context/ChatContextV2'
import { useAuth } from '@/hooks/useAuth'
import { SyncAvatar } from './SyncAvatar'
import { Chat } from '../_lib/chat-service'

interface ChatListProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onNewChat: () => void
  onNewGroup: () => void
  onBack?: () => void
  onToggleMoments?: () => void
  isMomentsActive?: boolean
  primaryColor: string
  allTypingUsers?: any
}

function formatChatTime(date: Date | any): string {
  if (!date) return ''
  try {
    let d: Date
    if (date instanceof Date) {
      d = isNaN(date.getTime()) ? new Date() : date
    } else if (typeof date === 'object') {
      const sec = date._seconds ?? date.seconds
      if (sec !== undefined && sec !== null) {
        const s = Number(sec)
        const nano = Number(date._nanoseconds ?? date.nanoseconds ?? 0)
        d = !isNaN(s) ? new Date(s * 1000 + Math.floor(nano / 1000000)) : new Date()
      } else if (typeof date.toDate === 'function') {
        const parsed = date.toDate()
        d = parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : new Date()
      } else if (typeof date.toMillis === 'function') {
        const parsed = new Date(date.toMillis())
        d = !isNaN(parsed.getTime()) ? parsed : new Date()
      } else {
        d = new Date()
      }
    } else if (typeof date === 'number') {
      d = date > 1e11 ? new Date(date) : date > 1e8 ? new Date(date * 1000) : new Date(date)
    } else if (typeof date === 'string') {
      const num = Number(date)
      if (!isNaN(num) && num > 1e8) {
        d = num > 1e11 ? new Date(num) : new Date(num * 1000)
      } else {
        d = new Date(date)
      }
    } else {
      d = new Date()
    }
    if (isNaN(d.getTime())) return ''

    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    if (isYesterday) return 'Yesterday'
    
    // Within the past 6 days, show weekday name (e.g. Mon, Tue)
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 7 && diffDays > 0) {
      return d.toLocaleDateString([], { weekday: 'short' })
    }
    
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function ChatList({
  searchTerm,
  onSearchChange,
  onNewChat,
  onNewGroup,
  onBack,
  onToggleMoments,
  isMomentsActive = false,
  primaryColor,
  allTypingUsers = {}
}: ChatListProps) {
  const { user: currentUser } = useAuth()
  const { 
    chats, 
    selectedChat, 
    selectChat, 
    getChatDisplayName, 
    getChatAvatar, 
    isLoading, 
    userPresence = {},
    togglePinChat
  } = useChatV2()

  const [filterType, setFilterType] = useState<'All' | 'Unread' | 'Favourites' | 'Groups'>('All')

  const userId = currentUser?.id || currentUser?.uid || ''

  // Filter chats by search and category
  const filtered = chats.filter(chat => {
    const name = getChatDisplayName(chat).toLowerCase()
    const term = searchTerm.toLowerCase()
    if (term && !name.includes(term)) return false
    
    if (filterType === 'Unread') {
      const count = userId ? (chat.unreadCount?.[userId] || 0) : 0
      return count > 0
    }
    if (filterType === 'Groups') return chat.type === 'group'
    if (filterType === 'Favourites') {
      return (chat as any).starred?.[userId] || (chat as any).isStarred
    }
    return true
  })

  // Sort: Pinned first -> Most recent lastMessage / lastTimestamp / createdAt
  const sortedChats = [...filtered].sort((a, b) => {
    const aPinned = Boolean(a.pinnedBy?.[userId] || (a as any).pinned?.[userId])
    const bPinned = Boolean(b.pinnedBy?.[userId] || (b as any).pinned?.[userId])

    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1

    const getChatTime = (chat: Chat) => {
      const ts = chat.lastMessage?.timestamp || (chat as any).lastTimestamp || (chat as any).last_message_at || chat.createdAt
      if (!ts) return 0
      if (ts instanceof Date) return isNaN(ts.getTime()) ? 0 : ts.getTime()
      if (typeof ts === 'object') {
        const sec = (ts as any)._seconds ?? (ts as any).seconds
        if (sec !== undefined && sec !== null) {
          const s = Number(sec)
          return !isNaN(s) ? s * 1000 : 0
        }
        if (typeof (ts as any).toMillis === 'function') {
          return (ts as any).toMillis() || 0
        }
      }
      if (typeof ts === 'number') {
        return ts > 1e11 ? ts : ts * 1000
      }
      const time = new Date(ts).getTime()
      return isNaN(time) ? 0 : time
    }

    return getChatTime(b) - getChatTime(a)
  })

  // Helper to render rich preview snippet
  const renderMessageSnippet = (chat: Chat) => {
    const lm = chat.lastMessage as any
    const rawText = typeof chat.lastMessage === 'string'
      ? chat.lastMessage
      : lm?.text || (chat as any).last_message || ''

    const isOwn = lm?.senderId === userId
    const isGroup = chat.type === 'group'

    // Determine media icon or text
    let icon = null
    let previewText = rawText

    if (lm?.imageUrl || (chat as any).lastMessageMedia === 'image') {
      icon = <ImageIcon className="w-3.5 h-3.5 inline mr-1 text-slate-400 flex-shrink-0" />
      if (!previewText) previewText = 'Photo'
    } else if (lm?.voiceUrl || (chat as any).lastMessageMedia === 'voice') {
      icon = <Mic className="w-3.5 h-3.5 inline mr-1 text-purple-500 flex-shrink-0" />
      if (!previewText) previewText = 'Voice message'
    } else if (lm?.attachment || (chat as any).lastMessageMedia === 'document') {
      icon = <FileText className="w-3.5 h-3.5 inline mr-1 text-blue-500 flex-shrink-0" />
      if (!previewText) previewText = 'Document'
    }

    if (!previewText && !icon) {
      return <span className="text-slate-400 italic">No messages yet</span>
    }

    // Sender prefix for groups
    let prefix = ''
    if (isOwn) {
      prefix = 'You: '
    } else if (isGroup && lm?.senderName) {
      const firstName = lm.senderName.split(' ')[0]
      prefix = `${firstName}: `
    }

    return (
      <div className="flex items-center gap-1 min-w-0">
        {isOwn && (
          <span className={`flex-shrink-0 ${lm?.status === 'read' ? 'text-blue-500' : 'text-slate-400'}`}>
            {lm?.status === 'read' ? (
              <CheckCheck className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </span>
        )}
        {icon}
        {prefix && <span className="font-semibold text-slate-600 flex-shrink-0">{prefix}</span>}
        <span className="truncate">{previewText}</span>
      </div>
    )
  }

  return (
    <div className={`w-full md:w-[400px] lg:w-[450px] xl:w-[480px] flex-shrink-0 bg-white border-r border-slate-200/80 flex flex-col h-full ${selectedChat ? 'hidden md:flex' : 'flex'}`}>

      {/* ── Top Header ── */}
      <div className="flex-shrink-0 px-4 pt-3.5 pb-2.5 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-600 active:scale-95 flex-shrink-0 -ml-1"
                title="Back to Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div
              className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-slate-200"
              title="My Account"
            >
              <SyncAvatar
                userId={userId}
                fallbackName={currentUser?.displayName || (currentUser as any)?.name || 'Me'}
                bgColor={primaryColor}
                size="w-9 h-9"
                className="rounded-full"
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Chats</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <button
              onClick={onToggleMoments}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 ${
                isMomentsActive
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-pink-900/30 ring-2 ring-pink-400'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/20'
              }`}
              title="Choir Moments & Reels"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Moments</span>
            </button>
            <button
              onClick={onNewGroup}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-600 active:scale-95"
              title="New Group"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={onNewChat}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-600 active:scale-95"
              title="New Chat"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search input bar */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="w-full pl-10 pr-8 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {(['All', 'Unread', 'Favourites', 'Groups'] as const).map(label => {
            const isActive = filterType === label
            return (
              <button
                key={label}
                onClick={() => setFilterType(label)}
                className={`px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }`}
                style={isActive ? { backgroundColor: primaryColor } : {}}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Chat List ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white divide-y divide-slate-100">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: primaryColor }} />
            <p className="text-xs font-medium">Loading chats…</p>
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-500">
              <MessageSquarePlus className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">
              {searchTerm ? 'No results found' : 'No chats yet'}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {searchTerm
                ? `No conversations matching "${searchTerm}"`
                : 'Start a direct chat or create a group with your team.'}
            </p>
            {!searchTerm && (
              <button
                onClick={onNewChat}
                className="px-5 py-2 text-white text-xs font-bold rounded-xl transition-all hover:opacity-90 active:scale-95 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                Start Chatting
              </button>
            )}
          </div>
        ) : (
          <div>
            {sortedChats.map(chat => {
              const displayName = getChatDisplayName(chat)
              const avatar = getChatAvatar(chat)
              const isSelected = selectedChat?.id === chat.id
              const unreadCount = userId ? (chat.unreadCount?.[userId] || 0) : 0
              const typingInChat = (allTypingUsers && allTypingUsers[chat.id]) || []
              const lastMsgTime = (chat.lastMessage as any)?.timestamp || (chat as any).lastTimestamp || chat.createdAt
              const isUnread = unreadCount > 0
              const isPinned = Boolean(chat.pinnedBy?.[userId] || (chat as any).pinned?.[userId])
              const otherUserId = chat.type === 'direct' ? chat.participants.find(id => id !== userId) : undefined

              return (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left group border-l-4 ${
                    isSelected
                      ? 'bg-slate-100/90 border-current shadow-xs'
                      : 'border-transparent hover:bg-slate-50/90'
                  }`}
                  style={isSelected ? { borderLeftColor: primaryColor } : {}}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <SyncAvatar
                      userId={otherUserId}
                      initialAvatar={avatar}
                      fallbackName={displayName}
                      isGroup={chat.type === 'group'}
                      bgColor={primaryColor}
                      size="w-12 h-12"
                      className="rounded-full overflow-hidden shadow-xs"
                    />
                    {(() => {
                      if (chat.type !== 'direct' || !otherUserId) return null
                      const presence = userPresence[otherUserId]
                      const isOnline = presence?.status === 'online' && (
                        presence.lastSeen?.seconds 
                          ? (Date.now() - presence.lastSeen.seconds * 1000 < 120000)
                          : presence.lastSeen 
                            ? (Date.now() - new Date(presence.lastSeen).getTime() < 120000)
                            : true
                      )
                      if (!isOnline) return null
                      return (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                      )
                    })()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isPinned && (
                          <Pin className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 fill-purple-600" />
                        )}
                        <span className={`text-[15px] truncate font-bold ${isUnread ? 'text-slate-950 font-black' : 'text-slate-900'}`}>
                          {displayName}
                        </span>
                      </div>
                      {lastMsgTime && (
                        <span 
                          className={`text-[11.5px] whitespace-nowrap font-medium flex-shrink-0 ${isUnread ? 'font-bold' : 'text-slate-400'}`}
                          style={isUnread ? { color: primaryColor } : {}}
                        >
                          {formatChatTime(lastMsgTime)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 text-[13px]">
                        {typingInChat.length > 0 ? (
                          <span className="text-[12px] font-semibold flex items-center gap-1" style={{ color: primaryColor }}>
                            <span className="flex gap-0.5">
                              <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:0ms]" style={{ backgroundColor: primaryColor }} />
                              <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:150ms]" style={{ backgroundColor: primaryColor }} />
                              <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:300ms]" style={{ backgroundColor: primaryColor }} />
                            </span>
                            typing…
                          </span>
                        ) : (
                          <div className={`truncate ${isUnread ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                            {renderMessageSnippet(chat)}
                          </div>
                        )}
                      </div>

                      {/* Right Badges */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {unreadCount > 0 && (
                          <span 
                            className="min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] text-white font-bold flex items-center justify-center shadow-xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
