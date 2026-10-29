'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Sparkles,
  Compass,
  Coins,
  Zap,
  CheckCircle2,
  ArrowRight,
  PlayCircle,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  JIT_CONTEXT_GUIDES,
  INTERACTIVE_TUTORIALS,
  type JitContextId,
} from '@/config/help/helpAcademyConfig'
import { AnnotatedStudioScreenshot } from '@/components/help/AnnotatedStudioScreenshot'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

export const STUDIO_ACADEMY_SECTION_ID = 'studio-academy'

const SHOWCASE_SCREENS: {
  id: JitContextId
  tabLabel: string
  stepBadge: string
}[] = [
  {
    id: 'blueprint',
    tabLabel: '1. Blueprint & 80+ Resonance',
    stepBadge: 'Phase 1 • Story & Greenlight',
  },
  {
    id: 'production',
    tabLabel: '2. Continuity Vault & Video Motion',
    stepBadge: 'Phase 2 • Virtual Soundstage',
  },
  {
    id: 'series',
    tabLabel: '3. Series Story Bible',
    stepBadge: 'Multi-Episode Continuity',
  },
  {
    id: 'final-cut',
    tabLabel: '4. Final Cut & 13+ Languages',
    stepBadge: 'Phase 3–4 • Screening & Dubs',
  },
]

const SELLING_PILLARS = [
  {
    icon: Compass,
    badge: 'Always 1 Keypress Away (?)',
    title: 'Context-Aware Just-In-Time (JIT) Coach',
    description:
      'Press ? on any screen to open an instant visual map of your active workspace, a 60-second checklist of what to do next, and 1-click buttons that trigger the exact studio action for you.',
    accent: 'from-cyan-500/20 to-blue-600/10 border-cyan-500/30 text-cyan-300',
  },
  {
    icon: PlayCircle,
    badge: '4 Guided Interactive Courses',
    title: '“Your First Film in 10 Minutes” Simulator',
    description:
      'Built for storytellers, authors, and showrunners with zero editing experience. Follow interactive Spotlight X-Ray callouts from a 1-sentence concept to a voiced, scored, and playable film.',
    accent: 'from-purple-500/20 to-indigo-600/10 border-purple-500/30 text-purple-300',
  },
  {
    icon: Coins,
    badge: 'Save Up to 70% of Credits',
    title: 'Animatic-First Credit Guardrails',
    description:
      'Every workspace includes real-time credit guardrails that teach you how to lock an 80+ Audience Resonance script and preview a voiced Keyframe Animatic before rendering motion video clips.',
    accent: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30 text-emerald-300',
  },
]

export function StudioAcademySection() {
  const [selectedContextId, setSelectedContextId] =
    useState<JitContextId>('blueprint')
  const activeGuide =
    JIT_CONTEXT_GUIDES[selectedContextId] || JIT_CONTEXT_GUIDES.blueprint
  const signupUrl = getSignupUrlForTier('explorer')

  return (
    <section
      id={STUDIO_ACADEMY_SECTION_ID}
      className="relative py-20 sm:py-28 bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 border-t border-slate-800/80 scroll-mt-20 overflow-hidden"
    >
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute top-16 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header & Selling Copy */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-semibold mb-4">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <span>SceneFlow Studio Academy &amp; Just-In-Time Training</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Hollywood Studio Power.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
              Zero Film School Required.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            Never stare at a blank timeline or burn credits guessing what a button
            does. Every SceneFlow workspace includes an interactive{' '}
            <strong className="text-white">Visual Screen Map</strong>, step-by-step{' '}
            <strong className="text-white">Guided Tutorials</strong>, and a live{' '}
            <strong className="text-cyan-300">Just-In-Time (JIT) Coach</strong> that
            walks you from idea to finished master.
          </p>
        </motion.div>

        {/* 3 Selling Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {SELLING_PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className={cn(
                  'rounded-2xl border bg-gradient-to-br p-6 flex flex-col justify-between',
                  pillar.accent
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-950/70 border border-white/10">
                      {pillar.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Interactive Annotated Studio Screenshot Showcase */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 lg:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Try the Live Just-In-Time (JIT) Visual Screen Map Below</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Click Any Workspace &amp; Numbered Pin (1–4) to Inspect Studio Controls
              </h3>
            </div>

            {/* Workspace Screen Switcher Tabs */}
            <div className="flex flex-wrap gap-2">
              {SHOWCASE_SCREENS.map((screen) => {
                const isSelected = screen.id === selectedContextId
                const guide = JIT_CONTEXT_GUIDES[screen.id]
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setSelectedContextId(screen.id)}
                    title={`${screen.tabLabel} (${screen.stepBadge}) — ${guide?.subtitle || ''}`}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs font-bold transition-all border',
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    )}
                  >
                    {screen.tabLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Interactive Grid: Left 8 Cols = Annotated Screenshot, Right 4 Cols = 60s JIT Checklist + Guardrail */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <AnnotatedStudioScreenshot
                screenshotSrc={activeGuide.screenshotSrc}
                screenshotAlt={activeGuide.screenshotAlt}
                hotspots={activeGuide.hotspots}
                onActionTriggered={() => {
                  window.location.href = signupUrl
                }}
              />
            </div>

            <div className="lg:col-span-4 space-y-4">
              {/* Simulated JIT Coach Header Card */}
              <div className="rounded-2xl bg-slate-950/90 border border-cyan-500/30 p-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    JIT Coach: {activeGuide.shortTitle}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    ● Auto-Detected
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeGuide.subtitle}
                </p>
              </div>

              {/* 60-Second Action Checklist Preview */}
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>60-Second Guided Checklist</span>
                </h4>
                <div className="space-y-2.5">
                  {activeGuide.quickSteps.map((step) => (
                    <div
                      key={step.id}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-white">
                          {step.stepNumber}. {step.title}
                        </span>
                        {step.creditBadge && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold flex-shrink-0">
                            {step.creditBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credit Guardrail Box */}
              <div className="rounded-2xl bg-emerald-950/25 border border-emerald-500/30 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mb-1">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{activeGuide.creditGuardrail.title}</span>
                </div>
                <p className="text-[11px] text-slate-200 font-medium mb-1">
                  {activeGuide.creditGuardrail.typicalCost}
                </p>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  {activeGuide.creditGuardrail.proSavingsRule}
                </p>
              </div>
            </div>
          </div>

          {/* Included Curriculum Strip + Conversion CTAs */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                4 Interactive Academy Courses Included Free With Every Plan:
              </p>
              <div className="flex flex-wrap gap-2">
                {INTERACTIVE_TUTORIALS.map((course) => (
                  <span
                    key={course.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-950 text-slate-200 border border-slate-800"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{course.title}</span>
                    <span className="text-slate-500">({course.totalDuration})</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              <a
                href={signupUrl}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <span>Start 10-Min Tutorial in Studio ($9)</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
              >
                <span>Compare Plans &amp; Credits</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default StudioAcademySection
