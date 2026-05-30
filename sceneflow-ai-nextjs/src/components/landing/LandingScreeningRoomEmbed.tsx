'use client'

import Link from 'next/link'
import { ExternalLink, Play } from 'lucide-react'
import {
  PremiereScreeningEmbedPlayer,
  ScreeningEmbedSkeleton,
} from '@/components/screening-room/PremiereScreeningEmbedPlayer'
import {
  getLandingScreeningShareHref,
  LANDING_SAMPLE,
} from '@/config/landingSamples'

const EMBED_MIN_HEIGHT = 'min-h-[360px] sm:min-h-[420px] lg:min-h-[520px]'

export function LandingScreeningRoomEmbed() {
  const screeningId = LANDING_SAMPLE.premiereScreeningId.trim()
  const screeningHref = getLandingScreeningShareHref()

  if (!screeningId) {
    return (
      <div className={`h-full ${EMBED_MIN_HEIGHT} flex flex-col`}>
        <ScreeningEmbedSkeleton minHeight={EMBED_MIN_HEIGHT} />
        <p className="text-center text-xs text-slate-500 py-2 px-3">
          Sample Screening Room — set{' '}
          <code className="text-slate-400">premiereScreeningId</code> in landingSamples config
          (publish animatic in Premiere, then paste the <code className="text-slate-400">premiere-*</code>{' '}
          id from <code className="text-slate-400">/s/...</code>)
        </p>
      </div>
    )
  }

  return (
    <div className={`h-full ${EMBED_MIN_HEIGHT} flex flex-col bg-black`}>
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

      <div className="flex-1 min-h-0">
        <PremiereScreeningEmbedPlayer
          screeningId={screeningId}
          minHeight="min-h-[280px] sm:min-h-[340px] lg:min-h-[400px]"
          className="h-full"
          showExpandLink={false}
        />
      </div>

      <div className="shrink-0 border-t border-white/10 bg-gray-950/90 px-4 py-3">
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
        ) : null}
      </div>
    </div>
  )
}
