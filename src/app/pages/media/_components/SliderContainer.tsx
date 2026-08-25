"use client";

import MediaSlider from './MediaSlider'
import { MediaItem } from '../_lib'

interface SliderContainerProps {
  media: MediaItem[]
}

export default function SliderContainer({ media }: SliderContainerProps) {
  const getMediaBetween = (start: number, end: number) => {
    return media.slice(start, end)
  }

  if (!media || media.length === 0) return null

  return (
    <div className="space-y-8 pb-16">
      <MediaSlider data={getMediaBetween(0, 10)} title="Featured Content" />
      <MediaSlider data={getMediaBetween(10, 20)} title="Trending Now" />
      <MediaSlider data={getMediaBetween(20, 30)} title="Popular on LWSRH" />
      <MediaSlider data={getMediaBetween(30, 40)} title="Worship Sessions" />
      <MediaSlider data={getMediaBetween(40, 50)} title="Sermons" />
      <MediaSlider data={getMediaBetween(50, 60)} title="New Releases" />
      <MediaSlider data={getMediaBetween(60, 70)} title="Praise Nights" />
    </div>
  )
}
