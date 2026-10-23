'use client'

import React from 'react'
import { Film, Loader2 } from 'lucide-react'

export const SCREENING_ROOM_LOADING_STAGES = [
  'Pre-Vis',
  'Clips',
  'Scenes',
  'Chapters',
  'Master',
  'Promo',
] as const

interface ScreeningRoomLoadingStateProps {
  title?: string
  subtitle?: string
  compact?: boolean
}

export function ScreeningRoomLoadingState({
  title = 'Loading Screening Room',
  subtitle = 'Preparing scenes, multi-language audio tracks, and playback streams…',
  compact = false,
}: ScreeningRoomLoadingStateProps) {
  return (
    <div
      className={
        compact
          ? 'min-h-[60vh] w-full bg-black flex items-center justify-center px-4'
          : 'min-h-screen w-full bg-black flex items-center justify-center px-4'
      }
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-6 sm:p-8 text-center text-white shadow-2xl">
        <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400 border-r-violet-400" />
          <Film className="h-6 w-6 text-cyan-300" />
        </div>

        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed">
          {subtitle}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {SCREENING_ROOM_LOADING_STAGES.map((stage) => (
            <span
              key={stage}
              className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[11px] font-medium text-slate-300"
            >
              {stage}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin text-cyan-400/80" />
          <span>Powered by SceneFlow Studio</span>
        </div>
      </div>
    </div>
  )
}
