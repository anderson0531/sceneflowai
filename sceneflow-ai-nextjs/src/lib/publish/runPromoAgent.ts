/**
 * After a promo shot plan exists, produce the clips it still needs,
 * then the narration and the music.
 *
 * Shots that already have a clip are left alone. A shot with no Studio
 * segment is derived first. A still becomes image-to-video; otherwise
 * the clip is text-to-video.
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

  const results = await processWithConcurrency(
    shots.map((shot) => ({
      id: shot.key,
      execute: async () => {
        if (shot.hasClip) {
          deps.onStatus(shot.key, 'done')
          return
        }
        deps.onStatus(shot.key, 'running')
        try {
          if (shot.optimizeDirection && deps.optimizeDirection) {
            await deps.optimizeDirection(shot)
          }
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

  let failed = results.filter((result) => result.status === 'rejected').length

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
