"use client";

import dynamic from 'next/dynamic'

// Lazy load non-critical components with proper client-side handling
const PWAInstall = dynamic(() => import('@/components/PWAInstall'), {
  ssr: false
})

const GlobalMiniPlayer = dynamic(() => import('@/components/GlobalMiniPlayer'), {
  ssr: false
})

const RealtimeNotifications = dynamic(() => import('@/components/RealtimeNotifications'), {
  ssr: false
})

export { PWAInstall, GlobalMiniPlayer, RealtimeNotifications }
