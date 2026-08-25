/**
 * Presence System
 * Manages real-time online/offline status and last seen timestamps via WebSocket and REST API.
 */

import { subscribe } from '@/hooks/useWebSocket'
import { apiClient } from '@/lib/api-client'

export interface PresenceData {
  status: 'online' | 'offline'
  lastSeen: number
  userId: string
}

export class WhatsAppPresence {
  private static localPresence = new Map<string, PresenceData>()
  private static listeners = new Map<string, Set<(presence: PresenceData | null) => void>>()
  private static wsUnsubscribe: (() => void) | null = null
  private static isInitialized = false

  static initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return
    this.isInitialized = true

    // Fetch initial presence map from backend
    apiClient
      .get<{ data?: Record<string, { userId: string; isOnline: boolean; lastSeen: number }> }>('/chats/presence')
      .then((res) => {
        const data = res?.data || (res as any)
        if (data && typeof data === 'object') {
          for (const [uid, item] of Object.entries(data)) {
            if (item && typeof item === 'object') {
              const entry = item as Record<string, any>
              const pData: PresenceData = {
                userId: uid,
                status: entry.isOnline ? 'online' : 'offline',
                lastSeen: typeof entry.lastSeen === 'number' ? entry.lastSeen : new Date(entry.lastSeen).getTime() || Date.now(),
              }
              this.localPresence.set(uid, pData)
              this.notify(uid, pData)
            }
          }
        }
      })
      .catch(() => {
        // Silently fail if not logged in yet
      })

    // Listen to WebSocket presence events for all users
    this.wsUnsubscribe = subscribe('presence', 'all', (eventData: any) => {
      if (!eventData) return

      // Handle batch or single presence event
      if (eventData.userId) {
        const uid = String(eventData.userId)
        const pData: PresenceData = {
          userId: uid,
          status: eventData.isOnline ? 'online' : 'offline',
          lastSeen: typeof eventData.lastSeen === 'number' ? eventData.lastSeen : new Date(eventData.lastSeen).getTime() || Date.now(),
        }
        this.localPresence.set(uid, pData)
        this.notify(uid, pData)
      } else if (typeof eventData === 'object') {
        for (const [uid, item] of Object.entries(eventData)) {
          if (item && typeof item === 'object') {
            const pData: PresenceData = {
              userId: uid,
              status: (item as any).isOnline ? 'online' : 'offline',
              lastSeen: typeof (item as any).lastSeen === 'number' ? (item as any).lastSeen : new Date((item as any).lastSeen).getTime() || Date.now(),
            }
            this.localPresence.set(uid, pData)
            this.notify(uid, pData)
          }
        }
      }
    })
  }

  static async initializePresence(userId: string): Promise<void> {
    this.initialize()
    const data: PresenceData = { status: 'online', lastSeen: Date.now(), userId }
    this.localPresence.set(userId, data)
    this.notify(userId, data)
  }
  
  static async updateStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
    const data: PresenceData = { status, lastSeen: Date.now(), userId }
    this.localPresence.set(userId, data)
    this.notify(userId, data)
  }

  static subscribeToPresence(
    userIds: string[], 
    callback: (presenceMap: Map<string, PresenceData>) => void
  ): () => void {
    this.initialize()

    const buildCurrentMap = () => {
      const map = new Map<string, PresenceData>()
      userIds.forEach((uid) => {
        map.set(uid, this.localPresence.get(uid) || {
          status: 'offline',
          lastSeen: Date.now(),
          userId: uid,
        })
      })
      return map
    }

    callback(buildCurrentMap())

    const handler = () => {
      callback(buildCurrentMap())
    }

    userIds.forEach((uid) => {
      let set = this.listeners.get(uid)
      if (!set) {
        set = new Set()
        this.listeners.set(uid, set)
      }
      set.add(handler)
    })

    return () => {
      userIds.forEach((uid) => {
        this.listeners.get(uid)?.delete(handler)
      })
    }
  }

  static async getUserPresence(userId: string): Promise<PresenceData> {
    this.initialize()
    if (this.localPresence.has(userId)) {
      return this.localPresence.get(userId)!
    }

    try {
      const res = await apiClient.get<{ data?: { isOnline: boolean; lastSeen: number } }>(`/chats/presence/${encodeURIComponent(userId)}`)
      const raw = res?.data || (res as any)
      if (raw) {
        const data: PresenceData = {
          userId,
          status: raw.isOnline ? 'online' : 'offline',
          lastSeen: typeof raw.lastSeen === 'number' ? raw.lastSeen : new Date(raw.lastSeen).getTime() || Date.now(),
        }
        this.localPresence.set(userId, data)
        return data
      }
    } catch {
      // Return default offline if endpoint unreachable
    }

    return {
      status: 'offline',
      lastSeen: Date.now(),
      userId,
    }
  }

  static async cleanup(userId: string): Promise<void> {
    await this.updateStatus(userId, 'offline')
  }

  private static notify(userId: string, data: PresenceData) {
    this.listeners.get(userId)?.forEach((cb) => cb(data))
  }
}
