/**
 * Open a shot in Studio's Direct Shot dialog from outside the scene card
 * (Publishing → Promo). The scene card selects the beat and mounts the dialog.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import { isContentPolicyFailureMessage } from '@/lib/vision/videoClipFilters'

export interface DirectShotTarget {
  sceneIndex: number
  beatId: string
  /** Open with Safety checked, for a shot whose last generate was policy-blocked. */
  safety?: boolean
}

export interface DirectShotRequest {
  sceneId?: string
  sceneIndex: number
  beatId: string
  safety?: boolean
}

function sceneKey(scene: Record<string, unknown>, index: number): string {
  return String(scene.id || scene.sceneId || `scene-${index}`)
}

/**
 * A stored promo plan keeps the scene index it was planned against. Scenes can
 * be reordered after planning, so the scene id wins and the index is a fallback.
 */
export function resolveDirectShotTarget(
  scenes: unknown[],
  request: DirectShotRequest
): DirectShotTarget | null {
  const beatId = request.beatId?.trim()
  if (!beatId) return null
  const records = scenes.map((scene) =>
    scene && typeof scene === 'object' ? (scene as Record<string, unknown>) : {}
  )
  const hasBeat = (index: number) =>
    getSceneBeats(records[index]).some((beat) => beat.beatId === beatId)

  const byId = request.sceneId
    ? records.findIndex((scene, index) => sceneKey(scene, index) === request.sceneId)
    : -1
  let sceneIndex = byId >= 0 && hasBeat(byId) ? byId : -1
  if (
    sceneIndex < 0 &&
    request.sceneIndex >= 0 &&
    request.sceneIndex < records.length &&
    hasBeat(request.sceneIndex)
  ) {
    sceneIndex = request.sceneIndex
  }
  if (sceneIndex < 0) {
    sceneIndex = records.findIndex((_, index) => hasBeat(index))
  }
  if (sceneIndex < 0) return null
  return { sceneIndex, beatId, ...(request.safety ? { safety: true } : {}) }
}

/** 1-based shot number as Direct Shot titles it (`Scene N · Shot N`). */
export function directShotNumber(scene: unknown, beatId: string): number | null {
  if (!scene || typeof scene !== 'object') return null
  const beats = getSceneBeats(scene as Record<string, unknown>)
  const index = beats.findIndex((beat) => beat.beatId === beatId)
  if (index < 0) return null
  const sequence = beats[index].sequenceIndex
  return (typeof sequence === 'number' && sequence >= 0 ? sequence : index) + 1
}

/** True when a segment's last generate failed on content policy. */
export function segmentWasPolicyBlocked(segment: {
  status?: string
  errorMessage?: string | null
  lastContentPolicyFailure?: unknown
} | null | undefined): boolean {
  if (!segment || segment.status !== 'ERROR') return false
  if (segment.lastContentPolicyFailure) return true
  return isContentPolicyFailureMessage(segment.errorMessage ?? '')
}
