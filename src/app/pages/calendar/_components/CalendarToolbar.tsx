"use client";

import { ChevronLeft, ChevronRight, Calendar, Grid, List, Clock } from 'lucide-react'
import moment from 'moment'

interface CalendarToolbarProps {
  date: Date
  view: string
  views: string[]
  label: string
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE', date?: Date) => void
  onView: (view: string) => void
  themeColor: string
}

const VIEW_ICONS = {
  month: Grid,
  week: Calendar,
  day: Clock,
  agenda: List
}

const VIEW_LABELS = {
  month: 'Month',
  week: 'Week', 
  day: 'Day',
  agenda: 'Agenda'
}

export default function CalendarToolbar({
  date,
  view,
  views,
  label,
  onNavigate,
  onView,
  themeColor
}: CalendarToolbarProps) {
  
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={goToCurrent}
          className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: themeColor }}
        >
          Today
        </button>
        
        <div className="flex items-center gap-1">
          <button
            onClick={goToBack}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={goToNext}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 min-w-0">
          {label}
        </h2>
      </div>

      {/* View Switcher */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {views.map((viewName) => {
          const IconComponent = VIEW_ICONS[viewName as keyof typeof VIEW_ICONS] || Calendar
          const isActive = view === viewName
          
          return (
            <button
              key={viewName}
              onClick={() => onView(viewName)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
              style={isActive ? { backgroundColor: themeColor } : {}}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <IconComponent className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline">
                {VIEW_LABELS[viewName as keyof typeof VIEW_LABELS] || viewName}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}