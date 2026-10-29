'use client'

import React from 'react'
import Link from 'next/link'
import {
  Bot,
  Clock,
  ShieldCheck,
  Layers,
  PauseCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const HERO_FEATURES_AND_BENEFITS = [
  {
    icon: Clock,
    badge: 'Eliminate 300+ Manual Prompts',
    title: '< 1 Hour on Script → Walk Away Free',
    benefit:
      'Skip typing 300+ individual still and video prompts across 27 scenes (12–20 shots per scene). Perfect your script in under an hour and reclaim your day for business or personal work.',
    accent: 'border-cyan-500/35 from-cyan-950/35 text-cyan-300',
  },
  {
    icon: Layers,
    badge: 'All 27 Scenes or By Chapter',
    title: '5 End-to-End Production Stages',
    benefit:
      'Select Pre-Vis, Clips, Scenes, Master, and Promo in one builder. The Agent autonomously builds continuity references, voice/SFX audio, keyframes, motion clips, and trailers.',
    accent: 'border-indigo-500/35 from-indigo-950/35 text-indigo-300',
  },
  {
    icon: ShieldCheck,
    badge: 'Zero Stalled Renders',
    title: 'Self-Healing + Creative Clips Fallback',
    benefit:
      'Automatically optimizes shot direction and reruns failed shots. When an intended dramatic shot still hits Google policy filters, it switches to Creative Clips automatically.',
    accent: 'border-purple-500/35 from-purple-950/35 text-purple-300',
  },
  {
    icon: PauseCircle,
    badge: 'Full Director Control',
    title: 'Checkpoints & /s/ Screening Links',
    benefit:
      'Run 100% hands-free or pause after Pre-Vis or each scene. Receive notifications at your chosen frequency with a direct /s/ Screening Room link for review.',
    accent: 'border-emerald-500/35 from-emerald-950/35 text-emerald-300',
  },
]

export function ProductionAgentSection() {
  const scrollToKeyFeatures = () => {
    const el = document.getElementById('production-stage') || document.getElementById('key-features')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section
      id="production-agent"
      className="relative py-16 md:py-20 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 border-t border-cyan-500/20 overflow-hidden scroll-mt-20"
    >
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-6 left-1/4 w-[480px] h-[480px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-6 right-1/4 w-[480px] h-[480px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Hero-Summarized Header */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-emerald-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-bold uppercase tracking-wider mb-4 shadow-lg">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Production Agent • Autonomous Studio Builder</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Stop Prompting <span className="line-through decoration-rose-500/80 text-slate-400">300+ Shots</span> by Hand.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Launch the Production Agent &amp; Walk Away.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-3xl mx-auto">
            A typical 27-scene production (12–20 shots per scene) takes over 300 manual still and video prompts in traditional AI tools. With SceneFlow’s{' '}
            <strong className="text-white font-semibold">Production Agent</strong>, you spend under an hour perfecting your script, start the autonomous build, and get notified with a private{' '}
            <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded text-sm">/s/</code>{' '}
            Screening Room link when it’s complete—free to focus on your business or personal priorities.
          </p>
        </div>

        {/* 4 Hero Feature & Benefit Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HERO_FEATURES_AND_BENEFITS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className={cn(
                  'rounded-2xl border bg-gradient-to-br via-slate-900/90 to-slate-950 p-5 shadow-lg',
                  item.accent
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-950/70 border border-white/10">
                    {item.badge}
                  </span>
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <h3 className="text-base font-extrabold text-white mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.benefit}
                </p>
              </div>
            )
          })}
        </div>

        {/* Hero Summary CTA Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg transition-all"
          >
            <span>Launch Production Agent</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={scrollToKeyFeatures}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-cyan-200 hover:text-white transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Explore in Production Stage → Generate &amp; Audit</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default ProductionAgentSection
