/**
 * JWT API helpers for chat one-shot reads (no Firestore getDoc/getDocs).
 */
import { apiClient } from '@/lib/api-client'

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string }

export type ChatRow = Record<string, unknown> & {
  id: string
  type?: string
  participants?: string[]
  participantDetails?: Record<string, { name: string; avatar?: string }>
  admins?: string[]
  createdBy?: string
  name?: string
  unreadCount?: Record<string, number>
  lastMessage?: Record<string, unknown>
}

export type MessageRow = Record<string, unknown> & {
  id: string
  chatId?: string
  senderId?: string
  text?: string
  reactions?: unknown
  deleted?: boolean
  status?: string
}

export async function apiGetChat(chatId: string): Promise<ChatRow | null> {
  try {
    const res = await apiClient.get<ApiEnvelope<ChatRow>>(`/chats/${encodeURIComponent(chatId)}`)
    if (!res.data || typeof res.data !== 'object') return null
    return { ...res.data, id: res.data.id || chatId }
  } catch (err) {
    console.warn('[chat-api] getChat failed', chatId, err)
    return null
  }
}

export async function apiListChats(): Promise<ChatRow[]> {
  try {
    const res = await apiClient.get<ApiEnvelope<ChatRow[]>>('/chats')
    const rows = Array.isArray(res.data) ? res.data : []
    return rows.map((r) => ({ ...r, id: String(r.id) }))
  } catch (err) {
    console.warn('[chat-api] listChats failed', err)
    return []
  }
}

export async function apiGetMessages(chatId: string): Promise<MessageRow[]> {
  try {
    const res = await apiClient.get<ApiEnvelope<MessageRow[]>>(
      `/chats/${encodeURIComponent(chatId)}/messages`,
    )
    const rows = Array.isArray(res.data) ? res.data : []
    return rows.map((r) => ({ ...r, id: String(r.id) }))
  } catch (err) {
    console.warn('[chat-api] getMessages failed', chatId, err)
    return []
  }
}

export async function apiFindMessage(
  messageId: string,
  hintChatId?: string,
): Promise<MessageRow | null> {
  if (hintChatId) {
    const msgs = await apiGetMessages(hintChatId)
    return msgs.find((m) => m.id === messageId) ?? null
  }
  const chats = await apiListChats()
  for (const chat of chats) {
    const msgs = await apiGetMessages(String(chat.id))
    const found = msgs.find((m) => m.id === messageId)
    if (found) return found
  }
  return null
}

export async function apiGetProfile(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await apiClient.get<ApiEnvelope<Record<string, unknown>>>(
      `/profiles/${encodeURIComponent(userId)}`,
    )
    return res.data && typeof res.data === 'object' ? res.data : null
  } catch {
    return null
  }
}

export async function apiMembersByUser(
  userId: string,
): Promise<{ zoneMembers: Record<string, unknown>[]; hqMembers: Record<string, unknown>[] }> {
  try {
    const res = await apiClient.get<
      ApiEnvelope<{ zoneMembers?: Record<string, unknown>[]; hqMembers?: Record<string, unknown>[] }>
    >(`/members/by-user/${encodeURIComponent(userId)}`)
    return {
      zoneMembers: Array.isArray(res.data?.zoneMembers) ? res.data.zoneMembers : [],
      hqMembers: Array.isArray(res.data?.hqMembers) ? res.data.hqMembers : [],
    }
  } catch {
    return { zoneMembers: [], hqMembers: [] }
  }
}

export async function apiZoneMembers(zoneId: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await apiClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      `/members/zone/${encodeURIComponent(zoneId)}`,
    )
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

export async function apiHqMembers(): Promise<Record<string, unknown>[]> {
  try {
    const res = await apiClient.get<ApiEnvelope<Record<string, unknown>[]>>('/members/hq')
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

export async function apiProfilesDirectory(): Promise<Record<string, unknown>[]> {
  try {
    const res = await apiClient.get<ApiEnvelope<Record<string, unknown>[]>>('/profiles/directory')
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}
