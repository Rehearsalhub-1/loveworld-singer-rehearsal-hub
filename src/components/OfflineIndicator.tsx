"use client";

// Offline Indicator - Shows offline status permanently, online status briefly


import React, { useState, useEffect } from 'react'

interface OfflineIndicatorProps {
  className?: string
}

import { memo } from 'react'

const OfflineIndicator = memo(function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [showOnlineNotification, setShowOnlineNotification] = useState(false)

  useEffect(() => {
    // Check initial connection status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setShowOnlineNotification(true)
      
      // Hide "Online" notification after 3 seconds
      setTimeout(() => {
        setShowOnlineNotification(false)
      }, 3000) // 3 seconds
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOnlineNotification(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Don't show anything if online and notification timeout has passed
  if (isOnline && !showOnlineNotification) {
    return null
  }

  return (
    <div className={`fixed top-2 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className={`px-3 py-1 rounded-full text-xs font-medium shadow-lg transition-all duration-300 ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}>
        {isOnline ? ' Online' : ' Offline'}
      </div>
    </div>
  )
})

export default OfflineIndicator
