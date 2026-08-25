"use client";

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface OnboardingTourProps {
  forceShow?: boolean
  onComplete?: () => void
}

export default function OnboardingTour({ forceShow = false, onComplete }: OnboardingTourProps) {
  const { user, profile } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user || !profile) return

      if (forceShow) {
        setShowWelcome(true)
        return
      }

      const hasSeenTour = profile.has_seen_onboarding_tour || false
      if (!hasSeenTour) {
        setTimeout(() => {
          setShowWelcome(true)
        }, 1500)
      }
    }

    checkTourStatus()
  }, [user, profile, forceShow])

  const handleDismiss = async () => {
    setShowWelcome(false)
    if (onComplete) {
      onComplete()
    }
  }

  if (!showWelcome) return null

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to LWSRH!</h2>
          <p className="text-sm text-gray-600 mb-4">
            Your complete platform for managing praise and worship rehearsals. Explore the features and enjoy!
          </p>
          <button
            onClick={handleDismiss}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </div>
      </div>
    </>
  )
}
