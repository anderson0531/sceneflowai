'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  Film,
  Layers,
  Maximize2,
  Play,
  Share2,
  Sparkles,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { ExpandedImageModal } from '@/components/landing/ExpandedImageModal'
import { PipelineReviewDialog } from '@/components/landing/PipelineReviewDialog'
import { TwoModesTheaterModal } from '@/components/landing/TwoModesTheaterModal'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { featureRoomHasVideo, getFeatureRoomMedia } from '@/config/landing/featureRoomMedia'
import {
  BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP,
  SCENE_DIRECTOR_SCREENSHOT_WEBP,
  SCREENING_COLLAB_SCREENSHOT_WEBP,
  SERIES_REVIEW_SCREENSHOT_WEBP,
} from '@/config/landing/keyFeatureScreenshots'
import type { TwoModesMediaEntry } from '@/config/landing/twoModesMedia'
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

  const [activeRoomId, setActiveRoomId] = useState<RoomId>('series-desk')
  const [lens, setLens] = useState<'creator' | 'service'>('creator')
  const [expandedScreenshot, setExpandedScreenshot] = useState<{
    src: string
    alt: string
  } | null>(null)
  const [roomVideoModal, setRoomVideoModal] = useState<{
    title: string
    media: TwoModesMediaEntry
  } | null>(null)
  const [liveScreeningOpen, setLiveScreeningOpen] = useState(false)

  const activeRoom = copy.rooms.find((r) => r.id === activeRoomId) ?? copy.rooms[0]
  const assets = ROOM_SANDBOX_ASSETS[activeRoom.id]
  const visuals = activeRoom.visuals
  const roomMedia = getFeatureRoomMedia(activeRoom.id, locale)
  const hasRoomVideo = featureRoomHasVideo(roomMedia)

  const openRoomVideo = () => {
    if (!hasRoomVideo) return
    setRoomVideoModal({
      title: `${activeRoom.stepNumber} · ${activeRoom.tabLabel}`,
      media: {
        imageUrl: '',
        posterUrl: assets.heroSrc,
        webmUrl: roomMedia.webmUrl,
        mp4Url: roomMedia.mp4Url,
      },
    })
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
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-1.5">
            <span className="px-2.5 text-xs font-medium text-gray-400">{copy.lensLabel}</span>
            <button
              type="button"
              onClick={() => setLens('creator')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                lens === 'creator'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              )}
            >
              <Clapperboard className="h-3.5 w-3.5" aria-hidden />
              <span>{copy.lensCreator}</span>
            </button>
            <button
              type="button"
              onClick={() => setLens('service')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                lens === 'service'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-300 hover:text-white'
              )}
            >
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
              <span>{copy.lensService}</span>
            </button>
          </div>
        </motion.div>

        {/* 4-Room Stepper Tabs */}
        <div
          role="tablist"
          aria-label={copy.title}
          className="mb-8 grid grid-cols-2 gap-2.5 lg:grid-cols-4"
        >
          {copy.rooms.map((room) => {
            const Icon = ROOM_ICONS[room.id]
            const isSelected = room.id === activeRoom.id
            return (
              <button
                key={room.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveRoomId(room.id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-4 text-start transition-all',
                  isSelected
                    ? 'border-cyan-400/60 bg-slate-900 text-white shadow-lg shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-950/60 text-gray-400 hover:border-slate-700 hover:text-gray-200'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold',
                    isSelected
                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                      : 'border-slate-700 bg-slate-900 text-gray-400'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                    {copy.stepPrefix} {room.stepNumber}
                  </p>
                  <p className="truncate text-sm font-bold text-white sm:text-base">
                    {room.tabLabel}
                  </p>
                </div>
              </button>
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
                    <button
                      type="button"
                      onClick={openRoomVideo}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 hover:text-white"
                    >
                      <Play className="h-3 w-3 fill-current" aria-hidden />
                      <span>{copy.watchRoomVideoLabel}</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedScreenshot({
                        src: ROOM_FULL_SCREENSHOTS[activeRoom.id],
                        alt: `${activeRoom.tabLabel} — ${copy.inspectFullScreenLabel}`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                  >
                    <Maximize2 className="h-3 w-3" aria-hidden />
                    <span>{copy.inspectFullScreenLabel}</span>
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
                      onClick={() => setLiveScreeningOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-100 backdrop-blur-md transition-colors hover:bg-amber-500/35 hover:text-white"
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden />
                      <span>{copy.openLiveScreeningLabel}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden />
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
                      <p className="truncate px-2.5 py-1.5 text-[11px] font-medium text-gray-200">
                        {thumbLabel}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
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

      {roomVideoModal ? (
        <TwoModesTheaterModal
          open={Boolean(roomVideoModal)}
          onClose={() => setRoomVideoModal(null)}
          media={roomVideoModal.media}
          caption={roomVideoModal.title}
          pauseLabel={tCommon('pause')}
          playLabel={tCommon('play')}
          muteLabel={tCommon('mute')}
          unmuteLabel={tCommon('unmute')}
        />
      ) : null}

      <PipelineReviewDialog
        open={liveScreeningOpen}
        onClose={() => setLiveScreeningOpen(false)}
        closeLabel={tCommon.has('close') ? tCommon('close') : 'Close'}
        title={copy.screeningModalTitle}
        href="/share/screening-room/glass-ledger-screening"
      />
    </section>
  )
}

export default StudioGuidedTourSection
