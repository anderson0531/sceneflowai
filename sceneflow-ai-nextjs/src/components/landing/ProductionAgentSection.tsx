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
    badge: 'Fast Sign-Off',
    stages: ['Pre-Vis', 'Master'],
    directorTime: '35 min on Script',
    agentTime: '~25 min Autonomous',
    hoursSaved: 'Saves ~6.5 hrs',
    promptsEliminated: '180+ manual prompts eliminated',
    summary:
      'Builds Shot Direction, Continuity Vault references, Dialogue/SFX/Music audio, and Keyframe Stills across all 27 scenes, then sends your Screening Room link.',
  },
  master: {
    label: 'Full Master Film (27 Scenes)',
    badge: 'Most Popular',
    stages: ['Pre-Vis', 'Clips', 'Scenes', 'Master'],
    directorTime: '45 min on Script',
    agentTime: '~2–3 hrs Autonomous',
    hoursSaved: 'Saves ~18.5 hrs',
    promptsEliminated: '384+ manual prompts eliminated',
    summary:
      'Builds Pre-Vis, renders 384 motion clips (auto-optimizing direction and switching to Creative Clips on policy blocks), mixes Scene MP4s, and assembles the Master.',
  },
  premiere: {
    label: 'Complete Premiere + Promo',
    badge: 'All 5 Stages',
    stages: ['Pre-Vis', 'Clips', 'Scenes', 'Master', 'Promo'],
    directorTime: '50 min on Script',
    agentTime: '~2.5–3.5 hrs Autonomous',
    hoursSaved: 'Saves ~22+ hrs',
    promptsEliminated: '420+ manual prompts eliminated',
    summary:
      'Produces the entire 27-scene Master film plus an autonomous Theatrical Promo Trailer with voiceover narration, custom score, and a private /s/ Screening link.',
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
    detail: '384 Motion Clips + Creative Fallback',
    icon: Film,
  },
  {
    id: 'Scenes',
    step: '3',
    title: 'Scenes',
    detail: '27 Multitrack Scene MP4 Mixers',
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

const HERO_FEATURES_AND_BENEFITS = [
  {
    icon: Clock,
    badge: 'Eliminate 300+ Manual Prompts',
    title: '< 1 Hour on Script → Walk Away Free',
    benefit:
      'Skip typing 300+ individual still and video prompts across 27 scenes. Perfect your script in under an hour and reclaim your day for business or personal work.',
    accent: 'border-cyan-500/35 from-cyan-950/35 text-cyan-300',
  },
  {
    icon: Layers,
    badge: 'All 27 Scenes or By Chapter',
    title: '5 End-to-End Production Stages',
    benefit:
      'Choose Pre-Vis, Clips, Scenes, Master, and Promo in one dialog. The Agent automatically builds references, voice/SFX audio, keyframes, motion clips, and trailers.',
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
  const [activePreset, setActivePreset] = useState<DemoPresetId>('master')
  const [checkpointMode, setCheckpointMode] =
    useState<DemoCheckpointId>('previs_checkpoint')
  const [notifyMode, setNotifyMode] = useState<DemoNotifyId>('checkpoints')
  const [scopeMode, setScopeMode] = useState<'all' | 'chapter'>('all')

  const current = DEMO_PRESETS[activePreset]

  return (
    <section
      id="production-agent"
      className="relative py-20 md:py-24 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 border-t border-cyan-500/20 overflow-hidden scroll-mt-20"
    >
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 left-1/4 w-[520px] h-[520px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-[520px] h-[520px] bg-purple-500/10 rounded-full blur-3xl" />
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
            <strong className="text-white font-semibold">Production Agent</strong>, you spend under an hour perfecting your script, start the build, and get notified with a private{' '}
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

        {/* Two Illustrative Visual Cards: Builder Configuration (Left) + Autonomous Pipeline & Master Output (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Illustrative Image / Card 1: Production Agent • Studio Builder (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 text-white">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Production Agent • Studio Builder
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Select scope, stages, checkpoints &amp; alerts
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {current.hoursSaved}
              </span>
            </div>

            {/* Scope Toggle: All 27 Scenes vs Chapter */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                1. Select Scene or Chapter Scope
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScopeMode('all')}
                  title="Build all 27 scenes across the entire screenplay (384 total shots)"
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all',
                    scopeMode === 'all'
                      ? 'border-cyan-400 bg-cyan-500/15 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <div>🎬 All 27 Scenes</div>
                  <div className="text-[10px] text-cyan-300/80 font-normal mt-0.5">
                    384 Shots (12–20 / scene)
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
                    Chapter 1: Scenes 1–7 (98 Shots)
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

          {/* Illustrative Image / Card 2: Autonomous Execution Pipeline & Screening Room Output (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Autonomous Execution Pipeline (
                    {scopeMode === 'all'
                      ? 'All 27 Scenes • 384 Shots'
                      : 'Chapter 1: Scenes 1–7 • 98 Shots'}
                    )
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
                      {scopeMode === 'all' ? '27/27 Scenes Ready' : '7/7 Chapter Scenes Ready'}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent px-3 py-2 flex items-center justify-between text-[10px]">
                    <span className="text-slate-200 font-medium">
                      ✨ 42 Shots Optimized · 🛡 6 Creative Clips Rescued
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
                    All {scopeMode === 'all' ? '27 scenes (384 shots)' : '7 chapter scenes (98 shots)'} finished while you were away. Open your Screening Room link to review:
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
    </section>
  )
}

export default ProductionAgentSection
