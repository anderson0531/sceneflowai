/**
 * A scene-by-scene pipeline should not spend reference stills until the
 * scene script has settled. Direction is stamped from the script, and a later
 * edit makes that stamp stale — that is the signal to wait instead of redrawing.
 */

import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import { isDirectionStale } from '@/lib/utils/contentHash'

export function isSceneOutline(scene: Record<string, unknown> | null | undefined): boolean {
  if (!scene) return false
  const summary = scene.summary
  const hasSummary = typeof summary === 'string' ? summary.trim().length > 0 : Boolean(summary)
  return !scene.isExpanded && hasSummary
}

export function sceneHasScreenplayBody(scene: Record<string, unknown> | null | undefined): boolean {
  if (!scene) return false
  const action = typeof scene.action === 'string' ? scene.action.trim() : ''
  const visual = typeof scene.visualDescription === 'string' ? scene.visualDescription.trim() : ''
  if (action || visual) return true
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  return dialogue.some((line) => {
    if (!line || typeof line !== 'object') return false
    const text =
      (line as { line?: unknown; text?: unknown }).line ??
      (line as { text?: unknown }).text
    return typeof text === 'string' && text.trim().length > 0
  })
}

/**
 * Ready for reference images when the scene is a written script (not an
 * outline), it has action or dialogue, and scene direction exists and still
 * matches that script.
 */
export function isSceneScriptReadyForReferences(
  scene: Record<string, unknown> | null | undefined
): boolean {
  if (!scene) return false
  if (isSceneOutline(scene)) return false
  if (!sceneHasScreenplayBody(scene)) return false
  if (!scene.sceneDirection) return false
  return !isDirectionStale(scene)
}

function shotDirectionIsOptimized(beat: { beatDirection?: { generatedBy?: string } | null }): boolean {
  const generatedBy = beat.beatDirection?.generatedBy
  return generatedBy === 'user' || generatedBy === 'director'
}

export interface SceneContinuityActions {
  /** Gen, Regen, and Scene Ref Agent may draw plates. */
  canGenerate: boolean
  /** Scene direction is missing or no longer matches the script. */
  needsSceneDirection: boolean
  /** The scene has shootable shots whose plates can be rewritten. */
  canSyncReferences: boolean
}

/**
 * Continuity generate follows the locked direction the frames will use.
 * Scene direction is one lock. Optimized shot direction is the other, so a
 * scene can draw its plates before a separate scene-direction pass exists.
 * An outline stays blocked. A written scene with neither lock offers Lock
 * direction instead of a dead generate button.
 */
export function sceneContinuityActions(
  scene: Record<string, unknown> | null | undefined
): SceneContinuityActions {
  if (!scene || isSceneOutline(scene) || !sceneHasScreenplayBody(scene)) {
    return { canGenerate: false, needsSceneDirection: false, canSyncReferences: false }
  }
  const shootable = getSceneBeats(scene).filter((beat) => !isBeatExcluded(beat))
  const directionReady = isSceneScriptReadyForReferences(scene)
  const shotsOptimized = shootable.some((beat) => shotDirectionIsOptimized(beat))
  return {
    canGenerate: directionReady || shotsOptimized,
    needsSceneDirection: !directionReady,
    canSyncReferences: shootable.length > 0,
  }
}
