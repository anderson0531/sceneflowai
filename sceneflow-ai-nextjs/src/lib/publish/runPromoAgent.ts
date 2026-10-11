/**
 * After a promo shot plan exists, optimize the shots that still need
 * direction, draw the continuity plates those shots use, then produce
 * the clips, the narration, and the music.
 *
 * Shots that already have a clip are left alone. A shot with no Studio
 * segment is derived first. A still becomes image-to-video; otherwise
 * the clip is text-to-video. A failed continuity pass blocks every clip.
 */

import { CONCURRENCY_DEFAULTS, processWithConcurrency } from '@/lib/utils/concurrent-processor'

export type PromoAgentItemStatus = 'pending' | 'running' | 'done' | 'error'
export type PromoClipMethod = 'I2V' | 'T2V'

export interface PromoAgentShotInput {
  key: string
  sceneId: string
  beatId: string
  sceneIndex: number
  label: string
  durationSec: number
  frameUrl?: string
  hasClip: boolean
  segmentId?: string
  /** Rewrite base or policy-blocked direction before the clip is generated. */
  optimizeDirection?: boolean
  policyBlocked?: boolean
}

export interface PromoAgentRunDeps {
  upsertScene: () => Promise<void>
  ensureSegment: (shot: PromoAgentShotInput) => Promise<string>
  generateClip: (
    shot: PromoAgentShotInput,
    method: PromoClipMethod,
    segmentId: string
  ) => Promise<void>
  /** Direct Shot optimize. Only shots flagged optimizeDirection call it. */
  optimizeDirection?: (shot: PromoAgentShotInput) => Promise<void>
  /**
   * Draw missing wardrobe, location, and prop plates for this cut.
   * Runs once, after shot optimization and before any clip.
   */
  ensureContinuity?: () => Promise<void>
  generateNarration: () => Promise<void>
  generateMusic: () => Promise<void>
  onStatus: (key: string, status: PromoAgentItemStatus, error?: string) => void
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export async function runPromoAgent(
  shots: PromoAgentShotInput[],
  deps: PromoAgentRunDeps
): Promise<{ failed: number }> {
  await deps.upsertScene()

  const failedShots = new Set<string>()
  let failed = 0
  const optimizeShots = shots.filter(
    (shot) => !shot.hasClip && shot.optimizeDirection && deps.optimizeDirection
  )
  if (optimizeShots.length > 0 && deps.optimizeDirection) {
    const optimizeDirection = deps.optimizeDirection
    const optimized = await processWithConcurrency(
      optimizeShots.map((shot) => ({
        id: shot.key,
        execute: async () => {
          deps.onStatus(shot.key, 'running')
          await optimizeDirection(shot)
        },
      })),
      CONCURRENCY_DEFAULTS.VIDEO_GENERATION,
      undefined,
      false
    )
    for (const result of optimized) {
      if (result.status !== 'rejected') continue
      failed += 1
      failedShots.add(String(result.id))
      deps.onStatus(
        String(result.id),
        'error',
        errorMessage(result.error, 'Direction failed')
      )
    }
  }

  let continuityFailed = false
  if (deps.ensureContinuity) {
    deps.onStatus('continuity', 'running')
    try {
      await deps.ensureContinuity()
      deps.onStatus('continuity', 'done')
    } catch (error) {
      continuityFailed = true
      failed += 1
      deps.onStatus('continuity', 'error', errorMessage(error, 'Continuity plates failed'))
      for (const shot of shots) {
        if (shot.hasClip || failedShots.has(shot.key)) continue
        deps.onStatus(shot.key, 'error', 'Continuity plates were not ready')
      }
    }
  }

  if (!continuityFailed) {
    const results = await processWithConcurrency(
      shots.map((shot) => ({
        id: shot.key,
        execute: async () => {
          if (shot.hasClip) {
            deps.onStatus(shot.key, 'done')
            return
          }
          if (failedShots.has(shot.key)) return
          deps.onStatus(shot.key, 'running')
          try {
            const segmentId = shot.segmentId?.trim() || (await deps.ensureSegment(shot))
            const method: PromoClipMethod = shot.frameUrl?.trim() ? 'I2V' : 'T2V'
            await deps.generateClip(shot, method, segmentId)
            deps.onStatus(shot.key, 'done')
          } catch (error) {
            deps.onStatus(shot.key, 'error', errorMessage(error, 'Clip failed'))
            throw error
          }
        },
      })),
      CONCURRENCY_DEFAULTS.VIDEO_GENERATION,
      undefined,
      false
    )
    failed += results.filter((result) => result.status === 'rejected').length
  }

  deps.onStatus('narration', 'running')
  try {
    await deps.generateNarration()
    deps.onStatus('narration', 'done')
  } catch (error) {
    failed += 1
    deps.onStatus('narration', 'error', errorMessage(error, 'Narration failed'))
  }

  deps.onStatus('music', 'running')
  try {
    await deps.generateMusic()
    deps.onStatus('music', 'done')
  } catch (error) {
    failed += 1
    deps.onStatus('music', 'error', errorMessage(error, 'Music failed'))
  }

  return { failed }
}
