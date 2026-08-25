"use client";

import { useState, useEffect } from 'react'
import { Cake, Sparkles, ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react'
import moment from 'moment'
import { BirthdayUser } from '../_lib/birthday-service'
import { UpcomingEvent } from '../_lib/upcoming-events-service'

interface CarouselItem {
  id: string
  type: 'birthday' | 'event'
  data: BirthdayUser | UpcomingEvent
}

interface UnifiedCarouselProps {
  birthdays: BirthdayUser[]
  events: UpcomingEvent[]
  themeColor: string
}

export default function UnifiedCarousel({ birthdays, events, themeColor }: UnifiedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Combine birthdays and events
  const carouselItems: CarouselItem[] = [
    ...birthdays.map(b => ({ id: `birthday-${b.id}`, type: 'birthday' as const, data: b })),
    ...events.map(e => ({ id: `event-${e.id}`, type: 'event' as const, data: e }))
  ]

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (carouselItems.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselItems.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [carouselItems.length, isPaused])

  if (carouselItems.length === 0) return null

  const currentItem = carouselItems[currentIndex]

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % carouselItems.length)
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
    <div
      className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Animated Background Pattern - Hidden on mobile for cleaner look */}
      <div className="absolute inset-0 opacity-20 hidden sm:block">
        <div className="absolute top-4 left-10 w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }} />
        <div className="absolute top-8 right-20 w-2 h-2 bg-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '2.5s' }} />
        <div className="absolute bottom-6 left-1/4 w-3 h-3 bg-pink-300 rounded-full animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '2.2s' }} />
        <div className="absolute bottom-10 right-1/3 w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '2.8s' }} />
      </div>

      {/* Main Content - Mobile First */}
      <div className="relative z-10 px-3 sm:px-6 py-4 sm:py-6 flex items-center justify-between max-w-7xl mx-auto">
        {/* Navigation - Previous (Hidden on mobile, swipe instead) */}
        {carouselItems.length > 1 && (
          <button
            onClick={goToPrevious}
            className="hidden sm:flex items-center justify-center flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-95 backdrop-blur-sm"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-row items-center justify-center gap-3 sm:gap-6 px-2 sm:px-4">
          {currentItem.type === 'birthday' ? (
            // Birthday Card - Mobile Optimized
            <>
              {/* Profile Section */}
              <div className="relative flex-shrink-0">
                {(currentItem.data as BirthdayUser)?.profile_image_url ? (
                  <img
                    src={(currentItem.data as BirthdayUser).profile_image_url!}
                    alt={(currentItem.data as BirthdayUser).first_name || 'User'}
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-3 sm:border-4 border-white shadow-xl"
                  />
                ) : (
                  <div
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-2xl border-3 sm:border-4 border-white shadow-xl"
                    style={{ backgroundColor: themeColor }}
                  >
                    {`${(currentItem.data as BirthdayUser)?.first_name?.[0] || ''}${(currentItem.data as BirthdayUser)?.last_name?.[0] || ''}`.toUpperCase() || '?'}
                  </div>
                )}
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-10 sm:h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Cake className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>

              {/* Message Section */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                  <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-300 animate-pulse" />
                  <h3 className="text-xs sm:text-xl font-bold text-white uppercase tracking-wide truncate">
                    {(currentItem.data as BirthdayUser).isToday ? 'Happy Birthday!' : 'Upcoming Birthday'}
                  </h3>
                </div>
                <p className="text-sm sm:text-3xl font-extrabold text-white mb-0.5 sm:mb-1 drop-shadow-lg truncate">
                  {`${(currentItem.data as BirthdayUser).first_name || ''} ${(currentItem.data as BirthdayUser).last_name || ''}`.trim() || 'Valued Member'}
                </p>
                <p className="text-xs sm:text-lg text-white/90 font-medium truncate">
                  {(currentItem.data as BirthdayUser).isToday
                    ? ' Amazing day!'
                    : ` ${moment((currentItem.data as BirthdayUser).birthday).format('MMM D')}`
                  }
                </p>
              </div>
            </>
          ) : (currentItem.data as UpcomingEvent)?.image ? (
            // Event Card WITH Image - Image on left, details on right
            <>
              {/* Event Image - Bigger */}
              <div className="relative flex-shrink-0">
                <img
                  src={(currentItem.data as UpcomingEvent).image!}
                  alt={(currentItem.data as UpcomingEvent).title || 'Event'}
                  className="w-28 h-28 sm:w-40 sm:h-40 rounded-xl object-cover border-2 sm:border-4 border-white shadow-xl"
                />
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg text-base sm:text-2xl">
                  {getEventTypeIcon((currentItem.data as UpcomingEvent).type || 'event')}
                </div>
              </div>

              {/* Event Details */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                  <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-yellow-300 animate-pulse" />
                  <h3 className="text-xs sm:text-lg font-bold text-white uppercase tracking-wide">
                    {moment((currentItem.data as UpcomingEvent).date).isSame(moment(), 'day')
                      ? "Today's Event"
                      : 'Upcoming Event'}
                  </h3>
                </div>
                <p className="text-base sm:text-2xl font-extrabold text-white mb-1 sm:mb-2 drop-shadow-lg line-clamp-2">
                  {(currentItem.data as UpcomingEvent).title || 'Untitled Event'}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/90">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-medium">
                      {moment((currentItem.data as UpcomingEvent).date).isSame(moment(), 'day')
                        ? 'Today'
                        : moment((currentItem.data as UpcomingEvent).date).format('MMM D')}
                    </span>
                  </div>
                  {(currentItem.data as UpcomingEvent).time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">
                        {(currentItem.data as UpcomingEvent).time}
                      </span>
                    </div>
                  )}
                  {(currentItem.data as UpcomingEvent).location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-[150px]">
                        {(currentItem.data as UpcomingEvent).location}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Event Card WITHOUT Image - Icon style
            <>
              {/* Event Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 sm:border-4 border-white shadow-xl flex items-center justify-center text-2xl sm:text-5xl">
                  {getEventTypeIcon((currentItem.data as UpcomingEvent).type || 'event')}
                </div>
              </div>

              {/* Event Details */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                  <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-300 animate-pulse" />
                  <h3 className="text-xs sm:text-xl font-bold text-white uppercase tracking-wide">
                    {moment((currentItem.data as UpcomingEvent).date).isSame(moment(), 'day')
                      ? "Today's Event"
                      : 'Upcoming Event'}
                  </h3>
                </div>
                <p className="text-sm sm:text-3xl font-extrabold text-white mb-1 sm:mb-2 drop-shadow-lg truncate">
                  {(currentItem.data as UpcomingEvent).title || 'Untitled Event'}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/90">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-medium">
                      {moment((currentItem.data as UpcomingEvent).date).isSame(moment(), 'day')
                        ? 'Today'
                        : moment((currentItem.data as UpcomingEvent).date).format('MMM D')}
                    </span>
                  </div>
                  {(currentItem.data as UpcomingEvent).time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">
                        {(currentItem.data as UpcomingEvent).time}
                      </span>
                    </div>
                  )}
                  {(currentItem.data as UpcomingEvent).location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-[120px]">
                        {(currentItem.data as UpcomingEvent).location}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation - Next (Hidden on mobile) */}
        {carouselItems.length > 1 && (
          <button
            onClick={goToNext}
            className="hidden sm:flex items-center justify-center flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-95 backdrop-blur-sm"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  )
}
