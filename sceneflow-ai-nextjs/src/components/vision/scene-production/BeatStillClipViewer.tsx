'use client'

import React, { useState } from 'react'
import { Camera, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BeatStillClipViewerProps {
  stillUrl?: string
  clipUrl?: string
  beatNumber?: number
  /** Drawn over the still, for example the audio transport. */
  stillOverlay?: React.ReactNode
}

/**
 * Optional still and clip for a selected beat.
 *
 * Starts closed so Direction and Audio can lead with their controls.
 */
export function BeatStillClipViewer({
  stillUrl,
  clipUrl,
  beatNumber,
  stillOverlay,
}: BeatStillClipViewerProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [view, setView] = useState<'still' | 'clip'>('still')
  const showClip = view === 'clip' && !!clipUrl

  if (!viewerOpen) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-950/40 px-2.5 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-slate-300 hover:border-slate-500"
        onClick={() => setViewerOpen(true)}
        aria-expanded={false}
      >
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        Show still
        {beatNumber ? ` · Beat ${beatNumber}` : ''}
      </button>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700/40 bg-gray-800/50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/40 px-2 py-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {showClip ? 'Clip' : 'Still'}
          {beatNumber ? ` · Beat ${beatNumber}` : ''}
        </p>
        <div className="flex items-center gap-2">
          {clipUrl && (
            <div className="flex overflow-hidden rounded border border-slate-600/60 text-[10px]">
              <button
                type="button"
                className={cn(
                  'px-2 py-0.5',
                  view === 'still' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
                )}
                onClick={() => setView('still')}
              >
                Still
              </button>
              <button
                type="button"
                className={cn(
                  'px-2 py-0.5',
                  view === 'clip' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
                )}
                onClick={() => setView('clip')}
              >
                Clip
              </button>
            </div>
          )}
          <button
            type="button"
            className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400 hover:text-slate-200"
            onClick={() => setViewerOpen(false)}
            aria-expanded={true}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Hide
          </button>
        </div>
      </div>
      <div className="relative aspect-video bg-black">
        {showClip ? (
          <video
            key={clipUrl}
            src={clipUrl}
            poster={stillUrl}
            className="h-full w-full object-contain"
            controls
            playsInline
            preload="metadata"
          />
        ) : stillUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stillUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <Camera className="mb-2 h-8 w-8 text-gray-600" />
            <span className="text-xs text-gray-500">No still yet</span>
          </div>
        )}
        {!showClip && stillOverlay}
      </div>
    </div>
  )
}
