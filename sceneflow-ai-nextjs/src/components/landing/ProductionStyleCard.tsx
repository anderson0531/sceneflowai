'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Clapperboard,
  GraduationCap,
  Mic,
  Palette,
  Sparkles,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  FeatureVideoPlayer,
  type VideoAriaLabels,
} from '@/components/landing/FeatureVideoPlayer'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'

export type ProductionStyleCardData = {
  id: string
  title: string
  subtitle: string
  badge: string
  workflow: string[]
  tools: string
  benefit: string
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
  podcast: {
    icon: Mic,
    surface: 'from-cyan-500/10 to-blue-500/5',
    border: 'border-cyan-500/30',
    accent: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-400',
    ctaGradient: 'from-cyan-500 to-blue-500',
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

export function ProductionStyleCard({
  card,
  index,
  workflowLabel,
  toolsLabel,
  ctaLabel,
  videoSrc,
  videoAriaLabels,
}: {
  card: ProductionStyleCardData
  index: number
  workflowLabel: string
  toolsLabel: string
  ctaLabel: string
  videoSrc?: string
  videoAriaLabels?: VideoAriaLabels
}) {
  const style = CARD_STYLES[card.id] ?? FALLBACK_STYLE
  const Icon = style.icon
  const hasVideo = Boolean(videoSrc && videoAriaLabels)

  const startProduction = () => {
    window.location.href = getLoginUrl({
      mode: 'signup',
      checkoutTier: 'explorer',
      extra: { production: card.id },
    })
  }

  return (
    <motion.div
      className={`group relative flex flex-col rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-sm transition-transform duration-300 md:hover:scale-[1.02] ${style.surface} ${style.border}`}
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

      {/* Narrow cards drop below the badge; wider ones reserve room beside it. */}
      <div className="mb-4 flex items-start gap-4 pt-6 sm:pt-0 sm:pr-28">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900/50">
          <Icon className={`h-6 w-6 ${style.accent}`} />
        </div>
        <div>
          <h3 className="mb-1 text-lg font-bold text-white">{card.title}</h3>
          <p className="text-sm text-gray-400">{card.subtitle}</p>
        </div>
      </div>

      {hasVideo ? (
        <div
          className="mb-4 aspect-video overflow-hidden rounded-lg border border-white/10 bg-black"
          onClick={(e) => e.stopPropagation()}
        >
          <FeatureVideoPlayer
            src={videoSrc!}
            ariaLabels={videoAriaLabels!}
            showExpand={false}
            autoPlay={false}
          />
        </div>
      ) : null}

      <div className="mb-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-gray-500">{workflowLabel}</p>
        <ol className="space-y-2">
          {card.workflow.map((step, stepIndex) => (
            <li key={step} className="flex items-start gap-2 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.badge}`}
              >
                {stepIndex + 1}
              </span>
              <span className="text-gray-300">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-4 rounded-lg border border-gray-700/30 bg-gray-900/50 px-3 py-2">
        <p className="mb-1 text-xs text-gray-500">{toolsLabel}</p>
        <p className={`text-xs font-medium ${style.accent}`}>{card.tools}</p>
      </div>

      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <Target className={`h-4 w-4 shrink-0 ${style.accent}`} />
          <p className={`text-sm font-medium ${style.accent}`}>{card.benefit}</p>
        </div>
      </div>

      {/* Cards with video keep the CTA in flow so playback is not blocked by hover overlay. */}
      <Button
        onClick={startProduction}
        className={`mt-4 w-full bg-gradient-to-r text-white ${hasVideo ? '' : 'md:hidden'} ${style.ctaGradient}`}
      >
        {ctaLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {!hasVideo ? (
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-2xl bg-gray-900/90 opacity-0 transition-opacity duration-300 focus-within:pointer-events-auto focus-within:opacity-100 md:flex md:group-hover:pointer-events-auto md:group-hover:opacity-100">
        <Button
          onClick={startProduction}
          className={`bg-gradient-to-r px-6 py-3 text-white ${style.ctaGradient}`}
        >
          {ctaLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      ) : null}
    </motion.div>
  )
}
