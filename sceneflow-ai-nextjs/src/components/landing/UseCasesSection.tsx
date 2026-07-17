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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScreeningRoomPreview } from './ScreeningRoomPreview'
import { MultiLanguageVideoPlayer } from './MultiLanguageVideoPlayer'
import { getLandingYoutubeCreatorScreeningSlug } from '@/config/landingSamples'
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
  story?: PersonaStory
  screeningRoomHook: string
  screeningRoomPreview: string
}

export default function UseCasesSection() {
  const t = useTranslations('useCasesShowcase')
  const [activePersona, setActivePersona] = useState<PersonaId>('youtubeCreator')
  const [activeTab, setActiveTab] = useState<'story' | 'screening'>('story')

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
            <p className="text-gray-400 text-lg leading-relaxed w-full">{active?.intro}</p>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'story' | 'screening')}
              className="w-full pt-2"
            >
              <TabsList className="flex h-auto gap-1 p-1 w-full max-w-xl mx-auto mb-8 bg-slate-900/60 border-slate-700">
                <TabsTrigger
                  value="story"
                  className="flex-1 min-w-0 px-2 sm:px-4 text-xs sm:text-sm py-2.5 truncate data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                >
                  {t('tabStory')}
                </TabsTrigger>
                <TabsTrigger
                  value="screening"
                  className="flex-1 min-w-0 px-2 sm:px-4 text-xs sm:text-sm py-2.5 truncate data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                >
                  {t('tabScreening')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="story" className="mt-0 focus-visible:outline-none">
                {active?.story && (
                  <div className="space-y-6">
                    <MultiLanguageVideoPlayer
                      locales={getPersonaStoryVideoLocales(active.id)}
                      defaultLocaleId={getDefaultPersonaStoryLocale(active.id)}
                      languagePromptLabel={t('videoLanguagePrompt')}
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
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="screening"
                className="mt-0 focus-visible:outline-none space-y-4"
              >
                {active?.screeningRoomHook && (
                  <p className="text-gray-500 text-base leading-relaxed w-full border-l-2 border-indigo-500/30 pl-4">
                    {active.screeningRoomHook}
                  </p>
                )}
                <ScreeningRoomPreview
                  previewTitle={active?.screeningRoomPreview ?? ''}
                  embedSlug={
                    active?.id === 'youtubeCreator'
                      ? getLandingYoutubeCreatorScreeningSlug()
                      : null
                  }
                />
              </TabsContent>
            </Tabs>
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
