/**
 * Build the list of preview clips for the Final Cut viewer.
 *
 * Final Cut renders one clip per script scene. The url, version and status
 * are computed from the canonical Production state so the preview always
 * reflects the latest renders without copying data into project metadata.
 */

import { useMemo } from 'react'
import type { FinalCutSceneClip, FinalCutSelection } from '@/lib/types/finalCut'
import { getSceneProductionStateFromMetadata } from './projectProductionState'
import {
  getAvailableSceneVersions,
  resolveSceneStreamUrl,
} from './resolveSegmentMedia'

interface ProjectLike {
  id?: string
  metadata?: unknown
  script?: { scenes?: unknown }
}

interface ScriptSceneLike {
  id?: string
  sceneId?: string
  sceneNumber?: number
  heading?: string | { text?: string }
  visualDescription?: string
}

const DEFAULT_SCENE_DURATION_SEC = 8

function readScriptScenes(project: ProjectLike | null | undefined): ScriptSceneLike[] {
  if (!project) return []
  const candidates: unknown[] = [
    (project.metadata as { visionPhase?: { script?: { script?: { scenes?: unknown } } } } | undefined)
      ?.visionPhase?.script?.script?.scenes,
    (project.metadata as { visionPhase?: { scenes?: unknown } } | undefined)?.visionPhase?.scenes,
    project.script?.scenes,
  ]
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c as ScriptSceneLike[]
  }
  for (const c of candidates) {
    if (Array.isArray(c)) return c as ScriptSceneLike[]
  }
  return []
}

function readSceneDurationSeconds(
  prodScene: Record<string, unknown> | undefined,
  fallbackSec: number
): number {
  if (!prodScene) return fallbackSec
  const segments = (prodScene as { segments?: unknown }).segments
  if (Array.isArray(segments) && segments.length > 0) {
    let max = 0
    for (const seg of segments as Array<Record<string, unknown>>) {
      const end = Number(seg.endTime)
      if (Number.isFinite(end) && end > max) max = end
    }
    if (max > 0) return max
  }
  return fallbackSec
}

function headingText(s: ScriptSceneLike | undefined): string | undefined {
  if (!s) return undefined
  const h = s.heading
  if (typeof h === 'string') return h
  if (h && typeof h === 'object' && typeof h.text === 'string') return h.text
  return undefined
}

function sceneIdFor(scene: ScriptSceneLike, index: number): string {
  return scene.id || scene.sceneId || `scene-${index}`
}

export interface BuildFinalCutClipsArgs {
  project: ProjectLike | null | undefined
  selection: FinalCutSelection
}

/**
 * Pure (memoizable) builder. Exported separately from the hook so callers
 * outside React (export pipelines, tests) can use it without a React tree.
 */
export function buildFinalCutClips({
  project,
  selection,
}: BuildFinalCutClipsArgs): FinalCutSceneClip[] {
  const scenes = readScriptScenes(project)
  if (scenes.length === 0) return []

  const sceneProductionState = getSceneProductionStateFromMetadata(project?.metadata)
  const clips: FinalCutSceneClip[] = []
  let cursor = 0

  for (let index = 0; index < scenes.length; index++) {
    const scene = scenes[index]
    const sceneId = sceneIdFor(scene, index)
    const prodScene = sceneProductionState[sceneId] as Record<string, unknown> | undefined
    const resolved = resolveSceneStreamUrl(sceneProductionState, sceneId, selection)
    const versions = resolved.availableVersions.length
      ? resolved.availableVersions
      : getAvailableSceneVersions(sceneProductionState, sceneId, selection.format, selection.language)

    const durationSec =
      resolved.durationSec ?? readSceneDurationSeconds(prodScene, DEFAULT_SCENE_DURATION_SEC)

    const startTime = cursor
    const endTime = cursor + durationSec
    cursor = endTime

    const status: FinalCutSceneClip['status'] = resolved.url
      ? 'ready'
      : versions.length === 0
        ? 'missing'
        : 'pending'

    clips.push({
      sceneId,
      sceneNumber: typeof scene.sceneNumber === 'number' ? scene.sceneNumber : index + 1,
      heading: headingText(scene),
      startTime,
      endTime,
      duration: durationSec,
      url: resolved.url,
      streamVersion: resolved.streamVersion,
      availableVersions: versions,
      status,
    })
  }

  return clips
}

export function useFinalCutClips(
  project: ProjectLike | null | undefined,
  selection: FinalCutSelection
): FinalCutSceneClip[] {
  return useMemo(
    () => buildFinalCutClips({ project, selection }),
    [project, selection]
  )
}
