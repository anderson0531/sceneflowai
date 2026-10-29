'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  GraduationCap,
  Palette,
  Play,
  Sparkles,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import {
  getProductionExampleMedia,
  type ReviewerMilestoneId,
} from '@/config/landing/productionPipelineDemo'
import { TrailerPlayer } from '@/components/landing/TrailerPlayer'
import { PipelineReviewDialog } from '@/components/landing/PipelineReviewDialog'
import { SeriesInputPanel } from '@/components/landing/SeriesInputPanel'

export type SolutionPillar = {
  title: string
  frictionHeadline: string
  friction: string
  solutionHeadline: string
  solution: string
}

export type ProductionStyleCardData = {
  id: string
  title: string
  subtitle: string
  badge: string
  workflow?: string[]
  solutionPillars?: SolutionPillar[]
  benefit?: string
  screeningRoomPreview: string
}

type CardStyle = {
  icon: React.ElementType
  surface: string
  border: string
  accent: string
  badge: string
  ctaGradient: string
}

const CARD_STYLES: Record<string, CardStyle> = {
  drama: {
    icon: Clapperboard,
    surface: 'from-purple-500/10 to-cyan-500/5',
    border: 'border-purple-500/30',
    accent: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-400',
    ctaGradient: 'from-purple-500 to-cyan-500',
  },
  animation: {
    icon: Palette,
    surface: 'from-amber-500/10 to-orange-500/5',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400',
    ctaGradient: 'from-amber-500 to-orange-500',
  },
  documentary: {
    icon: Film,
    surface: 'from-rose-500/10 to-amber-500/5',
    border: 'border-rose-500/30',
    accent: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-400',
    ctaGradient: 'from-rose-500 to-amber-500',
  },
  training: {
    icon: GraduationCap,
    surface: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400',
    ctaGradient: 'from-emerald-500 to-teal-500',
  },
}

const FALLBACK_STYLE: CardStyle = {
  icon: Clapperboard,
  surface: 'from-slate-500/10 to-slate-500/5',
  border: 'border-slate-500/30',
  accent: 'text-slate-300',
  badge: 'bg-slate-500/20 text-slate-300',
  ctaGradient: 'from-slate-500 to-slate-600',
}

export const SCREENING_ROOM_FEATURE_MODES = [
  'Pre-Vis',
  'Clips',
  'Scenes',
  'Chapters',
  'Master',
  'Promo',
] as const

export function ProductionStyleCard({
  card,
  index,
  ctaLabel,
  screeningRoomInstruction,
  trailerLabel,
  watchLongformLabel,
  seriesDoorLabel,
  blueprintDoorLabel,
  scriptArDoorLabel,
  screeningDoorLabel,
  enterFullscreenLabel,
  exitFullscreenLabel,
  explorerHandoff,
}: {
  card: ProductionStyleCardData
  index: number
  ctaLabel: string
  screeningRoomInstruction?: string
  trailerLabel: string
  watchLongformLabel: string
  seriesDoorLabel: string
  blueprintDoorLabel: string
  scriptArDoorLabel: string
  screeningDoorLabel: string
  enterFullscreenLabel: string
  exitFullscreenLabel: string
  explorerHandoff: string
}) {
  const style = CARD_STYLES[card.id] ?? FALLBACK_STYLE
  const Icon = style.icon
  const media = getProductionExampleMedia(card.id)
  const watchLabel = media.longformRuntimeLabel
    ? `${watchLongformLabel} · ${media.longformRuntimeLabel}`
    : watchLongformLabel
  const milestoneLabels: Record<ReviewerMilestoneId, string> = {
    series: seriesDoorLabel,
    blueprint: blueprintDoorLabel,
    'script-ar': scriptArDoorLabel,
    screening: screeningDoorLabel,
  }
  const [reviewOpen, setReviewOpen] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [activeMilestone, setActiveMilestone] = useState<ReviewerMilestoneId>('screening')
  const screeningMilestone = media.milestones.find((milestone) => milestone.id === 'screening')
  const supportingMilestones = media.milestones.filter((milestone) => milestone.id !== 'screening')

  const startProduction = () => {
    window.location.href = getLoginUrl({
      mode: 'signup',
      checkoutTier: 'explorer',
      extra: { production: card.id },
    })
  }

  const openReview = (id: ReviewerMilestoneId) => {
    setActiveMilestone(id)
    setReviewOpen(true)
  }

  return (
    <motion.div
      id={`production-showcase-${card.id}`}
      className={`group relative flex min-w-0 scroll-mt-24 flex-col overflow-hidden rounded-2xl border bg-slate-950 transition-transform duration-300 md:hover:scale-[1.01] ${style.border}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden border-b border-white/10 bg-slate-950">
        <TrailerPlayer
          mode="background"
          webmSrc={media.trailerSrc}
          mp4Src={media.trailerMp4Src}
          label={trailerLabel}
          enterFullscreenLabel={enterFullscreenLabel}
          exitFullscreenLabel={exitFullscreenLabel}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/35" />
        <div
          className={`pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ${style.badge}`}
        >
          <Sparkles className="h-3 w-3" />
          {card.badge}
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col bg-gradient-to-b from-slate-950/95 to-slate-950 p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900/50 ring-1 ring-white/10">
            <Icon className={`h-6 w-6 ${style.accent}`} />
          </div>
          <div>
            <h3 className="mb-1 text-lg font-bold text-white">{card.title}</h3>
            <p className="text-sm text-gray-300">{card.subtitle}</p>
          </div>
        </div>

        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowDetail((prev) => !prev)}
            aria-expanded={showDetail}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/40 hover:bg-slate-800 hover:text-white"
          >
            <span>{showDetail ? 'Hide detail' : 'Show more detail'}</span>
            {showDetail ? (
              <ChevronUp className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            )}
          </button>
        </div>

        {showDetail && (
          <div className="mt-4 flex flex-1 flex-col">
            <SeriesInputPanel cardId={card.id} />

            {screeningRoomInstruction ? (
              <p className="mb-4 text-sm leading-relaxed text-gray-200">{screeningRoomInstruction}</p>
            ) : null}

            <nav aria-label="Production review" className="pointer-events-auto mb-4 space-y-2.5">
              {screeningMilestone ? (
                <button
                  key={screeningMilestone.id}
                  type="button"
                  onClick={() => openReview(screeningMilestone.id)}
                  className={`group/screening relative flex w-full flex-col gap-2.5 rounded-xl bg-gradient-to-r p-3.5 text-left text-white shadow-lg ring-1 ring-white/25 transition-all hover:brightness-110 hover:ring-white/40 ${style.ctaGradient}`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/25 ring-1 ring-white/20">
                        <Play className="h-4 w-4 fill-current text-white" />
                      </span>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-white/80">
                          Featured Player
                        </span>
                        <span className="text-base font-bold tracking-tight text-white">
                          {milestoneLabels[screeningMilestone.id]}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20 transition-transform group-hover/screening:translate-x-0.5">
                      Open Player
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {SCREENING_ROOM_FEATURE_MODES.map((modeLabel) => (
                      <span
                        key={modeLabel}
                        className="rounded-md bg-black/30 px-2 py-0.5 text-[11px] font-medium text-white/95 ring-1 ring-white/15"
                      >
                        {modeLabel}
                      </span>
                    ))}
                  </div>
                </button>
              ) : null}

              {supportingMilestones.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {supportingMilestones.map((milestone) => (
                    <button
                      key={milestone.id}
                      type="button"
                      onClick={() => openReview(milestone.id)}
                      className="rounded-lg border border-white/15 bg-slate-900/75 px-2.5 py-2 text-center text-xs font-medium text-gray-200 transition-colors hover:border-white/30 hover:bg-slate-800/90 hover:text-white"
                    >
                      {milestoneLabels[milestone.id]}
                    </button>
                  ))}
                </div>
              ) : null}
            </nav>

            {media.longformHref ? (
              <a
                href={media.longformHref}
                className={`pointer-events-auto mb-4 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-semibold text-white ${style.ctaGradient}`}
              >
                {watchLabel}
              </a>
            ) : null}

            {card.benefit ? (
              <div className="mt-auto border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <Target className={`h-4 w-4 shrink-0 ${style.accent}`} />
                  <p className={`text-sm font-medium ${style.accent}`}>{card.benefit}</p>
                </div>
              </div>
            ) : (
              <div className="mt-auto" />
            )}

            <p className="text-xs leading-relaxed text-gray-300">{explorerHandoff}</p>

            <Button
              onClick={startProduction}
              className={`pointer-events-auto mt-4 w-full bg-gradient-to-r text-white ${style.ctaGradient}`}
            >
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <PipelineReviewDialog
        open={reviewOpen}
        title={card.title}
        href={
          media.milestones.find((milestone) => milestone.id === activeMilestone)?.href ??
          media.milestones[0]?.href ??
          ''
        }
        onClose={() => setReviewOpen(false)}
        closeLabel={exitFullscreenLabel}
      />
    </motion.div>
  )
}
