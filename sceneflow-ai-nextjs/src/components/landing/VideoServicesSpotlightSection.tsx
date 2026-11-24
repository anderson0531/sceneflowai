'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Columns3,
  Globe2,
  GraduationCap,
  Handshake,
  HardDrive,
  HeartHandshake,
  Info,
  Lock,
  Megaphone,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { VideoServiceOutputShowcase } from '@/components/landing/VideoServiceOutputShowcase'
import {
  CUSTOMER_PORTAL_ANIMATIC_ID,
  CustomerPortalExperienceAnimatic,
} from '@/components/landing/CustomerPortalExperienceAnimatic'
import {
  CUSTOMER_PORTAL_ANIMATIC_COPY,
  normalizeFeaturePanLocale,
} from '@/config/landing/customerPortalAnimaticCopy'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { formatLandingCurrency, localizeUsdText } from '@/lib/i18n/landingCurrency'
import { resolveClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import { LongformCinemaCraftShowcase } from '@/components/showcase/LongformCinemaCraftShowcase'
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
const PRO_PLAN_MONTHLY_USD = 149
const PRO_INCLUDED_COMPUTE_USD = 100

const AGENCY_OPS_ICONS = [Columns3, BarChart3, Users, HardDrive] as const

export interface ServiceEconomicsResult {
  computeUsd: number
  operatorUsd: number
  fullyLoadedCost: number
  profitPerProject: number
  monthlyGross: number
  monthlySceneFlowBillUsd: number
  monthlySaasOverheadUsd: number
  monthlyNet: number
  netMarginPct: number
}

export function computeServiceEconomics(input: {
  clientPrice: number
  baseComputeUsd: number
  baseOperatorUsd: number
  projectsPerMonth: number
  conservativeRampUp: boolean
}): ServiceEconomicsResult {
  const computeUsd = input.conservativeRampUp
    ? Math.round(input.baseComputeUsd * 1.3)
    : input.baseComputeUsd
  const operatorUsd = input.conservativeRampUp
    ? Math.round(input.baseOperatorUsd * 1.6)
    : input.baseOperatorUsd
  const fullyLoadedCost = computeUsd + operatorUsd
  const profitPerProject = Math.max(0, input.clientPrice - fullyLoadedCost)
  const monthlyGross = input.clientPrice * input.projectsPerMonth
  const monthlyRawCompute = computeUsd * input.projectsPerMonth

  const monthlySaasOverheadUsd = input.conservativeRampUp
    ? Math.max(0, PRO_PLAN_MONTHLY_USD - Math.min(PRO_INCLUDED_COMPUTE_USD, monthlyRawCompute))
    : 0
  const monthlySceneFlowBillUsd = monthlyRawCompute + monthlySaasOverheadUsd
  const monthlyNet = Math.max(
    0,
    profitPerProject * input.projectsPerMonth - monthlySaasOverheadUsd
  )
  const netMarginPct =
    monthlyGross > 0 ? Math.round((monthlyNet / monthlyGross) * 100) : 0

  return {
    computeUsd,
    operatorUsd,
    fullyLoadedCost,
    profitPerProject,
    monthlyGross,
    monthlySceneFlowBillUsd,
    monthlySaasOverheadUsd,
    monthlyNet,
    netMarginPct,
  }
}

export function VideoServicesSpotlightSection() {
  const locale = useLocale()
  const formatMoney = (amountUsd: number) => formatLandingCurrency(amountUsd, locale)
  const localizeMoneyText = (text: string) => localizeUsdText(text, locale)
  const studioCopy = useStudioLandingCopy()
  const copy = studioCopy.videoServices
  const mobileCopy = studioCopy.mobileCompanion
  const portalAnimaticCopy =
    CUSTOMER_PORTAL_ANIMATIC_COPY[normalizeFeaturePanLocale(locale)] ??
    CUSTOMER_PORTAL_ANIMATIC_COPY.en
  const [selectedVerticalId, setSelectedVerticalId] = useState<
    'memoir' | 'realestate' | 'training' | 'brand'
  >('memoir')
  const [selectedTierIdx, setSelectedTierIdx] = useState<0 | 1 | 2>(1)
  const [projectsPerMonth, setProjectsPerMonth] = useState<number>(8)
  const [conservativeRampUp, setConservativeRampUp] = useState<boolean>(false)

  const activeVertical =
    copy.verticals.find((v) => v.id === selectedVerticalId) ?? copy.verticals[0]

  const clientPrice =
    activeVertical.priceTiersUsd[selectedTierIdx] ?? activeVertical.typicalRetailUsd
  const baseComputeUsd =
    activeVertical.computeTiersUsd?.[selectedTierIdx] ?? activeVertical.estComputeUsd
  const baseOperatorUsd =
    activeVertical.operatorTiersUsd?.[selectedTierIdx] ?? activeVertical.estOperatorUsd
  const baseActiveTimeLabel =
    activeVertical.activeTimeTiersLabels?.[selectedTierIdx] ?? activeVertical.activeMinutesLabel
  const activeScopeLabel =
    activeVertical.tierScopeLabels?.[selectedTierIdx] ?? activeVertical.title

  const econ = computeServiceEconomics({
    clientPrice,
    baseComputeUsd,
    baseOperatorUsd,
    projectsPerMonth,
    conservativeRampUp,
  })
  const {
    computeUsd,
    operatorUsd,
    fullyLoadedCost,
    profitPerProject,
    monthlyGross,
    monthlySceneFlowBillUsd,
    monthlySaasOverheadUsd,
    monthlyNet,
    netMarginPct,
  } = econ

  const marginFormulaHint = `${formatMoney(clientPrice)} (${copy.typicalFeeLabel}) − ~${formatMoney(fullyLoadedCost)} (${copy.fullyLoadedCostLabel}) = +${formatMoney(profitPerProject)} (${netMarginPct}% ${copy.marginBadgeSuffix})`

  return (
    <section
      id={VIDEO_SERVICES_SECTION_ID}
      className="relative scroll-mt-20 overflow-hidden border-y border-emerald-500/20 bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950 py-14 sm:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.08),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="mx-auto mb-8 sm:mb-12 max-w-4xl text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="mb-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <TrendingUp className="me-1.5 inline h-3.5 w-3.5 align-[-2px] text-emerald-400" aria-hidden />
            <span>{copy.eyebrow}</span>
          </p>

          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {copy.title}{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-transparent">
              {copy.titleAccent}
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg">
            {copy.subtitle}
          </p>

          <div className="mx-auto mt-4 flex max-w-3xl flex-col items-start justify-center gap-2 border-l-2 border-emerald-400/50 pl-3.5 text-left text-xs font-medium sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 sm:border-l-0 sm:pl-0 sm:text-center">
            <div className="inline-flex items-start sm:items-center gap-1.5 text-emerald-200">
              <ArrowDownRight className="mt-0.5 sm:mt-0 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
              <span>{copy.costSavingsPillLabel}</span>
            </div>
            <div className="inline-flex items-start sm:items-center gap-1.5 text-amber-200/95">
              <ShieldCheck className="mt-0.5 sm:mt-0 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
              <span>{copy.commercialRightsBadge}</span>
            </div>
          </div>
        </motion.div>

        {/* Full-Width 4-Service Selector Bar — spacious on both 360px Galaxy S23 & 1440px Desktop with tooltips */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              {copy.verticalsHeading}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`#${CUSTOMER_PORTAL_ANIMATIC_ID}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/45 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-200 transition-colors hover:border-emerald-300 hover:bg-emerald-500/25 hover:text-white"
              >
                <Play className="h-3 w-3 shrink-0 fill-current text-emerald-300" aria-hidden />
                <span>{portalAnimaticCopy.jumpButtonLabel}</span>
              </a>
              <Link
                href={locale && locale !== 'en' ? `/showcase?lang=${encodeURIComponent(locale)}` : '/showcase'}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/45 bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-500/25 hover:text-white"
              >
                <Sparkles className="h-3 w-3 shrink-0 text-amber-300" aria-hidden />
                <span>Live Express 4K Storefront →</span>
              </Link>
            </div>
          </div>

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
                        {localizeMoneyText(vertical.retailRangeLabel)}
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
                      {localizeMoneyText(vertical.retailRangeLabel)}
                    </span>
                    <span className="hidden w-full whitespace-normal break-words text-sm font-bold leading-snug min-[420px]:block sm:text-[15px]">
                      {vertical.tabLabel}
                    </span>
                    <span
                      className={cn(
                        'hidden w-full whitespace-normal break-words text-[11px] font-semibold leading-tight min-[420px]:block',
                        vertical.id === 'memoir'
                          ? 'text-amber-300'
                          : isActive
                            ? 'text-emerald-200/90'
                            : 'text-slate-400'
                      )}
                    >
                      {vertical.roleTag}
                    </span>
                  </button>
                </VideoControlTooltip>
              )
            })}
          </div>
        </div>

        {/* Main 2-Column Split: Left = Active Vertical Detail, Right = Live Cost & Monthly Profit Estimator */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
          {/* Left Column: Selected Service Vertical Playbook + 5K Narrated Output Showcase */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-sm sm:p-6 lg:col-span-7 lg:p-8">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-emerald-500/20 bg-slate-950/75 p-4 sm:p-6">
              <div>
                <VideoServiceOutputShowcase
                  verticalId={activeVertical.id}
                  verticalTitle={activeVertical.title}
                  locale={locale}
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">
                    {activeVertical.roleTag}
                  </span>
                  <span className="inline-block rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    {activeVertical.badge}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl">
                  {activeVertical.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-300 sm:text-base">
                  {activeVertical.description}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-800 pt-5 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-400/25 bg-gradient-to-r from-amber-950/30 via-slate-900/85 to-emerald-950/25 p-3.5 sm:col-span-2 sm:p-4">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    <Globe2 className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                    <span>{copy.globalDemandLabel}</span>
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-amber-50/95 sm:text-sm">
                    {activeVertical.globalMarketNeed}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 sm:p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {copy.whoBuysLabel}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-200 sm:text-sm">
                    {activeVertical.clientBuyer}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3.5 sm:p-4">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                    <Handshake className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                    <span>{copy.partnerChannelsLabel}</span>
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-cyan-50/90 sm:text-sm">
                    {activeVertical.partnerChannels}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/25 p-3.5 sm:col-span-2 sm:p-4">
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
                    const tierCompute =
                      activeVertical.computeTiersUsd?.[tierIdx] ?? activeVertical.estComputeUsd
                    const tierOp =
                      activeVertical.operatorTiersUsd?.[tierIdx] ?? activeVertical.estOperatorUsd
                    const tierEcon = computeServiceEconomics({
                      clientPrice: tierUsd,
                      baseComputeUsd: tierCompute,
                      baseOperatorUsd: tierOp,
                      projectsPerMonth,
                      conservativeRampUp,
                    })
                    const tierTooltip = `${tierName}: ${formatMoney(tierUsd)} (+${formatMoney(tierEcon.profitPerProject)} ${copy.perProjectProfitLabel.toLowerCase()})`
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
                            {formatMoney(tierUsd)}
                          </span>
                        </button>
                      </VideoControlTooltip>
                    )
                  })}
                </div>
                <p className="mt-2 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] leading-snug text-emerald-100/90">
                  <span className="font-semibold text-emerald-300">{copy.tierScopePrefix}</span>{' '}
                  {activeScopeLabel}
                </p>
              </div>

              {/* Monthly Volume Selector — stacked 2-line buttons so numbers & units never cram */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-300">{copy.volumeLabel}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MONTHLY_VOLUME_OPTIONS.map((count) => {
                    const selected = projectsPerMonth === count
                    const countEcon = computeServiceEconomics({
                      clientPrice,
                      baseComputeUsd,
                      baseOperatorUsd,
                      projectsPerMonth: count,
                      conservativeRampUp,
                    })
                    const volumeTooltip = `${count} ${copy.projectsPerMonthSuffix} → ${formatMoney(countEcon.monthlyNet)} ${copy.perMonthSuffix}`
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

              {/* Optional Conservative Stress-Test Toggle (Month-1 Ramp-Up + Pro Plan $149/mo) */}
              <div className="mt-3.5">
                <VideoControlTooltip
                  label={`${localizeMoneyText(copy.stressTestToggleLabel)} — ${localizeMoneyText(copy.stressTestActiveNote)}`}
                  side="top"
                >
                  <button
                    type="button"
                    title={`${localizeMoneyText(copy.stressTestToggleLabel)} — ${localizeMoneyText(copy.stressTestActiveNote)}`}
                    aria-pressed={conservativeRampUp}
                    onClick={() => setConservativeRampUp((prev) => !prev)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-start text-xs font-semibold transition-all cursor-pointer',
                      conservativeRampUp
                        ? 'border-amber-400/60 bg-amber-500/15 text-amber-100'
                        : 'border-slate-700/90 bg-slate-950/60 text-gray-300 hover:border-slate-600 hover:text-white'
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                      <span>{localizeMoneyText(copy.stressTestToggleLabel)}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        conservativeRampUp
                          ? 'bg-amber-400/25 text-amber-200'
                          : 'bg-white/10 text-gray-400'
                      )}
                    >
                      {conservativeRampUp ? copy.stressTestOnBadge : copy.stressTestOffBadge}
                    </span>
                  </button>
                </VideoControlTooltip>
                {conservativeRampUp && (
                  <p className="mt-1.5 rounded-lg border border-amber-400/25 bg-amber-950/25 px-3 py-1.5 text-[11px] leading-relaxed text-amber-100/90">
                    {localizeMoneyText(copy.stressTestActiveNote)}
                  </p>
                )}
              </div>

              {/* Transparent Per-Project Cost vs Market Rate Breakdown (1-col on 360px S23, 2-col on >=420px) */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 rounded-xl border border-white/10 bg-slate-950/75 p-3 min-[420px]:grid-cols-2 sm:p-3.5">
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5">
                  <p className="text-[11px] text-gray-400">{copy.traditionalMarketLabel}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-400 line-through decoration-rose-400/60 sm:text-base">
                    {localizeMoneyText(activeVertical.traditionalMarketRangeLabel)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-2.5">
                  <p className="text-[11px] text-emerald-200">{copy.typicalFeeLabel}</p>
                  <p className="mt-1 text-sm font-bold text-white sm:text-base">
                    {formatMoney(clientPrice)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5">
                  <p className="text-[11px] text-gray-400">{copy.fullyLoadedCostLabel}</p>
                  <p className="mt-0.5 text-sm font-bold text-cyan-300 sm:text-base">
                    ~{formatMoney(fullyLoadedCost)}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-gray-400">
                    ~{formatMoney(computeUsd)} + ~{formatMoney(operatorUsd)} ({copy.costBreakdownSubLabel})
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-2.5">
                  <p className="text-[11px] text-gray-400">{localizeMoneyText(copy.activeHandsOnLabel)}</p>
                  <p className="mt-0.5 text-sm font-bold text-amber-200 sm:text-base">
                    {conservativeRampUp ? `${baseActiveTimeLabel} (×1.6)` : baseActiveTimeLabel}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-gray-400">
                    {copy.estComputeLabel}: ~{formatMoney(computeUsd)}
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
                      <span className="tabular-nums text-white">+{formatMoney(profitPerProject)}</span>
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                        {netMarginPct}% {copy.marginBadgeSuffix}
                      </span>
                    </span>
                  </div>
                </VideoControlTooltip>

                <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2 text-xs text-gray-300">
                  <span>{copy.monthlyGrossLabel}</span>
                  <span className="font-semibold tabular-nums text-white">
                    {formatMoney(monthlyGross)} {copy.perMonthSuffix}
                  </span>
                </div>

                {conservativeRampUp && (
                  <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs text-amber-200/90">
                    <span>{localizeMoneyText(copy.proPlanLineLabel)}</span>
                    <span className="font-semibold tabular-nums">
                      −{formatMoney(monthlySceneFlowBillUsd)} {copy.perMonthSuffix}
                      {monthlySaasOverheadUsd > 0 ? '' : localizeMoneyText(copy.proPlanCreditsIncludedNote)}
                    </span>
                  </div>
                )}

                <div className="mt-3 border-t border-emerald-500/20 pt-3">
                  <p className="text-xs font-medium text-emerald-200">{copy.monthlyNetLabel}</p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-emerald-300 sm:text-4xl">
                    {formatMoney(monthlyNet)}
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
                title={localizeMoneyText(copy.launchBusinessCta)}
                onClick={() => {
                  window.location.href = getSignupUrlForTier('explorer')
                }}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 font-semibold text-slate-950 hover:brightness-110"
              >
                <span className="whitespace-normal leading-tight">{localizeMoneyText(copy.launchBusinessCta)}</span>
                <ArrowRight className="ms-2 h-4 w-4 shrink-0" aria-hidden />
              </Button>
              <p className="mt-2.5 text-xs leading-relaxed text-emerald-200/90">
                {localizeMoneyText(copy.launchBusinessSubnote)}
              </p>
              <div className="mt-2">
                <Link
                  href="/founding-operators"
                  title={copy.foundingCharterTitle}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 underline-offset-4 hover:text-amber-200 hover:underline"
                >
                  <span>{copy.foundingCharterCta}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </Link>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">{localizeMoneyText(copy.disclaimer)}</p>
            </div>
          </div>
        </div>

        {/* Zero-PM-Hours Self-Funding Blueprint Flywheel Strip (Always Visible) */}
        {copy.blueprintFlywheel && (
          <div className="mt-6 rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-slate-900/95 via-emerald-950/30 to-slate-900/95 p-5 sm:p-6 shadow-xl">
            <div className="max-w-3xl">
              <p className="!mb-0 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                <span>{localizeMoneyText(copy.blueprintFlywheel.badge)}</span>
              </p>
              <h3 className="mt-1.5 text-lg font-bold text-white sm:text-2xl">
                {localizeMoneyText(copy.blueprintFlywheel.title)}
              </h3>
              <p className="!mb-0 mt-1.5 text-xs leading-relaxed text-gray-300 sm:text-sm">
                {localizeMoneyText(copy.blueprintFlywheel.subtitle)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {copy.blueprintFlywheel.cards.map((card) => (
                <div
                  key={card.title}
                  className="flex flex-col rounded-xl border border-emerald-400/20 bg-slate-950/80 p-4"
                >
                  <span className="inline-flex w-fit rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                    {localizeMoneyText(card.tag)}
                  </span>
                  <h4 className="mt-2.5 text-sm font-bold leading-snug text-white">
                    {localizeMoneyText(card.title)}
                  </h4>
                  <p className="!mb-0 mt-1.5 text-xs leading-relaxed text-gray-300">
                    {localizeMoneyText(card.detail)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promoted Out of <details>: Interactive 8-Stage White-Label Client Portal Walkthrough */}
        <CustomerPortalExperienceAnimatic locale={locale} />

        {/* Compact Mobile Companion PWA Callout (folded from standalone section) */}
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-cyan-500/25 bg-slate-900/75 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-300">
              <Smartphone className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="!mb-0 text-sm font-bold text-white">{mobileCopy.eyebrow}</p>
              <p className="!mb-0 mt-0.5 text-xs leading-relaxed text-gray-300">
                {mobileCopy.subtitle}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-950/50 px-3 py-1 text-[11px] font-semibold text-cyan-200">
            iOS &amp; Android PWA
          </span>
        </div>

        {/* Interactive Longform 4K Cinema vs Shortform AI Slop Differentiation Moat */}
        <LongformCinemaCraftShowcase
          variant="studio"
          locale={resolveClientPortalLocale(locale)}
        />

        {/* Multi-PM Agency Scale Operations Strip (Kanban SLA, CRM Scorecard, Locale Routing & Storage Purge) */}
        {copy.agencyScaleOps && (
          <div className="mt-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900/90 via-indigo-950/25 to-slate-900/90 p-5 sm:p-6">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="!mb-0 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-300">
                  <Users className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden />
                  <span>{copy.agencyScaleOps.badge}</span>
                </p>
                <h3 className="mt-1.5 text-lg font-bold text-white sm:text-xl">
                  {copy.agencyScaleOps.title}
                </h3>
                <p className="!mb-0 mt-1 text-xs leading-relaxed text-gray-300 sm:text-sm max-w-3xl">
                  {copy.agencyScaleOps.subtitle}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {copy.agencyScaleOps.pillars.map((pillar, idx) => {
                const Icon = AGENCY_OPS_ICONS[idx % AGENCY_OPS_ICONS.length]
                return (
                  <div
                    key={pillar.title}
                    className="rounded-xl border border-white/10 bg-slate-950/75 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Icon className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                      <span>{pillar.title}</span>
                    </div>
                    <p className="!mb-0 mt-1.5 text-xs leading-relaxed text-gray-300">
                      {pillar.detail}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Progressive Disclosure: Full Agency Operating Kit, White-Label Portal & Delivery Workflow */}
        <details className="group mt-6 rounded-2xl border border-slate-800 bg-slate-900/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-cyan-200 hover:text-white transition-colors [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              <span>{copy.playbooksHeading} · {copy.workflowHeading}</span>
            </span>
            <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300 group-open:hidden">
              Expand
            </span>
            <span className="hidden rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300 group-open:inline">
              Collapse
            </span>
          </summary>

          <div className="border-t border-slate-800/80 px-5 pb-6 pt-2">
            {/* 3-Pillar Enterprise Margin, Client Privacy & Commercial IP Shield */}
            <div className="mt-4 rounded-2xl border border-cyan-500/25 bg-slate-900/75 p-5 sm:p-6">
              <div className="flex items-center justify-center gap-2 text-center">
                <Lock className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 sm:text-sm">
                  {copy.trustShieldHeading}
                </h3>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-3">
                {copy.trustShieldPillars.map((pillar) => (
                  <div
                    key={pillar.title}
                    className="rounded-xl border border-slate-800 bg-slate-950/75 p-4"
                  >
                    <p className="inline-flex items-center gap-2 text-sm font-bold text-white">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                      <span>{pillar.title}</span>
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-300">{pillar.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Service-in-a-Box Operator Playbooks & Partner Referral Kit */}
            <div className="mt-6 rounded-2xl border border-amber-400/25 bg-gradient-to-r from-slate-900/90 via-emerald-950/25 to-slate-900/90 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-amber-300">
                    <BookOpenCheck className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                    <span>{copy.playbooksBadge}</span>
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-white sm:text-xl">
                    {copy.playbooksHeading}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-300 sm:text-sm">
                    {copy.playbooksSubtitle}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:max-w-2xl">
                  {copy.playbooksItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-xl border border-white/10 bg-slate-950/75 px-3.5 py-2.5 text-xs leading-snug text-gray-200"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4-Step Client Project Delivery Strip */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-7">
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
        </details>
      </div>
    </section>
  )
}

export default VideoServicesSpotlightSection
