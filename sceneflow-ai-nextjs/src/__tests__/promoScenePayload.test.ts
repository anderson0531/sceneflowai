import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  parsePromoSceneResponse,
  slimClientPromoSceneForRequest,
  slimPromoProductionStateForRequest,
} from '@/lib/publish/promoSceneApi'
import {
  captureSaveBaselineFromMetadata,
  createEmptySaveBaselineSnapshot,
  diffProjectPutAgainstBaseline,
  syncSaveBaselineAfterPromoMutation,
} from '@/lib/projects/deltaProjectSave'

describe('parsePromoSceneResponse', () => {
  it('converts Vercel plain-text 413 Request Entity Too Large into a clear error instead of JSON SyntaxError', () => {
    expect(() =>
      parsePromoSceneResponse(
        413,
        'Request Entity Too Large\nFUNCTION_PAYLOAD_TOO_LARGE',
        'Promo scene action failed'
      )
    ).toThrow(/exceeded server size limit \(HTTP 413\)/i)
  })

  it('catches FUNCTION_PAYLOAD_TOO_LARGE even when surfaced with HTTP 500', () => {
    expect(() =>
      parsePromoSceneResponse(
        500,
        'An error occurred with your deployment\nFUNCTION_PAYLOAD_TOO_LARGE',
        'Promo scene action failed'
      )
    ).toThrow(/exceeded server size limit \(HTTP 413\)/i)
  })

  it('handles non-JSON HTML gateway errors cleanly without Unexpected token exceptions', () => {
    expect(() =>
      parsePromoSceneResponse(
        504,
        '<html><body>504 Gateway Timeout</body></html>',
        'Failed to rebuild promo scene'
      )
    ).toThrow('Failed to rebuild promo scene (HTTP 504)')
  })

  it('surfaces structured JSON server error messages on non-2xx responses', () => {
    expect(() =>
      parsePromoSceneResponse(
        400,
        JSON.stringify({ error: 'Generate a beat plan before creating the promo scene' }),
        'Promo scene action failed'
      )
    ).toThrow('Generate a beat plan before creating the promo scene')
  })

  it('parses slim 200 JSON responses', () => {
    const payload = {
      success: true,
      promoScene: { id: 'promo-1', cinematicType: 'promo' },
      promoProductionSeed: { isSegmented: true, segments: [] },
      createNew: false,
    }
    const parsed = parsePromoSceneResponse(200, JSON.stringify(payload))
    expect(parsed.success).toBe(true)
    expect(parsed.promoScene?.id).toBe('promo-1')
  })
})

describe('slimClientPromoSceneForRequest & slimPromoProductionStateForRequest', () => {
  it('retains only lightweight promo metadata and omits heavy beat/frame blobs', () => {
    const heavyPromoScene = {
      id: 'promo-trailer-1',
      promoId: 'promo-trailer-1',
      cinematicType: 'promo',
      campaignName: 'Official Trailer',
      campaignPreset: 'theatrical_trailer',
      promoAspect: '16:9',
      duration: 32,
      musicAudio: 'https://blob.example/music.mp3',
      dialogueAudio: { en: [{ audioUrl: 'https://blob.example/vo.mp3', character: 'NARRATOR' }] },
      promoBeatPlan: [{ id: 'b1', beatIndex: 0, durationSec: 4, kind: 'clip' }],
      // Heavy fields that must NOT be sent
      beats: Array.from({ length: 20 }, (_, i) => ({
        id: `beat-${i}`,
        prompt: 'x'.repeat(20_000),
      })),
      imageUrl: 'data:image/png;base64,' + 'A'.repeat(100_000),
    }

    const slim = slimClientPromoSceneForRequest(heavyPromoScene)
    expect(slim).toBeDefined()
    expect(slim?.id).toBe('promo-trailer-1')
    expect(slim?.musicAudio).toBe('https://blob.example/music.mp3')
    expect(slim?.dialogueAudio).toBeDefined()
    expect(slim?.promoBeatPlan).toHaveLength(1)
    expect(slim).not.toHaveProperty('beats')
    expect(slim).not.toHaveProperty('imageUrl')
    expect(JSON.stringify(slim).length).toBeLessThan(2_000)
  })

  it('drops slimmed production state if serialized size exceeds safety ceiling', () => {
    const hugeState: Record<string, any> = {}
    for (let i = 0; i < 40; i++) {
      hugeState[`scene-${i}`] = {
        segments: Array.from({ length: 25 }, (_, j) => ({
          segmentId: `seg-${i}-${j}`,
          sequenceIndex: j,
          activeAssetUrl: `https://blob.example/${'v'.repeat(180)}/${i}/${j}.mp4`,
          startTime: j * 4,
          endTime: (j + 1) * 4,
        })),
      }
    }

    expect(slimPromoProductionStateForRequest(hugeState, 5_000)).toBeUndefined()
    const allowed = slimPromoProductionStateForRequest(hugeState, 500_000)
    expect(allowed).toBeDefined()
  })
})

describe('syncSaveBaselineAfterPromoMutation', () => {
  it('keeps client save baseline synchronized after server promo upsert and delete so subsequent saves are no-ops', () => {
    const storyScenes = Array.from({ length: 25 }, (_, i) => ({
      id: `scene-${i + 1}`,
      sceneNumber: i + 1,
      heading: `INT. LOCATION ${i + 1} - NIGHT`,
      action: `Action in scene ${i + 1}`,
    }))
    const initialPublishing = {
      streams: [],
      youtubeByLanguage: {},
      promo: { beatPlan: [], targetDurationSec: 30 },
    }
    const initialMeta = {
      visionPhase: {
        script: { script: { scenes: storyScenes } },
        publishing: initialPublishing,
        production: {
          scenes: {
            'scene-1': { isSegmented: true, segments: [{ segmentId: 's1', sequenceIndex: 0 }] },
          },
        },
      },
    }

    const baseline = captureSaveBaselineFromMetadata(initialMeta)
    expect(baseline.initialized).toBe(true)

    const promoScene = {
      id: 'promo-1',
      promoId: 'promo-1',
      cinematicType: 'promo',
      sceneNumber: 1,
      heading: 'PROMO — OFFICIAL TRAILER',
    }
    const promoProductionSeed = {
      isSegmented: true,
      segments: [{ segmentId: 'promo-seg-1', sequenceIndex: 0, status: 'COMPLETE' }],
    }
    const nextPublishing = {
      ...initialPublishing,
      promo: { beatPlan: [{ id: 'b1', beatIndex: 0, durationSec: 4, kind: 'clip' as const }], targetDurationSec: 30 },
    }
    const scenesWithPromo = [promoScene, ...storyScenes]

    syncSaveBaselineAfterPromoMutation(baseline, {
      fullScenesAfterSave: scenesWithPromo,
      promoScene,
      promoProductionSeed,
      publishing: nextPublishing as any,
    })

    const afterUpsertDiff = diffProjectPutAgainstBaseline(
      {
        persistProduction: true,
        metadata: {
          visionPhase: {
            script: { script: { scenes: scenesWithPromo } },
            publishing: nextPublishing,
            production: {
              scenes: {
                'scene-1': { isSegmented: true, segments: [{ segmentId: 's1', sequenceIndex: 0 }] },
                'promo-1': promoProductionSeed,
              },
            },
          },
        },
      },
      baseline
    )

    expect(afterUpsertDiff.noOp).toBe(true)
    expect(afterUpsertDiff.changedProductionScenes).toHaveLength(0)

    // Now simulate server-side promo delete
    syncSaveBaselineAfterPromoMutation(baseline, {
      fullScenesAfterSave: storyScenes,
      deletedPromoId: 'promo-1',
      publishing: initialPublishing as any,
    })

    const afterDeleteDiff = diffProjectPutAgainstBaseline(
      {
        persistProduction: true,
        metadata: {
          visionPhase: {
            script: { script: { scenes: storyScenes } },
            publishing: initialPublishing,
            production: {
              scenes: {
                'scene-1': { isSegmented: true, segments: [{ segmentId: 's1', sequenceIndex: 0 }] },
              },
            },
          },
        },
      },
      baseline
    )

    expect(afterDeleteDiff.noOp).toBe(true)
    expect(afterDeleteDiff.changedProductionScenes).toHaveLength(0)
  })

  it('safely ignores uninitialized baselines', () => {
    const empty = createEmptySaveBaselineSnapshot()
    syncSaveBaselineAfterPromoMutation(empty, {
      promoScene: { id: 'promo-1' },
      deletedPromoId: 'promo-0',
    })
    expect(empty.initialized).toBe(false)
  })
})

describe('Promo Rebuild payload & accessibility source guards', () => {
  const root = path.resolve(__dirname, '..')

  it('ensures client callers never send full scenes array to /api/publish/promo/scene', () => {
    const tabSrc = fs.readFileSync(
      path.join(root, 'components/publishing/PublishingPromoTab.tsx'),
      'utf8'
    )
    const directorSrc = fs.readFileSync(
      path.join(root, 'components/publishing/PromoPlanDirectorDialog.tsx'),
      'utf8'
    )
    expect(tabSrc).toContain('parsePromoSceneResponse')
    expect(tabSrc).toContain('slimClientPromoSceneForRequest')
    expect(tabSrc).not.toMatch(/body:\s*JSON\.stringify\(\{\s*projectId,\s*action,\s*scenes\b/)

    expect(directorSrc).toContain('parsePromoSceneResponse')
    expect(directorSrc).not.toMatch(/scenes:\s*scenes\.length/)
  })

  it('ensures /api/publish/promo/scene commits under row lock and omits multi-MB scenes/metadata from responses', () => {
    const routeSrc = fs.readFileSync(
      path.join(root, 'app/api/publish/promo/scene/route.ts'),
      'utf8'
    )
    expect(routeSrc).toContain('commitPromoMetadataMutation')
    expect(routeSrc).toContain('transaction.LOCK.UPDATE')
    expect(routeSrc).not.toMatch(/NextResponse\.json\(\{[^}]*\bmetadata\s*,/s)
  })

  it('includes DialogDescription in PromoStudioDialog and PublishingLibraryDialog', () => {
    const promoDialogSrc = fs.readFileSync(
      path.join(root, 'components/publishing/PromoStudioDialog.tsx'),
      'utf8'
    )
    const libDialogSrc = fs.readFileSync(
      path.join(root, 'components/publishing/PublishingLibraryDialog.tsx'),
      'utf8'
    )
    expect(promoDialogSrc).toContain('<DialogDescription')
    expect(libDialogSrc).toContain('<DialogDescription')
  })
})
