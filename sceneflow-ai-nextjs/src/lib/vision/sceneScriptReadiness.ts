/**
 * A scene-by-scene pipeline should not spend reference stills until the
 * scene script has settled. Direction is stamped from the script, and a later
 * edit makes that stamp stale — that is the signal to wait instead of redrawing.
 */

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
