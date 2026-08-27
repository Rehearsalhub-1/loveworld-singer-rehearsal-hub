import { apiClient } from '@/lib/api-client'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface MessageStatusUpdate {
  messageId: string
  status: MessageStatus
  timestamp: Date
  userId?: string
}

export class WhatsAppMessageStatus {
  static async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    _userId?: string,
  ): Promise<void> {
    if (status !== 'delivered' && status !== 'read') return
    await apiClient.patch(`/chats/messages/${encodeURIComponent(messageId)}/status`, { status })
  }

  static async markAsDelivered(messageId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'delivered')
  }

  static async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'read', userId)
  }

  static async markChatAsRead(chatId: string, _userId: string): Promise<void> {
    await apiClient.post(`/chats/${encodeURIComponent(chatId)}/read`, {})
  }

  static subscribeToMessageStatus(
    _messageId: string,
    callback: (status: MessageStatus) => void,
  ): () => void {
    console.warn('[migration] subscribeToMessageStatus — use WebSocket (task 62)')
    callback('sent')
    return () => {}
  }

  static getStatusIcon(status: MessageStatus): string {
    switch (status) {
      case 'sending':
        return '🕐'
      case 'sent':
        return '✓'
      case 'delivered':
        return '✓✓'
      case 'read':
        return '✓✓'
      case 'failed':
        return '❌'
      default:
        return '✓'
    }
  }

  static getStatusColor(status: MessageStatus): string {
    switch (status) {
      case 'sending':
        return 'text-gray-400'
      case 'sent':
        return 'text-gray-400'
      case 'delivered':
        return 'text-gray-400'
      case 'read':
        return 'text-blue-500'
      case 'failed':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }
}
