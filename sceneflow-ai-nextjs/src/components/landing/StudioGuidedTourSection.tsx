'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  Film,
  Images,
  Layers,
  Maximize2,
  Play,
  Share2,
  Sparkles,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { ExpandedImageModal } from '@/components/landing/ExpandedImageModal'
import { useExpandLandingSection } from '@/components/landing/LandingSectionCollapse'
import {
  StudioDoorWalkthroughModal,
  type WalkthroughDisplayMode,
} from '@/components/landing/StudioDoorWalkthroughModal'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import {
  DOOR_WALKTHROUGH_COPY,
  normalizeWalkthroughDubLocale,
} from '@/config/landing/doorWalkthroughCopy'
import { featureRoomHasVideo, getFeatureRoomMedia } from '@/config/landing/featureRoomMedia'
import {
  BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP,
  SCENE_DIRECTOR_SCREENSHOT_WEBP,
  SCREENING_COLLAB_SCREENSHOT_WEBP,
  SERIES_REVIEW_SCREENSHOT_WEBP,
} from '@/config/landing/keyFeatureScreenshots'
import { cn } from '@/lib/utils'

export const STUDIO_GUIDED_TOUR_SECTION_ID = 'studio-tour'

type RoomId = 'series-desk' | 'blueprint-board' | 'production-stage' | 'screening-room'

const ROOM_ICONS: Record<RoomId, typeof Layers> = {
  'series-desk': Layers,
  'blueprint-board': Sparkles,
  'production-stage': Clapperboard,
  'screening-room': Film,
}

const ROOM_FULL_SCREENSHOTS: Record<RoomId, string> = {
  'series-desk': SERIES_REVIEW_SCREENSHOT_WEBP,
  'blueprint-board': BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP,
  'production-stage': SCENE_DIRECTOR_SCREENSHOT_WEBP,
  'screening-room': SCREENING_COLLAB_SCREENSHOT_WEBP,
}

const ROOM_SANDBOX_ASSETS: Record<
  RoomId,
  {
    heroSrc: string
    thumbSrcs: readonly [string, string, string, string]
  }
> = {
  'series-desk': {
    heroSrc: '/images/sandbox/glass-ledger/hero-billboard.jpg',
    thumbSrcs: [
      '/images/sandbox/glass-ledger/char-elara.jpg',
      '/images/sandbox/glass-ledger/char-marcus.jpg',
      '/images/sandbox/glass-ledger/loc-archive-vault.jpg',
      '/images/sandbox/glass-ledger/prop-glass-ledger.jpg',
    ],
  },
  'blueprint-board': {
    heroSrc: '/images/sandbox/glass-ledger/s1-b2-twoshot-table.jpg',
    thumbSrcs: [
      '/images/sandbox/glass-ledger/char-elara.jpg',
      '/images/sandbox/glass-ledger/char-aris.jpg',
      '/images/sandbox/glass-ledger/loc-observation-deck.jpg',
      '/images/sandbox/glass-ledger/prop-chrono-key.jpg',
    ],
  },
  'production-stage': {
    heroSrc: '/images/sandbox/glass-ledger/s1-b4-closeup-elara.jpg',
    thumbSrcs: [
      '/images/sandbox/glass-ledger/s1-b1-wide-vault.jpg',
      '/images/sandbox/glass-ledger/s1-b3-macro-hinge.jpg',
      '/images/sandbox/glass-ledger/s2-b3-key-handoff.jpg',
      '/images/sandbox/glass-ledger/s3-b1-corridor-sprint.jpg',
    ],
  },
  'screening-room': {
    heroSrc: '/images/sandbox/glass-ledger/s2-b2-deck-twoshot.jpg',
    thumbSrcs: [
      '/images/sandbox/glass-ledger/s1-b1-wide-vault.jpg',
      '/images/sandbox/glass-ledger/s2-b1-deck-ots.jpg',
      '/images/sandbox/glass-ledger/s2-b2-alt-v1.jpg',
      '/images/sandbox/glass-ledger/s3-b2-lift-unlock.jpg',
    ],
  },
}

export function StudioGuidedTourSection() {
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const copy = useStudioLandingCopy().guidedTour
  const expandSection = useExpandLandingSection()

  const scrollToExamples = () => {
    expandSection('production-examples')
    requestAnimationFrame(() => {
      document.getElementById('production-examples')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const [activeRoomId, setActiveRoomId] = useState<RoomId>('series-desk')
  const [lens, setLens] = useState<'creator' | 'service'>('creator')
  const [expandedScreenshot, setExpandedScreenshot] = useState<{
    src: string
    alt: string
  } | null>(null)
  const [walkthroughModal, setWalkthroughModal] = useState<{
    roomId: RoomId
    mode: WalkthroughDisplayMode
  } | null>(null)

  const activeRoom = copy.rooms.find((r) => r.id === activeRoomId) ?? copy.rooms[0]
  const assets = ROOM_SANDBOX_ASSETS[activeRoom.id]
  const visuals = activeRoom.visuals
  const roomMedia = getFeatureRoomMedia(activeRoom.id, locale)
  const hasRoomVideo = featureRoomHasVideo(roomMedia)
  const walkthroughCopy =
    DOOR_WALKTHROUGH_COPY[normalizeWalkthroughDubLocale(locale)] ??
    DOOR_WALKTHROUGH_COPY.en

  const openRoomWalkthrough = (mode: WalkthroughDisplayMode = 'video', roomId: RoomId = activeRoom.id) => {
    if (!hasRoomVideo) return
    setWalkthroughModal({ roomId, mode })
  }

  return (
    <section
      id={STUDIO_GUIDED_TOUR_SECTION_ID}
      className="relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mx-auto mb-10 max-w-4xl text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {copy.title}{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-300 bg-clip-text text-transparent">
              {copy.titleAccent}
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg">
            {copy.subtitle}
          </p>

          {/* Creator vs Client Service Lens Switcher */}
          <div className="mt-6 flex w-full flex-col items-stretch justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-2 sm:inline-flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:p-1.5">
            <span className="px-2.5 text-center text-xs font-medium text-gray-400">
              {copy.lensLabel}
            </span>
            <button
              type="button"
              title={copy.lensCreator}
              onClick={() => setLens('creator')}
              className={cn(
                'inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all sm:w-auto sm:py-1.5 cursor-pointer',
                lens === 'creator'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              )}
            >
              <Clapperboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="whitespace-normal leading-tight">{copy.lensCreator}</span>
            </button>
            <button
              type="button"
              title={copy.lensService}
              onClick={() => setLens('service')}
              className={cn(
                'inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all sm:w-auto sm:py-1.5 cursor-pointer',
                lens === 'service'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              )}
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="whitespace-normal leading-tight">{copy.lensService}</span>
            </button>
          </div>
        </motion.div>

        {/* 4-Room Stepper Tabs — full readable labels + tooltips on mobile S23 & desktop */}
        <div
          role="tablist"
          aria-label={copy.title}
          className="mb-8 grid grid-cols-2 gap-2.5 lg:grid-cols-4"
        >
          {copy.rooms.map((room) => {
            const Icon = ROOM_ICONS[room.id]
            const isSelected = room.id === activeRoom.id
            const fullRoomTitle = `${copy.stepPrefix} ${room.stepNumber}: ${room.tabLabel} — ${room.badge}`
            return (
              <VideoControlTooltip key={room.id} label={fullRoomTitle} side="top">
                <button
                  type="button"
                  role="tab"
                  title={fullRoomTitle}
                  aria-selected={isSelected}
                  onClick={() => setActiveRoomId(room.id)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-2xl border p-3 text-start transition-all sm:flex-row sm:items-center sm:gap-3 sm:p-4 cursor-pointer',
                    isSelected
                      ? 'border-cyan-400/60 bg-slate-900 text-white shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-950/60 text-gray-400 hover:border-slate-700 hover:text-gray-200'
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold sm:h-10 sm:w-10',
                        isSelected
                          ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                          : 'border-slate-700 bg-slate-900 text-gray-400'
                      )}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 sm:hidden">
                      {copy.stepPrefix} {room.stepNumber}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="hidden text-[11px] font-bold uppercase tracking-wider text-cyan-400 sm:block">
                      {copy.stepPrefix} {room.stepNumber}
                    </p>
                    <p className="whitespace-normal break-words text-sm font-bold leading-snug text-white sm:text-base">
                      {room.tabLabel}
                    </p>
                  </div>
                </button>
              </VideoControlTooltip>
            )
          })}
        </div>

        {/* Active Room Story + Sandbox Visual Stage */}
        <div className="grid grid-cols-1 gap-8 rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:grid-cols-12 lg:items-center">
          {/* Left: Non-Technical Narrative + 3 Callouts */}
          <div className="lg:col-span-5">
            <span className="inline-block rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              {activeRoom.stepNumber} · {activeRoom.badge}
            </span>

            <h3 className="mt-3 text-2xl font-bold leading-snug text-white sm:text-3xl">
              {activeRoom.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-300 sm:text-base">
              {activeRoom.promise}
            </p>

            {/* Active Lens Highlight Box */}
            <div
              className={cn(
                'mt-5 rounded-2xl border p-4',
                lens === 'creator'
                  ? 'border-violet-500/30 bg-violet-950/25'
                  : 'border-emerald-500/30 bg-emerald-950/25'
              )}
            >
              <p
                className={cn(
                  'text-xs font-bold uppercase tracking-wider',
                  lens === 'creator' ? 'text-violet-300' : 'text-emerald-300'
                )}
              >
                {lens === 'creator'
                  ? activeRoom.creatorExampleTitle
                  : activeRoom.serviceExampleTitle}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-200 sm:text-sm">
                {lens === 'creator'
                  ? activeRoom.creatorExampleNote
                  : activeRoom.serviceExampleNote}
              </p>
            </div>

            {/* 3 Crisp Callouts */}
            <div className="mt-5 space-y-3">
              {activeRoom.callouts.map((callout, idx) => (
                <div
                  key={callout.label}
                  className="flex items-start gap-3 rounded-xl border border-slate-800/90 bg-slate-950/65 p-3.5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white sm:text-sm">{callout.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-300">
                      {callout.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Curated Sandbox Visual Showcase + Room Tour & Full UI Controls */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-xl">
              {/* Top Window Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ms-2 text-xs font-semibold text-gray-200">
                    SceneFlow Studio · {activeRoom.tabLabel}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasRoomVideo ? (
                    <>
                      <button
                        type="button"
                        title={`${copy.watchRoomVideoLabel} (${walkthroughCopy.interimBadge})`}
                        onClick={() => openRoomWalkthrough('video')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 hover:text-white cursor-pointer"
                      >
                        <Play className="h-3 w-3 shrink-0 fill-current" aria-hidden />
                        <span className="whitespace-normal leading-tight">{copy.watchRoomVideoLabel}</span>
                      </button>

                      <button
                        type="button"
                        title={`${walkthroughCopy.modePannedScreens} · ${walkthroughCopy.doorButtonHint}`}
                        onClick={() => openRoomWalkthrough('panned')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/35 bg-purple-500/15 px-2.5 py-1.5 text-xs font-semibold text-purple-200 transition-colors hover:bg-purple-500/25 hover:text-white cursor-pointer"
                      >
                        <Images className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="whitespace-normal leading-tight">
                          {walkthroughCopy.modePannedScreens}
                        </span>
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    title={copy.inspectFullScreenLabel}
                    onClick={() =>
                      setExpandedScreenshot({
                        src: ROOM_FULL_SCREENSHOTS[activeRoom.id],
                        alt: `${activeRoom.tabLabel} — ${copy.inspectFullScreenLabel}`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <Maximize2 className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="whitespace-normal leading-tight">
                      {copy.inspectFullScreenLabel}
                    </span>
                  </button>
                </div>
              </div>

              {/* Hero Sandbox Frame */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <img
                  src={assets.heroSrc}
                  alt={`${activeRoom.tabLabel} — ${activeRoom.title}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/45"
                  aria-hidden
                />

                {/* Top Status Pill */}
                <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur-md">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    {visuals.topBadge}
                  </span>
                </div>

                {/* Bottom Continuity / Action Overlay */}
                <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-lg border border-white/15 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-gray-100 backdrop-blur-md">
                    {visuals.bottomBadge}
                  </span>

                  {activeRoom.id === 'screening-room' ? (
                    <button
                      type="button"
                      title={`${copy.openLiveScreeningLabel} (${walkthroughCopy.interimBadge})`}
                      onClick={() => openRoomWalkthrough('video', 'screening-room')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-100 backdrop-blur-md transition-colors hover:bg-amber-500/35 hover:text-white cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="whitespace-normal leading-tight">
                        {copy.openLiveScreeningLabel}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* 4 Connected Continuity / Shot Cards Strip */}
              <div className="grid grid-cols-2 gap-2.5 border-t border-slate-800 bg-slate-950 p-3.5 sm:grid-cols-4">
                {assets.thumbSrcs.map((thumbSrc, idx) => {
                  const thumbLabel = visuals.thumbLabels[idx] ?? ''
                  return (
                    <div
                      key={`${activeRoom.id}-${idx}`}
                      title={thumbLabel}
                      className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden bg-black">
                        <img
                          src={thumbSrc}
                          alt={thumbLabel}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p
                        title={thumbLabel}
                        className="line-clamp-2 px-2.5 py-1.5 text-[11px] font-medium leading-tight text-gray-200"
                      >
                        {thumbLabel}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Intuitive Bridge into Live Production Examples Doors */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-slate-900/90 via-cyan-950/25 to-slate-900/90 px-5 py-4 sm:flex-row sm:px-7">
          <p className="text-center text-xs font-medium text-gray-200 sm:text-start sm:text-sm">
            {copy.examplesBridgeText}
          </p>
          <button
            type="button"
            title={copy.examplesBridgeCta}
            onClick={scrollToExamples}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-4 py-2 text-xs font-bold text-cyan-200 transition-all hover:bg-cyan-500/25 hover:text-white sm:text-sm cursor-pointer"
          >
            <Clapperboard className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
            <span className="whitespace-normal leading-tight">{copy.examplesBridgeCta}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        </div>
      </div>

      {expandedScreenshot ? (
        <ExpandedImageModal
          imageUrl={expandedScreenshot.src}
          expandImageLabel={expandedScreenshot.alt}
          closeLabel={tCommon.has('close') ? tCommon('close') : 'Close'}
          onClose={() => setExpandedScreenshot(null)}
        />
      ) : null}

      <StudioDoorWalkthroughModal
        open={Boolean(walkthroughModal)}
        onClose={() => setWalkthroughModal(null)}
        initialRoomId={walkthroughModal?.roomId ?? activeRoom.id}
        initialLocale={locale}
        initialMode={walkthroughModal?.mode ?? 'video'}
      />
    </section>
  )
}

export default StudioGuidedTourSection
