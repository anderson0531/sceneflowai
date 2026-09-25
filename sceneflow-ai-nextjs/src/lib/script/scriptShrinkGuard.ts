/**
 * A short script must not replace a long one.
 *
 * Project PUT merges by scene id, so a one-scene edit still persists. Script
 * generation and a payload whose scenes have no ids do not: they replace the
 * stored list. A drop from more than 10 scenes to under half of that count is
 * rejected unless the caller set `confirmScriptReplace`, or `deletedSceneIds`
 * accounts for every missing scene.
 */

import { mergeSceneArraysForPersistence } from '@/lib/storyboard/mergeSceneMedia'

export const SCRIPT_SHRINK_MIN_EXISTING_SCENES = 10

export function isUnconfirmedScriptShrink(
  existingSceneCount: number,
  nextSceneCount: number,
  options?: { confirmScriptReplace?: boolean; deletedSceneCount?: number }
): boolean {
  if (options?.confirmScriptReplace) return false
  if (!Number.isFinite(existingSceneCount) || !Number.isFinite(nextSceneCount)) return false
  if (existingSceneCount <= SCRIPT_SHRINK_MIN_EXISTING_SCENES) return false
  if (nextSceneCount >= existingSceneCount) return false
  const missing = existingSceneCount - nextSceneCount
  const deleted = options?.deletedSceneCount ?? 0
  if (deleted >= missing) return false
  return nextSceneCount < existingSceneCount / 2
}

export function scenesAfterUnconfirmedShrinkGuard(
  existingScenes: any[],
  incomingScenes: any[],
  options?: { deletedSceneIds?: string[]; confirmScriptReplace?: boolean }
): { scenes: any[]; rejectedShrink: boolean } {
  const existing = Array.isArray(existingScenes) ? existingScenes : []
  const incoming = Array.isArray(incomingScenes) ? incomingScenes : []
  const deletedSceneIds = options?.deletedSceneIds || []
  const merged = mergeSceneArraysForPersistence(existing, incoming, { deletedSceneIds })
  if (
    isUnconfirmedScriptShrink(existing.length, merged.length, {
      confirmScriptReplace: options?.confirmScriptReplace,
      deletedSceneCount: deletedSceneIds.length,
    })
  ) {
    return { scenes: existing, rejectedShrink: true }
  }
  return { scenes: merged, rejectedShrink: false }
}
