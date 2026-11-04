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

function shotDirectionIsOptimized(beat: { beatDirection?: { generatedBy?: string } | null }): boolean {
  const generatedBy = beat.beatDirection?.generatedBy
  return generatedBy === 'user' || generatedBy === 'director'
}

/**
 * Ready for reference images when the scene is a written script (not an
 * outline), it has action or dialogue, and either scene direction still
 * matches that script or its shots have been directed.
 */
export function isSceneScriptReadyForReferences(
  scene: Record<string, unknown> | null | undefined
): boolean {
  if (!scene) return false
  if (isSceneOutline(scene)) return false
  if (!sceneHasScreenplayBody(scene)) return false
  const sceneDirectionReady = Boolean(scene.sceneDirection) && !isDirectionStale(scene)
  if (sceneDirectionReady) return true
  const shootable = getSceneBeats(scene).filter((beat) => !isBeatExcluded(beat))
  return shootable.some((beat) => shotDirectionIsOptimized(beat))
}

export interface SceneContinuityActions {
  /** Gen, Update, and Continuity Agent may draw plates (auto-refreshing direction if needed). */
  canGenerate: boolean
  /** Neither scene direction nor shot direction matches the current script yet. */
  needsSceneDirection: boolean
  /** The scene has shootable shots whose plates can be rewritten. */
  canSyncReferences: boolean
}

/**
 * Continuity Agent can run on any written scene: if neither scene direction
 * nor shot direction matches the current script (`needsSceneDirection`),
 * Continuity Agent automatically updates scene direction and syncs continuity
 * references before drawing any missing plates. An outline stays blocked.
 */
export function sceneContinuityActions(
  scene: Record<string, unknown> | null | undefined
): SceneContinuityActions {
  if (!scene || isSceneOutline(scene) || !sceneHasScreenplayBody(scene)) {
    return { canGenerate: false, needsSceneDirection: false, canSyncReferences: false }
  }
  const shootable = getSceneBeats(scene).filter((beat) => !isBeatExcluded(beat))
  const directionReady = Boolean(scene.sceneDirection) && !isDirectionStale(scene)
  const shotsOptimized = shootable.some((beat) => shotDirectionIsOptimized(beat))
  return {
    canGenerate: true,
    needsSceneDirection: !directionReady && !shotsOptimized,
    canSyncReferences: shootable.length > 0,
  }
}
