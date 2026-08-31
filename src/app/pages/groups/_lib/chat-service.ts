/**
 * Chat service — JWT API writes; Firestore onSnapshot retained until task 62.
 */


import {
  apiGetChat,
  apiListChats,
  apiGetMessages,
  apiGetProfile,
  apiMembersByUser,
  apiHqMembers,
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
import { apiClient, BackendAPI } from '@/lib/api-client';
import { subscribe as subscribeToWebSocket } from '@/hooks/useWebSocket';

export interface ChatUser {
  id: string
  name: string
  username?: string
  email?: string
  designation?: string
  avatar?: string
  zoneId?: string
  zoneName?: string
}

// Reaction types
export type ReactionType = '❤️' | '👍' | '😂' | '😮' | '😢' | '🙏' | '🔥' | '👏' | '💯' | '✨' | ''

// Message types
export type MessageType = 'text' | 'image' | 'document' | 'voice' | 'system'

export interface MessageAttachment {
  url: string
  name: string
  size?: number
  mimeType?: string
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  text: string
  timestamp: Date
  type: MessageType
  imageUrl?: string
  attachment?: MessageAttachment
  voiceUrl?: string
  voiceDuration?: number
  replyTo?: {
    id: string
    text: string
    senderName: string
  }
  reactions?: { [userId: string]: ReactionType }
  edited?: boolean
  deleted?: boolean
  isStarred?: boolean
  pinnedInChat?: boolean
  status?: 'sent' | 'delivered' | 'read' | 'forwarded'
}

export interface Chat {
  id: string
  type: 'direct' | 'group'
  name?: string
  avatar?: string
  description?: string
  participants: string[]
  participantDetails: { [userId: string]: { name: string; avatar?: string } }
  admins: string[]
  createdBy: string
  createdAt: Date
  lastMessage?: {
    text: string
    senderId: string
    timestamp: Date
    status?: 'sent' | 'delivered' | 'read'
  }
  unreadCount: { [userId: string]: number }
  pinnedBy?: { [userId: string]: boolean }
  clearedAt?: { [userId: string]: any }
  pinnedMessageId?: string
}

// COLLECTIONS (v2 - fresh start)


const TYPING_COLLECTION = 'typing_v2'

// ── API row → typed Chat ──────────────────────────────────────────────────────

function rowToChat(row: Record<string, any>): Chat {
  const raw = (row.rawData && typeof row.rawData === 'object') ? row.rawData as Record<string, any> : {}
  const extractUid = (item: any): string => {
    if (!item) return ''
    if (typeof item === 'string') return item
    if (typeof item === 'object') return item.userId || item.id || item.uid || ''
    return String(item)
  }

  const rawParticipants = Array.isArray(row.participants)
    ? row.participants
    : Array.isArray(raw.participants)
      ? raw.participants
      : Array.isArray(row.memberIds)
        ? row.memberIds
        : Array.isArray(raw.memberIds)
          ? raw.memberIds
          : typeof row.participants === 'object' && row.participants !== null
            ? Object.keys(row.participants)
            : typeof raw.participants === 'object' && raw.participants !== null
              ? Object.keys(raw.participants)
              : []

  const participants: string[] = rawParticipants.map(extractUid).filter(Boolean)

  const idStr = String(row.id || '')
  if (idStr.includes('_') && !idStr.startsWith('group_')) {
    idStr.split('_').forEach(part => {
      if (part && part.length >= 20 && !participants.includes(part)) {
        participants.push(part)
      }
    })
  }

  const participantDetails: Chat['participantDetails'] =
    (row.participantDetails && typeof row.participantDetails === 'object') ? { ...row.participantDetails } :
    (raw.participantDetails && typeof raw.participantDetails === 'object') ? { ...raw.participantDetails } : {}

  const rawParticipantNames = (row.participantNames && typeof row.participantNames === 'object')
    ? row.participantNames
    : (raw.participantNames && typeof raw.participantNames === 'object')
      ? raw.participantNames
      : {}

  for (const [pId, pName] of Object.entries(rawParticipantNames)) {
    if (!participantDetails[pId] && typeof pName === 'string') {
      participantDetails[pId] = { name: pName }
    }
  }

  const rawMembers = Array.isArray(row.members) ? row.members : Array.isArray(raw.members) ? raw.members : []
  for (const m of rawMembers) {
    if (m && typeof m === 'object' && m.id) {
      const pId = String(m.id)
      if (!participantDetails[pId]) {
        participantDetails[pId] = {
          name: m.name || m.fullName || m.displayName || m.email || '',
          avatar: m.avatar || m.avatarUrl || m.profilePic || ''
        }
      }
    }
  }

  const lm = raw.lastMessage || raw.last_message || row.lastMessage || row.last_message
  let lastMessage: Chat['lastMessage'] | undefined
  const rawLastTimestamp = raw.lastTimestamp || row.lastTimestamp || raw.last_message_at || row.last_message_at || raw.updatedAt || row.updatedAt || raw.updated_at || row.updated_at
  if (typeof lm === 'string' && lm) {
    lastMessage = { text: lm, senderId: '', timestamp: toDate(rawLastTimestamp || raw.updatedAt || row.updatedAt) }
  } else if (lm && typeof lm === 'object') {
    lastMessage = {
      text: lm.text || lm.content || '',
      senderId: lm.senderId || lm.sender_id || '',
      timestamp: toDate(lm.timestamp || lm.createdAt || lm.created_at || rawLastTimestamp),
      status: lm.status
    }
  } else if (rawLastTimestamp) {
    lastMessage = {
      text: '',
      senderId: '',
      timestamp: toDate(rawLastTimestamp)
    }
  }

  return {
    id: String(row.id),
    type: (row.type === 'group' ? 'group' : 'direct') as 'direct' | 'group',
    name: raw.name || row.name || (row.type === 'direct' ? 'Direct Message' : 'Group Chat'),
    avatar: raw.avatar || row.avatar,
    description: raw.description || row.description,
    participants,
    participantDetails,
    admins: Array.isArray(raw.admins) ? raw.admins.map(String) : Array.isArray(row.admins) ? row.admins.map(String) : [],
    createdBy: String(raw.createdBy || raw.created_by || row.createdBy || participants[0] || ''),
    createdAt: toDate(raw.createdAt || raw.created_at || row.createdAt || raw.timestamp || row.timestamp),
    lastMessage,
    unreadCount: (raw.unreadCount && typeof raw.unreadCount === 'object') ? raw.unreadCount : (row.unreadCount && typeof row.unreadCount === 'object') ? row.unreadCount : {},
    pinnedBy: raw.pinnedBy || row.pinnedBy,
    clearedAt: raw.clearedAt || row.clearedAt,
    pinnedMessageId: raw.pinnedMessageId || row.pinnedMessageId
  }
}

// ── API row → typed Message ───────────────────────────────────────────────────

function rowToMessage(row: Record<string, any>): Message {
  const raw = (row.rawData && typeof row.rawData === 'object') ? row.rawData as Record<string, any> : {}
  const rawTimestamp = row.timestamp || raw.timestamp || row.createdAt || raw.created_at || raw.createdAt || raw.created_at || row.time || raw.date || row.inserted_at || raw.updatedAt || row.updatedAt
  return {
    id: String(row.id),
    chatId: String(row.chatId || raw.chatId || ''),
    senderId: String(row.senderId || raw.senderId || raw.sender_id || ''),
    senderName: String(row.senderName || raw.senderName || raw.sender_name || 'Unknown'),
    senderAvatar: raw.senderAvatar || raw.sender_avatar,
    text: String(row.text || raw.text || raw.content || ''),
    timestamp: toDate(rawTimestamp),
    type: (row.type || raw.type || 'text') as MessageType,
    imageUrl: raw.imageUrl || raw.image_url || raw.mediaUrl || raw.media_url,
    attachment: raw.attachment,
    voiceUrl: raw.voiceUrl || raw.voice_url,
    voiceDuration: raw.voiceDuration || raw.voice_duration,
    replyTo: raw.replyTo || raw.reply_to,
    reactions: (raw.reactions && typeof raw.reactions === 'object') ? raw.reactions : ((row.reactions && typeof row.reactions === 'object') ? row.reactions : {}),
    edited: raw.edited,
    deleted: raw.deleted,
    isStarred: raw.isStarred,
    status: raw.status
  }
}

// HELPERS

function formatCallDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

// USER HELPERS

/**
 * Get user info from zone_members or profiles
 */
export async function getUserInfo(userId: string): Promise<ChatUser | null> {
  try {
    const { zoneMembers, hqMembers } = await apiMembersByUser(userId)
    const member = (zoneMembers[0] || hqMembers[0]) as Record<string, any> | undefined
    if (member) {
      return {
        id: userId,
        name: member.userName || member.user_name || 'Unknown',
        avatar: member.photoURL || member.avatar || member.profileImage || member.profile_image_url || member.avatar_url,
        zoneId: member.zoneId || member.zone_id || member.hqGroupId,
        zoneName: member.zoneName || member.zone_name || member.groupName
      }
    }

    const data = await apiGetProfile(userId)
    if (data) {
      return {
        id: userId,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
        avatar: (data.profile_image_url || data.avatar_url || data.photoURL || data.avatar) as string | undefined
      }
    }

    return null
  } catch (error) {
    console.error('[ChatService] getUserInfo error:', error)
    return null
  }
}

// Protected senior zones - members only visible to their own zone or boss users
const SENIOR_ZONES = ['zone-president', 'zone-president-2', 'zone-director', 'zone-oftp', 'zone-sa-1', 'zone-sa-2', 'zone-sa-3', 'zone-sa-4', 'zone-sa-5']
const SENIOR_TITLES = ['president', 'director', 'oftp', 'sa-1', 'sa-2', 'sa-3', 'sa-4', 'sa-5']

/**
 * Check if a user is a senior/protected member
 */
function isSeniorMember(zoneId: string, groupId: string, userName: string): boolean {
  const lowerZoneId = (zoneId || '').toLowerCase()
  const lowerGroupId = (groupId || '').toLowerCase()
  const lowerName = (userName || '').toLowerCase()

  if (SENIOR_ZONES.includes(zoneId) || SENIOR_ZONES.includes(groupId)) {
    return true
  }

  for (const title of SENIOR_TITLES) {
    if (lowerZoneId.includes(title) || lowerGroupId.includes(title)) {
      return true
    }
  }

  if (lowerName.includes('the president') ||
    lowerName.includes('zone president') ||
    lowerName.includes('zone director') ||
    lowerName.includes('the director') ||
    lowerName.includes('zone oftp') ||
    lowerName === 'president' ||
    lowerName === 'director' ||
    lowerName === 'oftp') {
    return true
  }

  return false
}

/**
 * Search users across ALL zones with protected zone filtering
 */
export async function searchZoneUsers(
  searchTerm: string,
  currentUserId: string,
  currentUserZoneId?: string,
  isBoss: boolean = false,
  existingChatUserIds: string[] = []
): Promise<ChatUser[]> {
  try {
    const users: ChatUser[] = []
    const seenIds = new Set<string>()

    const isInSeniorZone = currentUserZoneId ?
      (SENIOR_ZONES.includes(currentUserZoneId) ||
        SENIOR_TITLES.some(title => currentUserZoneId.toLowerCase().includes(title))) : false

    const existingChatUsers = new Set(existingChatUserIds)

    // JWT API: profiles directory + HQ members (no Firestore)
    const [profilesRows, hqRows] = await Promise.all([
      apiProfilesDirectory(),
      apiHqMembers()
    ])

    const processMember = (data: Record<string, any>, preferGroupId: boolean) => {
      const uid = data.userId || data.user_id || data.id
      if (!uid || uid === currentUserId) return
      if (seenIds.has(uid)) return

      const memberZoneId = data.zoneId || data.zone_id || ''
      const memberGroupId = data.groupId || data.hqGroupId || data.hq_group_id || ''
      const name = (data.userName || data.user_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.name || data.email || '').trim()

      const isInProtectedZone = isSeniorMember(memberZoneId, memberGroupId, name)
      const hasExistingChat = existingChatUsers.has(uid)

      if (isInProtectedZone && !isInSeniorZone && !isBoss && !hasExistingChat) {
        return
      }

      const rawUsername = (data.username || data.user_name || data.alias || '').toString().replace(/^@/, '')
      const cleanTerm = (searchTerm || '').trim().replace(/^@/, '').toLowerCase()
      const username = rawUsername.toLowerCase()
      const email = String(data.email || '').toLowerCase()
      const lowerName = name.toLowerCase()

      const matchesSearch = !cleanTerm ||
        lowerName.includes(cleanTerm) ||
        (username && username.includes(cleanTerm)) ||
        (email && email.includes(cleanTerm))

      if (matchesSearch && name) {
        seenIds.add(uid)
        users.push({
          id: uid,
          name: name,
          username: rawUsername || undefined,
          email: data.email || undefined,
          designation: data.designation || undefined,
          avatar: data.photoURL || data.avatar || data.profileImage || data.profile_image_url || data.avatar_url,
          zoneId: preferGroupId ? (memberGroupId || memberZoneId) : (data.zoneId || memberZoneId),
          zoneName: data.groupName || data.zoneName || data.zone_name || data.zoneTitle
        })
      }
    }

    profilesRows.forEach((data) => processMember(data as Record<string, any>, false))
    hqRows.forEach((data) => processMember(data as Record<string, any>, true))

    users.sort((a, b) => a.name.localeCompare(b.name))
    return users.slice(0, 100)
  } catch (error) {
    console.error('[ChatService] searchZoneUsers error:', error)
    return []
  }
}

// CHAT OPERATIONS

/**
 * Find existing direct chat between two users
 */
export async function findDirectChat(user1Id: string, user2Id: string): Promise<Chat | null> {
  try {
    const rows = await apiListChats()
    for (const data of rows) {
      const participants = Array.isArray(data.participants) ? data.participants.map(String) : []
      if (
        data.type === 'direct' &&
        participants.includes(user1Id) &&
        participants.includes(user2Id) &&
        participants.length === 2
      ) {
        return rowToChat(data)
      }
    }
    return null
  } catch (error) {
    console.error('[ChatService] findDirectChat error:', error)
    return null
  }
}

/**
 * Create or get direct chat
 */
export async function getOrCreateDirectChat(
  currentUser: ChatUser,
  otherUser: ChatUser
): Promise<string | null> {
  try {
    if (currentUser.id === otherUser.id) return null

    const existing = await findDirectChat(currentUser.id, otherUser.id)
    if (existing) return existing.id

    const created = await apiCreateChat({
      type: 'direct',
      member_ids: [currentUser.id, otherUser.id],
    })
    return created?.id ?? null
  } catch (error) {
    console.error('[ChatService] getOrCreateDirectChat error:', error)
    return null
  }
}

/**
 * Create group chat
 */
export async function createGroupChat(
  name: string,
  creator: ChatUser,
  members: ChatUser[]
): Promise<string | null> {
  try {
    const allMembers = [creator, ...members.filter(m => m.id !== creator.id)]
    const created = await apiCreateChat({
      type: 'group',
      name,
      member_ids: allMembers.map((m) => m.id),
    })
    if (!created?.id) return null

    await apiSendMessage(created.id, {
      content: `${creator.name} created the group "${name}"`,
      type: 'system',
    })
    return created.id
  } catch (error) {
    console.error('[ChatService] createGroupChat error:', error)
    return null
  }
}

/**
 * Subscribe to user's chats — polls JWT API every 4 s with change detection
 */
export function subscribeToChats(
  userId: string,
  callback: (chats: Chat[]) => void
): () => void {
  let cancelled = false
  let lastHash = ''

  const load = async () => {
    try {
      const rows = await apiListChats()
      if (cancelled) return

      const chats: Chat[] = rows
        .map(row => rowToChat(row))
        .filter(chat => {
          if (userId && chat.participants.length > 0) {
            const isMember = chat.participants.includes(userId) || chat.createdBy === userId
            return isMember || chat.participants.length === 0
          }
          return true
        })

      chats.sort((a, b) => {
        const getChatTs = (c: Chat) => {
          const t = c.lastMessage?.timestamp || (c as any).lastTimestamp || (c as any).last_message_at || c.createdAt
          if (!t) return 0
          if (t instanceof Date) return isNaN(t.getTime()) ? 0 : t.getTime()
          const time = new Date(t).getTime()
          return isNaN(time) ? 0 : time
        }
        return getChatTs(b) - getChatTs(a)
      })

      const currentHash = JSON.stringify(chats.map(c => ({
        id: c.id,
        name: c.name,
        lm: c.lastMessage?.text,
        lmt: c.lastMessage?.timestamp,
        p: c.participants,
        u: c.unreadCount
      })))

      if (currentHash !== lastHash) {
        lastHash = currentHash
        callback(chats)
      }
    } catch (error) {
      console.error('[ChatService] subscribeToChats error:', error)
      if (!cancelled && !lastHash) callback([])
    }
  }

  load()
  const timer = setInterval(load, 4000)

  return () => {
    cancelled = true
    clearInterval(timer)
  }
}


// MESSAGE OPERATIONS

/**
 * Send message
 */
export async function sendMessage(
  chatId: string,
  sender: ChatUser,
  text: string,
  replyTo?: { id: string; text: string; senderName: string },
  media?: { type: 'image' | 'document' | 'voice'; url: string; name?: string; size?: number; mimeType?: string; duration?: number }
): Promise<boolean> {
  try {
    const content =
      text ||
      (media?.type === 'image'
        ? 'Image'
        : media?.type === 'document'
          ? 'Document'
          : media?.type === 'voice'
            ? 'Voice message'
            : '')
    if (!content) return false

    const msg = await apiSendMessage(chatId, {
      content: content.slice(0, 4000),
      type: media?.type || 'text',
      ...(media?.url ? { media_url: media.url } : {}),
      ...(replyTo?.id ? { reply_to: replyTo.id } : {}),
    })
    if (!msg) return false

    const chatData = await apiGetChat(chatId)
    if (chatData) {
      const participants = Array.isArray(chatData.participants) ? chatData.participants.map(String) : []
      const otherParticipants = participants.filter((id: string) => id !== sender.id)
      if (otherParticipants.length > 0) {
        const notifTitle = chatData.type === 'group' ? (chatData.name as string | undefined) : sender.name
        const notifBody = chatData.type === 'group' ? `${sender.name}: ${content.slice(0, 100)}` : content.slice(0, 100)
        sendChatNotification(otherParticipants, notifTitle || 'New Message', notifBody, chatId, sender.id, sender.name).catch(() => {})
      }
    }

    return true
  } catch (error) {
    console.error('[ChatService] sendMessage error:', error)
    return false
  }
}

/**
 * Forward a message
 */
export async function forwardMessage(
  targetChatId: string,
  sender: ChatUser | null,
  originalMessage: Message
): Promise<boolean> {
  try {
    const text = originalMessage.text || ''
    const voiceInput = originalMessage.voiceUrl
      ? { type: 'voice' as const, url: originalMessage.voiceUrl, duration: originalMessage.voiceDuration }
      : undefined
    const docInput = originalMessage.attachment
      ? { type: 'document' as const, url: originalMessage.attachment.url, name: originalMessage.attachment.name, size: originalMessage.attachment.size, mimeType: originalMessage.attachment.mimeType }
      : undefined
    const imageInput = originalMessage.imageUrl
      ? { type: 'image' as const, url: originalMessage.imageUrl }
      : undefined

    const media = voiceInput ?? docInput ?? imageInput

    // Use apiSendMessage directly so we get full field control
    const result = await apiSendMessage(targetChatId, {
      content: text || (media ? (media.type === 'image' ? 'Image' : media.type === 'document' ? 'Document' : 'Voice message') : ''),
      text: text || undefined,
      type: media?.type || 'text',
      ...(imageInput ? { imageUrl: imageInput.url } : {}),
      ...(docInput ? { attachment: { url: docInput.url, name: docInput.name, size: docInput.size, mimeType: docInput.mimeType } } : {}),
      ...(voiceInput ? { voiceUrl: voiceInput.url, voiceDuration: voiceInput.duration } : {}),
    })
    return !!result
  } catch (error) {
    console.error('[ChatService] forwardMessage error:', error)
    return false
  }
}

/**
 * Mark chat as read
 */
export async function markChatAsRead(chatId: string, _userId: string): Promise<boolean> {
  try {
    await apiClient.post(`/chats/${encodeURIComponent(chatId)}/read`)
    return true
  } catch {
    return false
  }
}

/**
 * Subscribe to messages — polls JWT API every 3 s with change detection
 */
export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
  let cancelled = false
  let lastHash = ''

  const load = async () => {
    try {
      const rows = await apiGetMessages(chatId)
      if (cancelled) return
      const msgs: Message[] = rows.map(row => rowToMessage(row)).filter(m => !m.deleted)
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      const currentHash = JSON.stringify(msgs.map(m => ({
        id: m.id,
        t: m.text,
        ts: m.timestamp,
        s: m.status,
        r: m.reactions,
        d: m.deleted,
        e: m.edited
      })))

      if (currentHash !== lastHash) {
        lastHash = currentHash
        callback(msgs)
      }
    } catch (error) {
      console.error('[ChatService] subscribeToMessages error:', error)
      if (!cancelled && !lastHash) callback([])
    }
  }

  load()
  const timer = setInterval(load, 3000)

  return () => {
    cancelled = true
    clearInterval(timer)
  }
}

// TYPING STATUS

/**
 * Set typing status
 */
export async function setTypingStatus(
  chatId: string,
  _userId: string,
  userName: string,
  status: 'typing' | 'recording_voice' | null,
): Promise<void> {
  try {
    await apiClient.post(`/chats/${encodeURIComponent(chatId)}/typing`, {
      status,
      userName,
    })
  } catch {}
}

/**
 * Subscribe to typing status
 */
export function subscribeToTyping(chatId: string, currentUserId: string, callback: (typingUsers: { userName: string, status: string }[]) => void): () => void {
  const activeUsers = new Map<string, { userName: string; status: string }>();
  const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const emit = () => callback(Array.from(activeUsers.values()));

  const unsubscribe = subscribeToWebSocket('typing', chatId, (data) => {
    const event = data as { userId?: string; userName?: string; status?: string };
    if (!event.userId || event.userId === currentUserId) return;

    const previousTimer = expiryTimers.get(event.userId);
    if (previousTimer) clearTimeout(previousTimer);

    if (!event.status) {
      activeUsers.delete(event.userId);
      expiryTimers.delete(event.userId);
      emit();
      return;
    }

    activeUsers.set(event.userId, { userName: event.userName || 'User', status: event.status });
    expiryTimers.set(event.userId, setTimeout(() => {
      activeUsers.delete(event.userId!);
      expiryTimers.delete(event.userId!);
      emit();
    }, 15000));
    emit();
  });

  return () => {
    unsubscribe();
    expiryTimers.forEach((timer) => clearTimeout(timer));
  };
}

// GROUP MANAGEMENT

export async function addGroupMembers(chatId: string, userId: string, newMembers: ChatUser[]): Promise<boolean> {
  try {
    const chat = await apiGetChat(chatId)
    if (!chat) return false
    const isAdmin = chat.createdBy === userId || (chat.admins || []).includes(userId)
    if (!isAdmin) return false

    const participants = [...(chat.participants || []).map(String)]
    const toAdd = newMembers.filter((m) => !participants.includes(m.id))
    if (toAdd.length === 0) return true

    const next = [...participants, ...toAdd.map((m) => m.id)]
    const updated = await apiPatchChat(chatId, { member_ids: next })
    if (!updated) return false

    const names = toAdd.map((m) => m.name).join(', ')
    await apiSendMessage(chatId, { content: `${names} added to the group`, type: 'system' })
    return true
  } catch {
    return false
  }
}

export async function removeGroupMember(chatId: string, userId: string, memberId: string): Promise<boolean> {
  try {
    const chat = await apiGetChat(chatId)
    if (!chat) return false
    if (!(chat.createdBy === userId || (chat.admins || []).includes(userId))) return false
    if (memberId === chat.createdBy) return false

    const details = { ...(chat.participantDetails || {}) }
    const name = details[memberId]?.name || 'Member'
    const participants = (chat.participants || []).map(String).filter((id) => id !== memberId)
    const admins = (chat.admins || []).map(String).filter((id) => id !== memberId)

    if (participants.length === 0) {
      return await apiDeleteChat(chatId)
    }

    const updated = await apiPatchChat(chatId, { member_ids: participants, admins })
    if (!updated) return false
    await apiSendMessage(chatId, { content: `${name} was removed`, type: 'system' })
    return true
  } catch {
    return false
  }
}

export async function leaveGroup(chatId: string, userId: string): Promise<boolean> {
  try {
    const chat = await apiGetChat(chatId)
    if (!chat) return false

    const details = { ...(chat.participantDetails || {}) }
    const name = details[userId]?.name || 'Member'
    const participants = (chat.participants || []).map(String).filter((id) => id !== userId)
    let admins = (chat.admins || []).map(String).filter((id) => id !== userId)

    if (participants.length === 0) {
      return await apiDeleteChat(chatId)
    }

    // If creator or only admin left, promote first remaining member to admin
    if (admins.length === 0 && participants.length > 0) {
      admins = [participants[0]]
    }

    const updated = await apiPatchChat(chatId, { member_ids: participants, admins })
    if (!updated) return false
    await apiSendMessage(chatId, { content: `${name} left`, type: 'system' })
    return true
  } catch {
    return false
  }
}

export async function deleteGroup(chatId: string, _userId?: string): Promise<boolean> {
  return await apiDeleteChat(chatId)
}

export async function deleteChat(chatId: string, _userId?: string): Promise<boolean> {
  return await apiDeleteChat(chatId)
}

export async function renameGroup(chatId: string, userId: string, newName: string): Promise<boolean> {
  try {
    const updated = await apiPatchChat(chatId, { name: newName })
    if (!updated) return false
    await apiSendMessage(chatId, { content: `Renamed to "${newName}"`, type: 'system' })
    return true
  } catch {
    return false
  }
}

export async function updateGroupDescription(
  chatId: string,
  _userId: string,
  desc: string,
): Promise<boolean> {
  try {
    const updated = await apiPatchChat(chatId, { description: desc })
    return !!updated
  } catch {
    return false
  }
}

export async function updateChatAvatar(
  chatId: string,
  _userId: string,
  url: string,
): Promise<boolean> {
  try {
    const updated = await apiPatchChat(chatId, { avatar: url })
    return !!updated
  } catch {
    return false
  }
}

export async function toggleGroupAdmin(
  chatId: string,
  _userId: string,
  targetId: string,
  status: boolean,
): Promise<boolean> {
  try {
    const chat = await apiGetChat(chatId)
    if (!chat) return false
    const currentAdmins = Array.isArray(chat.admins) ? chat.admins.map(String) : []
    const nextAdmins = status 
      ? Array.from(new Set([...currentAdmins, targetId]))
      : currentAdmins.filter(id => id !== targetId)
    
    const updated = await apiPatchChat(chatId, { admins: nextAdmins })
    return !!updated
  } catch {
    return false
  }
}

// PRESENCE, STARRING, PINNING

export async function pinMessage(chatId: string, messageId: string | null): Promise<boolean> {
  try {
    const updated = await apiPatchChat(chatId, { pinnedMessageId: messageId })
    return !!updated
  } catch {
    return false
  }
}

export async function togglePinChat(
  chatId: string,
  userId: string,
  pinned: boolean,
): Promise<boolean> {
  try {
    const updated = await apiPatchChat(chatId, { pinnedBy: { [userId]: pinned } } as any)
    return !!updated
  } catch {
    return false
  }
}

// LEGACY HELPERS (Firestore shape — kept for docToChat/docToMessage compatibility)

function docToChat(docSnap: any): Chat {
  const data = docSnap.data()
  return rowToChat({ id: docSnap.id, ...data })
}

function docToMessage(docSnap: any): Message {
  const data = docSnap.data()
  return rowToMessage({ id: docSnap.id, ...data })
}

export function toDate(timestamp: any): Date {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? new Date() : timestamp
  }
  if (typeof timestamp === 'object') {
    if (typeof timestamp.toDate === 'function') {
      const d = timestamp.toDate()
      if (d instanceof Date && !isNaN(d.getTime())) return d
    }
    if (typeof timestamp.toMillis === 'function') {
      const d = new Date(timestamp.toMillis())
      if (!isNaN(d.getTime())) return d
    }
    const sec = timestamp._seconds ?? timestamp.seconds
    if (sec !== undefined && sec !== null) {
      const s = Number(sec)
      const nano = Number(timestamp._nanoseconds ?? timestamp.nanoseconds ?? 0)
      if (!isNaN(s)) {
        return new Date(s * 1000 + Math.floor(nano / 1000000))
      }
    }
  }
  if (typeof timestamp === 'number') {
    if (timestamp > 1e11) return new Date(timestamp)
    if (timestamp > 1e8) return new Date(timestamp * 1000)
    const d = new Date(timestamp)
    return isNaN(d.getTime()) ? new Date() : d
  }
  if (typeof timestamp === 'string') {
    const num = Number(timestamp)
    if (!isNaN(num) && num > 1e8) {
      return num > 1e11 ? new Date(num) : new Date(num * 1000)
    }
    const d = new Date(timestamp)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

async function sendChatNotification(recipientIds: string[], title: string, body: string, chatId: string, senderId: string, senderName?: string): Promise<void> {
  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'chat', recipientIds, title, body, data: { chatId, senderName: senderName || 'Someone' }, excludeUserId: senderId })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.info(`[ChatService] Notification sent successfully to ${data.sentCount} tokens for ${recipientIds.length} recipients.`)
    } else {
      const errorText = await response.text()
      console.error('[ChatService] Notification API error:', errorText)
    }
  } catch (err) {
    console.error('[ChatService] Failed to call notification API:', err)
  }
}

export async function deleteMessage(
  messageId: string,
  _userId: string,
  _forEveryone: boolean = false,
  chatId?: string,
): Promise<boolean> {
  if (!chatId) return false
  return await apiDeleteMessage(chatId, messageId)
}

export async function toggleReaction(
  messageId: string,
  _userId: string,
  reaction: ReactionType,
  chatId?: string,
): Promise<boolean> {
  if (!chatId) return false
  return await apiToggleReaction(chatId, messageId, reaction)
}

export async function sendCallMessage(
  chatId: string,
  type: 'missed' | 'answered' | 'declined',
  caller: string,
  duration?: number,
): Promise<boolean> {
  try {
    const t =
      type === 'missed'
        ? `Missed call from ${caller}`
        : type === 'declined'
          ? 'Call declined'
          : `Voice call • ${duration ? formatCallDuration(duration) : '0:00'}`
    const msg = await apiSendMessage(chatId, { content: t, type: 'system' })
    return !!msg
  } catch {
    return false
  }
}

export async function editMessage(
  messageId: string,
  _userId: string,
  newText: string,
  chatId?: string,
): Promise<boolean> {
  if (!chatId) return false
  return await apiEditMessage(chatId, messageId, newText)
}

export async function clearChat(_chatId: string, _userId: string): Promise<boolean> {
  return true
}


