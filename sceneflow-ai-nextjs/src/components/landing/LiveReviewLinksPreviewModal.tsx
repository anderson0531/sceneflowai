'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clapperboard,
  Compass,
  FileText,
  Globe2,
  Layers,
  Lock,
  MessageSquare,
  Play,
  ShieldCheck,
  Sparkles,
  Tv,
  X,
} from 'lucide-react'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { LIVE_REVIEW_PREVIEW_COPY } from '@/config/landing/liveReviewPreviewCopy'
import { normalizeWalkthroughDubLocale } from '@/config/landing/doorWalkthroughCopy'
import {
  PRODUCTION_TRAILER_POSTERS,
  type ProductionWalkId,
  type ReviewerMilestoneId,
} from '@/config/landing/productionPipelineDemo'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { cn } from '@/lib/utils'

export interface LiveReviewLinksPreviewModalProps {
  open: boolean
  onClose: () => void
  productionId: string
  productionTitle: string
  productionBadge?: string
  initialDoor?: ReviewerMilestoneId
  locale?: string
}

const DOOR_ORDER: readonly ReviewerMilestoneId[] = [
  'screening',
  'series',
  'blueprint',
  'script-ar',
] as const

const DOOR_ICONS: Record<ReviewerMilestoneId, React.ComponentType<{ className?: string }>> = {
  screening: Tv,
  series: Layers,
  blueprint: Compass,
  'script-ar': FileText,
}

const MOCK_DUB_PILLS = ['EN', 'ES', 'PT', 'HI', 'ZH', 'AR', 'TH'] as const

function slugifyTitle(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'production-example'
  )
}

export function LiveReviewLinksPreviewModal({
  open,
  onClose,
  productionId,
  productionTitle,
  productionBadge,
  initialDoor = 'screening',
  locale = 'en',
}: LiveReviewLinksPreviewModalProps) {
  const [mounted, setMounted] = useState(false)
  const [activeDoor, setActiveDoor] = useState<ReviewerMilestoneId>(initialDoor)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setActiveDoor(initialDoor)
  }, [open, initialDoor])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  const dubLocale = normalizeWalkthroughDubLocale(locale)
  const copy = LIVE_REVIEW_PREVIEW_COPY[dubLocale] ?? LIVE_REVIEW_PREVIEW_COPY.en
  const doorCopy = copy.doors[activeDoor] ?? copy.doors.screening
  const isRtl = dubLocale === 'ar'
  const slug = slugifyTitle(productionTitle)
  const posterSrc =
    PRODUCTION_TRAILER_POSTERS[productionId as ProductionWalkId] ||
    PRODUCTION_TRAILER_POSTERS.drama

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${productionTitle} — ${copy.comingSoonBadge}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="live-review-links-preview-modal"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 md:p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-white shadow-[0_28px_90px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900/95 px-4 py-3.5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-200">
                  <Calendar className="h-3 w-3 shrink-0 text-amber-300" aria-hidden />
                  <span>{copy.comingSoonBadge}</span>
                </span>
                {productionBadge ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200">
                    <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                    {productionBadge}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1.5 text-base sm:text-xl font-bold tracking-tight text-white">
                {productionTitle} · {doorCopy.headline}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                {copy.modalSubtitle}
              </p>
            </div>

            <VideoControlTooltip label={copy.closeLabel} side="bottom">
              <button
                type="button"
                onClick={onClose}
                title={copy.closeLabel}
                aria-label={copy.closeLabel}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </VideoControlTooltip>
          </div>

          {/* 4 Live Review Door Tabs */}
          <div
            role="tablist"
            aria-label="Live shareable review link surfaces"
            className="grid grid-cols-2 sm:grid-cols-4 gap-1.5"
          >
            {DOOR_ORDER.map((doorId) => {
              const Icon = DOOR_ICONS[doorId]
              const active = doorId === activeDoor
              const tabLabel = copy.doors[doorId].tabLabel
              return (
                <button
                  key={doorId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={tabLabel}
                  onClick={() => setActiveDoor(doorId)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-start text-xs font-semibold transition-all cursor-pointer',
                    active
                      ? 'border-cyan-400/60 bg-cyan-500/15 text-white shadow-[0_0_16px_rgba(34,211,238,0.15)]'
                      : 'border-white/10 bg-slate-950/70 text-slate-300 hover:border-white/25 hover:text-white'
                  )}
                >
                  <Icon
                    className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-cyan-300' : 'text-slate-400')}
                    aria-hidden
                  />
                  <span className="whitespace-normal break-words leading-tight">{tabLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable Body: Mocked Shareable Review Link Screenshot + Dec 3 Feature Summary */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5">
          {/* Mock Browser Window Illustrating the Live Shareable Review Link */}
          <div
            data-testid="live-review-mock-screenshot"
            data-door={activeDoor}
            className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-950 shadow-2xl"
          >
            {/* Realistic Browser Address Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 min-w-0 flex-1 max-w-lg">
                  <Lock className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px]">
                    https://{doorCopy.urlPathPrefix}
                    <span className="text-cyan-300">{slug}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
                  {copy.zeroLoginPill}
                </span>
                <span className="inline-flex items-center rounded-md border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                  {copy.mockRibbon}
                </span>
              </div>
            </div>

            {/* Mocked Live Shareable Page Interior (Tailored per Selected Door) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950">
              {/* Left 7 Cols: Visual Preview Canvas */}
              <div className="lg:col-span-7 p-4 sm:p-5 border-b lg:border-b-0 lg:border-e border-slate-800/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                    <Clapperboard className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                    {productionTitle}
                  </span>
                  <span className="rounded-md border border-cyan-500/35 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                    {doorCopy.mockHeaderTag}
                  </span>
                </div>

                {/* Production Visual Frame + Door-Specific Overlay UI */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
                  <img
                    src={posterSrc}
                    alt={`${productionTitle} — ${doorCopy.tabLabel}`}
                    className="h-full w-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-black/30" />

                  {activeDoor === 'screening' ? (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/60 bg-slate-950/75 text-cyan-300 shadow-lg">
                          <Play className="h-5 w-5 fill-current ms-0.5" aria-hidden />
                        </span>
                      </div>
                      <div className="absolute inset-x-3 bottom-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-200">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-950/80 px-2 py-0.5 border border-white/10">
                            <Globe2 className="h-3 w-3 text-cyan-300" aria-hidden />
                            {MOCK_DUB_PILLS.join(' · ')}
                          </span>
                          <span className="font-mono text-slate-300">0:44 / 2:15</span>
                        </div>
                        <div className="relative h-1.5 w-full rounded-full bg-white/20">
                          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500" />
                          <span className="absolute top-1/2 -translate-y-1/2 left-[14%] h-2.5 w-2.5 rounded-full border border-white bg-amber-400" />
                          <span className="absolute top-1/2 -translate-y-1/2 left-[33%] h-2.5 w-2.5 rounded-full border border-white bg-cyan-400" />
                          <span className="absolute top-1/2 -translate-y-1/2 left-[64%] h-2.5 w-2.5 rounded-full border border-white bg-emerald-400" />
                        </div>
                      </div>
                    </>
                  ) : activeDoor === 'blueprint' ? (
                    <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-2">
                      {(['Act I', 'Act II', 'Act III'] as const).map((act, idx) => (
                        <div
                          key={act}
                          className="rounded-lg border border-white/15 bg-slate-950/85 p-2 backdrop-blur-md"
                        >
                          <div className="text-[10px] font-bold text-cyan-300">{act}</div>
                          <div className="mt-0.5 text-[10px] text-slate-200 leading-tight line-clamp-2">
                            {doorCopy.mockHighlights[idx]}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeDoor === 'series' ? (
                    <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {['EP 01', 'EP 02', 'EP 03', 'EP 04', 'EP 05'].map((ep, idx) => (
                          <span
                            key={ep}
                            className={cn(
                              'rounded-md border px-2 py-0.5 text-[10px] font-bold',
                              idx === 0
                                ? 'border-cyan-400/60 bg-cyan-500/25 text-cyan-100'
                                : 'border-white/15 bg-slate-950/80 text-slate-300'
                            )}
                          >
                            {ep}
                          </span>
                        ))}
                      </div>
                      <div className="rounded-lg border border-white/15 bg-slate-950/85 px-2.5 py-1.5 text-[10px] text-emerald-200 backdrop-blur-md">
                        {doorCopy.mockHighlights[0]}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-2">
                      {[
                        { label: 'Pacing', score: '95' },
                        { label: 'Hook', score: '96' },
                        { label: 'Continuity', score: '98' },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-lg border border-emerald-400/30 bg-slate-950/85 p-2 text-center backdrop-blur-md"
                        >
                          <div className="text-sm font-extrabold text-emerald-300 tabular-nums">
                            {metric.score}
                          </div>
                          <div className="text-[10px] text-slate-300">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="!mb-0 text-xs text-slate-300 leading-relaxed">
                  {doorCopy.description}
                </p>
              </div>

              {/* Right 5 Cols: Simulated Client Review & Sign-Off Sidebar */}
              <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between gap-4 bg-slate-950/75">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                      {doorCopy.tabLabel}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-300">
                      {copy.whiteLabelPill}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {doorCopy.mockHighlights.map((item, idx) => (
                      <div
                        key={`mock-hl-${activeDoor}-${idx}`}
                        className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-200"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                          aria-hidden
                        />
                        <span className="leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                    <span>{doorCopy.mockActionLabel}</span>
                  </div>
                  <p className="!mb-0 text-center text-[11px] text-amber-200/90">
                    {copy.launchDateLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What Activates Dec 3rd Summary Strip */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2.5">
            <p className="!mb-0 text-xs font-bold uppercase tracking-wider text-cyan-300">
              {copy.whatYouCanDoHeading}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {copy.whatYouCanDoItems.map((item, idx) => (
                <div
                  key={`dec3-item-${idx}`}
                  className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden />
                  <span className="leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-900/95 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            {copy.closeLabel}
          </button>
          <a
            href={getSignupUrlForTier('explorer')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <span>{copy.startNowCta}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </a>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default LiveReviewLinksPreviewModal
