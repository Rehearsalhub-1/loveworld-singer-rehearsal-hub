"use client";

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface NotificationData {
  title: string | null
  body: string | null
  timestamp: string | null
  tapped: boolean
  data: Record<string, string>
}

export default function NotificationUrlHandler() {
  const router = useRouter()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Check for notification in URL params
    const urlParams = new URLSearchParams(window.location.search)

    if (urlParams.get('notification') === 'true') {
      const notificationData: NotificationData = {
        title: urlParams.get('title'),
        body: urlParams.get('body'),
        timestamp: urlParams.get('timestamp'),
        tapped: urlParams.get('tapped') === 'true',
        // Extract custom data
        data: {}
      }

      // Get all data_* params
      urlParams.forEach((value, key) => {
        if (key.startsWith('data_')) {
          notificationData.data[key.replace('data_', '')] = value
        }
      })

      // Handle the notification
      handleNotification(notificationData)

      // Clean up URL (optional)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [router])

  const handleNotification = (notificationData: NotificationData) => {

    // Handle navigation if URL is provided in data
    if (notificationData.data.url) {
      try {
        // If it's a relative URL, use Next.js router
        if (notificationData.data.url.startsWith('/')) {
          router.push(notificationData.data.url)
        } else {
          // If it's an absolute URL, navigate to it
          window.location.href = notificationData.data.url
        }
      } catch (error) {
 console.error('Error navigating to notification URL:', error)
      }
    }

    // Handle different notification types
    if (notificationData.data.type) {
      switch (notificationData.data.type) {
        case 'rehearsal':
          // Navigate to rehearsals page or specific rehearsal
          if (notificationData.data.rehearsalId) {
            router.push(`/pages/rehearsals?id=${notificationData.data.rehearsalId}`)
          } else {
            router.push('/pages/rehearsals')
          }
          break

        case 'praise_night':
          // Navigate to praise night page
          if (notificationData.data.praiseNightId) {
            router.push(`/pages/praise-night?id=${notificationData.data.praiseNightId}`)
          } else {
            router.push('/pages/praise-night')
          }
          break

        case 'media':
          // Navigate to media page or specific media
          if (notificationData.data.mediaId) {
            router.push(`/pages/media/player/${notificationData.data.mediaId}`)
          } else {
            router.push('/pages/media')
          }
          break

        case 'group':
          // Navigate to groups page or specific group
          if (notificationData.data.groupId) {
            router.push(`/pages/groups/${notificationData.data.groupId}`)
          } else {
            router.push('/pages/groups')
          }
          break

        case 'message':
          // Navigate to messages/chat
          if (notificationData.data.conversationId) {
            router.push(`/pages/groups?conversation=${notificationData.data.conversationId}`)
          } else {
            router.push('/pages/groups')
          }
          break

        case 'announcement':
          // Navigate to notifications page
          router.push('/pages/notifications')
          break

        default:
          // Default: just log the notification
      }
    }

    // Optional: Show a toast or notification banner
    if (notificationData.title && notificationData.body) {
      // You can integrate with a toast library here
      // For now, we'll just log it
    }

    // Track notification open event (for analytics)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'notification_opened', {
        notification_title: notificationData.title,
        notification_type: notificationData.data.type,
        tapped: notificationData.tapped
      })
    }
  }

  return null
}













