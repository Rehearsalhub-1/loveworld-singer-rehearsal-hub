"use client";

'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Package } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [isNativeApp, setIsNativeApp] = useState(false)

  useEffect(() => {
        const nativeAppFlag = localStorage.getItem('isNativeApp') === 'true'
    const isNative = nativeAppFlag || (typeof window !== 'undefined' && (window as any).isNativeApp)
    setIsNativeApp(isNative)

    // Don't show install prompts if running in native app
    if (isNative) {
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        // Only hide the banner if PWA was actually installed
        setShowInstallBanner(false)
      } else {
      }
    } catch (error) {
 console.error('Error installing PWA:', error)
    } finally {
      setDeferredPrompt(null)
      setShowInstallDialog(false)
    }
  }

  const handleDownloadAPK = () => {
    // Path to the APK file in the public folder
    const apkUrl = '/apk/LWSRHP.apk'
    
    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a')
    link.href = apkUrl
    link.download = 'LWSRHP.apk'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Only close the dialog, don't hide the banner
    setShowInstallDialog(false)
  }

  // Don't show install prompts if running in native app
  if (isNativeApp) {
    return null
  }

  // Only show the install button if we have the deferred prompt
  // and the user hasn't already installed the PWA
  if (!showInstallBanner || !deferredPrompt) {
    return null
  }

  return (
    <>
      {/* Install Banner Button */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setShowInstallDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
        >
          <Download className="w-4 h-4" />
          Install App
        </button>
      </div>

      {/* Installation Options Dialog */}
      {showInstallDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Install LoveWorld Singers Rehearsal Hub</h3>
              <button 
                onClick={() => setShowInstallDialog(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">Choose how you'd like to install the app:</p>
            
            <div className="space-y-4">
              <button
                onClick={handleInstallPWA}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Install Web Version (PWA)</div>
                  <p className="text-sm text-gray-500">Add to home screen for easy access</p>
                </div>
              </button>
              
              <button
                onClick={handleDownloadAPK}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Download APK</div>
                  <p className="text-sm text-gray-500">For Android devices</p>
                </div>
              </button>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowInstallDialog(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
