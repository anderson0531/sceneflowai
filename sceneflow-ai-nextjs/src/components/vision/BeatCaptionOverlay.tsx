'use client'

import { cn } from '@/lib/utils'
import type { BeatOverlayType } from '@/lib/script/segmentTypes'

interface BeatCaptionOverlayProps {
  text: string
  overlayType: BeatOverlayType
  isPlaying?: boolean
  isFullscreen?: boolean
  /** When true, shift lower-third above the speaker label band. */
  hasSpeakerLabel?: boolean
}

export function BeatCaptionOverlay({
  text,
  overlayType,
  isPlaying = false,
  isFullscreen = false,
  hasSpeakerLabel = false,
}: BeatCaptionOverlayProps) {
  const trimmed = text.trim()
  if (!trimmed) return null

  const baseTransition = isPlaying ? 'opacity 0.35s ease-out, transform 0.35s ease-out' : 'opacity 0.2s ease-out'

  if (overlayType === 'title') {
    return (
      <div
        className="absolute inset-0 z-[2] pointer-events-none flex items-center justify-center px-[8%]"
        style={{ transition: baseTransition }}
      >
        <p
          className={cn(
            'text-center font-bold text-white leading-tight tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]',
            isFullscreen ? 'text-3xl md:text-5xl' : 'text-xl md:text-3xl'
          )}
          style={{
            textShadow: '0 0 24px rgba(0,0,0,0.65)',
            transform: isPlaying ? 'scale(1)' : 'scale(0.98)',
          }}
        >
          {trimmed}
        </p>
      </div>
    )
  }

  if (overlayType === 'signage') {
    return (
      <div
        className="absolute inset-x-0 top-[10%] z-[2] pointer-events-none flex justify-center px-[10%]"
        style={{ transition: baseTransition }}
      >
        <div className="rounded-md border border-white/25 bg-black/45 px-4 py-2 backdrop-blur-[2px]">
          <p
            className={cn(
              'text-center font-semibold text-white/95 tracking-wide uppercase',
              isFullscreen ? 'text-lg md:text-2xl' : 'text-sm md:text-lg'
            )}
          >
            {trimmed}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'absolute inset-x-0 z-[2] pointer-events-none px-[6%]',
        hasSpeakerLabel ? 'bottom-12' : 'bottom-6'
      )}
      style={{ transition: baseTransition }}
    >
      <div className="mx-auto max-w-[92%] rounded bg-black/72 px-3 py-2 border-l-4 border-blue-400/80">
        <p
          className={cn(
            'text-white font-medium leading-snug',
            isFullscreen ? 'text-base md:text-lg' : 'text-xs md:text-sm'
          )}
        >
          {trimmed}
        </p>
      </div>
    </div>
  )
}
