'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Film, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface ScreeningRoomVideoPlayerProps {
  videoUrl: string
  title: string
  onClose: () => void
}

/**
 * Full-viewport video chrome aligned with Screening Room (Premiere / final-cut cards).
 * Separate from storyboard ScreeningRoomV2 — plays a single exported or uploaded MP4/MOV.
 */
export function ScreeningRoomVideoPlayer({ videoUrl, title, onClose }: ScreeningRoomVideoPlayerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Screening Room video player"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950/95 px-3 py-2.5 sm:px-4">
        <Film className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Screening Room</p>
          <h2 className="truncate text-sm font-semibold text-white sm:text-base">{title}</h2>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
          onClick={onClose}
          aria-label="Close player"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-3 sm:p-6">
        <video
          key={videoUrl}
          src={videoUrl}
          controls
          playsInline
          autoPlay
          className="max-h-full max-w-full rounded-lg bg-black shadow-2xl ring-1 ring-white/10"
        />
      </div>
    </div>,
    document.body
  )
}
