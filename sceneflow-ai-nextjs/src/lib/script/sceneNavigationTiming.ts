/**
 * Scene-navigator timing. Each active beat is one 10-second clip.
 * Script planning still uses AVG_BEAT_SECONDS (8) elsewhere.
 */

import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'

export const NAVIGATION_SECONDS_PER_BEAT = 10

export interface SceneNavigationMark {
  index: number
  beatCount: number
  durationSeconds: number
  startSeconds: number
  endSeconds: number
}

export function countActiveNavigationBeats(
  scene: Record<string, unknown> | null | undefined
): number {
  return getSceneBeats(scene).filter((beat) => !isBeatExcluded(beat)).length
}

export function sceneNavigationDurationSeconds(
  scene: Record<string, unknown> | null | undefined
): number {
  return countActiveNavigationBeats(scene) * NAVIGATION_SECONDS_PER_BEAT
}

/** Clock label `m:ss` with floored seconds. */
export function formatNavigationClock(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function buildSceneNavigationTimeline(
  scenes: Array<Record<string, unknown> | null | undefined>
): { marks: SceneNavigationMark[]; totalSeconds: number } {
  let cursor = 0
  const marks = scenes.map((scene, index) => {
    const beatCount = countActiveNavigationBeats(scene)
    const durationSeconds = beatCount * NAVIGATION_SECONDS_PER_BEAT
    const startSeconds = cursor
    const endSeconds = cursor + durationSeconds
    cursor = endSeconds
    return { index, beatCount, durationSeconds, startSeconds, endSeconds }
  })
  return { marks, totalSeconds: cursor }
}
