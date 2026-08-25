"use client";

import { useState, useEffect, useRef } from 'react'
import { Cake, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import moment from 'moment'
import { BirthdayUser } from '../_lib/birthday-service'

interface BirthdayCarouselProps {
  birthdays: BirthdayUser[]
  themeColor: string
}

export default function BirthdayCarousel({ birthdays, themeColor }: BirthdayCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (birthdays.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % birthdays.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [birthdays.length, isPaused])

  if (birthdays.length === 0) return null

  const currentBirthday = birthdays[currentIndex]
  const fullName = `${currentBirthday.first_name} ${currentBirthday.last_name}`.trim()
  const initials = `${currentBirthday.first_name?.[0] || ''}${currentBirthday.last_name?.[0] || ''}`.toUpperCase()

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + birthdays.length) % birthdays.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % birthdays.length)
  }

  return (
    <div 
      ref={carouselRef}
      className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 left-10 w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }} />
        <div className="absolute top-8 right-20 w-3 h-3 bg-yellow-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '2.5s' }} />
        <div className="absolute bottom-6 left-1/4 w-4 h-4 bg-pink-300 rounded-full animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '2.2s' }} />
        <div className="absolute bottom-10 right-1/3 w-3 h-3 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '2.8s' }} />
        <div className="absolute top-1/2 left-1/2 w-5 h-5 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '1.2s', animationDuration: '2.4s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        {/* Navigation - Previous */}
        {birthdays.length > 1 && (
          <button
            onClick={goToPrevious}
            className="flex-shrink-0 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-95 backdrop-blur-sm"
            aria-label="Previous birthday"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Birthday E-Card */}
        <div className="flex-1 flex items-center justify-center gap-6 px-4">
          {/* Profile Section */}
          <div className="relative flex-shrink-0">
            {currentBirthday.profile_image_url ? (
              <img
                src={currentBirthday.profile_image_url}
                alt={fullName}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-2xl"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-2xl"
                style={{ backgroundColor: themeColor }}
              >
                {initials}
              </div>
            )}
            {/* Floating Cake Icon */}
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Cake className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Message Section */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wide">
                {currentBirthday.isToday ? 'Happy Birthday!' : 'Upcoming Birthday'}
              </h3>
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mb-1 drop-shadow-lg">
              {fullName}
            </p>
            <p className="text-base sm:text-lg text-white/90 font-medium">
              {currentBirthday.isToday 
                ? (currentBirthday.age ? ` Celebrating ${currentBirthday.age} amazing years! ` : ' Wishing you an amazing day! ')
                : ` Birthday on ${moment(currentBirthday.birthday).format('MMMM D')} `
              }
            </p>
          </div>
        </div>

        {/* Navigation - Next */}
        {birthdays.length > 1 && (
          <button
            onClick={goToNext}
            className="flex-shrink-0 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-95 backdrop-blur-sm"
            aria-label="Next birthday"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Dots Indicator - Very tiny */}
      {birthdays.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
          {birthdays.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all ${
                index === currentIndex
                  ? 'w-3 h-1 bg-white'
                  : 'w-1 h-1 bg-white/50 hover:bg-white/70'
              } rounded-full`}
              aria-label={`Go to birthday ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Decorative Sparkles */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-pink-300 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  )
}
