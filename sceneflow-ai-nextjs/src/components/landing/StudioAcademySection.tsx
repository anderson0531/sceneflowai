'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Coins,
  Compass,
  Copy,
  Film,
  GraduationCap,
  HelpCircle,
  PlayCircle,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  JIT_CONTEXT_GUIDES,
  INTERACTIVE_TUTORIALS,
  type JitContextId,
} from '@/config/help/helpAcademyConfig'
import { AnnotatedStudioScreenshot } from '@/components/help/AnnotatedStudioScreenshot'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import {
  formatHeroVideoScript,
  getHeroSectionScript,
} from '@/config/landing/heroSectionScripts'

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

const DETAIL_CARDS = [
  {
    icon: Compass,
    badge: 'Always 1 Keypress Away (?)',
    title: 'Context-Aware Just-In-Time (JIT) Coach',
    description:
      'Press ? on any screen to open an instant visual map of your active workspace, a 60-second checklist of what to do next, and 1-click buttons that trigger the exact studio action for you.',
  },
  {
    icon: PlayCircle,
    badge: '4 Guided Interactive Courses',
    title: '“Your First Film in 10 Minutes” Simulator',
    description:
      'Built for storytellers, authors, and showrunners with zero editing experience. Follow interactive Spotlight X-Ray callouts from a 1-sentence concept to a voiced, scored, and playable film.',
  },
  {
    icon: Coins,
    badge: 'Save Up to 70% of Credits',
    title: 'Animatic-First Credit Guardrails',
    description:
      'Every workspace includes real-time credit guardrails that show how to lock an 80+ Audience Resonance script and preview a voiced Keyframe Animatic before rendering motion video clips.',
  },
  {
    icon: GraduationCap,
    badge: 'Included Free With Every Plan',
    title: '4 Interactive Studio Courses Built In',
    description:
      'Master Blueprint & Audience Resonance, the Character & Setting Continuity Vault, Animatic-First Credit Guardrails, and Screening Room & 70+ Language Dubbing right inside the studio.',
  },
] as const

const ANA_VIDEO_BLOCKS = [
  {
    block: 'Block 01 (0:00–0:10)',
    title: 'The Just-In-Time Screen Map',
    syncLine:
      'ANA (on camera): "You don\'t need film school when the studio guides every step."',
    narration:
      'Press question mark on any screen to open a Just-In-Time visual map of the exact workspace you are in.',
    visual:
      'Medium shot of Ana (CHAR_ANA, olive field jacket over slate turtleneck) in the warm studio beside a translucent hologram showing glowing cyan numbered callout pins connected to storyboard frames and waveforms.',
  },
  {
    block: 'Block 02 (0:10–0:20)',
    title: '60-Second Checklist & Credit Guardrails',
    narration:
      'Follow a 60-second checklist with one-click studio actions, while built-in credit guardrails lock narration, music, and animatic frames before you spend on motion.',
    visual:
      'Close-medium shot across Ana and the floating glass panel as three checklist nodes light up from cyan to emerald green, locking the voiced animatic timeline before heavy video render.',
  },
  {
    block: 'Block 03 (0:20–0:30)',
    title: '“Your First Film in 10 Minutes” Simulator',
    narration:
      'Or launch the ten-minute interactive simulator — walking you from a one-sentence idea to a voiced, scored, and published master as you create.',
    visual:
      'Medium portrait of Ana smiling warmly to camera as the numbered training pins transition smoothly into a luminous playable widescreen master frame behind her.',
  },
] as const

export function StudioAcademySection() {
  const tShowcase = useTranslations('productionShowcase')
  const [showDetail, setShowDetail] = useState(false)
  const [showInteractiveMap, setShowInteractiveMap] = useState(false)
  const [showAnaScript, setShowAnaScript] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [selectedContextId, setSelectedContextId] =
    useState<JitContextId>('blueprint')

  const activeGuide =
    JIT_CONTEXT_GUIDES[selectedContextId] || JIT_CONTEXT_GUIDES.blueprint
  const signupUrl = getSignupUrlForTier('explorer')
  const anaHeroScript = getHeroSectionScript('academy')

  const scrollToCheckout = () => {
    window.location.href = signupUrl
  }

  const scrollToExamples = () => {
    document.getElementById('production-examples')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCopyAnaScript = async () => {
    try {
      await navigator.clipboard.writeText(formatHeroVideoScript(anaHeroScript))
      setCopiedScript(true)
      setTimeout(() => setCopiedScript(false), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <section
      id={STUDIO_ACADEMY_SECTION_ID}
      className="relative min-h-[64vh] scroll-mt-20 overflow-hidden bg-gray-950 text-white"
    >
      {/* Full-bleed Ana backdrop matching the Hero Sequence */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/landing/primary-value/studio-academy.webp"
          alt="Ana in the SceneFlow studio beside a translucent Just-In-Time (JIT) workspace map with numbered callout pins"
          className="absolute inset-0 h-full w-full bg-black object-cover"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-black/45" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/35 to-black/45" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[64vh] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            SceneFlow Studio Academy &amp; Just-In-Time Training
          </p>
          <h2 className="mx-auto max-w-4xl text-balance text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Guided at every step. Master the studio as you create.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-balance text-base text-gray-100 sm:text-lg">
            Never stare at a blank timeline or burn credits guessing what comes next. Press <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-cyan-300">?</code> on any screen for an instant Just-In-Time (JIT) Screen Map and a 60-second checklist with one-click studio actions—or follow interactive courses from your first concept to a published master.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetail((prev) => !prev)}
              aria-expanded={showDetail}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-cyan-200 backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-slate-900 hover:text-white sm:text-sm"
            >
              <GraduationCap className="h-4 w-4 text-cyan-400" aria-hidden />
              <span>{showDetail ? 'Hide detail' : 'Show more detail'}</span>
              {showDetail ? (
                <ChevronUp className="h-4 w-4 text-cyan-300" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 text-cyan-300" aria-hidden />
              )}
            </button>
          </div>
        </motion.div>

        {/* Collapsible Detail Cards + Interactive JIT Map + 30s Ana Video Script */}
        {showDetail && (
          <motion.div
            className="mx-auto mt-8 w-full max-w-5xl rounded-2xl border border-white/15 bg-slate-950/80 p-5 backdrop-blur-md sm:p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-4 flex flex-col items-center gap-1.5 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                Hollywood Studio Power · Zero Film School Required
              </span>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Interactive Screen Maps, 60-Second Checklists, and Credit Guardrails Built Into Every Room
              </h3>
            </div>

            {/* 4 Detail Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DETAIL_CARDS.map((card) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.title}
                    className="rounded-xl border border-white/10 bg-slate-900/75 p-4 text-left"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
                        <Icon className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/90">
                        {card.badge}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">{card.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-300 sm:text-sm">
                      {card.description}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* 4 Included Curriculum Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {INTERACTIVE_TUTORIALS.map((course) => (
                <span
                  key={course.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-200"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{course.title}</span>
                  <span className="text-slate-400">({course.totalDuration})</span>
                </span>
              ))}
            </div>

            {/* Expandable Live JIT Visual Screen Map & 30s Ana Video Script Controls */}
            <div className="mt-5 border-t border-white/10 pt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowInteractiveMap((prev) => !prev)}
                    aria-expanded={showInteractiveMap}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 transition hover:text-white sm:text-sm"
                  >
                    <Sparkles className="h-4 w-4 text-cyan-400" aria-hidden />
                    <span>
                      {showInteractiveMap
                        ? 'Hide Live JIT Visual Screen Map'
                        : 'Try Live JIT Visual Screen Map (Pins 1–4)'}
                    </span>
                    {showInteractiveMap ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAnaScript((prev) => !prev)}
                    aria-expanded={showAnaScript}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 transition hover:text-white sm:text-sm"
                  >
                    <Film className="h-4 w-4 text-cyan-400" aria-hidden />
                    <span>
                      {showAnaScript
                        ? 'Hide 30s Video Script (Ana)'
                        : 'View 30s Video Script (Ana)'}
                    </span>
                    {showAnaScript ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </button>
                </div>

                {showAnaScript && (
                  <button
                    type="button"
                    onClick={handleCopyAnaScript}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1 text-xs font-medium text-gray-200 transition hover:border-cyan-400/40 hover:text-white"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                        <span>Copy script</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Interactive Annotated Studio Screenshot Showcase */}
              {showInteractiveMap && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 lg:flex-row lg:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Live Just-In-Time (JIT) Visual Screen Map
                      </p>
                      <p className="text-sm font-semibold text-white">
                        Click Any Workspace &amp; Numbered Pin (1–4) to Inspect Studio Controls
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
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
                              'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
                              isSelected
                                ? 'border-cyan-400 bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                                : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:text-white'
                            )}
                          >
                            {screen.tabLabel}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
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
                    <div className="space-y-3 lg:col-span-4">
                      <div className="rounded-xl border border-cyan-500/30 bg-slate-950/90 p-3.5">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                            JIT Coach: {activeGuide.shortTitle}
                          </span>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            ● Auto-Detected
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-300">
                          {activeGuide.subtitle}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5">
                        <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <Zap className="h-3.5 w-3.5 text-cyan-400" />
                          <span>60-Second Guided Checklist</span>
                        </h4>
                        <div className="space-y-2">
                          {activeGuide.quickSteps.map((step) => (
                            <div
                              key={step.id}
                              className="rounded-lg border border-slate-800/90 bg-slate-900/90 p-2.5"
                            >
                              <div className="mb-0.5 flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-white">
                                  {step.stepNumber}. {step.title}
                                </span>
                                {step.creditBadge && (
                                  <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                    {step.creditBadge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] leading-relaxed text-slate-400">
                                {step.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 30s Ana Video Script Drawer */}
              {showAnaScript && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {ANA_VIDEO_BLOCKS.map((item) => (
                    <div
                      key={item.block}
                      className="rounded-xl border border-white/10 bg-slate-950/85 p-3.5 text-left"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                        {item.block}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-white">{item.title}</p>
                      {'syncLine' in item && item.syncLine ? (
                        <p className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-2.5 py-1.5 text-xs italic text-cyan-100">
                          {item.syncLine}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs leading-relaxed text-gray-200">
                        <span className="font-semibold text-gray-400">VO: </span>
                        {item.narration}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
                        <span className="font-semibold text-gray-500">Picture: </span>
                        {item.visual}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90"
            onClick={scrollToCheckout}
          >
            Launch Studio ($9)
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/25 bg-black/45 text-white backdrop-blur-sm hover:border-cyan-400/50 hover:bg-black/65"
            onClick={scrollToExamples}
          >
            <Clapperboard className="mr-2 h-4 w-4 text-cyan-400" />
            {tShowcase('badge')}
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

export default StudioAcademySection
