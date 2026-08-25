/**
 * WhatsApp-Style Optimistic UI Updates
 * Shows messages immediately, then confirms with server
 */

import { ChatMessage } from './chat-types'
import { MessageStatus } from './whatsapp-message-status'

export interface OptimisticMessage extends Omit<ChatMessage, 'id'> {
  id: string
  isOptimistic: boolean
  tempId?: string
  retryCount?: number
  status?: MessageStatus
}

export class WhatsAppOptimisticUI {
  private static pendingMessages = new Map<string, OptimisticMessage>()
  private static messageCallbacks = new Map<string, (message: OptimisticMessage) => void>()
  
  /**
   * Create optimistic message (shows immediately in UI)
   */
  static createOptimisticMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    messageData: {
      text?: string
      image?: string
      fileUrl?: string
      fileName?: string
    }
  ): OptimisticMessage {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      chatId,
      senderId,
      senderName,
      messageType: messageData.image ? 'image' : messageData.fileUrl ? 'file' : 'text',
      timestamp: new Date(),
      edited: false,
      reactions: [],
      isOptimistic: true,
      retryCount: 0,
      ...messageData
    }
    
    this.pendingMessages.set(tempId, optimisticMessage)
    
    return optimisticMessage
  }
  
  /**
   * Update optimistic message status
   */
  static updateOptimisticMessage(
    tempId: string, 
    updates: Partial<OptimisticMessage>
  ): OptimisticMessage | null {
    const message = this.pendingMessages.get(tempId)
    if (!message) return null
    
    const updatedMessage = { ...message, ...updates }
    this.pendingMessages.set(tempId, updatedMessage)
    
    // Notify callback if exists
    const callback = this.messageCallbacks.get(tempId)
    if (callback) {
      callback(updatedMessage)
    }
    
    return updatedMessage
  }
  
  /**
   * Convert optimistic message to real message (when server confirms)
   */
  static confirmOptimisticMessage(
    tempId: string, 
    realMessageId: string,
    realMessage: ChatMessage
  ): void {
    const optimisticMessage = this.pendingMessages.get(tempId)
    if (!optimisticMessage) return
    
    // Remove from pending
    this.pendingMessages.delete(tempId)
    this.messageCallbacks.delete(tempId)
    
  }
  
  /**
   * Mark optimistic message as failed (for retry)
   */
  static markOptimisticMessageFailed(tempId: string, error?: string): OptimisticMessage | null {
    const message = this.pendingMessages.get(tempId)
    if (!message) return null
    
    const failedMessage = {
      ...message,
      status: 'failed' as MessageStatus,
      retryCount: (message.retryCount || 0) + 1,
      error
    }
    
    this.pendingMessages.set(tempId, failedMessage)
    
    return failedMessage
  }
  
  /**
   * Retry failed optimistic message
   */
  static retryOptimisticMessage(tempId: string): OptimisticMessage | null {
    const message = this.pendingMessages.get(tempId)
    if (!message) return null
    
    const retryMessage = {
      ...message,
      status: 'sending' as MessageStatus,
      timestamp: new Date()     }
    
    this.pendingMessages.set(tempId, retryMessage)
    
    return retryMessage
  }
  
  /**
   * Get all pending messages for a chat
   */
  static getPendingMessages(chatId: string): OptimisticMessage[] {
    return Array.from(this.pendingMessages.values())
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }
  
  /**
   * Subscribe to optimistic message updates
   */
  static subscribeToOptimisticMessage(
    tempId: string,
    callback: (message: OptimisticMessage) => void
  ): () => void {
    this.messageCallbacks.set(tempId, callback)
    
    return () => {
      this.messageCallbacks.delete(tempId)
    }
  }
  
  /**
   * Clear all optimistic messages (on logout or error)
   */
  static clearOptimisticMessages(): void {
    this.pendingMessages.clear()
    this.messageCallbacks.clear()
  }
  
  /**
   * Merge optimistic and real messages for UI display
   */
  static mergeMessagesForUI(
    realMessages: ChatMessage[],
    chatId: string
  ): (ChatMessage | OptimisticMessage)[] {
    const optimisticMessages = this.getPendingMessages(chatId)
    
    // Filter out optimistic messages that have been confirmed
    const pendingOptimistic = optimisticMessages.filter(opt => 
      !realMessages.some(real => 
        real.senderId === opt.senderId && 
        Math.abs(real.timestamp.getTime() - opt.timestamp.getTime()) < 5000 // 5 second window
      )
    )
    
    // Combine and sort by timestamp
    const allMessages = [...realMessages, ...pendingOptimistic]
    return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }
}
