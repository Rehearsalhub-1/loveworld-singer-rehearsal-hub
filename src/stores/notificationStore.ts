/**
 * NOTIFICATION STORE — Centralized Notification State
 *
 * Realtime is now handled via WebSocket subscriptions.
 * One-time API fetches replace all Firestore onSnapshot listeners.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { apiClient } from '@/lib/api-client'
import { subscribe } from '@/hooks/useWebSocket'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationData {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: 'rehearsal' | 'announcement' | 'reminder' | 'system' | 'admin' | 'song' | 'praise_night'
  priority: 'low' | 'medium' | 'high'
  sender_id?: string
  sender_name?: string
  action_url?: string
  created_at: string
  read_at?: string
  is_read: boolean
  target_audience: 'all' | 'group' | 'individual'
  target_group?: string
  target_user_id?: string
  zoneId?: string
}

interface NotificationState {
  // Badge counts
  chatUnreadCount: number
  hasNewZoneMessage: boolean
  hasNewMedia: boolean
  hasNewCalendar: boolean
  hasUpcomingBirthday: boolean
  hasUnseenBirthday: boolean

  // Full notification list (from notifications collection)
  notifications: NotificationData[]
  notificationsLoading: boolean

  // Subscription tracking (prevent duplicate listeners)
  _currentUserId: string | null
  _currentZoneId: string | null
  _chatUnsub: (() => void) | null
  _notifUnsub: (() => void) | null

  // Actions
  initialize: (userId: string, zoneId: string, userProfile?: any) => void
  cleanup: () => void
  markAsSeen: () => void
  markMediaSeen: (userId: string) => void
  markCalendarSeen: (userId: string) => void

  // Notification CRUD (previously in useRealtimeNotifications)
  markAsRead: (notificationId: string, userId: string) => Promise<boolean>
  markAllAsRead: (userId: string) => Promise<boolean>
  deleteNotification: (notificationId: string, userId: string) => Promise<boolean>
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    chatUnreadCount: 0,
    hasNewZoneMessage: false,
    hasNewMedia: false,
    hasNewCalendar: false,
    hasUpcomingBirthday: false,
    hasUnseenBirthday: false,
    notifications: [],
    notificationsLoading: false,
    _currentUserId: null,
    _currentZoneId: null,
    _chatUnsub: null,
    _notifUnsub: null,

    // ── Initialize (called from AppBootstrap when user + zone are ready) ───────
    initialize: (userId: string, zoneId: string, userProfile?: any) => {
      const { _currentUserId, _currentZoneId, _chatUnsub, _notifUnsub } = get()

      // Skip if already subscribed for same user+zone
      if (_currentUserId === userId && _currentZoneId === zoneId) return

      // Tear down old subscriptions before creating new ones
      if (_chatUnsub) _chatUnsub()
      if (_notifUnsub) _notifUnsub()

      set({
        _currentUserId: userId,
        _currentZoneId: zoneId,
        notificationsLoading: true,
      })

      // ── Helper: fetch chat unread counts via API ──────────────────────────
      const fetchChatUnread = async () => {
        try {
          const res = await apiClient.get<{ success: boolean; data?: any[] }>('/chats')
          if (res.success && Array.isArray(res.data)) {
            let total = 0
            res.data.forEach((chat: any) => {
              total += chat.unreadCount?.[userId] || 0
            })
            set({ chatUnreadCount: total })
          }
        } catch (e) {
          console.error('[NotificationStore] Chat unread fetch error:', e)
        }
      }

      // ── Helper: fetch notifications via API ───────────────────────────────
      const fetchNotifications = async () => {
        try {
          const storageKey = `lastSeenNotifications_${userId}`
          const lastSeen = parseInt(
            (typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null) || '0',
            10
          )

          const res = await apiClient.get<{ success: boolean; data?: NotificationData[] }>('/notifications')
          if (!res.success || !Array.isArray(res.data)) {
            set({ notificationsLoading: false })
            return
          }

          const enriched = res.data
          const hasNew = enriched.some((n) => {
            const t = new Date(n.created_at || 0).getTime()
            return t > lastSeen && !n.is_read
          })

          set({ notifications: enriched, notificationsLoading: false, hasNewZoneMessage: hasNew })
        } catch (e) {
          console.error('[NotificationStore] Notifications fetch error:', e)
          set({ notificationsLoading: false })
        }
      }

      // Initial fetches
      fetchChatUnread()
      fetchNotifications()

      // ── WebSocket subscriptions ───────────────────────────────────────────
      const chatUnsub = typeof window !== 'undefined' && typeof subscribe === 'function'
        ? subscribe('chats', userId, () => { fetchChatUnread() })
        : null
      const notifUnsub = typeof window !== 'undefined' && typeof subscribe === 'function'
        ? subscribe('notifications', userId, () => { fetchNotifications() })
        : null

      // ── (3) Media / Calendar — JWT routes not available yet ───────────────
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`currentMediaItems_${userId}`, JSON.stringify([]))
        localStorage.setItem(`currentCalendarEvents_${userId}`, JSON.stringify([]))
      }
      set({ hasNewMedia: false, hasNewCalendar: false })

      set({ _chatUnsub: chatUnsub, _notifUnsub: notifUnsub })
    },

    // ── Cleanup ───────────────────────────────────────────────────────────────
    cleanup: () => {
      const { _chatUnsub, _notifUnsub } = get()
      if (_chatUnsub) _chatUnsub()
      if (_notifUnsub) _notifUnsub()
      set({
        chatUnreadCount: 0,
        hasNewZoneMessage: false,
        hasNewMedia: false,
        hasNewCalendar: false,
        notifications: [],
        _currentUserId: null,
        _currentZoneId: null,
        _chatUnsub: null,
        _notifUnsub: null,
      })
    },

    // ── Mark notification seen (bell click) ───────────────────────────────────
    markAsSeen: () => {
      const { _currentUserId } = get()
      if (_currentUserId) {
        const storageKey = `lastSeenNotifications_${_currentUserId}`
        localStorage.setItem(storageKey, Date.now().toString())
      }
      set({ hasNewZoneMessage: false })
    },

    // ── Mark media seen ───────────────────────────────────────────────────────
    markMediaSeen: (userId: string) => {
      const currentStr = localStorage.getItem(`currentMediaItems_${userId}`) || '[]'
      const seenStr = localStorage.getItem(`seenMediaItems_${userId}`) || '[]'
      const current: string[] = JSON.parse(currentStr)
      const seen: string[] = JSON.parse(seenStr)
      const merged = [...new Set([...seen, ...current])].slice(-100)
      localStorage.setItem(`seenMediaItems_${userId}`, JSON.stringify(merged))
      localStorage.setItem(`lastSeenMedia_${userId}`, Date.now().toString())
      set({ hasNewMedia: false })
    },

    // ── Mark calendar seen ────────────────────────────────────────────────────
    markCalendarSeen: (userId: string) => {
      const currentStr = localStorage.getItem(`currentCalendarEvents_${userId}`) || '[]'
      const seenStr = localStorage.getItem(`seenCalendarEvents_${userId}`) || '[]'
      const current: string[] = JSON.parse(currentStr)
      const seen: string[] = JSON.parse(seenStr)
      const merged = [...new Set([...seen, ...current])].slice(-100)
      localStorage.setItem(`seenCalendarEvents_${userId}`, JSON.stringify(merged))
      localStorage.setItem(`lastSeenCalendar_${userId}`, Date.now().toString())
      localStorage.setItem(`lastSeenBirthday_${userId}`, new Date().toDateString())
      set({ hasNewCalendar: false, hasUnseenBirthday: false })
    },

    // ── markAsRead (single notification) ─────────────────────────────────────
    markAsRead: async (notificationId: string, _userId: string) => {
      try {
        await apiClient.post('/notifications/mark-read', { notificationId })
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n,
          ),
        }))
        return true
      } catch (err) {
        console.error('[NotificationStore] markAsRead failed:', err)
        return false
      }
    },

    // ── markAllAsRead ──────────────────────────────────────────────────────────
    markAllAsRead: async (_userId: string) => {
      const { notifications } = get()
      const unread = notifications.filter((n) => !n.is_read)
      if (unread.length === 0) return true

      try {
        await apiClient.post('/notifications/mark-all-read', {})
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            is_read: true,
            read_at: new Date().toISOString(),
          })),
        }))
        return true
      } catch (err) {
        console.error('[NotificationStore] markAllAsRead failed:', err)
        return false
      }
    },

    // ── deleteNotification ────────────────────────────────────────────────────
    deleteNotification: async (notificationId: string, userId: string) => {
      try {
        await get().markAsRead(notificationId, userId)
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== notificationId),
        }))
        return true
      } catch (err) {
        console.error('[NotificationStore] deleteNotification failed:', err)
        return false
      }
    },
  }))
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectChatUnreadCount = (s: NotificationState) => s.chatUnreadCount
export const selectHasUnread = (s: NotificationState) =>
  s.chatUnreadCount > 0 || s.hasNewZoneMessage
export const selectHasNewMedia = (s: NotificationState) => s.hasNewMedia
export const selectHasNewCalendar = (s: NotificationState) =>
  s.hasNewCalendar || s.hasUnseenBirthday
export const selectNotifications = (s: NotificationState) => s.notifications
export const selectNotificationsLoading = (s: NotificationState) => s.notificationsLoading

// ─── Drop-in hook replacement for useUnreadNotifications ─────────────────────
export function useUnreadNotifications() {
  const chatUnreadCount = useNotificationStore(selectChatUnreadCount)
  const hasUnread = useNotificationStore(selectHasUnread)
  const hasNewZoneMessage = useNotificationStore((s) => s.hasNewZoneMessage)
  const hasNewMedia = useNotificationStore(selectHasNewMedia)
  const hasNewCalendar = useNotificationStore(selectHasNewCalendar)
  const hasUpcomingBirthday = useNotificationStore((s) => s.hasUpcomingBirthday)
  const markAsSeen = useNotificationStore((s) => s.markAsSeen)
  const markMediaSeen = useNotificationStore((s) => s.markMediaSeen)
  const markCalendarSeen = useNotificationStore((s) => s.markCalendarSeen)

  const userId = useNotificationStore((s) => s._currentUserId) || ''

  return {
    unreadCount: chatUnreadCount,
    hasUnread,
    hasNewZoneMessage,
    hasNewMedia,
    hasNewCalendar,
    hasUpcomingBirthday,
    markAsSeen,
    markMediaSeen: () => markMediaSeen(userId),
    markCalendarSeen: () => markCalendarSeen(userId),
  }
}

// ─── Drop-in hook replacement for useRealtimeNotifications ───────────────────
export function useRealtimeNotifications() {
  const notifications = useNotificationStore(selectNotifications)
  const loading = useNotificationStore(selectNotificationsLoading)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const deleteNotification = useNotificationStore((s) => s.deleteNotification)
  const userId = useNotificationStore((s) => s._currentUserId) || ''

  return {
    notifications,
    loading,
    error: null,
    markAsRead: (id: string) => markAsRead(id, userId),
    markAllAsRead: () => markAllAsRead(userId),
    deleteNotification: (id: string) => deleteNotification(id, userId),
    refresh: async () => {}, // handled by realtime listener
  }
}

// ─── Admin actions for creating notifications ─────────────────────────────────
export function useNotificationActions() {
  const zoneId = useNotificationStore((s) => s._currentZoneId) || ''

  const createNotificationForAll = async (data: {
    title: string
    message: string
    type: string
    category: string
    priority: string
  }) => {
    return apiClient.post('/notifications/broadcast', {
      ...data,
      targetAudience: 'all',
      targetZoneId: zoneId || null,
    })
  }

  const createNotificationForGroup = async (data: {
    title: string
    message: string
    groupName: string
    type: string
    category: string
    priority: string
  }) => {
    return apiClient.post('/notifications/broadcast', {
      ...data,
      targetAudience: 'group',
      targetGroup: data.groupName,
      targetZoneId: zoneId || null,
    })
  }

  return { createNotificationForAll, createNotificationForGroup }
}

