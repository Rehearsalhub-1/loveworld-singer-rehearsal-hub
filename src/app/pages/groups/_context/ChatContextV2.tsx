"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { subscribe as subscribeToWebSocket } from '@/hooks/useWebSocket'
import { uploadToCloudinary } from '@/lib/cloudinary-storage'
import { apiClient } from '@/lib/api-client'
import {
  Chat,
  Message,
  ChatUser,
  ReactionType,
  MessageAttachment,
  subscribeToChats,
  subscribeToMessages,
  sendMessage as sendChatMessage,
  getOrCreateDirectChat,
  createGroupChat as createGroup,
  searchZoneUsers,
  deleteChat as deleteChatService,
  deleteMessage as deleteMessageService,
  toggleReaction as toggleReactionService,
  addGroupMembers as addGroupMembersService,
  removeGroupMember as removeGroupMemberService,
  leaveGroup as leaveGroupService,
  deleteGroup as deleteGroupService,
  markChatAsRead,
  renameGroup as renameGroupService,
  updateGroupDescription as updateGroupDescriptionService,
  updateChatAvatar as updateChatAvatarService,
  toggleGroupAdmin as toggleGroupAdminService,
  togglePinChat as togglePinChatService,
  clearChat as clearChatService,
  editMessage as editMessageService,
  forwardMessage as forwardMessageService,
  pinMessage as pinMessageService,
  setTypingStatus as setTypingStatusService,
  subscribeToTyping
} from '../_lib/chat-service'

interface ChatContextType {
  // State
  chats: Chat[]
  selectedChat: Chat | null
  messages: Message[]
  currentUser: ChatUser | null

  // Loading
  isLoading: boolean
  isMessagesLoading: boolean

  // Actions
  selectChat: (chat: Chat | null) => void
  sendMessage: (text: string, replyTo?: { id: string; text: string; senderName: string }, media?: { type: 'image' | 'document'; url: string; name?: string; size?: number; mimeType?: string }) => Promise<boolean>
  sendMediaMessage: (file: File, caption?: string) => Promise<boolean>
  sendVoiceMessage: (file: File, duration: number) => Promise<boolean>
  startDirectChat: (user: ChatUser) => Promise<string | null>
  createGroupChat: (name: string, members: ChatUser[]) => Promise<string | null>
  searchUsers: (term: string) => Promise<ChatUser[]>
  deleteChat: (chatId: string) => Promise<boolean>
  deleteMessage: (messageId: string, forEveryone?: boolean) => Promise<boolean>
  toggleReaction: (messageId: string, reaction: ReactionType) => Promise<boolean>
  // Group management
  addGroupMembers: (members: ChatUser[]) => Promise<boolean>
  removeGroupMember: (memberId: string) => Promise<boolean>
  leaveGroup: () => Promise<boolean>
  deleteGroup: () => Promise<boolean>
  renameGroup: (newName: string) => Promise<boolean>
  updateGroupDescription: (description: string) => Promise<boolean>
  updateChatAvatar: (avatarUrl: string) => Promise<boolean>
  toggleGroupAdmin: (targetUserId: string, status: boolean) => Promise<boolean>
  togglePinChat: (pinned: boolean) => Promise<boolean>
  clearChat: () => Promise<boolean>
  editMessage: (messageId: string, newText: string) => Promise<boolean>
  forwardMessage: (targetChatId: string, originalMessage: Message) => Promise<boolean>
  pinMessage: (messageId: string | null) => Promise<boolean>
  setTypingStatus: (status: 'typing' | 'recording_voice' | null) => Promise<void>
  isGroupCreator: () => boolean
  isGroupAdmin: (userId?: string) => boolean
  getChatDisplayName: (chat: Chat) => string
  getChatAvatar: (chat: Chat) => string | undefined
  typingUsers: { userName: string, status: string }[]
  allTypingUsers: { [chatId: string]: { userName: string, status: string }[] }
  userPresence: { [userId: string]: { status: 'online' | 'offline'; lastSeen: any } }
  
  // Statuses
  statuses: StatusUpdate[]
  uploadStatus: (file: File, caption?: string, trimOptions?: { startTime: number; endTime: number }) => Promise<boolean>
  viewStatus: (statusId: string) => Promise<void>
  deleteStatus: (statusId: string) => Promise<boolean>
  toggleStatusLike: (statusId: string) => Promise<boolean>
}

export interface StatusUpdate {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  mediaUrl: string
  type: 'image' | 'video' | 'audio'
  timestamp: any
  caption?: string
  viewers: string[]
  likes?: string[]
  zoneId?: string
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProviderV2({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const { currentZone } = useZone()

  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<{ userName: string, status: string }[]>([])
  const [allTypingUsers, setAllTypingUsers] = useState<{ [chatId: string]: { userName: string, status: string }[] }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [userPresence, setUserPresence] = useState<{ [userId: string]: { status: 'online' | 'offline'; lastSeen: any } }>({})
  const [statuses, setStatuses] = useState<StatusUpdate[]>([])

  const currentUserId = (user?.id || user?.uid || profile?.id || profile?.uid || '') as string

  // Build current user object
  const currentUser: ChatUser | null = (user || profile) && currentUserId ? {
    id: currentUserId,
    name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'User' : user?.email || 'User',
    avatar: profile?.profile_image_url || profile?.avatar_url || (profile as any)?.photoURL || (user as any)?.photoURL,
    zoneId: currentZone?.id,
    zoneName: currentZone?.name
  } : null

  // Subscribe to chats
  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false)
      setChats([])
      return
    }

    setIsLoading(true)

    const unsubscribe = subscribeToChats(currentUserId, (newChats) => {
      setChats(newChats)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [currentUserId])

  // Keep selectedChat in sync with chats array (for real-time updates)
  useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find(c => c.id === selectedChat.id)
      if (updatedChat) {
        // Only update if there are actual changes to avoid infinite loops
        if (JSON.stringify(updatedChat) !== JSON.stringify(selectedChat)) {
          setSelectedChat(updatedChat)
        }
      } else {
        // Chat was deleted, deselect it
        setSelectedChat(null)
      }
    }
  }, [chats, selectedChat])

  // Subscribe to messages when chat is selected
  useEffect(() => {
    if (!selectedChat?.id) {
      setMessages([])
      return
    }

    setIsMessagesLoading(true)

    // Mark as read when opening
    if (currentUserId && selectedChat) {
      markChatAsRead(selectedChat.id, currentUserId)
    }

    const unsubscribe = subscribeToMessages(selectedChat.id, (newMessages) => {
      // Safely resolve clearedAt — works with Firestore Timestamp, ISO strings, or numbers
      const rawClear = currentUserId ? selectedChat.clearedAt?.[currentUserId] : undefined
      let clearTime = 0
      if (rawClear) {
        if (typeof rawClear === 'object' && typeof (rawClear as any).toMillis === 'function') {
          clearTime = (rawClear as any).toMillis()
        } else if (typeof rawClear === 'string') {
          clearTime = new Date(rawClear).getTime() || 0
        } else if (typeof rawClear === 'number') {
          clearTime = rawClear
        }
      }

      const visibleMessages = newMessages.filter(m => {
        if (m.deleted) return false
        if (clearTime === 0) return true
        // Safely convert timestamp to ms — handles Date, ISO string, number
        let msgTime: number
        if (m.timestamp instanceof Date) {
          msgTime = m.timestamp.getTime()
        } else if (typeof m.timestamp === 'string') {
          msgTime = new Date(m.timestamp).getTime() || 0
        } else if (typeof m.timestamp === 'number') {
          msgTime = m.timestamp
        } else {
          msgTime = 0
        }
        return msgTime > clearTime
      })

      // Inject pinning info
      const enriched = visibleMessages.map(m => ({
        ...m,
        pinnedInChat: selectedChat.pinnedMessageId === m.id
      }))
      setMessages(enriched)
      setIsMessagesLoading(false)

      // Instantly mark as read when new messages arrive while chat is open
      if (currentUserId && selectedChat.id) {
        markChatAsRead(selectedChat.id, currentUserId)
      }
    })

    const unsubscribeTyping = subscribeToTyping(selectedChat.id, currentUserId, (users) => {
      setTypingUsers(users)
    })

    return () => {
      unsubscribe()
      unsubscribeTyping()
    }
  }, [selectedChat?.id, currentUserId, selectedChat?.pinnedMessageId])

  // Subscribe to presence of other user in direct chat
  useEffect(() => {
    if (!selectedChat || selectedChat.type !== 'direct' || !currentUserId) return

    const otherId = selectedChat.participants.find(id => id !== currentUserId)
    if (!otherId) return

    const unsubscribe = subscribeToWebSocket('presence', otherId, (data) => {
      const presence = data as { isOnline?: boolean; lastSeen?: number };
      setUserPresence(prev => ({
        ...prev,
        [otherId]: {
          status: presence.isOnline ? 'online' : 'offline',
          lastSeen: presence.lastSeen || Date.now(),
        }
      }))
    })

    return () => unsubscribe()
  }, [selectedChat?.id, currentUserId])

  // Global typing subscription for sidebar
  useEffect(() => {
    if (!currentUserId || chats.length === 0) return

    const unsubscribes = chats.map(chat => {
      return subscribeToTyping(chat.id, currentUserId, (users: any) => {
        setAllTypingUsers(prev => ({
          ...prev,
          [chat.id]: users
        }))
      })
    })

    return () => unsubscribes.forEach(unsub => unsub())
  }, [currentUserId, chats.length]) // Only rebinding if user or chat count changes

  useEffect(() => {
    setStatuses([])
  }, [user?.uid])

  // Actions
  const selectChat = useCallback((chat: Chat | null) => {
    setSelectedChat(chat)
    if (!chat) {
      setMessages([])
    }
  }, [])

  const sendMessage = useCallback(async (
    text: string,
    replyTo?: { id: string; text: string; senderName: string },
    media?: { type: 'image' | 'document'; url: string; name?: string; size?: number; mimeType?: string }
  ) => {
    if (!selectedChat || !currentUser) return false
    
    // Optimistically update chat in chats list so it jumps to top immediately!
    const now = new Date()
    const optimisticLastMsg = {
      text: text || (media?.type === 'image' ? 'Photo' : media?.type === 'document' ? 'Document' : ''),
      senderId: currentUser.id,
      timestamp: now,
      status: 'sent' as const
    }
    
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === selectedChat.id)
      if (idx === -1) return prev
      const updatedChat = {
        ...prev[idx],
        lastMessage: optimisticLastMsg,
        lastTimestamp: now
      }
      const rest = prev.filter(c => c.id !== selectedChat.id)
      return [updatedChat, ...rest]
    })

    // Also update selectedChat
    setSelectedChat(prev => prev ? ({
      ...prev,
      lastMessage: optimisticLastMsg,
      lastTimestamp: now
    }) : null)

    return sendChatMessage(selectedChat.id, currentUser, text, replyTo, media)
  }, [selectedChat, currentUser])

  // Upload file to Cloudinary and send as message
  const sendMediaMessage = useCallback(async (file: File, caption?: string) => {
    if (!selectedChat || !currentUser) return false

    try {
      const isImage = file.type.startsWith('image/')
      const mediaType = isImage ? 'image' : 'document'

      // Upload to Cloudflare R2 via backend API
      const finalUrl = await uploadToCloudinary(file, undefined, 'chat')

      // Send message with media and optional caption
      return sendChatMessage(
        selectedChat.id,
        currentUser,
        caption || '', // Use caption as the message text
        undefined,
        {
          type: mediaType,
          url: finalUrl,
          name: file.name,
          size: file.size,
          mimeType: file.type
        }
      )
    } catch (error) {
      console.error('[ChatContext] sendMediaMessage error:', error)
      return false
    }
  }, [selectedChat, currentUser])

  // Upload voice note to Cloudflare R2 and send as message
  const sendVoiceMessage = useCallback(async (file: File, duration: number) => {
    if (!selectedChat || !currentUser) return false

    try {
      // Upload to Cloudflare R2 via backend API
      const voiceUrl = await uploadToCloudinary(file, undefined, 'voice_notes')

      return sendChatMessage(
        selectedChat.id,
        currentUser,
        '',
        undefined,
        {
          type: 'voice',
          url: voiceUrl,
          duration: duration // Our app-side measured duration
        } as any
      )
    } catch (error) {
      console.error('[ChatContext] sendVoiceMessage error:', error)
      return false
    }
  }, [selectedChat, currentUser])

  const startDirectChat = useCallback(async (otherUser: ChatUser) => {
    if (!currentUser) {
      console.error('[ChatContext] No current user - cannot start chat')
      return null
    }
    const result = await getOrCreateDirectChat(currentUser, otherUser)
    return result
  }, [currentUser])

  const createGroupChat = useCallback(async (name: string, members: ChatUser[]) => {
    if (!currentUser) return null
    return createGroup(name, currentUser, members)
  }, [currentUser])

  const searchUsers = useCallback(async (term: string) => {
    if (!currentUserId) return []
    const isBoss = profile?.role === 'boss' || user?.email?.toLowerCase().startsWith('boss')

    // Get existing chat user IDs (users the current user has already chatted with)
    const existingChatUserIds: string[] = []
    chats.forEach(chat => {
      chat.participants.forEach(participantId => {
        if (participantId !== currentUserId && !existingChatUserIds.includes(participantId)) {
          existingChatUserIds.push(participantId)
        }
      })
    })

    return searchZoneUsers(term, currentUserId, currentZone?.id, isBoss, existingChatUserIds)
  }, [currentUserId, user?.email, profile?.role, currentZone?.id, chats])

  const deleteChat = useCallback(async (chatId: string) => {
    if (!currentUserId) return false
    const result = await deleteChatService(chatId, currentUserId)
    if (result && selectedChat?.id === chatId) {
      setSelectedChat(null)
    }
    return result
  }, [currentUserId, selectedChat?.id])

  const deleteMessage = useCallback(async (messageId: string, forEveryone: boolean = false) => {
    if (!currentUserId) return false
    // Optimistically remove from local state
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    return deleteMessageService(messageId, currentUserId, forEveryone, selectedChat?.id)
  }, [currentUserId, selectedChat?.id])

  const toggleReaction = useCallback(async (messageId: string, reaction: ReactionType) => {
    if (!currentUserId || !selectedChat?.id) return false

    // Optimistically update reactions on local message
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg
        const prevReactions: { [userId: string]: ReactionType } = { ...(msg.reactions || {}) }
        if (!reaction || prevReactions[currentUserId] === reaction) {
          delete prevReactions[currentUserId]
        } else {
          prevReactions[currentUserId] = reaction
        }
        return { ...msg, reactions: prevReactions }
      })
    )

    return toggleReactionService(messageId, currentUserId, reaction, selectedChat.id)
  }, [currentUserId, selectedChat?.id])

  // Group management functions
  const addGroupMembers = useCallback(async (members: ChatUser[]) => {
    if (!currentUserId || !selectedChat) return false
    return addGroupMembersService(selectedChat.id, currentUserId, members)
  }, [currentUserId, selectedChat])

  const removeGroupMember = useCallback(async (memberId: string) => {
    if (!currentUserId || !selectedChat) return false
    return removeGroupMemberService(selectedChat.id, currentUserId, memberId)
  }, [currentUserId, selectedChat])

  const leaveGroup = useCallback(async () => {
    if (!currentUserId || !selectedChat) return false
    const result = await leaveGroupService(selectedChat.id, currentUserId)
    if (result) {
      setSelectedChat(null)
    }
    return result
  }, [currentUserId, selectedChat])

  const deleteGroup = useCallback(async () => {
    if (!currentUserId || !selectedChat) return false
    const result = await deleteGroupService(selectedChat.id, currentUserId)
    if (result) {
      setSelectedChat(null)
    }
    return result
  }, [currentUserId, selectedChat])

  const renameGroup = useCallback(async (newName: string) => {
    if (!selectedChat || !currentUserId) return false
    return await renameGroupService(selectedChat.id, currentUserId, newName)
  }, [selectedChat, currentUserId])

  const setTypingStatus = useCallback(async (status: 'typing' | 'recording_voice' | null) => {
    if (!selectedChat || !currentUserId || !currentUser) return
    await setTypingStatusService(selectedChat.id, currentUserId, currentUser.name, status)
  }, [selectedChat, currentUserId, currentUser])

  const isGroupCreator = useCallback(() => {
    if (!currentUserId || !selectedChat || selectedChat.type !== 'group') return false
    return selectedChat.createdBy === currentUserId
  }, [currentUserId, selectedChat])

  const isGroupAdmin = useCallback((userId?: string) => {
    const idToCheck = userId || currentUserId
    if (!idToCheck || !selectedChat || selectedChat.type !== 'group') return false
    return selectedChat.createdBy === idToCheck || (selectedChat.admins || []).includes(idToCheck)
  }, [currentUserId, selectedChat])

  const updateGroupDescription = useCallback(async (description: string) => {
    if (!selectedChat || !currentUserId) return false
    return await updateGroupDescriptionService(selectedChat.id, currentUserId, description)
  }, [selectedChat, currentUserId])

  const updateChatAvatar = useCallback(async (avatarUrl: string) => {
    if (!selectedChat || !currentUserId) return false
    return await updateChatAvatarService(selectedChat.id, currentUserId, avatarUrl)
  }, [selectedChat, currentUserId])

  const toggleGroupAdmin = useCallback(async (targetUserId: string, status: boolean) => {
    if (!selectedChat || !currentUserId) return false
    return await toggleGroupAdminService(selectedChat.id, currentUserId, targetUserId, status)
  }, [selectedChat, currentUserId])

  const togglePinChat = useCallback(async (pinned: boolean) => {
    if (!selectedChat || !currentUserId) return false
    return await togglePinChatService(selectedChat.id, currentUserId, pinned)
  }, [selectedChat, currentUserId])

  const clearChat = useCallback(async () => {
    if (!selectedChat || !currentUserId) return false
    return await clearChatService(selectedChat.id, currentUserId)
  }, [selectedChat, currentUserId])

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!currentUserId) return false
    return await editMessageService(messageId, currentUserId, newText, selectedChat?.id)
  }, [currentUserId, selectedChat?.id])

  const forwardMessage = useCallback(async (targetChatId: string, originalMessage: Message) => {
    if (!currentUserId || !currentUser) return false
    
    // Optimistically update target chat in list so it jumps to top!
    const now = new Date()
    const optimisticLastMsg = {
      text: originalMessage.text || (originalMessage.imageUrl ? 'Photo' : originalMessage.voiceUrl ? 'Voice message' : originalMessage.attachment ? 'Document' : 'Forwarded message'),
      senderId: currentUser.id,
      timestamp: now,
      status: 'sent' as const
    }
    
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === targetChatId)
      if (idx === -1) return prev
      const updatedChat = {
        ...prev[idx],
        lastMessage: optimisticLastMsg,
        lastTimestamp: now
      }
      const rest = prev.filter(c => c.id !== targetChatId)
      return [updatedChat, ...rest]
    })

    return await forwardMessageService(targetChatId, currentUser, originalMessage)
  }, [currentUserId, currentUser])


  const pinMessage = useCallback(async (messageId: string | null) => {
    if (!selectedChat) return false
    return await pinMessageService(selectedChat.id, messageId)
  }, [selectedChat])

  const getChatDisplayName = useCallback((chat: Chat) => {
    if (!chat) return 'Chat'
    if (chat.type === 'group') {
      return chat.name && chat.name !== 'Direct Message' ? chat.name : 'Group Chat'
    }

    const currentUserId = user?.uid || (user as any)?.id || ''
    const currentUserName = ((user as any)?.displayName || (user as any)?.name || (profile as any)?.first_name ? `${(profile as any)?.first_name} ${(profile as any)?.last_name || ''}`.trim() : '').toLowerCase()

    // 1. Direct chat: Check other participant's details
    const otherId = chat.participants.find(id => id && id !== currentUserId)
    if (otherId && chat.participantDetails?.[otherId]?.name) {
      const otherName = chat.participantDetails[otherId].name
      if (otherName && otherName !== 'Member' && otherName !== 'You') return otherName
    }
    if (otherId && (chat as any).participantNames?.[otherId]) {
      const otherName = (chat as any).participantNames[otherId]
      if (otherName && otherName !== 'Member') return otherName
    }

    // 2. Parse comma-separated names if present (e.g. "ERIC STEPHEN, Member")
    if (chat.name && chat.name !== 'Direct Message' && chat.name !== 'Direct Chat' && chat.name !== 'Chat') {
      if (chat.name.includes(',')) {
        const parts = chat.name.split(',').map(s => s.trim()).filter(Boolean)
        const nonMeParts = parts.filter(p => {
          const pLower = p.toLowerCase()
          return (!currentUserName || !pLower.includes(currentUserName)) && pLower !== 'member'
        })
        if (nonMeParts.length > 0) return nonMeParts[0]

        const remaining = parts.filter(p => !currentUserName || !p.toLowerCase().includes(currentUserName))
        if (remaining.length > 0) return remaining[0]
      }
      return chat.name
    }

    if (otherId && chat.participantDetails?.[otherId]?.name) {
      return chat.participantDetails[otherId].name
    }

    if (otherId) {
      return `User ${otherId.substring(0, 6)}…`
    }

    return 'Direct Message'
  }, [user?.uid, (user as any)?.id, (user as any)?.displayName, (user as any)?.name, (profile as any)?.first_name, (profile as any)?.last_name])

  const getChatAvatar = useCallback((chat: Chat) => {
    if (!chat) return undefined
    if (chat.type === 'group') {
      return chat.avatar
    }

    const currentUserId = user?.uid || (user as any)?.id || ''
    const otherId = chat.participants.find(id => id && id !== currentUserId)
    if (otherId && chat.participantDetails?.[otherId]?.avatar) {
      return chat.participantDetails[otherId].avatar
    }
    if (otherId && (chat as any).participantAvatars?.[otherId]) {
      return (chat as any).participantAvatars[otherId]
    }

    return chat.avatar || undefined
  }, [user?.uid, (user as any)?.id])

  const uploadStatus = useCallback(async (file: File, caption?: string, trimOptions?: { startTime: number; endTime: number }) => {
    if (!currentUser) return false
    try {
      const finalUrl = await uploadToCloudinary(file, undefined, 'status')
      const response = await apiClient.post<{ success?: boolean }>('/statuses', {
        mediaUrl: finalUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        caption: caption || '',
        trimOptions,
      })
      return response.success !== false
    } catch (e) {
      console.error('[ChatContext] uploadStatus error:', e)
      return false
    }
  }, [currentUser, currentZone])

  const viewStatus = useCallback(async (statusId: string) => {
    await apiClient.post(`/statuses/${encodeURIComponent(statusId)}/view`)
  }, [])

  const deleteStatus = useCallback(async (statusId: string) => {
    try {
      const response = await apiClient.delete<{ success?: boolean }>(`/statuses/${encodeURIComponent(statusId)}`)
      return response.success !== false
    } catch {
      return false
    }
  }, [])

  const toggleStatusLike = useCallback(async (statusId: string) => {
    try {
      const response = await apiClient.post<{ success?: boolean }>(`/statuses/${encodeURIComponent(statusId)}/like`)
      return response.success !== false
    } catch {
      return false
    }
  }, [])

  return (
    <ChatContext.Provider value={{
      chats,
      selectedChat,
      messages,
      currentUser,
      typingUsers,
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
      addGroupMembers,
      removeGroupMember,
      leaveGroup,
      deleteGroup,
      renameGroup,
      updateGroupDescription,
      updateChatAvatar,
      toggleGroupAdmin,
      togglePinChat,
      clearChat,
      editMessage,
      forwardMessage,
      pinMessage,
      setTypingStatus,
      isGroupCreator,
      isGroupAdmin,
      getChatDisplayName,
      getChatAvatar,
      allTypingUsers,
      userPresence,
      statuses,
      uploadStatus,
      viewStatus,
      deleteStatus,
      toggleStatusLike
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatV2() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatV2 must be used within ChatProviderV2')
  }
  return context
}
