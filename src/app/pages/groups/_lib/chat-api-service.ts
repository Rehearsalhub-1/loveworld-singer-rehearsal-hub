/**
 * Chat API service — JWT reads/writes; Firebase realtime DB replaced with backend endpoints.
 */
import { getZoneById, isHQGroup } from '@/config/zones'

import {
  apiGetChat,
  apiListChats,
  apiGetMessages,
  apiGetProfile,
  apiMembersByUser,
  apiZoneMembers,
  apiProfilesDirectory,
} from './chat-api-helpers'
import { 
  apiCreateChat, 
  apiPatchChat, 
  apiSendMessage, 
  apiDeleteChat, 
  apiToggleReaction, 
  apiEditMessage, 
  apiDeleteMessage 
} from './chat-api-writes'
import { apiClient, BackendAPI } from '@/lib/api-client'
import type { Chat, ChatMessage, ChatUser, FriendRequest } from './chat-types'
import { formatTimestamp } from './chat-types'

export class ChatApiService {
  // Whatsapp Cache Clearing
  
  /**
   * Clear all chat cache - WhatsApp approach
   */
  static async clearChatCache(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const databases = await window.indexedDB.databases()
        for (const dbInfo of databases) {
          if (dbInfo.name?.includes('firestore') || dbInfo.name?.includes('chat')) {
            const deleteReq = window.indexedDB.deleteDatabase(dbInfo.name)
            await new Promise((resolve) => {
              deleteReq.onsuccess = () => resolve(true)
              deleteReq.onerror = () => resolve(true)
              deleteReq.onblocked = () => resolve(true)
            })
          }
        }
      }
      
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.includes('chat') || key.includes('firebase')) {
            localStorage.removeItem(key)
          }
        })
      }
    } catch (error) {
      console.error('[WhatsApp Mode] Cache clear failed:', error)
    }
  }
  
  // User Management
  
  /**
   * Update user online status
   */
  static async updateUserStatus(_userId: string, _isOnline: boolean): Promise<void> {
    return
  }

  /**
   * Remove undefined values from object
   */
  private static removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) return null
    if (Array.isArray(obj)) return obj.map((item) => this.removeUndefinedValues(item))
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value)
        }
      }
      return cleaned
    }
    return obj
  }

  /**
   * Create or update user profile
   */
  static async createOrUpdateUser(userData: Partial<ChatUser>): Promise<void> {
    if (!userData.id) return
    await apiClient.patch(`/profiles/${encodeURIComponent(userData.id)}`, {
      ...(userData.firstName !== undefined ? { first_name: userData.firstName } : {}),
      ...(userData.lastName !== undefined ? { last_name: userData.lastName } : {}),
      ...(userData.fullName !== undefined ? { fullName: userData.fullName } : {}),
      ...(userData.profilePic !== undefined ? { profile_image_url: userData.profilePic } : {}),
    }).catch(() => {})
  }

  /**
   * Get all users in a specific zone
   */
  static async getZoneMembers(zoneId: string, currentUserId: string): Promise<ChatUser[]> {
    try {
      const users: ChatUser[] = []
      const zoneDetails = getZoneById(zoneId)
      
      if (isHQGroup(zoneId)) {
        const hqMembers = await apiClient.get<any>('/zones/' + zoneId + '/members').then((r: any) => r?.data || r || []).catch(() => [])
        
        for (const rawMember of hqMembers as any[]) {
          const member = rawMember as any
          if (member.userId && member.userId !== currentUserId) {
            try {
              const profile: any = await apiGetProfile(member.userId)
              const fullName =
                profile
                  ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || member.userName
                  : member.userName
              
              users.push({
                id: member.userId,
                email: member.userEmail || '',
                fullName: fullName || 'Unknown User',
                profilePic: profile?.profile_image || undefined,
                zoneId: member.hqGroupId || zoneId,
                zoneName: zoneDetails?.name || 'Unknown Zone',
                isOnline: false,
                lastSeen: new Date(),
              })
            } catch {
              users.push({
                id: member.userId,
                email: member.userEmail || '',
                fullName: member.userName || 'Unknown User',
                profilePic: undefined,
                zoneId: member.hqGroupId || zoneId,
                zoneName: zoneDetails?.name || 'Unknown Zone',
                isOnline: false,
                lastSeen: new Date(),
              })
            }
          }
        }
      } else {
        const zoneMembers = await apiZoneMembers(zoneId)
        for (const member of zoneMembers as any[]) {
          const uid = member.userId || member.user_id
          if (uid && uid !== currentUserId) {
            users.push({
              id: uid,
              email: member.userEmail || member.user_email || '',
              fullName: member.userName || member.user_name || 'Unknown User',
              profilePic: undefined,
              zoneId: member.zoneId || member.zone_id || zoneId,
              zoneName: member.zoneName || member.zone_name || zoneDetails?.name || 'Unknown Zone',
              isOnline: false,
              lastSeen: new Date(),
            })
          }
        }
      }
      
      users.sort((a, b) => a.fullName.localeCompare(b.fullName))
      return users
    } catch (error) {
      console.error('Error getting zone members:', error)
      return []
    }
  }

  // Search users
  static async searchUsers(searchTerm: string, currentUserId: string, zoneId?: string, _isBoss: boolean = false): Promise<ChatUser[]> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        if (zoneId) {
          return this.getZoneMembers(zoneId, currentUserId)
        }
        return []
      }

      const searchLower = searchTerm.toLowerCase()
      const userMap = new Map<string, ChatUser>()

      const zoneRows = (await apiClient.get<any>('/zone_members').then((r: any) => r?.data || r || []).catch(() => [])) as any[]
      for (const data of zoneRows) {
        const uid = data.userId || data.user_id
        if (!uid || uid === currentUserId) continue
        const name = String(data.userName || data.user_name || '')
        const email = String(data.userEmail || data.user_email || '')
        if (!name.toLowerCase().includes(searchLower) && !email.toLowerCase().includes(searchLower)) continue
        if (!userMap.has(uid)) {
          userMap.set(uid, {
            id: uid,
            email,
            fullName: name || 'Unknown User',
            profilePic: undefined,
            zoneId: data.zoneId || data.zone_id,
            zoneName: data.zoneName || data.zone_name || 'Unknown Zone',
            isOnline: false,
            lastSeen: new Date(),
          })
        }
      }

      if (userMap.size < 15) {
        const profiles = await apiProfilesDirectory()
        for (const profile of profiles as any[]) {
          const userId = String(profile.id)
          if (userId === currentUserId || userMap.has(userId)) continue
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User'
          const email = String(profile.email || '')
          if (!fullName.toLowerCase().includes(searchLower) && !email.toLowerCase().includes(searchLower)) continue
          userMap.set(userId, {
            id: userId,
            email,
            fullName,
            profilePic: profile.profile_image_url || undefined,
            zoneId: profile.zone_id || profile.zone,
            zoneName: profile.zone_name || 'Assigned Zone',
            isOnline: false,
            lastSeen: new Date(),
          })
        }
      }

      const results = Array.from(userMap.values())
      results.sort((a, b) => a.fullName.localeCompare(b.fullName))
      return results
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }

  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<ChatUser | null> {
    try {
      const { zoneMembers, hqMembers } = await apiMembersByUser(userId)
      const memberData = (zoneMembers[0] || hqMembers[0]) as any
      if (memberData) {
        const zoneId = memberData.zoneId || memberData.zone_id || memberData.hqGroupId || memberData.hq_group_id
        const zoneDetails = zoneId ? getZoneById(zoneId) : null
        return {
          id: userId,
          email: memberData.userEmail || memberData.user_email || '',
          fullName: memberData.userName || memberData.user_name || 'Unknown User',
          profilePic: undefined,
          zoneId: zoneId,
          zoneName: memberData.zoneName || memberData.zone_name || zoneDetails?.name || (zoneId ? `Zone ${zoneId}` : 'No zone assigned'),
          isOnline: false,
          lastSeen: new Date(),
        }
      }
      
      const profile = await apiGetProfile(userId)
      if (profile) {
        const zoneId = (profile.zone_id || profile.zone) as string | undefined
        const zoneDetails = zoneId ? getZoneById(zoneId) : null
        const zoneName = (profile.zone_name as string | undefined) || zoneDetails?.name || null
        
        return {
          id: userId,
          email: (profile.email as string) || '',
          fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
          profilePic: (profile.profile_image_url as string | undefined) || undefined,
          zoneId: zoneId,
          zoneName: zoneName || zoneDetails?.name || (zoneId ? `Zone ${zoneId}` : 'No zone assigned'),
          isOnline: false,
          lastSeen: new Date(),
        }
      }
      
      return null
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  }

  // Friend System

  /**
   * Send friend request — no JWT route
   */
  static async sendFriendRequest(_fromUserId: string, _toUserId: string): Promise<boolean> {
    return false
  }

  /**
   * Get friendship status between two users
   */
  static async getFriendStatus(_userId: string, _otherUserId: string): Promise<{ status: 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends'; requestId?: string }> {
    return { status: 'none' }
  }

  /**
   * Accept friend request — no JWT route
   */
  static async acceptFriendRequest(_requestId: string): Promise<boolean> {
    return false
  }

  /**
   * Get friend requests for user
   */
  static async getFriendRequests(_userId: string): Promise<FriendRequest[]> {
    return []
  }

  // Chat Management

  /**
   * Create direct chat between two users
   */
  static async createDirectChat(user1Id: string, user2Id: string): Promise<string | null> {
    try {
      if (user1Id === user2Id) {
        console.error('Cannot create self-chat:', user1Id)
        return null
      }

      const existingChat = await this.findDirectChat(user1Id, user2Id)
      if (existingChat) return existingChat.id

      const created = await apiCreateChat({
        type: 'direct',
        member_ids: [user1Id, user2Id],
      })
      return created?.id ?? null
    } catch (error) {
      console.error('Error creating direct chat:', error)
      return null
    }
  }

  /**
   * Create group chat
   */
  static async createGroupChat(
    name: string,
    _description: string,
    creatorId: string,
    participantIds: string[],
  ): Promise<string | null> {
    try {
      const allParticipants = [creatorId, ...participantIds.filter((id) => id !== creatorId)]
      const created = await apiCreateChat({
        type: 'group',
        name,
        member_ids: allParticipants,
      })
      return created?.id ?? null
    } catch (error) {
      console.error('Error creating group chat:', error)
      return null
    }
  }

  /**
   * Find existing direct chat between two users
   */
  static async findDirectChat(user1Id: string, user2Id: string): Promise<Chat | null> {
    try {
      const rows = await apiListChats()
      for (const data of rows) {
        const participants = Array.isArray(data.participants) ? data.participants.map(String) : []
        if (data.type === 'direct' && participants.includes(user1Id) && participants.includes(user2Id)) {
          return { id: String(data.id), ...(data as object) } as Chat
        }
      }
      return null
    } catch (error) {
      console.error('Error finding direct chat:', error)
      return null
    }
  }

  /**
   * Get user's chats
   */
  static async getUserChats(userId: string): Promise<Chat[]> {
    try {
      const rows = await apiListChats()
      const chats: Chat[] = []
      for (const data of rows) {
        const chatData = { id: String(data.id), ...(data as object) } as Chat
        if ((chatData as { isActive?: boolean }).isActive === false) continue
        if (chatData.type === 'direct' && !chatData.participantNames) {
          const participantNames: { [key: string]: string } = {}
          for (const rawParticipant of chatData.participants || []) {
            const participantId = typeof rawParticipant === 'object' && rawParticipant !== null
              ? ((rawParticipant as any).id || (rawParticipant as any).userId || (rawParticipant as any).uid || '')
              : String(rawParticipant || '');
            if (participantId && participantId !== userId && participantId !== '[object Object]') {
              try {
                const userData = await this.getUser(participantId);
                participantNames[participantId] = userData?.fullName || 'Unknown User';
              } catch {
                participantNames[participantId] = 'Unknown User';
              }
            }
          }
          chatData.participantNames = participantNames
        }
        chats.push(chatData)
      }
      return chats.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || a.createdAt
        const bTime = b.lastMessage?.timestamp || b.createdAt
        return new Date(bTime as Date).getTime() - new Date(aTime as Date).getTime()
      })
    } catch (error) {
      console.error('Error getting user chats:', error)
      return []
    }
  }

  // Message Management

  /**
   * Send message
   */
  static async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    messageData: {
      text?: string
      image?: string
      fileUrl?: string
      fileName?: string
      replyTo?: {
        messageId: string
        senderName: string
        snippet: string
      }
    },
    isBoss: boolean = false,
  ): Promise<boolean> {
    try {
      const messageType = messageData.image ? 'image' : messageData.fileUrl ? 'file' : 'text'
      const displayName = isBoss ? `${senderName} (Support)` : senderName
      const content =
        messageData.text ||
        (messageData.image ? 'Image' : messageData.fileUrl ? 'File' : '')
      if (!content) return false

      const mediaUrl = messageData.image || messageData.fileUrl
      const msg = await apiSendMessage(chatId, {
        content: content.slice(0, 4000),
        type: messageType,
        ...(mediaUrl ? { media_url: mediaUrl } : {}),
        ...(messageData.replyTo?.messageId ? { reply_to: messageData.replyTo.messageId } : {}),
      })
      void displayName
      void senderId
      return !!msg
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  /**
   * Edit a message
   */
  static async editMessage(messageId: string, _userId: string, newText: string, chatId?: string): Promise<boolean> {
    if (!chatId) return false
    return await apiEditMessage(chatId, messageId, newText)
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId: string, _userId: string, chatId?: string): Promise<boolean> {
    if (!chatId) return false
    return await apiDeleteMessage(chatId, messageId)
  }

  /**
   * Toggle reaction
   */
  static async toggleReaction(
    messageId: string,
    _userId: string,
    _userName: string,
    emoji: string = '❤️',
    chatId?: string,
  ): Promise<void> {
    if (chatId) {
      await apiToggleReaction(chatId, messageId, emoji)
    }
  }

  /**
   * Get messages for a chat
   */
  static async getMessages(chatId: string, limitCount = 50): Promise<ChatMessage[]> {
    try {
      const rows = await apiGetMessages(chatId)
      return rows.slice(-limitCount).map((row) => ({
        ...row,
        id: String(row.id),
        timestamp: row.timestamp ? new Date(row.timestamp as string | number | Date) : new Date(),
      })) as ChatMessage[]
    } catch (error) {
      console.error('Error getting messages:', error)
      return []
    }
  }

  /**
   * Subscribe to real-time messages
   */
  static subscribeToMessages(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
    let active = true
    const load = async () => {
      try {
        const msgs = await ChatApiService.getMessages(chatId)
        if (active) callback(msgs)
      } catch {
        if (active) callback([])
      }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }

  static subscribeToChats(userId: string, callback: (chats: Chat[]) => void): () => void {
    let active = true
    const load = async () => {
      try {
        const chats = await ChatApiService.getUserChats(userId)
        if (active) callback(chats)
      } catch {
        if (active) callback([])
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }

  // Group Management

  /**
   * Add user to group
   */
  static async addUserToGroup(chatId: string, userId: string, adminId: string): Promise<boolean> {
    try {
      const chat = (await apiGetChat(chatId)) as Chat | null
      if (!chat) return false
      if (!(chat.admins || []).includes(adminId) && chat.createdBy !== adminId) return false
      const participants = [...(chat.participants || []).map(String)]
      if (participants.includes(userId)) return true
      const updated = await apiPatchChat(chatId, { member_ids: [...participants, userId] })
      return !!updated
    } catch (error) {
      console.error('Error adding user to group:', error)
      return false
    }
  }

  /**
   * Remove user from group
   */
  static async removeUserFromGroup(chatId: string, userId: string, adminId: string): Promise<boolean> {
    try {
      const chat = (await apiGetChat(chatId)) as Chat | null
      if (!chat) return false
      if (!(chat.admins || []).includes(adminId) && chat.createdBy !== adminId) return false
      const participants = (chat.participants || []).map(String).filter((id) => id !== userId)
      if (participants.length === 0) {
        return await apiDeleteChat(chatId)
      }
      const updated = await apiPatchChat(chatId, { member_ids: participants })
      return !!updated
    } catch (error) {
      console.error('Error removing user from group:', error)
      return false
    }
  }

  /**
   * Make user admin
   */
  static async makeUserAdmin(
    chatId: string,
    userId: string,
    _adminId: string,
  ): Promise<boolean> {
    try {
      const chat = (await apiGetChat(chatId)) as Chat | null
      if (!chat) return false
      const currentAdmins = Array.isArray(chat.admins) ? chat.admins.map(String) : []
      const nextAdmins = Array.from(new Set([...currentAdmins, userId]))
      const updated = await apiPatchChat(chatId, { admins: nextAdmins })
      return !!updated
    } catch (error) {
      console.error('Error making user admin:', error)
      return false
    }
  }

  /**
   * Update group info
   */
  static async updateGroupInfo(
    chatId: string,
    adminId: string,
    updates: { name?: string; description?: string; avatar?: string },
  ): Promise<boolean> {
    try {
      const chat = (await apiGetChat(chatId)) as Chat | null
      if (!chat) return false
      if (!(chat.admins || []).includes(adminId) && chat.createdBy !== adminId) return false
      const updated = await apiPatchChat(chatId, {
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.avatar !== undefined ? { avatar: updates.avatar } : {}),
      })
      return !!updated
    } catch (error) {
      console.error('Error updating group info:', error)
      return false
    }
  }

  /**
   * Leave group
   */
  static async leaveGroup(chatId: string, userId: string): Promise<boolean> {
    try {
      const chat = (await apiGetChat(chatId)) as Chat | null
      if (!chat) return false
      if (!(chat.participants || []).map(String).includes(userId)) return false
      const participants = (chat.participants || []).map(String).filter((id) => id !== userId)
      let admins = (chat.admins || []).map(String).filter((id) => id !== userId)

      if (participants.length === 0) {
        return await apiDeleteChat(chatId)
      }

      if (admins.length === 0 && participants.length > 0) {
        admins = [participants[0]]
      }

      const updated = await apiPatchChat(chatId, { member_ids: participants, admins })
      return !!updated
    } catch (error) {
      console.error('Error leaving group:', error)
      return false
    }
  }

  /**
   * Get detailed participant info for chats
   */
  static async getChatParticipants(chatId: string): Promise<ChatUser[]> {
    try {
      const chat = (await apiGetChat(chatId)) as Chat | null
      if (!chat) return []
      const results: ChatUser[] = []
      for (const participantId of chat.participants || []) {
        const user = await this.getUser(participantId)
        if (user) results.push(user)
      }
      return results
    } catch (error) {
      console.error('Error getting chat participants:', error)
      return []
    }
  }

  /**
   * Delete a chat
   */
  static async deleteChat(chatId: string, _userId?: string): Promise<boolean> {
    try {
      return await apiDeleteChat(chatId)
    } catch (error) {
      console.error('Error deleting chat:', error)
      return false
    }
  }

  /**
   * Pin or unpin a chat
   */
  static async togglePinChat(chatId: string, userId: string, pin: boolean): Promise<boolean> {
    try {
      const updated = await apiPatchChat(chatId, { pinnedBy: { [userId]: pin } } as any)
      return !!updated
    } catch {
      return false
    }
  }

  /**
   * Star or unstar a chat
   */
  static async toggleStarChat(_chatId: string, _userId: string, _star: boolean): Promise<boolean> {
    return false
  }

  /**
   * Star or unstar a message
   */
  static async toggleStarMessage(_messageId: string, _userId: string): Promise<boolean> {
    return false
  }

  /**
   * Check if a message is starred by a user
   */
  static async isMessageStarred(_messageId: string, _userId: string): Promise<boolean> {
    return false
  }

  /**
   * Search messages in a chat
   */
  static async searchMessages(chatId: string, searchTerm: string): Promise<ChatMessage[]> {
    try {
      if (!searchTerm.trim()) return []
      const searchLower = searchTerm.toLowerCase().trim()
      const rows = await apiGetMessages(chatId)
      return rows
        .filter((row) => String(row.text || '').toLowerCase().includes(searchLower))
        .map((row) => ({ ...row, id: String(row.id) } as ChatMessage))
    } catch (error) {
      console.error('Error searching messages:', error)
      return []
    }
  }
}

export type { Chat, ChatMessage, ChatUser, FriendRequest, MessageReaction } from './chat-types'
export { formatTimestamp } from './chat-types'
