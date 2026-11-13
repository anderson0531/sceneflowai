'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  GraduationCap,
  Heart,
  Mic,
  Palette,
  Play,
  Sparkles,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import {
  PRODUCTION_TRAILER_POSTERS,
  getProductionExampleMedia,
  resolveTrailerDubLocale,
  type ProductionWalkId,
  type ReviewerMilestoneId,
  type TrailerDubLocaleId,
} from '@/config/landing/productionPipelineDemo'
import { TrailerPlayer } from '@/components/landing/TrailerPlayer'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { PipelineReviewDialog } from '@/components/landing/PipelineReviewDialog'
import { StudioDoorWalkthroughModal } from '@/components/landing/StudioDoorWalkthroughModal'
import { SeriesInputPanel } from '@/components/landing/SeriesInputPanel'
import {
  DOOR_WALKTHROUGH_COPY,
  milestoneToFeatureRoomId,
  normalizeWalkthroughDubLocale,
} from '@/config/landing/doorWalkthroughCopy'

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
  podcast: {
    icon: Mic,
    surface: 'from-cyan-500/10 to-indigo-500/5',
    border: 'border-cyan-500/30',
    accent: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-400',
    ctaGradient: 'from-cyan-500 to-indigo-500',
  },
  memoir: {
    icon: Heart,
    surface: 'from-amber-500/10 to-rose-500/5',
    border: 'border-amber-500/30',
    accent: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300',
    ctaGradient: 'from-amber-500 to-rose-500',
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
  showDetailLabel = 'Show more detail',
  hideDetailLabel = 'Hide detail',
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
  showDetailLabel?: string
  hideDetailLabel?: string
  featuredPlayerLabel?: string
  openPlayerLabel?: string
  featureModes?: readonly string[]
}) {
  const locale = useLocale()
  const [videoLocale, setVideoLocale] = useState<TrailerDubLocaleId>(() =>
    resolveTrailerDubLocale(locale)
  )
  useEffect(() => {
    setVideoLocale(resolveTrailerDubLocale(locale))
  }, [locale])

  const style = CARD_STYLES[card.id] ?? FALLBACK_STYLE
  const Icon = style.icon
  const media = getProductionExampleMedia(card.id, videoLocale)
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
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [activeMilestone, setActiveMilestone] = useState<ReviewerMilestoneId>('screening')
  const screeningMilestone = media.milestones.find((milestone) => milestone.id === 'screening')
  const supportingMilestones = media.milestones.filter((milestone) => milestone.id !== 'screening')
  const walkthroughCopy =
    DOOR_WALKTHROUGH_COPY[normalizeWalkthroughDubLocale(videoLocale)] ??
    DOOR_WALKTHROUGH_COPY.en

  const startProduction = () => {
    window.location.href = getLoginUrl({
      mode: 'signup',
      checkoutTier: 'explorer',
      extra: { production: card.id },
    })
  }

  const openDoorWalkthrough = (id: ReviewerMilestoneId) => {
    setActiveMilestone(id)
    setWalkthroughOpen(true)
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
          posterSrc={PRODUCTION_TRAILER_POSTERS[card.id as ProductionWalkId]}
          label={trailerLabel}
          enterFullscreenLabel={enterFullscreenLabel}
          exitFullscreenLabel={exitFullscreenLabel}
          activeLocale={videoLocale}
          onSelectLocale={setVideoLocale}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/35" />
        <div
          className={`pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ${style.badge}`}
        >
          <Sparkles className="h-3 w-3" />
          {card.badge}
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col bg-gradient-to-b from-slate-950/95 via-slate-950 to-slate-950 p-4 sm:p-6">
        {/* Interactive 7-language narrated Studio Door walkthroughs (interim placeholder for live shared links) */}
        <nav
          aria-label="Production review"
          title={screeningRoomInstruction}
          className="pointer-events-auto mb-4 space-y-2"
        >
          {screeningMilestone ? (
            <VideoControlTooltip
              label={`${milestoneLabels[screeningMilestone.id]} · ${walkthroughCopy.doorButtonHint}`}
            >
              <button
                key={screeningMilestone.id}
                type="button"
                title={`${milestoneLabels[screeningMilestone.id]} · ${walkthroughCopy.doorButtonHint}`}
                onClick={() => openDoorWalkthrough(screeningMilestone.id)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-400/35 bg-slate-900/85 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:border-cyan-400/70 hover:bg-slate-900 shadow-sm"
              >
                <Play className={`h-3.5 w-3.5 shrink-0 ${style.accent} fill-current`} />
                <span className="whitespace-normal break-words leading-snug">
                  {milestoneLabels[screeningMilestone.id]}
                </span>
              </button>
            </VideoControlTooltip>
          ) : null}

          {supportingMilestones.length > 0 ? (
            <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-1.5">
              {supportingMilestones.map((milestone) => {
                const doorTitle = `${milestoneLabels[milestone.id]} · ${walkthroughCopy.doorButtonHint}`
                return (
                  <VideoControlTooltip key={milestone.id} label={doorTitle}>
                    <button
                      type="button"
                      title={doorTitle}
                      onClick={() => openDoorWalkthrough(milestone.id)}
                      className="flex h-full w-full cursor-pointer items-center justify-center rounded-md border border-white/15 bg-slate-900/70 px-2.5 py-2 text-center text-xs font-medium leading-tight text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-slate-900 hover:text-white min-[420px]:px-2 min-[420px]:py-1.5"
                    >
                      <span className="whitespace-normal break-words">
                        {milestoneLabels[milestone.id]}
                      </span>
                    </button>
                  </VideoControlTooltip>
                )
              })}
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

        {/* Card Title, Subtitle & Detail Toggle */}
        <div className="mb-3 flex items-start gap-3 sm:gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900/60 ring-1 ring-white/10 sm:h-11 sm:w-11">
            <Icon className={`h-5 w-5 ${style.accent}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 whitespace-normal break-words text-base font-bold leading-snug tracking-tight text-white sm:text-lg">
              {card.title}
            </h3>
            <p className="whitespace-normal break-words text-sm leading-relaxed text-gray-300">
              {card.subtitle}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowDetail((prev) => !prev)}
            aria-expanded={showDetail}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/40 hover:bg-slate-800 hover:text-white"
          >
            <span>{showDetail ? hideDetailLabel : showDetailLabel}</span>
            {showDetail ? (
              <ChevronUp className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            )}
          </button>
        </div>

        {showDetail && (
          <div className="mt-4 flex flex-1 flex-col border-t border-white/10 pt-4">
            <SeriesInputPanel cardId={card.id} />

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

      <StudioDoorWalkthroughModal
        open={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
        initialRoomId={milestoneToFeatureRoomId(activeMilestone)}
        initialLocale={videoLocale}
        productionTitle={card.title}
      />

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
