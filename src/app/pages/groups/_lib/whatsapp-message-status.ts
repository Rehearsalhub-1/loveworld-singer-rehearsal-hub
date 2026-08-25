/**
 * Message status helpers — delivery/read writes deferred (no JWT message PATCH yet).
 * Subscribe kept as no-op until task 62 WebSocket.
 */

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface MessageStatusUpdate {
  messageId: string
  status: MessageStatus
  timestamp: Date
  userId?: string
}

export class WhatsAppMessageStatus {
  static async updateMessageStatus(
    _messageId: string,
    _status: MessageStatus,
    _userId?: string,
  ): Promise<void> {
    console.warn('[migration] updateMessageStatus — message status write not on JWT API yet')
  }

  static async markAsDelivered(messageId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'delivered')
  }

  static async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'read', userId)
  }

  static async markChatAsRead(_chatId: string, _userId: string): Promise<void> {
    console.warn('[migration] markChatAsRead — message status write not on JWT API yet')
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
