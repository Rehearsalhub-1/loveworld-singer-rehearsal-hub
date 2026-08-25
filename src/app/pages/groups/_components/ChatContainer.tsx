"use client";

import { useEffect, useRef, useState } from 'react'
import { useChat } from '../_context/ChatContext'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { formatDistanceToNow } from 'date-fns'
import { User, Image as ImageIcon, File, CheckCheck, Check, Heart, Reply, Pencil, Trash2, MoreHorizontal, Search, X, Star } from 'lucide-react'
import { formatTimestamp } from '../_lib/chat-types'
import ChatHeader from './ChatHeader'
import MessageInput from './MessageInput'

interface ChatContainerProps {
  onOpenFriendRequests?: () => void
}

export default function ChatContainer({ onOpenFriendRequests }: ChatContainerProps) {
  const { selectedChat, messages, isMessagesLoading, toggleReaction, setReplyToMessage, setEditingMessage, deleteMessage, searchMessages, toggleStarMessage, isMessageStarred } = useChat()
  const { user, profile } = useAuth()
  const { currentZone } = useZone()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [activeActionMessage, setActiveActionMessage] = useState<string | null>(null)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([]) // Message IDs that match search
  const [isSearching, setIsSearching] = useState(false)
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set())
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Load starred status for all messages
  useEffect(() => {
    const loadStarredStatus = async () => {
      if (!user || messages.length === 0) return
      const starredSet = new Set<string>()
      for (const message of messages) {
        const isStarred = await isMessageStarred(message.id)
        if (isStarred) {
          starredSet.add(message.id)
        }
      }
      setStarredMessages(starredSet)
    }
    loadStarredStatus()
  }, [messages, user, isMessageStarred])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle search - search within loaded messages
  useEffect(() => {
    if (!searchTerm.trim() || !selectedChat) {
      setSearchResults([])
      setCurrentSearchIndex(0)
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    // Search within currently loaded messages
    const searchLower = searchTerm.toLowerCase().trim()
    const matchingMessageIds: string[] = []

    messages.forEach(message => {
      if (message.deleted) return

      const messageText = (message.text || '').toLowerCase()
      const senderName = (message.senderName || '').toLowerCase()

      if (messageText.includes(searchLower) || senderName.includes(searchLower)) {
        matchingMessageIds.push(message.id)
      }
    })

    setSearchResults(matchingMessageIds)
    setCurrentSearchIndex(0)
    setIsSearching(false)

    // Scroll to first result
    if (matchingMessageIds.length > 0 && messageRefs.current[matchingMessageIds[0]]) {
      setTimeout(() => {
        messageRefs.current[matchingMessageIds[0]]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [searchTerm, selectedChat, messages])

  const scrollToNextResult = () => {
    if (searchResults.length === 0) return
    const nextIndex = (currentSearchIndex + 1) % searchResults.length
    setCurrentSearchIndex(nextIndex)
    const messageId = searchResults[nextIndex]
    if (messageRefs.current[messageId]) {
      messageRefs.current[messageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const scrollToPrevResult = () => {
    if (searchResults.length === 0) return
    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length
    setCurrentSearchIndex(prevIndex)
    const messageId = searchResults[prevIndex]
    if (messageRefs.current[messageId]) {
      messageRefs.current[messageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  if (!selectedChat) return null

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <ChatHeader onOpenFriendRequests={onOpenFriendRequests} onOpenSearch={() => setShowSearch(true)} />

      {/* Search Bar - Only visible when showSearch is true */}
      {showSearch && selectedChat && (
        <div className="px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="relative flex items-center gap-2">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages in this conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="flex-1 pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            {searchTerm && (
              <>
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    {searchResults.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <button
                          onClick={scrollToPrevResult}
                          className="px-1.5 py-0.5 hover:bg-gray-200 rounded transition-colors"
                          disabled={isSearching}
                          title="Previous result"
                        >
                          ↑
                        </button>
                        <span className="min-w-[40px] text-center">
                          {currentSearchIndex + 1} / {searchResults.length}
                        </span>
                        <button
                          onClick={scrollToNextResult}
                          className="px-1.5 py-0.5 hover:bg-gray-200 rounded transition-colors"
                          disabled={isSearching}
                          title="Next result"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSearchResults([])
                        setShowSearch(false)
                      }}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                      title="Close search"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </>
            )}
            {!searchTerm && (
              <button
                onClick={() => setShowSearch(false)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Close search"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
          {searchTerm && searchResults.length === 0 && !isSearching && (
            <p className="text-xs text-gray-500 mt-2 ml-3">No messages found matching "{searchTerm}"</p>
          )}
        </div>
      )}

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 relative"
        style={{
          backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
          backgroundRepeat: 'repeat',
          backgroundSize: '400px',
          backgroundPosition: 'center',
          backgroundColor: '#e5ddd5', // WhatsApp default chat background color
        }}
      >
        {/* Semi-transparent overlay to make messages pop out more against the pattern */}
        <div className="absolute inset-0 bg-white/40 pointer-events-none z-[-1]" />
        
        {isMessagesLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Loading...</p>
            </div>
          </div>
        )}

        {!isMessagesLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full border-4 border-gray-100 animate-spin mx-auto mb-4"
                style={{ borderTopColor: currentZone?.themeColor || '#10b981' }}
              />
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${currentZone?.themeColor || '#10b981'}20` }}
              >
                <User
                  className="w-8 h-8"
                  style={{ color: currentZone?.themeColor || '#10b981' }}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-600 text-sm">Start the conversation by sending a message</p>
            </div>
          </div>
        )}

        {!isMessagesLoading && messages.length > 0 && (
          <>
            {messages.filter(m => !m.deleted).map((message, index) => {
              // Use cached profile if user is still loading
              const currentUserId = user?.uid || profile?.id
              const isOwnMessage = message.senderId === currentUserId
              const showAvatar = !isOwnMessage
              const reactions = Array.isArray(message.reactions) ? message.reactions : []
              const hasLiked = reactions.some(reaction => reaction.userId === currentUserId && reaction.emoji === '❤️')
              const likeCount = reactions.filter(reaction => reaction.emoji === '❤️').length

              const isSearchMatch = searchResults.includes(message.id)
              const isCurrentMatch = searchResults[currentSearchIndex] === message.id

              return (
                <div
                  key={message.id}
                  ref={(el) => { messageRefs.current[message.id] = el }}
                  className={`flex flex-col gap-1 w-full ${isSearchMatch ? 'bg-yellow-50' : ''} ${isCurrentMatch ? 'ring-2 ring-yellow-400' : ''}`}
                >
                  <div className={`flex gap-1.5 sm:gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    {showAvatar && (
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0"
                        style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
                      >
                        {message.senderName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}

                    <div className={`flex items-start gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''} w-full`}>
                      <div className={`max-w-[75%] sm:max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isOwnMessage && selectedChat.type === 'group' && (
                          <span className="text-xs text-gray-600 mb-1 px-2">
                            {message.senderName}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-3 sm:px-4 py-2 text-sm sm:text-base ${isOwnMessage ? 'text-white rounded-br-none' : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
                            }`}
                          style={isOwnMessage ? { backgroundColor: currentZone?.themeColor || '#10b981' } : {}}
                        >
                          {/* Reply indicator */}
                          {message.replyTo && (
                            <div
                              className={`text-xs mb-2 p-2 rounded-lg border-l-[4px] overflow-hidden flex flex-col gap-0.5 ${isOwnMessage ? 'bg-black/10 text-white/90 border-l-white/90' : 'bg-gray-100 text-gray-500'}`}
                              style={!isOwnMessage ? { borderLeftColor: currentZone?.themeColor || '#10b981', backgroundColor: 'rgba(0,0,0,0.05)' } : {}}
                            >
                              <div className="font-bold text-[11px] uppercase tracking-wide" style={!isOwnMessage ? { color: currentZone?.themeColor || '#10b981' } : { color: 'white' }}>{message.replySenderName}</div>
                              <div className="truncate opacity-75 leading-tight text-[13px]">{message.replySnippet}</div>
                            </div>
                          )}

                          {message.text && (
                            <p className="whitespace-pre-wrap break-words">
                              {searchTerm && isSearchMatch ? (
                                message.text.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) =>
                                  part.toLowerCase() === searchTerm.toLowerCase() ? (
                                    <mark key={i} className="bg-yellow-300 text-gray-900">{part}</mark>
                                  ) : (
                                    part
                                  )
                                )
                              ) : (
                                message.text
                              )}
                            </p>
                          )}

                          {message.image && (
                            <div className="mt-2 -mx-1">
                              {typeof message.image === 'string' && message.image.startsWith('http') ? (
                                <img
                                  src={message.image}
                                  alt="Shared image"
                                  className="w-full max-w-sm max-h-96 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                  onClick={() => window.open(message.image, '_blank')}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    const parent = target.parentElement
                                    if (parent && message.image) {
                                      parent.innerHTML = `
                                        <a href="${message.image}" target="_blank" rel="noopener noreferrer" 
                                           class="flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm text-blue-600">
                                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                          </svg>
                                          <span>View Image</span>
                                        </a>
                                      `
                                    }
                                  }}
                                  loading="lazy"
                                />
                              ) : (
                                <a
                                  href={message.image}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm text-blue-600"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                  <span>View Image</span>
                                </a>
                              )}
                            </div>
                          )}

                              {message.fileUrl && (
                                <a
                                  href={message.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 mt-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors"
                                >
                                  <File className="w-4 h-4" />
                                  <span className="text-sm">{message.fileName || 'File'}</span>
                                </a>
                              )}
                              <div className={`flex items-center gap-1 mt-1 text-xs ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
                                <span>
                                  {(() => {
                                    try {
                                      const date = formatTimestamp(message.timestamp)
                                      if (isNaN(date.getTime())) {
                                        return 'Just now'
                                      }
                                      return formatDistanceToNow(date, { addSuffix: true })
                                    } catch {
                                      return 'Just now'
                                    }
                                  })()}
                                </span>
                                {isOwnMessage && (
                                  <>
                                    {(message as any).readBy && (message as any).readBy.length > 1 ? (
                                      <CheckCheck className="w-3 h-3" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                  </>
                                )}
                              </div>
                              {message.edited && (
                                <div className={`text-[11px] mt-0.5 ${isOwnMessage ? 'text-white/70' : 'text-gray-400'}`}>
                                  Edited
                                </div>
                              )}
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveActionMessage(prev => prev === message.id ? null : message.id)}
                        className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${isOwnMessage ? 'hover:bg-white/20 text-white/80' : 'hover:bg-gray-200 text-gray-500'
                          }`}
                        aria-label="Message actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {!message.deleted && activeActionMessage === message.id && (
                    <div className={`flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs ${isOwnMessage ? 'justify-end' : 'justify-start'} w-full px-1`}>
                      <button
                        onClick={() => toggleReaction(message.id)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${isOwnMessage
                          ? 'hover:bg-white/20 text-white/90'
                          : 'hover:bg-gray-100 text-gray-600'
                          }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${hasLiked ? (isOwnMessage ? 'text-white' : 'text-red-500') : ''} ${hasLiked ? 'fill-current' : ''}`} />
                        {likeCount > 0 && <span>{likeCount}</span>}
                      </button>
                      <button
                        onClick={() => {
                          setEditingMessage(null)
                          setReplyToMessage(message)
                          setActiveActionMessage(null)
                        }}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${isOwnMessage
                          ? 'hover:bg-white/20 text-white/90'
                          : 'hover:bg-gray-100 text-gray-600'
                          }`}
                      >
                        <Reply className="w-3.5 h-3.5" />
                        Reply
                      </button>
                      <button
                        onClick={async () => {
                          const isStarred = starredMessages.has(message.id)
                          await toggleStarMessage(message.id)
                          const newStarred = new Set(starredMessages)
                          if (isStarred) {
                            newStarred.delete(message.id)
                          } else {
                            newStarred.add(message.id)
                          }
                          setStarredMessages(newStarred)
                          setActiveActionMessage(null)
                        }}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${starredMessages.has(message.id)
                          ? (isOwnMessage ? 'bg-yellow-500/30 text-yellow-200' : 'bg-yellow-100 text-yellow-700')
                          : (isOwnMessage
                            ? 'hover:bg-white/20 text-white/90'
                            : 'hover:bg-gray-100 text-gray-600')
                          }`}
                        title={starredMessages.has(message.id) ? 'Unstar message' : 'Star message'}
                      >
                        <Star className={`w-3.5 h-3.5 ${starredMessages.has(message.id) ? 'fill-current' : ''}`} />
                        {starredMessages.has(message.id) ? 'Starred' : 'Star'}
                      </button>
                      {isOwnMessage && (
                        <button
                          onClick={() => {
                            setMessageToDelete(message.id)
                            setActiveActionMessage(null)
                          }}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${isOwnMessage
                            ? 'hover:bg-red-500/30 text-white/90 hover:text-white'
                            : 'hover:bg-red-50 text-red-600'
                            }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                      {isOwnMessage && (
                        <button
                          onClick={() => {
                            if (message.text) {
                              setReplyToMessage(null)
                              setEditingMessage(message)
                              setActiveActionMessage(null)
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${isOwnMessage
                            ? 'hover:bg-white/20 text-white/90'
                            : 'hover:bg-gray-100 text-gray-600'
                            }`}
                          disabled={!message.text}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput />

      {/* Delete Confirmation Dialog */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Message</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMessageToDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (messageToDelete) {
                    const result = await deleteMessage(messageToDelete)
                    if (result) {
                      setMessageToDelete(null)
                    } else {
                      alert('Failed to delete message. Please try again.')
                    }
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
