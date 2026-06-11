import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  readBeatSfxAudio,
  resolveBeatSfxSlot,
  upsertBeatSfxCueOnScene,
} from '@/lib/script/deriveSfxFromSceneContent'
import type {
  ExpressVeoSfxItem,
  ResolveExpressVeoSfxResult,
} from '@/lib/sfx/expressVeoSfxTypes'

export interface ResolveExpressVeoSfxItemsOptions {
  regenerate?: boolean
}

/** Action beats with actionDescription that can receive Veo SFX. */
export function listSelectableActionBeats(
  scene: Record<string, unknown>
): Array<{ beatId: string; actionDescription: string }> {
  return getSceneBeats(scene)
    .filter((beat) => beat.kind === 'action' && !!beat.actionDescription?.trim())
    .map((beat) => ({
      beatId: beat.beatId,
      actionDescription: beat.actionDescription!.trim(),
    }))
}

export function beatHasSfxAudio(
  scene: Record<string, unknown>,
  beat: { beatId: string; actionDescription?: string; kind: string }
): boolean {
  if (beat.kind !== 'action') return false
  try {
    const slot = resolveBeatSfxSlot(scene, {
      beatId: beat.beatId,
      actionDescription: beat.actionDescription,
      kind: 'action',
    })
    return !!readBeatSfxAudio(scene, slot)
  } catch {
    return false
  }
}

export function resolveExpressVeoSfxItems(
  scene: Record<string, unknown>,
  beatIds: string[],
  options: ResolveExpressVeoSfxItemsOptions = {}
): ResolveExpressVeoSfxResult {
  const regenerate = !!options.regenerate
  const beats = getSceneBeats(scene).filter((b) => b.kind === 'action')
  const beatById = new Map(beats.map((b) => [b.beatId, b]))

  const items: ExpressVeoSfxItem[] = []
  const skipped: ResolveExpressVeoSfxResult['skipped'] = []
  const errors: string[] = []
  const workingScene: Record<string, unknown> = {
    ...scene,
    sfx: Array.isArray(scene.sfx) ? [...scene.sfx] : [],
    sfxAudio: Array.isArray(scene.sfxAudio) ? [...scene.sfxAudio] : [],
    sfxSourceMeta: Array.isArray(scene.sfxSourceMeta) ? [...scene.sfxSourceMeta] : [],
  }

  for (const beatId of beatIds) {
    const beat = beatById.get(beatId)
    if (!beat) {
      errors.push(`Unknown action beat: ${beatId}`)
      continue
    }

    const actionText = beat.actionDescription?.trim() ?? ''
    if (!actionText) {
      skipped.push({ beatId, reason: 'missing action description' })
      continue
    }

    if (beatHasSfxAudio(scene, beat) && !regenerate) {
      skipped.push({ beatId, reason: 'already has audio' })
      continue
    }

    let slot
    try {
      slot = upsertBeatSfxCueOnScene(workingScene, beat)
    } catch (err) {
      skipped.push({
        beatId,
        reason: err instanceof Error ? err.message : 'invalid beat slot',
      })
      continue
    }

    items.push({
      beatId,
      sfxIndex: slot.sfxIndex,
      sfxId: slot.sfxId,
      text: actionText,
      promptMode: 'actionBeat',
    })
  }

  return { items, skipped, errors }
}
