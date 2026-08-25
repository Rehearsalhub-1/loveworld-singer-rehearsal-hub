"use client";

import { useState } from 'react'
import { CalendarEvent, CalendarService } from '../_lib/calendar-service'
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Edit3,
  Trash2,
  Users,
  Repeat,
  Bell,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import moment from 'moment'

interface EventDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEdit: () => void
  onDelete: (eventId: string) => void
  themeColor: string
  canManage?: boolean
}

const EVENT_TYPE_LABELS = {
  rehearsal: 'Rehearsal',
  performance: 'Performance',
  meeting: 'Meeting',
  other: 'Other'
}

const EVENT_TYPE_COLORS = {
  rehearsal: '#10b981',
  performance: '#f59e0b',
  meeting: '#3b82f6',
  other: '#8b5cf6'
}

export default function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  themeColor,
  canManage = false
}: EventDetailsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const calendarService = new CalendarService()

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div')
    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg z-[100] text-sm font-medium transition-all ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }

  const handleDelete = async () => {
    if (!event) return

    setDeleting(true)
    try {
      await calendarService.deleteEvent(event.id)

      showToast('Event deleted successfully')
      onDelete(event.id)
      setShowDeleteConfirm(false)
    } catch (error) {
 console.error('Error deleting event:', error)
      showToast('Failed to delete event. Please try again.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen || !event) return null

  const eventTypeColor = EVENT_TYPE_COLORS[event.type] || themeColor
  const duration = moment(event.end).diff(moment(event.start), 'minutes')
  const durationText = duration >= 60
    ? `${Math.floor(duration / 60)}h ${duration % 60}m`
    : `${duration}m`

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div
          className="p-6 text-white relative"
          style={{
            background: `linear-gradient(135deg, ${eventTypeColor} 0%, ${adjustColor(eventTypeColor, -20)} 100%)`
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium"
                >
                  {EVENT_TYPE_LABELS[event.type]}
                </span>
                {event.isRecurring && (
                  <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    Recurring
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold mb-1 break-words">
                {event.title}
              </h2>
              <p className="text-sm opacity-90">
                Created by {event.createdByName}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="space-y-4">
            {/* Date and Time */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${eventTypeColor}20` }}
              >
                <Calendar className="w-5 h-5" style={{ color: eventTypeColor }} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Date & Time</h4>
                {event.allDay ? (
                  <p className="text-gray-600">
                    {moment(event.start).format('MMMM D, YYYY')} (All day)
                  </p>
                ) : (
                  <div className="text-gray-600">
                    <p>{moment(event.start).format('MMMM D, YYYY')}</p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
                      <span className="text-sm text-gray-500">({durationText})</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${eventTypeColor}20` }}
                >
                  <MapPin className="w-5 h-5" style={{ color: eventTypeColor }} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Location</h4>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${eventTypeColor}20` }}
                >
                  <User className="w-5 h-5" style={{ color: eventTypeColor }} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Description</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              </div>
            )}

            {/* Recurring Pattern */}
            {event.isRecurring && event.recurringPattern && (
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${eventTypeColor}20` }}
                >
                  <Repeat className="w-5 h-5" style={{ color: eventTypeColor }} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Recurring Pattern</h4>
                  <p className="text-gray-600">
                    Every {event.recurringPattern.interval > 1 ? event.recurringPattern.interval : ''} {event.recurringPattern.frequency}
                    {event.recurringPattern.endDate && (
                      <span> until {moment(event.recurringPattern.endDate).format('MMMM D, YYYY')}</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Reminders */}
            {event.reminders && event.reminders.length > 0 && (
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${eventTypeColor}20` }}
                >
                  <Bell className="w-5 h-5" style={{ color: eventTypeColor }} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Reminders</h4>
                  <div className="space-y-1">
                    {event.reminders.map((reminder, index) => (
                      <p key={index} className="text-gray-600 text-sm">
                        {reminder.type === 'email' ? '' : ''} {reminder.minutes} minutes before
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${eventTypeColor}20` }}
                >
                  <Users className="w-5 h-5" style={{ color: eventTypeColor }} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Attendees ({event.attendees.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {event.attendees.map((attendeeId, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                      >
                        {attendeeId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Event Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {moment(event.createdAt).format('MMMM D, YYYY [at] h:mm A')}</p>
                {event.updatedAt && !moment(event.createdAt).isSame(event.updatedAt, 'minute') && (
                  <p>Updated: {moment(event.updatedAt).format('MMMM D, YYYY [at] h:mm A')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions - Only for authorized users */}
        {canManage && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            {showDeleteConfirm ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900">Delete Event</h4>
                    <p className="text-sm text-red-700">
                      Are you sure you want to delete this event? This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Event
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={onEdit}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Event
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to adjust color brightness
const adjustColor = (color: string, amount: number) => {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}