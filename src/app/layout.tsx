import { Suspense } from 'react'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import 'kingschat-web-sdk/dist/stylesheets/style.min.css'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { ChatProvider } from '@/app/pages/groups/_context/ChatContext'
import { MediaProvider } from '@/app/pages/media/_context/MediaContext'
import { AudioProvider } from '@/contexts/AudioContext'
import RealtimeNotifications from '@/components/RealtimeNotifications'
import { ActivityLogger } from '@/components/ActivityLogger'
import NotificationUrlHandler from '@/components/NotificationUrlHandler'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import OfflineIndicator from '@/components/OfflineIndicator'
import { CallProvider } from '@/contexts/CallContext'
import { CallOverlay } from '@/components/CallOverlay'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { PermissionProvider } from '@/contexts/PermissionContext'
import AppBootstrap from '@/components/AppBootstrap'
import { PageLoader } from '@/components/PageLoader'
import { BackendOfflineIndicator } from '@/components/BackendOfflineIndicator'
import NotificationBanner from '@/components/NotificationBanner'

const APP_VERSION = '3.0.0';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'LoveWorld Singers Rehearsal Hub - Praise & Worship App',
  description: 'Access rehearsals, setlists, and audio recordings for LoveWorld Singers.',
  manifest: `/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LWSRHP'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7c3aed',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preload" href="/logo.png" as="image" />
        <link rel="preload" href="/lmm.png" as="image" />
        <script src="https://upload-widget.cloudinary.com/global/all.js" async></script>
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans`}>
        <Suspense fallback={null}>
          <AppBootstrap />
        </Suspense>
        <ErrorBoundary>
          <SubscriptionProvider>
            <CallProvider>
              <AudioProvider>
                <MediaProvider>
                  <ChatProvider>
                    <AnalyticsProvider>
                      <PermissionProvider>
                        <ActivityLogger>
                          <main className="h-full w-full bg-gray-50">
                            <PageLoader>
                              {children}
                            </PageLoader>
                          </main>
                          <RealtimeNotifications />
                          <NotificationBanner />
                          <BackendOfflineIndicator />
                          <NotificationUrlHandler />
                          <CallOverlay />
                          <OfflineIndicator />
                        </ActivityLogger>
                      </PermissionProvider>
                    </AnalyticsProvider>
                  </ChatProvider>
                </MediaProvider>
              </AudioProvider>
            </CallProvider>
          </SubscriptionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}