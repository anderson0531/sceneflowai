'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Film, Maximize, Minimize } from 'lucide-react'
import { StudioVideoWatermark } from '@/components/landing/StudioVideoWatermark'
import { cn } from '@/lib/utils'

interface LandingSampleVideoProps {
  src: string
  placeholderTitle: string
  className?: string
  /** Show enter/exit fullscreen control (Express animatic sample). */
  enableFullscreen?: boolean
}

export function LandingSampleVideo({
  src,
  placeholderTitle,
  className,
  enableFullscreen = false,
}: LandingSampleVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(!!src)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!enableFullscreen || !containerRef.current) return

      if (document.fullscreenElement) {
        void document.exitFullscreen?.()
        return
      }

      void containerRef.current.requestFullscreen?.()
    },
    [enableFullscreen]
  )

  if (!src?.trim()) {
    return (
      <div
        className={cn(
          'relative w-full h-full min-h-[200px] bg-slate-900 flex flex-col items-center justify-center gap-3 group',
          className
        )}
      >
        <div className="w-14 h-14 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
          <Film className="w-7 h-7 text-slate-500" />
        </div>
        <p className="text-sm text-slate-500 px-4 text-center">{placeholderTitle}</p>
      </div>
    )
  }

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full min-h-[200px] bg-black group cursor-pointer overflow-hidden',
        isFullscreen && 'flex items-center justify-center',
        className
      )}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn('w-full h-full object-cover', isFullscreen && 'max-h-screen')}
        autoPlay
        muted={isMuted}
        loop
        playsInline
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload"
      />
      <StudioVideoWatermark />
      <div
        className={cn(
          'absolute inset-0 z-20 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
          isFullscreen && 'opacity-100'
        )}
      >
        <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={togglePlay}
            className="text-white hover:text-cyan-400 transition"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="text-white hover:text-cyan-400 transition"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {enableFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="ml-auto text-white hover:text-cyan-400 transition"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
