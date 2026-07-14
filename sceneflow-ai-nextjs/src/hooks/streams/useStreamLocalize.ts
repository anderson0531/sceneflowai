'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { SceneProductionData } from '@/components/vision/scene-production/types'
import { buildFinalCutClips } from '@/lib/final-cut/useFinalCutClips'
import { lipsyncSegmentVideosForLanguage } from '@/lib/kling/lipsyncWorkflow'
import { getKlingCreditsForGeneration } from '@/lib/credits/creditCosts'
import {
  appendLocalizedProductionStream,
  buildSceneDubRenderRequest,
  collectLipsyncSegmentInputs,
  readScriptScenesFromProject,
} from '@/lib/streams/streamLocalize'
import {
  getLocalizeState,
  type ProjectStream,
  type StreamLocalizeMode,
  type StreamLocalizeState,
  type StreamStemMode,
} from '@/lib/streams/projectStreams'
import type { FinalCutSelection, ProductionLanguage } from '@/lib/types/finalCut'
import { stitchFinalCutClips } from '@/lib/streams/stitchFinalCutMaster'

export interface UseStreamLocalizeArgs {
  projectId: string
  projectTitle?: string
  script: unknown
  metadata: unknown
  stream: ProjectStream
  allStreams: ProjectStream[]
  sceneProductionState: Record<string, SceneProductionData>
  finalCutSelection: FinalCutSelection
  onSaveStreams: (
    streams: ProjectStream[],
    compat?: { exportedVideoUrl?: string; exportedAnimaticUrl?: string }
  ) => Promise<void>
  onPersistSceneProduction: (
    sceneId: string,
    updater: (current: SceneProductionData | undefined) => SceneProductionData | undefined
  ) => void
  reloadSceneProduction: () => Promise<Record<string, SceneProductionData>>
}

async function pollSceneRenderJob(sceneId: string, jobId: string): Promise<string> {
  const maxAttempts = 120
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 5000))
    const response = await fetch(`/api/scene/${sceneId}/render?jobId=${jobId}`)
    if (!response.ok) continue
    const data = await response.json()
    if (data.status === 'COMPLETED' && data.downloadUrl) {
      let url = data.downloadUrl as string
      if (url.includes('storage.googleapis.com')) {
        url = await reuploadRenderToBlob(url, sceneId)
      }
      return url
    }
    if (data.status === 'FAILED') {
      throw new Error(data.error || 'Scene render failed')
    }
  }
  throw new Error('Scene render timed out')
}

async function reuploadRenderToBlob(gcsUrl: string, sceneId: string): Promise<string> {
  try {
    const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(gcsUrl)}`
    const response = await fetch(proxyUrl)
    if (!response.ok) return gcsUrl
    const blob = await response.blob()
    const filename = `renders/localize-${sceneId}-${Date.now()}.mp4`
    const file = new File([blob], filename, { type: blob.type || 'video/mp4' })
    const { upload } = await import('@vercel/blob/client')
    const uploaded = await upload(filename, file, {
      access: 'public',
      handleUploadUrl: '/api/segments/upload-video-url',
    })
    return uploaded.url
  } catch {
    return gcsUrl
  }
}

async function pollStemJob(jobId: string): Promise<'complete' | 'failed'> {
  const maxAttempts = 120
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 5000))
    const response = await fetch(`/api/audio/stems?jobId=${encodeURIComponent(jobId)}`)
    if (!response.ok) continue
    const data = await response.json()
    const status = String(data.status || '').toUpperCase()
    if (status === 'COMPLETED') return 'complete'
    if (status === 'FAILED') throw new Error(data.error || 'Stem separation failed')
  }
  throw new Error('Stem separation timed out')
}

async function ensureSegmentStems(args: {
  projectId: string
  sceneId: string
  segments: Array<{ segmentId: string; activeAssetUrl?: string | null; stemSeparation?: { backgroundStemUrl?: string; status?: string } }>
  onProgress?: (segmentId: string, index: number, total: number) => void
}): Promise<string[]> {
  const pending = args.segments.filter(
    (seg) =>
      !!seg.activeAssetUrl &&
      !seg.stemSeparation?.backgroundStemUrl &&
      seg.stemSeparation?.status !== 'complete'
  )
  const jobIds: string[] = []
  let idx = 0
  for (const seg of pending) {
    args.onProgress?.(seg.segmentId, idx, pending.length)
    const response = await fetch('/api/audio/stems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        projectId: args.projectId,
        sceneId: args.sceneId,
        segmentId: seg.segmentId,
        sourceAudioUrl: seg.activeAssetUrl,
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.warn('[StreamLocalize] Stem enqueue failed:', err.error || response.status)
      idx += 1
      continue
    }
    const data = await response.json()
    if (data.jobId) jobIds.push(data.jobId)
    idx += 1
  }
  for (const jobId of jobIds) {
    await pollStemJob(jobId)
  }
  return jobIds
}

function estimateLipsyncCredits(
  script: unknown,
  sceneProductionState: Record<string, SceneProductionData>,
  language: string
): number {
  const scenes = readScriptScenesFromProject(script)
  let total = 0
  for (const { sceneId, scene } of scenes) {
    const prod = sceneProductionState[sceneId]
    if (!prod) continue
    const inputs = collectLipsyncSegmentInputs(scene, prod, language)
    for (const input of inputs) {
      total += getKlingCreditsForGeneration({
        operation: 'lipsync',
        durationSeconds: input.audioDurationSeconds ?? 10,
        quality: 'pro',
      })
    }
  }
  return total
}

export function useStreamLocalize({
  projectId,
  projectTitle,
  script,
  metadata,
  stream,
  allStreams,
  sceneProductionState,
  finalCutSelection,
  onSaveStreams,
  onPersistSceneProduction,
  reloadSceneProduction,
}: UseStreamLocalizeArgs) {
  const [running, setRunning] = useState(false)
  const [localizeDraft, setLocalizeDraft] = useState<StreamLocalizeState>(() =>
    getLocalizeState(stream)
  )
  const runningLocalizeRef = useRef<StreamLocalizeState>(getLocalizeState(stream))

  const persistStreamLocalize = useCallback(
    async (patch: Partial<StreamLocalizeState>) => {
      const mergedLocalize: StreamLocalizeState = {
        ...runningLocalizeRef.current,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      runningLocalizeRef.current = mergedLocalize
      const nextStream: ProjectStream = {
        ...stream,
        localize: mergedLocalize,
      }
      const updated = allStreams.map((s) =>
        s.language === stream.language ? nextStream : s
      )
      await onSaveStreams(updated)
      setLocalizeDraft(mergedLocalize)
      return nextStream
    },
    [allStreams, onSaveStreams, stream]
  )

  const updateSceneStatus = useCallback(
    async (
      sceneId: string,
      scenePatch: { status: string; mp4Url?: string; jobId?: string; error?: string },
      globalPatch?: Partial<StreamLocalizeState>
    ) => {
      const sceneStatuses = {
        ...(runningLocalizeRef.current.sceneStatuses || {}),
        [sceneId]: scenePatch,
      }
      await persistStreamLocalize({ ...globalPatch, sceneStatuses })
    },
    [persistStreamLocalize]
  )

  const setDraft = useCallback((patch: Partial<StreamLocalizeState>) => {
    setLocalizeDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const saveDraftSettings = useCallback(async () => {
    await persistStreamLocalize({
      mode: localizeDraft.mode,
      speed: localizeDraft.speed,
      stemMode: localizeDraft.stemMode,
    })
  }, [localizeDraft.mode, localizeDraft.speed, localizeDraft.stemMode, persistStreamLocalize])

  const estimatedLipsyncCredits = estimateLipsyncCredits(
    script,
    sceneProductionState,
    stream.language
  )

  const runLocalize = useCallback(async () => {
    if (running) return
    setRunning(true)
    runningLocalizeRef.current = getLocalizeState(stream)

    const mode = localizeDraft.mode
    const speed = localizeDraft.speed
    const stemMode = localizeDraft.stemMode
    const language = stream.language
    const toastId = toast.loading(
      mode === 'lipsync'
        ? `Localizing ${language} with lip-sync…`
        : `Localizing ${language} (dub)…`
    )

    try {
      await persistStreamLocalize({
        mode,
        speed,
        stemMode,
        status: 'preparing',
        error: undefined,
        sceneStatuses: {},
      })

      let productionState = { ...sceneProductionState }
      const scriptScenes = readScriptScenesFromProject(script)

      if (stemMode === 'keep-background') {
        await persistStreamLocalize({ status: 'preparing' })
        for (const { sceneId } of scriptScenes) {
          const prod = productionState[sceneId]
          if (!prod?.segments?.length) continue
          await updateSceneStatus(sceneId, { status: 'preparing-stems' })
          await ensureSegmentStems({
            projectId,
            sceneId,
            segments: prod.segments,
          })
        }
        productionState = await reloadSceneProduction()
      }

      if (mode === 'lipsync') {
        await persistStreamLocalize({ status: 'lipsyncing' })
      }

      await persistStreamLocalize({ status: 'rendering' })

      for (const { sceneId, scene, sceneNumber } of scriptScenes) {
        const prod = productionState[sceneId]
        if (!prod) {
          await updateSceneStatus(sceneId, { status: 'skipped', error: 'No production data' })
          continue
        }

        let lipsyncedVideoBySegment: Record<string, string> | undefined
        if (mode === 'lipsync') {
          const inputs = collectLipsyncSegmentInputs(scene, prod, language)
          if (inputs.length > 0) {
            await updateSceneStatus(sceneId, { status: 'lipsyncing' })
            lipsyncedVideoBySegment = await lipsyncSegmentVideosForLanguage({
              segments: inputs,
              projectId,
              sceneId,
              language,
              onProgress: (segmentId) => {
                void updateSceneStatus(sceneId, { status: `lipsyncing:${segmentId}` })
              },
            })
          }
        }

        const renderBody = buildSceneDubRenderRequest({
          projectId,
          sceneId,
          sceneNumber,
          scriptScene: scene,
          sceneProduction: prod,
          language,
          speed,
          stemMode,
          lipsyncedVideoBySegment,
        })
        if (!renderBody) {
          await updateSceneStatus(sceneId, { status: 'skipped', error: 'No video segments' })
          continue
        }

        await updateSceneStatus(sceneId, { status: 'rendering' })
        const renderRes = await fetch(`/api/scene/${sceneId}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(renderBody),
        })
        if (!renderRes.ok) {
          const err = await renderRes.json().catch(() => ({}))
          throw new Error(err.error || `Scene ${sceneId} render failed`)
        }
        const { jobId } = await renderRes.json()
        await updateSceneStatus(sceneId, { status: 'rendering', jobId })
        const mp4Url = await pollSceneRenderJob(sceneId, jobId)

        onPersistSceneProduction(sceneId, (current) => {
          if (!current) return current
          const streams = appendLocalizedProductionStream(
            current.productionStreams || [],
            language,
            mp4Url
          )
          return { ...current, productionStreams: streams }
        })
        await updateSceneStatus(sceneId, { status: 'complete', mp4Url, jobId })
      }

      productionState = await reloadSceneProduction()

      await persistStreamLocalize({ status: 'stitching' })
      const selection: FinalCutSelection = {
        ...finalCutSelection,
        format: 'full-video',
        language: language as ProductionLanguage,
        presetId: 'all-video',
      }
      const projectLike = {
        id: projectId,
        metadata: {
          ...(typeof metadata === 'object' && metadata ? metadata : {}),
          visionPhase: {
            ...((metadata as { visionPhase?: Record<string, unknown> } | null)?.visionPhase || {}),
            production: {
              scenes: productionState,
            },
          },
        },
        script:
          (script as { script?: { scenes?: unknown } } | undefined)?.script ??
          (script as { scenes?: unknown } | undefined),
      }
      const clips = buildFinalCutClips({ project: projectLike, selection })
      const readyClips = clips.filter((c) => c.status === 'ready' && c.url)
      if (readyClips.length === 0) {
        throw new Error('No localized scene clips available for master stitch')
      }

      const masterUrl = await stitchFinalCutClips({
        projectId,
        filenameLabel: `${projectTitle || projectId}-${language}-localized`,
        clips: readyClips,
        onProgress: (message) => toast.loading(message, { id: toastId }),
      })

      const renderedAt = new Date().toISOString()
      const mergedLocalize: StreamLocalizeState = {
        ...runningLocalizeRef.current,
        mode,
        speed,
        stemMode,
        status: 'ready',
        error: undefined,
        updatedAt: renderedAt,
      }
      runningLocalizeRef.current = mergedLocalize
      const nextStream: ProjectStream = {
        ...stream,
        localize: mergedLocalize,
        status: 'ready',
        mp4Url: masterUrl,
        renderedAt,
        format: 'full-video',
        finalCutSnapshot: selection,
      }
      const updated = allStreams.map((s) =>
        s.language === stream.language ? nextStream : s
      )
      await onSaveStreams(updated, { exportedVideoUrl: masterUrl })
      setLocalizeDraft(mergedLocalize)

      toast.success(`${language} localized master ready`, { id: toastId })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Localization failed'
      await persistStreamLocalize({ status: 'error', error: message })
      toast.error(message, { id: toastId })
    } finally {
      setRunning(false)
    }
  }, [
    allStreams,
    finalCutSelection,
    localizeDraft.mode,
    localizeDraft.speed,
    localizeDraft.stemMode,
    metadata,
    onPersistSceneProduction,
    onSaveStreams,
    persistStreamLocalize,
    projectId,
    projectTitle,
    reloadSceneProduction,
    running,
    sceneProductionState,
    script,
    stream,
    updateSceneStatus,
  ])

  return {
    running,
    localizeDraft,
    setDraft,
    saveDraftSettings,
    runLocalize,
    estimatedLipsyncCredits,
    setMode: (mode: StreamLocalizeMode) => setDraft({ mode }),
    setSpeed: (speed: number) => setDraft({ speed }),
    setStemMode: (stemMode: StreamStemMode) => setDraft({ stemMode }),
  }
}
