/**
 * Unified beat-first scene progress calculator for dashboard, checklist, and next-step banner.
 */

import {
  getStoryboardTimelineBeats,
  isBeatFirstPipelineEnabled,
} from '@/lib/script/beatMigration'
import type { SceneProductionData } from '@/components/vision/scene-production/types'
import type { SceneProgressItem } from '@/components/vision/SceneProgressDashboard'
import type { WorkflowState } from '@/components/vision/WorkflowNextStepBanner'

export interface SceneProgressOptions {
  language?: string
}

function sceneHasScript(scene: Record<string, unknown>): boolean {
  return !!(
    scene.content ||
    scene.dialog ||
    scene.dialogue ||
    scene.narration ||
    scene.description ||
    scene.action
  )
}

function sceneHasDirection(scene: Record<string, unknown>): boolean {
  return !!(scene.direction || scene.sceneDirection || scene.cameraDirection)
}

function sceneHasAudio(scene: Record<string, unknown>, language = 'en'): boolean {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const hasDialogueAudio =
    dialogue.length === 0 ||
    dialogue.every((line: Record<string, unknown>) => {
      const langAudio = (line?.audio as Record<string, unknown> | undefined)?.[language]
      if (typeof (langAudio as { url?: string })?.url === 'string') return true
      if (language === 'en' && typeof line.audioUrl === 'string') return true
      return false
    })
  const narrationAudio = scene.narrationAudio as Record<string, { url?: string }> | undefined
  const narrationOk =
    !scene.narration ||
    !!narrationAudio?.[language]?.url ||
    (language === 'en' && !!scene.narrationAudioUrl)
  return hasDialogueAudio && narrationOk
}

function segmentFrameUrl(segment: Record<string, unknown>, kind: 'start' | 'end'): string | undefined {
  const refs = segment.references as Record<string, unknown> | undefined
  if (kind === 'start') {
    return (
      (segment.startFrameUrl as string | undefined) ||
      (refs?.startFrameUrl as string | undefined) ||
      (segment.visualFrame as string | undefined)
    )
  }
  return (
    (segment.endFrameUrl as string | undefined) ||
    (refs?.endFrameUrl as string | undefined)
  )
}

/** Beat Frames = start + end pairs for F2V (not storyboard stills alone). */
export function sceneHasBeatFrames(productionData?: SceneProductionData | null): boolean {
  const segments = productionData?.segments || []
  if (segments.length === 0) return false
  return segments.every((segment) => {
    const start = segmentFrameUrl(segment as unknown as Record<string, unknown>, 'start')
    const end = segmentFrameUrl(segment as unknown as Record<string, unknown>, 'end')
    return !!(start?.trim() && end?.trim())
  })
}

export function sceneHasStoryboardFrames(scene: Record<string, unknown>): boolean {
  if (isBeatFirstPipelineEnabled()) {
    const beats = getStoryboardTimelineBeats(scene)
    if (beats.length === 0) return !!scene.imageUrl
    return beats.every((beat) => !!beat.storyboardImageUrl?.trim())
  }
  return !!scene.imageUrl
}

export function getStoryboardBeatProgress(scene: Record<string, unknown>): {
  complete: number
  total: number
} {
  const beats = getStoryboardTimelineBeats(scene)
  if (beats.length === 0) {
    return { complete: scene.imageUrl ? 1 : 0, total: 1 }
  }
  const complete = beats.filter((b) => !!b.storyboardImageUrl?.trim()).length
  return { complete, total: beats.length }
}

export function sceneHasVideoSegments(productionData?: SceneProductionData | null): boolean {
  const segments = productionData?.segments || []
  if (segments.length === 0) return false
  return segments.every((s) => !!(s.activeAssetUrl && s.assetType))
}

export function sceneHasRender(productionData?: SceneProductionData | null): boolean {
  if (!productionData) return false
  if (productionData.renderedSceneUrl) return true
  return (
    Array.isArray(productionData.productionStreams) &&
    productionData.productionStreams.some((s) => s.status === 'complete' && s.mp4Url)
  )
}

export function deriveSceneWorkflowStatus(
  productionData: SceneProductionData | null | undefined,
  hasBeatFrames: boolean,
  hasVideo: boolean,
  hasRender: boolean
): SceneProgressItem['status'] {
  const segments = productionData?.segments || []
  const allSegmentsComplete =
    segments.length > 0 &&
    segments.every((s) => s.status === 'complete' || s.status === 'COMPLETE')

  if ((allSegmentsComplete && hasRender) || (hasRender && hasVideo)) {
    return 'complete'
  }
  if (hasVideo || hasBeatFrames || segments.length > 0) {
    return 'in-progress'
  }
  return 'not-started'
}

export function buildSceneProgressItem(
  scene: Record<string, unknown>,
  sceneIndex: number,
  productionData?: SceneProductionData | null,
  options: SceneProgressOptions = {}
): SceneProgressItem {
  const language = options.language ?? 'en'
  const sceneId =
    (scene.id as string) || (scene.sceneId as string) || `scene-${sceneIndex}`
  const heading = scene.heading
  const name =
    typeof heading === 'string'
      ? heading
      : (heading as { text?: string } | undefined)?.text || `Scene ${sceneIndex + 1}`

  const hasScript = sceneHasScript(scene)
  const hasDirection = sceneHasDirection(scene)
  const hasAudio = sceneHasAudio(scene, language)
  const hasFrame = sceneHasBeatFrames(productionData)
  const hasCallAction = sceneHasVideoSegments(productionData)
  const hasRender = sceneHasRender(productionData)

  const score =
    (scene.audienceAnalysis as { score?: number } | undefined)?.score ||
    (scene.scoreAnalysis as { overallScore?: number } | undefined)?.overallScore

  return {
    id: sceneId,
    sceneNumber: sceneIndex + 1,
    name,
    hasScript,
    hasDirection,
    hasFrame,
    hasCallAction,
    hasAudio,
    hasRender,
    status: deriveSceneWorkflowStatus(productionData, hasFrame, hasCallAction, hasRender),
    score,
  }
}

export function buildSceneProgressItems(
  scenes: Record<string, unknown>[],
  sceneProductionState: Record<string, SceneProductionData>,
  options: SceneProgressOptions = {}
): SceneProgressItem[] {
  return scenes.map((scene, idx) => {
    const sceneId =
      (scene.id as string) || (scene.sceneId as string) || `scene-${idx}`
    return buildSceneProgressItem(
      scene,
      idx,
      sceneProductionState[sceneId],
      options
    )
  })
}

export function buildWorkflowState(
  scene: Record<string, unknown>,
  productionData: SceneProductionData | null | undefined,
  options: SceneProgressOptions & {
    activeTab?: WorkflowState['activeTab']
  } = {}
): WorkflowState {
  const item = buildSceneProgressItem(scene, 0, productionData, options)
  return {
    hasScript: item.hasScript,
    hasAudio: item.hasAudio,
    hasDirection: item.hasDirection,
    hasFrame: item.hasFrame,
    hasSegments: !!(productionData?.isSegmented && productionData.segments?.length),
    hasVideoSegments: item.hasCallAction,
    hasRender: item.hasRender,
    activeTab: options.activeTab,
    score: item.score,
  }
}
