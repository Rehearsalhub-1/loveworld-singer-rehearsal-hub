"use client";

import { useState, useEffect } from 'react'
import { extractYouTubeVideoId, getYouTubeThumbnailFallbacks } from '@/utils/youtube'

interface YouTubeThumbnailProps {
  url: string
  alt: string
  className?: string
  onClick?: () => void
  onLoad?: () => void
  fallbackSrc?: string
}

export default function YouTubeThumbnail({ 
  url, 
  alt, 
  className = '', 
  onClick,
  onLoad,
  fallbackSrc = '/movie/default-hero.jpeg'
}: YouTubeThumbnailProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const [fallbackIndex, setFallbackIndex] = useState(0)

  useEffect(() => {
    const videoId = extractYouTubeVideoId(url)
    
    if (videoId) {
      const fallbacks = getYouTubeThumbnailFallbacks(videoId)
      setCurrentSrc(fallbacks[0])
      setFallbackIndex(0)
    } else {
      setCurrentSrc(url)
    }
  }, [url])

  const handleError = () => {
    const videoId = extractYouTubeVideoId(url)
    if (videoId) {
      const fallbacks = getYouTubeThumbnailFallbacks(videoId)
      const nextIndex = fallbackIndex + 1
      
      if (nextIndex < fallbacks.length) {
        setCurrentSrc(fallbacks[nextIndex])
        setFallbackIndex(nextIndex)
      } else {
        setCurrentSrc(fallbackSrc)
      }
    } else {
      setCurrentSrc(fallbackSrc)
    }
  }

  const handleLoad = () => {
    if (onLoad) {
      onLoad()
    }
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      onLoad={handleLoad}
      onError={handleError}
    />
  )
}