"use client";

import { useState } from 'react'
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, Cake, Grid, List, Clock, LayoutList } from 'lucide-react'
import moment from 'moment'

interface CalendarSidebarProps {
  date: Date
  onDateSelect: (date: Date) => void
  onCreateEvent: () => void
  themeColor: string
  zoneName: string
  view?: string
  onViewChange?: (view: string) => void
  upcomingEvents?: Array<{
    id: string
    title: string
    start: Date
    end: Date
    color?: string
  }>
  canManage?: boolean
}

export default function CalendarSidebar({
  date,
  onDateSelect,
  onCreateEvent,
  themeColor,
  zoneName,
  view = 'month',
  onViewChange,
  upcomingEvents = [],
  canManage = false
}: CalendarSidebarProps) {
  const [ministryCalendarOpen, setMinistryCalendarOpen] = useState(false)

  // Get upcoming events (next 7 days)
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcoming = upcomingEvents
    .filter(event => event.start >= today && event.start <= nextWeek)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5)

  const viewOptions = [
    { id: 'day', label: 'Day', icon: Clock },
    { id: 'week', label: 'Week', icon: LayoutList },
    { id: 'month', label: 'Month', icon: Grid },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shadow-2xl lg:shadow-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Today's Real Date Indicator */}
        <div className="p-4 border-b border-gray-100 bg-blue-50/50">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Today</p>
          <div className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-1 rounded-lg transition-colors" onClick={() => onDateSelect(new Date())}>
            <div
              className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shadow-sm"
              style={{ backgroundColor: themeColor }}
            >
              <span className="text-[10px] font-medium uppercase text-white/90">{moment().format('MMM')}</span>
              <span className="text-base font-bold text-white">{moment().format('D')}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{moment().format('dddd')}</p>
              <p className="text-[10px] text-gray-500">{moment().format('MMMM D, YYYY')}</p>
            </div>
          </div>
        </div>

        {/* Selected Date Indicator (if different from today) */}
        {!moment(date).isSame(moment(), 'day') && (
          <div className="p-4 border-b border-gray-100 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Viewing</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex flex-col items-center justify-center border border-slate-200 bg-white"
              >
                <span className="text-[10px] font-medium uppercase text-slate-400">{moment(date).format('MMM')}</span>
                <span className="text-base font-bold text-slate-700">{moment(date).format('D')}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{moment(date).format('dddd')}</p>
                <p className="text-[10px] text-slate-500">{moment(date).format('MMMM D, YYYY')}</p>
              </div>
            </div>
          </div>
        )}

        {/* View Options */}
        {onViewChange && (
          <div className="py-2">
            {viewOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  onClick={() => onViewChange(option.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 text-sm transition-colors ${view === option.id
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  style={view === option.id ? { backgroundColor: themeColor } : {}}
                >
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{option.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-200 mx-4" />

        {/* Ministry Calendar - Collapsible with Events */}
        <div className="py-2">
          <button
            onClick={() => setMinistryCalendarOpen(!ministryCalendarOpen)}
            className="w-full flex items-center gap-4 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              {ministryCalendarOpen ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5" style={{ color: themeColor }} />
            </div>
            <span className="font-medium">Ministry Calendar</span>
            {upcoming.length > 0 && (
              <span
                className="ml-auto px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: themeColor }}
              >
                {upcoming.length}
              </span>
            )}
          </button>

          {/* Upcoming Events - Shows when expanded */}
          {ministryCalendarOpen && (
            <div className="px-4 pb-2">
              {upcoming.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 pl-9">No upcoming events</p>
              ) : (
                <div className="space-y-1 pl-9">
                  {upcoming.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color || themeColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{event.title}</p>
                        <p className="text-xs text-gray-400">
                          {moment(event.start).format('MMM D')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Birthdays */}
        <div className="py-2">
          <button
            className="w-full flex items-center gap-4 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <div className="w-6 h-6 shrink-0" />
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <Cake className="w-5 h-5 text-pink-400" />
            </div>
            <span className="font-medium">Birthdays</span>
          </button>
        </div>

        {/* Add Event Button - Only for authorized users */}
        {canManage && (
          <div className="p-4">
            <button
              onClick={onCreateEvent}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full font-medium hover:opacity-90 transition-all active:scale-95 shadow-sm text-white"
              style={{ backgroundColor: themeColor }}
            >
              <span className="text-xl leading-none">+</span>
              <span>Add Event</span>
            </button>
          </div>
        )}
      </div>

      {/* Zone Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: themeColor }}
          />
          <span className="text-sm text-gray-600 truncate font-medium">{zoneName}</span>
        </div>
      </div>
    </div>
  )
}
