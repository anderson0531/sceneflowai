'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  User,
  Video,
  Briefcase,
  Building2,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { MultiLanguageVideoPlayer } from './MultiLanguageVideoPlayer'
import {
  getDefaultPersonaStoryLocale,
  getPersonaStoryVideoLocales,
  type PersonaId,
} from '@/config/landing/personaStoryVideos'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { cn } from '@/lib/utils'

const SECTION_ID = 'use-cases'

const PERSONA_ICONS: Record<PersonaId, React.ElementType> = {
  youtubeCreator: Video,
  startupProvider: Briefcase,
  enterprise: Building2,
  educator: GraduationCap,
}

const PERSONA_GRADIENTS: Record<PersonaId, string> = {
  youtubeCreator: 'from-amber-500 to-orange-600',
  startupProvider: 'from-cyan-500 to-blue-600',
  enterprise: 'from-violet-500 to-purple-600',
  educator: 'from-emerald-500 to-teal-600',
}

const STORY_BULLET_MARKERS: Record<'problem' | 'solution' | 'outcome', string> = {
  problem: 'text-rose-400',
  solution: 'text-indigo-400',
  outcome: 'text-emerald-400',
}

function StoryBulletList({
  items,
  markerClassName,
}: {
  items: string[]
  markerClassName: string
}) {
  return (
    <ul role="list" className="space-y-2.5 text-sm md:text-base text-gray-300 leading-relaxed">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span
            aria-hidden="true"
            className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current', markerClassName)}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

type PersonaStory = {
  problem: string[]
  solution: string[]
  outcome: string[]
}

type PersonaData = {
  id: PersonaId
  label: string
  headline: string
  intro: string
  story?: PersonaStory
  screeningRoomHook: string
  screeningRoomPreview: string
}

export default function UseCasesSection() {
  const t = useTranslations('useCasesShowcase')
  const [activePersona, setActivePersona] = useState<PersonaId>('youtubeCreator')

  const personas = useMemo(
    () => t.raw('personas') as PersonaData[],
    [t]
  )

  const active = personas.find((p) => p.id === activePersona) ?? personas[0]

  return (
    <section
      id={SECTION_ID}
      className="scroll-mt-20 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 py-20 md:py-28 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <User className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">{t('badge')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t('subtitle')}</p>
        </motion.div>

        <div className="flex flex-col gap-8 w-full">
          <motion.div
            key={activePersona}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-5 w-full"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-white">{active?.headline}</h3>
            <p className="text-gray-400 text-lg leading-relaxed w-full">{active?.intro}</p>

            <div className="flex justify-center pt-2 px-2">
              <div className="inline-flex flex-wrap justify-center gap-1 p-1.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 max-w-full">
                {personas.map((persona) => {
                  const Icon = PERSONA_ICONS[persona.id]
                  const gradient = PERSONA_GRADIENTS[persona.id]
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => setActivePersona(persona.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 max-w-full',
                        activePersona === persona.id
                          ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
                          : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{persona.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {active?.story && (
              <div className="space-y-6 pt-2">
                <MultiLanguageVideoPlayer
                  locales={getPersonaStoryVideoLocales(active.id)}
                  defaultLocaleId={getDefaultPersonaStoryLocale(active.id)}
                  comingSoonLabel={t('videoComingSoon')}
                  soonLabel={t('videoSoon')}
                  title={active.headline}
                  accentGradient={PERSONA_GRADIENTS[active.id]}
                />

                <div className="grid gap-4 md:grid-cols-3 w-full">
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-5">
                    <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                      <AlertCircle className="h-4 w-4" />
                      {t('problemLabel')}
                    </div>
                    <StoryBulletList
                      items={active.story.problem}
                      markerClassName={STORY_BULLET_MARKERS.problem}
                    />
                  </div>

                  <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5">
                    <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                      <Sparkles className="h-4 w-4" />
                      {t('solutionLabel')}
                    </div>
                    <StoryBulletList
                      items={active.story.solution}
                      markerClassName={STORY_BULLET_MARKERS.solution}
                    />
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
                    <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      <TrendingUp className="h-4 w-4" />
                      {t('outcomeLabel')}
                    </div>
                    <StoryBulletList
                      items={active.story.outcome}
                      markerClassName={STORY_BULLET_MARKERS.outcome}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <button
            type="button"
            onClick={() => {
              window.location.href = getSignupUrlForTier('explorer')
            }}
            className="group inline-flex w-full sm:w-auto max-w-full items-center justify-center gap-2 px-6 sm:px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-semibold text-base sm:text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
          >
            <span className="truncate">{t('cta')}</span>
            <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
