"use client";

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Sparkles } from 'lucide-react'
import moment from 'moment'
import { UpcomingEventsService, UpcomingEvent } from '../_lib/upcoming-events-service'
import UpcomingEventForm from './UpcomingEventForm'
import { useZone } from '@/hooks/useZone'

interface ManageUpcomingEventsProps {
  themeColor: string
}

export default function ManageUpcomingEvents({ themeColor }: ManageUpcomingEventsProps) {
  const { currentZone } = useZone()
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<UpcomingEvent | null>(null)

  useEffect(() => {
    if (currentZone?.id) {
      loadEvents()
    }
  }, [currentZone?.id])

  const loadEvents = async () => {
    if (!currentZone?.id) return
    setLoading(true)
    try {
      const allEvents = await UpcomingEventsService.getAllEvents(currentZone.id)
      setEvents(allEvents)
    } catch (error) {
 console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEvent = async (eventData: any) => {
    if (!currentZone?.id) return
    try {
      if (editingEvent) {
        await UpcomingEventsService.updateEvent(editingEvent.id, eventData, currentZone.id)
      } else {
        await UpcomingEventsService.createEvent({
          ...eventData,
          zoneId: currentZone.id
        })
      }
      await loadEvents()
      setShowForm(false)
      setEditingEvent(null)
    } catch (error) {
 console.error('Error saving event:', error)
      alert('Failed to save event. Please try again.')
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!currentZone?.id) return
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      await UpcomingEventsService.deleteEvent(eventId, currentZone.id)
      await loadEvents()
    } catch (error) {
 console.error('Error deleting event:', error)
      alert('Failed to delete event. Please try again.')
    }
  }

  const handleEditEvent = (event: UpcomingEvent) => {
    setEditingEvent(event)
    setShowForm(true)
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return ''
      case 'event': return ''
      case 'reminder': return ''
      case 'meeting': return ''
      case 'rehearsal': return ''
      default: return ''
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: themeColor }}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Upcoming Events</h2>
            <p className="text-sm text-gray-600">Create events that everyone will see</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingEvent(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: themeColor }}
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
          <p className="text-gray-600 mb-4">Create your first event to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: themeColor }}
          >
            <Plus className="w-5 h-5" />
            Add Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              {/* Event Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getEventTypeIcon(event.type)}</span>
                  {event.showInCarousel && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                      Carousel
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Event Details */}
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {event.title}
              </h3>
              {event.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {event.description}
                </p>
              )}

              {/* Date and Time */}
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  <span>{moment(event.date).format('MMM D, YYYY')}</span>
                </div>
                {event.time && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="w-4 h-4 flex items-center justify-center"></span>
                    <span>{event.time}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="w-4 h-4 flex items-center justify-center"></span>
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Form Modal */}
      <UpcomingEventForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingEvent(null)
        }}
        onSave={handleSaveEvent}
        event={editingEvent}
        themeColor={themeColor}
        currentZoneId={currentZone?.id}
      />
    </div>
  )
}
