"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send,
  Check,
  CheckCheck,
  Clock,
  Image,
  Paperclip,
  Smile,
  MoreVertical,
  Reply,
  Heart,
  ArrowLeft,
  Phone,
  Video
} from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
import { useChat } from '../_context/ChatContext'
import { WhatsAppOptimisticUI, OptimisticMessage } from '../_lib/whatsapp-optimistic-ui'
import { WhatsAppMessageStatus, MessageStatus } from '../_lib/whatsapp-message-status'
import { WhatsAppPresence, PresenceData } from '../_lib/whatsapp-presence'
import { ChatMessage, ChatUser } from '../_lib/chat-types'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'

interface WhatsAppChatInterfaceProps {
  onBack?: () => void
  className?: string
}

export function WhatsAppChatInterface({ onBack, className = '' }: WhatsAppChatInterfaceProps) {
  const { user } = useAuth()
  const { currentZone } = useZone()
  const themeColor = currentZone?.themeColor || '#10b981'
  const {
    selectedChat,
    messages: realMessages,
    sendMessage,
    toggleReaction,
    setReplyToMessage,
    replyToMessage,
    isMessagesLoading
  } = useChat()

  const { startCall, callState } = useCall()

  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [presenceData, setPresenceData] = useState<Map<string, PresenceData>>(new Map())
  const [displayMessages, setDisplayMessages] = useState<(ChatMessage | OptimisticMessage)[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get other participant for direct chats
  const otherParticipant = selectedChat?.type === 'direct'
    ? selectedChat.participants.find(p => p !== user?.uid)
    : null

  const otherParticipantName = otherParticipant && selectedChat?.participantNames
    ? selectedChat.participantNames[otherParticipant]
    : selectedChat?.name || 'Chat'

  // Merge real and optimistic messages
  useEffect(() => {
    if (!selectedChat) {
      setDisplayMessages([])
      return
    }

    const merged = WhatsAppOptimisticUI.mergeMessagesForUI(realMessages, selectedChat.id)
    setDisplayMessages(merged)
  }, [realMessages, selectedChat])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages])

  // Subscribe to presence for chat participants
  useEffect(() => {
    if (!selectedChat) return

    const unsubscribe = WhatsAppPresence.subscribeToPresence(
      selectedChat.participants,
      setPresenceData
    )

    return unsubscribe
  }, [selectedChat])

  // Mark messages as read when chat opens
  useEffect(() => {
    if (!selectedChat || !user) return

    WhatsAppMessageStatus.markChatAsRead(selectedChat.id, (user.uid || user.id || ""))
  }, [selectedChat, user])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    setIsTyping(true)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }, [])

  // Send message with optimistic UI
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedChat || !user) return

    const messageText = newMessage.trim()
    setNewMessage('')

    // Create optimistic message (shows immediately)
    const optimisticMessage = WhatsAppOptimisticUI.createOptimisticMessage(
      selectedChat.id,
      (user.uid || user.id || ""),
      user.displayName || user.email || 'You',
      { text: messageText }
    )

    setDisplayMessages(prev => [...prev, optimisticMessage])

    try {
      // Send to server
      const success = await sendMessage({
        text: messageText
      })

      if (success) {
        // Mark as sent (will be handled by real message from server)
      } else {
        // Mark as failed
        WhatsAppOptimisticUI.markOptimisticMessageFailed(optimisticMessage.id, 'Failed to send')
      }
    } catch (error) {
 console.error('Send message error:', error)
      WhatsAppOptimisticUI.markOptimisticMessageFailed(optimisticMessage.id, 'Network error')
    }

    setReplyToMessage(null)
  }, [newMessage, selectedChat, user, sendMessage, replyToMessage, setReplyToMessage])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const getStatusIcon = (status: MessageStatus, isOwn: boolean) => {
    if (!isOwn) return null

    switch (status) {
      case 'sending':
        return <Clock className="w-4 h-4 text-gray-400" />
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />
      case 'failed':
        return <span className="text-red-500 text-xs">!</span>
      default:
        return <Check className="w-4 h-4 text-gray-400" />
    }
  }

  const getPresenceStatus = () => {
    if (!otherParticipant) return null

    const presence = presenceData.get(otherParticipant)
    if (!presence) return 'last seen recently'

    if (presence.status === 'online') {
      return 'online'
    } else {
      const lastSeen = new Date(presence.lastSeen)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))

      if (diffMinutes < 1) return 'last seen just now'
      if (diffMinutes < 60) return `last seen ${diffMinutes}m ago`
      if (diffMinutes < 1440) return `last seen ${Math.floor(diffMinutes / 60)}h ago`
      return `last seen ${Math.floor(diffMinutes / 1440)}d ago`
    }
  }

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Send className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Welcome to LWSRH Chat
          </h3>
          <p className="text-gray-500">
            Connect with fellow LoveWorld Singers and rehearsal coordinators
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="text-white p-4 shadow-md" style={{ backgroundColor: themeColor }}>
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg transition-colors md:hidden"
              style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {otherParticipantName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{otherParticipantName}</h2>
            <p className="text-xs text-emerald-100 truncate">
              {getPresenceStatus()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                if (selectedChat && user) {
                  startCall(
                    selectedChat.id,
                    otherParticipant || '',
                    user.displayName || 'User',
                    otherParticipantName,
                    user.photoURL || undefined,
                    undefined // avatar handled by CallOverlay if missing
                  )
                }
              }}
              disabled={callState !== 'idle'}
              className="p-2 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-emerald-700 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isMessagesLoading && displayMessages.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          displayMessages.map((message) => {
            const isOwn = message.senderId === user?.uid
            const isOptimistic = 'isOptimistic' in message && message.isOptimistic

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm relative group ${isOwn
                    ? 'text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none'
                    } ${isOptimistic ? 'opacity-75' : ''}`}
                  style={isOwn ? { backgroundColor: themeColor } : {}}
                >
                  {/* Reply indicator */}
                  {message.replyTo && (
                    <div
                      className={`text-xs mb-2 p-2 rounded-lg border-l-[4px] overflow-hidden flex flex-col gap-0.5 ${isOwn ? 'bg-black/10 text-white/90 border-l-white/90' : 'bg-gray-100 text-gray-500'}`}
                      style={!isOwn ? { borderLeftColor: themeColor, backgroundColor: 'rgba(0,0,0,0.05)' } : {}}
                    >
                      <div className="font-bold text-[11px] uppercase tracking-wide" style={!isOwn ? { color: themeColor } : { color: 'white' }}>{message.replySenderName}</div>
                      <div className="truncate opacity-75 text-[13px] leading-tight">{message.replySnippet}</div>
                    </div>
                  )}

                  {/* Message content */}
                  <p className="text-sm break-words">{message.text}</p>

                  {/* Message footer */}
                  <div className="flex items-center justify-end space-x-1 mt-1">
                    <span className={`text-xs ${isOwn ? 'text-emerald-100' : 'text-gray-500'
                      }`}>
                      {formatTime(message.timestamp)}
                    </span>
                    {getStatusIcon(('status' in message ? message.status : 'sent') || 'sent', isOwn)}
                  </div>

                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.reactions.map((reaction, index) => (
                        <span
                          key={index}
                          className="text-xs bg-white bg-opacity-20 rounded-full px-2 py-1"
                        >
                          {reaction.emoji}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick actions (on hover) */}
                  <div className="absolute -top-8 right-0 hidden group-hover:flex bg-white rounded-lg shadow-lg border p-1 space-x-1">
                    <button
                      onClick={() => toggleReaction(message.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Heart className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setReplyToMessage(message as ChatMessage)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Reply className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyToMessage && (
        <div className="bg-gray-100 border-t border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-emerald-600">
                Replying to {replyToMessage.senderName}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {replyToMessage.text || 'Message'}
              </div>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <Paperclip className="w-6 h-6" />
          </button>

          <button
            type="button"
            className="p-2 text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <Image className="w-6 h-6" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <Smile className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2 text-white rounded-full transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            style={newMessage.trim() ? { backgroundColor: themeColor } : {}}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
