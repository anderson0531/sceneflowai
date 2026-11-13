'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowRight,
  Building2,
  GraduationCap,
  HeartHandshake,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { cn } from '@/lib/utils'

export const VIDEO_SERVICES_SECTION_ID = 'video-services'

const VERTICAL_ICONS = {
  memoir: HeartHandshake,
  realestate: Building2,
  training: GraduationCap,
  brand: Megaphone,
} as const

const MONTHLY_VOLUME_OPTIONS = [4, 8, 15] as const
const TIER_INDICES = [0, 1, 2] as const

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

export function VideoServicesSpotlightSection() {
  const copy = useStudioLandingCopy().videoServices
  const [selectedVerticalId, setSelectedVerticalId] = useState<
    'memoir' | 'realestate' | 'training' | 'brand'
  >('memoir')
  const [selectedTierIdx, setSelectedTierIdx] = useState<0 | 1 | 2>(1)
  const [projectsPerMonth, setProjectsPerMonth] = useState<number>(8)

  const activeVertical =
    copy.verticals.find((v) => v.id === selectedVerticalId) ?? copy.verticals[0]

  const clientPrice =
    activeVertical.priceTiersUsd[selectedTierIdx] ?? activeVertical.typicalRetailUsd
  const fullyLoadedCost = activeVertical.estComputeUsd + activeVertical.estOperatorUsd
  const profitPerProject = Math.max(0, clientPrice - fullyLoadedCost)
  const monthlyGross = clientPrice * projectsPerMonth
  const monthlyNet = profitPerProject * projectsPerMonth
  const trueMarginPct = Math.round((profitPerProject / clientPrice) * 100)

  return (
    <section
      id={VIDEO_SERVICES_SECTION_ID}
      className="relative scroll-mt-20 overflow-hidden border-y border-emerald-500/20 bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950 py-20 sm:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.08),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="mx-auto mb-14 max-w-4xl text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-300" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
              {copy.eyebrow}
            </span>
          </div>

          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {copy.title}{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-transparent">
              {copy.titleAccent}
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg">
            {copy.subtitle}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-semibold text-emerald-200">
              <ArrowDownRight className="h-4 w-4 text-emerald-300" aria-hidden />
              <span>{copy.costSavingsPillLabel}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-200">
              <ShieldCheck className="h-4 w-4 text-amber-300" aria-hidden />
              <span>{copy.commercialRightsBadge}</span>
            </div>
          </div>
        </motion.div>

        {/* Main 2-Column Split: Left = 4 Service Verticals, Right = Live Margin & Monthly Income Preview */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Vertical Selector + Detail */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/75 p-6 backdrop-blur-sm sm:p-8 lg:col-span-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                {copy.verticalsHeading}
              </p>

              <div
                role="tablist"
                aria-label={copy.verticalsHeading}
                className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {copy.verticals.map((vertical) => {
                  const Icon = VERTICAL_ICONS[vertical.id]
                  const isActive = vertical.id === activeVertical.id
                  return (
                    <button
                      key={vertical.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setSelectedVerticalId(vertical.id)}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all sm:text-sm',
                        isActive
                          ? 'border-emerald-400/60 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/15'
                          : 'border-slate-700/80 bg-slate-950/60 text-gray-300 hover:border-slate-600 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                      <span className="truncate">{vertical.tabLabel}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-slate-950/75 p-5 sm:p-6">
                <span className="inline-block rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {activeVertical.badge}
                </span>
                <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                  {activeVertical.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-300 sm:text-base">
                  {activeVertical.description}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {copy.whoBuysLabel}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-200">
                      {activeVertical.clientBuyer}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/25 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                      {copy.marginAdvantageLabel}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-100/90">
                      {activeVertical.keyAdvantage}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Unit Economics & Monthly Income Calculator */}
          <div className="flex flex-col justify-between rounded-2xl border border-emerald-400/35 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-emerald-950/35 p-6 shadow-2xl sm:p-8 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {copy.calculatorBadge}
                </span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  ~{trueMarginPct}% {copy.marginBadgeSuffix}
                </span>
              </div>

              <h3 className="mt-2 text-lg font-bold text-white sm:text-xl">
                {copy.calculatorTitle}
              </h3>

              {/* Client Pricing Tier Selector */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-300">{copy.priceTierLabel}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {TIER_INDICES.map((tierIdx) => {
                    const tierUsd = activeVertical.priceTiersUsd[tierIdx]
                    const selected = selectedTierIdx === tierIdx
                    return (
                      <button
                        key={tierIdx}
                        type="button"
                        onClick={() => setSelectedTierIdx(tierIdx)}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-xl border px-2 py-2 transition-all',
                          selected
                            ? 'border-emerald-400/70 bg-emerald-500/20 text-white shadow-sm'
                            : 'border-slate-700 bg-slate-950/70 text-gray-300 hover:border-slate-600 hover:text-white'
                        )}
                      >
                        <span className="text-[11px] font-medium text-gray-300">
                          {copy.priceTierNames[tierIdx]}
                        </span>
                        <span className="mt-0.5 text-xs font-bold text-emerald-300 sm:text-sm">
                          {formatUsd(tierUsd)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Monthly Volume Selector */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-300">{copy.volumeLabel}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MONTHLY_VOLUME_OPTIONS.map((count) => {
                    const selected = projectsPerMonth === count
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setProjectsPerMonth(count)}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-xs font-bold transition-all sm:text-sm',
                          selected
                            ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 shadow-sm'
                            : 'border-slate-700 bg-slate-950/70 text-gray-300 hover:border-slate-600 hover:text-white'
                        )}
                      >
                        {count} {copy.projectsPerMonthSuffix}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Transparent Per-Project Cost vs Market Rate Breakdown */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl border border-white/10 bg-slate-950/75 p-3.5">
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5">
                  <p className="text-[11px] text-gray-400">{copy.traditionalMarketLabel}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-400 line-through decoration-rose-400/60 sm:text-base">
                    {activeVertical.traditionalMarketRangeLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-2.5">
                  <p className="text-[11px] text-emerald-200">{copy.typicalFeeLabel}</p>
                  <p className="mt-1 text-sm font-bold text-white sm:text-base">
                    {formatUsd(clientPrice)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5">
                  <p className="text-[11px] text-gray-400">{copy.fullyLoadedCostLabel}</p>
                  <p className="mt-0.5 text-sm font-bold text-cyan-300 sm:text-base">
                    ~{formatUsd(fullyLoadedCost)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    ~{formatUsd(activeVertical.estComputeUsd)} + ~{formatUsd(activeVertical.estOperatorUsd)} ({copy.costBreakdownSubLabel})
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5">
                  <p className="text-[11px] text-gray-400">{copy.activeHandsOnLabel}</p>
                  <p className="mt-0.5 text-sm font-bold text-amber-200 sm:text-base">
                    {activeVertical.activeMinutesLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {copy.estComputeLabel}: ~{formatUsd(activeVertical.estComputeUsd)}
                  </p>
                </div>
              </div>

              {/* Monthly Income Highlight */}
              <div className="mt-4 rounded-2xl border border-emerald-400/35 bg-emerald-950/40 p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-2 text-xs text-gray-300">
                  <span>{copy.monthlyGrossLabel}</span>
                  <span className="font-semibold text-white">
                    {formatUsd(monthlyGross)} {copy.perMonthSuffix}
                  </span>
                </div>
                <div className="mt-3 border-t border-emerald-500/20 pt-3">
                  <p className="text-xs font-medium text-emerald-200">{copy.monthlyNetLabel}</p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-300 sm:text-4xl">
                    {formatUsd(monthlyNet)}
                    <span className="ms-1.5 text-sm font-semibold text-emerald-200/80">
                      {copy.perMonthSuffix}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                size="lg"
                onClick={() => {
                  window.location.href = getSignupUrlForTier('explorer')
                }}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 font-semibold text-slate-950 hover:brightness-110"
              >
                <span>{copy.launchBusinessCta}</span>
                <ArrowRight className="ms-2 h-4 w-4" aria-hidden />
              </Button>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{copy.disclaimer}</p>
            </div>
          </div>
        </div>

        {/* 4-Step Client Project Delivery Strip */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-7">
          <h3 className="text-center text-sm font-bold uppercase tracking-wider text-emerald-300">
            {copy.workflowHeading}
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.workflowSteps.map((ws) => (
              <div
                key={ws.step}
                className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4"
              >
                <span className="inline-block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-300">
                  {copy.stepPrefix} {ws.step}
                </span>
                <p className="mt-2 text-sm font-bold text-white">{ws.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-300">{ws.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default VideoServicesSpotlightSection
