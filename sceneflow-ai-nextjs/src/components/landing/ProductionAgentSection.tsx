'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
    summary:
      'Builds Shot Direction, Continuity Vault references, multi-character Dialogue/SFX/Music audio, and Keyframe Stills across all scenes, then sends you a Screening Room link.',
  },
  master: {
    label: 'Full Master Production',
    badge: 'Most Popular',
    stages: ['Pre-Vis', 'Clips', 'Scenes', 'Master'],
    directorTime: '45 min on Script',
    agentTime: '~1.5–2.5 hrs Autonomous',
    hoursSaved: 'Saves ~14 hrs',
    summary:
      'Walks through Pre-Vis, derives segments, renders motion video clips (auto-optimizing direction and switching to Creative Clips on policy blocks), mixes Scene MP4s, and assembles the Final Cut Master.',
  },
  premiere: {
    label: 'Complete Premiere + Promo Package',
    badge: 'All 5 Stages',
    stages: ['Pre-Vis', 'Clips', 'Scenes', 'Master', 'Promo'],
    directorTime: '50 min on Script',
    agentTime: '~2–3 hrs Autonomous',
    hoursSaved: 'Saves ~18+ hrs',
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

export function ProductionAgentSection() {
  const [activePreset, setActivePreset] = useState<DemoPresetId>('master')
  const [checkpointMode, setCheckpointMode] =
    useState<DemoCheckpointId>('previs_checkpoint')
  const [notifyMode, setNotifyMode] = useState<DemoNotifyId>('checkpoints')
  const [scopeMode, setScopeMode] = useState<'all' | 'chapter'>('all')

  const current = DEMO_PRESETS[activePreset]

  return (
    <section
      id="production-agent"
      className="relative py-20 md:py-28 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 border-t border-slate-800/80 overflow-hidden"
    >
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-12 left-1/4 w-[520px] h-[520px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-12 right-1/4 w-[520px] h-[520px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Time is Money Value Proposition */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Bot className="w-3.5 h-3.5" />
            <span>Autonomous Production Agent • Walk-Away Studio Builder</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Spend Under 1 Hour on the Script.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Let the Production Agent Build the Film.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Time is money. Instead of babysitting hundreds of individual prompts, initiate the{' '}
            <strong className="text-white font-semibold">Production Builder</strong> for all scenes or a single chapter, walk away, and receive notifications with a private{' '}
            <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded text-sm">/s/</code>{' '}
            Screening Room link when your Pre-Vis, Master Cut, and Promo Trailer are ready for review.
          </p>
        </div>

        {/* 3 Core Pillars: Walk-Away Productivity, Self-Healing Policy Ladder, Director Checkpoints */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                10x Director Leverage
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              &lt; 1 Hour Active Prep → Multi-Hour Autonomous Build
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Perfect your story beats and Audience Resonance score in under an hour, then hand off the multi-hour rendering pipeline to the Production Agent while you reclaim your day.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Zero Stalled Renders
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Self-Healing Direction &amp; Creative Clips Fallback
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              The Agent automatically optimizes shot direction and reruns failed takes. If an intended dramatic shot still triggers content-policy blocks after optimization, it seamlessly switches that shot to{' '}
              <strong className="text-cyan-200 font-semibold">Creative Clips</strong> so your production never stalls.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-slate-900/75 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <PauseCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Director Control
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Pre-Vis &amp; Scene-by-Scene Checkpoints
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Keep full creative authority. Pause automatically after Pre-Vis or after each scene, review your Screening Room link on your phone, and approve the next stage with 1 click.
            </p>
          </div>
        </div>

        {/* Interactive Production Builder Showcase */}
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
                    Production Builder Configuration
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Click to preview walk-away modes &amp; checkpoints
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
            {/* Pipeline Stage Stepper */}
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
                    Automatic Recovery
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
                    🎬 The Europa Frequency • Master Ready
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    All {scopeMode === 'all' ? '8 scenes' : '4 chapter scenes'} finished building. Review your Master stream and timestamped notes in the Screening Room:
                  </p>
                  <div className="rounded-lg bg-slate-950/90 border border-emerald-500/30 px-2.5 py-1.5 text-[11px] font-mono text-emerald-300 truncate">
                    sceneflowai.studio/s/europa-freq-master
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      Frequency:{' '}
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
                      <span>Learn More</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProductionAgentSection
