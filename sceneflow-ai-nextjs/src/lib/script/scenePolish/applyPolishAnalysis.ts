import { scenePolishBeatFingerprint } from './formatPolishBeats'
import type { ScenePolishAnalysis } from './types'

function sceneIdentity(scene: { id?: unknown; sceneId?: unknown } | null | undefined): string | null {
  if (typeof scene?.id === 'string' && scene.id) return scene.id
  if (typeof scene?.sceneId === 'string' && scene.sceneId) return scene.sceneId
  return null
}

function resolveSceneIndex(
  scenes: unknown[],
  sceneIndex: number,
  sceneId?: string
): number {
  if (sceneId) {
    const byId = scenes.findIndex((scene) => sceneIdentity(scene as { id?: unknown }) === sceneId)
    if (byId >= 0) return byId
  }
  if (Number.isInteger(sceneIndex) && sceneIndex >= 0 && sceneIndex < scenes.length) {
    return sceneIndex
  }
  return -1
}

function cloneVisionPhase(visionPhase: Record<string, any>): Record<string, any> {
  const next = { ...visionPhase }
  if (next.script) {
    next.script = { ...next.script }
    if (next.script.script) {
      next.script.script = { ...next.script.script }
      if (Array.isArray(next.script.script.scenes)) {
        next.script.script.scenes = [...next.script.script.scenes]
      }
    }
  }
  if (Array.isArray(next.scenes)) {
    next.scenes = [...next.scenes]
  }
  return next
}

/**
 * Patch polishAnalysis onto one scene without replacing the script.
 *
 * A background job may finish after the user kept editing. Writing only this
 * field (and mirroring visionPhase.scenes) is what keeps later SAVE-QUEUE
 * bodies from needing to win a scriptUpdatedAt race.
 */
export function applyPolishAnalysisToVisionPhase(
  visionPhase: Record<string, any>,
  input: {
    sceneIndex: number
    sceneId?: string
    analysis: ScenePolishAnalysis
  }
): { visionPhase: Record<string, any>; saved: boolean; stale: boolean; sceneIndex: number } {
  const next = cloneVisionPhase(visionPhase)
  const scriptScenes: any[] = Array.isArray(next.script?.script?.scenes)
    ? next.script.script.scenes
    : Array.isArray(next.scenes)
      ? next.scenes
      : []

  const index = resolveSceneIndex(scriptScenes, input.sceneIndex, input.sceneId)
  if (index < 0) {
    return { visionPhase: next, saved: false, stale: false, sceneIndex: input.sceneIndex }
  }

  const scene = scriptScenes[index] && typeof scriptScenes[index] === 'object' ? scriptScenes[index] : {}
  const existing = scene.polishAnalysis as ScenePolishAnalysis | undefined
  const appliedRecommendationIds =
    input.analysis.appliedRecommendationIds?.length
      ? input.analysis.appliedRecommendationIds
      : existing?.appliedRecommendationIds
  const stale =
    Boolean(input.analysis.stale) ||
    scenePolishBeatFingerprint(scene) !== input.analysis.beatFingerprint

  const polishAnalysis: ScenePolishAnalysis = {
    ...input.analysis,
    ...(appliedRecommendationIds ? { appliedRecommendationIds } : {}),
    stale,
  }

  scriptScenes[index] = { ...scene, polishAnalysis }

  if (next.script?.script) {
    next.script.script.scenes = scriptScenes
  }
  next.scenes = scriptScenes

  return { visionPhase: next, saved: true, stale, sceneIndex: index }
}
