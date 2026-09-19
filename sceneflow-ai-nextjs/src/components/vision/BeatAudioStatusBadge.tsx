'use client'

import { AlertTriangle, Volume2 } from 'lucide-react'

export interface BeatAudioStatusBadgeProps {
  hasAudio: boolean
  stale: boolean
  /** Overrides the in-sync label (e.g. clip duration on mixer dialogue cards). */
  readyLabel?: string
}

/** Shared Prompt changed / Ready chip used on beat and mixer audio cards. */
export function BeatAudioStatusBadge({
  hasAudio,
  stale,
  readyLabel = 'Ready',
}: BeatAudioStatusBadgeProps) {
  if (!hasAudio) return null
  if (stale) {
    return (
      <span
        className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded flex items-center gap-1"
        title="Beat prompt changed after this audio was generated"
      >
        <AlertTriangle className="w-3 h-3" />
        Prompt changed
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
      <Volume2 className="w-3 h-3" />
      {readyLabel}
    </span>
  )
}
