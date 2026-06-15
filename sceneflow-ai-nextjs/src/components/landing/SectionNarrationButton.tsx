'use client'

import { useCallback, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SectionNarrationButtonProps = {
  /** Audio URL; when missing, renders a disabled "coming soon" state. */
  src?: string
  playLabel?: string
  pauseLabel?: string
  comingSoonLabel?: string
  className?: string
}

/**
 * Icon-only play/pause control for landing-section narration audio.
 * Each instance manages its own <audio> element so sections play independently.
 */
export function SectionNarrationButton({
  src,
  playLabel = 'Play narration',
  pauseLabel = 'Pause narration',
  comingSoonLabel = 'Narration coming soon',
  className,
}: SectionNarrationButtonProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !src) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
  }, [isPlaying, src])

  if (!src) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 p-2 text-gray-500 cursor-not-allowed opacity-40',
          className
        )}
        aria-label={comingSoonLabel}
      >
        <Play className="h-4 w-4" />
      </button>
    )
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          togglePlayback()
        }}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/20 transition-colors',
          className
        )}
        aria-label={isPlaying ? pauseLabel : playLabel}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </>
  )
}
