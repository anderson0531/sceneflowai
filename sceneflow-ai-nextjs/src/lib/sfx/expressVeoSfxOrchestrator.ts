import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import { trackCost } from '@/lib/credits/costTracking'
import { CreditService } from '@/services/CreditService'
import { upsertBeatSfxCueOnScene } from '@/lib/script/deriveSfxFromSceneContent'
import { generateVeoSfxAudio } from '@/lib/sfx/veoSfx'
import { persistSceneSfxAudioAtomic } from '@/lib/sfx/persistSceneSfxAudio'
import { resolveExpressVeoSfxItems } from '@/lib/sfx/resolveExpressVeoSfxItems'
import type {
  ExpressVeoSfxEmit,
  ExpressVeoSfxOptions,
  ExpressVeoSfxRunResult,
} from '@/lib/sfx/expressVeoSfxTypes'
import { getExpressVeoSfxConcurrency, VeoSfxTrafficCop } from '@/lib/sfx/veoSfxTrafficCop'
import { processWithConcurrency } from '@/lib/utils/concurrent-processor'

const VEO_SFX_CREDIT_COST = VIDEO_CREDITS.VEO_FAST

function locateScene(
  project: { metadata?: Record<string, unknown> },
  sceneIndex: number
): Record<string, unknown> | null {
  const metadata = project.metadata || {}
  const visionPhase = (metadata.visionPhase ?? {}) as Record<string, unknown>
  const script = (visionPhase.script ?? {}) as Record<string, unknown>
  const nestedScript = script?.script as Record<string, unknown> | undefined
  const scenes =
    (Array.isArray(nestedScript?.scenes) ? nestedScript!.scenes : null) ||
    (Array.isArray(script?.scenes) ? script.scenes : null)
  if (!Array.isArray(scenes) || sceneIndex >= scenes.length) return null
  return scenes[sceneIndex] as Record<string, unknown>
}

export async function runExpressVeoSfx(
  project: { metadata?: Record<string, unknown> },
  options: ExpressVeoSfxOptions,
  emit: ExpressVeoSfxEmit
): Promise<ExpressVeoSfxRunResult> {
  const scene = locateScene(project, options.sceneIndex)
  if (!scene) {
    throw new Error(`Scene ${options.sceneIndex + 1} not found`)
  }

  const resolved = resolveExpressVeoSfxItems(scene, options.beatIds, {
    regenerate: options.regenerate,
  })

  if (resolved.errors.length > 0) {
    throw new Error(resolved.errors.join('; '))
  }

  const items = resolved.items
  const skippedCount = resolved.skipped.length

  if (items.length === 0) {
    emit({
      type: 'complete',
      success: 0,
      failed: 0,
      skipped: skippedCount,
    })
    return { success: 0, failed: 0, skipped: skippedCount }
  }

  const hasCredits = await CreditService.ensureCredits(
    options.userId,
    VEO_SFX_CREDIT_COST * items.length
  )
  if (!hasCredits) {
    throw new Error(
      `Insufficient credits for Express Veo SFX (${items.length} × ${VEO_SFX_CREDIT_COST} credits required)`
    )
  }

  emit({
    type: 'start',
    sceneIndex: options.sceneIndex,
    total: items.length,
    skipped: skippedCount,
  })

  const trafficCop = new VeoSfxTrafficCop({
    max: getExpressVeoSfxConcurrency(),
    onThrottle: (max, cooldownMs) => emit({ type: 'throttle', max, cooldownMs }),
  })

  let success = 0
  let failed = 0

  const results = await processWithConcurrency(
    items.map((item) => ({
      id: item.beatId,
      execute: async () => {
        emit({ type: 'item-start', beatId: item.beatId, sfxIndex: item.sfxIndex })

        try {
          await trafficCop.run(async () => {
            upsertBeatSfxCueOnScene(scene, {
              beatId: item.beatId,
              actionDescription: item.text,
              kind: 'action',
            })

            const result = await generateVeoSfxAudio({
              text: item.text,
              projectId: options.projectId,
              sfxId: item.sfxId,
              sfxIndex: item.sfxIndex,
              clipDurationSeconds: options.clipDurationSeconds,
              promptMode: item.promptMode,
            })

            const attribution = {
              source: 'veo' as const,
              clipDurationSeconds: result.clipDurationSeconds,
              veoQuality: 'fast' as const,
              promptMode: 'actionBeat' as const,
            }

            await persistSceneSfxAudioAtomic({
              projectId: options.projectId,
              sceneIndex: options.sceneIndex,
              audioUrl: result.url,
              sfxIndex: item.sfxIndex,
              sfxAttribution: attribution,
              beatId: item.beatId,
              beatDescription: item.text,
            })

            try {
              await CreditService.charge(
                options.userId,
                VEO_SFX_CREDIT_COST,
                'ai_usage',
                item.sfxId,
                {
                  operation: 'veo_sfx_express',
                  projectId: options.projectId,
                  beatId: item.beatId,
                  sfxIndex: item.sfxIndex,
                  clipDurationSeconds: result.clipDurationSeconds,
                  promptMode: item.promptMode,
                }
              )
              await trackCost(options.userId, 'veo_sfx', VEO_SFX_CREDIT_COST, {
                projectId: options.projectId,
              }).catch(() => null)
            } catch (chargeError) {
              console.error('[Express Veo SFX] Failed to charge credits:', chargeError)
            }

            emit({
              type: 'item-done',
              beatId: item.beatId,
              sfxIndex: item.sfxIndex,
              url: result.url,
              gcsPath: result.gcsPath,
              attribution,
            })
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          emit({
            type: 'item-error',
            beatId: item.beatId,
            sfxIndex: item.sfxIndex,
            error: message,
          })
          throw err
        }
      },
    })),
    getExpressVeoSfxConcurrency(),
    undefined,
    false
  )

  for (const row of results) {
    if (row.status === 'fulfilled') success++
    else failed++
  }

  emit({
    type: 'complete',
    success,
    failed,
    skipped: skippedCount,
  })

  return { success, failed, skipped: skippedCount }
}
