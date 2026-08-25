"use client";

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { useUnreadNotifications } from '@/stores/notificationStore'
import { CalendarEvent, CalendarService } from './_lib/calendar-service'
import { Calendar as CalendarIcon, Menu, Home, ChevronLeft, ChevronRight, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react'
import CalendarStyles from './_components/CalendarStyles'
import { ScreenHeader } from '@/components/ScreenHeader'
import moment from 'moment'
import UnifiedCarousel from './_components/UnifiedCarousel'

// Dynamically import React Big Calendar components to avoid SSR issues
const Calendar = dynamic(() => import('react-big-calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading calendar...</p>
      </div>
    </div>
  )
})

const EventModal = dynamic(() => import('./_components/EventModal'), {
  ssr: false
})

const GoogleCalendarToolbar = dynamic(() => import('./_components/GoogleCalendarToolbar'), {
  ssr: false
})

const CalendarSidebar = dynamic(() => import('./_components/CalendarSidebar'), {
  ssr: false
})

const EventDetailsModal = dynamic(() => import('./_components/EventDetailsModal'), {
  ssr: false
})

// React Big Calendar localizer
let momentLocalizer: any = null

export default function CalendarPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentZone } = useZone()
  const { markCalendarSeen } = useUnreadNotifications()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [view, setView] = useState<any>('month')
  const [date, setDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [calendarReady, setCalendarReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todaysBirthdays, setTodaysBirthdays] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [upcomingEventsList, setUpcomingEventsList] = useState<any[]>([])

  // Calculate permissions
  const canManage = useMemo(() => {
    if (!profile) return false
    const isAdmin = profile.role === 'admin' || profile.role === 'boss'
    const isCoordinator = profile.administration === 'Coordinator' || profile.administration === 'Assistant Coordinator'
    return isAdmin || isCoordinator
  }, [profile])

  const calendarService = new CalendarService()

  // Mark calendar as seen when page loads
  useEffect(() => {
    markCalendarSeen()
  }, [markCalendarSeen])

  // Initialize moment and localizer
  useEffect(() => {
    const initializeCalendar = async () => {
      try {
        const { momentLocalizer: localizerFn } = await import('react-big-calendar')
        momentLocalizer = localizerFn(moment)
        setCalendarReady(true)
      } catch (error) {
 console.error('Error initializing calendar:', error)
      }
    }

    initializeCalendar()
  }, [])

  // Load events with caching
  useEffect(() => {
    // Use profile (cached) instead of waiting for user
    const userId = user?.uid || profile?.id
    if (!userId || !currentZone) return

    const loadEvents = async () => {
      setLoading(true)
      try {
        const zoneEvents = await calendarService.getZoneEvents(currentZone.id, userId, profile?.role)
        setEvents(zoneEvents)
      } catch (error) {
        console.error('Error loading events:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [user, profile, currentZone])

  // Load all birthdays for carousel only (zone-aware)
  useEffect(() => {
    if (!currentZone) return

    const loadBirthdays = async () => {
      try {
        const { BirthdayService } = await import('./_lib/birthday-service')
        const allBirthdays = await BirthdayService.getTodayAndUpcomingBirthdays(currentZone.id)
        setTodaysBirthdays(allBirthdays)
      } catch (error) {
 console.error('Error loading birthdays:', error)
      }
    }

    loadBirthdays()
  }, [currentZone?.id])

  // Load upcoming events for carousel and calendar
  useEffect(() => {
    if (!calendarReady || !moment) return

    const loadUpcomingEvents = async () => {
      if (!currentZone?.id) return
      try {
        const { UpcomingEventsService } = await import('./_lib/upcoming-events-service')
        const carouselEvents = await UpcomingEventsService.getCarouselEvents(currentZone.id)
        const allUpcoming = await UpcomingEventsService.getUpcomingEvents(currentZone.id)

        setUpcomingEvents(carouselEvents)

        // Convert to calendar events
        const calendarEvents = allUpcoming.map(event => ({
          id: event.id,
          title: event.title,
          start: new Date(event.date),
          end: new Date(event.date),
          allDay: !event.time,
          color: '#8b5cf6', // Purple for upcoming events
          description: event.description,
          location: event.location,
          time: event.time,
          type: event.type
        }))

        setUpcomingEventsList(calendarEvents)
      } catch (error) {
 console.error('Error loading upcoming events:', error)
      }
    }

    loadUpcomingEvents()
  }, [calendarReady, currentZone?.id])

  // Merge all sources for the Unified Carousel
  const carouselFilteredEvents = useMemo(() => {
    // 1. Start with dedicated upcoming events (Announcements, etc.)
    const eventsFromService = upcomingEvents.map(e => ({
      ...e,
      type: e.type || 'event'
    }))

    // 2. Add regular calendar events that aren't already included
    const gridEvents = (events || [])
      .filter(e => {
        if (!e.start) return false
        const start = moment(e.start)
        // Show everything from today through next 45 days in carousel
        const isUpcoming = start.isSameOrAfter(moment().startOf('day')) &&
          start.isBefore(moment().add(45, 'days'))

        // Avoid duplicates if title and date match
        const isAlreadyIn = eventsFromService.some(es =>
          es.title === e.title && moment(es.date).isSame(start, 'day')
        )
        return isUpcoming && !isAlreadyIn
      })
      .map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
        date: moment(e.start).format('YYYY-MM-DD'),
        time: moment(e.start).format('h:mm A'),
        location: e.location || '',
        type: 'event' as const,
        showInCarousel: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

    return [...eventsFromService, ...gridEvents]
  }, [upcomingEvents, events])

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!canManage) return
    setSelectedSlot({ start, end })
    setSelectedEvent(null)
    setShowEventModal(true)
  }

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event as CalendarEvent)
    setShowDetailsModal(true)
  }

  const handleCreateEvent = () => {
    setSelectedSlot({ start: new Date(), end: new Date(Date.now() + 60 * 60 * 1000) })
    setSelectedEvent(null)
    setShowEventModal(true)
  }

  const handleEventSaved = (event: CalendarEvent) => {
    if (selectedEvent) {
      setEvents(prev => prev.map(e => e.id === event.id ? event : e))
    } else {
      // Add new event
      setEvents(prev => [...prev, event])
    }
    setShowEventModal(false)
    setSelectedSlot(null)
    setSelectedEvent(null)
  }

  const handleEventDeleted = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId))
    setShowDetailsModal(false)
    setSelectedEvent(null)
  }

  const eventStyleGetter = (event: any) => {
    const backgroundColor = event.color || currentZone?.themeColor || '#10b981'
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '13px',
        fontWeight: '500'
      }
    }
  }

  // Only show loading if auth is loading AND no cached profile
  if (authLoading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If we have cached profile, show content even if user is still loading
  // This prevents blank screen on revisits

  if (!currentZone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Zone Selected</h2>
          <p className="text-gray-600">Please select a zone to view the calendar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden">
      <CalendarStyles />

      {/* Mobile Header - Compact */}
      <div className="lg:hidden">
        <ScreenHeader
          title={calendarReady && moment ? moment(date).format('MMM YYYY') : ''}
          showBackButton={true}
          showMenuButton={true}
          backPath="/home"
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          leftButtons={
            <button
              onClick={() => {
                const newDate = new Date(date)
                if (view === 'month') newDate.setMonth(newDate.getMonth() - 1)
                else if (view === 'week') newDate.setDate(newDate.getDate() - 7)
                else newDate.setDate(newDate.getDate() - 1)
                setDate(newDate)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          }
          rightButtons={
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const newDate = new Date(date)
                  if (view === 'month') newDate.setMonth(newDate.getMonth() + 1)
                  else if (view === 'week') newDate.setDate(newDate.getDate() + 7)
                  else newDate.setDate(newDate.getDate() + 1)
                  setDate(newDate)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setDate(new Date())}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Today
              </button>
            </div>
          }
        />
      </div>

      {/* Google Calendar Style Toolbar - Desktop */}
      {calendarReady && moment && (
        <GoogleCalendarToolbar
          date={date}
          view={view}
          views={['month', 'week', 'day', 'agenda']}
          label={moment(date).format(view === 'month' ? 'MMMM YYYY' : view === 'week' ? 'MMMM YYYY' : 'MMMM D, YYYY')}
          onNavigate={(action) => {
            if (action === 'PREV') {
              const newDate = new Date(date)
              if (view === 'month') newDate.setMonth(newDate.getMonth() - 1)
              else if (view === 'week') newDate.setDate(newDate.getDate() - 7)
              else newDate.setDate(newDate.getDate() - 1)
              setDate(newDate)
            } else if (action === 'NEXT') {
              const newDate = new Date(date)
              if (view === 'month') newDate.setMonth(newDate.getMonth() + 1)
              else if (view === 'week') newDate.setDate(newDate.getDate() + 7)
              else newDate.setDate(newDate.getDate() + 1)
              setDate(newDate)
            } else if (action === 'TODAY') {
              setDate(new Date())
            }
          }}
          onView={setView}
          themeColor={currentZone.themeColor || '#10b981'}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Drawer on mobile */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 
          fixed lg:relative 
          z-50 lg:z-auto 
          transition-transform duration-300 ease-in-out
          h-full
        `}>
          {calendarReady && (
            <CalendarSidebar
              date={date}
              onDateSelect={(newDate) => {
                setDate(newDate)
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false)
                }
              }}
              onCreateEvent={() => {
                handleCreateEvent()
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false)
                }
              }}
              themeColor={currentZone.themeColor || '#10b981'}
              zoneName={currentZone.name}
              view={view}
              onViewChange={(newView) => {
                setView(newView)
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false)
                }
              }}
              upcomingEvents={upcomingEventsList}
              canManage={canManage}
            />
          )}
        </div>

        {/* Calendar Area - Apple-style reveal animation */}
        <div
          className={`
            flex-1 overflow-auto bg-gray-100
            transition-all duration-300 ease-in-out
            lg:translate-x-0 lg:scale-100 lg:rounded-none
            ${sidebarOpen
              ? 'translate-x-64 scale-[0.85] rounded-2xl shadow-2xl origin-left'
              : 'translate-x-0 scale-100 rounded-none'
            }
          `}
          onClick={() => sidebarOpen && setSidebarOpen(false)}
        >
          <div className="h-full bg-white relative z-0 flex flex-col">
            {!calendarReady || !moment || loading ? (
              <div className="flex items-center justify-center flex-1 py-20">
                <div className="text-center">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 sm:border-4 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {!calendarReady || !moment ? 'Initializing...' : 'Loading events...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Unified Carousel - Birthdays + Events */}
                {(todaysBirthdays.length > 0 || carouselFilteredEvents.length > 0) && (
                  <div className="w-full flex-shrink-0 bg-white border-b border-gray-100 shadow-sm overflow-hidden z-10">
                    <UnifiedCarousel
                      birthdays={todaysBirthdays}
                      events={carouselFilteredEvents}
                      themeColor={currentZone?.themeColor || '#10b981'}
                    />
                  </div>
                )}

                <div className="flex-1 p-2 sm:p-4 min-h-[400px] sm:min-h-[500px]">
                  <Calendar
                    localizer={momentLocalizer}
                    events={[...events, ...upcomingEventsList]}
                    startAccessor={(event: any) => event.start}
                    endAccessor={(event: any) => event.end}
                    style={{ height: '100%', minHeight: '400px' }}
                    view={view}
                    onView={(newView: any) => setView(newView)}
                    date={date}
                    onNavigate={setDate}
                    selectable={canManage}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventStyleGetter}
                    toolbar={false}
                    formats={{
                      timeGutterFormat: 'h A',
                      eventTimeRangeFormat: ({ start, end }: any) =>
                        `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
                      agendaTimeRangeFormat: ({ start, end }: any) =>
                        `${moment(start).format('h:mm A')} - ${moment(end).format('h:mm A')}`,
                      dayHeaderFormat: (date: Date) => moment(date).format('ddd M/D'),
                      dayRangeHeaderFormat: ({ start, end }: any) =>
                        `${moment(start).format('MMM D')} - ${moment(end).format('MMM D, YYYY')}`,
                    }}
                    scrollToTime={new Date()}
                    step={30}
                    timeslots={2}
                    min={new Date(new Date().setHours(6, 0, 0, 0))}
                    max={new Date(new Date().setHours(23, 30, 0, 0))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setSelectedSlot(null)
            setSelectedEvent(null)
          }}
          onSave={handleEventSaved}
          event={selectedEvent}
          defaultStart={selectedSlot?.start}
          defaultEnd={selectedSlot?.end}
          zoneId={currentZone.id}
          themeColor={currentZone.themeColor || '#10b981'}
        />
      )}

      {/* Event Details Modal */}
      {showDetailsModal && (
        <EventDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedEvent(null)
          }}
          event={selectedEvent}
          onEdit={() => {
            setShowDetailsModal(false)
            setShowEventModal(true)
          }}
          onDelete={handleEventDeleted}
          themeColor={currentZone.themeColor || '#10b981'}
          canManage={canManage}
        />
      )}
    </div>
  )
}      
