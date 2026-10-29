'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Bot,
  Sparkles,
  Film,
  Layers,
  Clapperboard,
  Share2,
  Bell,
  ShieldCheck,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  Sliders,
  PauseCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FLAG_EMOJIS, getLanguageName } from '@/constants/languages'
import {
  estimateProductionAgentRun,
  groupScenesIntoChapters,
  normalizeProductionStages,
  summarizeProductionScenes,
  type ProductionBuilderOptions,
  type ProductionCheckpointMode,
  type ProductionNotificationFrequency,
  type ProductionSceneScopeMode,
  type ProductionStageId,
} from '@/lib/production/runProductionAgent'
import type { VideoGenerationQuality } from '@/lib/video/videoGenerationPolicy'

interface ProductionBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenes: any[]
  sceneProductionState?: Record<string, any>
  language?: string
  isRunning?: boolean
  onStartProduction: (options: ProductionBuilderOptions) => void
}

interface StageCardMeta {
  id: ProductionStageId
  step: number
  title: string
  subtitle: string
  badge: string
  icon: React.ComponentType<{ className?: string }>
  accentClass: string
}

const STAGE_CARDS: StageCardMeta[] = [
  {
    id: 'previs',
    step: 1,
    title: 'Pre-Vis',
    subtitle: 'Shot Direction, Continuity Plates, Scene Audio & Keyframe Stills',
    badge: 'Foundation',
    icon: Sparkles,
    accentClass: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200',
  },
  {
    id: 'clips',
    step: 2,
    title: 'Clips',
    subtitle: 'Motion Video Generation + Direction Optimization + Creative Fallback',
    badge: 'AI Motion',
    icon: Film,
    accentClass: 'border-purple-500/50 bg-purple-500/10 text-purple-200',
  },
  {
    id: 'scenes',
    step: 3,
    title: 'Scenes',
    subtitle: 'Per-Scene Multitrack MP4 Renders (Video + Dialogue + SFX + Score)',
    badge: 'Scene Mix',
    icon: Layers,
    accentClass: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-200',
  },
  {
    id: 'master',
    step: 4,
    title: 'Master',
    subtitle: 'Final Cut Master Assembly + Private /s/ Screening Room Link',
    badge: 'Screening Link',
    icon: Share2,
    accentClass: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
  },
  {
    id: 'promo',
    step: 5,
    title: 'Promo',
    subtitle: 'Autonomous Theatrical Trailer Cut, Voiceover Narration & Score',
    badge: 'Premiere Kit',
    icon: Clapperboard,
    accentClass: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
  },
]

const CHECKPOINT_OPTIONS: Array<{
  id: ProductionCheckpointMode
  label: string
  description: string
}> = [
  {
    id: 'autonomous',
    label: 'Full Walk-Away Autonomy',
    description:
      'Runs all selected stages end-to-end without pausing and sends your Screening Room link on completion.',
  },
  {
    id: 'previs_checkpoint',
    label: 'Pre-Vis Director Checkpoint (Recommended)',
    description:
      'Completes Pre-Vis (References, Audio & Stills), sends a Screening Room link, and waits for your 1-click approval before rendering video clips.',
  },
  {
    id: 'scene_checkpoint',
    label: 'Scene-by-Scene Checkpoint',
    description:
      'Pauses after each completed scene so you can inspect takes before the Agent advances to the next scene.',
  },
]

const NOTIFICATION_OPTIONS: Array<{
  id: ProductionNotificationFrequency
  label: string
  description: string
}> = [
  {
    id: 'checkpoints_and_completion',
    label: 'Checkpoints, Policy Escalations & Final Screening Link (Recommended)',
    description:
      'Alerts you when a checkpoint needs sign-off, when Creative Clips rescue a shot, and when your Screening Room link is ready.',
  },
  {
    id: 'phase_milestones',
    label: 'Stage Milestones (Pre-Vis → Clips → Scenes → Master → Promo)',
    description:
      'Sends a progress notification at the completion of each major production stage.',
  },
  {
    id: 'every_scene',
    label: 'Every Scene Completed',
    description:
      'Notifies you after each individual scene finishes building.',
  },
  {
    id: 'completion_only',
    label: 'Final Completion & Screening Link Only',
    description:
      'Silent background execution until the entire production run is ready to screen.',
  },
]

export function ProductionBuilderDialog({
  open,
  onOpenChange,
  scenes,
  sceneProductionState = {},
  language = 'en',
  isRunning = false,
  onStartProduction,
}: ProductionBuilderDialogProps) {
  const [scopeMode, setScopeMode] = useState<ProductionSceneScopeMode>('all')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('chapter-1')
  const [selectedSceneIndices, setSelectedSceneIndices] = useState<number[]>([])
  const [stages, setStages] = useState<ProductionStageId[]>([
    'previs',
    'clips',
    'scenes',
    'master',
  ])
  const [quality, setQuality] = useState<VideoGenerationQuality>('draft')
  const [missingOnly, setMissingOnly] = useState<boolean>(true)
  const [optimizeShotDirection, setOptimizeShotDirection] = useState<boolean>(true)
  const [autoRerunFailedShots, setAutoRerunFailedShots] = useState<boolean>(true)
  const [creativeClipPolicyFallback, setCreativeClipPolicyFallback] =
    useState<boolean>(true)
  const [checkpointMode, setCheckpointMode] =
    useState<ProductionCheckpointMode>('autonomous')
  const [notificationFrequency, setNotificationFrequency] =
    useState<ProductionNotificationFrequency>('checkpoints_and_completion')
  const [mintScreeningLink, setMintScreeningLink] = useState<boolean>(true)

  const chapters = useMemo(() => groupScenesIntoChapters(scenes), [scenes])

  const sceneSummaries = useMemo(
    () => summarizeProductionScenes(scenes, sceneProductionState, language),
    [scenes, sceneProductionState, language]
  )

  // Initialize scene selection when dialog opens or scope changes
  useEffect(() => {
    if (!open) return
    if (scopeMode === 'all') {
      setSelectedSceneIndices(scenes.map((_, i) => i))
    } else if (scopeMode === 'chapter') {
      const targetChapter =
        chapters.find((c) => c.id === selectedChapterId) || chapters[0]
      if (targetChapter) {
        setSelectedChapterId(targetChapter.id)
        setSelectedSceneIndices(targetChapter.sceneIndices)
      }
    }
  }, [open, scopeMode, selectedChapterId, scenes, chapters])

  const toggleStage = (stageId: ProductionStageId) => {
    setStages((prev) => {
      const exists = prev.includes(stageId)
      if (exists) {
        const next = prev.filter((s) => s !== stageId)
        return next.length > 0 ? normalizeProductionStages(next) : prev
      }
      return normalizeProductionStages([...prev, stageId])
    })
  }

  const applyPreset = (
    preset: 'previs_walkaway' | 'full_master' | 'complete_premiere'
  ) => {
    if (preset === 'previs_walkaway') {
      setStages(['previs', 'master'])
      setCheckpointMode('autonomous')
      setMintScreeningLink(true)
    } else if (preset === 'full_master') {
      setStages(['previs', 'clips', 'scenes', 'master'])
      setCheckpointMode('previs_checkpoint')
      setMintScreeningLink(true)
    } else {
      setStages(['previs', 'clips', 'scenes', 'master', 'promo'])
      setCheckpointMode('autonomous')
      setMintScreeningLink(true)
    }
  }

  const toggleCustomScene = (sceneIdx: number, checked: boolean) => {
    setScopeMode('custom')
    setSelectedSceneIndices((prev) => {
      if (checked) return prev.includes(sceneIdx) ? prev : [...prev, sceneIdx]
      return prev.filter((i) => i !== sceneIdx)
    })
  }

  const selectNeedsActionScenes = () => {
    setScopeMode('custom')
    const incomplete = sceneSummaries
      .filter(
        (s) =>
          !s.hasDirection ||
          !s.hasAudio ||
          s.missingStillsCount > 0 ||
          s.completedClipsCount < s.totalClipsCount ||
          s.policyBlockedClipsCount > 0
      )
      .map((s) => s.sceneIndex)
    setSelectedSceneIndices(
      incomplete.length > 0 ? incomplete : scenes.map((_, i) => i)
    )
  }

  const builderOptions: ProductionBuilderOptions = useMemo(
    () => ({
      scopeMode,
      chapterId: scopeMode === 'chapter' ? selectedChapterId : undefined,
      selectedSceneIndices,
      stages: normalizeProductionStages(stages),
      quality,
      language,
      missingOnly,
      optimizeShotDirection,
      autoRerunFailedShots,
      creativeClipPolicyFallback,
      checkpointMode,
      notificationFrequency,
      mintScreeningLink,
    }),
    [
      scopeMode,
      selectedChapterId,
      selectedSceneIndices,
      stages,
      quality,
      language,
      missingOnly,
      optimizeShotDirection,
      autoRerunFailedShots,
      creativeClipPolicyFallback,
      checkpointMode,
      notificationFrequency,
      mintScreeningLink,
    ]
  )

  const estimate = useMemo(
    () => estimateProductionAgentRun(sceneSummaries, builderOptions),
    [sceneSummaries, builderOptions]
  )

  const selectedSceneSet = useMemo(
    () => new Set(selectedSceneIndices),
    [selectedSceneIndices]
  )

  const totalPolicyBlockedInSelection = useMemo(
    () =>
      sceneSummaries
        .filter((s) => selectedSceneSet.has(s.sceneIndex))
        .reduce((sum, s) => sum + s.policyBlockedClipsCount, 0),
    [sceneSummaries, selectedSceneSet]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-950 border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader className="shrink-0 border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2.5 text-lg sm:text-xl font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 text-slate-950 shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </span>
              <span>Production Agent • Autonomous Studio Builder</span>
            </DialogTitle>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              <Clock className="w-3 h-3" />
              Est. Saves ~{estimate.estimatedDirectorHoursSaved} hrs of Manual Direction
            </span>
          </div>
          <DialogDescription className="text-slate-400 text-xs sm:text-sm mt-1">
            Spend under an hour perfecting your script, then let the Production Agent build your references, audio, stills, motion clips, master stream, and screening room link while you walk away.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-4 pr-1">
          {/* 1. One-Click Workflow Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Choose a Walk-Away Production Preset or Customize Stages
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>{FLAG_EMOJIS[language] ?? '🌐'}</span>
                <span>{getLanguageName(language)} Stream</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              <button
                type="button"
                disabled={isRunning}
                onClick={() => applyPreset('previs_walkaway')}
                title="Build Direction, Continuity References, Audio, Stills, and a Pre-Vis Screening Link"
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  stages.length === 2 &&
                    stages.includes('previs') &&
                    stages.includes('master')
                    ? 'border-cyan-400 bg-cyan-500/15 shadow-sm'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300">
                    ⚡ Pre-Vis Animatic
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-semibold">
                    Fast Sign-Off
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  References + Audio + Keyframe Stills + Screening Room Link
                </p>
              </button>

              <button
                type="button"
                disabled={isRunning}
                onClick={() => applyPreset('full_master')}
                title="Build Pre-Vis, pause for optional checkpoint, then render Clips, Scene MP4s, and Master Cut"
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  stages.length === 4 &&
                    stages.includes('previs') &&
                    stages.includes('clips') &&
                    stages.includes('scenes') &&
                    stages.includes('master')
                    ? 'border-purple-400 bg-purple-500/15 shadow-sm'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">
                    🎬 Full Master Film
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 font-semibold">
                    Most Popular
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Pre-Vis + Motion Clips + Scene Renders + Final Cut Master
                </p>
              </button>

              <button
                type="button"
                disabled={isRunning}
                onClick={() => applyPreset('complete_premiere')}
                title="Build everything including the Autonomous Promotional Trailer and /s/ Screening Link"
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  stages.length === 5
                    ? 'border-emerald-400 bg-emerald-500/15 shadow-sm'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">
                    🚀 Complete Premiere
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-semibold">
                    All 5 Stages
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                  Pre-Vis + Clips + Scenes + Master + Theatrical Promo Trailer
                </p>
              </button>
            </div>

            {/* 5 Selectable Stage Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {STAGE_CARDS.map((card) => {
                const Icon = card.icon
                const active = stages.includes(card.id)
                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={isRunning}
                    onClick={() => toggleStage(card.id)}
                    title={`${card.title}: ${card.subtitle}`}
                    className={cn(
                      'flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all',
                      active
                        ? card.accentClass
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {card.step}. {card.title}
                        </span>
                        <Checkbox
                          checked={active}
                          disabled={isRunning}
                          className="pointer-events-none h-3.5 w-3.5"
                        />
                      </div>
                      <p className="text-[10px] leading-snug opacity-85 line-clamp-3">
                        {card.subtitle}
                      </p>
                    </div>
                    <span className="mt-2 inline-block text-[9px] font-bold uppercase tracking-wider opacity-75">
                      {card.badge}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Scene Scope Selection (All Scenes / Chapter / Custom) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  2. Scene Scope ({selectedSceneIndices.length} of {scenes.length} Scenes Selected)
                </p>
                <p className="text-[11px] text-slate-400">
                  Build the entire project, a single Chapter/Act, or specific scenes.
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
                {(
                  [
                    ['all', `All Scenes (${scenes.length})`],
                    ['chapter', `By Chapter (${chapters.length})`],
                    ['custom', 'Custom Selection'],
                  ] as Array<[ProductionSceneScopeMode, string]>
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setScopeMode(mode)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold transition-colors',
                      scopeMode === mode
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {scopeMode === 'chapter' && chapters.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {chapters.map((chapter) => {
                  const isSelected = chapter.id === selectedChapterId
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      disabled={isRunning}
                      onClick={() => {
                        setSelectedChapterId(chapter.id)
                        setSelectedSceneIndices(chapter.sceneIndices)
                      }}
                      className={cn(
                        'rounded-lg border p-2.5 text-left transition-all',
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/15 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                      )}
                    >
                      <div className="text-xs font-bold">{chapter.label}</div>
                      <div className="text-[11px] text-cyan-300/90 mt-0.5">
                        {chapter.subtitle}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {scopeMode === 'custom' && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSceneIndices(scenes.map((_, i) => i))}
                      className="text-cyan-300 hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={selectNeedsActionScenes}
                      className="text-amber-300 hover:underline font-medium"
                    >
                      Select Incomplete / Needs Action
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSceneIndices([])}
                      className="text-slate-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {sceneSummaries.map((s) => {
                    const checked = selectedSceneSet.has(s.sceneIndex)
                    return (
                      <label
                        key={s.sceneId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 cursor-pointer hover:bg-slate-900"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggleCustomScene(s.sceneIndex, v === true)
                            }
                            disabled={isRunning}
                          />
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            Scene {s.sceneNumber}: {s.heading}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded',
                              s.hasAudio
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-slate-800 text-slate-400'
                            )}
                          >
                            Audio {s.hasAudio ? '✓' : '…'}
                          </span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded',
                              s.missingStillsCount === 0
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-amber-500/15 text-amber-300'
                            )}
                          >
                            Stills {s.totalStillsCount - s.missingStillsCount}/{s.totalStillsCount}
                          </span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded',
                              s.completedClipsCount >= s.totalClipsCount
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-purple-500/15 text-purple-300'
                            )}
                          >
                            Clips {s.completedClipsCount}/{s.totalClipsCount}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Autonomous Self-Healing & Policy Optimization Rules */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  3. Autonomous Intelligence & Content Policy Guardrails
                </span>
              </div>
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
                {(['draft', 'final'] as VideoGenerationQuality[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setQuality(tier)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold transition-colors',
                      quality === tier
                        ? 'bg-purple-500 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    {tier === 'draft' ? 'Draft (720p Fast)' : 'Final (1080p Master)'}
                  </button>
                ))}
              </div>
            </div>

            {totalPolicyBlockedInSelection > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {totalPolicyBlockedInSelection} shot{totalPolicyBlockedInSelection === 1 ? '' : 's'} in your selection previously hit a content policy block. The Production Agent will automatically optimize their shot direction and escalate to Creative Clips if needed.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 cursor-pointer hover:border-slate-700">
                <Checkbox
                  checked={optimizeShotDirection}
                  onCheckedChange={(v) => setOptimizeShotDirection(v === true)}
                  disabled={isRunning}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">
                    Optimize Shot Direction & Auto-Rerun Failed Shots
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Automatically rewrites thin or policy-flagged shot direction for cinematic framing and safety compliance before rerunning failed shots.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2.5 cursor-pointer hover:border-cyan-500/50">
                <Checkbox
                  checked={creativeClipPolicyFallback}
                  onCheckedChange={(v) => setCreativeClipPolicyFallback(v === true)}
                  disabled={isRunning}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <div className="font-semibold text-cyan-200">
                    Use Creative Clips on Persistent Policy Blocks
                  </div>
                  <p className="text-[11px] text-cyan-100/75 mt-0.5 leading-snug">
                    When an intended dramatic shot still violates Google content policies after shot direction optimization, automatically render it with Creative Clips (Frame-to-Video).
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 cursor-pointer hover:border-slate-700">
                <Checkbox
                  checked={missingOnly}
                  onCheckedChange={(v) => setMissingOnly(v === true)}
                  disabled={isRunning}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">
                    Only Build Missing or Policy-Blocked Assets
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Preserves approved takes, audio tracks, and keyframes that are already in the can.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 cursor-pointer hover:border-slate-700">
                <Checkbox
                  checked={mintScreeningLink}
                  onCheckedChange={(v) => setMintScreeningLink(v === true)}
                  disabled={isRunning}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">
                    Auto-Generate Screening Room (`/s/`) Review Link
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Includes a direct Screening Room link in your notifications so you can review on mobile or desktop.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 4. Director Control (Checkpoints) & Notification Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Director Checkpoints */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  4. Director Checkpoints
                </span>
              </div>
              <div className="space-y-2">
                {CHECKPOINT_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => !isRunning && setCheckpointMode(opt.id)}
                    className={cn(
                      'block rounded-lg border p-2.5 cursor-pointer transition-all',
                      checkpointMode === opt.id
                        ? 'border-purple-400 bg-purple-500/15'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        {opt.label}
                      </span>
                      <span
                        className={cn(
                          'w-3.5 h-3.5 rounded-full border flex items-center justify-center',
                          checkpointMode === opt.id
                            ? 'border-purple-400 bg-purple-400 text-slate-950'
                            : 'border-slate-600'
                        )}
                      >
                        {checkpointMode === opt.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {opt.description}
                    </p>
                  </label>
                ))}
              </div>
            </div>

            {/* Notification Frequency */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  5. Walk-Away Notification Frequency
                </span>
              </div>
              <div className="space-y-2">
                {NOTIFICATION_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => !isRunning && setNotificationFrequency(opt.id)}
                    className={cn(
                      'block rounded-lg border p-2.5 cursor-pointer transition-all',
                      notificationFrequency === opt.id
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        {opt.label}
                      </span>
                      <span
                        className={cn(
                          'w-3.5 h-3.5 rounded-full border flex items-center justify-center',
                          notificationFrequency === opt.id
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-slate-600'
                        )}
                      >
                        {notificationFrequency === opt.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {opt.description}
                    </p>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Bar: Credits + Productivity ROI */}
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-purple-950/30 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Coins className="w-4 h-4" />
                  <span>
                    Estimated Production Budget: ~{estimate.credits.total.toLocaleString()} Credits
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                  {stages.includes('previs') && (
                    <span>Pre-Vis: ~{estimate.credits.previs.toLocaleString()} cr</span>
                  )}
                  {stages.includes('clips') && (
                    <span>Clips ({estimate.clipsToGenerate}): ~{estimate.credits.clips.toLocaleString()} cr</span>
                  )}
                  {stages.includes('scenes') && (
                    <span>Scenes: ~{estimate.credits.scenes.toLocaleString()} cr</span>
                  )}
                  {stages.includes('master') && (
                    <span>Master: ~{estimate.credits.master.toLocaleString()} cr</span>
                  )}
                  {stages.includes('promo') && (
                    <span>Promo: ~{estimate.credits.promo.toLocaleString()} cr</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-emerald-300">
                  Autonomous Runtime: ~{estimate.estimatedAutonomousMinutes} min
                </div>
                <div className="text-[11px] text-slate-400">
                  You can walk away — notifications & Screening Link will be sent automatically
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {selectedSceneIndices.length} scene{selectedSceneIndices.length === 1 ? '' : 's'} ·{' '}
              {stages.length} stage{stages.length === 1 ? '' : 's'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRunning}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isRunning || selectedSceneIndices.length === 0 || stages.length === 0}
              onClick={() => onStartProduction(builderOptions)}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold shadow-lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Production Agent Running…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Launch Production Agent →
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ProductionBuilderDialog
