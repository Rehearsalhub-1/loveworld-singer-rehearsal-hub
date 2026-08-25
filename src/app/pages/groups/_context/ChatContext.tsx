"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useZoneStore } from '@/stores/zoneStore'
import {
  ChatApiService,
  Chat,
  ChatMessage,
  ChatUser,
  FriendRequest,
} from '../_lib/chat-api-service'
import { WhatsAppPresence } from '../_lib/whatsapp-presence'

interface ChatContextType {
  // Current state
  chats: Chat[]
  selectedChat: Chat | null
  messages: ChatMessage[]
  onlineUsers: ChatUser[]
  friendRequests: FriendRequest[]
  replyToMessage: ChatMessage | null
  editingMessage: ChatMessage | null
  
  // Loading states
  isChatsLoading: boolean
  isMessagesLoading: boolean
  isUsersLoading: boolean
  
  // Actions
  setSelectedChat: (chat: Chat | null) => void
  setReplyToMessage: (message: ChatMessage | null) => void
  setEditingMessage: (message: ChatMessage | null) => void
  sendMessage: (messageData: { text?: string; image?: string; fileUrl?: string; fileName?: string }) => Promise<boolean>
  searchUsers: (searchTerm: string) => Promise<ChatUser[]>
  createDirectChat: (userId: string) => Promise<string | null>
  createGroupChat: (name: string, description: string, participantIds: string[]) => Promise<string | null>
  sendFriendRequest: (userId: string) => Promise<boolean>
  acceptFriendRequest: (requestId: string) => Promise<boolean>
  getFriendStatus: (userId: string) => Promise<{ status: 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends'; requestId?: string }>
  toggleReaction: (messageId: string, emoji?: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<boolean>
  editMessage: (messageId: string, newText: string) => Promise<boolean>
  
  // Group management
  addUserToGroup: (chatId: string, userId: string) => Promise<boolean>
  removeUserFromGroup: (chatId: string, userId: string) => Promise<boolean>
  makeUserAdmin: (chatId: string, userId: string) => Promise<boolean>
  updateGroupInfo: (chatId: string, updates: { name?: string; description?: string; avatar?: string }) => Promise<boolean>
  leaveGroup: (chatId: string) => Promise<boolean>
  
  // Chat management
  deleteChat: (chatId: string) => Promise<boolean>
  togglePinChat: (chatId: string, pin: boolean) => Promise<boolean>
  toggleStarChat: (chatId: string, star: boolean) => Promise<boolean>
  searchMessages: (chatId: string, searchTerm: string) => Promise<ChatMessage[]>
  
  // Message management
  toggleStarMessage: (messageId: string) => Promise<boolean>
  isMessageStarred: (messageId: string) => Promise<boolean>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const currentZone = useZoneStore((s) => s.currentZone)
  const userId = user?.uid || profile?.id || ''
  
  // Local state for all chat data (no Zustand caching)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isChatsLoading, setIsChatsLoading] = useState(true)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  
  // Local state for UI-only data
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [isUsersLoading, setIsUsersLoading] = useState(false)

  // Initialize user in chat system
  useEffect(() => {
    if (!userId) return

    const chatUser: Partial<ChatUser> = {
      id: userId,
      email: profile?.email || user?.email || '',
      fullName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'User',
      firstName: profile?.first_name,
      lastName: profile?.last_name,
      zoneId: currentZone?.id,
      zoneName: currentZone?.name
    }

    const profileImageUrl = (profile as any)?.profile_image_url
    if (profileImageUrl) chatUser.profilePic = profileImageUrl

    WhatsAppPresence.initializePresence(userId)
    ChatApiService.createOrUpdateUser(chatUser)
    ChatApiService.updateUserStatus(userId, true)
  }, [userId, currentZone?.id])

  useEffect(() => {
    if (!userId) return

    const handleFocus = () => {
      WhatsAppPresence.updateStatus(userId, 'online')
      ChatApiService.updateUserStatus(userId, true)
    }
    
    const handleBlur = () => {
      WhatsAppPresence.updateStatus(userId, 'offline')
      ChatApiService.updateUserStatus(userId, false)
    }
    
    const handleBeforeUnload = () => {
      WhatsAppPresence.updateStatus(userId, 'offline')
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      WhatsAppPresence.cleanup(userId)
      ChatApiService.updateUserStatus(userId, false)
    }
  }, [userId])

  // Subscribe to chats
  useEffect(() => {
    if (!userId) {
      setIsChatsLoading(false)
      return
    }
    
    setIsChatsLoading(true)
    const unsubscribe = ChatApiService.subscribeToChats(userId, (cleanChats) => {
      setChats(cleanChats)
      setIsChatsLoading(false)
    })

    return () => { unsubscribe() }
  }, [userId])

  // Subscribe to messages for selected chat (completely filter out deleted messages)
  useEffect(() => {
    if (!selectedChat) {
      setReplyToMessage(null)
      setEditingMessage(null)
      setMessages([])
      return
    }

    setIsMessagesLoading(true)
    setMessages([])

    const unsubscribe = ChatApiService.subscribeToMessages(selectedChat.id, (freshMessages) => {
      const activeMessages = (freshMessages || []).filter((m: any) => !m.deleted)
      setMessages(activeMessages)
      setIsMessagesLoading(false)
    })

    return () => {
      unsubscribe()
      setMessages([])
    }
  }, [selectedChat?.id])

  // Load friend requests
  useEffect(() => {
    if (!userId) return
    const loadFriendRequests = async () => {
      const requests = await ChatApiService.getFriendRequests(userId)
      setFriendRequests(requests)
    }
    loadFriendRequests()
  }, [userId])

  // Actions
  const sendMessage = useCallback(async (messageData: { 
    text?: string; 
    image?: string; 
    fileUrl?: string; 
    fileName?: string 
  }) => {
    if (!selectedChat || !user || !profile) return false

    let senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    if (!senderName) {
      try {
        const userFromZone = await ChatApiService.getUser((user.uid || user.id || ""))
        senderName = userFromZone?.fullName || profile.email?.split('@')[0] || 'User'
      } catch (error) {
        console.error('Error getting user name:', error)
        senderName = profile.email?.split('@')[0] || 'User'
      }
    }
    
    const isBoss = profile?.role === 'boss' || user.email?.toLowerCase().startsWith('boss')

    const replyMeta = replyToMessage ? {
      messageId: replyToMessage.id,
      senderName: replyToMessage.senderName,
      snippet: replyToMessage.text 
        ? replyToMessage.text.slice(0, 120)
        : replyToMessage.image 
          ? ' Image'
          : replyToMessage.fileName 
            ? ` ${replyToMessage.fileName}`
            : 'Message'
    } : undefined

    const result = await ChatApiService.sendMessage(
      selectedChat.id,
      (user.uid || user.id || ""),
      senderName,
      {
        ...messageData,
        replyTo: replyMeta
      },
      isBoss
    )
    
    if (result) {
      setReplyToMessage(null)
    }
    
    return result
  }, [selectedChat, user, profile, replyToMessage])

  const searchUsers = useCallback(async (searchTerm: string) => {
    const currentUid = user?.uid || profile?.id
    if (!currentUid || !profile) return []
    
    const isBoss = profile?.role === 'boss' || user?.email?.toLowerCase().startsWith('boss')
    setIsUsersLoading(true)
    const users = await ChatApiService.searchUsers(searchTerm, currentUid, currentZone?.id, isBoss)
    setIsUsersLoading(false)
    return users
  }, [user, profile, currentZone])

  const createDirectChat = useCallback(async (otherUid: string) => {
    const currentUid = user?.uid || profile?.id
    if (!currentUid) return null
    return await ChatApiService.createDirectChat(currentUid, otherUid)
  }, [user, profile])

  const createGroupChat = useCallback(async (
    name: string, 
    description: string, 
    participantIds: string[]
  ) => {
    if (!user) return null
    return await ChatApiService.createGroupChat(name, description, (user.uid || user.id || ""), participantIds)
  }, [user])

  const sendFriendRequest = useCallback(async (recipientId: string) => {
    if (!user) return false
    return await ChatApiService.sendFriendRequest((user.uid || user.id || ""), recipientId)
  }, [user])

  const getFriendStatus = useCallback(async (otherUid: string) => {
    if (!user) return { status: 'none' as const }
    return await ChatApiService.getFriendStatus((user.uid || user.id || ""), otherUid)
  }, [user])

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    const result = await ChatApiService.acceptFriendRequest(requestId)
    if (result) {
      const requests = await ChatApiService.getFriendRequests(user?.uid || '')
      setFriendRequests(requests)
    }
    return result
  }, [user])

  // Group management actions
  const addUserToGroup = useCallback(async (chatId: string, memberId: string) => {
    if (!user) return false
    return await ChatApiService.addUserToGroup(chatId, memberId, (user.uid || user.id || ""))
  }, [user])

  const removeUserFromGroup = useCallback(async (chatId: string, memberId: string) => {
    if (!user) return false
    return await ChatApiService.removeUserFromGroup(chatId, memberId, (user.uid || user.id || ""))
  }, [user])

  const makeUserAdmin = useCallback(async (chatId: string, memberId: string) => {
    if (!user) return false
    return await ChatApiService.makeUserAdmin(chatId, memberId, (user.uid || user.id || ""))
  }, [user])

  const updateGroupInfo = useCallback(async (
    chatId: string, 
    updates: { name?: string; description?: string; avatar?: string }
  ) => {
    if (!user) return false
    return await ChatApiService.updateGroupInfo(chatId, (user.uid || user.id || ""), updates)
  }, [user])

  const leaveGroup = useCallback(async (chatId: string) => {
    if (!user) return false
    const result = await ChatApiService.leaveGroup(chatId, (user.uid || user.id || ""))
    if (result) {
      setSelectedChat(null)
    }
    return result
  }, [user])

  const deleteChat = useCallback(async (chatId: string) => {
    if (!user) return false
    const result = await ChatApiService.deleteChat(chatId, (user.uid || user.id || ""))
    if (result && selectedChat?.id === chatId) {
      setSelectedChat(null)
    }
    return result
  }, [user, selectedChat])

  const togglePinChat = useCallback(async (chatId: string, pin: boolean) => {
    if (!user) return false
    return await ChatApiService.togglePinChat(chatId, (user.uid || user.id || ""), pin)
  }, [user])

  const toggleStarChat = useCallback(async (chatId: string, star: boolean) => {
    if (!user) return false
    return await ChatApiService.toggleStarChat(chatId, (user.uid || user.id || ""), star)
  }, [user])

  const searchMessages = useCallback(async (chatId: string, searchTerm: string) => {
    return await ChatApiService.searchMessages(chatId, searchTerm)
  }, [])

  const toggleStarMessage = useCallback(async (messageId: string) => {
    if (!user) return false
    return await ChatApiService.toggleStarMessage(messageId, (user.uid || user.id || ""))
  }, [user])

  const isMessageStarred = useCallback(async (messageId: string) => {
    if (!user) return false
    return await ChatApiService.isMessageStarred(messageId, (user.uid || user.id || ""))
  }, [user])

  const toggleReaction = useCallback(async (messageId: string, emoji: string = '❤️') => {
    if (!user) return
    await ChatApiService.toggleReaction(messageId, (user.uid || user.id || ""), profile?.first_name || user.email || 'You', emoji)
  }, [user, profile])

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return false
    return await ChatApiService.deleteMessage(messageId, (user.uid || user.id || ""))
  }, [user])

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!user) return false
    const result = await ChatApiService.editMessage(messageId, (user.uid || user.id || ""), newText)
    if (result) {
      setEditingMessage(null)
    }
    return result
  }, [user])

  const contextValue: ChatContextType = {
    // State
    chats,
    selectedChat,
    messages,
    onlineUsers,
    friendRequests,
    replyToMessage,
    editingMessage,
    
    // Loading states
    isChatsLoading,
    isMessagesLoading,
    isUsersLoading,
    
    // Actions
    setSelectedChat,
    setReplyToMessage,
    setEditingMessage,
    sendMessage,
    searchUsers,
    createDirectChat,
    createGroupChat,
    sendFriendRequest,
    acceptFriendRequest,
    getFriendStatus,
    toggleReaction,
    deleteMessage,
    editMessage,
    
    // Group management
    addUserToGroup,
    removeUserFromGroup,
    makeUserAdmin,
    updateGroupInfo,
    leaveGroup,
    
    // Chat management
    deleteChat,
    togglePinChat,
    toggleStarChat,
    searchMessages,
    
    // Message management
    toggleStarMessage,
    isMessageStarred
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
