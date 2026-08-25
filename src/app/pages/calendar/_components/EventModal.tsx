"use client";

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { CalendarEvent, CalendarService } from '../_lib/calendar-service'
import { X, Calendar, Clock, MapPin, Users, Repeat, Bell, Save, Loader2 } from 'lucide-react'
import { isHQGroup } from '@/config/zones'
import moment from 'moment'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => void
  event?: CalendarEvent | null
  defaultStart?: Date
  defaultEnd?: Date
  zoneId: string
  themeColor: string
}

const EVENT_TYPES = [
  { value: 'rehearsal', label: 'Rehearsal', color: '#10b981' },
  { value: 'performance', label: 'Performance', color: '#f59e0b' },
  { value: 'meeting', label: 'Meeting', color: '#3b82f6' },
  { value: 'other', label: 'Other', color: '#8b5cf6' }
]

const EVENT_COLORS = [
  '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6',
  '#ef4444', '#06b6d4', '#84cc16', '#f97316'
]

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  event,
  defaultStart,
  defaultEnd,
  zoneId,
  themeColor
}: EventModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: false,
    type: 'rehearsal' as CalendarEvent['type'],
    color: themeColor,
    location: '',
    isRecurring: false,
    recurringFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurringInterval: 1,
    recurringEndDate: '',
    reminders: [] as { type: 'email' | 'notification'; minutes: number }[],
    isGlobal: false
  })

  const calendarService = new CalendarService()

  // Initialize form data
  useEffect(() => {
    if (event) {
      // Editing existing event
      setFormData({
        title: event.title,
        description: event.description || '',
        start: moment(event.start).format('YYYY-MM-DDTHH:mm'),
        end: moment(event.end).format('YYYY-MM-DDTHH:mm'),
        allDay: event.allDay,
        type: event.type,
        color: event.color || themeColor,
        location: event.location || '',
        isRecurring: event.isRecurring || false,
        recurringFrequency: event.recurringPattern?.frequency || 'weekly',
        recurringInterval: event.recurringPattern?.interval || 1,
        recurringEndDate: event.recurringPattern?.endDate
          ? moment(event.recurringPattern.endDate).format('YYYY-MM-DD')
          : '',
        reminders: event.reminders || [],
        isGlobal: event.isGlobal || false
      })
    } else if (defaultStart && defaultEnd) {
      // Creating new event with default times
      setFormData(prev => ({
        ...prev,
        start: moment(defaultStart).format('YYYY-MM-DDTHH:mm'),
        end: moment(defaultEnd).format('YYYY-MM-DDTHH:mm'),
        color: themeColor
      }))
    } else {
      // Reset form
      const now = new Date()
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

      setFormData({
        title: '',
        description: '',
        start: moment(now).format('YYYY-MM-DDTHH:mm'),
        end: moment(oneHourLater).format('YYYY-MM-DDTHH:mm'),
        allDay: false,
        type: 'rehearsal',
        color: themeColor,
        location: '',
        isRecurring: false,
        recurringFrequency: 'weekly',
        recurringInterval: 1,
        recurringEndDate: '',
        reminders: [],
        isGlobal: false
      })
    }
  }, [event, defaultStart, defaultEnd, themeColor, isOpen])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.title.trim()) return

    // Validate end time is after start time
    const startDate = new Date(formData.start)
    const endDate = new Date(formData.end)
    if (endDate <= startDate && !formData.allDay) {
      showToast('End time must be after start time', 'error')
      return
    }

    setLoading(true)
    try {
      const eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        start: startDate,
        end: endDate,
        allDay: formData.allDay,
        type: formData.type,
        color: formData.color,
        location: formData.location.trim(),
        createdBy: user?.uid || user?.id || '',
        createdByName: user.displayName || user.email || 'Unknown User',
        zoneId,
        isRecurring: formData.isRecurring,
        recurringPattern: formData.isRecurring ? {
          frequency: formData.recurringFrequency,
          interval: formData.recurringInterval,
          endDate: formData.recurringEndDate ? new Date(formData.recurringEndDate) : undefined
        } : undefined,
        reminders: formData.reminders,
        isGlobal: formData.isGlobal,
        attendees: []
      }

      if (event) {
        await calendarService.updateEvent(event.id, eventData)
        onSave({ ...event, ...eventData })
        showToast('Event updated successfully')
      } else {
        // Create new event
        const eventId = await calendarService.createEvent(eventData)
        onSave({
          id: eventId,
          ...eventData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        showToast('Event created successfully')
      }
    } catch (error) {
 console.error('Error saving event:', error)
      showToast('Failed to save event. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const addReminder = () => {
    setFormData(prev => ({
      ...prev,
      reminders: [...prev.reminders, { type: 'notification', minutes: 15 }]
    }))
  }

  const removeReminder = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders.filter((_, i) => i !== index)
    }))
  }

  const updateReminder = (index: number, field: 'type' | 'minutes', value: any) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders.map((reminder, i) =>
        i === index ? { ...reminder, [field]: value } : reminder
      )
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div
          className="p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${themeColor} 0%, ${adjustColor(themeColor, -20)} 100%)`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">
                  {event ? 'Edit Event' : 'Create Event'}
                </h2>
                <p className="text-sm opacity-90">
                  {event ? 'Update event details' : 'Add a new event to your calendar'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Type and Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    type: e.target.value as CalendarEvent['type']
                  }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-400' : 'border-gray-200'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.start}
                  onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.end}
                  onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => setFormData(prev => ({ ...prev, allDay: e.target.checked }))}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
                All day event
              </label>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter event location"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                rows={3}
                placeholder="Enter event description"
              />
            </div>

            {/* Recurring Event & Global Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                    <Repeat className="w-4 h-4 inline mr-1" />
                    Recurring event
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Frequency
                      </label>
                      <select
                        value={formData.recurringFrequency}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          recurringFrequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Interval
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={formData.recurringInterval}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            recurringInterval: parseInt(e.target.value) || 1
                          }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Global Event Toggle (HQ Only) */}
              {isHQGroup(zoneId) && (
                <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isGlobal"
                      checked={formData.isGlobal}
                      onChange={(e) => setFormData(prev => ({ ...prev, isGlobal: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isGlobal" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-500" />
                      Make Global Notification
                    </label>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500 leading-tight">
                    This event will be visible to ALL zones in their notification center and calendar. Use for global masterclasses or meetings.
                  </p>
                </div>
              )}
            </div>

            {/* Reminders */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">
                  <Bell className="w-4 h-4 inline mr-1" />
                  Reminders
                </label>
                <button
                  type="button"
                  onClick={addReminder}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  + Add Reminder
                </button>
              </div>

              {formData.reminders.map((reminder, index) => (
                <div key={index} className="flex items-center gap-3 mb-3">
                  <select
                    value={reminder.type}
                    onChange={(e) => updateReminder(index, 'type', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="notification">Notification</option>
                    <option value="email">Email</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    value={reminder.minutes}
                    onChange={(e) => updateReminder(index, 'minutes', parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-600">minutes before</span>

                  <button
                    type="button"
                    onClick={() => removeReminder(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || loading}
              className="flex-1 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: themeColor }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {event ? 'Update Event' : 'Create Event'}
                </>
              )}
            </button>
          </div>
        </form>
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