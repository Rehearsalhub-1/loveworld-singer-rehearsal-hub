"use client";

import { useState, useEffect, useRef } from 'react'

interface MobileInfo {
  isMobile: boolean
  isSmallScreen: boolean
  hasSafeArea: boolean
  screenHeight: number
  screenWidth: number
  orientation: 'portrait' | 'landscape'
  isKeyboardOpen: boolean
  keyboardHeight: number
}

export function useMobileDetection(): MobileInfo {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>({
    isMobile: false,
    isSmallScreen: false,
    hasSafeArea: false,
    screenHeight: 0,
    screenWidth: 0,
    orientation: 'portrait',
    isKeyboardOpen: false,
    keyboardHeight: 0
  })

  const initialHeightRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    initialHeightRef.current = window.innerHeight

    const updateMobileInfo = (activeKeyboardState?: boolean) => {
      const userAgent = navigator.userAgent
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isSmallScreen = window.innerWidth < 768
      const hasSafeArea = CSS.supports('padding: env(safe-area-inset-top)')
      const screenHeight = window.innerHeight
      const screenWidth = window.innerWidth
      const orientation = screenHeight > screenWidth ? 'portrait' : 'landscape'

      // Detect keyboard open
      let isKeyboardOpen = activeKeyboardState !== undefined ? activeKeyboardState : false
      let keyboardHeight = 0

      if (window.visualViewport) {
        // If visual viewport shrinks significantly compared to innerHeight or initial height
        const currentVpHeight = window.visualViewport.height
        const maxVpHeight = Math.max(initialHeightRef.current, window.innerHeight)
        const heightDiff = maxVpHeight - currentVpHeight

        if (heightDiff > 150) {
          isKeyboardOpen = true
          keyboardHeight = heightDiff
        } else if (heightDiff < 50 && activeKeyboardState === undefined) {
          isKeyboardOpen = false
        }
      } else {
        // Fallback for Android Chrome where innerHeight shrinks
        const heightDiff = initialHeightRef.current - screenHeight
        if (heightDiff > 150) {
          isKeyboardOpen = true
          keyboardHeight = heightDiff
        }
      }

      // Check if an input element is active
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        const inputType = (document.activeElement as HTMLInputElement).type
        if (!['checkbox', 'radio', 'range', 'button', 'submit', 'reset'].includes(inputType)) {
          isKeyboardOpen = true
        }
      }

      // Add/remove global class on document.documentElement for pure CSS hiding of floating bars
      if (isKeyboardOpen) {
        document.documentElement.classList.add('keyboard-open')
      } else {
        document.documentElement.classList.remove('keyboard-open')
      }

      setMobileInfo(prev => ({
        ...prev,
        isMobile: isMobileDevice || isSmallScreen,
        isSmallScreen,
        hasSafeArea,
        screenHeight,
        screenWidth,
        orientation,
        isKeyboardOpen,
        keyboardHeight
      }))
    }

    updateMobileInfo()

    const handleResize = () => updateMobileInfo()
    const handleOrientationChange = () => {
      setTimeout(() => {
        initialHeightRef.current = window.innerHeight
        updateMobileInfo()
      }, 100)
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        const inputType = (target as HTMLInputElement).type
        if (!['checkbox', 'radio', 'range', 'button', 'submit', 'reset'].includes(inputType)) {
          updateMobileInfo(true)
          
          // Smoothly scroll active input into view so it's not covered by keyboard
          setTimeout(() => {
            try {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } catch (err) {}
          }, 300)
        }
      }
    }

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        setTimeout(() => {
          if (!document.activeElement || !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            updateMobileInfo(false)
          }
        }, 100)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  return mobileInfo
}
