'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Bot,
  Clock,
  Sparkles,
  ShieldCheck,
  Bell,
  Film,
  Layers,
  Share2,
  Clapperboard,
  CheckCircle2,
  PauseCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sliders,
  XCircle,
  Zap,
  Maximize2,
  X,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DemoPresetId = 'previs' | 'master' | 'premiere'
type DemoCheckpointId = 'autonomous' | 'previs_checkpoint' | 'scene_checkpoint'
type DemoNotifyId = 'checkpoints' | 'milestones' | 'every_scene'

const DEMO_PRESETS: Record<
  DemoPresetId,
  {
    label: string
    badge: string
    stages: string[]
    directorTime: string
    agentTime: string
    hoursSaved: string
    promptsEliminated: string
    summary: string
  }
> = {
  previs: {
    label: 'Pre-Vis Animatic Walk-Away',
    badge: 'Fast Story Sign-Off',
    stages: ['Pre-Vis', 'Master'],
    directorTime: '35 min on Script',
    agentTime: '~18 min Autonomous',
    hoursSaved: 'Saves ~4.5 hrs',
    promptsEliminated: '120+ manual prompts eliminated',
    summary:
      'Builds Shot Direction, Continuity Vault references, multi-character Dialogue/SFX/Music audio, and Keyframe Stills across all scenes, then sends you a Screening Room link.',
  },
  master: {
    label: 'Full Master Film',
    badge: 'Most Popular',
    stages: ['Pre-Vis', 'Clips', 'Scenes', 'Master'],
    directorTime: '45 min on Script',
    agentTime: '~1.5–2.5 hrs Autonomous',
    hoursSaved: 'Saves ~14 hrs',
    promptsEliminated: '300+ manual prompts eliminated',
    summary:
      'Walks through Pre-Vis, derives segments, renders motion video clips (auto-optimizing direction and switching to Creative Clips on policy blocks), mixes Scene MP4s, and assembles the Final Cut Master.',
  },
  premiere: {
    label: 'Complete Premiere + Promo',
    badge: 'All 5 Stages',
    stages: ['Pre-Vis', 'Clips', 'Scenes', 'Master', 'Promo'],
    directorTime: '50 min on Script',
    agentTime: '~2–3 hrs Autonomous',
    hoursSaved: 'Saves ~18+ hrs',
    promptsEliminated: '350+ manual prompts eliminated',
    summary:
      'Produces the entire Master film plus an autonomous Theatrical Promo Trailer with voiceover narration, custom score, and a private /s/ Screening Room link.',
  },
}

const STAGE_PILLS = [
  {
    id: 'Pre-Vis',
    step: '1',
    title: 'Pre-Vis',
    detail: 'References, Audio & Keyframe Stills',
    icon: Sparkles,
  },
  {
    id: 'Clips',
    step: '2',
    title: 'Clips',
    detail: 'Motion Video + Creative Policy Fallback',
    icon: Film,
  },
  {
    id: 'Scenes',
    step: '3',
    title: 'Scenes',
    detail: 'Multitrack Scene MP4 Mixers',
    icon: Layers,
  },
  {
    id: 'Master',
    step: '4',
    title: 'Master',
    detail: 'Final Cut + /s/ Screening Link',
    icon: Share2,
  },
  {
    id: 'Promo',
    step: '5',
    title: 'Promo',
    detail: 'Autonomous Theatrical Trailer',
    icon: Clapperboard,
  },
]

const TRADITIONAL_VS_AGENT = [
  {
    metric: 'Prompting Workload',
    traditional: '300+ manual prompts typed & tuned one by one for every still, voice line, and video clip',
    agent: '0 manual shot prompts — 1 launch orchestrates References, Audio, Stills, Clips, Master & Promo',
  },
  {
    metric: 'Chair Time & Babysitting',
    traditional: '14–25+ hours chained to your desk waiting on spinners and re-rolling broken frames',
    agent: '< 1 hour perfecting your script — walk away to run your business or personal life while it builds',
  },
  {
    metric: 'Failed Renders & Policy Blocks',
    traditional: 'Production grinds to a halt whenever a dramatic shot hits a safety filter; manual rewrites required',
    agent: 'Self-healing 3-step ladder: auto-optimizes shot direction, reruns failed shots, and switches persistent policy blocks to Creative Clips',
  },
  {
    metric: 'Review & Delivery',
    traditional: 'Downloading dozens of loose MP4 files and manually stitching audio in an external NLE',
    agent: 'Instant notification with a private /s/ Screening Room link for mobile or desktop review',
  },
]

const BUILDER_SCREENSHOT_CALLOUTS = [
  {
    num: '1',
    title: 'Walk-Away Presets & 5 Deliverable Stages',
    desc: 'Select Pre-Vis, Clips, Scenes, Master, and Promo individually or launch Full Master Film with 1 click.',
  },
  {
    num: '2',
    title: 'All Scenes, Chapter/Act, or Custom Scope',
    desc: 'Build your entire screenplay at once, produce a single Act/Chapter, or target specific scenes.',
  },
  {
    num: '3',
    title: 'Self-Healing Direction & Creative Clips Guardrails',
    desc: 'Auto-optimizes shot direction, reruns failed shots, and escalates persistent policy blocks to Creative Clips.',
  },
  {
    num: '4',
    title: 'Director Checkpoints',
    desc: 'Run 100% hands-free or pause automatically after Pre-Vis or each scene for Director sign-off.',
  },
  {
    num: '5',
    title: 'Walk-Away Notifications & Screening Link',
    desc: 'Choose your alert cadence and receive a direct /s/ Screening Room link when your build finishes.',
  },
]

export function ProductionAgentSection() {
  const [activePreset, setActivePreset] = useState<DemoPresetId>('master')
  const [checkpointMode, setCheckpointMode] =
    useState<DemoCheckpointId>('previs_checkpoint')
  const [notifyMode, setNotifyMode] = useState<DemoNotifyId>('checkpoints')
  const [scopeMode, setScopeMode] = useState<'all' | 'chapter'>('all')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const current = DEMO_PRESETS[activePreset]

  return (
    <section
      id="production-agent"
      className="relative py-20 md:py-28 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 border-t border-cyan-500/20 overflow-hidden scroll-mt-20"
    >
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 left-1/4 w-[560px] h-[560px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/5 w-[520px] h-[520px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-[480px] h-[480px] bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Header: Market Differentiator & Anti-300-Prompts Pitch */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-emerald-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-bold uppercase tracking-wider mb-5 shadow-lg shadow-cyan-950/50">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Production Agent • Autonomous Studio Builder</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
              Major Market Differentiator
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5">
            Stop Babysitting <span className="line-through decoration-rose-500/80 text-slate-400">300+ Manual Prompts</span>.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Launch the Production Agent &amp; Walk Away.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-3xl mx-auto">
            Traditional AI filmmaking is unsustainable: generating one manual prompt at a time for every character reference, keyframe still, audio line, and motion clip requires{' '}
            <strong className="text-white font-semibold">over 300 manual prompts</strong> and days of tedious chair time for a single production. With SceneFlow’s{' '}
            <strong className="text-cyan-300 font-semibold">Production Agent • Autonomous Studio Builder</strong>, you spend under an hour perfecting your script, start the autonomous build, and get notified with a private{' '}
            <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded text-sm">/s/</code>{' '}
            Screening Room link when it’s complete—free to focus on your business, clients, or personal life.
          </p>
        </div>

        {/* Stat Strip: Why 300+ Manual Prompts Is Obsolete */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 via-slate-900/90 to-slate-950 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                The Old AI Grind
              </span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              300+ Prompts
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Manually prompting every still, voice clip, and motion take one by one is slow, error-prone, and exhausting.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-950/35 via-slate-900/90 to-slate-950 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                Your Active Time
              </span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              &lt; 1 Hour on Script
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Invest your creative energy where it matters—locking your story, dialogue, and 80+ Audience Resonance score.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/35 bg-gradient-to-br from-purple-950/35 via-slate-900/90 to-slate-950 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                Self-Healing Pipeline
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              0 Stalled Shots
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Auto-optimizes shot direction, reruns failed takes, and escalates persistent policy blocks to Creative Clips.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/35 via-slate-900/90 to-slate-950 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Reclaim Your Day
              </span>
              <Briefcase className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              Walk Away Free
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Work on other business or personal priorities while the Agent builds and sends your Screening Room link.
            </p>
          </div>
        </div>

        {/* Hero Product Spotlight: Actual "Production Agent • Autonomous Studio Builder" Screenshot + Callouts */}
        <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 p-6 sm:p-8 lg:p-10 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Inside the Virtual Production Soundstage</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Meet the <span className="text-cyan-300">Production Agent • Autonomous Studio Builder</span>
              </h3>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl">
                Configure your entire multi-scene or chapter build in 15 seconds: pick your stages, enable self-healing Creative Clips policy fallback, set Director Checkpoints, choose your notification frequency, and walk away.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                title="Enlarge Production Agent • Autonomous Studio Builder screenshot"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Inspect Full Studio UI</span>
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg transition-all"
              >
                <span>Try Production Agent</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left/Center: Real Production Agent • Autonomous Studio Builder Screenshot (7 cols) */}
            <div className="lg:col-span-7">
              <div
                onClick={() => setLightboxOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setLightboxOpen(true)
                }}
                className="group relative rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-slate-950 shadow-[0_0_50px_-12px_rgba(34,211,238,0.3)] cursor-zoom-in"
              >
                <img
                  src="/images/landing/production-agent-builder.png"
                  alt="Production Agent • Autonomous Studio Builder dialog inside SceneFlow Studio showing Walk-Away Presets, 5 Deliverable Stages, Creative Clips Policy Guardrails, Director Checkpoints, and Notification Frequency"
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Production Agent • Autonomous Studio Builder (Live Studio View)
                  </span>
                  <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold">
                    <Maximize2 className="w-3.5 h-3.5" />
                    Click to enlarge
                  </span>
                </div>
              </div>
            </div>

            {/* Right: 5 Numbered Architectural Callouts Matching the Dialog (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                5-Step Walk-Away Command Center
              </div>
              {BUILDER_SCREENSHOT_CALLOUTS.map((item) => (
                <div
                  key={item.num}
                  className="rounded-xl border border-slate-800 bg-slate-950/85 p-3.5 flex items-start gap-3 hover:border-cyan-500/40 transition-colors"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-[11px] font-extrabold text-white shadow">
                    {item.num}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      {item.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Table: Unsustainable Traditional AI Method vs. Production Agent */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
          <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Why Manual Prompt-by-Prompt AI Production Is Obsolete
              </h3>
              <p className="text-xs text-slate-400">
                A typical 8–12 scene short film requires 60+ keyframes, 80+ voice/SFX tracks, and 60+ video takes—over 300 manual prompts &amp; retries in legacy tools.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              14–18+ Hours Saved Per Project
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {TRADITIONAL_VS_AGENT.map((row) => (
              <div
                key={row.metric}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 sm:px-6 items-center"
              >
                <div className="md:col-span-3 text-xs sm:text-sm font-bold text-white">
                  {row.metric}
                </div>
                <div className="md:col-span-4 rounded-xl border border-rose-500/20 bg-rose-950/15 px-3.5 py-2.5 text-xs text-slate-300 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{row.traditional}</span>
                </div>
                <div className="md:col-span-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2.5 text-xs text-emerald-100 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{row.agent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Production Builder Simulator + Live Output Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Production Builder Controls (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 text-white">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Interactive Walk-Away Simulator
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Test presets, checkpoints &amp; notifications
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {current.hoursSaved}
              </span>
            </div>

            {/* Scope Toggle: All Scenes vs Chapter */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                1. Select Scene or Chapter Scope
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScopeMode('all')}
                  title="Build all scenes across the entire screenplay"
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all',
                    scopeMode === 'all'
                      ? 'border-cyan-400 bg-cyan-500/15 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <div>🎬 All Project Scenes</div>
                  <div className="text-[10px] text-cyan-300/80 font-normal mt-0.5">
                    Scenes 1–8 (Full Film)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('chapter')}
                  title="Build a single Act or Chapter at a time"
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all',
                    scopeMode === 'chapter'
                      ? 'border-cyan-400 bg-cyan-500/15 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <div>📑 Chapter / Act Build</div>
                  <div className="text-[10px] text-cyan-300/80 font-normal mt-0.5">
                    Chapter 1: Scenes 1–4
                  </div>
                </button>
              </div>
            </div>

            {/* Deliverable Presets */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                2. Select Deliverables (Pre-Vis · Clips · Scenes · Master · Promo)
              </p>
              <div className="space-y-2">
                {(Object.keys(DEMO_PRESETS) as DemoPresetId[]).map((id) => {
                  const preset = DEMO_PRESETS[id]
                  const isSelected = activePreset === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActivePreset(id)}
                      title={`${preset.label}: ${preset.summary}`}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition-all',
                        isSelected
                          ? 'border-cyan-400 bg-gradient-to-r from-cyan-500/15 via-slate-900 to-purple-500/15 shadow-md'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {preset.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-semibold">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {preset.summary}
                      </p>
                      <div className="mt-1.5 text-[10px] font-semibold text-emerald-300">
                        ⚡ {preset.promptsEliminated}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Checkpoint & Notification Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  3. Director Checkpoints
                </p>
                <div className="space-y-1.5">
                  {(
                    [
                      ['previs_checkpoint', 'Pause After Pre-Vis'],
                      ['scene_checkpoint', 'Scene-by-Scene Sign-Off'],
                      ['autonomous', 'Full Walk-Away Autonomy'],
                    ] as Array<[DemoCheckpointId, string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCheckpointMode(id)}
                      title={`Director Checkpoint Mode: ${label}`}
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all flex items-center justify-between',
                        checkpointMode === id
                          ? 'border-purple-400 bg-purple-500/20 text-purple-100'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <span>{label}</span>
                      {checkpointMode === id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  4. Notification Frequency
                </p>
                <div className="space-y-1.5">
                  {(
                    [
                      ['checkpoints', 'Checkpoints & Final Link'],
                      ['milestones', 'Each Stage Milestone'],
                      ['every_scene', 'Every Scene Completed'],
                    ] as Array<[DemoNotifyId, string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setNotifyMode(id)}
                      title={`Notification Frequency: ${label}`}
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all flex items-center justify-between',
                        notifyMode === id
                          ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <span>{label}</span>
                      {notifyMode === id && (
                        <Bell className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA inside Builder Card */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">
                  Active Prep: <span className="text-cyan-300">{current.directorTime}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Background Agent: {current.agentTime}
                </div>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg transition-all"
              >
                <span>Launch Production Agent</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Live Autonomous Pipeline & Self-Healing Visualizer (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Autonomous Execution Pipeline ({scopeMode === 'all' ? 'All 8 Scenes' : 'Chapter 1: Scenes 1–4'})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  {checkpointMode === 'previs_checkpoint'
                    ? '⏸ Checkpoint: After Pre-Vis'
                    : checkpointMode === 'scene_checkpoint'
                      ? '⏸ Checkpoint: Every Scene'
                      : '⚡ Full Walk-Away Mode'}
                </span>
              </div>

              {/* 5 Stage Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {STAGE_PILLS.map((stage) => {
                  const Icon = stage.icon
                  const enabled = current.stages.includes(stage.id)
                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        'rounded-xl border p-2.5 transition-all',
                        enabled
                          ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                          : 'border-slate-800/80 bg-slate-950/40 text-slate-500 opacity-60'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold flex items-center gap-1">
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                          {stage.step}. {stage.title}
                        </span>
                        {enabled && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug">
                        {stage.detail}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Self-Healing Shot Direction + Creative Clips Escalation Spotlight */}
              <div className="rounded-xl border border-purple-500/35 bg-gradient-to-br from-slate-950 via-purple-950/25 to-slate-950 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                      Intelligent Self-Healing Policy Ladder
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
                    Zero Manual Intervention
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5">
                    <div className="text-[10px] font-bold text-cyan-300 uppercase">
                      Step 1 • Optimize Direction
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      Builds Continuity Vault references, audio, and keyframes; refines camera framing &amp; action beats.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5">
                    <div className="text-[10px] font-bold text-amber-300 uppercase">
                      Step 2 • Safety Rewrite &amp; Rerun
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      If a dramatic shot fails or hits a policy filter, the Agent rewrites the shot direction for safety compliance and reruns.
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 p-2.5">
                    <div className="text-[10px] font-bold text-emerald-300 uppercase">
                      Step 3 • Creative Clips Escalation
                    </div>
                    <p className="text-[11px] text-emerald-100/90 mt-1 leading-snug">
                      If the intended shot still violates Google policies after optimization, it automatically switches to{' '}
                      <strong>Creative Clips</strong> (Frame-to-Video).
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Video Monitor + Mobile Notification Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Embedded Master Stream Monitor (7 cols) */}
                <div className="sm:col-span-7 relative aspect-[16/9] rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-lg">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster="/images/help/ancient-aliens-start.jpg"
                    className="w-full h-full object-cover"
                  >
                    <source
                      src="/images/help/ancient-aliens-preview.webm"
                      type="video/webm"
                    />
                    <source
                      src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Woman_searching_for_ancient_aliens_47af4566.mp4"
                      type="video/mp4"
                    />
                  </video>
                  <div className="absolute inset-x-0 top-0 bg-slate-950/85 px-2.5 py-1 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      AUTONOMOUS MASTER BUILD • 24 FPS
                    </span>
                    <span className="text-emerald-300 font-semibold">
                      8/8 Scenes Ready
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent px-3 py-2 flex items-center justify-between text-[10px]">
                    <span className="text-slate-200 font-medium">
                      ✨ 14 Shots Optimized · 🛡 2 Creative Clips Rescued
                    </span>
                  </div>
                </div>

                {/* Walk-Away Notification + Screening Room Link Card (5 cols) */}
                <div className="sm:col-span-5 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 to-emerald-950/30 p-3.5 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      <Bell className="w-3.5 h-3.5" />
                      Walk-Away Notification
                    </span>
                    <span className="text-[10px] text-slate-400">Just now</span>
                  </div>
                  <div className="text-xs font-bold text-white">
                    🎬 Master Production Complete
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    All {scopeMode === 'all' ? '8 scenes' : '4 chapter scenes'} finished while you were away. Open your Screening Room link to review:
                  </p>
                  <div className="rounded-lg bg-slate-950/90 border border-emerald-500/30 px-2.5 py-1.5 text-[11px] font-mono text-emerald-300 truncate">
                    sceneflowai.studio/s/master-cut-review
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      Alerts:{' '}
                      {notifyMode === 'checkpoints'
                        ? 'Checkpoints & Final'
                        : notifyMode === 'milestones'
                          ? 'Stage Milestones'
                          : 'Every Scene'}
                    </span>
                    <Link
                      href="/dashboard/help"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-200"
                    >
                      <span>Academy Guide</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Resolution Lightbox Modal for Production Agent • Autonomous Studio Builder */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-6xl w-full rounded-2xl border border-cyan-500/40 bg-slate-950 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Production Agent • Autonomous Studio Builder</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
            <div className="max-h-[82vh] overflow-auto p-2 bg-slate-950">
              <img
                src="/images/landing/production-agent-builder.png"
                alt="Production Agent • Autonomous Studio Builder full resolution view"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ProductionAgentSection
