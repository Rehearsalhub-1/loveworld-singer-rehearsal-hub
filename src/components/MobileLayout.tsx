"use client";

import { useState, useEffect } from 'react'

import { useAuth } from '@/hooks/useAuth'
// Subscription components removed

interface MobileLayoutProps {
  children: React.ReactNode
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const { user, profile, isLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  // Subscription state removed
  const [socialData, setSocialData] = useState<{
    socialProvider: string
    socialId: string
    firstName: string
    lastName: string
    email: string
  } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
        const checkMobile = () => {
      const userAgent = navigator.userAgent
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle authentication state changes
  useEffect(() => {
    // Don't wait for isLoading - auth store handles this now
    // Just mark as initialized immediately
    setIsInitialized(true)
    
    // MobileLayout is no longer responsible for auth flow
    // The main splash page (src/app/page.tsx) handles redirects
    // This component just renders children
  }, [])

  const handleSplashComplete = () => {
    setShowSplash(false)
    setShowAuth(true)
  }

  const handleAuthComplete = (socialData?: {
    socialProvider: string
    socialId: string
    firstName: string
    lastName: string
    email: string
  }) => {
    // Always go to main app after auth - no profile completion required
    setShowAuth(false)
    setShowProfileCompletion(false)
  }

  const handleProfileComplete = () => {
    setShowProfileCompletion(false)
    // Subscription removed - user goes directly to main app
  }

  const handleProfileBack = () => {
    setShowProfileCompletion(false)
    setShowAuth(true)
  }

  // Subscription functionality removed

  // No loading states - auth is handled by the main app flow
  // MobileLayout just provides mobile-optimized wrapper
  return (
    <div className={`min-h-screen ${isMobile ? 'mobile-optimized' : ''}`}>
      {children}
    </div>
  )
}
