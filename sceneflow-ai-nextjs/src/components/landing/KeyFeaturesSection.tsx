'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { Sparkles, ChevronDown, ChevronRight, ImageIcon, Briefcase, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURE_ICONS } from './keyFeatureIcons'
import { FeatureScreenshotFrame } from '@/components/landing/FeatureScreenshotFrame'
import type { FocusKeyFeaturePayload } from '@/components/landing/FullStudioDirectoryDrawer'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import {
  getKeyFeatureScreenshot,
  keyFeatureScreenshotSrc,
  type KeyFeatureScreenshotVariant,
} from '@/config/landing/keyFeatureScreenshots'
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
  headline?: string
  description?: string
  features: FeatureData[]
}

type SpendGroup = {
  label: string
  features: FeatureData[]
}

type RoomData = {
  id: string
  label: string
  headline?: string
  promise: string
  features?: FeatureData[]
  spend?: SpendGroup
  groups?: FeatureGroup[]
}

type FeaturePane = {
  id: string
  label: string
  headline?: string
  description?: string
  features: FeatureData[]
}

/** Mobile flex order: each row, then the open detail right beneath it (inline accordion). Desktop resets with lg:order-none. */
const FEATURE_ROW_ORDER = [
  'order-1',
  'order-3',
  'order-5',
  'order-7',
  'order-9',
  'order-11',
  'order-[13]',
  'order-[15]',
  'order-[17]',
  'order-[19]',
  'order-[21]',
  'order-[23]',
  'order-[25]',
  'order-[27]',
  'order-[29]',
  'order-[31]',
  'order-[33]',
  'order-[35]',
  'order-[37]',
  'order-[39]',
]
const FEATURE_DETAIL_ORDER = [
  'order-2',
  'order-4',
  'order-6',
  'order-8',
  'order-10',
  'order-12',
  'order-[14]',
  'order-[16]',
  'order-[18]',
  'order-[20]',
  'order-[22]',
  'order-[24]',
  'order-[26]',
  'order-[28]',
  'order-[30]',
  'order-[32]',
  'order-[34]',
  'order-[36]',
  'order-[38]',
  'order-[40]',
]
const FEATURE_ROW_START = [
  'lg:row-start-1',
  'lg:row-start-2',
  'lg:row-start-3',
  'lg:row-start-4',
  'lg:row-start-5',
  'lg:row-start-6',
  'lg:row-start-7',
  'lg:row-start-8',
  'lg:row-start-9',
  'lg:row-start-10',
  'lg:row-start-[11]',
  'lg:row-start-[12]',
  'lg:row-start-[13]',
  'lg:row-start-[14]',
  'lg:row-start-[15]',
  'lg:row-start-[16]',
  'lg:row-start-[17]',
  'lg:row-start-[18]',
  'lg:row-start-[19]',
  'lg:row-start-[20]',
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
    panes.push({
      id: group.id,
      label: group.label,
      headline: group.headline,
      description: group.description,
      features: group.features,
    })
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
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <div className="space-y-3">
        {Object.entries(LANDING_UI_LANGUAGES_BY_REGION).map(([region, names]) => (
          <div key={region}>
            <p className="mb-1.5 text-[11px] font-medium text-emerald-400/90">{region}</p>
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
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </div>
        <p className="text-sm leading-relaxed text-gray-300">{text}</p>
      </div>
    </div>
  )
}

function FeatureLearnMore({
  feature,
  gradient,
  expanded,
  onToggle,
  learnMoreLabel,
  showLessLabel,
  landingUiLanguagesLabel,
}: {
  feature: FeatureData
  gradient: string
  expanded: boolean
  onToggle: () => void
  learnMoreLabel: string
  showLessLabel: string
  landingUiLanguagesLabel: string
}) {
  if (!feature.learnMore) return null
  const panelId = `key-feature-panel-${feature.icon}`
  return (
    <div className="pt-4">
      <button
        type="button"
        title={expanded ? showLessLabel : learnMoreLabel}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          'inline-flex items-center gap-1.5 bg-gradient-to-r bg-clip-text text-sm font-medium text-transparent transition-opacity hover:opacity-80 cursor-pointer',
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
              {feature.icon === 'languageStreams' || feature.icon === 'multilanguageUi' ? (
                <LandingUiLanguagesBlock label={landingUiLanguagesLabel} />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FeatureDetail({
  feature,
  locale,
  gradient,
  expanded,
  onToggle,
  learnMoreLabel,
  showLessLabel,
  screenshotLabel,
  landingUiLanguagesLabel,
  screenshotSrc,
  screenshotVariants,
  enterFullscreenLabel,
  exitFullscreenLabel,
}: {
  feature: FeatureData
  locale: string
  gradient: string
  expanded: boolean
  onToggle: () => void
  learnMoreLabel: string
  showLessLabel: string
  screenshotLabel: string
  landingUiLanguagesLabel: string
  screenshotSrc: string
  screenshotVariants?: readonly KeyFeatureScreenshotVariant[]
  enterFullscreenLabel: string
  exitFullscreenLabel: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 shadow-xl sm:p-6">
      <h3 className="text-lg font-semibold text-white sm:text-xl">{feature.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{feature.description}</p>

      {screenshotSrc ? (
        <FeatureScreenshotFrame
          src={screenshotSrc}
          variants={screenshotVariants}
          label={feature.title}
          enterFullscreenLabel={enterFullscreenLabel}
          exitFullscreenLabel={exitFullscreenLabel}
          featureIcon={feature.icon}
          locale={locale}
        />
      ) : (
        <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-950/70">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <ImageIcon className="h-5 w-5 text-slate-600" aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {screenshotLabel}
            </p>
            <p className="text-xs leading-relaxed text-slate-400">{feature.screenshot}</p>
          </div>
        </div>
      )}

      <FeatureLearnMore
        feature={feature}
        gradient={gradient}
        expanded={expanded}
        onToggle={onToggle}
        learnMoreLabel={learnMoreLabel}
        showLessLabel={showLessLabel}
        landingUiLanguagesLabel={landingUiLanguagesLabel}
      />
    </div>
  )
}

export default function KeyFeaturesSection() {
  const t = useTranslations('keyFeatures')
  const locale = useLocale()
  const landingCopy = useStudioLandingCopy()
  const useCaseCopy = landingCopy.useCaseDirectory
  const rooms = useMemo(() => t.raw('rooms') as RoomData[], [t])
  const [browseMode, setBrowseMode] = useState<'use-case' | 'room'>('use-case')
  const [activeTrackId, setActiveTrackId] = useState<string>('commercial-training')
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState('spend')
  const [selectedIcon, setSelectedIcon] = useState<string | null>('producerLaunchpad')
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)
  const [desktopDetailOffsetPx, setDesktopDetailOffsetPx] = useState<number>(0)

  const stageGridRef = useRef<HTMLDivElement | null>(null)
  const detailWrapperRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const applyFocus = (payload?: FocusKeyFeaturePayload | null) => {
      if (!payload) return
      setBrowseMode('use-case')
      setActiveTrackId(payload.trackId)
      setSelectedIcon(payload.icon)
      setExpandedFeature(null)
    }

    if (typeof window !== 'undefined' && window.__sceneflowPendingKeyFeature) {
      applyFocus(window.__sceneflowPendingKeyFeature)
      window.__sceneflowPendingKeyFeature = null
    }

    const onFocusFeature = (event: Event) => {
      const detail = (event as CustomEvent<FocusKeyFeaturePayload>).detail
      applyFocus(detail)
      if (typeof window !== 'undefined') {
        window.__sceneflowPendingKeyFeature = null
      }
    }

    window.addEventListener('sceneflow:focus-key-feature', onFocusFeature)
    return () => window.removeEventListener('sceneflow:focus-key-feature', onFocusFeature)
  }, [])

  useEffect(() => {
    const syncRoomFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '')
      if (!rooms.some((room) => room.id === hash)) return
      setBrowseMode('room')
      setActiveRoomId(hash)
      setActiveGroupId('spend')
      setSelectedIcon(null)
      setExpandedFeature(null)
    }
    syncRoomFromHash()
    window.addEventListener('hashchange', syncRoomFromHash)
    return () => window.removeEventListener('hashchange', syncRoomFromHash)
  }, [rooms])

  const featureCatalogByIcon = useMemo(() => {
    const map = new Map<string, { feature: FeatureData; roomId: string; roomLabel: string }>()
    for (const room of rooms) {
      const roomPanes = panesForRoom(room)
      const allRoomFeatures =
        roomPanes.length > 0 ? roomPanes.flatMap((pane) => pane.features) : (room.features ?? [])
      for (const feature of allRoomFeatures) {
        if (!map.has(feature.icon)) {
          map.set(feature.icon, {
            feature,
            roomId: room.id,
            roomLabel: room.label,
          })
        }
      }
    }
    return map
  }, [rooms])

  const activeTrack =
    useCaseCopy.tracks.find((track) => track.id === activeTrackId) ?? useCaseCopy.tracks[0]
  const useCaseFeatures = useMemo(
    () =>
      activeTrack.featureIcons
        .map((icon) => featureCatalogByIcon.get(icon)?.feature)
        .filter((f): f is FeatureData => Boolean(f)),
    [activeTrack, featureCatalogByIcon]
  )

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0]
  const panes = activeRoom ? panesForRoom(activeRoom) : []
  const activePane = panes.find((pane) => pane.id === activeGroupId) ?? panes[0]
  const roomVisibleFeatures = activeRoom
    ? featuresForRoom(activeRoom, activePane?.id ?? 'spend')
    : []

  const visibleFeatures = browseMode === 'use-case' ? useCaseFeatures : roomVisibleFeatures
  const selected =
    visibleFeatures.find((feature) => feature.icon === selectedIcon) ?? visibleFeatures[0]
  const selectedIndex = Math.max(
    0,
    visibleFeatures.findIndex((feature) => feature.icon === selected?.icon)
  )
  const selectedRoomMeta = selected ? featureCatalogByIcon.get(selected.icon) : undefined
  const gradient =
    browseMode === 'use-case'
      ? (ROOM_GRADIENTS[selectedRoomMeta?.roomId ?? 'series-desk'] ??
        ROOM_GRADIENTS['series-desk'])
      : ROOM_GRADIENTS[activeRoom?.id ?? 'series-desk']

  // On desktop (`lg+`), align the video player card vertically with the selected feature item
  // (clamped to `[0, listHeight - detailHeight]`), while CSS `lg:sticky lg:top-24` also keeps it in viewport on scroll.
  useEffect(() => {
    if (typeof window === 'undefined' || !selected) return
    const computeAlignment = () => {
      if (
        typeof window.matchMedia !== 'function' ||
        !window.matchMedia('(min-width: 1024px)').matches
      ) {
        setDesktopDetailOffsetPx(0)
        return
      }
      const gridEl = stageGridRef.current
      const detailEl = detailWrapperRef.current
      const btnEl = buttonRefs.current[selected.icon]
      if (!gridEl || !detailEl || !btnEl) {
        setDesktopDetailOffsetPx(0)
        return
      }
      const lastFeature = visibleFeatures[visibleFeatures.length - 1]
      const lastBtn = lastFeature ? buttonRefs.current[lastFeature.icon] : null
      const listBottom = lastBtn ? lastBtn.offsetTop + lastBtn.offsetHeight : gridEl.offsetHeight
      const detailHeight = detailEl.offsetHeight
      const maxOffset = Math.max(0, listBottom - detailHeight)
      const desiredOffset = Math.max(0, Math.min(maxOffset, btnEl.offsetTop))
      setDesktopDetailOffsetPx(desiredOffset)
    }

    const raf = window.requestAnimationFrame(computeAlignment)
    window.addEventListener('resize', computeAlignment)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', computeAlignment)
    }
  }, [selected, visibleFeatures, browseMode, activeTrackId, activeRoomId, activeGroupId, expandedFeature])

  const selectTrack = (trackId: string) => {
    setActiveTrackId(trackId)
    setSelectedIcon(null)
    setExpandedFeature(null)
    setDesktopDetailOffsetPx(0)
  }

  const selectRoom = (id: string) => {
    setBrowseMode('room')
    setActiveRoomId(id)
    setActiveGroupId('spend')
    setSelectedIcon(null)
    setExpandedFeature(null)
    setDesktopDetailOffsetPx(0)
    const nextHash = `#${id}`
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }

  const selectGroup = (id: string) => {
    setActiveGroupId(id)
    setSelectedIcon(null)
    setExpandedFeature(null)
    setDesktopDetailOffsetPx(0)
  }

  if (!activeRoom || !selected) return null

  const screenshot = getKeyFeatureScreenshot(selected.icon)

  const detailLabels = {
    learnMoreLabel: t('learnMoreLabel'),
    showLessLabel: t('showLessLabel'),
    screenshotLabel: t('screenshotLabel'),
    landingUiLanguagesLabel: t('landingUiLanguagesLabel'),
  }
  const toggleSelectedLearnMore = () =>
    setExpandedFeature((current) => (current === selected.icon ? null : selected.icon))

  return (
    <section
      id={SECTION_ID}
      className="scroll-mt-20 overflow-x-clip bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Clean, Focused Header — Zero Redundant Oval Badges or Callout Clutter */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-400 sm:text-lg">
            {t('subtitle')}
          </p>

          {/* Clean 2-Mode Switcher: Browse by Use Case vs Browse by Studio Room */}
          <div className="mt-6 flex w-full flex-col items-stretch justify-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 sm:inline-flex sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              title={useCaseCopy.viewByUseCaseLabel}
              onClick={() => {
                setBrowseMode('use-case')
                setSelectedIcon(null)
                setExpandedFeature(null)
                setDesktopDetailOffsetPx(0)
              }}
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:w-auto sm:text-sm cursor-pointer',
                browseMode === 'use-case'
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow'
                  : 'text-gray-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Briefcase className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-normal leading-tight">
                {useCaseCopy.viewByUseCaseLabel}
              </span>
            </button>
            <button
              type="button"
              title={useCaseCopy.viewByRoomLabel}
              onClick={() => {
                setBrowseMode('room')
                setSelectedIcon(null)
                setExpandedFeature(null)
                setDesktopDetailOffsetPx(0)
              }}
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:w-auto sm:text-sm cursor-pointer',
                browseMode === 'room'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow'
                  : 'text-gray-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Layers className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-normal leading-tight">{useCaseCopy.viewByRoomLabel}</span>
            </button>
          </div>
        </motion.div>

        {browseMode === 'use-case' ? (
          <>
            {/* 5 Use-Case Track Tabs */}
            <div
              role="tablist"
              aria-label={useCaseCopy.viewByUseCaseLabel}
              className="mb-5 grid grid-cols-1 gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-center"
            >
              {useCaseCopy.tracks.map((track) => {
                const isActive = track.id === activeTrack.id
                return (
                  <button
                    key={track.id}
                    type="button"
                    role="tab"
                    title={`${track.tabLabel} — ${track.headline}`}
                    aria-selected={isActive}
                    onClick={() => selectTrack(track.id)}
                    className={cn(
                      'rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold leading-snug transition-all sm:text-sm lg:text-center cursor-pointer',
                      isActive
                        ? 'border border-emerald-400/50 bg-emerald-500/15 text-white shadow-sm'
                        : 'border border-transparent text-gray-400 hover:bg-slate-800/70 hover:text-white'
                    )}
                  >
                    <span className="whitespace-normal break-words">{track.tabLabel}</span>
                  </button>
                )
              })}
            </div>

            {/* Clean Context Lead — No Oval Pill Badge, No Heavy Nested Card */}
            <div className="mb-6 border-l-2 border-emerald-400/60 pl-4">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                {activeTrack.headline}
              </h3>
              <p className="mt-1 max-w-4xl text-xs leading-relaxed text-gray-400 sm:text-sm">
                {activeTrack.description}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* 4 Studio Room Tabs — Responsive 2x2 on Mobile, 4-Column on Desktop */}
            <div
              role="tablist"
              aria-label={t('title')}
              className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5 sm:grid-cols-4"
            >
              {rooms.map((room) => {
                const isActive = room.id === activeRoom.id
                return (
                  <button
                    key={room.id}
                    id={room.id}
                    type="button"
                    role="tab"
                    title={room.label}
                    aria-selected={isActive}
                    aria-controls="key-features-feature-stage"
                    onClick={() => selectRoom(room.id)}
                    className={cn(
                      'rounded-xl px-3 py-2.5 text-center text-xs font-semibold leading-snug transition-all sm:text-sm cursor-pointer',
                      isActive
                        ? `bg-gradient-to-r ${ROOM_GRADIENTS[room.id] ?? gradient} text-white shadow-md`
                        : 'text-gray-400 hover:bg-slate-800/70 hover:text-white'
                    )}
                  >
                    <span className="whitespace-normal break-words">{room.label}</span>
                  </button>
                )
              })}
            </div>

            {panes.length > 1 ? (
              <div
                role="tablist"
                aria-label={activeRoom.label}
                className="mb-5 flex flex-wrap gap-1.5"
              >
                {panes.map((pane) => {
                  const isActive = pane.id === (activePane?.id ?? panes[0].id)
                  return (
                    <button
                      key={pane.id}
                      id={`key-feature-group-${pane.id}`}
                      type="button"
                      role="tab"
                      title={pane.label}
                      aria-selected={isActive}
                      onClick={() => selectGroup(pane.id)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                        isActive
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                          : 'border-slate-800 bg-slate-900/60 text-gray-400 hover:border-slate-700 hover:text-white'
                      )}
                    >
                      <span className="whitespace-normal break-words">{pane.label}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            <div className="mb-6 border-l-2 border-indigo-400/60 pl-4">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                {activePane?.headline || activeRoom.headline || activeRoom.label}
              </h3>
              <p className="mt-1 max-w-4xl text-xs leading-relaxed text-gray-400 sm:text-sm">
                {activePane?.description || activeRoom.promise}
              </p>
            </div>
          </>
        )}

        {/* Unified Narrated Capabilities Stage:
            - Mobile (< lg): Inline Accordion (player opens directly below tapped feature)
            - Desktop (lg+): Aligned + Sticky Master-Detail (player tracks selected feature & viewport) */}
        <div
          ref={stageGridRef}
          id="key-features-feature-stage"
          className="scroll-mt-24 flex flex-col gap-1.5 lg:grid lg:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)] lg:items-start lg:gap-x-8 lg:gap-y-1.5"
        >
          {visibleFeatures.map((feature, index) => {
            const Icon = FEATURE_ICONS[feature.icon] ?? Sparkles
            const isSelected = feature.icon === selected.icon
            const itemRoomMeta = featureCatalogByIcon.get(feature.icon)
            const itemGradient =
              ROOM_GRADIENTS[itemRoomMeta?.roomId ?? 'series-desk'] ?? gradient

            return (
              <button
                key={feature.icon}
                ref={(el) => {
                  buttonRefs.current[feature.icon] = el
                }}
                type="button"
                title={feature.title}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedIcon(feature.icon)
                  setExpandedFeature(null)
                }}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all lg:col-start-1 lg:order-none cursor-pointer',
                  FEATURE_ROW_ORDER[index] ?? 'order-[39]',
                  FEATURE_ROW_START[index] ?? 'lg:row-start-[20]',
                  isSelected
                    ? 'border-emerald-400/50 bg-slate-800/95 text-white shadow-md shadow-black/30'
                    : 'border-transparent bg-slate-900/35 text-gray-400 hover:border-slate-800 hover:bg-slate-800/60 hover:text-white'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br',
                    itemGradient
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </span>
                <span className="min-w-0 flex-1 whitespace-normal break-words font-medium leading-snug">
                  {feature.title}
                </span>
                <ChevronRight
                  className={cn(
                    'hidden h-4 w-4 shrink-0 transition-transform lg:block',
                    isSelected
                      ? 'translate-x-0.5 text-emerald-300'
                      : 'text-slate-600 group-hover:text-slate-400'
                  )}
                  aria-hidden
                />
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform lg:hidden',
                    isSelected ? 'rotate-180 text-emerald-300' : 'text-slate-500'
                  )}
                  aria-hidden
                />
              </button>
            )
          })}

          <div
            ref={detailWrapperRef}
            style={
              desktopDetailOffsetPx > 0
                ? { marginTop: `${desktopDetailOffsetPx}px` }
                : undefined
            }
            className={cn(
              'my-1 lg:my-0 lg:col-start-2 lg:row-start-1 lg:row-end-[21] lg:self-start lg:sticky lg:top-24 lg:order-none lg:transition-[margin-top] lg:duration-300 lg:ease-out',
              FEATURE_DETAIL_ORDER[selectedIndex] ?? 'order-[40]'
            )}
          >
            <FeatureDetail
              feature={selected}
              locale={locale}
              gradient={gradient}
              expanded={expandedFeature === selected.icon}
              onToggle={toggleSelectedLearnMore}
              screenshotSrc={screenshot ? keyFeatureScreenshotSrc(screenshot) : ''}
              screenshotVariants={screenshot?.variants}
              enterFullscreenLabel={t('enterFullscreenOverview')}
              exitFullscreenLabel={t('exitFullscreenOverview')}
              {...detailLabels}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
