'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Clapperboard,
  Download,
  ExternalLink,
  Film,
  Globe,
  Image as ImageIcon,
  Loader2,
  Mic,
  Music,
  Sparkles,
  Volume2,
  X,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import type {
  ProductionStream,
  SceneProductionData,
} from '@/components/vision/scene-production/types'
import { FLAG_EMOJIS, getLanguageName } from '@/constants/languages'
import type { AnimaticAudioMode } from '@/lib/storyboard/animaticAudioMode'
import {
  buildMultiScenePreVisRenderPlan,
  collectPreVisLanguages,
  collectScenePreVisAudioUrls,
  getPreVisSceneSummary,
  probePreVisAudioDurations,
  renderPreVisSceneToBlobAndStream,
  type PreVisSceneSummary,
} from '@/lib/storyboard/preVisSceneRender'
import { cn } from '@/lib/utils'
import { localRenderService } from '@/lib/video/LocalRenderService'

export interface PreVisRenderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenes: Array<Record<string, unknown>>
  projectId?: string
  projectTitle?: string
  initialLanguage?: string
  initialSceneIndices?: number[]
  currentSceneIndex?: number
  availableLanguages?: string[]
  sceneProductionState?: Record<string, SceneProductionData>
  masterVolume?: number
  audioMode?: AnimaticAudioMode
  clipAudioByBeatId?: Record<string, string>
  onSceneStreamRendered?: (
    sceneId: string,
    stream: ProductionStream,
    language: string
  ) => void
}

interface SceneRenderItemState {
  status: 'idle' | 'probing' | 'rendering' | 'uploading' | 'complete' | 'error'
  progress: number
  message?: string
  downloadUrl?: string
  cloudUrl?: string
  mimeType?: string
  error?: string
}

function formatDurationShort(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const totalSec = Math.max(1, Math.round(seconds))
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PreVisRenderDialog({
  open,
  onOpenChange,
  scenes,
  projectId,
  projectTitle,
  initialLanguage = 'en',
  initialSceneIndices,
  currentSceneIndex,
  availableLanguages,
  sceneProductionState,
  masterVolume = 0.8,
  audioMode = 'lofi',
  clipAudioByBeatId,
  onSceneStreamRendered,
}: PreVisRenderDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage || 'en')
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4K'>('1080p')
  const [includeCaptions, setIncludeCaptions] = useState<boolean>(true)
  const [saveToStreams, setSaveToStreams] = useState<boolean>(Boolean(projectId))
  const [combineSelectedScenes, setCombineSelectedScenes] = useState<boolean>(false)
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false)
  const [sceneStates, setSceneStates] = useState<Record<number, SceneRenderItemState>>({})
  const [combinedState, setCombinedState] = useState<{
    status: 'idle' | 'rendering' | 'complete' | 'error'
    progress: number
    message?: string
    downloadUrl?: string
    mimeType?: string
    error?: string
  }>({ status: 'idle', progress: 0 })

  const cancelledRef = useRef<boolean>(false)
  const createdBlobUrlsRef = useRef<string[]>([])

  // Cleanup any created object URLs on unmount
  useEffect(() => {
    return () => {
      for (const url of createdBlobUrlsRef.current) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // ignore
        }
      }
      createdBlobUrlsRef.current = []
    }
  }, [])

  const projectLanguages = useMemo(
    () => collectPreVisLanguages(scenes, availableLanguages),
    [scenes, availableLanguages]
  )

  const sceneSummaries = useMemo<PreVisSceneSummary[]>(() => {
    if (!Array.isArray(scenes)) return []
    return scenes.map((scene, idx) => {
      const tempId =
        (typeof scene?.id === 'string' && scene.id.trim()) ||
        (typeof scene?.sceneId === 'string' && scene.sceneId.trim()) ||
        `scene-${idx}`
      const prodData = sceneProductionState?.[tempId] ?? null
      return getPreVisSceneSummary(scene, idx, selectedLanguage, prodData)
    })
  }, [scenes, selectedLanguage, sceneProductionState])

  // Compute per-language playable and rendered counts for quick pills
  const languageCoverage = useMemo(() => {
    const map: Record<string, { playable: number; rendered: number; total: number }> = {}
    for (const lang of projectLanguages) {
      let playable = 0
      let rendered = 0
      const total = Array.isArray(scenes) ? scenes.length : 0
      if (Array.isArray(scenes)) {
        scenes.forEach((scene, idx) => {
          const tempId =
            (typeof scene?.id === 'string' && scene.id.trim()) ||
            (typeof scene?.sceneId === 'string' && scene.sceneId.trim()) ||
            `scene-${idx}`
          const prodData = sceneProductionState?.[tempId] ?? null
          const summary = getPreVisSceneSummary(scene, idx, lang, prodData)
          if (summary.isPlayable) playable += 1
          if (summary.hasExistingAnimaticRender) rendered += 1
        })
      }
      map[lang] = { playable, rendered, total }
    }
    return map
  }, [projectLanguages, scenes, sceneProductionState])

  // Initialize selection when modal opens
  useEffect(() => {
    if (!open) return
    setSelectedLanguage(initialLanguage || 'en')
    setSaveToStreams(Boolean(projectId))

    if (Array.isArray(initialSceneIndices) && initialSceneIndices.length > 0) {
      setSelectedIndices(
        new Set(
          initialSceneIndices.filter(
            (idx) => idx >= 0 && idx < (Array.isArray(scenes) ? scenes.length : 0)
          )
        )
      )
      return
    }

    if (
      typeof currentSceneIndex === 'number' &&
      currentSceneIndex >= 0 &&
      currentSceneIndex < (Array.isArray(scenes) ? scenes.length : 0)
    ) {
      setSelectedIndices(new Set([currentSceneIndex]))
      return
    }

    const playableIndices = scenes
      .map((scene, idx) => {
        const tempId =
          (typeof scene?.id === 'string' && scene.id.trim()) ||
          (typeof scene?.sceneId === 'string' && scene.sceneId.trim()) ||
          `scene-${idx}`
        const summary = getPreVisSceneSummary(
          scene,
          idx,
          initialLanguage || 'en',
          sceneProductionState?.[tempId] ?? null
        )
        return summary.isPlayable ? idx : -1
      })
      .filter((idx) => idx >= 0)

    setSelectedIndices(new Set(playableIndices))
  }, [open, initialLanguage, initialSceneIndices, currentSceneIndex, scenes, projectId, sceneProductionState])

  const playableIndices = useMemo(
    () => sceneSummaries.filter((s) => s.isPlayable).map((s) => s.sceneIndex),
    [sceneSummaries]
  )

  const unrenderedPlayableIndices = useMemo(
    () =>
      sceneSummaries
        .filter((s) => s.isPlayable && !s.hasExistingAnimaticRender)
        .map((s) => s.sceneIndex),
    [sceneSummaries]
  )

  const selectedSummaries = useMemo(
    () => sceneSummaries.filter((s) => selectedIndices.has(s.sceneIndex)),
    [sceneSummaries, selectedIndices]
  )

  const totalSelectedDurationSec = useMemo(
    () =>
      selectedSummaries.reduce((acc, item) => acc + (item.estimatedDurationSec || 0), 0),
    [selectedSummaries]
  )

  const toggleSceneIndex = useCallback(
    (index: number) => {
      if (isBatchRunning) return
      setSelectedIndices((prev) => {
        const next = new Set(prev)
        if (next.has(index)) {
          next.delete(index)
        } else {
          next.add(index)
        }
        return next
      })
    },
    [isBatchRunning]
  )

  const selectCurrentScene = useCallback(() => {
    if (isBatchRunning || typeof currentSceneIndex !== 'number') return
    setSelectedIndices(new Set([currentSceneIndex]))
  }, [isBatchRunning, currentSceneIndex])

  const selectAllPlayable = useCallback(() => {
    if (isBatchRunning) return
    setSelectedIndices(new Set(playableIndices))
  }, [isBatchRunning, playableIndices])

  const selectUnrenderedOnly = useCallback(() => {
    if (isBatchRunning) return
    setSelectedIndices(new Set(unrenderedPlayableIndices))
  }, [isBatchRunning, unrenderedPlayableIndices])

  const clearSelection = useCallback(() => {
    if (isBatchRunning) return
    setSelectedIndices(new Set())
  }, [isBatchRunning])

  const handleDownloadBlobUrl = useCallback(
    (url: string, filename: string) => {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    },
    []
  )

  const handleCancelRender = useCallback(() => {
    cancelledRef.current = true
    localRenderService.cancel()
    setIsBatchRunning(false)
    toast.info('Pre-Vis render cancelled')
  }, [])

  const handleStartRender = useCallback(async () => {
    const orderedIndices = Array.from(selectedIndices).sort((a, b) => a - b)
    if (orderedIndices.length === 0) {
      toast.error('Select at least one scene to render')
      return
    }

    cancelledRef.current = false
    setIsBatchRunning(true)
    setCombinedState({ status: 'idle', progress: 0 })

    // Initialize selected scene states
    setSceneStates((prev) => {
      const next = { ...prev }
      for (const idx of orderedIndices) {
        next[idx] = {
          status: 'probing',
          progress: 2,
          message: 'Waiting in queue...',
        }
      }
      return next
    })

    let dynamicDurations: Record<string, number> = {}
    let completedCount = 0

    try {
      for (const sceneIdx of orderedIndices) {
        if (cancelledRef.current) break
        const scene = scenes[sceneIdx]
        if (!scene) continue

        const summary = sceneSummaries[sceneIdx]
        const sceneLabel = summary
          ? `Scene ${summary.sceneNumber}`
          : `Scene ${sceneIdx + 1}`

        setSceneStates((prev) => ({
          ...prev,
          [sceneIdx]: {
            status: 'probing',
            progress: 5,
            message: `Measuring ${getLanguageName(selectedLanguage)} audio timings...`,
          },
        }))

        const audioUrls = collectScenePreVisAudioUrls(
          scene,
          selectedLanguage,
          clipAudioByBeatId
        )
        dynamicDurations = await probePreVisAudioDurations(
          audioUrls,
          dynamicDurations,
          () => cancelledRef.current
        )
        if (cancelledRef.current) break

        const prevScene = sceneIdx > 0 ? scenes[sceneIdx - 1] : undefined
        const sceneTransitionIn = prevScene?.transitionToNext as
          | 'cut'
          | 'fade'
          | 'dissolve'
          | undefined
        const sceneId = summary?.sceneId ?? `scene-${sceneIdx}`
        const prodData = sceneProductionState?.[sceneId] ?? null

        try {
          const output = await renderPreVisSceneToBlobAndStream(
            scene,
            sceneIdx,
            selectedLanguage,
            {
              projectId,
              saveToStreams: saveToStreams && Boolean(projectId),
              dynamicDurations,
              resolution,
              fps: 30,
              masterVolume,
              sceneProductionData: prodData,
              sceneTransitionIn,
              audioMode,
              clipAudioByBeatId,
              includeCaptions,
              onProgress: (prog) => {
                setSceneStates((prev) => ({
                  ...prev,
                  [sceneIdx]: {
                    status: prog.progress >= 90 && saveToStreams && projectId ? 'uploading' : 'rendering',
                    progress: prog.progress,
                    message: prog.message,
                  },
                }))
              },
            }
          )

          createdBlobUrlsRef.current.push(output.renderResult.blobUrl)

          if (output.stream) {
            onSceneStreamRendered?.(output.sceneId, output.stream, selectedLanguage)
          }

          setSceneStates((prev) => ({
            ...prev,
            [sceneIdx]: {
              status: 'complete',
              progress: 100,
              message: output.uploadedUrl
                ? 'Rendered & saved to streams'
                : 'Rendered locally',
              downloadUrl: output.renderResult.blobUrl,
              cloudUrl: output.uploadedUrl,
              mimeType: output.renderResult.mimeType,
            },
          }))
          completedCount += 1
        } catch (sceneErr) {
          if (cancelledRef.current) break
          const msg =
            sceneErr instanceof Error ? sceneErr.message : 'Failed to render scene'
          console.error(`[PreVisRenderDialog] Error rendering ${sceneLabel}:`, sceneErr)
          setSceneStates((prev) => ({
            ...prev,
            [sceneIdx]: {
              status: 'error',
              progress: 0,
              error: msg,
              message: msg,
            },
          }))
        }
      }

      // Optional combined multi-scene Pre-Vis render
      if (
        !cancelledRef.current &&
        combineSelectedScenes &&
        orderedIndices.length > 1 &&
        completedCount > 0
      ) {
        setCombinedState({
          status: 'rendering',
          progress: 5,
          message: 'Stitching selected scenes into combined Pre-Vis MP4...',
        })

        try {
          const scenesWithIndices = orderedIndices
            .map((idx) => {
              const s = scenes[idx]
              if (!s) return null
              const sid = sceneSummaries[idx]?.sceneId ?? `scene-${idx}`
              return {
                scene: s,
                sceneIndex: idx,
                sceneProductionData: sceneProductionState?.[sid] ?? null,
              }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)

          const multiPlan = buildMultiScenePreVisRenderPlan(
            scenesWithIndices,
            selectedLanguage,
            dynamicDurations,
            {
              resolution,
              fps: 30,
              masterVolume,
              audioMode,
              clipAudioByBeatId,
              includeCaptions,
            }
          )

          const combinedResult = await localRenderService.render(
            multiPlan.config,
            (prog) => {
              setCombinedState({
                status: 'rendering',
                progress: prog.progress,
                message: prog.message,
              })
            }
          )

          createdBlobUrlsRef.current.push(combinedResult.blobUrl)
          setCombinedState({
            status: 'complete',
            progress: 100,
            message: `Combined ${multiPlan.scenePlans.length} scenes (${formatDurationShort(multiPlan.totalDuration)})`,
            downloadUrl: combinedResult.blobUrl,
            mimeType: combinedResult.mimeType,
          })
        } catch (combErr) {
          const msg =
            combErr instanceof Error
              ? combErr.message
              : 'Failed to stitch combined Pre-Vis video'
          setCombinedState({
            status: 'error',
            progress: 0,
            error: msg,
            message: msg,
          })
        }
      }

      if (!cancelledRef.current && completedCount > 0) {
        toast.success(
          completedCount === 1
            ? `Rendered 1 Pre-Vis scene (${getLanguageName(selectedLanguage)})`
            : `Rendered ${completedCount} Pre-Vis scenes (${getLanguageName(selectedLanguage)})`
        )
      }
    } finally {
      setIsBatchRunning(false)
    }
  }, [
    selectedIndices,
    scenes,
    sceneSummaries,
    selectedLanguage,
    clipAudioByBeatId,
    sceneProductionState,
    projectId,
    saveToStreams,
    resolution,
    masterVolume,
    audioMode,
    includeCaptions,
    combineSelectedScenes,
    onSceneStreamRendered,
  ])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isBatchRunning && !nextOpen) {
          return
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Clapperboard className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
                  Render Synced Pre-Vis
                  <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    Stills + Voice + Music + SFX
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                  Export storyboard stills, Ken Burns camera motion, dialogue/narration, music cues, and SFX in exact Screening Room sync.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* 1. Language Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                1. Audio &amp; Caption Language
              </label>
              <GroupedLanguageSelector
                value={selectedLanguage}
                onValueChange={(code) => {
                  if (!isBatchRunning) setSelectedLanguage(code)
                }}
                size="sm"
                disabled={isBatchRunning}
                placeholder="Select language..."
              />
            </div>

            {/* Quick project language pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {projectLanguages.map((lang) => {
                const active = selectedLanguage === lang
                const flag = FLAG_EMOJIS[lang] ?? '🌐'
                const cov = languageCoverage[lang]
                return (
                  <button
                    key={lang}
                    type="button"
                    disabled={isBatchRunning}
                    onClick={() => setSelectedLanguage(lang)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                      active
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 shadow-sm'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    )}
                  >
                    <span>{flag}</span>
                    <span>{getLanguageName(lang)}</span>
                    {cov ? (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded-full',
                          cov.rendered > 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        )}
                        title={`${cov.playable} playable scenes, ${cov.rendered} already rendered as Animatic`}
                      >
                        {cov.rendered}/{cov.playable} ready
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Scene Selector */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-cyan-400" />
                2. Select Scenes ({selectedIndices.size} of {sceneSummaries.length} selected ·{' '}
                {formatDurationShort(totalSelectedDurationSec)})
              </label>

              <div className="flex flex-wrap items-center gap-1.5">
                {typeof currentSceneIndex === 'number' &&
                currentSceneIndex >= 0 &&
                currentSceneIndex < sceneSummaries.length ? (
                  <button
                    type="button"
                    disabled={isBatchRunning}
                    onClick={selectCurrentScene}
                    className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-50"
                  >
                    Current Scene (#{(sceneSummaries[currentSceneIndex]?.sceneNumber ?? currentSceneIndex + 1)})
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={isBatchRunning}
                  onClick={selectAllPlayable}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-50"
                >
                  All Playable ({playableIndices.length})
                </button>
                {unrenderedPlayableIndices.length > 0 &&
                unrenderedPlayableIndices.length < playableIndices.length ? (
                  <button
                    type="button"
                    disabled={isBatchRunning}
                    onClick={selectUnrenderedOnly}
                    className="px-2 py-1 rounded text-[11px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    Unrendered ({unrenderedPlayableIndices.length})
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={isBatchRunning}
                  onClick={clearSelection}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Scene List */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 divide-y divide-zinc-800/60 max-h-[280px] overflow-y-auto">
              {sceneSummaries.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No scenes available in this project.
                </div>
              ) : (
                sceneSummaries.map((summary) => {
                  const isSelected = selectedIndices.has(summary.sceneIndex)
                  const isCurrent = summary.sceneIndex === currentSceneIndex
                  const itemState = sceneStates[summary.sceneIndex]
                  const ext = itemState?.mimeType?.includes('mp4') ? 'mp4' : 'webm'
                  const downloadFilename = `${(projectTitle || 'sceneflow').replace(/[^a-zA-Z0-9_-]/g, '_')}-scene-${summary.sceneNumber}-${selectedLanguage}-previs.${ext}`

                  return (
                    <div
                      key={summary.sceneId}
                      onClick={() => {
                        if (summary.isPlayable && !isBatchRunning) {
                          toggleSceneIndex(summary.sceneIndex)
                        }
                      }}
                      className={cn(
                        'px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors',
                        summary.isPlayable && !isBatchRunning ? 'cursor-pointer' : 'opacity-60',
                        isSelected
                          ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                          : 'hover:bg-zinc-900/60'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Checkbox */}
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-cyan-500 border-cyan-400 text-zinc-950'
                              : 'border-zinc-700 bg-zinc-900'
                          )}
                        >
                          {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                        </div>

                        {/* Thumbnail */}
                        {summary.thumbnailUrl ? (
                          <img
                            src={summary.thumbnailUrl}
                            alt=""
                            className="w-12 h-7 rounded object-cover border border-zinc-800 shrink-0 bg-zinc-900"
                          />
                        ) : (
                          <div className="w-12 h-7 rounded border border-zinc-800 bg-zinc-900 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-3.5 h-3.5 text-zinc-600" />
                          </div>
                        )}

                        {/* Title + Badges */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {summary.isPromo ? 'PROMO' : `SCENE ${summary.sceneNumber}`}
                            </span>
                            {isCurrent ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                Current
                              </span>
                            ) : null}
                            <span className="text-xs font-medium text-zinc-100 truncate">
                              {summary.heading}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 mt-1 text-[11px] text-zinc-400 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-zinc-500" />
                              {summary.frameCount} {summary.frameCount === 1 ? 'frame' : 'frames'}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1',
                                summary.voiceClipCount > 0 ? 'text-cyan-300' : 'text-zinc-500'
                              )}
                            >
                              <Mic className="w-3 h-3" />
                              {summary.voiceClipCount} voice
                            </span>
                            {summary.hasMusic ? (
                              <span className="inline-flex items-center gap-1 text-violet-300">
                                <Music className="w-3 h-3" />
                                Music
                              </span>
                            ) : null}
                            {summary.sfxCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-300">
                                <Volume2 className="w-3 h-3" />
                                {summary.sfxCount} SFX
                              </span>
                            ) : null}
                            <span className="text-zinc-500 font-mono">
                              {formatDurationShort(summary.estimatedDurationSec)}
                            </span>
                          </div>

                          {/* Live progress message */}
                          {itemState && itemState.status !== 'idle' ? (
                            <div className="mt-1.5 space-y-1">
                              {(itemState.status === 'probing' ||
                                itemState.status === 'rendering' ||
                                itemState.status === 'uploading') && (
                                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-400 transition-all duration-200"
                                    style={{ width: `${Math.max(4, itemState.progress)}%` }}
                                  />
                                </div>
                              )}
                              <div
                                className={cn(
                                  'text-[10px]',
                                  itemState.status === 'error'
                                    ? 'text-red-400'
                                    : itemState.status === 'complete'
                                      ? 'text-emerald-400'
                                      : 'text-cyan-300'
                                )}
                              >
                                {itemState.message}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Right Actions / Status */}
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {itemState?.status === 'probing' ||
                        itemState?.status === 'rendering' ||
                        itemState?.status === 'uploading' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300 font-mono">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {itemState.progress}%
                          </span>
                        ) : itemState?.status === 'complete' ? (
                          <div className="flex items-center gap-1.5">
                            {itemState.downloadUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDownloadBlobUrl(
                                    itemState.downloadUrl!,
                                    downloadFilename
                                  )
                                }
                                className="h-7 px-2 text-[11px] border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            ) : null}
                            {itemState.cloudUrl ? (
                              <a
                                href={itemState.cloudUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 w-7 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"
                                title="Open cloud stream MP4 in new tab"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : null}
                          </div>
                        ) : itemState?.status === 'error' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-red-400"
                            title={itemState.error}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        ) : summary.hasExistingAnimaticRender ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Animatic Ready
                          </span>
                        ) : !summary.isPlayable ? (
                          <span className="text-[10px] text-zinc-500">No stills</span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Not rendered</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 3. Output Settings */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  3. Render Settings &amp; Destination
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Rendered Pre-Vis streams unlock Screening Room Scene/Chapter playback and Publishing Final Streams.
                </p>
              </div>

              {/* Resolution pills */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                {(['720p', '1080p', '4K'] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    disabled={isBatchRunning}
                    onClick={() => setResolution(res)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                      resolution === res
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToStreams}
                  disabled={isBatchRunning || !projectId}
                  onChange={(e) => setSaveToStreams(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-cyan-500"
                />
                <span>
                  <span className="font-medium text-zinc-100 block">
                    Save to Scene &amp; Publishing Streams
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Persists each scene as an Animatic stream for {getLanguageName(selectedLanguage)}.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCaptions}
                  disabled={isBatchRunning}
                  onChange={(e) => setIncludeCaptions(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-cyan-500"
                />
                <span>
                  <span className="font-medium text-zinc-100 block">
                    Burn Beat Captions / Signage
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Includes translated beat overlays &amp; lower-thirds when authored.
                  </span>
                </span>
              </label>

              {selectedIndices.size > 1 ? (
                <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer sm:col-span-2 pt-1 border-t border-zinc-800/60">
                  <input
                    type="checkbox"
                    checked={combineSelectedScenes}
                    disabled={isBatchRunning}
                    onChange={(e) => setCombineSelectedScenes(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-cyan-500"
                  />
                  <span>
                    <span className="font-medium text-zinc-100 block">
                      Also stitch selected scenes into one combined Pre-Vis video ({selectedIndices.size} scenes)
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Produces a single continuous file for all selected scenes in order.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>

            {/* Combined Multi-Scene Output Banner */}
            {combinedState.status !== 'idle' ? (
              <div className="mt-2 pt-2.5 border-t border-zinc-800 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-zinc-200 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Combined Multi-Scene Pre-Vis
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {combinedState.message}
                  </div>
                </div>
                {combinedState.status === 'rendering' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300 font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {combinedState.progress}%
                  </span>
                ) : combinedState.status === 'complete' && combinedState.downloadUrl ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const ext = combinedState.mimeType?.includes('mp4') ? 'mp4' : 'webm'
                      handleDownloadBlobUrl(
                        combinedState.downloadUrl!,
                        `${(projectTitle || 'sceneflow').replace(/[^a-zA-Z0-9_-]/g, '_')}-previs-${selectedLanguage}-combined.${ext}`
                      )
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download Combined Pre-Vis
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800/80 bg-zinc-900/70 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-400">
            {selectedIndices.size > 0 ? (
              <span>
                Ready to render{' '}
                <strong className="text-zinc-200">
                  {selectedIndices.size} {selectedIndices.size === 1 ? 'scene' : 'scenes'}
                </strong>{' '}
                in <strong className="text-cyan-300">{getLanguageName(selectedLanguage)}</strong>
              </span>
            ) : (
              <span>Select at least one scene above to render</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isBatchRunning ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelRender}
                className="border-red-500/40 text-red-300 hover:bg-red-500/15"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel Render
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="border-zinc-700 text-zinc-300"
              >
                Close
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              disabled={isBatchRunning || selectedIndices.size === 0}
              onClick={() => void handleStartRender()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
            >
              {isBatchRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Rendering Pre-Vis...
                </>
              ) : (
                <>
                  <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
                  Render {selectedIndices.size > 0 ? `${selectedIndices.size} ` : ''}Pre-Vis{' '}
                  {selectedIndices.size === 1 ? 'Scene' : 'Scenes'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
