'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  Copy,
  Film,
  Layers,
  PauseCircle,
  ShieldCheck,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import {
  formatHeroVideoScript,
  getHeroSectionScript,
} from '@/config/landing/heroSectionScripts'

export const PRODUCTION_AGENT_SECTION_ID = 'production-agent'

const DETAIL_CARDS = [
  {
    icon: Clock,
    badge: 'Eliminate 300+ Manual Prompts',
    title: '< 1 Hour on Script → Walk Away Free',
    description:
      'Skip typing 300+ individual still and video prompts across 27 scenes (12–20 shots per scene). Perfect your script in under an hour and reclaim your day for business or personal priorities.',
  },
  {
    icon: Layers,
    badge: 'All 27 Scenes or By Chapter',
    title: '5 End-to-End Production Stages',
    description:
      'Select Pre-Vis, Clips, Scenes, Master, and Promo in one builder. The Agent autonomously builds continuity references, dialogue/SFX/music audio, keyframes, motion clips, and trailers.',
  },
  {
    icon: ShieldCheck,
    badge: 'Zero Stalled Renders',
    title: 'Self-Healing + Creative Clips Fallback',
    description:
      'Automatically optimizes shot direction and reruns failed shots. When an intended dramatic shot still hits Google policy filters after optimization, it switches to Creative Clips automatically.',
  },
  {
    icon: PauseCircle,
    badge: 'Full Director Control',
    title: 'Checkpoints & /s/ Screening Links',
    description:
      'Run 100% hands-free or pause after Pre-Vis or each scene. Receive notifications at your chosen frequency with a direct /s/ Screening Room link ready for review.',
  },
] as const

const ANA_VIDEO_BLOCKS = [
  {
    block: 'Block 01 (0:00–0:10)',
    title: 'The 300-Shot Wall & One-Click Launch',
    syncLine:
      'ANA (on camera): "Three hundred shots used to mean three hundred manual prompts. Not anymore."',
    narration:
      'Spend under an hour perfecting your script across 27 scenes — then launch the Production Agent in one click.',
    visual:
      'Medium shot of Ana (CHAR_ANA, olive field jacket over slate turtleneck) in the dark virtual production suite. She taps a single cyan launch control; behind her, a 27-scene storyboard grid and a cyan-to-emerald progress bar ignite across the curved wall display.',
  },
  {
    block: 'Block 02 (0:10–0:20)',
    title: 'Autonomous Build, Self-Healing & Creative Clips Fallback',
    narration:
      'The Agent walks every scene — locking references, laying narration and music cues, optimizing failed clip prompts, and switching to Creative Clips when a shot hits policy filters.',
    visual:
      'Over-the-shoulder past Ana toward the curved wall display as storyboard frames, audio waveforms, and motion previews populate across 27 scene slots. One tile briefly pulses amber (policy retry), rewrites its camera angle, and turns solid emerald green.',
  },
  {
    block: 'Block 03 (0:20–0:30)',
    title: 'Walk Away & Screening Room Notification',
    narration:
      'Set scene checkpoints, or walk away completely. When your Pre-Vis or master cut is ready, a notification delivers your private Screening Room link for review.',
    visual:
      'Ana picks up her ceramic coffee mug as the wall display reaches 100% emerald completion. Her phone lights up with a private /s/ Screening Room notification; she smiles warmly to camera while the finished master plays behind her.',
  },
] as const

export function ProductionAgentSection() {
  const tShowcase = useTranslations('productionShowcase')
  const [showDetail, setShowDetail] = useState(false)
  const [showAnaScript, setShowAnaScript] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)

  const anaHeroScript = getHeroSectionScript('agent')

  const scrollToCheckout = () => {
    window.location.href = getSignupUrlForTier('explorer')
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
      id={PRODUCTION_AGENT_SECTION_ID}
      className="relative min-h-[64vh] scroll-mt-20 overflow-hidden bg-gray-950 text-white"
    >
      {/* Full-bleed Ana backdrop matching TwoModesSection, DirectControlSection, and PublishCutSection */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/landing/primary-value/production-agent.webp"
          alt="Ana in the SceneFlow virtual production suite as the Autonomous Production Agent builds 27 scenes in the background"
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
            Production Agent • Autonomous Studio Builder
          </p>
          <h2 className="mx-auto max-w-4xl text-balance text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Stop prompting 300+ shots by hand. Start the build and walk away.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-balance text-base text-gray-100 sm:text-lg">
            A typical 27-scene production (12–20 shots per scene) takes over 300 manual still and video prompts in traditional AI tools. Perfect your script in under an hour, select Pre-Vis, Clips, Scenes, Master, or Promo, and let the Production Agent build your scenes, self-heal failed shots, and notify you with a private /s/ Screening Room link when it is complete.
          </p>

          {/* Toggle to reveal detailed description cards & Ana video script */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetail((prev) => !prev)}
              aria-expanded={showDetail}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-cyan-200 backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-slate-900 hover:text-white sm:text-sm"
            >
              <Bot className="h-4 w-4 text-cyan-400" aria-hidden />
              <span>{showDetail ? 'Hide detail' : 'Show more detail'}</span>
              {showDetail ? (
                <ChevronUp className="h-4 w-4 text-cyan-300" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 text-cyan-300" aria-hidden />
              )}
            </button>
          </div>
        </motion.div>

        {/* Collapsible Detailed Description Cards + Ana Video Script */}
        {showDetail && (
          <motion.div
            className="mx-auto mt-8 w-full max-w-4xl rounded-2xl border border-white/15 bg-slate-950/75 p-5 backdrop-blur-md sm:p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-4 flex flex-col items-center gap-1.5 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                <Bot className="h-3.5 w-3.5" aria-hidden />
                Autonomous Scene-by-Scene Orchestration
              </span>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Under an hour on your script. Hours of manual prompting replaced by one autonomous run.
              </h3>
            </div>

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

            {/* Ana Video Script Drawer */}
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnaScript((prev) => !prev)}
                  aria-expanded={showAnaScript}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 transition hover:text-white sm:text-sm"
                >
                  <Film className="h-4 w-4 text-cyan-400" aria-hidden />
                  <span>
                    {showAnaScript
                      ? 'Hide Ana Video Script (30s Walkthrough)'
                      : 'View Ana Video Script (30s Walkthrough)'}
                  </span>
                  {showAnaScript ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>

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

              {showAnaScript && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

export default ProductionAgentSection
