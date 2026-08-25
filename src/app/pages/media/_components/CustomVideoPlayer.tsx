"use client";

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, RotateCcw, RotateCw } from 'lucide-react'

interface CustomVideoPlayerProps {
  url: string
  isYouTube?: boolean
  poster?: string
  onProgress?: (progress: { played: number; playedSeconds: number }) => void
  onEnded?: () => void
  onDuration?: (duration: number) => void
}

// Extract YouTube video ID from URL
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export default function CustomVideoPlayer({
  url,
  isYouTube = false,
  poster,
  onProgress,
  onEnded,
  onDuration
}: CustomVideoPlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [played, setPlayed] = useState(0)
  const [playedSeconds, setPlayedSeconds] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [skipOverlay, setSkipOverlay] = useState<{ type: 'forward' | 'backward', visible: boolean }>({ type: 'forward', visible: false })
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const progressRef = useRef<HTMLDivElement>(null)

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const hideControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 2500)
  }, [playing])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    hideControlsTimer()
  }, [hideControlsTimer])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video || isYouTube) return

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime
      const videoDuration = video.duration || 0
      setPlayedSeconds(currentTime)
      setPlayed(videoDuration > 0 ? currentTime / videoDuration : 0)
      onProgress?.({ played: videoDuration > 0 ? currentTime / videoDuration : 0, playedSeconds: currentTime })
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      onDuration?.(video.duration)
      setIsLoading(false)
    }

    const handleEnded = () => {
      setPlaying(false)
      onEnded?.()
    }

    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handlePlay = () => setPlaying(true)
    const handlePause = () => setPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [isYouTube, onProgress, onDuration, onEnded])

  // Sync playing state with video
  useEffect(() => {
    const video = videoRef.current
    if (!video || isYouTube) return

    if (playing) {
      video.play().catch(() => setPlaying(false))
    } else {
      video.pause()
    }
  }, [playing, isYouTube])

  // Sync volume/mute with video
  useEffect(() => {
    const video = videoRef.current
    if (!video || isYouTube) return
    video.volume = volume
    video.muted = muted
  }, [volume, muted, isYouTube])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || isYouTube) return
    const video = videoRef.current
    if (!video) return

    const rect = progressRef.current.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    video.currentTime = pos * duration
    setPlayed(pos)
  }

  const togglePlay = () => {
    if (isYouTube) return // YouTube handles its own controls
    setPlaying(!playing)
  }

  const toggleMute = () => setMuted(!muted)

  const skip = (seconds: number) => {
    if (isYouTube) return
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration))

      // Trigger overlay animation
      const type = seconds > 0 ? 'forward' : 'backward'
      setSkipOverlay({ type, visible: true })

      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current)
      skipTimeoutRef.current = setTimeout(() => {
        setSkipOverlay(prev => ({ ...prev, visible: false }))
      }, 500)
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else if (document.fullscreenElement) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
 console.error('Fullscreen error:', err)
    }
  }

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (isYouTube) return // YouTube handles its own shortcuts

    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); setPlaying(p => !p); break
        case 'ArrowLeft': case 'j': e.preventDefault(); skip(-10); break
        case 'ArrowRight': case 'l': e.preventDefault(); skip(10); break
        case 'm': e.preventDefault(); setMuted(m => !m); break
        case 'f': e.preventDefault(); toggleFullscreen(); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isYouTube, duration])

  useEffect(() => () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current) }, [])

  if (!url) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <p className="text-white/60">No video URL provided</p>
      </div>
    )
  }

  // YouTube embed
  if (isYouTube) {
    const videoId = getYouTubeId(url)
    if (!videoId) {
      return (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <p className="text-white/60">Invalid YouTube URL</p>
        </div>
      )
    }

    return (
      <div ref={containerRef} className="relative w-full h-full bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&playsinline=1`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title="YouTube video player"
        />
      </div>
    )
  }

  // Native HTML5 video player
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return
        togglePlay()
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={url}
        poster={poster}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        preload="metadata"
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Center Play Button (when paused) */}
      {!playing && !isLoading && !skipOverlay.visible && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Skip Overlays - YouTube Style */}
      {skipOverlay.visible && (
        <div className={`absolute inset-y-0 ${skipOverlay.type === 'forward' ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} w-1/3 bg-white/10 flex flex-col items-center justify-center z-40 pointer-events-none transition-opacity duration-300`}>
          <div className="flex flex-col items-center animate-out fade-out zoom-out duration-500">
            {skipOverlay.type === 'forward' ? (
              <>
                <div className="flex gap-1 mb-1">
                  <Play className="w-6 h-6 fill-white text-white" />
                  <Play className="w-6 h-6 fill-white text-white" />
                  <Play className="w-6 h-6 fill-white text-white" />
                </div>
                <span className="text-white font-bold text-sm">10 seconds</span>
              </>
            ) : (
              <>
                <div className="flex gap-1 mb-1 rotate-180">
                  <Play className="w-6 h-6 fill-white text-white" />
                  <Play className="w-6 h-6 fill-white text-white" />
                  <Play className="w-6 h-6 fill-white text-white" />
                </div>
                <span className="text-white font-bold text-sm">10 seconds</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute inset-0 transition-opacity duration-200 z-30 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Mobile skip buttons */}
        <div className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-center sm:hidden">
          <button onClick={(e) => { e.stopPropagation(); skip(-10) }} className="p-4 active:scale-90 transition-transform">
            <RotateCcw className="w-8 h-8 text-white/80" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-center sm:hidden">
          <button onClick={(e) => { e.stopPropagation(); skip(10) }} className="p-4 active:scale-90 transition-transform">
            <RotateCw className="w-8 h-8 text-white/80" />
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 sm:px-4 sm:pb-3">
          {/* Progress Bar - Improved Touch Sensitivity */}
          <div 
            className="group/progress w-full h-8 flex items-center cursor-pointer mb-2 sm:mb-3 relative z-50"
            onClick={handleProgressClick}
          >
            <div
              ref={progressRef}
              className="w-full h-[3px] bg-white/20 relative group-hover/progress:h-1.5 transition-all duration-200"
            >
              {/* Played progress */}
              <div 
                className="absolute inset-y-0 left-0 bg-red-600 rounded-full transition-all" 
                style={{ width: `${played * 100}%` }} 
              />
              {/* Scrubber dot - Enlarged for touch */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 sm:w-3.5 sm:h-3.5 bg-red-600 rounded-full scale-100 sm:scale-0 group-hover/progress:scale-100 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                style={{ left: `calc(${played * 100}% - 8px)` }}
              />
            </div>
          </div>

          {/* Control Buttons - YouTube Style */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Play/Pause */}
            <button onClick={(e) => { e.stopPropagation(); togglePlay() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              {playing ? <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="white" /> : <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-0.5" fill="white" />}
            </button>

            {/* Skip buttons (desktop only) */}
            <button onClick={(e) => { e.stopPropagation(); skip(-10) }} className="hidden sm:block p-2 hover:bg-white/20 rounded-full transition-colors" title="Rewind 10s">
              <RotateCcw className="w-6 h-6 text-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); skip(10) }} className="hidden sm:block p-2 hover:bg-white/20 rounded-full transition-colors" title="Forward 10s">
              <RotateCw className="w-6 h-6 text-white" />
            </button>

            {/* Volume */}
            <div
              className="hidden sm:flex items-center gap-1 relative group/volume"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button onClick={(e) => { e.stopPropagation(); toggleMute() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                {muted || volume === 0 ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${showVolumeSlider ? 'w-24' : 'w-0'}`}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-[3px] bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, white 0%, white ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) 100%)`
                  }}
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-white text-[13px] sm:text-sm font-medium ml-1 sm:ml-2 tabular-nums">
              {formatTime(playedSeconds)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen() }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              {isFullscreen ? <Minimize className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> : <Maximize className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
