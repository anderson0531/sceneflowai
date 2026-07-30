'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  GraduationCap,
  Mic,
  Palette,
  Rocket,
  Sparkles,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MultiLanguageVideoPlayer } from '@/components/landing/MultiLanguageVideoPlayer'
import { ScreeningRoomPreview } from '@/components/landing/ScreeningRoomPreview'
import type { VideoLocale, VideoLocaleId } from '@/config/landing/videoLocales'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'

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
  scifi: {
    icon: Rocket,
    surface: 'from-violet-500/10 to-indigo-500/5',
    border: 'border-violet-500/30',
    accent: 'text-violet-400',
    badge: 'bg-violet-500/20 text-violet-400',
    ctaGradient: 'from-violet-500 to-indigo-500',
  },
  documentary: {
    icon: Film,
    surface: 'from-rose-500/10 to-amber-500/5',
    border: 'border-rose-500/30',
    accent: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-400',
    ctaGradient: 'from-rose-500 to-amber-500',
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

function SolutionPillarBody({
  pillar,
  frictionLabel,
  solutionPillarLabel,
}: {
  pillar: SolutionPillar
  frictionLabel: string
  solutionPillarLabel: string
}) {
  return (
    <div className="space-y-3 px-1 pb-1">
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {frictionLabel}
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          <span className="font-semibold text-white">{pillar.frictionHeadline}</span>{' '}
          {pillar.friction}
        </p>
      </div>

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-3">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
          <Sparkles className="h-4 w-4 shrink-0" />
          {solutionPillarLabel}
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
          <span className="font-semibold text-white">{pillar.solutionHeadline}</span>{' '}
          {pillar.solution}
        </p>
      </div>
    </div>
  )
}

export function ProductionStyleCard({
  card,
  index,
  workflowLabel,
  ctaLabel,
  videoLocales,
  defaultVideoLocaleId,
  videoComingSoonLabel,
  videoSoonLabel,
  introVideoLabel,
  screeningRoomLabel,
  frictionLabel,
  solutionPillarLabel,
  showSolutionsSectionLabel,
  hideSolutionsSectionLabel,
  screeningEmbedSlug,
}: {
  card: ProductionStyleCardData
  index: number
  workflowLabel: string
  ctaLabel: string
  videoLocales?: VideoLocale[]
  defaultVideoLocaleId?: VideoLocaleId
  videoComingSoonLabel?: string
  videoSoonLabel?: string
  introVideoLabel?: string
  screeningRoomLabel?: string
  frictionLabel?: string
  solutionPillarLabel?: string
  showSolutionsSectionLabel?: string
  hideSolutionsSectionLabel?: string
  screeningEmbedSlug?: string | null
}) {
  const style = CARD_STYLES[card.id] ?? FALLBACK_STYLE
  const Icon = style.icon
  const [activeMediaTab, setActiveMediaTab] = useState<'workflow' | 'screening'>('workflow')
  const [solutionsSectionOpen, setSolutionsSectionOpen] = useState(false)

  const startProduction = () => {
    window.location.href = getLoginUrl({
      mode: 'signup',
      checkoutTier: 'explorer',
      extra: { production: card.id },
    })
  }

  return (
    <motion.div
      className={`group relative flex min-w-0 flex-col rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-sm transition-transform duration-300 sm:p-6 md:hover:scale-[1.02] ${style.surface} ${style.border}`}
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

      <div className="mb-4 min-w-0">
        <Tabs
          value={activeMediaTab}
          onValueChange={(value) => setActiveMediaTab(value as 'workflow' | 'screening')}
          className="w-full"
        >
          <TabsList className="mb-3 flex h-auto w-full gap-1 border border-gray-700/50 bg-gray-900/60 p-1">
            <TabsTrigger
              value="workflow"
              className="min-w-0 flex-1 truncate px-2 py-2 text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white sm:text-sm"
            >
              {introVideoLabel ?? 'Solutions'}
            </TabsTrigger>
            <TabsTrigger
              value="screening"
              className="min-w-0 flex-1 truncate px-2 py-2 text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white sm:text-sm"
            >
              {screeningRoomLabel ?? 'Screening Room'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-0 focus-visible:outline-none">
            <MultiLanguageVideoPlayer
              locales={videoLocales ?? []}
              defaultLocaleId={defaultVideoLocaleId ?? 'en'}
              comingSoonLabel={videoComingSoonLabel ?? ''}
              soonLabel={videoSoonLabel ?? ''}
              title={card.title}
              accentGradient={style.ctaGradient}
              fullBleedOnMobile
            />
          </TabsContent>

          <TabsContent value="screening" className="mt-0 focus-visible:outline-none">
            <ScreeningRoomPreview
              previewTitle={card.screeningRoomPreview}
              embedSlug={screeningEmbedSlug}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="mb-4 min-w-0">
        <button
          type="button"
          onClick={() => setSolutionsSectionOpen((open) => !open)}
          aria-expanded={solutionsSectionOpen}
          className={`mb-3 flex w-full items-center justify-between rounded-lg border border-gray-700/50 bg-gray-900/60 px-3 py-2 text-left text-sm font-medium text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-900/80 ${style.accent}`}
        >
          <span>
            {solutionsSectionOpen
              ? (hideSolutionsSectionLabel ?? 'Hide Solutions')
              : (showSolutionsSectionLabel ?? 'Show Solutions')}
          </span>
          {solutionsSectionOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          )}
        </button>

        {solutionsSectionOpen ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-gray-500">{workflowLabel}</p>
            {card.solutionPillars && card.solutionPillars.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-2">
                {card.solutionPillars.map((pillar) => (
                  <AccordionItem
                    key={pillar.title}
                    value={pillar.title}
                    className="overflow-hidden rounded-lg border border-gray-700/30 bg-gray-900/40 px-3 border-b-0"
                  >
                    <AccordionTrigger
                      className={`py-3 text-sm font-semibold hover:no-underline ${style.accent}`}
                    >
                      {pillar.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <SolutionPillarBody
                        pillar={pillar}
                        frictionLabel={frictionLabel ?? 'The Friction'}
                        solutionPillarLabel={solutionPillarLabel ?? 'The SceneFlow Solution'}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <ol className="space-y-2">
                {(card.workflow ?? []).map((step, stepIndex) => (
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
            )}
          </div>
        ) : null}
      </div>

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
