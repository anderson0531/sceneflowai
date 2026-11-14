'use client'

import { useState } from 'react'
import {
  ArrowRight,
  BellRing,
  Camera,
  CheckCircle2,
  Film,
  Gauge,
  Link2,
  Mic,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VideoControlTooltip } from '@/components/landing/VideoControlTooltip'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { cn } from '@/lib/utils'

export const MOBILE_COMPANION_SECTION_ID = 'mobile-app'

const CUSTOMER_STEP_ICONS = [Mic, Sparkles, Camera, Film] as const

const TEAM_PILLAR_ICONS = {
  alerts: BellRing,
  status: Gauge,
  budget: Wallet,
  links: Share2,
} as const

const CUSTOMER_STEP_ACTIVE_STAGE_INDEX = [0, 1, 2, 4] as const

export function MobileCompanionPwaSection() {
  const copy = useStudioLandingCopy().mobileCompanion
  const [mode, setMode] = useState<'customer' | 'team'>('customer')
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(0)
  const [selectedPillarId, setSelectedPillarId] = useState<'alerts' | 'status' | 'budget' | 'links'>(
    'alerts'
  )

  const safeStepIdx = Math.min(Math.max(selectedStepIdx, 0), copy.customerSteps.length - 1)
  const activeStep = copy.customerSteps[safeStepIdx] ?? copy.customerSteps[0]
  const activeStageIdx =
    mode === 'customer'
      ? (CUSTOMER_STEP_ACTIVE_STAGE_INDEX[safeStepIdx] ?? 0)
      : 3

  return (
    <section
      id={MOBILE_COMPANION_SECTION_ID}
      className="relative py-16 sm:py-24 overflow-hidden border-t border-cyan-500/15 bg-gradient-to-b from-slate-950 via-cyan-950/10 to-slate-950 scroll-mt-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.10),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
            <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="whitespace-normal break-words">{copy.eyebrow}</span>
          </div>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {copy.title}{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
              {copy.titleAccent}
            </span>
          </h2>

          <p className="mt-4 text-base leading-relaxed text-gray-300 sm:text-lg">{copy.subtitle}</p>

          {/* Why-PWA Callout Strip */}
          <div className="mt-5 inline-flex max-w-2xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-xs text-gray-300 shadow-inner">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 font-bold text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{copy.whyPwaBadge}</span>
            </span>
            <span className="leading-relaxed text-gray-300">{copy.whyPwaNote}</span>
          </div>
        </div>

        {/* Perspective Mode Switcher — Stacks cleanly at 360px, 2-col at >= 420px */}
        <div className="mx-auto mt-8 max-w-xl">
          <div
            role="tablist"
            aria-label={copy.eyebrow}
            className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-800 bg-slate-900/85 p-1.5 min-[420px]:grid-cols-2"
          >
            <VideoControlTooltip
              label={`${copy.modeCustomerTab} — ${copy.customerHeading}`}
              side="top"
            >
              <button
                type="button"
                role="tab"
                title={`${copy.modeCustomerTab} — ${copy.customerHeading}`}
                aria-selected={mode === 'customer'}
                onClick={() => setMode('customer')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all cursor-pointer',
                  mode === 'customer'
                    ? 'border-cyan-400/70 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/15'
                    : 'border-transparent bg-transparent text-gray-300 hover:bg-slate-800/70 hover:text-white'
                )}
              >
                <Users className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                <span className="whitespace-normal break-words leading-snug">
                  {copy.modeCustomerTab}
                </span>
              </button>
            </VideoControlTooltip>

            <VideoControlTooltip label={`${copy.modeTeamTab} — ${copy.teamHeading}`} side="top">
              <button
                type="button"
                role="tab"
                title={`${copy.modeTeamTab} — ${copy.teamHeading}`}
                aria-selected={mode === 'team'}
                onClick={() => setMode('team')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all cursor-pointer',
                  mode === 'team'
                    ? 'border-emerald-400/70 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/15'
                    : 'border-transparent bg-transparent text-gray-300 hover:bg-slate-800/70 hover:text-white'
                )}
              >
                <BellRing className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                <span className="whitespace-normal break-words leading-snug">
                  {copy.modeTeamTab}
                </span>
              </button>
            </VideoControlTooltip>
          </div>
        </div>

        {/* Main 2-Column Layout: Left = Workflow / Team Pillars, Right = Live Interactive Mobile PWA Frame */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-12 lg:items-center lg:gap-8">
          {/* Left Column */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-sm sm:p-6 lg:col-span-7 lg:p-7">
            {mode === 'customer' ? (
              <div>
                <h3 className="text-xl font-bold leading-snug text-white sm:text-2xl">
                  {copy.customerHeading}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">
                  {copy.customerSubheading}
                </p>

                <div className="mt-5 space-y-3">
                  {copy.customerSteps.map((item, idx) => {
                    const StepIcon = CUSTOMER_STEP_ICONS[idx] ?? Sparkles
                    const isSelected = idx === safeStepIdx
                    const stepTooltip = `${item.step} · ${item.title}`
                    return (
                      <VideoControlTooltip key={item.step} label={stepTooltip} side="top">
                        <button
                          type="button"
                          title={stepTooltip}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedStepIdx(idx)}
                          className={cn(
                            'w-full rounded-xl border p-3.5 text-start transition-all sm:p-4 cursor-pointer',
                            isSelected
                              ? 'border-cyan-400/70 bg-slate-950/90 shadow-lg shadow-cyan-500/10'
                              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/80'
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tabular-nums',
                                  isSelected
                                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                                    : 'border-slate-700 bg-slate-900 text-gray-400'
                                )}
                              >
                                {item.step}
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                                  isSelected
                                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                                    : 'border-slate-700/80 bg-slate-900/80 text-gray-300'
                                )}
                              >
                                <StepIcon className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="whitespace-normal break-words">{item.badge}</span>
                              </span>
                            </div>

                            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-cyan-200/90">
                              <Link2 className="h-3 w-3 shrink-0" aria-hidden />
                              <span className="whitespace-normal break-words">
                                {item.linkLabel}
                              </span>
                            </span>
                          </div>

                          <p className="mt-2.5 text-sm font-bold leading-snug text-white sm:text-base">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-gray-300 sm:text-sm">
                            {item.detail}
                          </p>
                        </button>
                      </VideoControlTooltip>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold leading-snug text-white sm:text-2xl">
                  {copy.teamHeading}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{copy.teamSubheading}</p>

                <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {copy.teamPillars.map((pillar) => {
                    const PillarIcon = TEAM_PILLAR_ICONS[pillar.id] ?? Smartphone
                    const isSelected = selectedPillarId === pillar.id
                    const pillarTooltip = `${pillar.title} (${pillar.metric})`
                    return (
                      <VideoControlTooltip key={pillar.id} label={pillarTooltip} side="top">
                        <button
                          type="button"
                          title={pillarTooltip}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedPillarId(pillar.id)}
                          className={cn(
                            'flex h-full flex-col justify-between rounded-xl border p-4 text-start transition-all cursor-pointer',
                            isSelected
                              ? 'border-emerald-400/70 bg-slate-950/90 shadow-lg shadow-emerald-500/10'
                              : 'border-slate-800 bg-slate-950/55 hover:border-slate-700 hover:bg-slate-900/80'
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                                  isSelected
                                    ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                                    : 'border-slate-700 bg-slate-900 text-cyan-300'
                                )}
                              >
                                <PillarIcon className="h-4 w-4 shrink-0" aria-hidden />
                              </span>
                              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                                {pillar.metric}
                              </span>
                            </div>

                            <p className="mt-3 text-sm font-bold leading-snug text-white sm:text-base">
                              {pillar.title}
                            </p>
                            <p className="mt-1.5 text-xs leading-relaxed text-gray-300">
                              {pillar.detail}
                            </p>
                          </div>
                        </button>
                      </VideoControlTooltip>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Mobile Companion PWA Mockup */}
          <div className="flex flex-col items-center lg:col-span-5">
            <div className="w-full max-w-[360px] rounded-[2.25rem] border-2 border-slate-700/90 bg-slate-950 p-3 shadow-[0_24px_64px_rgba(6,182,212,0.18)]">
              {/* Top Speaker Notch */}
              <div className="mx-auto mb-2.5 h-1.5 w-16 rounded-full bg-slate-800" />

              <div className="rounded-[1.75rem] border border-slate-800/90 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-3.5">
                {/* Phone App Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/90 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                      <Smartphone className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="text-xs font-bold text-white">{copy.phoneHeaderBrand}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold tabular-nums text-cyan-200">
                      {copy.phoneCreditsPill}
                    </span>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                      {copy.phonePmBadge}
                    </span>
                  </div>
                </div>

                {/* 5-Stage Production Milestone Bar */}
                <div
                  className={cn(
                    'mt-3 rounded-xl border p-2.5 transition-all',
                    mode === 'team' && selectedPillarId === 'status'
                      ? 'border-emerald-400/70 bg-emerald-950/25'
                      : 'border-slate-800/90 bg-slate-900/70'
                  )}
                >
                  <div className="grid grid-cols-5 gap-1">
                    {copy.phoneStageBarLabels.map((stageLabel, idx) => {
                      const isDone = idx < activeStageIdx || (mode === 'customer' && safeStepIdx === 3)
                      const isCurrent = idx === activeStageIdx && !(mode === 'customer' && safeStepIdx === 3)
                      return (
                        <div key={stageLabel} className="flex flex-col items-center text-center">
                          <div
                            className={cn(
                              'h-1.5 w-full rounded-full transition-all',
                              isDone
                                ? 'bg-emerald-400'
                                : isCurrent
                                  ? 'bg-cyan-400'
                                  : 'bg-slate-800'
                            )}
                          />
                          <span
                            className={cn(
                              'mt-1 w-full whitespace-normal break-words text-[9px] font-semibold leading-tight',
                              isDone
                                ? 'text-emerald-300'
                                : isCurrent
                                  ? 'text-cyan-200'
                                  : 'text-slate-500'
                            )}
                          >
                            {stageLabel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Dynamic Screen Body */}
                {mode === 'customer' ? (
                  <div className="mt-3 space-y-2.5">
                    <div className="rounded-xl border border-cyan-400/35 bg-slate-900/90 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                          {activeStep.step} · {activeStep.badge}
                        </span>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                      </div>

                      <p className="mt-2 text-sm font-bold text-white">{activeStep.phoneHeadline}</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-300">
                        {activeStep.phoneStatus}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                        {activeStep.phoneMeta}
                      </p>

                      {/* Contextual Step Mini-Preview */}
                      {safeStepIdx === 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2.5 text-[10px]">
                          <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                            <Mic className="h-3 w-3 shrink-0" aria-hidden />
                            Voice / Brief
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                            <Users className="h-3 w-3 shrink-0" aria-hidden />
                            {copy.phonePmBadge}
                          </span>
                        </div>
                      )}

                      {safeStepIdx === 1 && (
                        <div className="mt-2.5 border-t border-slate-800 pt-2.5">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-cyan-200">
                            <span>Audience Resonance</span>
                            <span className="tabular-nums text-emerald-300">94 / 100</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
                          </div>
                        </div>
                      )}

                      {safeStepIdx === 2 && (
                        <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-800 pt-2.5 text-[10px]">
                          {['Cast ✓', 'Wardrobe ✓', 'Locations ✓', 'Props ✓'].map((slot) => (
                            <span
                              key={slot}
                              className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-center font-semibold text-emerald-200"
                            >
                              {slot}
                            </span>
                          ))}
                        </div>
                      )}

                      {safeStepIdx === 3 && (
                        <div className="mt-2.5 border-t border-slate-800 pt-2.5">
                          <div className="flex items-center justify-between text-[10px] text-gray-300">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                              <Film className="h-3 w-3 shrink-0" aria-hidden />
                              4K Master
                            </span>
                            <span className="tabular-nums text-gray-400">01:14 / 02:30</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full w-full rounded-full bg-emerald-400" />
                          </div>
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/90 px-2.5 py-1.5 text-[11px] text-cyan-200">
                        <Share2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden />
                        <span className="whitespace-normal break-words">{activeStep.linkLabel}</span>
                      </div>
                    </div>

                    {/* Quick 01-04 Step Selector inside Phone */}
                    <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                      {copy.customerSteps.map((st, idx) => {
                        const active = idx === safeStepIdx
                        const stepPillTooltip = `${st.step} · ${st.badge}`
                        return (
                          <button
                            key={st.step}
                            type="button"
                            title={stepPillTooltip}
                            onClick={() => setSelectedStepIdx(idx)}
                            className={cn(
                              'rounded-lg border py-1.5 text-center text-[11px] font-bold tabular-nums transition-all cursor-pointer',
                              active
                                ? 'border-cyan-400/70 bg-cyan-500/20 text-white'
                                : 'border-slate-800 bg-slate-900/70 text-gray-400 hover:text-white'
                            )}
                          >
                            {st.step}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {/* Live Push Notification Card */}
                    <div
                      className={cn(
                        'rounded-xl border p-3 transition-all',
                        selectedPillarId === 'alerts'
                          ? 'border-emerald-400/70 bg-emerald-950/25'
                          : 'border-slate-800 bg-slate-900/85'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <BellRing className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                        <p className="text-xs font-bold text-white">{copy.phoneTeamAlertTitle}</p>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-gray-300">
                        {copy.phoneTeamAlertBody}
                      </p>
                    </div>

                    {/* Credit Budget & Pace Card */}
                    <div
                      className={cn(
                        'rounded-xl border p-3 transition-all',
                        selectedPillarId === 'budget'
                          ? 'border-emerald-400/70 bg-emerald-950/25'
                          : 'border-slate-800 bg-slate-900/85'
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                        <span className="font-semibold text-gray-300">
                          {copy.phoneTeamBudgetLabel}
                        </span>
                        <span className="font-bold tabular-nums text-white">
                          {copy.phoneTeamBudgetValue}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full w-[47%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                        <span>{copy.phoneTeamPaceBadge}</span>
                      </div>
                    </div>

                    {/* 4 Shared Portal Dispatch Strip */}
                    <div
                      className={cn(
                        'grid grid-cols-2 gap-1.5 rounded-xl border p-2.5 transition-all',
                        selectedPillarId === 'links'
                          ? 'border-emerald-400/70 bg-emerald-950/25'
                          : 'border-slate-800 bg-slate-900/85'
                      )}
                    >
                      {[
                        copy.phoneStageBarLabels[0],
                        copy.phoneStageBarLabels[1],
                        copy.phoneStageBarLabels[2],
                        copy.phoneStageBarLabels[4],
                      ].map((portalName) => (
                        <span
                          key={portalName}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-950/90 px-2 py-1 text-[10px] font-semibold text-cyan-200"
                        >
                          <Share2 className="h-2.5 w-2.5 shrink-0 text-cyan-400" aria-hidden />
                          <span className="whitespace-normal break-words">{portalName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Zero-Friction PWA Install Pills + Primary CTA */}
            <div className="mt-5 w-full max-w-[360px] space-y-2.5">
              <div className="flex flex-col gap-1.5 text-[11px] text-gray-300">
                <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-center">
                  {copy.installIosBadge}
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-center">
                  {copy.installAndroidBadge}
                </div>
              </div>

              <Button
                size="lg"
                title={copy.ctaPrimary}
                onClick={() => {
                  window.location.href = getSignupUrlForTier('explorer')
                }}
                className="w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 font-semibold text-slate-950 hover:brightness-110"
              >
                <span className="whitespace-normal leading-tight">{copy.ctaPrimary}</span>
                <ArrowRight className="ms-2 h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MobileCompanionPwaSection
