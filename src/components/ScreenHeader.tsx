"use client";

import React, { useEffect, useState } from 'react'
import { Menu, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { NavigationManager } from '@/utils/navigation'
// Removed auth context dependency for admin check

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  onMenuClick?: () => void
  rightImageSrc?: string
  showDivider?: boolean
  rightButtons?: React.ReactNode
  leftButtons?: React.ReactNode
  onTitleClick?: () => void
  timer?: React.ReactNode
  showMenuButton?: boolean
  showBackButton?: boolean
  backPath?: string
  onBackClick?: () => void
  darkMode?: boolean
}

export function ScreenHeader({
  title,
  subtitle,
  onMenuClick,
  rightImageSrc = '/logo.png',
  showDivider = true,
  rightButtons,
  leftButtons,
  onTitleClick,
  timer,
  showMenuButton = false,
  showBackButton = false,
  backPath,
  onBackClick,
  darkMode = false
}: ScreenHeaderProps) {

  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  // Check admin status from localStorage
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('adminAuthenticated') === 'true'

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 200)
    return () => window.clearTimeout(id)
  }, [])

  const handleLogoClick = () => {
    if (isAdmin) {
      router.push('/admin')
    } else {
      router.push('/home')
    }
  }

  const bgColor = darkMode ? 'bg-[#0f0f0f]' : 'bg-white/80 backdrop-blur-xl'
  const borderColor = darkMode ? 'border-gray-800' : 'border-gray-100/50'
  const textColor = darkMode ? 'text-white' : 'text-gray-800'
  const subtextColor = darkMode ? 'text-gray-400' : 'text-gray-600'
  const iconColor = darkMode ? 'text-gray-300' : 'text-gray-600'
  const hoverBg = darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'

  return (
    <div className={`sticky top-0 z-50 ${bgColor} ${showDivider ? `border-b ${borderColor}` : ''}`}>
      <div className="flex items-center justify-between px-4 h-16 sm:h-20 gap-4">
        {/* Left Section - Controls */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-[40px]">
          {showBackButton && (
            <button
              onClick={() => {
                if (onBackClick) {
                  onBackClick()
                } else if (backPath) {
                  router.push(backPath)
                } else {
                  NavigationManager.safeBack(router)
                }
              }}
              className={`p-2.5 rounded-xl transition-all duration-300 ${hoverBg} ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}
              aria-label="Go back"
            >
              <ArrowLeft className={`w-5 h-5 ${iconColor}`} />
            </button>
          )}
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className={`p-2.5 rounded-xl transition-all duration-300 ${hoverBg} ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}
              aria-label="Open menu"
            >
              <Menu className={`w-5 h-5 ${iconColor}`} />
            </button>
          )}
          {leftButtons && (
            <div className={`transition-all duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              {leftButtons}
            </div>
          )}
        </div>

        {/* Center Section - Branding & Identity */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 gap-0">
          <button
            onClick={onTitleClick}
            className={`text-sm sm:text-base font-black tracking-tight leading-none ${textColor} transition-all duration-500 delay-100 truncate w-full text-center ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} ${onTitleClick ? 'active:scale-95 hover:opacity-70' : 'cursor-default'}`}
            disabled={!onTitleClick}
          >
            {title}
          </button>
          {subtitle && (
            <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] ${subtextColor} transition-all duration-500 delay-150 truncate w-full text-center ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              {subtitle}
            </div>
          )}
          {timer && (
            <div className={`transition-all duration-500 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              {timer}
            </div>
          )}
        </div>

        {/* Right Section - Status & Identity */}
        <div className="flex items-center gap-3 shrink-0 min-w-[40px] justify-end">
          {rightButtons && (
            <div className={`transition-all duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              {rightButtons}
            </div>
          )}
          <button
            onClick={handleLogoClick}
            className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/5 hover:scale-110 active:scale-95 transition-all duration-300 overflow-hidden"
            aria-label="Go to home"
          >
            <img
              src={rightImageSrc}
              alt="Logo"
              className="w-7 h-7 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ScreenHeader


