"use client";

import { useState, useEffect, useRef, Fragment } from 'react'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { ChatProviderV2, useChatV2 } from './_context/ChatContextV2'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, MessageCircle, Users, Search, Plus, Send,
  Trash2, X, Check, Loader2, ChevronLeft, ChevronRight, Phone, PhoneOff, Mic, MicOff,
  MoreVertical, FileText, Download, Reply, Copy, Smile, LogOut, UserPlus, Image as ImageIcon,
  Maximize2, Paperclip, Settings, UserMinus, PhoneMissed, Edit3, Camera, User, Mail, Info, ChevronDown,
  LayoutGrid, Clock, UserCircle, Bell, Star, Shield, Lock, Video, Ban, AlertTriangle, Film
} from 'lucide-react'
import type { UserProfile } from '@/types/supabase'
import { apiClient } from '@/lib/api-client'
import type { ChatUser, ReactionType, Message } from './_lib/chat-service'
import { togglePinChat as togglePinChatService } from './_lib/chat-service'
import { useCall } from '@/contexts/CallContext'
import { ChatList } from './_components/ChatList'
import { ChatWindow } from './_components/ChatWindow'
import { SyncAvatar } from './_components/SyncAvatar'

// Reaction options
const REACTIONS: ReactionType[] = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯', '✨']

// Main page wrapper with provider
export default function GroupsPage() {
  return (
    <ChatProviderV2>
      <GroupsContent />
    </ChatProviderV2>
  )
}

function GroupsContent() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth()
  const { currentZone } = useZone()

  const {
    chats,
    selectedChat,
    messages,
    currentUser,
    isLoading,
    isMessagesLoading,
    selectChat,
    sendMessage,
    sendMediaMessage,
    sendVoiceMessage,
    startDirectChat,
    createGroupChat,
    searchUsers,
    deleteChat,
    deleteMessage,
    toggleReaction,
    editMessage,
    forwardMessage,
    addGroupMembers,
    removeGroupMember,
    leaveGroup,
    deleteGroup,
    renameGroup,
    updateGroupDescription,
    updateChatAvatar,
    pinMessage,
    setTypingStatus,
    typingUsers,
    isGroupCreator,
    getChatDisplayName,
    getChatAvatar,
    allTypingUsers = {}
  } = useChatV2()

  const [activeView, setActiveView] = useState<'chats'>('chats')
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [showDirectChatSettings, setShowDirectChatSettings] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Separate search state for group settings to avoid conflicts
  const [groupSettingsSearchTerm, setGroupSettingsSearchTerm] = useState('')
  const [isGroupSettingsSearching, setIsGroupSettingsSearching] = useState(false)
  const [groupSettingsSearchResults, setGroupSettingsSearchResults] = useState<ChatUser[]>([])
  const [isRenaming, setIsRenaming] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Group creation state
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<ChatUser[]>([])
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [groupStep, setGroupStep] = useState<1 | 2>(1)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Voice call - use shared context
  const { callState, startCall } = useCall()

  // UI state
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; senderName: string } | null>(null)
  const [showUserProfile, setShowUserProfile] = useState<string | null>(null)
  const [viewingProfileData, setViewingProfileData] = useState<UserProfile | null>(null)
  const [showGroupMemberSearch, setShowGroupMemberSearch] = useState(false)
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [newAboutText, setNewAboutText] = useState('')
  
  // Forwarding state
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [showForwardSelector, setShowForwardSelector] = useState(false)
  const [selectedForwardChats, setSelectedForwardChats] = useState<string[]>([])
  const [forwardSearchTerm, setForwardSearchTerm] = useState('')
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  const [showStarredMessages, setShowStarredMessages] = useState(false)
  const [privacyModal, setPrivacyModal] = useState<{ title: string; desc: string } | null>(null)
  const [mutedChats, setMutedChats] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem('rehearsalhub_muted_chats') || '{}')
    } catch {
      return {}
    }
  })
  
  // Dedicated Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('')
  const [addMemberSearchResults, setAddMemberSearchResults] = useState<ChatUser[]>([])
  const [isAddMemberSearching, setIsAddMemberSearching] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)

  // Handle profile viewing (either via member click or direct chat settings)
  useEffect(() => {
    const currentUserId = user?.id || user?.uid || profile?.id || ''
    const targetUserId = showUserProfile || (showDirectChatSettings ? selectedChat?.participants.find(id => id !== currentUserId) : null)
    
    if (targetUserId) {
      if (viewingProfileData?.id !== targetUserId) {
        setViewingProfileData(null)
      }
      apiClient.get('/profiles/' + targetUserId).then((res: any) => res.data)
        .then(data => {
          if (data) setViewingProfileData(data as UserProfile)
        })
        .catch(err => console.error('Error fetching profile:', err))
    }
  }, [showUserProfile, showDirectChatSettings, selectedChat?.id])

  const handleCopyText = (text?: string, label: string = 'Phone number') => {
    if (!text) {
      alert(`No ${label.toLowerCase()} available to copy`)
      return
    }
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copied to clipboard!`)
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    })
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleForwardSelect = (chatId: string) => {
    setSelectedForwardChats(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    )
  }

  const sendForwardedMessage = async () => {
    if (!forwardingMessage || selectedForwardChats.length === 0) return
    setIsSending(true)
    const targets = [...selectedForwardChats]
    const targetChat = chats.find(c => c.id === targets[0])
    try {
      for (const chatId of targets) {
        await (forwardMessage as any)(chatId, forwardingMessage)
      }
      setForwardingMessage(null)
      setShowForwardSelector(false)
      setSelectedForwardChats([])
      setForwardSearchTerm('')

      if (targets.length === 1 && targetChat) {
        selectChat(targetChat)
        showToast(`Forwarded to ${getChatDisplayName(targetChat)}`, 'success')
      } else {
        showToast(`Message forwarded to ${targets.length} conversations`, 'success')
      }
    } catch (err) {
      console.error('Error forwarding message:', err)
      showToast('Failed to forward message', 'error')
    } finally {
      setIsSending(false)
    }
  }

  // Handle URL parameters for incoming calls
  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const callId = urlParams.get('call')
    const action = urlParams.get('action')

    if (callId) {
      window.dispatchEvent(new CustomEvent('incomingVoiceCall', {
        detail: {
          callId,
          action: action || 'show',
          fromNotification: true,
          timestamp: Date.now()
        }
      }))

      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  // Search users
  useEffect(() => {
    const search = async () => {
      setIsSearching(true)
      const results = await searchUsers(searchTerm.trim())
      setSearchResults(results)
      setIsSearching(false)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm, searchUsers])

  // Search users for group settings
  useEffect(() => {
    const search = async () => {
      setIsGroupSettingsSearching(true)
      const results = await searchUsers(groupSettingsSearchTerm.trim())
      setGroupSettingsSearchResults(results)
      setIsGroupSettingsSearching(false)
    }

    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [groupSettingsSearchTerm, searchUsers])

  // Search users for Add Member Modal
  useEffect(() => {
    if (!showAddMemberModal) {
      setAddMemberSearchTerm('')
      setAddMemberSearchResults([])
      return
    }

    let isMounted = true
    setIsAddMemberSearching(true)
    searchUsers(addMemberSearchTerm.trim())
      .then((res) => {
        if (!isMounted) return
        const existingIds = new Set(selectedChat?.participants || [])
        setAddMemberSearchResults((res || []).filter(u => !existingIds.has(u.id)))
        setIsAddMemberSearching(false)
      })
      .catch(() => {
        if (isMounted) setIsAddMemberSearching(false)
      })

    return () => {
      isMounted = false
    }
  }, [showAddMemberModal, addMemberSearchTerm, searchUsers, selectedChat?.participants])

  const handleAddMemberToCurrentGroup = async (userToAdd: ChatUser) => {
    if (!selectedChat) return
    setIsAddingUser(userToAdd.id)
    try {
      await addGroupMembers([userToAdd])
      setAddMemberSearchResults(prev => prev.filter(u => u.id !== userToAdd.id))
    } catch (err) {
      console.error('Failed to add member to group:', err)
    } finally {
      setIsAddingUser(null)
    }
  }

  // Handle starting a direct chat
  const handleStartChat = async (user: ChatUser) => {
    const chatId = await startDirectChat(user)

    if (chatId) {
      setShowNewChat(false)
      setSearchTerm('')
      setSearchResults([])

      const findAndSelectChat = (attempts = 0) => {
        const chat = chats.find(c => c.id === chatId)

        if (chat) {
          selectChat(chat)
        } else if (attempts < 10) {
          setTimeout(() => findAndSelectChat(attempts + 1), 500)
        } else {
          const tempChat = {
            id: chatId,
            type: 'direct' as const,
            participants: [currentUser?.id || '', user.id],
            participantDetails: {
              [currentUser?.id || '']: { name: currentUser?.name || '' },
              [user.id]: { name: user.name }
            },
            admins: [],
            createdBy: currentUser?.id || '',
            createdAt: new Date(),
            unreadCount: {}
          }
          selectChat(tempChat)
        }
      }

      setTimeout(() => findAndSelectChat(0), 300)
    } else {
      console.error('[Groups] Failed to create/get chat')
      alert('Failed to start chat. Please try again.')
    }
  }

  // Handle creating a group
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return

    setIsCreatingGroup(true)
    const chatId = await createGroupChat(groupName, selectedMembers)
    setIsCreatingGroup(false)

    if (chatId) {
      setShowNewGroup(false)
      setGroupName('')
      setSelectedMembers([])
      setSearchTerm('')
      setSearchResults([])
      setGroupStep(1)
    }
  }

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0 || !selectedChat) return
    setIsCreatingGroup(true)
    try {
      await addGroupMembers(selectedMembers)
      setSelectedMembers([])
      setShowNewChat(false)
      setShowNewGroup(false)
      alert('Members added successfully!')
    } catch (err) {
      console.error('Error adding members:', err)
      alert('Failed to add members')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  // Handle sending message moves to ChatWindow via context/props
  const themeColor = currentZone?.themeColor || '#10b981'
  const primaryColor = themeColor

  // Real data extraction for Media Grid
  const mediaMessages = messages.filter(m => m.type === 'image' || m.imageUrl).slice(-6).reverse()
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [newGroupDesc, setNewGroupDesc] = useState('')

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden fixed inset-0 z-[1000]">
      {/* ── Leftmost Navigation Rail (Desktop) ── */}
      <div className="hidden md:flex w-[60px] flex-col items-center justify-between py-3.5 bg-slate-100/90 border-r border-slate-200/80 flex-shrink-0 z-40">
        <div className="flex flex-col items-center gap-3.5 w-full">
          <button
            onClick={() => { setActiveView('chats'); selectChat(null); }}
            className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-xs ${
              activeView === 'chats'
                ? 'shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
            style={activeView === 'chats' ? { backgroundColor: `${primaryColor}15`, color: primaryColor } : {}}
            title="Chats"
          >
            <MessageCircle className="w-5 h-5" />
            {chats.reduce((acc, c) => acc + (c.unreadCount?.[user?.id || user?.uid || ''] || 0), 0) > 0 && (
              <span 
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] text-white font-black flex items-center justify-center shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {chats.reduce((acc, c) => acc + (c.unreadCount?.[user?.id || user?.uid || ''] || 0), 0)}
              </span>
            )}
          </button>
          
          <button
            onClick={() => { setActiveView('chats'); setShowNewGroup(true); }}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title="Groups"
          >
            <Users className="w-5 h-5" />
          </button>

          <button
            onClick={() => router.push('/home')}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title="Dashboard"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
          <div
            className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
            title="My Account"
          >
            <SyncAvatar
              userId={user?.id || user?.uid}
              fallbackName={user?.displayName || (user as any)?.name || 'Me'}
              bgColor={primaryColor}
              size="w-9 h-9"
              className="rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <ChatList 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          onBack={() => router.push('/home')}
          primaryColor={primaryColor}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          {selectedChat ? (
            <ChatWindow 
              primaryColor={primaryColor}
              onBackToList={() => selectChat(null)}
              onOpenGroupInfo={() => {
                if (selectedChat.type === 'group') {
                  setShowGroupSettings(true)
                  setShowDirectChatSettings(false)
                } else {
                  setShowDirectChatSettings(true)
                  setShowGroupSettings(false)
                }
              }}
              onForward={(msg) => {
                setForwardingMessage(msg)
                setShowForwardSelector(true)
              }}
              onPin={(msgId) => pinMessage(msgId)}
            />
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-slate-50">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-base font-black text-slate-800 mb-1 tracking-tight">Rehearsal Hub</h2>
              <p className="text-slate-400 text-xs font-medium max-w-[260px] text-center leading-relaxed">
                Select a conversation to continue messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Forward Message Sidebar (Right Slide-in + Backdrop) */}
      <AnimatePresence>
        {showForwardSelector && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowForwardSelector(false); setSelectedForwardChats([]); setForwardSearchTerm('') }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[115]"
            />

            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] md:w-[440px] z-[120] bg-white border-l border-slate-200 flex flex-col shadow-2xl"
            >
              {/* Premium Forward Header */}
              <div className="flex-shrink-0 relative overflow-hidden flex flex-col justify-end px-5 py-5 shadow-sm" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -35)} 100%)` }}>
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,_#ffffff_0%,_transparent_60%)]" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { setShowForwardSelector(false); setSelectedForwardChats([]); setForwardSearchTerm('') }} 
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-all active:scale-95 text-white shadow-xs"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-black text-white tracking-tight">Forward message</h2>
                      <p className="text-white/80 text-[11px] font-medium">Select one or more conversations</p>
                    </div>
                  </div>
                  {selectedForwardChats.length > 0 && (
                    <button
                      onClick={() => setSelectedForwardChats([])}
                      className="text-xs font-semibold text-white/80 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Message Preview Box */}
              {forwardingMessage && (
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/70 flex items-start gap-3 flex-shrink-0">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: primaryColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      Forwarding from {forwardingMessage.senderName || 'Sender'}
                    </p>
                    <div className="text-xs text-slate-700 line-clamp-2 font-medium">
                      {forwardingMessage.imageUrl ? (
                        <span className="flex items-center gap-1 text-slate-600 font-semibold">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Photo attachment
                        </span>
                      ) : forwardingMessage.voiceUrl ? (
                        <span className="flex items-center gap-1 text-purple-600 font-semibold">
                          <Mic className="w-3.5 h-3.5" /> Voice message {forwardingMessage.voiceDuration ? `(${Math.round(forwardingMessage.voiceDuration)}s)` : ''}
                        </span>
                      ) : forwardingMessage.attachment ? (
                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                          <FileText className="w-3.5 h-3.5" /> {forwardingMessage.attachment.name || 'Document'}
                        </span>
                      ) : (
                        forwardingMessage.text || 'Message'
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Search Section */}
              <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    type="text" 
                    value={forwardSearchTerm} 
                    onChange={(e) => setForwardSearchTerm(e.target.value)} 
                    placeholder="Search people or groups..." 
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white rounded-xl text-sm text-slate-800 transition-all border border-transparent focus:border-slate-200 focus:outline-none placeholder:text-slate-400 font-medium"
                  />
                  {forwardSearchTerm && (
                    <button
                      onClick={() => setForwardSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Chats Ribbon */}
              <AnimatePresence>
                {selectedForwardChats.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-5 py-2.5 bg-slate-50 flex flex-wrap gap-2 overflow-hidden border-b border-slate-200/60 flex-shrink-0"
                  >
                    {selectedForwardChats.map(chatId => {
                      const chat = chats.find(c => c.id === chatId)
                      if (!chat) return null
                      const otherId = chat.type === 'direct' ? chat.participants.find(id => id !== user?.uid) : undefined
                      return (
                        <motion.div 
                          initial={{ scale: 0.85, opacity: 0 }} 
                          animate={{ scale: 1, opacity: 1 }} 
                          exit={{ scale: 0.85, opacity: 0 }}
                          key={chatId} 
                          className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 shadow-xs group"
                        >
                          <SyncAvatar userId={otherId} isGroup={chat.type === 'group'} size="w-5 h-5" className="rounded-full shadow-xs" bgColor={primaryColor} />
                          <span className="max-w-[110px] truncate font-bold text-slate-800">{getChatDisplayName(chat)}</span> 
                          <button onClick={() => handleForwardSelect(chatId)} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-md transition-colors ml-0.5">
                             <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chats List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {(() => {
                  const filtered = chats.filter(chat => 
                    getChatDisplayName(chat).toLowerCase().includes(forwardSearchTerm.toLowerCase())
                  )

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm font-bold text-slate-700">No conversations found</p>
                        <p className="text-xs text-slate-400">Try searching with a different name</p>
                      </div>
                    )
                  }

                  return filtered.map(chat => {
                    const isSelected = selectedForwardChats.includes(chat.id)
                    const otherUser = chat.type === 'direct' ? chat.participants.find(id => id !== user?.uid) : undefined
                    const displayName = getChatDisplayName(chat)
                    return (
                      <button 
                        key={chat.id} 
                        onClick={() => handleForwardSelect(chat.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                          isSelected 
                            ? 'bg-slate-100 ring-1 ring-slate-300 shadow-xs' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <SyncAvatar 
                            userId={otherUser} 
                            isGroup={chat.type === 'group'} 
                            size="w-11 h-11" 
                            className="rounded-full shadow-xs" 
                            bgColor={primaryColor}
                            fallbackName={displayName}
                          />
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0 }} 
                              animate={{ scale: 1 }}
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xs"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </motion.div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-slate-950 font-black' : 'text-slate-900'}`}>
                            {displayName}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                            {chat.type === 'group' ? (
                              <><Users className="w-3 h-3 text-slate-400" /> Group conversation</>
                            ) : (
                              <><User className="w-3 h-3 text-slate-400" /> Direct contact</>
                            )}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-500 text-white' 
                            : 'border-slate-300 group-hover:border-slate-400'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    )
                  })
                })()}
              </div>

              {/* Forward Action Footer */}
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shadow-lg flex-shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  {selectedForwardChats.length > 0 ? (
                    <span>Selected <strong>{selectedForwardChats.length}</strong> {selectedForwardChats.length === 1 ? 'chat' : 'chats'}</span>
                  ) : (
                    <span className="text-slate-400">Tap a chat to select</span>
                  )}
                </div>
                <button 
                  onClick={sendForwardedMessage}
                  disabled={isSending || selectedForwardChats.length === 0}
                  className="px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <span>Send {selectedForwardChats.length > 0 ? `(${selectedForwardChats.length})` : ''}</span>
                      <Send className="w-3.5 h-3.5 ml-0.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── New Chat Drawer (Left Slide-in) ── */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div 
            onAnimationStart={() => setShowForwardSelector(false)}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed left-0 top-0 bottom-0 w-full md:w-[400px] lg:w-[450px] xl:w-[480px] z-[60] bg-white border-r border-slate-200/80 flex flex-col shadow-2xl font-sans"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200/80 px-4 h-[60px] flex items-center justify-between z-20 shadow-xs">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setShowNewChat(false); setSearchTerm(''); }} 
                  className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-600 active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">New chat</h2>
              </div>
            </div>
            
            {/* Search Input Area */}
            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative bg-slate-100 rounded-xl flex items-center px-3.5 py-2">
                <Search className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Search name, number or @username" 
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                  autoFocus
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-slate-200 rounded-full text-slate-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Action Items + Contact List Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
              {!searchTerm && (
                <div className="divide-y divide-slate-50 border-b border-slate-100">
                  {/* New Group Action */}
                  <button 
                    onClick={() => { 
                      setShowNewChat(false); 
                      setShowNewGroup(true); 
                      setGroupStep(1); 
                      setSelectedMembers([]);
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 text-left transition-colors group"
                  >
                    <div 
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-xs flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">New group</p>
                    </div>
                  </button>

                  {/* New Contact Action */}
                  <button 
                    onClick={() => {
                      const name = prompt('Enter contact name or email:')
                      if (name) setSearchTerm(name)
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 text-left transition-colors group"
                  >
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shadow-xs flex-shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">New contact</p>
                    </div>
                  </button>

                  {/* Message Yourself */}
                  <button 
                    onClick={() => {
                      if (currentUser) handleStartChat(currentUser)
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 text-left transition-colors group"
                  >
                    <SyncAvatar 
                      userId={user?.id || user?.uid}
                      fallbackName={user?.displayName || 'Me'}
                      bgColor={primaryColor}
                      size="w-11 h-11"
                      className="rounded-full shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {user?.displayName || 'Me'} <span className="text-slate-400 font-normal">(You)</span>
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">Message yourself</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Grouped Alphabetical Contacts */}
              {isSearching ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-slate-400" style={{ color: primaryColor }} />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  {searchTerm ? `No contacts found for "${searchTerm}"` : 'No contacts available'}
                </div>
              ) : (
                <div>
                  {(() => {
                    const sorted = [...searchResults].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    const groups: { [key: string]: ChatUser[] } = {}
                    
                    sorted.forEach(u => {
                      const first = (u.name || '#').trim().charAt(0).toUpperCase()
                      const letter = /^[A-Z]$/.test(first) ? first : '#'
                      if (!groups[letter]) groups[letter] = []
                      groups[letter].push(u)
                    })

                    const keys = Object.keys(groups).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b))

                    return keys.map(letter => (
                      <div key={letter} className="mb-2">
                        <div className="px-4 py-2 text-xs font-bold text-slate-400 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                          {letter}
                        </div>
                        <div className="divide-y divide-slate-50">
                          {groups[letter].map(u => (
                            <button 
                              key={u.id} 
                              onClick={() => handleStartChat(u)} 
                              className="w-full flex items-center gap-3.5 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors group"
                            >
                              <SyncAvatar 
                                userId={u.id}
                                initialAvatar={u.avatar}
                                fallbackName={u.name}
                                bgColor={primaryColor}
                                size="w-11 h-11"
                                className="rounded-full shadow-xs flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{u.name}</p>
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                  {u.zoneName || (u as any).designation || (u as any).email || 'Rehearsal Hub Member'}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Group Drawer (Left Slide-in) ── */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed left-0 top-0 bottom-0 w-full md:w-[400px] lg:w-[450px] xl:w-[480px] z-[60] bg-white border-r border-slate-200/80 flex flex-col shadow-2xl font-sans"
          >
            {groupStep === 1 ? (
              <>
                {/* Header Phase 1: Member Selection */}
                <div className="flex-shrink-0 bg-white border-b border-slate-200/80 px-4 h-[60px] flex items-center justify-between z-20 shadow-xs">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowNewGroup(false)} 
                      className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-600 active:scale-95"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">Add group members</h2>
                      <p className="text-xs text-slate-400 font-medium">
                        {selectedMembers.length > 0 ? `${selectedMembers.length} selected` : 'Select contacts to add'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected Members Chips Ribbon */}
                {selectedMembers.length > 0 && (
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200/60 flex flex-wrap gap-2 max-h-[120px] overflow-y-auto no-scrollbar">
                    {selectedMembers.map(m => (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }} 
                        key={m.id} 
                        className="flex items-center gap-1.5 pl-1 pr-2 py-1 text-xs font-semibold rounded-full bg-white border border-slate-200 text-slate-800 shadow-2xs"
                      >
                        <SyncAvatar userId={m.id} initialAvatar={m.avatar} fallbackName={m.name} size="w-5 h-5" className="rounded-full" bgColor={primaryColor} />
                        <span className="max-w-[90px] truncate">{m.name.split(' ')[0]}</span> 
                        <button 
                          onClick={() => setSelectedMembers(prev => prev.filter(p => p.id !== m.id))} 
                          className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-700 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Search Bar */}
                <div className="p-3 border-b border-slate-100 bg-white">
                  <div className="relative bg-slate-100 rounded-xl flex items-center px-3.5 py-2">
                    <Search className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                    <input 
                      type="text" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      placeholder="Search name, number or @username" 
                      className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Multi-Select Contact List */}
                <div className="flex-1 overflow-y-auto no-scrollbar bg-white divide-y divide-slate-50">
                  {searchResults.map(user => {
                    const isSelected = selectedMembers.some(m => m.id === user.id)
                    return (
                      <button 
                        key={user.id} 
                        onClick={() => {
                          setSelectedMembers(prev => 
                            isSelected ? prev.filter(p => p.id !== user.id) : [...prev, user]
                          )
                        }} 
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <SyncAvatar 
                            userId={user.id} 
                            initialAvatar={user.avatar} 
                            fallbackName={user.name} 
                            bgColor={primaryColor} 
                            size="w-11 h-11" 
                            className="rounded-full shadow-xs flex-shrink-0" 
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{user.zoneName || 'Member'}</p>
                          </div>
                        </div>

                        {/* Checkbox indicator */}
                        <div 
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'border-transparent text-white shadow-xs' 
                              : 'border-slate-300 bg-white group-hover:border-slate-400'
                          }`}
                          style={isSelected ? { backgroundColor: primaryColor } : {}}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 font-bold" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Floating Next Button */}
                <AnimatePresence>
                  {selectedMembers.length > 0 && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute bottom-6 right-6 z-30"
                    >
                      <button 
                        onClick={() => setGroupStep(2)} 
                        className="w-13 h-13 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                        title="Next"
                      >
                        <ArrowLeft className="w-6 h-6 rotate-180" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                {/* Header Phase 2: Group Details */}
                <div className="flex-shrink-0 bg-white border-b border-slate-200/80 px-4 h-[60px] flex items-center gap-4 z-20 shadow-xs">
                  <button 
                    onClick={() => setGroupStep(1)} 
                    className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-600 active:scale-95"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">New group</h2>
                </div>

                {/* Body Phase 2: Icon & Name */}
                <div className="flex-1 bg-slate-50 p-6 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center bg-slate-200/80 shadow-xs relative group cursor-pointer overflow-hidden ring-4 ring-white">
                    <Camera className="w-8 h-8 text-slate-400 group-hover:opacity-0 transition-opacity" />
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] uppercase font-bold tracking-wider text-center px-1">
                      <Camera className="w-5 h-5 mb-0.5" />
                      Add Icon
                      <input type="file" className="hidden" accept="image/*" />
                    </label>
                  </div>
                  
                  <div className="w-full bg-white rounded-2xl shadow-xs p-4 border border-slate-200/80">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Group name
                    </label>
                    <input 
                      type="text" 
                      value={groupName} 
                      onChange={(e) => setGroupName(e.target.value)} 
                      placeholder="Type group subject here…" 
                      className="w-full py-2 bg-transparent text-base font-semibold text-slate-900 focus:outline-none" 
                      autoFocus 
                    />
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400">
                      <span>Provide a group subject</span>
                      <span>{groupName.length}/100</span>
                    </div>
                  </div>

                  <div className="w-full mt-6 p-4 bg-white rounded-2xl border border-slate-200/80">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Members ({selectedMembers.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                          <SyncAvatar userId={m.id} fallbackName={m.name} size="w-4 h-4" className="rounded-full" bgColor={primaryColor} />
                          <span>{m.name.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Create Button */}
                <AnimatePresence>
                  {groupName.trim() && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute bottom-6 right-6 z-30"
                    >
                      <button 
                        onClick={handleCreateGroup} 
                        disabled={isCreatingGroup}
                        className="w-13 h-13 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: primaryColor }}
                        title="Create Group"
                      >
                        {isCreatingGroup ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>



      {/* Image Viewer */}
      {viewingImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={() => setViewingImage(null)}>
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setViewingImage(null)} className="p-2 hover:bg-white/10 rounded-full text-white"><X className="w-6 h-6" /></button>
            <button onClick={async (e) => {
              e.stopPropagation()
              try {
                const response = await fetch(viewingImage!)
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `image_${Date.now()}.jpg`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              } catch (err) { window.open(viewingImage!, '_blank') }
            }} className="p-2 hover:bg-white/10 rounded-full text-white"><Download className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={viewingImage} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Right Sidebar (Group Info / Contact Info - Right Slide-in) */}
      <AnimatePresence>
        {(showGroupSettings || showDirectChatSettings) && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[380px] lg:w-[420px] z-[80] bg-slate-100 border-l border-slate-200 flex flex-col shadow-2xl overflow-hidden font-sans"
          >
            {/* Sidebar Header */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200/80 px-4 h-[60px] flex items-center justify-between z-20 shadow-xs">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setShowGroupSettings(false); setShowDirectChatSettings(false); }} 
                  className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-600 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {showGroupSettings ? 'Group info' : 'Contact info'}
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative bg-slate-100 space-y-2.5 pb-10">
                {/* ── 1. Hero Section (Avatar, Name, Subtitle & Action Buttons) ── */}
                <div className="bg-white px-6 py-7 flex flex-col items-center shadow-xs border-b border-slate-200/60">
                   <div className="w-36 h-36 mb-4 relative group/avatar">
                     <SyncAvatar 
                       userId={showDirectChatSettings ? selectedChat?.participants.find(id => id !== (user?.id || user?.uid)) : undefined} 
                       size="w-full h-full" 
                       className="rounded-full overflow-hidden shadow-md ring-4 ring-slate-100"
                       bgColor={primaryColor}
                       initialAvatar={selectedChat ? getChatAvatar(selectedChat) : undefined}
                       fallbackName={selectedChat ? getChatDisplayName(selectedChat) : '?'}
                       isGroup={showGroupSettings}
                     />
                     {showGroupSettings && isGroupCreator() && (
                       <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 cursor-pointer text-white text-[11px] font-bold uppercase tracking-wider text-center backdrop-blur-xs">
                         <Camera className="w-8 h-8 mb-1" />
                         <span>Change</span>
                       </div>
                     )}
                   </div>
                   
                   <div className="text-center w-full max-w-sm">
                     {showGroupSettings && isRenaming ? (
                        <div className="flex flex-col gap-2.5">
                          <input 
                            type="text" 
                            value={newGroupName} 
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="text-xl font-bold text-slate-900 border-b-2 border-current bg-transparent text-center focus:outline-none w-full py-1.5"
                            style={{ color: primaryColor }}
                            autoFocus
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const success = await renameGroup(newGroupName)
                                if (success) setIsRenaming(false)
                              }
                              if (e.key === 'Escape') setIsRenaming(false)
                            }}
                          />
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={async () => { await renameGroup(newGroupName); setIsRenaming(false); }} 
                              className="text-xs font-bold text-white px-4 py-1.5 rounded-full shadow-xs transition-all"
                              style={{ backgroundColor: primaryColor }}
                            >
                              Save
                            </button>
                            <button onClick={() => setIsRenaming(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                              Cancel
                            </button>
                          </div>
                        </div>
                     ) : (
                       <div className="flex flex-col items-center">
                         <div className="flex items-center justify-center gap-2 mb-1 group/name">
                           <h3 className="text-xl font-bold text-slate-900 tracking-tight truncate max-w-[280px]">
                             {selectedChat ? getChatDisplayName(selectedChat) : ''}
                           </h3>
                           {showGroupSettings && isGroupCreator() && (
                             <button 
                               onClick={() => { setIsRenaming(true); setNewGroupName(getChatDisplayName(selectedChat!)) }}
                               className="p-1 opacity-0 group-hover/name:opacity-100 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-700"
                             >
                               <Edit3 className="w-4 h-4" />
                             </button>
                           )}
                         </div>

                         <p className="text-sm text-slate-500 font-medium mb-5">
                           {showGroupSettings ? (
                             <span>Group · <strong style={{ color: primaryColor }}>{selectedChat?.participants.length || 0} members</strong></span>
                           ) : (
                             <span>{viewingProfileData?.phone_number || viewingProfileData?.email || '+234 901 000 0000'}</span>
                           )}
                         </p>

                         {/* Quick Action Buttons Row */}
                         <div className="flex items-center justify-center gap-8 w-full pt-1 border-t border-slate-100">
                           {showGroupSettings ? (
                             <>
                               {(isGroupCreator() || (selectedChat?.admins || []).includes(user?.id || user?.uid || '') || (user as any)?.role === 'hq_admin' || (user as any)?.role === 'admin') && (
                                 <button 
                                   onClick={() => setShowAddMemberModal(true)} 
                                   className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-900 group/act transition-colors cursor-pointer"
                                 >
                                   <div className="w-11 h-11 rounded-full bg-slate-100 group-hover/act:bg-slate-200/80 flex items-center justify-center transition-colors">
                                     <UserPlus className="w-5 h-5 text-slate-700" />
                                   </div>
                                   <span className="text-xs font-semibold">Add</span>
                                 </button>
                               )}

                               <button 
                                 onClick={() => {
                                   setShowGroupSettings(false);
                                   setShowDirectChatSettings(false);
                                 }}
                                 className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-900 group/act transition-colors cursor-pointer"
                               >
                                 <div className="w-11 h-11 rounded-full bg-slate-100 group-hover/act:bg-slate-200/80 flex items-center justify-center transition-colors">
                                   <Search className="w-5 h-5 text-slate-700" />
                                 </div>
                                 <span className="text-xs font-semibold">Search</span>
                               </button>
                             </>
                           ) : (
                             <>
                               <button 
                                 onClick={() => {
                                   if (selectedChat) {
                                     const otherId = selectedChat.participants.find(id => id !== (user?.id || user?.uid))
                                     if (otherId) startCall(selectedChat.id, otherId, user?.displayName || 'User', getChatDisplayName(selectedChat), (user as any)?.photoURL)
                                   }
                                 }}
                                 className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-900 group/act transition-colors"
                               >
                                 <div className="w-11 h-11 rounded-full bg-slate-100 group-hover/act:bg-slate-200/80 flex items-center justify-center transition-colors">
                                   <Phone className="w-5 h-5 text-slate-700" />
                                 </div>
                                 <span className="text-xs font-semibold">Voice</span>
                               </button>

                               <button 
                                 onClick={() => {
                                   if (selectedChat) {
                                     const otherId = selectedChat.participants.find(id => id !== (user?.id || user?.uid))
                                     if (otherId) startCall(selectedChat.id, otherId, user?.displayName || 'User', getChatDisplayName(selectedChat), (user as any)?.photoURL)
                                   }
                                 }}
                                 className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-900 group/act transition-colors"
                               >
                                 <div className="w-11 h-11 rounded-full bg-slate-100 group-hover/act:bg-slate-200/80 flex items-center justify-center transition-colors">
                                   <Video className="w-5 h-5 text-slate-700" />
                                 </div>
                                 <span className="text-xs font-semibold">Video</span>
                               </button>

                               <button 
                                 onClick={() => {
                                   setShowDirectChatSettings(false);
                                 }}
                                 className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-900 group/act transition-colors"
                               >
                                 <div className="w-11 h-11 rounded-full bg-slate-100 group-hover/act:bg-slate-200/80 flex items-center justify-center transition-colors">
                                   <Search className="w-5 h-5 text-slate-700" />
                                 </div>
                                 <span className="text-xs font-semibold">Search</span>
                               </button>
                             </>
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                </div>

                {/* ── 2. Description / About Card ── */}
                <div className="bg-white px-6 py-4 shadow-xs border-y border-slate-200/60 group/desc relative">
                   <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                        {showGroupSettings ? 'Group description' : 'About'}
                      </label>
                      {showGroupSettings && (isGroupCreator() || (selectedChat?.admins || []).includes(user?.id || user?.uid || '') || (user as any)?.role === 'hq_admin' || (user as any)?.role === 'admin') && (
                        <button 
                          onClick={() => { setIsEditingDesc(true); setNewGroupDesc(selectedChat?.description || '') }}
                          className="opacity-0 group-hover/desc:opacity-100 p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-all cursor-pointer"
                        >
                           <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                   </div>
                   
                   {isEditingDesc ? (
                      <div className="space-y-2.5">
                         <textarea 
                           value={newGroupDesc} 
                           onChange={(e) => setNewGroupDesc(e.target.value)}
                           className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none text-sm text-slate-800"
                           autoFocus
                         />
                         <div className="flex gap-2">
                            <button 
                              onClick={async () => {
                                 await updateGroupDescription(newGroupDesc)
                                 setIsEditingDesc(false)
                              }}
                              className="px-4 py-1 text-white rounded-full text-xs font-bold shadow-xs cursor-pointer"
                              style={{ backgroundColor: primaryColor }}
                            >
                              Save
                            </button>
                            <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1 text-slate-400 text-xs font-bold cursor-pointer">
                              Cancel
                            </button>
                         </div>
                      </div>
                   ) : (
                     <p className="text-sm text-slate-700 leading-relaxed font-normal">
                       {showGroupSettings ? (selectedChat?.description || 'No description provided.') : (viewingProfileData?.designation || 'Available in Rehearsal Hub')}
                     </p>
                   )}
                   
                   <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {showGroupSettings 
                          ? `Created by ${selectedChat?.participantDetails?.[selectedChat.createdBy]?.name || 'Admin'}` 
                          : `Joined ${new Date(viewingProfileData?.created_at || Date.now()).toLocaleDateString()}`}
                      </span>
                   </div>
                </div>

                {/* ── 3. Media, links and docs Card ── */}
                <div className="bg-white px-6 py-4 shadow-xs border-y border-slate-200/60">
                   <div className="flex items-center justify-between w-full mb-3 cursor-pointer group">
                     <span className="text-sm font-semibold text-slate-800">Media, links and docs</span>
                     <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-slate-600">
                        <span>{mediaMessages.length}</span>
                        <ChevronRight className="w-4 h-4" />
                     </div>
                   </div>
                   
                   {mediaMessages.length > 0 ? (
                     <div className="grid grid-cols-4 gap-2 w-full">
                        {mediaMessages.slice(0, 4).map((msg) => (
                          <div 
                            key={msg.id} 
                            onClick={() => setViewingImage(msg.imageUrl || null)}
                            className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative shadow-xs hover:opacity-90 transition-all cursor-pointer"
                          >
                             <img src={msg.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                     </div>
                   ) : (
                     <div className="w-full py-4 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="text-xs text-slate-400 italic">No media shared yet</p>
                     </div>
                   )}
                </div>

                {/* ── 4. Settings & Features List Card ── */}
                <div className="bg-white shadow-xs border-y border-slate-200/60 divide-y divide-slate-100">
                   <div 
                     onClick={() => setShowStarredMessages(true)}
                     className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                   >
                      <div className="flex items-center gap-3.5">
                         <Star className="w-5 h-5 text-amber-500" />
                         <div>
                           <span className="text-sm font-medium text-slate-800">Starred messages</span>
                           <p className="text-[11px] text-slate-400">View your starred messages in this conversation</p>
                         </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                   </div>

                   <div 
                     onClick={() => {
                       if (!selectedChat) return
                       setMutedChats(prev => {
                         const next = { ...prev, [selectedChat.id]: !prev[selectedChat.id] }
                         localStorage.setItem('rehearsalhub_muted_chats', JSON.stringify(next))
                         return next
                       })
                     }}
                     className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors select-none"
                   >
                      <div className="flex items-center gap-3.5">
                         <Bell className={`w-5 h-5 ${mutedChats[selectedChat?.id || ''] ? 'text-amber-500' : 'text-slate-500'}`} />
                         <div>
                            <p className="text-sm font-medium text-slate-800">Mute notifications</p>
                            <p className="text-[11px] text-slate-400">
                              {mutedChats[selectedChat?.id || ''] ? 'Notifications are muted' : 'Notifications are active'}
                            </p>
                         </div>
                      </div>
                      <div 
                        className={`w-10 h-6 rounded-full relative p-0.5 transition-colors cursor-pointer ${
                          mutedChats[selectedChat?.id || ''] ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      >
                         <div 
                           className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                             mutedChats[selectedChat?.id || ''] ? 'translate-x-4' : 'translate-x-0'
                           }`} 
                         />
                      </div>
                   </div>

                   <div 
                     onClick={() => setPrivacyModal({
                       title: 'End-to-End Transport Security',
                       desc: 'All messages, media attachments, and real-time voice calls within Rehearsal Hub are secured in transit using TLS 1.3 encryption and restricted strictly to authenticated zone members and administrators.'
                     })}
                     className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                   >
                      <div className="flex items-center gap-3.5">
                         <Lock className="w-5 h-5 text-emerald-600" />
                         <div>
                            <p className="text-sm font-medium text-slate-800">Encryption</p>
                            <p className="text-xs text-slate-400 font-normal">Secured with TLS 1.3 encryption</p>
                         </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                   </div>

                   <div 
                     onClick={() => setPrivacyModal({
                       title: 'Zone Privacy Protection',
                       desc: 'Advanced Zone Isolation is active. Chat conversations and membership rosters are strictly isolated to your assigned Rehearsal Hub zone and authorized leadership.'
                     })}
                     className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                   >
                      <div className="flex items-center gap-3.5">
                         <Shield className="w-5 h-5 text-purple-600" />
                         <div>
                            <p className="text-sm font-medium text-slate-800">Advanced chat privacy</p>
                            <p className="text-xs text-slate-400 font-normal">Zone Isolation Active</p>
                         </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                   </div>
                </div>

                {/* ── 5. Members Section (Group Only) ── */}
                {showGroupSettings && selectedChat?.type === 'group' && (
                  <div className="bg-white px-6 py-5 shadow-xs border-y border-slate-200/60">
                     <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-slate-800">{selectedChat.participants.length} members</h4>
                        <button 
                          onClick={() => setShowGroupMemberSearch(!showGroupMemberSearch)} 
                          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-all cursor-pointer"
                        >
                          <Search className="w-4 h-4"/>
                        </button>
                     </div>
                     
                     {showGroupMemberSearch && (
                       <div className="mb-4 relative bg-slate-100 rounded-xl p-2 flex items-center">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input
                           type="text"
                           value={groupSettingsSearchTerm}
                           onChange={(e) => setGroupSettingsSearchTerm(e.target.value)}
                           placeholder="Search members..."
                           className="w-full pl-8 pr-4 py-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400 text-slate-800"
                           autoFocus
                         />
                         {groupSettingsSearchTerm && (
                           <button onClick={() => setGroupSettingsSearchTerm('')} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                             <X className="w-3.5 h-3.5" />
                           </button>
                         )}
                       </div>
                     )}

                     <div className="divide-y divide-slate-100">
                       {(isGroupCreator() || (selectedChat?.admins || []).includes(user?.id || user?.uid || '') || (user as any)?.role === 'hq_admin' || (user as any)?.role === 'admin') && (
                         <button 
                           onClick={() => setShowAddMemberModal(true)} 
                           className="w-full flex items-center gap-3.5 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                         >
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <UserPlus className="w-5 h-5"/>
                            </div>
                            <span className="text-sm font-bold text-slate-800">Add member</span>
                         </button>
                       )}

                       {selectedChat.participants
                         .filter(pid => {
                           if (!groupSettingsSearchTerm) return true;
                           const isMe = pid === (user?.id || user?.uid);
                           const name = isMe
                             ? (user?.displayName || (user as any)?.name || selectedChat.participantDetails?.[pid]?.name || 'You')
                             : (selectedChat.participantDetails?.[pid]?.name || 'Member');
                           return name.toLowerCase().includes(groupSettingsSearchTerm.toLowerCase());
                         })
                         .map(pid => {
                           const isMe = pid === (user?.id || user?.uid);
                           const memberName = isMe
                             ? (user?.displayName || (user as any)?.name || selectedChat.participantDetails?.[pid]?.name || 'You')
                             : (selectedChat.participantDetails?.[pid]?.name || 'Member');

                           return (
                             <div key={pid} className="flex items-center gap-3.5 py-2.5 group cursor-pointer" onClick={() => setShowUserProfile(pid)}>
                               <div className="relative flex-shrink-0">
                                 <SyncAvatar userId={pid} fallbackName={memberName} size="w-10 h-10" className="rounded-full shadow-xs" bgColor={primaryColor} />
                                 {selectedChat.admins.includes(pid) && (
                                   <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-white">
                                     <Check className="w-2.5 h-2.5 font-bold" />
                                   </div>
                                 )}
                               </div>
                               <div className="flex-1 min-w-0 flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-800 truncate font-semibold">
                                      {memberName}
                                      {isMe && <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-medium">You</span>}
                                    </p>
                                    {selectedChat.admins.includes(pid) && (
                                      <span className="inline-block text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Admin</span>
                                    )}
                                  </div>
                                  {(isGroupCreator() || (selectedChat?.admins || []).includes(user?.id || user?.uid || '') || (user as any)?.role === 'hq_admin' || (user as any)?.role === 'admin') && pid !== (user?.id || user?.uid) && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); removeGroupMember(pid); }} 
                                      className="p-1.5 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer"
                                      title="Remove member"
                                    >
                                      <UserMinus className="w-4 h-4" />
                                    </button>
                                  )}
                               </div>
                             </div>
                           )
                         })}
                     </div>
                  </div>
                )}

                {/* ── 6. Danger Actions Section ── */}
                <div className="bg-white shadow-xs border-y border-slate-200/60 divide-y divide-slate-100">
                   {showGroupSettings ? (
                     <Fragment>
                       <button 
                         onClick={() => { if(confirm('Leave group?')) leaveGroup(); setShowGroupSettings(false); }} 
                         className="w-full px-6 py-4 flex items-center gap-3.5 text-red-500 hover:bg-red-50/50 transition-colors text-left font-semibold text-sm"
                       >
                         <LogOut className="w-5 h-5" />
                         <span>Leave group</span>
                       </button>
                       {isGroupCreator() && (
                         <button 
                           onClick={() => { if(confirm('Delete group?')) deleteGroup(); setShowGroupSettings(false); }} 
                           className="w-full px-6 py-4 flex items-center gap-3.5 text-red-500 hover:bg-red-50/50 transition-colors text-left font-semibold text-sm"
                         >
                           <Trash2 className="w-5 h-5" />
                           <span>Delete group</span>
                         </button>
                       )}
                     </Fragment>
                   ) : (
                     <Fragment>
                       <button 
                         onClick={() => handleCopyText(viewingProfileData?.phone_number)}
                         className="w-full px-6 py-4 flex items-center gap-3.5 text-slate-700 hover:bg-slate-50 transition-colors text-left font-semibold text-sm"
                       >
                         <Copy className="w-5 h-5 text-slate-400" />
                         <span>Copy phone number</span>
                       </button>
                       <button 
                         onClick={() => { if(confirm('Clear chat history?')) alert('Feature coming soon!'); setShowDirectChatSettings(false); }} 
                         className="w-full px-6 py-4 flex items-center gap-3.5 text-red-500 hover:bg-red-50/50 transition-colors text-left font-semibold text-sm"
                       >
                         <Trash2 className="w-5 h-5" />
                         <span>Clear chat</span>
                       </button>
                    </Fragment>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Contact Profile Sidebar (Right Slide-in) */}
      <AnimatePresence>
        {showUserProfile && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[380px] lg:w-[420px] z-[90] bg-slate-100 border-l border-slate-200 flex flex-col shadow-2xl overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200/80 px-4 h-[60px] flex items-center justify-between z-20 shadow-xs">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowUserProfile(null)} 
                  className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-600 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Contact info
                </h2>
              </div>
              <button 
                onClick={() => {
                  if (viewingProfileData?.phone_number) handleCopyText(viewingProfileData.phone_number, 'Phone')
                }}
                className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-600 transition-all"
                title="Options"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative bg-slate-100 space-y-2.5 pb-10">
              {!viewingProfileData ? (
                <div className="flex items-center justify-center p-20">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
                </div>
              ) : (
                <Fragment>
                  {/* ── 1. Hero Section ── */}
                  <div className="bg-white px-6 py-7 flex flex-col items-center shadow-xs border-b border-slate-200/60">
                    <div className="w-36 h-36 mb-4 rounded-full overflow-hidden shadow-md ring-4 ring-slate-100 flex items-center justify-center bg-slate-100">
                      {viewingProfileData.profile_image_url ? (
                        <img src={viewingProfileData.profile_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold" style={{ backgroundColor: primaryColor }}>
                          {viewingProfileData.first_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center w-full max-w-sm">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-1 truncate">
                        {viewingProfileData.first_name} {viewingProfileData.last_name}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mb-5">
                        {viewingProfileData.phone_number || viewingProfileData.email || '+234 901 000 0000'}
                      </p>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center justify-center gap-8 w-full pt-1 border-t border-slate-100">
                        <button 
                          onClick={() => {
                            if (showUserProfile) startCall(selectedChat?.id || showUserProfile, showUserProfile, user?.displayName || 'User', `${viewingProfileData.first_name} ${viewingProfileData.last_name}`, (user as any)?.photoURL)
                          }}
                          className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-900 group/act transition-colors"
                        >
                          <div className="w-11 h-11 rounded-full bg-slate-100 group-hover/act:bg-slate-200/80 flex items-center justify-center transition-colors">
                            <Phone className="w-5 h-5 text-slate-700" />
                          </div>
                          <span className="text-xs font-semibold">Voice</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (showUserProfile) startCall(selectedChat?.id || showUserProfile, showUserProfile, user?.displayName || 'User', `${viewingProfileData.first_name} ${viewingProfileData.last_name}`, (user as any)?.photoURL)
                          }}
                          className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-900 group/act transition-colors"
                        >
                          <div className="w-11 h-11 rounded-full bg-slate-100 group-hover/act:bg-slate-200/80 flex items-center justify-center transition-colors">
                            <Video className="w-5 h-5 text-slate-700" />
                          </div>
                          <span className="text-xs font-semibold">Video</span>
                        </button>

                        <button 
                          onClick={() => setShowUserProfile(null)}
                          className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-slate-900 group/act transition-colors"
                        >
                          <div className="w-11 h-11 rounded-full bg-slate-100 group-hover/act:bg-slate-200/80 flex items-center justify-center transition-colors">
                            <Search className="w-5 h-5 text-slate-700" />
                          </div>
                          <span className="text-xs font-semibold">Search</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── 2. About / Notes Card ── */}
                  <div className="bg-white px-6 py-4 shadow-xs border-y border-slate-200/60">
                    <label className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      About
                    </label>
                    <p className="text-sm text-slate-700 leading-relaxed font-normal">
                      {viewingProfileData.designation || 'Available in Rehearsal Hub'}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Joined {new Date(viewingProfileData?.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* ── 3. Media, links and docs Card ── */}
                  <div className="bg-white px-6 py-4 shadow-xs border-y border-slate-200/60">
                    <div className="flex items-center justify-between w-full mb-3 cursor-pointer group">
                      <span className="text-sm font-semibold text-slate-800">Media, links and docs</span>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-slate-600">
                        <span>{mediaMessages.length}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                    
                    {mediaMessages.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 w-full">
                        {mediaMessages.slice(0, 4).map((msg) => (
                          <div 
                            key={msg.id} 
                            onClick={() => setViewingImage(msg.imageUrl || null)}
                            className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative shadow-xs hover:opacity-90 transition-all cursor-pointer"
                          >
                            <img src={msg.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full py-4 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="text-xs text-slate-400 italic">No media shared yet</p>
                      </div>
                    )}
                  </div>

                  {/* ── 4. Actions ── */}
                  <div className="bg-white shadow-xs border-y border-slate-200/60 divide-y divide-slate-100">
                    <button 
                      onClick={() => { if(confirm(`Block ${viewingProfileData.first_name}?`)) alert('User blocked'); setShowUserProfile(null); }} 
                      className="w-full px-6 py-4 flex items-center gap-3.5 text-red-500 hover:bg-red-50/50 transition-colors text-left font-semibold text-sm cursor-pointer"
                    >
                      <Ban className="w-5 h-5" />
                      <span>Block {viewingProfileData.first_name}</span>
                    </button>
                    <button 
                      onClick={() => { if(confirm('Delete contact?')) alert('Contact deleted'); setShowUserProfile(null); }} 
                      className="w-full px-6 py-4 flex items-center gap-3.5 text-red-500 hover:bg-red-50/50 transition-colors text-left font-semibold text-sm cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Delete contact</span>
                    </button>
                  </div>
                </Fragment>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dedicated Add Members to Group Modal ── */}
      <AnimatePresence>
        {showAddMemberModal && selectedChat && selectedChat.type === 'group' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowAddMemberModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add members</h3>
                  <p className="text-xs text-slate-500 font-medium">Add people to <strong className="text-slate-700">{getChatDisplayName(selectedChat)}</strong></p>
                </div>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={addMemberSearchTerm}
                    onChange={(e) => setAddMemberSearchTerm(e.target.value)}
                    placeholder="Search by name, @username, or email..."
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-xs"
                    autoFocus
                  />
                  {addMemberSearchTerm && (
                    <button
                      onClick={() => setAddMemberSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* User Results List */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 divide-y divide-slate-100">
                {isAddMemberSearching ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: primaryColor }} />
                    <span className="text-xs font-medium">Finding members…</span>
                  </div>
                ) : addMemberSearchResults.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm font-medium">
                    {addMemberSearchTerm ? `No members found matching "${addMemberSearchTerm}"` : 'All available members in your zone are already in this group.'}
                  </div>
                ) : (
                  addMemberSearchResults.map((u) => {
                    const isAdding = isAddingUser === u.id
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 py-3 px-3 rounded-2xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <SyncAvatar
                            userId={u.id}
                            initialAvatar={u.avatar}
                            fallbackName={u.name}
                            bgColor={primaryColor}
                            size="w-10 h-10"
                            className="rounded-full shadow-xs flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate leading-snug">{u.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {(u as any).username ? `@${(u as any).username} · ` : ''}{u.zoneName || (u as any).designation || (u as any).email || 'Member'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddMemberToCurrentGroup(u)}
                          disabled={isAdding}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white shadow-xs hover:shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex-shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {isAdding ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          <span>{isAdding ? 'Adding…' : 'Add'}</span>
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Privacy Info Dialog ── */}
      <AnimatePresence>
        {privacyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPrivacyModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-sm overflow-hidden p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{privacyModal.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">{privacyModal.desc}</p>
              <button
                onClick={() => setPrivacyModal(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                Understood
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Starred Messages Modal ── */}
      <AnimatePresence>
        {showStarredMessages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowStarredMessages(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-base font-bold text-slate-900">Starred Messages</h3>
                </div>
                <button
                  onClick={() => setShowStarredMessages(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-4 divide-y divide-slate-100">
                {(() => {
                  const starred = messages.filter(m => m.isStarred);
                  if (starred.length === 0) {
                    return (
                      <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                        <Star className="w-8 h-8 mb-2 text-slate-300" />
                        <p className="text-sm font-bold text-slate-700">No Starred Messages</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                          Hover or hold any message and tap the Star option to bookmark important notes and files.
                        </p>
                      </div>
                    );
                  }

                  return starred.map((msg) => (
                    <div key={msg.id} className="py-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{msg.senderName}</span>
                        <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-slate-700">{msg.text || (msg.imageUrl ? 'Photo attachment' : 'File attachment')}</p>
                    </div>
                  ));
                })()}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowStarredMessages(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] max-w-md px-4 py-2.5 rounded-2xl bg-slate-900/90 text-white shadow-2xl backdrop-blur-md flex items-center gap-3 border border-white/10"
          >
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/60 hover:text-white ml-2 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// HELPERS
function adjustColor(color: string, amount: number): string {
  if (!color) return '#10b981'
  if (color.length < 7) return color 
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
