'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Clapperboard,
  Film,
  GraduationCap,
  Palette,
  Sparkles,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import {
  getProductionExampleMedia,
  type ProductionExampleDoor,
  type ProductionExampleDoorId,
} from '@/config/landing/productionPipelineDemo'
import { TrailerPlayer } from '@/components/landing/TrailerPlayer'

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

const PRIMARY_DOORS: ProductionExampleDoorId[] = ['blueprint', 'script-ar']

function PipelineDoors({
  doors,
  labels,
  screeningRoomLabel,
}: {
  doors: ProductionExampleDoor[]
  labels: Record<ProductionExampleDoorId, string>
  screeningRoomLabel: string
}) {
  if (doors.length === 0) return null
  const primary = doors.filter((door) => PRIMARY_DOORS.includes(door.id))
  const cuts = doors.filter((door) => !PRIMARY_DOORS.includes(door.id))
  return (
    <div className="mb-4 space-y-3">
      {primary.length > 0 ? (
        <nav aria-label="Production pipeline" className="flex flex-wrap gap-2">
          {primary.map((door) => (
            <a
              key={door.id}
              href={door.href}
              className="rounded-full border border-slate-600/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
            >
              {labels[door.id]}
            </a>
          ))}
        </nav>
      ) : null}
      {cuts.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {screeningRoomLabel}
          </p>
          <nav aria-label="Screening Room" className="flex flex-wrap gap-2">
            {cuts.map((door) => (
              <a
                key={door.id}
                href={door.href}
                className="rounded-full border border-slate-600/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
              >
                {labels[door.id]}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  )
}

export function ProductionStyleCard({
  card,
  index,
  ctaLabel,
  screeningRoomInstruction,
  trailerLabel,
  watchLongformLabel,
  blueprintDoorLabel,
  scriptArDoorLabel,
  screeningRoomLabel,
  previsDoorLabel,
  roughDoorLabel,
  scenesDoorLabel,
  finalDoorLabel,
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
  blueprintDoorLabel: string
  scriptArDoorLabel: string
  screeningRoomLabel: string
  previsDoorLabel: string
  roughDoorLabel: string
  scenesDoorLabel: string
  finalDoorLabel: string
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
  const doorLabels: Record<ProductionExampleDoorId, string> = {
    blueprint: blueprintDoorLabel,
    'script-ar': scriptArDoorLabel,
    previs: previsDoorLabel,
    rough: roughDoorLabel,
    scenes: scenesDoorLabel,
    trailer: trailerLabel,
    final: finalDoorLabel,
  }

  const startProduction = () => {
    window.location.href = getLoginUrl({
      mode: 'signup',
      checkoutTier: 'explorer',
      extra: { production: card.id },
    })
  }

  return (
    <motion.div
      id={`production-showcase-${card.id}`}
      className={`group relative flex min-w-0 scroll-mt-24 flex-col rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-sm transition-transform duration-300 sm:p-6 md:hover:scale-[1.02] ${style.surface} ${style.border}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div
        className={`absolute top-4 right-4 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}
      >
        <Sparkles className="h-3 w-3" />
        {card.badge}
      </div>

      <div className="pt-6 sm:pt-0">
        <figure className="mb-4 min-w-0">
          <figcaption className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {trailerLabel}
          </figcaption>
          <TrailerPlayer
            webmSrc={media.trailerSrc}
            mp4Src={media.trailerMp4Src}
            label={trailerLabel}
            enterFullscreenLabel={enterFullscreenLabel}
            exitFullscreenLabel={exitFullscreenLabel}
          />
        </figure>
        {media.longformHref ? (
          <a
            href={media.longformHref}
            className={`mb-4 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-semibold text-white ${style.ctaGradient}`}
          >
            {watchLabel}
          </a>
        ) : null}
      </div>

      <div className="mb-4 flex items-start gap-4 sm:pr-28">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900/50">
          <Icon className={`h-6 w-6 ${style.accent}`} />
        </div>
        <div>
          <h3 className="mb-1 text-lg font-bold text-white">{card.title}</h3>
          <p className="text-sm text-gray-400">{card.subtitle}</p>
        </div>
      </div>

      <PipelineDoors
        doors={media.doors}
        labels={doorLabels}
        screeningRoomLabel={screeningRoomLabel}
      />

      {screeningRoomInstruction ? (
        <p className="mb-4 text-xs text-gray-500 italic">{screeningRoomInstruction}</p>
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

      <p className="text-xs leading-relaxed text-gray-400">{explorerHandoff}</p>

      <Button
        onClick={startProduction}
        className={`mt-4 w-full bg-gradient-to-r text-white ${style.ctaGradient}`}
      >
        {ctaLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  )
}
