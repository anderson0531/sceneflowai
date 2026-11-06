import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import type { PromoShotCatalogEntry } from '@/lib/publish/promoShotCatalog'
import {
  buildPromoSceneFromPlan,
  hydratePromoSceneWithSharedShots,
  promoSourceShotKeys,
  syncPromoSharedBeatsToSourceScenes,
} from '@/lib/publish/buildPromoScene'
import {
  movePromoShot,
  placePromoShot,
  promoNarrationStartSec,
  promoShotIncluded,
  promoStudioWatermarkPayload,
  promoWatermarkEnabled,
  sanitizePromoTimeline,
  withPromoShotDuration,
  withPromoShotIncluded,
} from '@/lib/publish/promoTimeline'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

function shot(sceneIndex: number, beatId: string, durationSec = 5): PromoShotCatalogEntry {
  return {
    sceneId: `scene-${sceneIndex}`,
    sceneIndex,
    beatId,
    beatIndex: 0,
    label: beatId,
    hero: false,
    hasStill: false,
    hasClip: false,
    durationSec,
  }
}

function row(sceneIndex: number, beatId: string, durationSec = 5): PromoTrailerBeatPlan {
  return {
    sceneId: `scene-${sceneIndex}`,
    beatId,
    sceneIndex,
    startSec: 0,
    endSec: durationSec,
    durationSec,
    score: 1,
  }
}

describe('promo timeline edits', () => {
  const catalog = [shot(0, 'a'), shot(0, 'b'), shot(0, 'c'), shot(1, 'd', 6)]

  it('moves a shot that is already on the timeline to the requested position', () => {
    const next = placePromoShot(
      [row(0, 'a'), row(0, 'b'), row(0, 'c')],
      shot(0, 'c'),
      2
    )
    expect(next.map((beat) => beat.beatId)).toEqual(['a', 'c', 'b'])
  })

  it('inserts Scene 1 Shot into position 2', () => {
    const next = placePromoShot([row(0, 'a'), row(0, 'b'), row(0, 'c')], catalog[3]!, 2)
    expect(next.map((beat) => beat.beatId)).toEqual(['a', 'd', 'b', 'c'])
    expect(next[1]?.durationSec).toBe(6)
    expect(next[1]?.endSec).toBe(6)
  })

  it('appends when the position is past the end', () => {
    const next = placePromoShot([row(0, 'a')], catalog[1]!, 9)
    expect(next.map((beat) => beat.beatId)).toEqual(['a', 'b'])
  })

  it('moves a shot earlier or later and ignores the ends', () => {
    const plan = [row(0, 'a'), row(0, 'b'), row(0, 'c')]
    expect(movePromoShot(plan, 2, 0).map((beat) => beat.beatId)).toEqual(['c', 'a', 'b'])
    expect(movePromoShot(plan, 0, 1).map((beat) => beat.beatId)).toEqual(['b', 'a', 'c'])
    expect(movePromoShot(plan, 0, -1)).toBe(plan)
    expect(movePromoShot(plan, 2, 2)).toBe(plan)
  })

  it('starts narration on the chosen included shot', () => {
    const plan = [row(0, 'a', 5), withPromoShotIncluded(row(0, 'b', 4), false), row(0, 'c', 6)]
    expect(promoNarrationStartSec(plan, '0:c')).toBe(5)
    expect(promoNarrationStartSec(plan, '0:a')).toBe(0)
    expect(promoNarrationStartSec(plan, '0:b')).toBe(0)
    expect(promoNarrationStartSec(plan, undefined)).toBe(0)
  })

  it('keeps a 4s length and an exclude flag without the planner snap', () => {
    const edited = withPromoShotIncluded(withPromoShotDuration(row(0, 'a', 5), 4), false)
    expect(edited.durationSec).toBe(4)
    expect(edited.endSec).toBe(4)
    expect(promoShotIncluded(edited)).toBe(false)
    expect(promoShotIncluded(row(0, 'b'))).toBe(true)

    const saved = sanitizePromoTimeline([edited, row(0, 'b', 5.4)], catalog)
    expect(saved?.map((beat) => beat.durationSec)).toEqual([4, 5])
    expect(saved?.[0]?.included).toBe(false)
    expect(saved?.[1]?.included).toBeUndefined()
    expect(sanitizePromoTimeline([row(3, 'missing')], catalog)).toBeNull()
  })
})

describe('promo watermark', () => {
  it('defaults to the SceneFlow Studio mark and can be turned off', () => {
    expect(promoWatermarkEnabled(undefined)).toBe(true)
    expect(promoWatermarkEnabled(false)).toBe(false)
    expect(promoStudioWatermarkPayload().text).toBe('SceneFlow Studio')
    expect(promoStudioWatermarkPayload().type).toBe('text')
  })

  it('burns the mark into the next promo render unless the switch is off', () => {
    const route = readFileSync(
      path.join(process.cwd(), 'src/app/api/publish/trailer/render/route.ts'),
      'utf8'
    )
    const preview = readFileSync(
      path.join(process.cwd(), 'src/components/publishing/PromoCutPreview.tsx'),
      'utf8'
    )
    const tab = readFileSync(
      path.join(process.cwd(), 'src/components/publishing/PublishingPromoTab.tsx'),
      'utf8'
    )
    expect(route).toContain('promoStudioWatermarkPayload()')
    expect(route).toContain('watermarkEnabled === false')
    expect(route).toContain('promoShotIncluded')
    expect(preview).toContain('promoStudioWatermarkPayload().text')
    expect(tab).toContain('promo-campaign-switcher')
    expect(tab).toContain('Scene\n                  <select')
    expect(tab).toContain('placePromoShot')
    expect(tab).toContain('movePromoShot')
    expect(tab).toContain('Move shot earlier')
    expect(tab).toContain('Move shot later')
    expect(tab).toContain('{index + 1}')
    expect(tab).toContain("included ? 'Exclude' : 'Include'")
    expect(tab).toContain('Edit shot timing in Mixer')
    expect(tab).not.toContain('title="Shot length in seconds"')
    expect(tab).toContain('w-16')
    expect(tab).not.toContain('w-12 rounded border border-zinc-700')
  })

  it('removes excluded shot references from promo scene beats, segments, and source shot keys', () => {
    const plan: PromoTrailerBeatPlan[] = [
      row(0, 'bt_1', 5),
      withPromoShotIncluded(row(0, 'bt_2', 5), false),
      row(1, 'bt_3', 5),
    ]
    const { scene, productionSeed } = buildPromoSceneFromPlan({
      beatPlan: plan,
      targetDurationSec: 15,
      projectTitle: 'Test Film',
      narrationLine: 'A world on the edge.',
    })

    expect(scene.beats.map((b) => `${b.sourceSceneIndex}:${b.sourceBeatId}`)).toEqual([
      '0:bt_1',
      '1:bt_3',
    ])
    expect(productionSeed.segments).toHaveLength(2)

    const reconciledBeats = getSceneBeats(scene as unknown as Record<string, unknown>)
    expect(
      reconciledBeats.map(
        (b) =>
          `${(b as { sourceSceneIndex?: number }).sourceSceneIndex}:${(b as { sourceBeatId?: string }).sourceBeatId}`
      )
    ).toEqual(['0:bt_1', '1:bt_3'])

    const sourceScenes = [
      {
        id: 'scene-0',
        beats: [
          { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Shot 1' },
          { beatId: 'bt_2', sequenceIndex: 1, kind: 'action', actionDescription: 'Shot 2' },
        ],
      },
      {
        id: 'scene-1',
        beats: [
          { beatId: 'bt_3', sequenceIndex: 0, kind: 'action', actionDescription: 'Shot 3' },
        ],
      },
      scene,
    ]

    const shotKeys = promoSourceShotKeys(sourceScenes)
    expect(shotKeys.has('0:bt_1')).toBe(true)
    expect(shotKeys.has('0:bt_2')).toBe(false)
    expect(shotKeys.has('1:bt_3')).toBe(true)

    // Even if a legacy promo scene still had the excluded shot in scene.beats, hydration and sync strip it
    const legacyPromoWithExcludedBeat = {
      ...scene,
      beats: [
        ...scene.beats,
        {
          beatId: 'bt_promo_0_bt_2_legacy',
          sequenceIndex: 2,
          kind: 'action' as const,
          actionDescription: 'Excluded shot',
          sourceSceneId: 'scene-0',
          sourceBeatId: 'bt_2',
          sourceSceneIndex: 0,
        },
      ],
    }
    const hydrated = hydratePromoSceneWithSharedShots(
      legacyPromoWithExcludedBeat as unknown as Record<string, unknown>,
      sourceScenes,
      {}
    )
    const hydratedBeats = (hydrated.scene.beats || []) as Array<{
      sourceSceneIndex?: number
      sourceBeatId?: string
    }>
    expect(hydratedBeats.map((b) => `${b.sourceSceneIndex}:${b.sourceBeatId}`)).toEqual([
      '0:bt_1',
      '1:bt_3',
    ])
    expect(hydrated.productionData?.segments).toHaveLength(2)

    const synced = syncPromoSharedBeatsToSourceScenes([
      sourceScenes[0],
      sourceScenes[1],
      legacyPromoWithExcludedBeat,
    ])
    const syncedPromo = synced[2] as {
      beats: Array<{ sourceSceneIndex?: number; sourceBeatId?: string }>
    }
    expect(syncedPromo.beats.map((b) => `${b.sourceSceneIndex}:${b.sourceBeatId}`)).toEqual([
      '0:bt_1',
      '1:bt_3',
    ])
  })
})
