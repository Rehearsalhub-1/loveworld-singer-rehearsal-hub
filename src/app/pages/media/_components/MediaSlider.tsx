"use client";

import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import MediaCard from './MediaCard'
import { MediaItem } from '../_lib'

interface MediaSliderProps {
  data: MediaItem[]
  title: string
}

export default function MediaSlider({ data, title }: MediaSliderProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [controlVisibility, setControlVisibility] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(0)

  const handleDirection = (direction: 'left' | 'right') => {
    if (!listRef.current) return

    const distance = listRef.current.getBoundingClientRect().x - 70

    if (direction === 'left' && sliderPosition > 0) {
      listRef.current.style.transform = `translateX(${230 + distance}px)`
      setSliderPosition(sliderPosition - 1)
    }

    if (direction === 'right' && sliderPosition < 4) {
      listRef.current.style.transform = `translateX(${-230 + distance}px)`
      setSliderPosition(sliderPosition + 1)
    }
  }

  if (!data || data.length === 0) return null

  return (
    <div
      className="relative py-4 px-2"
      onMouseEnter={() => setControlVisibility(true)}
      onMouseLeave={() => setControlVisibility(false)}
    >
      {/* Title */}
      <h2 className="text-white text-2xl font-bold mb-4 ml-2">
        {title}
      </h2>

      {/* Slider Wrapper */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => handleDirection('left')}
          className={`absolute left-0 top-0 bottom-0 z-40 w-12 bg-black/50 hover:bg-black/80 flex items-center justify-center transition-all ${
            !controlVisibility || sliderPosition === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        {/* Slider */}
        <div className="overflow-hidden">
          <div
            ref={listRef}
            className="flex gap-2 transition-transform duration-700 ease-in-out ml-2"
            style={{ transform: 'translateX(0px)' }}
          >
            {data.map((media) => (
              <div key={media.id} className="min-w-[230px] w-[230px]">
                <MediaCard media={media} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => handleDirection('right')}
          className={`absolute right-0 top-0 bottom-0 z-40 w-12 bg-black/50 hover:bg-black/80 flex items-center justify-center transition-all ${
            !controlVisibility || sliderPosition >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  )
}
