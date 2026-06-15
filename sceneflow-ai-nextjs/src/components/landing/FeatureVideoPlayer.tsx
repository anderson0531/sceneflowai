'use client'

import { useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink } from 'lucide-react'
import { StudioVideoWatermark } from '@/components/landing/StudioVideoWatermark'

export type VideoAriaLabels = {
  play: string
  pause: string
  mute: string
  unmute: string
  expandVideo: string
}

export function MediaAssetLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-400/90 hover:text-cyan-300 transition-colors break-all"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </a>
  )
}

export function FeatureVideoPlayer({
  src,
  onExpand,
  className = 'w-full h-full object-cover',
  autoPlay = true,
  showExpand = true,
  ariaLabels,
}: {
  src: string
  onExpand?: (e: React.MouseEvent) => void
  className?: string
  autoPlay?: boolean
  showExpand?: boolean
  ariaLabels: VideoAriaLabels
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isMuted, setIsMuted] = useState(true)

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full group bg-black cursor-pointer overflow-hidden rounded-lg"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        autoPlay={autoPlay}
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

      <div className="absolute inset-0 z-20 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-cyan-400 transition"
              aria-label={isPlaying ? ariaLabels.pause : ariaLabels.play}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-cyan-400 transition"
              aria-label={isMuted ? ariaLabels.unmute : ariaLabels.mute}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          {showExpand && onExpand && (
            <button
              onClick={onExpand}
              className="text-white hover:text-cyan-400 transition"
              aria-label={ariaLabels.expandVideo}
            >
              <Maximize className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 transition-transform group-hover:scale-110">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  )
}
