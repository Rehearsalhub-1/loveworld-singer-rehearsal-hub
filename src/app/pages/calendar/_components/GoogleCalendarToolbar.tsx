"use client";

import { ChevronLeft, ChevronRight, Menu, Search, Settings, Grid } from 'lucide-react'

interface GoogleCalendarToolbarProps {
  date: Date
  view: string
  views: string[]
  label: string
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE', date?: Date) => void
  onView: (view: string) => void
  themeColor: string
  onToggleSidebar?: () => void
}

export default function GoogleCalendarToolbar({
  label,
  onNavigate,
  themeColor,
  onToggleSidebar
}: GoogleCalendarToolbarProps) {
  
  const goToBack = () => {
    onNavigate('PREV')
  }

  const goToNext = () => {
    onNavigate('NEXT')
  }

  const goToCurrent = () => {
    onNavigate('TODAY')
  }

  return (
    <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Menu Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all active:scale-95"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* Logo/Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            <Grid className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-normal text-gray-700">Calendar</h1>
        </div>
      </div>

      {/* Center Section - Navigation */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <button
          onClick={goToCurrent}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors active:scale-95"
        >
          Today
        </button>
        
        <div className="flex items-center">
          <button
            onClick={goToBack}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all active:scale-95"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={goToNext}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all active:scale-95"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <h2 className="text-xl font-normal text-gray-700 min-w-[180px] text-center">
          {label}
        </h2>
      </div>

      {/* Right Section - Removed Search and Settings as they are not used */}
      <div className="flex items-center gap-2">
        <div className="w-2" />
      </div>
    </div>
  )
}
