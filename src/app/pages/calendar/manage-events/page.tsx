"use client";

'use client'

import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ManageUpcomingEvents from '../_components/ManageUpcomingEvents'
import { ArrowLeft } from 'lucide-react'

export default function ManageEventsPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentZone, isLoading: zoneLoading } = useZone()
  const router = useRouter()

  const isAuthorized = profile?.role === 'admin' ||
    profile?.administration === 'Coordinator' ||
    profile?.administration === 'Assistant Coordinator'

  // Only redirect if definitely not authorized
  // Don't wait for authLoading - use cached profile for instant access
  useEffect(() => {
    // PageLoader already ensures user exists, just check authorization
    if (profile && !isAuthorized) {
      router.push('/pages/calendar')
    }
  }, [profile, isAuthorized, router])


  if (profile && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={() => router.push('/pages/calendar')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Event Management</h1>
              <p className="text-xs text-gray-500">Calendar Administration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        <ManageUpcomingEvents themeColor={currentZone?.themeColor || '#10b981'} />
      </div>
    </div>
  )
}
