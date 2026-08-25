/**
 * Chat domain types for Portal groups UI (JWT API backed).
 */

export interface ChatUser {
  id: string
  email: string
  fullName: string
  firstName?: string
  lastName?: string
  profilePic?: string
  isOnline: boolean
  lastSeen: Date
  zoneId?: string
  zoneName?: string
}

export interface MessageReaction {
  userId: string
  userName: string
  emoji: string
  timestamp: Date
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  text?: string
  image?: string
  fileUrl?: string
  fileName?: string
  messageType: 'text' | 'image' | 'file' | 'system'
  timestamp: Date
  edited: boolean
  editedAt?: Date
  reactions: MessageReaction[]
  replyTo?: string
  replySnippet?: string
  replySenderName?: string
  deleted?: boolean
}

export interface Chat {
  id: string
  type: 'direct' | 'group'
  name?: string
  description?: string
  avatar?: string
  participants: string[]
  participantNames?: { [userId: string]: string }
  admins: string[]
  createdBy: string
  createdAt: Date
  lastMessage?: {
    text: string
    senderId: string
    senderName: string
    timestamp: Date
  }
  unreadCount: { [userId: string]: number }
  isActive: boolean
  pinned?: { [userId: string]: boolean }
  starred?: { [userId: string]: boolean }
}

export interface FriendRequest {
  id: string
  fromUserId: string
  fromUserName: string
  fromUserAvatar?: string
  toUserId: string
  toUserName: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: Date
}

/** Normalize API / legacy timestamp shapes to Date. */
export function formatTimestamp(timestamp: unknown): Date {
  try {
    if (
      timestamp &&
      typeof timestamp === 'object' &&
      'toDate' in timestamp &&
      typeof (timestamp as { toDate: () => Date }).toDate === 'function'
    ) {
      return (timestamp as { toDate: () => Date }).toDate()
    }
    if (
      timestamp &&
      typeof timestamp === 'object' &&
      'seconds' in timestamp &&
      typeof (timestamp as { seconds: number }).seconds === 'number'
    ) {
      return new Date((timestamp as { seconds: number }).seconds * 1000)
    }
    if (timestamp instanceof Date) return timestamp
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp)
    }
    return new Date()
  } catch {
    return new Date()
  }
}
