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
import { ScreeningRoomPreview } from './ScreeningRoomPreview'
import { getLandingYoutubeCreatorScreeningSlug } from '@/config/landingSamples'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { cn } from '@/lib/utils'

const SECTION_ID = 'use-cases'

type PersonaId = 'youtubeCreator' | 'startupProvider' | 'enterprise' | 'educator'

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

type PersonaStory = {
  problem: string
  solution: string
  outcome: string
  metric?: { before: string; after: string }
}

type PersonaData = {
  id: PersonaId
  label: string
  headline: string
  intro: string
  differentiators: string[]
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

        <motion.div
          className="flex justify-center mb-10 px-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
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
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                    activePersona === persona.id
                      ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
                      : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{persona.label}</span>
                </button>
              )
            })}
          </div>
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
            <p className="text-gray-400 text-lg leading-relaxed max-w-4xl">{active?.intro}</p>

            {active?.differentiators && active.differentiators.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {active.differentiators.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            {active?.story && (
              <div className="grid gap-4 md:grid-cols-3 max-w-6xl">
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-5">
                  <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                    <AlertCircle className="h-4 w-4" />
                    {t('problemLabel')}
                  </div>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    {active.story.problem}
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5">
                  <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    <Sparkles className="h-4 w-4" />
                    {t('solutionLabel')}
                  </div>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    {active.story.solution}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
                  <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    <TrendingUp className="h-4 w-4" />
                    {t('outcomeLabel')}
                  </div>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    {active.story.outcome}
                  </p>
                  {active.story.metric && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
                      <span className="rounded-md bg-slate-800/80 px-2 py-1 text-gray-400 line-through decoration-rose-400/60">
                        {active.story.metric.before}
                      </span>
                      <ArrowRight className="h-4 w-4 text-emerald-400" />
                      <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300">
                        {active.story.metric.after}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {active?.screeningRoomHook && (
              <p className="text-gray-500 text-base leading-relaxed max-w-4xl border-l-2 border-indigo-500/30 pl-4">
                {active.screeningRoomHook}
              </p>
            )}
          </motion.div>

          <motion.div
            key={`preview-${activePersona}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="w-full"
          >
            <ScreeningRoomPreview
              previewTitle={active?.screeningRoomPreview ?? ''}
              embedSlug={
                activePersona === 'youtubeCreator'
                  ? getLandingYoutubeCreatorScreeningSlug()
                  : null
              }
            />
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
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
          >
            {t('cta')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
