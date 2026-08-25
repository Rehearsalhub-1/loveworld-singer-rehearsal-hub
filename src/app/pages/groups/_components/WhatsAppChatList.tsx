"use client";

import React, { useState, useEffect } from 'react'
import {
  Search,
  MessageCircle,
  Users,
  Pin,
  Archive,
  MoreVertical,
  CheckCheck,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useChat } from '../_context/ChatContext'
import { useAuth } from '@/hooks/useAuth'
import { Chat } from '../_lib/chat-types'
import { WhatsAppPresence, PresenceData } from '../_lib/whatsapp-presence'

interface WhatsAppChatListProps {
  onChatSelect?: (chat: Chat) => void
  className?: string
}

export function WhatsAppChatList({ onChatSelect, className = '' }: WhatsAppChatListProps) {
  const { user } = useAuth()
  const {
    chats,
    selectedChat,
    setSelectedChat,
    isChatsLoading,
    deleteChat,
    togglePinChat
  } = useChat()

  const [searchTerm, setSearchTerm] = useState('')
  const [presenceData, setPresenceData] = useState<Map<string, PresenceData>>(new Map())
  const [showArchived, setShowArchived] = useState(false)

  // Subscribe to presence for all chat participants
  useEffect(() => {
    if (chats.length === 0) return

    const allParticipants = new Set<string>()
    chats.forEach(chat => {
      chat.participants.forEach(p => {
        if (p !== user?.uid) {
          allParticipants.add(p)
        }
      })
    })

    if (allParticipants.size === 0) return

    const unsubscribe = WhatsAppPresence.subscribeToPresence(
      Array.from(allParticipants),
      setPresenceData
    )

    return unsubscribe
  }, [chats, user])

  // Filter chats based on search
  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()

    // Search in chat name (for groups)
    if (chat.name?.toLowerCase().includes(searchLower)) return true

    // Search in participant names (for direct chats)
    if (chat.participantNames) {
      return Object.values(chat.participantNames).some(name =>
        name.toLowerCase().includes(searchLower)
      )
    }

    // Search in last message
    if (chat.lastMessage?.text?.toLowerCase().includes(searchLower)) return true

    return false
  })

  const handleChatClick = (chat: Chat) => {
    setSelectedChat(chat)
    onChatSelect?.(chat)
  }

  const formatLastMessageTime = (timestamp: Date) => {
    const now = new Date()
    const messageDate = new Date(timestamp)
    const diffMs = now.getTime() - messageDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'now'
    if (diffMinutes < 60) return `${diffMinutes}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`

    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat'
    }

    // For direct chats, get the other participant's name
    const otherParticipant = chat.participants.find(p => p !== user?.uid)
    if (otherParticipant && chat.participantNames) {
      return chat.participantNames[otherParticipant] || 'Unknown User'
    }

    return 'Direct Chat'
  }

  const getChatAvatar = (chat: Chat) => {
    const displayName = getChatDisplayName(chat)
    return displayName.charAt(0).toUpperCase()
  }

  const getPresenceIndicator = (chat: Chat) => {
    if (chat.type === 'group') return null

    const otherParticipant = chat.participants.find(p => p !== user?.uid)
    if (!otherParticipant) return null

    const presence = presenceData.get(otherParticipant)
    if (presence?.status === 'online') {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
      )
    }

    return null
  }

  const getUnreadCount = (chat: Chat) => {
    if (!user?.uid || !chat.unreadCount) return 0
    return chat.unreadCount[user.uid] || 0
  }

  const isPinned = (chat: Chat) => {
    if (!user?.uid || !chat.pinned) return false
    return chat.pinned[user.uid] || false
  }

  if (isChatsLoading) {
    return (
      <div className={`bg-white ${className}`}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm ? 'No chats found' : 'No conversations yet'}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchTerm
                ? 'Try a different search term'
                : 'Start a conversation with your fellow singers'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredChats.map((chat) => {
              const unreadCount = getUnreadCount(chat)
              const isSelected = selectedChat?.id === chat.id
              const displayName = getChatDisplayName(chat)
              const lastMessage = chat.lastMessage

              return (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat)}
                  className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${isSelected ? 'bg-emerald-50 border-r-4 border-emerald-500' : ''
                    }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${chat.type === 'group' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}>
                      {chat.type === 'group' ? (
                        <Users className="w-6 h-6" />
                      ) : (
                        getChatAvatar(chat)
                      )}
                    </div>
                    {getPresenceIndicator(chat)}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-semibold truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                          {displayName}
                        </h3>
                        {isPinned(chat) && (
                          <Pin className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatLastMessageTime(lastMessage.timestamp)}
                          </span>
                        )}
                        {chat.type === 'group' && (
                          <VolumeX className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {lastMessage && lastMessage.senderId === user?.uid && (
                          <CheckCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                          {lastMessage?.text || 'No messages yet'}
                        </p>
                      </div>

                      {unreadCount > 0 && (
                        <div className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* More options */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle more options
                    }}
                    className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6">
        <button className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors">
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}