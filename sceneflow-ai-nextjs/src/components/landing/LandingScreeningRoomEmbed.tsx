'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Play } from 'lucide-react'
import { LandingSampleVideo } from '@/components/landing/LandingSampleVideo'
import {
  getLandingScreeningShareHref,
  LANDING_SAMPLE,
} from '@/config/landingSamples'
import { TIMELINE_EMOJIS } from '@/lib/types/behavioralAnalytics'
import type { TimelineReactionType } from '@/lib/types/behavioralAnalytics'
import { cn } from '@/lib/utils'

const DEMO_REACTIONS = Object.entries(TIMELINE_EMOJIS).slice(0, 5) as [
  TimelineReactionType,
  { emoji: string; label: string },
][]

const MEDIA_PANE_CLASS =
  'min-h-[280px] sm:min-h-[340px] lg:min-h-[400px] aspect-video'

export function LandingScreeningRoomEmbed() {
  const [activeReaction, setActiveReaction] = useState<TimelineReactionType | null>(null)
  const screeningHref = getLandingScreeningShareHref()

  return (
    <div className="h-full min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] flex flex-col bg-black">
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 bg-black/80">
        <div className="flex items-center gap-2 min-w-0">
          <Play className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-sm font-semibold text-white">Screening Room</span>
          <span className="hidden sm:inline text-xs text-slate-500">·</span>
          <span className="hidden sm:inline text-xs text-slate-400 truncate">
            {LANDING_SAMPLE.projectTitle}
          </span>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
          Collaborator preview
        </span>
      </div>

      <div className="flex-1 min-h-0 relative">
        <LandingSampleVideo
          src={LANDING_SAMPLE.animaticVideoUrl}
          placeholderTitle="Express animatic — configure animaticVideoUrl"
          className={cn('h-full', MEDIA_PANE_CLASS)}
          enableFullscreen
        />
      </div>

      <div className="shrink-0 border-t border-white/10 bg-gray-950/90 px-4 py-3 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">
            Collaborator reactions (demo)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_REACTIONS.map(([type, { emoji, label }]) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveReaction(type === activeReaction ? null : type)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors',
                  activeReaction === type
                    ? 'border-purple-500/50 bg-purple-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                )}
                aria-label={label}
              >
                <span>{emoji}</span>
                <span className="hidden sm:inline text-slate-400">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {screeningHref ? (
          <Link
            href={screeningHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300"
          >
            Open full Screening Room
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <p className="text-xs text-slate-500">
            Set <code className="text-slate-400">screeningRoomShareSlug</code> for a full Screening Room link
          </p>
        )}
      </div>
    </div>
  )
}
