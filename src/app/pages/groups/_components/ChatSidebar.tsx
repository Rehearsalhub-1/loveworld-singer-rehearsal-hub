"use client";

'use client'

import { useState, useEffect } from 'react'
import { useChat } from '../_context/ChatContext'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { MessageCircle, Users, Search, CheckCircle2, Pin, Star, Trash2, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Chat } from '../_lib/chat-types'

export default function ChatSidebar() {
  const { chats, selectedChat, setSelectedChat, isChatsLoading, deleteChat, togglePinChat, toggleStarChat } = useChat()
  const { user } = useAuth()
  const { currentZone } = useZone()
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
  const [showMenuChatId, setShowMenuChatId] = useState<string | null>(null)

  const currentUserId = (user as any)?.uid || (user as any)?.id || ''

  // Resolve the display name of a chat
  const getChatDisplayName = (chat: Chat): string => {
    if (chat.type === 'group') return (chat as any).name || 'Group Chat'
    const otherParticipantId = chat.participants.find(id => id !== currentUserId)
    if (!otherParticipantId) return 'Unknown User'
    // JWT API shape — participantDetails is the preferred source
    const details = (chat as any).participantDetails
    if (details?.[otherParticipantId]?.name) return details[otherParticipantId].name
    // Firestore fallback
    if (chat.participantNames?.[otherParticipantId]) return chat.participantNames[otherParticipantId]
    return `User ${otherParticipantId.substring(0, 6)}…`
  }

  // Resolve the last message preview text
  const getChatLastMessage = (chat: Chat): string => {
    const c = chat as any
    // JWT API shape: lastMessage is a plain string
    if (typeof c.lastMessage === 'string' && c.lastMessage) return c.lastMessage
    // Firestore shape: lastMessage is an object with .text
    if (c.lastMessage?.text) return c.lastMessage.text
    return ''
  }

  // Resolve the last message timestamp
  const getChatLastTimestamp = (chat: Chat): Date | null => {
    const c = chat as any
    // JWT API shape: separate lastTimestamp field
    const raw = c.lastTimestamp || c.lastMessage?.timestamp
    if (!raw) return null
    if (raw instanceof Date) return raw
    if (typeof raw === 'string') {
      const d = new Date(raw)
      return isNaN(d.getTime()) ? null : d
    }
    if (typeof raw === 'number') return new Date(raw)
    if (typeof raw === 'object' && typeof raw.toDate === 'function') return raw.toDate()
    return null
  }

  const formatLastMessageTime = (date: Date | null): string => {
    if (!date) return ''
    try {
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return ''
    }
  }

  // Filter chats
  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return getChatDisplayName(chat).toLowerCase().includes(searchLower)
  })

  // Sort: pinned → starred → recent
  const sortedChats = [...filteredChats].sort((a, b) => {
    const aPinned = (a as any).pinned?.[currentUserId] || false
    const bPinned = (b as any).pinned?.[currentUserId] || false
    const aStarred = (a as any).starred?.[currentUserId] || false
    const bStarred = (b as any).starred?.[currentUserId] || false

    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    if (aStarred && !bStarred) return -1
    if (!aStarred && bStarred) return 1

    const aTime = getChatLastTimestamp(a)?.getTime() || 0
    const bTime = getChatLastTimestamp(b)?.getTime() || 0
    return bTime - aTime
  })

  const handleDeleteChat = async (chatId: string) => {
    if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      await deleteChat(chatId)
      setShowMenuChatId(null)
    }
  }

  const handleTogglePin = async (chatId: string, currentPin: boolean) => {
    await togglePinChat(chatId, !currentPin)
    setShowMenuChatId(null)
  }

  const handleToggleStar = async (chatId: string, currentStar: boolean) => {
    await toggleStarChat(chatId, !currentStar)
    setShowMenuChatId(null)
  }

  if (isChatsLoading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-600">Chats</span>
          </div>
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <MessageCircle className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900 text-base sm:text-lg">Chats</span>
          <span className="text-sm text-gray-500">({chats.length})</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chats Yet</h3>
            <p className="text-gray-600 text-sm mb-4">
              Start a conversation by searching for users or creating a group
            </p>
          </div>
        ) : (
          <div className="p-2">
            {sortedChats.map((chat) => {
              const isPinned = (chat as any).pinned?.[currentUserId] || false
              const isStarred = (chat as any).starred?.[currentUserId] || false
              const isHovered = hoveredChatId === chat.id
              const showMenu = showMenuChatId === chat.id
              const lastMsgText = getChatLastMessage(chat)
              const lastMsgDate = getChatLastTimestamp(chat)
              const chatName = getChatDisplayName(chat)
              const unread = typeof (chat as any).unreadCount === 'object'
                ? ((chat as any).unreadCount?.[currentUserId] || 0)
                : ((chat as any).unreadCount || 0)

              return (
                <div
                  key={chat.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => {
                    setHoveredChatId(null)
                    setShowMenuChatId(null)
                  }}
                >
                  <div
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-3 rounded-lg transition-all hover:bg-gray-50 touch-target cursor-pointer ${
                      selectedChat?.id === chat.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                          style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
                        >
                          {chat.type === 'group' ? (
                            <Users className="w-6 h-6" />
                          ) : (
                            chatName[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        {chat.type === 'direct' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                        )}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {isPinned && (
                              <Pin className="w-3 h-3 text-purple-600 flex-shrink-0" fill="currentColor" />
                            )}
                            {isStarred && (
                              <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" />
                            )}
                            <h4 className="font-semibold text-gray-900 truncate">{chatName}</h4>
                          </div>
                          {lastMsgDate && (
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatLastMessageTime(lastMsgDate)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-600 truncate">
                            {lastMsgText ? (
                              lastMsgText
                            ) : (
                              <span className="text-gray-400 italic">No messages yet</span>
                            )}
                          </p>
                          {unread > 0 && (
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center flex-shrink-0">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Menu Button */}
                      {isHovered && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMenuChatId(showMenu ? null : chat.id)
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <div className="absolute right-2 top-12 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[160px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTogglePin(chat.id, isPinned)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                      >
                        <Pin className={`w-4 h-4 ${isPinned ? 'text-purple-600' : 'text-gray-600'}`} fill={isPinned ? 'currentColor' : 'none'} />
                        {isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleStar(chat.id, isStarred)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                      >
                        <Star className={`w-4 h-4 ${isStarred ? 'text-yellow-500' : 'text-gray-600'}`} fill={isStarred ? 'currentColor' : 'none'} />
                        {isStarred ? 'Unstar' : 'Star'}
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteChat(chat.id)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
