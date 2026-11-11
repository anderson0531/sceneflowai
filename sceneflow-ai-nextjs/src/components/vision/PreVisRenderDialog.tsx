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
  Move,
  Music,
  RotateCcw,
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
import { appendSceneRenderClient } from '@/lib/projects/appendSceneRenderClient'
import type { AnimaticAudioMode } from '@/lib/storyboard/animaticAudioMode'
import type { BeatDirectionTransition } from '@/lib/script/segmentTypes'
import {
  buildMultiScenePreVisRenderPlan,
  collectPreVisLanguages,
  collectScenePreVisAudioUrls,
  getPreVisSceneSummary,
  probePreVisAudioDurations,
  renderPreVisSceneToBlobAndStream,
  stitchPreVisSceneOutputs,
  uploadAndPersistPreVisSceneOutput,
  type PreVisSceneSummary,
  type StitchablePreVisSceneClip,
} from '@/lib/storyboard/preVisSceneRender'
import {
  DEFAULT_GALLERY_IMAGE_EFFECT_PREFS,
  type GalleryImageEffectPrefs,
  type KenBurnsIntensity,
} from '@/lib/storyboard/storyboardImageEffects'
import { cn } from '@/lib/utils'
import { getLocalRenderService } from '@/lib/video/LocalRenderService'

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
  initialImageEffectPrefs?: GalleryImageEffectPrefs
  onSceneStreamRendered?: (
    sceneId: string,
    stream: ProductionStream,
    language: string
  ) => void
}

function resolveInitialRenderMotionPrefs(
  prefs?: GalleryImageEffectPrefs
): GalleryImageEffectPrefs {
  if (!prefs || prefs.mode === 'off') {
    return {
      mode: 'kenBurns',
      kenBurnsIntensity:
        prefs?.kenBurnsIntensity ?? DEFAULT_GALLERY_IMAGE_EFFECT_PREFS.kenBurnsIntensity,
    }
  }
  return {
    mode: prefs.mode,
    kenBurnsIntensity:
      prefs.kenBurnsIntensity ?? DEFAULT_GALLERY_IMAGE_EFFECT_PREFS.kenBurnsIntensity,
  }
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
  initialImageEffectPrefs,
  onSceneStreamRendered,
}: PreVisRenderDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage || 'en')
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4K'>('1080p')
  const [imageEffectPrefs, setImageEffectPrefs] = useState<GalleryImageEffectPrefs>(() =>
    resolveInitialRenderMotionPrefs(initialImageEffectPrefs)
  )
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
    cloudUrl?: string
    mimeType?: string
    error?: string
  }>({ status: 'idle', progress: 0 })

  const cancelledRef = useRef<boolean>(false)
  const wasOpenRef = useRef<boolean>(false)
  const createdBlobUrlsRef = useRef<string[]>([])
  const renderedClipsBySceneIndexRef = useRef<Record<number, StitchablePreVisSceneClip>>({})
  const dynamicDurationsRef = useRef<Record<string, number>>({})

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

  // Initialize selection only when modal transitions closed -> open so live stream
  // state updates during a multi-scene render never clobber user selection/settings.
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true

    setSelectedLanguage(initialLanguage || 'en')
    setSaveToStreams(Boolean(projectId))
    setImageEffectPrefs(resolveInitialRenderMotionPrefs(initialImageEffectPrefs))
    setCombinedState({ status: 'idle', progress: 0 })
    renderedClipsBySceneIndexRef.current = {}

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
  }, [open, initialLanguage, initialSceneIndices, currentSceneIndex, scenes, projectId, sceneProductionState, initialImageEffectPrefs])

  const handleSelectLanguage = useCallback(
    (code: string) => {
      if (isBatchRunning || code === selectedLanguage) return
      setSelectedLanguage(code)
      renderedClipsBySceneIndexRef.current = {}
      setCombinedState({ status: 'idle', progress: 0 })
    },
    [isBatchRunning, selectedLanguage]
  )

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
    getLocalRenderService().abort()
    setIsBatchRunning(false)
    toast.info('Pre-Vis render cancelled')
  }, [])

  const runCombinedStitch = useCallback(
    async (
      clipsForStitch: StitchablePreVisSceneClip[],
      dynamicDurations: Record<string, number>
    ): Promise<void> => {
      setCombinedState({
        status: 'rendering',
        progress: 5,
        message: `Stitching ${clipsForStitch.length} rendered scenes into one combined Pre-Vis video...`,
      })

      const scenesWithIndices = clipsForStitch
        .map((clip) => {
          const s = scenes[clip.sceneIndex]
          if (!s) return null
          const sid = sceneSummaries[clip.sceneIndex]?.sceneId ?? clip.sceneId
          return {
            scene: s,
            sceneIndex: clip.sceneIndex,
            sceneProductionData: sceneProductionState?.[sid] ?? null,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      const fallbackMultiPlan =
        scenesWithIndices.length >= 2
          ? buildMultiScenePreVisRenderPlan(
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
                imageEffectPrefs,
              }
            )
          : undefined

      const stitched = await stitchPreVisSceneOutputs(clipsForStitch, {
        projectId,
        projectTitle,
        language: selectedLanguage,
        resolution,
        fallbackMultiPlan,
        isCancelled: () => cancelledRef.current,
        onProgress: (prog) => {
          setCombinedState({
            status: 'rendering',
            progress: prog.progress,
            message: prog.message,
          })
        },
      })

      if (stitched.isObjectUrl) {
        createdBlobUrlsRef.current.push(stitched.downloadUrl)
      }

      const ext = stitched.mimeType.includes('mp4') ? 'mp4' : 'webm'
      const combinedFilename = `${(projectTitle || 'sceneflow').replace(/[^a-zA-Z0-9_-]/g, '_')}-previs-${selectedLanguage}-combined.${ext}`

      setCombinedState({
        status: 'complete',
        progress: 100,
        message: `Combined ${stitched.sceneCount} scenes (${formatDurationShort(stitched.totalDuration)})`,
        downloadUrl: stitched.downloadUrl,
        cloudUrl: stitched.cloudUrl,
        mimeType: stitched.mimeType,
      })

      // Auto-trigger browser download when stitching completes so the combined file is saved immediately
      handleDownloadBlobUrl(stitched.downloadUrl, combinedFilename)
    },
    [
      scenes,
      sceneSummaries,
      sceneProductionState,
      selectedLanguage,
      resolution,
      masterVolume,
      audioMode,
      clipAudioByBeatId,
      includeCaptions,
      imageEffectPrefs,
      projectId,
      projectTitle,
      handleDownloadBlobUrl,
    ]
  )

  const handleRetryStitch = useCallback(async () => {
    const orderedIndices = Array.from(selectedIndices).sort((a, b) => a - b)
    const clipsForStitch: StitchablePreVisSceneClip[] = []
    for (const idx of orderedIndices) {
      const cached = renderedClipsBySceneIndexRef.current[idx]
      if (cached && (cached.uploadedUrl || cached.blob)) {
        clipsForStitch.push(cached)
        continue
      }
      const summary = sceneSummaries[idx]
      if (summary?.existingAnimaticUrl) {
        clipsForStitch.push({
          sceneId: summary.sceneId,
          sceneIndex: idx,
          sceneNumber: summary.sceneNumber,
          duration: summary.estimatedDurationSec,
          uploadedUrl: summary.existingAnimaticUrl,
          mimeType: summary.existingAnimaticUrl.toLowerCase().includes('.webm')
            ? 'video/webm'
            : 'video/mp4',
        })
      }
    }

    if (clipsForStitch.length < 2) {
      toast.error('At least 2 rendered scenes are required to stitch a combined Pre-Vis video')
      return
    }

    cancelledRef.current = false
    setIsBatchRunning(true)
    try {
      await runCombinedStitch(clipsForStitch, dynamicDurationsRef.current)
      if (!cancelledRef.current) {
        toast.success(
          `Stitched combined Pre-Vis video (${clipsForStitch.length} scenes · ${getLanguageName(selectedLanguage)})`
        )
      }
    } catch (combErr) {
      if (!cancelledRef.current) {
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
        toast.error(`Combined Pre-Vis stitch failed: ${msg}`)
      }
    } finally {
      setIsBatchRunning(false)
    }
  }, [selectedIndices, sceneSummaries, runCombinedStitch, selectedLanguage])

  const readySelectedCount = useMemo(() => {
    let count = 0
    for (const idx of selectedIndices) {
      if (
        sceneStates[idx]?.status === 'complete' ||
        Boolean(sceneSummaries[idx]?.existingAnimaticUrl)
      ) {
        count += 1
      }
    }
    return count
  }, [selectedIndices, sceneStates, sceneSummaries])

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
          progress: 4,
          message: `Measuring ${getLanguageName(selectedLanguage)} audio timings...`,
        }
      }
      return next
    })

    let dynamicDurations: Record<string, number> = { ...dynamicDurationsRef.current }
    let completedCount = 0
    const completedClips: StitchablePreVisSceneClip[] = []
    const shouldPersistStreams = saveToStreams && Boolean(projectId)

    // Serialize DB stream PATCHes across scenes while allowing Vercel Blob uploads to run
    // concurrently in the background while the next scene renders on Canvas.
    let persistChain: Promise<void> = Promise.resolve()
    const enqueuePersist = (projId: string, scId: string, stream: ProductionStream) => {
      const next = persistChain.then(() =>
        appendSceneRenderClient(projId, scId, stream).then(() => {})
      )
      persistChain = next.catch(() => {})
      return next
    }
    const backgroundUploadTasks: Array<Promise<void>> = []

    try {
      // 1. Probe all audio URLs across all selected scenes in one parallel batch upfront
      const batchAudioUrls: string[] = []
      for (const sceneIdx of orderedIndices) {
        const scene = scenes[sceneIdx]
        if (!scene) continue
        batchAudioUrls.push(
          ...collectScenePreVisAudioUrls(scene, selectedLanguage, clipAudioByBeatId)
        )
      }
      dynamicDurations = await probePreVisAudioDurations(
        batchAudioUrls,
        dynamicDurations,
        () => cancelledRef.current
      )
      dynamicDurationsRef.current = dynamicDurations

      if (!cancelledRef.current && orderedIndices.length > 1) {
        setSceneStates((prev) => {
          const next = { ...prev }
          for (const idx of orderedIndices.slice(1)) {
            if (next[idx]?.status === 'probing') {
              next[idx] = {
                status: 'probing',
                progress: 6,
                message: 'Queued for render...',
              }
            }
          }
          return next
        })
      }

      // 2. Render each selected scene sequentially on Canvas while pipelining cloud uploads
      for (const sceneIdx of orderedIndices) {
        if (cancelledRef.current) break
        const scene = scenes[sceneIdx]
        if (!scene) continue

        const summary = sceneSummaries[sceneIdx]
        const sceneLabel = summary
          ? `Scene ${summary.sceneNumber}`
          : `Scene ${sceneIdx + 1}`

        const prevScene = sceneIdx > 0 ? scenes[sceneIdx - 1] : undefined
        const sceneTransitionIn = prevScene?.transitionToNext as
          | BeatDirectionTransition
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
              // Pipeline upload separately so Canvas immediately starts rendering the next scene
              saveToStreams: false,
              dynamicDurations,
              resolution,
              fps: 30,
              masterVolume,
              sceneProductionData: prodData,
              sceneTransitionIn,
              audioMode,
              clipAudioByBeatId,
              includeCaptions,
              imageEffectPrefs,
              onProgress: (prog) => {
                const scaledProgress = shouldPersistStreams
                  ? Math.round(prog.progress * 0.88)
                  : prog.progress
                setSceneStates((prev) => ({
                  ...prev,
                  [sceneIdx]: {
                    status: 'rendering',
                    progress: scaledProgress,
                    message: prog.message,
                  },
                }))
              },
            }
          )

          if (output.renderResult.blobUrl) {
            createdBlobUrlsRef.current.push(output.renderResult.blobUrl)
          }

          const localBlobUrl = output.renderResult.blobUrl
          const localMimeType = output.renderResult.mimeType || 'video/mp4'

          const stitchClip: StitchablePreVisSceneClip = {
            sceneId: output.sceneId,
            sceneIndex: sceneIdx,
            sceneNumber: output.sceneNumber,
            duration: output.plan.totalDuration,
            uploadedUrl: output.uploadedUrl,
            blob: output.renderResult.blob,
            mimeType: localMimeType,
          }
          completedClips.push(stitchClip)
          renderedClipsBySceneIndexRef.current[sceneIdx] = stitchClip
          completedCount += 1

          if (shouldPersistStreams && projectId && output.renderResult.blob) {
            setSceneStates((prev) => ({
              ...prev,
              [sceneIdx]: {
                status: 'uploading',
                progress: 92,
                message: 'Uploading MP4 to cloud streams in background...',
                downloadUrl: localBlobUrl,
                mimeType: localMimeType,
              },
            }))

            const blobToUpload = output.renderResult.blob
            const uploadTask = uploadAndPersistPreVisSceneOutput({
              projectId,
              sceneId: output.sceneId,
              sceneNumber: output.sceneNumber,
              language: selectedLanguage,
              blob: blobToUpload,
              mimeType: localMimeType,
              totalDuration: output.plan.totalDuration,
              resolution,
              fps: 30,
              persistStream: enqueuePersist,
            })
              .then((persisted) => {
                stitchClip.uploadedUrl = persisted.uploadedUrl
                onSceneStreamRendered?.(output.sceneId, persisted.stream, selectedLanguage)
                setSceneStates((prev) => ({
                  ...prev,
                  [sceneIdx]: {
                    status: 'complete',
                    progress: 100,
                    message: 'Rendered & saved to streams',
                    downloadUrl: localBlobUrl,
                    cloudUrl: persisted.uploadedUrl,
                    mimeType: localMimeType,
                  },
                }))
              })
              .catch((uploadErr) => {
                console.warn(
                  `[PreVisRenderDialog] Background stream upload failed for ${sceneLabel}:`,
                  uploadErr
                )
                setSceneStates((prev) => ({
                  ...prev,
                  [sceneIdx]: {
                    status: 'complete',
                    progress: 100,
                    message: 'Rendered locally (cloud stream save failed)',
                    downloadUrl: localBlobUrl,
                    mimeType: localMimeType,
                  },
                }))
              })

            backgroundUploadTasks.push(uploadTask)
          } else {
            setSceneStates((prev) => ({
              ...prev,
              [sceneIdx]: {
                status: 'complete',
                progress: 100,
                message: 'Rendered locally',
                downloadUrl: localBlobUrl,
                mimeType: localMimeType,
              },
            }))
          }
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

      if (backgroundUploadTasks.length > 0) {
        await Promise.all(backgroundUploadTasks)
      }

      // Optional combined multi-scene Pre-Vis stitch
      const shouldCombine = combineSelectedScenes && orderedIndices.length > 1
      let stitchSucceeded = false
      let stitchErrorMsg: string | null = null

      if (!cancelledRef.current && shouldCombine) {
        if (completedClips.length >= 2) {
          try {
            await runCombinedStitch(completedClips, dynamicDurations)
            stitchSucceeded = true
          } catch (combErr) {
            if (!cancelledRef.current) {
              const msg =
                combErr instanceof Error
                  ? combErr.message
                  : 'Failed to stitch combined Pre-Vis video'
              stitchErrorMsg = msg
              console.error('[PreVisRenderDialog] Combined stitch error:', combErr)
              setCombinedState({
                status: 'error',
                progress: 0,
                error: msg,
                message: msg,
              })
            }
          }
        } else if (completedClips.length === 1) {
          stitchErrorMsg =
            'At least 2 scenes must succeed to stitch a combined Pre-Vis video (only 1 scene completed).'
          setCombinedState({
            status: 'error',
            progress: 0,
            error: stitchErrorMsg,
            message: stitchErrorMsg,
          })
        }
      }

      if (!cancelledRef.current) {
        if (shouldCombine) {
          if (stitchSucceeded) {
            toast.success(
              `Rendered ${completedCount} Pre-Vis scenes & stitched combined video (${getLanguageName(selectedLanguage)})`
            )
          } else if (completedCount > 0) {
            toast.error(
              `Rendered ${completedCount} individual scenes, but combined Pre-Vis stitch failed: ${stitchErrorMsg || 'Unknown error'}`
            )
          } else {
            toast.error('Failed to render selected Pre-Vis scenes')
          }
        } else if (completedCount > 0) {
          toast.success(
            completedCount === 1
              ? `Rendered 1 Pre-Vis scene (${getLanguageName(selectedLanguage)})`
              : `Rendered ${completedCount} Pre-Vis scenes (${getLanguageName(selectedLanguage)})`
          )
        } else {
          toast.error('Failed to render selected Pre-Vis scenes')
        }
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
    imageEffectPrefs,
    combineSelectedScenes,
    onSceneStreamRendered,
    runCombinedStitch,
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
                onValueChange={handleSelectLanguage}
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
                    onClick={() => handleSelectLanguage(lang)}
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
                            crossOrigin="anonymous"
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

            {/* Camera Motion (Ken Burns) selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                <Move className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-medium text-zinc-200">Camera Motion</span>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                  (per-beat authored motion always preserved)
                </span>
              </div>
              <div
                className="flex flex-wrap items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800"
                role="group"
                aria-label="Camera motion setting"
              >
                {(
                  [
                    { key: 'subtle', label: 'KB Subtle', mode: 'kenBurns', intensity: 'subtle' },
                    { key: 'medium', label: 'KB Medium', mode: 'kenBurns', intensity: 'medium' },
                    { key: 'dramatic', label: 'KB Dramatic', mode: 'kenBurns', intensity: 'dramatic' },
                    { key: 'lineZoom', label: 'Line Zoom', mode: 'lineZoom' },
                    { key: 'crossfade', label: 'Crossfade', mode: 'crossfade' },
                    { key: 'off', label: 'Static', mode: 'off' },
                  ] as Array<{
                    key: string
                    label: string
                    mode: GalleryImageEffectPrefs['mode']
                    intensity?: KenBurnsIntensity
                  }>
                ).map((opt) => {
                  const active =
                    opt.mode === 'kenBurns'
                      ? imageEffectPrefs.mode === 'kenBurns' &&
                        imageEffectPrefs.kenBurnsIntensity === opt.intensity
                      : imageEffectPrefs.mode === opt.mode
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={isBatchRunning}
                      onClick={() =>
                        setImageEffectPrefs((prev) => ({
                          mode: opt.mode,
                          kenBurnsIntensity: opt.intensity ?? prev.kenBurnsIntensity,
                        }))
                      }
                      className={cn(
                        'px-2 py-1 rounded text-[11px] font-medium transition-colors',
                        active
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                          : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
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
                      Losslessly concatenates the rendered scene clips into a single continuous file once individual scenes finish.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          </div>
        </div>

        {/* Pinned Combined Multi-Scene Output Status Bar (always visible above footer) */}
        {combinedState.status !== 'idle' ? (
          <div
            className={cn(
              'px-6 py-3 border-t flex flex-col gap-2',
              combinedState.status === 'error'
                ? 'border-red-500/30 bg-red-950/25'
                : combinedState.status === 'complete'
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-cyan-500/30 bg-cyan-950/20'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-zinc-100 flex items-center gap-2">
                  {combinedState.status === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : combinedState.status === 'complete' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}
                  <span>Combined Multi-Scene Pre-Vis</span>
                </div>
                <div
                  className={cn(
                    'text-[11px] mt-0.5 break-words',
                    combinedState.status === 'error'
                      ? 'text-red-300'
                      : combinedState.status === 'complete'
                        ? 'text-emerald-300'
                        : 'text-zinc-300'
                  )}
                >
                  {combinedState.message}
                </div>
              </div>

              {combinedState.status === 'rendering' ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300 font-mono shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {combinedState.progress}%
                </span>
              ) : combinedState.status === 'complete' && combinedState.downloadUrl ? (
                <div className="flex items-center gap-1.5 shrink-0">
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
                  {combinedState.cloudUrl ? (
                    <a
                      href={combinedState.cloudUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"
                      title="Open stitched cloud video in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
              ) : combinedState.status === 'error' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isBatchRunning}
                  onClick={() => void handleRetryStitch()}
                  className="h-8 text-xs border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Retry Stitch
                </Button>
              ) : null}
            </div>

            {combinedState.status === 'rendering' ? (
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-200"
                  style={{ width: `${Math.max(5, combinedState.progress)}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

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

            {!isBatchRunning &&
            selectedIndices.size >= 2 &&
            readySelectedCount === selectedIndices.size ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleRetryStitch()}
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                title="Stitch existing rendered Animatic clips immediately without re-rendering scenes"
              >
                <Film className="w-3.5 h-3.5 mr-1.5" />
                Stitch Ready ({readySelectedCount})
              </Button>
            ) : null}

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
                  {combinedState.status === 'rendering'
                    ? 'Stitching Combined Pre-Vis...'
                    : 'Rendering Pre-Vis...'}
                </>
              ) : (
                <>
                  <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
                  {combineSelectedScenes && selectedIndices.size > 1
                    ? `Render & Stitch ${selectedIndices.size} Scenes`
                    : `Render ${selectedIndices.size > 0 ? `${selectedIndices.size} ` : ''}Pre-Vis ${
                        selectedIndices.size === 1 ? 'Scene' : 'Scenes'
                      }`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
