'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Sparkles, ChevronDown, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURE_ICONS } from './keyFeatureIcons'
import { FeatureRoomOverview } from '@/components/landing/FeatureRoomOverview'
import { LANDING_TRANSLATE_LANGUAGES } from '@/config/landingTranslateLanguages'

const SECTION_ID = 'key-features'

type FeatureLearnMore = {
  problem: string
  solution: string
  outcome: string
}

type FeatureData = {
  icon: string
  title: string
  description: string
  screenshot: string
  learnMore?: FeatureLearnMore
}

type FeatureGroup = {
  id: string
  label: string
  features: FeatureData[]
}

type SpendGroup = {
  label: string
  features: FeatureData[]
}

type RoomData = {
  id: string
  label: string
  promise: string
  features?: FeatureData[]
  spend?: SpendGroup
  groups?: FeatureGroup[]
}

const ROOM_GRADIENTS: Record<string, string> = {
  'series-desk': 'from-indigo-500 to-violet-600',
  'blueprint-board': 'from-violet-500 to-fuchsia-600',
  'production-stage': 'from-emerald-500 to-teal-600',
  'screening-room': 'from-amber-500 to-orange-600',
}

const LANDING_UI_LANGUAGES_BY_REGION = LANDING_TRANSLATE_LANGUAGES.reduce<
  Record<string, string[]>
>((groups, language) => {
  if (!groups[language.region]) groups[language.region] = []
  groups[language.region].push(language.name)
  return groups
}, {})

function LandingUiLanguagesBlock({ label }: { label: string }) {
  return (
    <div className="border-t border-slate-800 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {label}
      </p>
      <div className="space-y-3">
        {Object.entries(LANDING_UI_LANGUAGES_BY_REGION).map(([region, names]) => (
          <div key={region}>
            <p className="text-[11px] font-medium text-emerald-400/90 mb-1.5">{region}</p>
            <div className="flex flex-wrap gap-1.5">
              {names.map((name) => (
                <span
                  key={name}
                  className="rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 text-xs text-gray-300"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LearnMoreRow({
  gradient,
  label,
  text,
}: {
  gradient: string
  label: string
  text: string
}) {
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br',
          gradient
        )}
      />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          {label}
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function FeatureCards({
  features,
  gradient,
  expandedFeature,
  onToggle,
  learnMoreLabel,
  showLessLabel,
  problemLabel,
  solutionLabel,
  outcomeLabel,
  screenshotLabel,
  landingUiLanguagesLabel,
}: {
  features: FeatureData[]
  gradient: string
  expandedFeature: string | null
  onToggle: (icon: string) => void
  learnMoreLabel: string
  showLessLabel: string
  problemLabel: string
  solutionLabel: string
  outcomeLabel: string
  screenshotLabel: string
  landingUiLanguagesLabel: string
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {features.map((feature, index) => {
        const Icon = FEATURE_ICONS[feature.icon] ?? Sparkles
        const isExpanded = expandedFeature === feature.icon
        const panelId = `key-feature-panel-${feature.icon}`

        return (
          <motion.div
            key={feature.icon}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-slate-700/80 hover:bg-slate-900/60 transition-colors"
          >
            <div
              className={cn(
                'mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
                gradient
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>

            <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-950/70">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <ImageIcon className="h-5 w-5 text-slate-600" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {screenshotLabel}
                </p>
                <p className="text-xs leading-relaxed text-slate-400">{feature.screenshot}</p>
              </div>
            </div>

            {feature.learnMore && (
              <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={() => onToggle(feature.icon)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent transition-opacity hover:opacity-80',
                    gradient
                  )}
                >
                  {isExpanded ? showLessLabel : learnMoreLabel}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-gray-400 transition-transform duration-300',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      id={panelId}
                      key="panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                        <LearnMoreRow
                          gradient={gradient}
                          label={problemLabel}
                          text={feature.learnMore.problem}
                        />
                        <LearnMoreRow
                          gradient={gradient}
                          label={solutionLabel}
                          text={feature.learnMore.solution}
                        />
                        <LearnMoreRow
                          gradient={gradient}
                          label={outcomeLabel}
                          text={feature.learnMore.outcome}
                        />
                        {feature.icon === 'languageStreams' ? (
                          <LandingUiLanguagesBlock label={landingUiLanguagesLabel} />
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

export default function KeyFeaturesSection() {
  const t = useTranslations('keyFeatures')
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  const rooms = useMemo(() => t.raw('rooms') as RoomData[], [t])

  const cardLabels = {
    learnMoreLabel: t('learnMoreLabel'),
    showLessLabel: t('showLessLabel'),
    problemLabel: t('problemLabel'),
    solutionLabel: t('solutionLabel'),
    outcomeLabel: t('outcomeLabel'),
    screenshotLabel: t('screenshotLabel'),
    landingUiLanguagesLabel: t('landingUiLanguagesLabel'),
  }

  return (
    <section
      id={SECTION_ID}
      className="scroll-mt-20 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 py-20 md:py-28 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-300 text-sm font-medium">{t('badge')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t('subtitle')}</p>
        </motion.div>

        <div className="space-y-20">
          {rooms.map((room) => {
            const gradient = ROOM_GRADIENTS[room.id] ?? ROOM_GRADIENTS['series-desk']
            return (
              <article key={room.id} id={room.id} className="scroll-mt-24">
                <FeatureRoomOverview
                  roomId={room.id}
                  title={room.label}
                  promise={room.promise}
                  comingSoonLabel={t('overviewComingSoon')}
                  pauseLabel={t('pauseOverview')}
                  playLabel={t('playOverview')}
                  muteLabel={t('muteOverview')}
                  unmuteLabel={t('unmuteOverview')}
                />

                <div className="space-y-10">
                  {room.features ? (
                    <FeatureCards
                      features={room.features}
                      gradient={gradient}
                      expandedFeature={expandedFeature}
                      onToggle={(icon) =>
                        setExpandedFeature((current) => (current === icon ? null : icon))
                      }
                      {...cardLabels}
                    />
                  ) : null}

                  {room.spend ? (
                    <div>
                      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        {room.spend.label}
                      </h3>
                      <FeatureCards
                        features={room.spend.features}
                        gradient={gradient}
                        expandedFeature={expandedFeature}
                        onToggle={(icon) =>
                          setExpandedFeature((current) => (current === icon ? null : icon))
                        }
                        {...cardLabels}
                      />
                    </div>
                  ) : null}

                  {room.groups?.map((group) => (
                    <div key={group.id}>
                      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        {group.label}
                      </h3>
                      <FeatureCards
                        features={group.features}
                        gradient={gradient}
                        expandedFeature={expandedFeature}
                        onToggle={(icon) =>
                          setExpandedFeature((current) => (current === icon ? null : icon))
                        }
                        {...cardLabels}
                      />
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
