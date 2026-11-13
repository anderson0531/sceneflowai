'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowRight,
  Building2,
  GraduationCap,
  HeartHandshake,
  Info,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
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
  const netMarginPct = Math.round((profitPerProject / clientPrice) * 100)
  const marginFormulaHint = `${formatUsd(clientPrice)} (${copy.typicalFeeLabel}) − ~${formatUsd(fullyLoadedCost)} (${copy.fullyLoadedCostLabel}) = +${formatUsd(profitPerProject)} (${netMarginPct}% ${copy.marginBadgeSuffix})`

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
          className="mx-auto mb-10 sm:mb-12 max-w-4xl text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5">
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
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
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-200">
              <ArrowDownRight className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              <span>{copy.costSavingsPillLabel}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-200">
              <ShieldCheck className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
              <span>{copy.commercialRightsBadge}</span>
            </div>
          </div>
        </motion.div>

        {/* Full-Width 4-Service Selector Bar — spacious on both 360px Galaxy S23 & 1440px Desktop with tooltips */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            {copy.verticalsHeading}
          </p>

          <div
            role="tablist"
            aria-label={copy.verticalsHeading}
            className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4 sm:gap-3"
          >
            {copy.verticals.map((vertical) => {
              const Icon = VERTICAL_ICONS[vertical.id]
              const isActive = vertical.id === activeVertical.id
              const tooltipSummary = `${vertical.tabLabel} — ${vertical.title} (${vertical.badge})`
              return (
                <VideoControlTooltip key={vertical.id} label={tooltipSummary} side="top">
                  <button
                    type="button"
                    role="tab"
                    title={tooltipSummary}
                    aria-selected={isActive}
                    onClick={() => setSelectedVerticalId(vertical.id)}
                    className={cn(
                      'flex flex-row items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-all min-[420px]:flex-col min-[420px]:items-start min-[420px]:p-3 sm:p-3.5 cursor-pointer',
                      isActive
                        ? 'border-emerald-400/70 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/15'
                        : 'border-slate-700/80 bg-slate-950/65 text-gray-300 hover:border-slate-600 hover:bg-slate-900/90 hover:text-white'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 min-[420px]:w-full min-[420px]:flex-initial min-[420px]:justify-between">
                      <span
                        className={cn(
                          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          isActive
                            ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                            : 'border-slate-700 bg-slate-900 text-emerald-300/80'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      </span>
                      <span className="min-w-0 whitespace-normal break-words text-sm font-bold leading-snug min-[420px]:hidden">
                        {vertical.tabLabel}
                      </span>
                      <span
                        className={cn(
                          'hidden rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums min-[420px]:inline-block',
                          isActive
                            ? 'bg-emerald-400/20 text-emerald-200'
                            : 'bg-white/5 text-slate-400'
                        )}
                      >
                        {vertical.retailRangeLabel}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums min-[420px]:hidden',
                        isActive
                          ? 'bg-emerald-400/20 text-emerald-200'
                          : 'bg-white/5 text-slate-400'
                      )}
                    >
                      {vertical.retailRangeLabel}
                    </span>
                    <span className="hidden w-full whitespace-normal break-words text-sm font-bold leading-snug min-[420px]:block sm:text-[15px]">
                      {vertical.tabLabel}
                    </span>
                  </button>
                </VideoControlTooltip>
              )
            })}
          </div>
        </div>

        {/* Main 2-Column Split: Left = Active Vertical Detail, Right = Live Cost & Monthly Profit Estimator */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
          {/* Left Column: Selected Service Vertical Playbook */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-sm sm:p-6 lg:col-span-7 lg:p-8">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-emerald-500/20 bg-slate-950/75 p-4 sm:p-6">
              <div>
                <span className="inline-block rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {activeVertical.badge}
                </span>
                <h3 className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl">
                  {activeVertical.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-300 sm:text-base">
                  {activeVertical.description}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-800 pt-5 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 sm:p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {copy.whoBuysLabel}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-200 sm:text-sm">
                    {activeVertical.clientBuyer}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/25 p-3.5 sm:p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                    {copy.marginAdvantageLabel}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
                    {activeVertical.keyAdvantage}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Unit Economics & Monthly Profit Calculator */}
          <div className="flex flex-col justify-between rounded-2xl border border-emerald-400/35 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-emerald-950/35 p-4 shadow-2xl sm:p-6 lg:col-span-5 lg:p-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{copy.calculatorBadge}</span>
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
                    const tierName = copy.priceTierNames[tierIdx]
                    const selected = selectedTierIdx === tierIdx
                    const tierProfit = Math.max(0, tierUsd - fullyLoadedCost)
                    const tierTooltip = `${tierName}: ${formatUsd(tierUsd)} (+${formatUsd(tierProfit)} ${copy.perProjectProfitLabel.toLowerCase()})`
                    return (
                      <VideoControlTooltip key={tierIdx} label={tierTooltip} side="top">
                        <button
                          type="button"
                          title={tierTooltip}
                          onClick={() => setSelectedTierIdx(tierIdx)}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition-all cursor-pointer',
                            selected
                              ? 'border-emerald-400/70 bg-emerald-500/20 text-white shadow-sm'
                              : 'border-slate-700 bg-slate-950/70 text-gray-300 hover:border-slate-600 hover:text-white'
                          )}
                        >
                          <span className="whitespace-normal break-words text-[11px] font-medium leading-tight text-gray-300">
                            {tierName}
                          </span>
                          <span className="mt-1 text-xs font-extrabold tabular-nums text-emerald-300 sm:text-sm">
                            {formatUsd(tierUsd)}
                          </span>
                        </button>
                      </VideoControlTooltip>
                    )
                  })}
                </div>
              </div>

              {/* Monthly Volume Selector — stacked 2-line buttons so numbers & units never cram */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-300">{copy.volumeLabel}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MONTHLY_VOLUME_OPTIONS.map((count) => {
                    const selected = projectsPerMonth === count
                    const estNetForCount = profitPerProject * count
                    const volumeTooltip = `${count} ${copy.projectsPerMonthSuffix} → ${formatUsd(estNetForCount)} ${copy.perMonthSuffix}`
                    return (
                      <VideoControlTooltip key={count} label={volumeTooltip} side="top">
                        <button
                          type="button"
                          title={volumeTooltip}
                          onClick={() => setProjectsPerMonth(count)}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all cursor-pointer',
                            selected
                              ? 'border-amber-400/70 bg-amber-500/20 text-amber-100 shadow-sm'
                              : 'border-slate-700 bg-slate-950/70 text-gray-300 hover:border-slate-600 hover:text-white'
                          )}
                        >
                          <span className="text-sm font-extrabold tabular-nums sm:text-base">
                            {count}
                          </span>
                          <span className="mt-0.5 whitespace-normal break-words text-[11px] font-medium leading-tight text-gray-300">
                            {copy.projectsUnitLabel}
                          </span>
                        </button>
                      </VideoControlTooltip>
                    )
                  })}
                </div>
              </div>

              {/* Transparent Per-Project Cost vs Market Rate Breakdown (1-col on 360px S23, 2-col on >=420px) */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 rounded-xl border border-white/10 bg-slate-950/75 p-3 min-[420px]:grid-cols-2 sm:p-3.5">
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
                  <p className="mt-0.5 text-[10px] leading-snug text-gray-400">
                    ~{formatUsd(activeVertical.estComputeUsd)} + ~{formatUsd(activeVertical.estOperatorUsd)} ({copy.costBreakdownSubLabel})
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5">
                  <p className="text-[11px] text-gray-400">{copy.activeHandsOnLabel}</p>
                  <p className="mt-0.5 text-sm font-bold text-amber-200 sm:text-base">
                    {activeVertical.activeMinutesLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-gray-400">
                    {copy.estComputeLabel}: ~{formatUsd(activeVertical.estComputeUsd)}
                  </p>
                </div>
              </div>

              {/* Per-Project Net Profit + Monthly Income Summary */}
              <div className="mt-4 rounded-2xl border border-emerald-400/35 bg-emerald-950/40 p-4 sm:p-5">
                <VideoControlTooltip label={marginFormulaHint} side="top">
                  <div
                    title={marginFormulaHint}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5 text-xs"
                  >
                    <span className="inline-flex items-center gap-1 text-gray-300">
                      <span>{copy.perProjectProfitLabel}</span>
                      <Info className="h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden />
                    </span>
                    <span className="inline-flex flex-wrap items-center gap-1.5 font-bold text-emerald-200">
                      <span className="tabular-nums text-white">+{formatUsd(profitPerProject)}</span>
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                        {netMarginPct}% {copy.marginBadgeSuffix}
                      </span>
                    </span>
                  </div>
                </VideoControlTooltip>

                <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2 text-xs text-gray-300">
                  <span>{copy.monthlyGrossLabel}</span>
                  <span className="font-semibold tabular-nums text-white">
                    {formatUsd(monthlyGross)} {copy.perMonthSuffix}
                  </span>
                </div>

                <div className="mt-3 border-t border-emerald-500/20 pt-3">
                  <p className="text-xs font-medium text-emerald-200">{copy.monthlyNetLabel}</p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-emerald-300 sm:text-4xl">
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
                title={copy.launchBusinessCta}
                onClick={() => {
                  window.location.href = getSignupUrlForTier('explorer')
                }}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 font-semibold text-slate-950 hover:brightness-110"
              >
                <span className="whitespace-normal leading-tight">{copy.launchBusinessCta}</span>
                <ArrowRight className="ms-2 h-4 w-4 shrink-0" aria-hidden />
              </Button>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{copy.disclaimer}</p>
            </div>
          </div>
        </div>

        {/* 4-Step Client Project Delivery Strip */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-7">
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
