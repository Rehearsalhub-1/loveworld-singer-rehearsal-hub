"use client";

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, LogOut, AlertCircle } from 'lucide-react'
import { useZone } from '@/hooks/useZone'
import { useAuth } from '@/hooks/useAuth'

type DrawerItem = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  href?: string
  badge?: boolean | null
  onClick?: () => void
}

type DrawerSection = {
  title: string
  items: DrawerItem[]
}

type SharedDrawerProps = {
  open: boolean
  onClose: () => void
  title?: string
  items: DrawerItem[]
  customSections?: DrawerSection[]
  fixedOnDesktop?: boolean
}

export default function SharedDrawer({ open, onClose, title = 'Menu', items, customSections = [], fixedOnDesktop = false }: SharedDrawerProps) {
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  // Use ref instead of state to prevent callback from being lost on re-render
  const logoutCallbackRef = useRef<(() => void) | null>(null)
  const router = useRouter()
  const { currentZone } = useZone()
  const { signOut } = useAuth()

  // Get zone colors
  const zoneColors = {
    primary: currentZone?.themeColor || '#16a34a',
    secondary: currentZone?.themeColor || '#15803d',
    accent: currentZone?.themeColor || '#22c55e'
  }
  // Render drawer content
  const renderDrawerContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/80">
        <button
          onClick={onClose}
          className="text-xl font-outfit-semibold text-gray-900 hover:text-gray-700 active:scale-95 transition-all duration-200 focus:outline-none border-none shadow-none"
          aria-label="Close menu"
        >
          {title}
        </button>
        <button
          onClick={onClose}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-full transition-all duration-200 active:scale-95 focus:outline-none border-none shadow-none"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Items */}
      <div className="py-1">
        {(items || []).map((item, index) => {
          const MenuItem: any = item.onClick ? 'button' : Link

          // Special handling for logout and refresh
          const isLogout = item.title.toLowerCase() === 'logout'
          const isRefresh = item.title.toLowerCase() === 'refresh app'

          // Debug logging for refresh button
          if (isRefresh) {
          }
          const commonProps = item.onClick
            ? {
              onClick: (e: React.MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()

                if (isLogout) {
                  // Store the callback in ref (won't be lost on re-render)
                  logoutCallbackRef.current = item.onClick || null
                  setShowLogoutModal(true)
                } else if (isRefresh) {
                  // Execute immediately for refresh
                  if (item.onClick) {
                    item.onClick()
                  }
                  onClose()
                } else {
                  // Execute immediately for other items
                  if (item.onClick) {
                    item.onClick()
                  }
                  onClose()
                }
              }
            }
            : {
              href: item.href || '#',
              onClick: (e: any) => {

                // If href is '#', prevent navigation
                if (item.href === '#') {
                  e.preventDefault();
                  return;
                }

                // Close drawer first
                onClose();

                // Use router for navigation
                if (item.href && item.href !== '#') {
                  router.push(item.href);
                }
              }
            }

          return (
            <MenuItem
              key={index}
              {...commonProps}
              className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 transition-all duration-200 active:bg-gray-100/80 w-full text-left group ${isLogout
                  ? 'text-red-600 hover:bg-red-50/80 active:bg-red-100/80'
                  : isRefresh
                    ? 'text-blue-600 hover:bg-blue-50/80 active:bg-blue-100/80'
                    : 'text-gray-800'
                }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isLogout
                      ? 'bg-red-100/80 group-hover:bg-red-200/80'
                      : isRefresh
                        ? 'bg-blue-100/80 group-hover:bg-blue-200/80'
                        : 'group-hover:opacity-80'
                    }`}
                  style={!isLogout && !isRefresh ? {
                    backgroundColor: `${zoneColors.primary}20`,
                  } : {}}
                >
                  <item.icon
                    className={`w-4 h-4 transition-colors duration-200 ${isLogout ? 'text-red-600' : isRefresh ? 'text-blue-600' : ''
                      }`}
                    style={!isLogout && !isRefresh ? {
                      color: zoneColors.primary
                    } : {}}
                  />
                </div>
                <span className="text-sm font-poppins-medium">{item.title}</span>
              </div>
              {item.badge && (
                <div className="bg-red-500 rounded-full w-2 h-2 border border-white"></div>
              )}
            </MenuItem>
          )
        })}
      </div>

      {/* Custom Sections */}
      {(customSections || []).map((section, sectionIndex) => (
        <div key={sectionIndex} className="border-t border-gray-100/80">
          <div className="px-6 py-3">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">{section.title}</h3>
          </div>
          <div className="py-1">
            {(section.items || []).map((item, index) => {
              const MenuItem: any = item.onClick ? 'button' : Link
              const commonProps = item.onClick
                ? { onClick: () => { item.onClick?.(); onClose(); } }
                : {
                  href: item.href || '#',
                  onClick: (e: any) => {
                    if (item.href === '#') {
                      e.preventDefault();
                      return;
                    }
                    onClose();
                    if (item.href && item.href !== '#') {
                      router.push(item.href);
                    }
                  }
                }

              return (
                <MenuItem
                  key={index}
                  {...commonProps}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 transition-all duration-200 active:bg-gray-100/80 w-full text-left group text-gray-800"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:opacity-80"
                      style={{
                        backgroundColor: `${zoneColors.primary}20`,
                      }}
                    >
                      <item.icon
                        className="w-4 h-4 transition-colors duration-200"
                        style={{
                          color: zoneColors.primary
                        }}
                      />
                    </div>
                    <span className="text-sm font-poppins-medium">{item.title}</span>
                  </div>
                  {item.badge && (
                    <div className="bg-red-500 rounded-full w-2 h-2 border border-white"></div>
                  )}
                </MenuItem>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )

  // Fixed desktop mode - always visible on desktop, hidden on mobile
  if (fixedOnDesktop) {
    return (
      <div className="hidden lg:block fixed left-0 top-0 w-80 h-full bg-white/95 backdrop-blur-xl shadow-2xl border-r border-gray-200/50 z-40 overflow-y-auto">
        {renderDrawerContent()}
      </div>
    )
  }

  // Mobile mode - Apple-style drawer (works on all screen sizes)
  return (
    <>
      {/* Drawer slides in from left */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[80vw] bg-white/98 backdrop-blur-xl shadow-2xl border-r border-gray-200/50 overflow-y-auto transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'
          }`}
        data-drawer
      >
        {renderDrawerContent()}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 transform transition-all border border-gray-100">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-black text-gray-900 text-center mb-2 tracking-tight">
              Sign Out?
            </h3>

            {/* Message */}
            <p className="text-gray-500 text-center mb-8 font-medium">
              Are you sure you want to sign out of your account?
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  setShowLogoutModal(false)
                  onClose()

                  // Execute logout directly using signOut from useAuth
                  try {
                    await signOut()
                  } catch (error) {
 console.error(' SignOut error:', error);
                    // Fallback: try the stored callback
                    if (logoutCallbackRef.current) {
                      logoutCallbackRef.current()
                    }
                  }
                }}
                className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}



