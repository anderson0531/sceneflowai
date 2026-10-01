'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Sparkles, ChevronDown, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURE_ICONS } from './keyFeatureIcons'
import { FeatureRoomOverview } from '@/components/landing/FeatureRoomOverview'
import { LANDING_TRANSLATE_LANGUAGES } from '@/config/landingTranslateLanguages'

const SECTION_ID = 'key-features'

type FeatureLearnMoreItem = {
  title: string
  description: string
}

type FeatureLearnMore = {
  items: FeatureLearnMoreItem[]
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

type FeaturePane = {
  id: string
  label: string
  features: FeatureData[]
}

/** Mobile flex order: each row, then the open detail. Desktop resets with lg:order-none. */
const FEATURE_ROW_ORDER = ['order-1', 'order-3', 'order-5', 'order-7', 'order-9', 'order-11']
const FEATURE_DETAIL_ORDER = ['order-2', 'order-4', 'order-6', 'order-8', 'order-10', 'order-12']
const FEATURE_ROW_START = [
  'lg:row-start-1',
  'lg:row-start-2',
  'lg:row-start-3',
  'lg:row-start-4',
  'lg:row-start-5',
  'lg:row-start-6',
]

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

function panesForRoom(room: RoomData): FeaturePane[] {
  const panes: FeaturePane[] = []
  if (room.spend) {
    panes.push({ id: 'spend', label: room.spend.label, features: room.spend.features })
  }
  for (const group of room.groups ?? []) {
    panes.push({ id: group.id, label: group.label, features: group.features })
  }
  return panes
}

function featuresForRoom(room: RoomData, paneId: string): FeatureData[] {
  const panes = panesForRoom(room)
  if (panes.length === 0) return room.features ?? []
  return panes.find((pane) => pane.id === paneId)?.features ?? panes[0].features
}

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

function FeatureDetail({
  feature,
  gradient,
  expanded,
  onToggle,
  learnMoreLabel,
  showLessLabel,
  screenshotLabel,
  landingUiLanguagesLabel,
}: {
  feature: FeatureData
  gradient: string
  expanded: boolean
  onToggle: () => void
  learnMoreLabel: string
  showLessLabel: string
  screenshotLabel: string
  landingUiLanguagesLabel: string
}) {
  const panelId = `key-feature-panel-${feature.icon}`

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
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
        <div className="pt-4">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium bg-gradient-to-r bg-clip-text text-transparent transition-opacity hover:opacity-80',
              gradient
            )}
          >
            {expanded ? showLessLabel : learnMoreLabel}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform duration-300',
                expanded && 'rotate-180'
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
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
                  {feature.learnMore.items.map((item) => (
                    <LearnMoreRow
                      key={item.title}
                      gradient={gradient}
                      label={item.title}
                      text={item.description}
                    />
                  ))}
                  {feature.icon === 'languageStreams' ? (
                    <LandingUiLanguagesBlock label={landingUiLanguagesLabel} />
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default function KeyFeaturesSection() {
  const t = useTranslations('keyFeatures')
  const rooms = useMemo(() => t.raw('rooms') as RoomData[], [t])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState('spend')
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  useEffect(() => {
    const syncRoomFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '')
      if (!rooms.some((room) => room.id === hash)) return
      setActiveRoomId(hash)
      setActiveGroupId('spend')
      setSelectedIcon(null)
      setExpandedFeature(null)
    }
    syncRoomFromHash()
    window.addEventListener('hashchange', syncRoomFromHash)
    return () => window.removeEventListener('hashchange', syncRoomFromHash)
  }, [rooms])

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0]
  const panes = activeRoom ? panesForRoom(activeRoom) : []
  const activePane = panes.find((pane) => pane.id === activeGroupId) ?? panes[0]
  const visibleFeatures = activeRoom
    ? featuresForRoom(activeRoom, activePane?.id ?? 'spend')
    : []
  const selected =
    visibleFeatures.find((feature) => feature.icon === selectedIcon) ?? visibleFeatures[0]
  const gradient = ROOM_GRADIENTS[activeRoom?.id ?? 'series-desk']

  const selectRoom = (id: string) => {
    setActiveRoomId(id)
    setActiveGroupId('spend')
    setSelectedIcon(null)
    setExpandedFeature(null)
    const nextHash = `#${id}`
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }

  const selectGroup = (id: string) => {
    setActiveGroupId(id)
    setSelectedIcon(null)
    setExpandedFeature(null)
  }

  const detailLabels = {
    learnMoreLabel: t('learnMoreLabel'),
    showLessLabel: t('showLessLabel'),
    screenshotLabel: t('screenshotLabel'),
    landingUiLanguagesLabel: t('landingUiLanguagesLabel'),
  }

  if (!activeRoom || !selected) return null

  return (
    <section
      id={SECTION_ID}
      className="scroll-mt-20 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 py-20 md:py-28 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
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

        <div
          role="tablist"
          aria-label={t('title')}
          className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-700/50 bg-slate-800/50 p-1.5"
        >
          {rooms.map((room) => {
            const isActive = room.id === activeRoom.id
            return (
              <button
                key={room.id}
                id={room.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="key-features-panel"
                onClick={() => selectRoom(room.id)}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300',
                  isActive
                    ? `bg-gradient-to-r ${ROOM_GRADIENTS[room.id] ?? gradient} text-white shadow-lg`
                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
                )}
              >
                {room.label}
              </button>
            )
          })}
        </div>

        <div id="key-features-panel" role="tabpanel" aria-labelledby={activeRoom.id}>
          <FeatureRoomOverview
            roomId={activeRoom.id}
            title={activeRoom.label}
            promise={activeRoom.promise}
            comingSoonLabel={t('overviewComingSoon')}
            soonLabel={t('videoSoon')}
            pauseLabel={t('pauseOverview')}
            playLabel={t('playOverview')}
            muteLabel={t('muteOverview')}
            unmuteLabel={t('unmuteOverview')}
          />

          {panes.length > 0 ? (
            <div
              role="tablist"
              aria-label={activeRoom.label}
              className="mb-5 flex gap-1 overflow-x-auto"
            >
              {panes.map((pane) => {
                const isActive = pane.id === (activePane?.id ?? panes[0].id)
                return (
                  <button
                    key={pane.id}
                    id={`key-feature-group-${pane.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectGroup(pane.id)}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                      isActive
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                    )}
                  >
                    {pane.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="flex flex-col gap-1 lg:grid lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-x-6 lg:gap-y-1">
            {visibleFeatures.map((feature, index) => {
              const Icon = FEATURE_ICONS[feature.icon] ?? Sparkles
              const isSelected = feature.icon === selected.icon
              return (
                <button
                  key={feature.icon}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedIcon(feature.icon)
                    setExpandedFeature(null)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors lg:col-start-1 lg:order-none',
                    FEATURE_ROW_ORDER[index],
                    FEATURE_ROW_START[index],
                    isSelected
                      ? 'bg-slate-800 text-white'
                      : 'text-gray-400 hover:bg-slate-800/60 hover:text-white'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br',
                      gradient
                    )}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <span className="font-medium">{feature.title}</span>
                </button>
              )
            })}
            <div
              className={cn(
                'lg:col-start-2 lg:row-span-6 lg:row-start-1 lg:order-none',
                FEATURE_DETAIL_ORDER[visibleFeatures.findIndex((feature) => feature.icon === selected.icon)]
              )}
            >
              <FeatureDetail
                feature={selected}
                gradient={gradient}
                expanded={expandedFeature === selected.icon}
                onToggle={() =>
                  setExpandedFeature((current) =>
                    current === selected.icon ? null : selected.icon
                  )
                }
                {...detailLabels}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
