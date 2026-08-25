/**
 * JWT API helpers for chat writes (no Firestore addDoc/updateDoc/setDoc/deleteDoc).
 */
import { apiClient } from '@/lib/api-client'
import type { ChatRow, MessageRow } from './chat-api-helpers'

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string }

export type CreateChatInput = {
  type: string
  member_ids: string[]
  name?: string
  zone_id?: string
}

export type PatchChatInput = {
  name?: string
  avatar?: string
  description?: string
  admins?: string[]
  pinnedMessageId?: string | null
  last_message?: string
  last_message_at?: string
  member_ids?: string[]
}

export type SendMessageInput = {
  content: string
  text?: string
  type?: string
  media_url?: string
  imageUrl?: string
  attachment?: any
  voiceUrl?: string
  voiceDuration?: number
  reply_to?: string
  replyTo?: any
}

export async function apiCreateChat(input: CreateChatInput): Promise<ChatRow | null> {
  try {
    const res = await apiClient.post<ApiEnvelope<ChatRow>>('/chats', {
      type: input.type,
      member_ids: input.member_ids,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.zone_id !== undefined ? { zone_id: input.zone_id } : {}),
    })
    if (!res.data || typeof res.data !== 'object') return null
    return { ...res.data, id: String(res.data.id) }
  } catch (err) {
    console.warn('[chat-api] createChat failed', err)
    return null
  }
}

export async function apiPatchChat(chatId: string, input: PatchChatInput): Promise<ChatRow | null> {
  try {
    const res = await apiClient.patch<ApiEnvelope<ChatRow>>(
      `/chats/${encodeURIComponent(chatId)}`,
      input,
    )
    if (!res.data || typeof res.data !== 'object') return null
    return { ...res.data, id: String(res.data.id || chatId) }
  } catch (err) {
    console.warn('[chat-api] patchChat failed', chatId, err)
    return null
  }
}

export async function apiDeleteChat(chatId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/chats/${encodeURIComponent(chatId)}`)
    return true
  } catch (err) {
    console.warn('[chat-api] deleteChat failed', chatId, err)
    return false
  }
}

export async function apiSendMessage(
  chatId: string,
  input: SendMessageInput,
): Promise<MessageRow | null> {
  try {
    const res = await apiClient.post<ApiEnvelope<MessageRow>>(
      `/chats/${encodeURIComponent(chatId)}/messages`,
      {
        text: input.text || input.content,
        content: input.content || input.text,
        type: input.type ?? 'text',
        ...(input.media_url || input.imageUrl ? { imageUrl: input.imageUrl || input.media_url } : {}),
        ...(input.attachment ? { attachment: input.attachment } : {}),
        ...(input.voiceUrl ? { voiceUrl: input.voiceUrl } : {}),
        ...(input.voiceDuration ? { voiceDuration: input.voiceDuration } : {}),
        ...(input.reply_to || input.replyTo ? { replyTo: input.replyTo || input.reply_to } : {}),
      },
    )
    if (!res.data || typeof res.data !== 'object') return null
    return { ...res.data, id: String(res.data.id) }
  } catch (err) {
    console.warn('[chat-api] sendMessage failed', chatId, err)
    return null
  }
}

export async function apiToggleReaction(
  chatId: string,
  messageId: string,
  reaction: string,
): Promise<boolean> {
  try {
    await apiClient.post(`/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/reactions`, {
      reaction,
    })
    return true
  } catch (err) {
    console.warn('[chat-api] toggleReaction failed', err)
    return false
  }
}

export async function apiEditMessage(
  chatId: string,
  messageId: string,
  text: string,
): Promise<boolean> {
  try {
    await apiClient.patch(`/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`, {
      text,
    })
    return true
  } catch (err) {
    console.warn('[chat-api] editMessage failed', err)
    return false
  }
}

export async function apiDeleteMessage(
  chatId: string,
  messageId: string,
): Promise<boolean> {
  try {
    await apiClient.delete(`/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`)
    return true
  } catch (err) {
    console.warn('[chat-api] deleteMessage failed', err)
    return false
  }
}

