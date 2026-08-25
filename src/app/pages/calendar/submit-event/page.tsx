"use client";

import { useState } from 'react'
import { Calendar, Clock, MapPin, FileText, Sparkles, CheckCircle, ArrowLeft } from 'lucide-react'
import { UpcomingEventsService } from '../_lib/upcoming-events-service'
import { useRouter } from 'next/navigation'
import { useZone } from '@/hooks/useZone'

export default function SubmitEventPage() {
  const router = useRouter()
  const { currentZone } = useZone()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    type: 'event',
    showInCarousel: true
  })

  const [errors, setErrors] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors: any = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.date) newErrors.date = 'Date is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)

    try {
      if (!currentZone?.id) {
        alert('Please select a zone first')
        setSubmitting(false)
        return
      }

      await UpcomingEventsService.createEvent({
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        type: formData.type as any,
        showInCarousel: formData.showInCarousel,
        zoneId: currentZone.id
      })

      setSubmitted(true)

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          title: '',
          description: '',
          date: '',
          time: '',
          location: '',
          type: 'event',
          showInCarousel: true
        })
        setSubmitted(false)
      }, 3000)
    } catch (error) {
 console.error('Error submitting event:', error)
      alert('Failed to submit event. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center my-auto">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your event has been successfully submitted and will appear in the calendar.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Submit Another Event
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={() => router.push('/pages/calendar')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Submit Event</h1>
                <p className="text-xs text-gray-500">Share upcoming events with everyone</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-12 text-white text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-bold mb-2">Submit an Event</h2>
            <p className="text-purple-100 max-w-2xl mx-auto">
              Have an upcoming event? Share it with the community! Fill out the form below and it will appear in the calendar for everyone to see.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                    : 'border-gray-300 focus:ring-purple-500'
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
                placeholder="Tell us more about the event..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      : 'border-gray-300 focus:ring-purple-500'
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="announcement"> Announcement</option>
                <option value="event"> Event</option>
                <option value="reminder"> Reminder</option>
                <option value="meeting"> Meeting</option>
                <option value="rehearsal"> Rehearsal</option>
              </select>
            </div>

            {/* Show in Carousel */}
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <input
                type="checkbox"
                id="showInCarousel"
                checked={formData.showInCarousel}
                onChange={(e) => setFormData({ ...formData, showInCarousel: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <label htmlFor="showInCarousel" className="text-sm text-gray-700">
                <span className="font-semibold">Show in carousel banner</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Display this event in the auto-scrolling banner at the top of the calendar
                </p>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Submit Event
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your event will be reviewed and will appear in the calendar shortly.
            Everyone will be able to see it in the calendar and carousel banner.
          </p>
        </div>
      </div>
    </div>
  )
}
