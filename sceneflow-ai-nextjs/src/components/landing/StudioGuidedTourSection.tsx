'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Briefcase,
  Clapperboard,
  Film,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { InsetRoomTourPlayer } from '@/components/landing/InsetRoomTourPlayer'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { cn } from '@/lib/utils'

export const STUDIO_GUIDED_TOUR_SECTION_ID = 'studio-tour'

type RoomId = 'series-desk' | 'blueprint-board' | 'production-stage' | 'screening-room'

const ROOM_ICONS: Record<RoomId, typeof Layers> = {
  'series-desk': Layers,
  'blueprint-board': Sparkles,
  'production-stage': Clapperboard,
  'screening-room': Film,
}

export function StudioGuidedTourSection() {
  const locale = useLocale()
  const copy = useStudioLandingCopy().guidedTour

  const scrollToExamples = () => {
    document.getElementById('production-examples')?.scrollIntoView({ behavior: 'smooth' })
  }

  const [activeRoomId, setActiveRoomId] = useState<RoomId>('series-desk')
  const [lens, setLens] = useState<'creator' | 'service'>('creator')

  const activeRoom = copy.rooms.find((r) => r.id === activeRoomId) ?? copy.rooms[0]

  return (
    <section
      id={STUDIO_GUIDED_TOUR_SECTION_ID}
      className="relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-14 sm:py-28"
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

        {/* Active Room Narrative + Inset Video Tour Player */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 rounded-3xl border border-white/10 bg-slate-900/75 p-4 shadow-2xl backdrop-blur-sm sm:p-8 lg:grid-cols-12 lg:items-center">
          {/* Left: Non-Technical Narrative + 3 Callouts */}
          <div className="lg:col-span-5">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">
              {activeRoom.stepNumber} · {activeRoom.badge}
            </p>

            <h3 className="mt-2.5 text-2xl font-bold leading-snug text-white sm:text-3xl">
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

          {/* Right: Embedded 7-Language Inset Room Video Tour Player */}
          <div className="lg:col-span-7">
            <InsetRoomTourPlayer
              roomId={activeRoom.id}
              roomLabel={activeRoom.tabLabel}
              initialLocale={locale}
            />
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
    </section>
  )
}

export default StudioGuidedTourSection
