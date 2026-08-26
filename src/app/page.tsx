"use client";

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { NavigationManager } from '@/utils/navigation'
import { AUTH_CACHE_KEY } from '@/config/routes'

/**
 * SplashPage - ONLY handles initial app load routing (Reverted to former UI)
 */
export default function SplashPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const [showFailsafe, setShowFailsafe] = useState(false)

  // Fail-safe: If stuck for 400ms, show manual entry
  useEffect(() => {
    const timer = setTimeout(() => setShowFailsafe(true), 400)
    return () => clearTimeout(timer)
  }, [])

  // KingsChat Mobile Redirect Flow
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    const search = window.location.search

    // Look for state=mobile-flow in search or hash
    const hasMobileState = search.includes('state=mobile-flow') || hash.includes('state=mobile-flow')
    
    if (hasMobileState && (hash.includes('access_token=') || search.includes('access_token='))) {
      // Parse parameters from both hash and search to ensure we catch them
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash)
      const searchParams = new URLSearchParams(search.startsWith('?') ? search.substring(1) : search)
      
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || hashParams.get('accessToken')
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || hashParams.get('refreshToken')
      const expiresIn = hashParams.get('expires_in') || searchParams.get('expires_in') || hashParams.get('expiresInMillis')

      if (accessToken) {
        // Construct the deep link to redirect back to the React Native app
        const deepLinkUrl = `rehearsalhub://kingschat-callback?access_token=${accessToken}&refresh_token=${refreshToken || ''}&expires_in=${expiresIn || ''}`
        
        // Redirect the WebBrowser tab to trigger opening the mobile app
        window.location.href = deepLinkUrl
      }
    }
  }, [pathname])

  // IMMEDIATE Redirect Effect
  useEffect(() => {
    if (pathname !== '/') return

    const cachedUser = typeof window !== 'undefined' ? localStorage.getItem(AUTH_CACHE_KEY) : null

    // 1. Optimistic Check (Fastest) - If we have a cached user, move them IMMEDIATELY
    if (cachedUser === 'true') {
      const lastPath = NavigationManager.getLastPath()
      const target = (lastPath && lastPath !== '/') ? lastPath : '/home'
      router.replace(target)
      return
    }

    // 2. Auth Context Check (Fallback source of truth)
    if (!loading) {
      if (user) {
        const lastPath = NavigationManager.getLastPath()
        const target = (lastPath && lastPath !== '/') ? lastPath : '/home'
        router.replace(target)
      } else {
        router.replace('/auth')
      }
    }
  }, [loading, user, router, pathname])

  // Failsafe Redirect: For returning users, don't wait for complex state, just push home
  useEffect(() => {
    if (pathname !== '/') return
    const cachedUser = typeof window !== 'undefined' ? localStorage.getItem(AUTH_CACHE_KEY) : null

    if (cachedUser === 'true') {
      const timer = setTimeout(() => {
        const lastPath = NavigationManager.getLastPath()
        router.replace((lastPath && lastPath !== '/') ? lastPath : '/home')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [pathname, router])

  // Big Tech optimization: If we know we're redirecting, show NOTHING to prevent the "old loader" flicker
  const hasAuthCache = typeof window !== 'undefined' && localStorage.getItem(AUTH_CACHE_KEY) === 'true';
  const isRedirecting = (pathname === '/' && hasAuthCache);

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Rehearsal Hub...</p>
      </div>
    </div>
  );
}
