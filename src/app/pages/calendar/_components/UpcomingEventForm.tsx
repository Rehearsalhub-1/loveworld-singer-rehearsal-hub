"use client";

import { useState } from 'react'
import { X, Calendar, Clock, MapPin, FileText, Sparkles } from 'lucide-react'
import moment from 'moment'
import { isHQGroup } from '@/config/zones'

interface UpcomingEventFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: any) => void
  event?: any
  themeColor: string
  currentZoneId?: string
}

export default function UpcomingEventForm({
  isOpen,
  onClose,
  onSave,
  event,
  themeColor,
  currentZoneId
}: UpcomingEventFormProps) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date ? moment(event.date).format('YYYY-MM-DD') : '',
    time: event?.time || '',
    location: event?.location || '',
    type: event?.type || 'announcement', // announcement, event, reminder
    showInCarousel: event?.showInCarousel ?? true,
    isGlobal: event?.isGlobal ?? false
  })

  const [errors, setErrors] = useState<any>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors: any = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.date) newErrors.date = 'Date is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Create event object
    const eventData = {
      id: event?.id || `upcoming-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      type: formData.type,
      showInCarousel: formData.showInCarousel,
      isGlobal: formData.isGlobal,
      createdAt: event?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onSave(eventData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: themeColor }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {event ? 'Edit Upcoming Event' : 'Add Upcoming Event'}
              </h2>
              <p className="text-sm text-gray-500">Create events that everyone will see</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Annual Conference 2024"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${errors.title
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
                }`}
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about the event..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${errors.date
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
              />
              {errors.date && (
                <p className="text-sm text-red-600 mt-1">{errors.date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time (Optional)
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location (Optional)
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Main Auditorium"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Event Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="announcement"> Announcement</option>
              <option value="event"> Event</option>
              <option value="reminder"> Reminder</option>
              <option value="meeting"> Meeting</option>
              <option value="rehearsal"> Rehearsal</option>
            </select>
          </div>

          {/* Show in Carousel */}
          <div className="flex flex-col gap-3 p-4 bg-blue-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="showInCarousel"
                checked={formData.showInCarousel}
                onChange={(e) => setFormData({ ...formData, showInCarousel: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Show in carousel banner</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Display this event in the auto-scrolling banner at the top
                </p>
              </div>
            </label>

            {/* Global Event Option - Only for HQ folks or if the event is already global */}
            {(isHQGroup(currentZoneId) || event?.isGlobal) && (
              <label className="flex items-center gap-3 cursor-pointer pt-3 border-t border-blue-100">
                <input
                  type="checkbox"
                  id="isGlobal"
                  checked={formData.isGlobal}
                  onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-purple-700">Make Global Event</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    This event will be visible to ALL zones on the platform
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: themeColor }}
            >
              {event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
