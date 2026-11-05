import { describe, it, expect } from 'vitest'
import { planPromoTrailer } from '@/lib/publish/trailerPlanner'
import { buildPromoShotCatalog, slimPromoProductionState } from '@/lib/publish/promoShotCatalog'
import { promoPlanWithLiveMedia, resolvePromoBeatMedia } from '@/lib/publish/promoBeatMedia'
import {
  buildPromoSceneFromPlan,
  formatPromoSourceBadge,
  formatPromoSourceLongLabel,
  isPromoCinematicScene,
  filmSceneIndices,
  findPromoScenes,
  hydratePromoSceneWithSharedShots,
  PROMO_CAMPAIGN_PRESETS,
  removePromoSceneFromScenes,
  syncPromoSharedBeatsToSourceScenes,
  upsertPromoSceneInScenes,
} from '@/lib/publish/buildPromoScene'
import { buildBeatVideoClips } from '@/lib/scene/buildBeatVideoClips'
import { buildExpressBeatFrameItems } from '@/lib/storyboard/expressBeatFrameProgress'
import { applyBeatDirectionToScenes } from '@/lib/vision/saveBeatDirection'
import { ensureSceneBeats, getSceneBeats } from '@/lib/script/beatMigration'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

describe('trailerPlanner', () => {
  const scenes = [
    {
      id: 'scene-0',
      heading: 'INT. ROOM - DAY',
      action: 'A tense conversation unfolds with rising stakes.',
      dialogue: [{ character: 'ALEX', line: 'We need to go now.' }],
      beats: [
        {
          beatId: 'b0',
          sequenceIndex: 0,
          kind: 'dialogue',
          line: 'We need to go now.',
          storyboardImageUrl: 'https://example.com/f0.png',
          beatRole: 'opening',
        },
        {
          beatId: 'b1',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Door slams',
          storyboardImageUrl: 'https://example.com/f1.png',
          beatRole: 'climax',
        },
      ],
    },
    {
      id: 'scene-1',
      heading: 'EXT. STREET - NIGHT',
      action: 'Chase through rain-soaked streets.',
      dialogue: [{ character: 'ALEX', line: 'Run!' }],
      beats: [
        {
          beatId: 'b2',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Sprint through rain',
          storyboardImageUrl: 'https://example.com/f2.png',
          beatRole: 'progression',
        },
        {
          beatId: 'b3',
          sequenceIndex: 1,
          kind: 'dialogue',
          line: 'Run!',
          storyboardImageUrl: 'https://example.com/f3.png',
        },
      ],
    },
    {
      id: 'scene-2',
      heading: 'EXT. ROOFTOP - DAWN',
      action: 'Final confrontation at sunrise.',
      dialogue: [{ character: 'ALEX', line: 'It ends here.' }],
      beats: [
        {
          beatId: 'b4',
          sequenceIndex: 0,
          kind: 'dialogue',
          line: 'It ends here.',
          storyboardImageUrl: 'https://example.com/f4.png',
          beatRole: 'climax',
        },
        {
          beatId: 'b5',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Sunrise silhouette',
          storyboardImageUrl: 'https://example.com/f5.png',
        },
      ],
    },
  ]

  it('selects beats totaling between 30 and 60 seconds for 60s target', () => {
    const result = planPromoTrailer({
      scenes,
      targetDurationSec: 60,
      sceneProductionState: {
        'scene-0': {
          segments: [
            {
              beatId: 'b1',
              activeAssetUrl: 'https://example.com/v1.mp4',
              startTime: 0,
              endTime: 5,
            },
          ],
        },
      },
    })
    expect(result.beatPlan.length).toBeGreaterThan(0)
    expect(result.totalDurationSec).toBeGreaterThanOrEqual(30)
    expect(result.totalDurationSec).toBeLessThanOrEqual(60)
    expect(result.targetDurationSec).toBe(60)
  })

  it('accepts a 120 second target and clamps anything longer', () => {
    expect(planPromoTrailer({ scenes, targetDurationSec: 120 }).targetDurationSec).toBe(120)
    expect(planPromoTrailer({ scenes, targetDurationSec: 180 }).targetDurationSec).toBe(120)
  })

  it('orders a trailer arc and still keeps a produced clip', () => {
    const result = planPromoTrailer({
      scenes,
      targetDurationSec: 45,
      sceneProductionState: {
        'scene-2': {
          segments: [
            {
              beatId: 'b4',
              activeAssetUrl: 'https://example.com/climax.mp4',
              startTime: 0,
              endTime: 6,
            },
          ],
        },
      },
    })
    const withVideo = result.beatPlan.filter((b) => b.videoUrl)
    expect(withVideo.length).toBeGreaterThan(0)
    const openingAt = result.beatPlan.findIndex((b) => b.beatRole === 'opening')
    const climaxAt = result.beatPlan.findIndex((b) => b.beatRole === 'climax')
    expect(openingAt).toBeGreaterThanOrEqual(0)
    expect(climaxAt).toBeGreaterThan(openingAt)
    expect(result.beatPlan[0]?.trailerRole).toBe('hook')
    const ids = result.beatPlan.map((b) => `${b.sceneIndex}:${b.beatId}`)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('lets an unproduced climax outrank weak existing clips', () => {
    const fillers = Array.from({ length: 10 }, (_, i) => ({
      id: `fill-${i}`,
      heading: `INT. HALL ${i}`,
      beats: [
        {
          beatId: `fill-${i}`,
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: `Walk ${i}`,
        },
      ],
    }))
    const result = planPromoTrailer({
      targetDurationSec: 30,
      scenes: [
        ...fillers,
        {
          id: 'payoff',
          heading: 'EXT. ROOF - DAWN',
          beats: [
            {
              beatId: 'payoff',
              sequenceIndex: 0,
              kind: 'dialogue',
              line: 'It ends here.',
              beatRole: 'climax',
            },
          ],
        },
      ],
      sceneProductionState: Object.fromEntries(
        fillers.map((scene) => [
          scene.id,
          {
            segments: [
              {
                beatId: scene.beats[0]!.beatId,
                activeAssetUrl: `https://example.com/${scene.id}.mp4`,
                startTime: 0,
                endTime: 5,
              },
            ],
          },
        ])
      ),
    })
    const payoff = result.beatPlan.find((beat) => beat.beatId === 'payoff')
    expect(payoff).toBeDefined()
    expect(payoff?.videoUrl).toBeUndefined()
    expect(payoff?.frameUrl).toBeUndefined()
    expect(result.beatPlan.some((beat) => beat.beatId === 'fill-9')).toBe(false)
    expect(result.beatPlan.some((beat) => beat.videoUrl)).toBe(true)
  })

  it('prioritizes hero beat pins', () => {
    const withHero = planPromoTrailer({
      scenes,
      heroBeatIds: ['0:b0'],
      targetDurationSec: 45,
    })
    expect(withHero.beatPlan.some((b) => b.beatId === 'b0')).toBe(true)
  })

  it('respects audience resonance scene scores', () => {
    const result = planPromoTrailer({
      scenes,
      sceneScores: { 2: 95, 0: 20, 1: 50 },
      targetDurationSec: 45,
    })
    const highScoreBeats = result.beatPlan.filter((b) => b.sceneIndex === 2)
    expect(highScoreBeats.length).toBeGreaterThan(0)
  })

  it('skips existing promo scenes as candidates', () => {
    const withPromo = [
      ...scenes,
      {
        id: 'promo-1',
        cinematicType: 'promo',
        heading: 'PROMO TRAILER',
        beats: [
          {
            beatId: 'promo-beat',
            sequenceIndex: 0,
            kind: 'action',
            storyboardImageUrl: 'https://example.com/promo.png',
          },
        ],
      },
    ]
    const result = planPromoTrailer({ scenes: withPromo, targetDurationSec: 45 })
    expect(result.beatPlan.every((b) => b.sceneId !== 'promo-1')).toBe(true)
  })
})

describe('buildPromoShotCatalog', () => {
  it('lists shots that have no still and no clip, and skips promo and excluded shots', () => {
    const catalog = buildPromoShotCatalog({
      scenes: [
        {
          id: 'flat',
          heading: 'INT. LAB - NIGHT',
          action: 'The core overloads.',
          imageUrl: 'https://example.com/lab.png',
        },
        {
          id: 'bare',
          beats: [
            {
              beatId: 'bare',
              sequenceIndex: 0,
              kind: 'action',
              actionDescription: 'Silence',
            },
          ],
        },
        {
          id: 'mixed',
          beats: [
            {
              beatId: 'keep',
              sequenceIndex: 0,
              kind: 'action',
              actionDescription: 'Stay',
            },
            {
              beatId: 'gone',
              sequenceIndex: 1,
              kind: 'action',
              actionDescription: 'Skip',
              excluded: true,
            },
          ],
        },
        {
          id: 'promo',
          cinematicType: 'promo',
          heading: 'PROMO TRAILER',
          beats: [
            {
              beatId: 'promo-beat',
              sequenceIndex: 0,
              kind: 'action',
              actionDescription: 'Trailer',
            },
          ],
        },
      ],
    })

    const flat = catalog.find((shot) => shot.sceneId === 'flat')
    expect(flat?.hasStill).toBe(true)
    expect(flat?.hasClip).toBe(false)
    const bare = catalog.find((shot) => shot.beatId === 'bare')
    expect(bare?.hasStill).toBe(false)
    expect(bare?.hasClip).toBe(false)
    expect(catalog.some((shot) => shot.beatId === 'keep')).toBe(true)
    expect(catalog.some((shot) => shot.beatId === 'gone')).toBe(false)
    expect(catalog.some((shot) => shot.sceneId === 'promo')).toBe(false)
  })

  it('sends only clip pointers to the planner', () => {
    const slim = slimPromoProductionState({
      'scene-0': {
        segments: [
          {
            beatId: 'b0',
            activeAssetUrl: 'https://example.com/v.mp4',
            startTime: 0,
            endTime: 5,
            status: 'COMPLETE',
          },
        ],
      },
    })
    expect(slim?.['scene-0']).toEqual({
      segments: [
        {
          beatId: 'b0',
          activeAssetUrl: 'https://example.com/v.mp4',
          startTime: 0,
          endTime: 5,
        },
      ],
    })
  })
})

describe('promoPlanWithLiveMedia', () => {
  it('fills a plan made before production with the live clip', () => {
    const [live] = promoPlanWithLiveMedia(
      [
        {
          sceneId: 'scene-0',
          beatId: 'b0',
          sceneIndex: 0,
          startSec: 0,
          endSec: 5,
          durationSec: 5,
          score: 10,
        },
      ],
      {
        'scene-0': {
          segments: [
            {
              segmentId: 'seg-1',
              beatId: 'b0',
              assetType: 'video',
              activeAssetUrl: 'https://example.com/live.mp4',
            },
          ],
        },
      }
    )
    expect(live?.videoUrl).toBe('https://example.com/live.mp4')
  })
})

describe('buildPromoSceneFromPlan', () => {
  it('sets cinematicType promo and copies frame/video pointers', () => {
    const { scene, productionSeed } = buildPromoSceneFromPlan({
      beatPlan: [
        {
          sceneId: 'scene-0',
          beatId: 'b1',
          sceneIndex: 0,
          startSec: 0,
          endSec: 5,
          durationSec: 5,
          score: 90,
          label: 'Door slams',
          frameUrl: 'https://example.com/f1.png',
          videoUrl: 'https://example.com/v1.mp4',
        },
      ],
      targetDurationSec: 60,
      projectTitle: 'Test Film',
    })
    expect(scene.cinematicType).toBe('promo')
    expect(scene.heading).toContain('PROMO')
    expect(scene.beats[0]?.storyboardImageUrl).toBe('https://example.com/f1.png')
    expect(scene.beats[0]?.sourceBeatId).toBe('b1')
    expect(productionSeed.segments[0]?.activeAssetUrl).toBe('https://example.com/v1.mp4')
  })

  it('upserts a single promo scene and film indices exclude it', () => {
    const base = [{ id: 's0', heading: 'INT. A' }]
    const { scene } = buildPromoSceneFromPlan({
      beatPlan: [
        {
          sceneId: 's0',
          beatId: 'x',
          sceneIndex: 0,
          startSec: 0,
          endSec: 5,
          score: 1,
          frameUrl: 'https://example.com/a.png',
        },
      ],
      targetDurationSec: 60,
    })
    const once = upsertPromoSceneInScenes(base, scene)
    const twice = upsertPromoSceneInScenes(once, { ...scene, action: 'refreshed' })
    expect(twice.filter((s) => isPromoCinematicScene(s)).length).toBe(1)
    expect(filmSceneIndices(twice)).toEqual([0])
  })
})

describe('resolvePromoBeatMedia', () => {
  const beat = {
    sceneId: 'scene-0',
    beatId: 'b0',
    sceneIndex: 0,
    startSec: 0,
    endSec: 6,
    durationSec: 6,
    score: 80,
    frameUrl: 'https://example.com/frame.png',
    videoUrl: 'https://example.com/stale.mp4',
  }

  it('uses the live clip and its take thumbnail', () => {
    const media = resolvePromoBeatMedia(beat, {
      'scene-0': {
        segments: [
          {
            segmentId: 'seg-1',
            beatId: 'b0',
            assetType: 'video',
            activeAssetUrl: 'https://example.com/live.mp4',
            takes: [
              {
                assetUrl: 'https://example.com/live.mp4',
                thumbnailUrl: 'https://example.com/thumb.jpg',
                status: 'COMPLETE',
              },
            ],
          },
        ],
      },
    })
    expect(media).toEqual({
      segmentId: 'seg-1',
      hasClip: true,
      videoUrl: 'https://example.com/live.mp4',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    })
  })

  it('returns the storyboard frame when the segment has no clip', () => {
    const media = resolvePromoBeatMedia(
      { ...beat, videoUrl: undefined },
      {
        'scene-0': {
          segments: [
            {
              segmentId: 'seg-1',
              beatId: 'b0',
              assetType: 'image',
              activeAssetUrl: null,
              startFrameUrl: 'https://example.com/start.jpg',
            },
          ],
        },
      }
    )
    expect(media.hasClip).toBe(false)
    expect(media.videoUrl).toBeUndefined()
    expect(media.segmentId).toBe('seg-1')
    expect(media.thumbnailUrl).toBe('https://example.com/frame.png')
  })

  it('ignores a stale plan clip when the live segment has no video', () => {
    const media = resolvePromoBeatMedia(beat, {
      'scene-0': {
        segments: [{ segmentId: 'seg-1', beatId: 'b0', activeAssetUrl: null, takes: [] }],
      },
    })
    expect(media.hasClip).toBe(false)
    expect(media.videoUrl).toBeUndefined()
    expect(media.thumbnailUrl).toBe('https://example.com/frame.png')
  })

  it('keeps the snapshot clip when no segment exists', () => {
    const media = resolvePromoBeatMedia(beat, {})
    expect(media).toEqual({
      hasClip: true,
      videoUrl: 'https://example.com/stale.mp4',
      thumbnailUrl: undefined,
    })
  })

  it('falls back to scene index keys and has no segment when production is empty', () => {
    const empty = resolvePromoBeatMedia(
      { ...beat, videoUrl: undefined },
      { 'scene-0': { segments: [] } }
    )
    expect(empty.hasClip).toBe(false)
    expect(empty.segmentId).toBeUndefined()
    expect(empty.thumbnailUrl).toBe('https://example.com/frame.png')

    const byIndex = resolvePromoBeatMedia(
      { ...beat, sceneId: 'missing-id', videoUrl: undefined },
      {
        'scene-0': {
          segments: [
            {
              segmentId: 'seg-idx',
              beatId: 'b0',
              assetType: 'video',
              activeAssetUrl: 'https://example.com/idx.mp4',
            },
          ],
        },
      }
    )
    expect(byIndex.segmentId).toBe('seg-idx')
    expect(byIndex.videoUrl).toBe('https://example.com/idx.mp4')
  })
})

describe('promo source guards', () => {
  it('opens Promo from the studio header and keeps it publishable', () => {
    const panel = readFileSync(
      path.join(process.cwd(), 'src/components/vision/ScriptPanel.tsx'),
      'utf8'
    )
    const promo = panel.indexOf("tStudio('promo')")
    const publish = panel.indexOf("tStudio('publish')")
    expect(promo).toBeGreaterThan(-1)
    expect(publish).toBeGreaterThan(promo)
    const manager = readFileSync(
      path.join(process.cwd(), 'src/components/publishing/PublishingManager.tsx'),
      'utf8'
    )
    expect(manager).not.toContain("key: 'promo'")
    const ship = readFileSync(
      path.join(process.cwd(), 'src/components/publishing/PublishingPackageShipTab.tsx'),
      'utf8'
    )
    expect(ship).toContain("{ id: 'promo', label: 'Promo' }")
    const page = readFileSync(
      path.join(process.cwd(), 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'),
      'utf8'
    )
    expect(page).toContain('<PromoStudioDialog')
    expect(page).toContain("searchParams.get('youtube') === 'not_configured'")
    const worker = readFileSync(path.join(process.cwd(), 'src/sw.ts'), 'utf8')
    expect(worker).toContain('/api/publish/youtube/auth')
    expect(worker).toContain('/api/publish/youtube/callback')
    const auth = readFileSync(
      path.join(process.cwd(), 'src/app/api/publish/youtube/auth/route.ts'),
      'utf8'
    )
    expect(auth).toContain("dest.searchParams.set('youtube', 'not_configured')")
  })

  it('Screening Room toolbar includes Promo mode', () => {
    const player = path.join(process.cwd(), 'src/components/vision/AudioGalleryPlayer.tsx')
    expect(existsSync(player)).toBe(true)
    const source = readFileSync(player, 'utf8')
    expect(source).toContain("'promo'")
    expect(source).toContain('Promo')
    expect(source).toContain('promoTrailerUrl')
    expect(source).toContain('setPlaybackMode(\'promo\')')
  })

  it('plans from every shot and runs Promo Agent before clips exist', () => {
    const tab = path.join(process.cwd(), 'src/components/publishing/PublishingPromoTab.tsx')
    const source = readFileSync(tab, 'utf8')
    expect(source).toContain('Promo Agent')
    expect(source).toContain('Continuity Agent')
    expect(source).toContain('onRunPromoAgent')
    expect(source).toContain('onRunContinuityAgent')
    expect(source).not.toContain('existing shots, frames, and clips')
    expect(source).not.toContain('This shot needs a Studio segment first')
    const page = path.join(
      process.cwd(),
      'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
    )
    const pageSource = readFileSync(page, 'utf8')
    expect(pageSource).toContain("title: 'Promo Agent'")
    expect(pageSource).toContain("title: 'Continuity Agent'")
    expect(pageSource).toContain('ensurePromoShotSegment')
    expect(pageSource).toContain('continuityShots')
    expect(pageSource).toContain("key: 'continuity'")
  })

  it('trailer render enables narration/music for promo', () => {
    const route = path.join(process.cwd(), 'src/app/api/publish/trailer/render/route.ts')
    const source = readFileSync(route, 'utf8')
    expect(source).toContain('includeNarration')
    expect(source).toContain('includeMusic')
    expect(source).toContain('videoUrl')
  })

  it('supports multiple targeted marketing promo scenes and live-shared shots on the workflow', () => {
    expect(PROMO_CAMPAIGN_PRESETS.length).toBeGreaterThanOrEqual(6)

    const baseScenes = [
      {
        id: 'scene-0',
        heading: 'INT. LAB - NIGHT',
        beats: [
          {
            beatId: 'b0',
            sequenceIndex: 0,
            kind: 'action' as const,
            actionDescription: 'Initial spark',
            storyboardImageUrl: 'https://example.com/original-still.png',
          },
        ],
      },
    ]

    const plan = planPromoTrailer({ scenes: baseScenes, targetDurationSec: 30 })
    const built1 = buildPromoSceneFromPlan({
      beatPlan: plan.beatPlan,
      targetDurationSec: 30,
      promoId: 'promo-theatrical',
      campaignName: 'Theatrical Launch',
      campaignPreset: 'theatrical_trailer',
      campaignLanguages: ['en', 'es'],
    })
    const afterFirst = upsertPromoSceneInScenes(baseScenes, built1.scene, {
      promoId: 'promo-theatrical',
      createNew: true,
    })

    const built2 = buildPromoSceneFromPlan({
      beatPlan: plan.beatPlan,
      targetDurationSec: 30,
      promoId: 'promo-vertical',
      campaignName: 'Vertical Social Hook',
      campaignPreset: 'social_vertical_hook',
      campaignLanguages: ['en', 'ja'],
      promoAspect: '9:16',
    })
    const afterSecond = upsertPromoSceneInScenes(afterFirst, built2.scene, {
      promoId: 'promo-vertical',
      createNew: true,
    })

    const promos = findPromoScenes(afterSecond)
    expect(promos).toHaveLength(2)
    expect(promos[0]?.promoId).toBe('promo-theatrical')
    expect(promos[1]?.promoId).toBe('promo-vertical')

    // Live-hydrate shared shots from updated source scene still & clip
    const updatedSourceScenes = afterSecond.map((s: any, idx: number) =>
      idx === 0
        ? {
            ...s,
            beats: [
              {
                ...s.beats[0],
                storyboardImageUrl: 'https://example.com/updated-shared-still.png',
              },
            ],
          }
        : s
    )
    const hydrated = hydratePromoSceneWithSharedShots(
      promos[0]!.scene as Record<string, any>,
      updatedSourceScenes,
      {
        'scene-0': {
          isSegmented: true,
          targetDuration: 5,
          segments: [
            {
              segmentId: 'seg-0',
              sequenceIndex: 0,
              startTime: 0,
              endTime: 5,
              status: 'COMPLETE',
              beatId: 'b0',
              activeAssetUrl: 'https://example.com/shared-clip.mp4',
              assetType: 'video',
              references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
              takes: [],
            },
          ],
        },
      }
    )
    const hydratedBeats = (hydrated.scene as { beats?: Array<{ storyboardImageUrl?: string }> }).beats
    expect(hydratedBeats?.[0]?.storyboardImageUrl).toBe(
      'https://example.com/updated-shared-still.png'
    )
    expect(hydrated.productionData?.segments[0]?.activeAssetUrl).toBe(
      'https://example.com/shared-clip.mp4'
    )

    const afterRemove = removePromoSceneFromScenes(afterSecond, 'promo-theatrical')
    expect(findPromoScenes(afterRemove)).toHaveLength(1)
    expect(findPromoScenes(afterRemove)[0]?.promoId).toBe('promo-vertical')
  })

  it('gives promo narration initial beatDirection, preserves dialogue/action shared shots across ensureSceneBeats, and self-heals stripped promo scenes', () => {
    const sourceScenes = [
      {
        id: 'scene-0',
        heading: 'INT. VAULT - NIGHT',
        beats: [
          {
            beatId: 'b_dial',
            sequenceIndex: 0,
            kind: 'dialogue' as const,
            character: 'GIDEON',
            line: 'The current bleeds out.',
            storyboardImageUrl: 'https://example.com/vault-0.png',
          },
          {
            beatId: 'b_act',
            sequenceIndex: 1,
            kind: 'action' as const,
            actionDescription: 'Sparks arc across the copper coil.',
            storyboardImageUrl: 'https://example.com/vault-1.png',
          },
        ],
      },
    ]

    const { scene: promoScene } = buildPromoSceneFromPlan({
      beatPlan: [
        {
          sceneId: 'scene-0',
          beatId: 'b_dial',
          sceneIndex: 0,
          beatKind: 'dialogue',
          startSec: 0,
          endSec: 5,
          durationSec: 5,
          score: 90,
          label: 'GIDEON: The current bleeds out.',
          frameUrl: 'https://example.com/vault-0.png',
        },
        {
          sceneId: 'scene-0',
          beatId: 'b_act',
          sceneIndex: 0,
          beatKind: 'action',
          startSec: 5,
          endSec: 10,
          durationSec: 5,
          score: 85,
          label: 'Sparks arc across the copper coil.',
          frameUrl: 'https://example.com/vault-1.png',
        },
      ],
      narrationLine: 'In the depths beneath the city, one spark changes everything.',
      targetDurationSec: 30,
      projectTitle: 'Current',
      promoId: 'promo-main',
    })

    // 1. Narration beat immediately has beatDirection and opening frame
    expect(promoScene.beats).toHaveLength(3)
    expect(promoScene.beats[0]?.kind).toBe('narration')
    expect(promoScene.beats[0]?.beatDirection?.shotType).toBeTruthy()
    expect(promoScene.beats[0]?.storyboardImageUrl).toBe('https://example.com/vault-0.png')

    // 2. Running ensureSceneBeats (e.g. when clicking Direction) preserves all 3 shots AND source links
    const ensured = ensureSceneBeats(promoScene as unknown as Record<string, unknown>)
    const ensuredBeats = getSceneBeats(ensured)
    expect(ensuredBeats).toHaveLength(3)
    expect(ensuredBeats[0]?.kind).toBe('narration')
    expect((ensuredBeats[1] as { sourceBeatId?: string }).sourceBeatId).toBe('b_dial')
    expect((ensuredBeats[1] as { sourceSceneIndex?: number }).sourceSceneIndex).toBe(0)
    expect((ensuredBeats[2] as { sourceBeatId?: string }).sourceBeatId).toBe('b_act')
    expect((ensuredBeats[2] as { sourceSceneIndex?: number }).sourceSceneIndex).toBe(0)

    // 3. Self-healing: if a legacy promo scene had its dialogue/action beats stripped leaving only narration,
    // getSceneBeats and hydratePromoSceneWithSharedShots reconstruct all planned shots from promoBeatPlan
    const strippedPromoScene = {
      ...promoScene,
      beats: [
        {
          beatId: 'bt_only_narr',
          sequenceIndex: 0,
          kind: 'narration',
          character: 'NARRATOR',
          line: 'In the depths beneath the city, one spark changes everything.',
        },
      ],
    }
    const hydrated = hydratePromoSceneWithSharedShots(
      strippedPromoScene as unknown as Record<string, unknown>,
      sourceScenes,
      {}
    )
    const healedBeats = (hydrated.scene as { beats: Array<Record<string, unknown>> }).beats
    expect(healedBeats).toHaveLength(3)
    expect(healedBeats[0]?.kind).toBe('narration')
    expect(healedBeats[0]?.beatDirection).toBeTruthy()
    expect(healedBeats[1]?.sourceBeatId).toBe('b_dial')
    expect(healedBeats[2]?.sourceBeatId).toBe('b_act')
  })

  it('streamlines Promo Builder dialog to focus strictly on promo version list and building promo shots', () => {
    const tabPath = path.join(process.cwd(), 'src/components/publishing/PublishingPromoTab.tsx')
    const tabSource = readFileSync(tabPath, 'utf8')
    const renderBody = tabSource.slice(tabSource.indexOf('<div className="space-y-4 overflow-y-auto'))

    // Retains promo version list, delete confirmation, video preview player, & shot building controls
    expect(renderBody).toContain('promo-campaign-switcher')
    expect(renderBody).toContain('delete-promo-version-btn')
    expect(renderBody).toContain('promo-delete-confirmation')
    expect(renderBody).toContain('confirm-delete-promo-btn')
    expect(renderBody).toContain('cancel-delete-promo-btn')
    expect(renderBody).toContain('promo-video-preview-panel')
    expect(renderBody).toContain('promo-shot-clip-video-player')
    expect(renderBody).toContain('promo-rendered-video-player')
    expect(renderBody).toContain('open-promo-in-studio-btn')
    expect(renderBody).toContain('Open Promo Scene in Studio')
    expect(renderBody).toContain('Build Promo Shots')
    expect(renderBody).toContain('Rebuild Promo Shots')
    expect(renderBody).toContain('Promo Director')
    expect(renderBody).toContain('Shot timeline')
    expect(renderBody).not.toContain('title="Shot length in seconds"')

    // Removes redundant studio/render/stream controls from the rendered Promo Builder UI
    expect(renderBody).not.toContain('Format / Aspect Ratio')
    expect(renderBody).not.toContain('Active Stream Language')
    expect(renderBody).not.toContain('2 · Preview')
    expect(renderBody).not.toContain('3 · Render Promo')
    expect(renderBody).not.toContain('Promo streams')
  })

  it('preserves and resolves speaker character names for Promo dialogue shots so audio generation never receives empty characterName', () => {
    const sourceScenes = [
      {
        id: 'scene-1',
        sceneNumber: 2,
        heading: 'INT. ARCHIVE LAB - NIGHT',
        action: 'The copper coil hums.',
        characters: ['Gideon Croft'],
        beats: [
          {
            beatId: 'bt_3f0e54b8-977',
            sequenceIndex: 0,
            kind: 'dialogue',
            character: '',
            line: 'The current bleeds out. Every damn time… the loop refuses to close.',
            lineId: 'ln_gideon_1',
            durationSeconds: 6,
            beatDirection: {
              shotType: 'Medium close-up',
              castInFrame: ['Gideon Croft'],
            },
          },
        ],
      },
    ]

    const planned = planPromoTrailer({
      scenes: sourceScenes,
      targetDurationSec: 30,
    })
    expect(planned.beatPlan[0]?.character).toBe('Gideon Croft')

    // Even if a legacy Promo scene had empty character in its persisted dialogue array,
    // hydratePromoSceneWithSharedShots resolves the speaker from the source beat / castInFrame
    // and syncs hydrated.scene.dialogue so dialogue[1].character is non-empty.
    const { scene: promoScene } = buildPromoSceneFromPlan({
      beatPlan: [
        {
          sceneId: 'scene-1',
          beatId: 'bt_3f0e54b8-977',
          sceneIndex: 0,
          beatKind: 'dialogue',
          startSec: 0,
          endSec: 6,
          durationSec: 6,
          score: 95,
          label: 'The current bleeds out. Every damn time… the loop refuses to close.',
        },
      ],
      narrationLine: 'Some loops were never meant to close.',
      targetDurationSec: 30,
      projectTitle: 'Current',
      promoId: 'promo-main',
    })

    const ensured = ensureSceneBeats(promoScene as unknown as Record<string, unknown>)
    const hydrated = hydratePromoSceneWithSharedShots(ensured, sourceScenes, {})
    const hydratedBeats = (hydrated.scene as { beats: Array<Record<string, unknown>> }).beats
    const hydratedDialogue = (hydrated.scene as { dialogue: Array<Record<string, unknown>> }).dialogue

    expect(hydratedBeats[0]?.character).toBe('NARRATOR')
    expect(hydratedBeats[1]?.character).toBe('Gideon Croft')
    expect(hydratedDialogue[0]?.character).toBe('NARRATOR')
    expect(hydratedDialogue[1]?.character).toBe('Gideon Croft')
  })

  it('includes narration dialogue in Clip prompts, labels shared shots (e.g. Scene 2 · Shot 3), syncs shared beats bidirectionally, and creates a Promo music track cue', () => {
    const sourceScenes: Array<Record<string, unknown>> = [
      {
        id: 'scene-0',
        sceneNumber: 1,
        heading: 'INT. FOYER - NIGHT',
        beats: [
          {
            beatId: 's1-b1',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Rain streaks the glass.',
          },
        ],
      },
      {
        id: 'scene-1',
        sceneNumber: 2,
        heading: 'INT. ARCHIVE LAB - NIGHT',
        beats: [
          {
            beatId: 's2-b1',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'First shot in scene 2.',
          },
          {
            beatId: 's2-b2',
            sequenceIndex: 1,
            kind: 'action',
            actionDescription: 'Second shot in scene 2.',
          },
          {
            beatId: 's2-b3',
            sequenceIndex: 2,
            kind: 'dialogue',
            character: 'GIDEON',
            line: 'The loop refuses to close.',
            actionDescription: 'Gideon stares at the glowing copper coil.',
            storyboardImageUrl: 'https://example.com/s2-shot3-old.png',
          },
        ],
      },
    ]

    const { scene: promoScene, productionSeed } = buildPromoSceneFromPlan({
      beatPlan: [
        {
          sceneId: 'scene-1',
          beatId: 's2-b3',
          sceneIndex: 1,
          beatKind: 'dialogue',
          startSec: 0,
          endSec: 5,
          durationSec: 5,
          score: 92,
          label: 'The loop refuses to close.',
        },
      ],
      narrationLine: 'Every memory has a price.',
      targetDurationSec: 15,
      projectTitle: 'Current',
      promoId: 'promo-main',
      musicAudioUrl: 'https://example.com/promo-score.mp3',
    })

    // 1. Promo music track cue is created and carries the music audio URL
    expect(promoScene.sceneMusicCues).toHaveLength(1)
    expect(promoScene.sceneMusicCues?.[0]?.url).toBe('https://example.com/promo-score.mp3')

    // 2. Narration shot (Shot 1) includes its dialogue in both seed segment and hydratedBeat clips
    expect(productionSeed.segments[0]?.generatedPrompt).toContain('Every memory has a price.')
    expect(productionSeed.segments[0]?.generatedPrompt).not.toContain('No spoken dialogue')

    const allScenes = [...sourceScenes, promoScene as unknown as Record<string, unknown>]
    const hydrated = hydratePromoSceneWithSharedShots(
      promoScene as unknown as Record<string, unknown>,
      allScenes,
      { [promoScene.id]: productionSeed as never }
    )
    const hydratedBeats = (hydrated.scene as { beats: Array<Record<string, unknown>> }).beats
    expect(hydratedBeats).toHaveLength(2)

    // 3. Second promo shot is Scene 2 Shot 3 and carries explicit source attribution
    const secondPromoBeat = hydratedBeats[1]
    expect(secondPromoBeat?.sourceSceneNumber).toBe(2)
    expect(secondPromoBeat?.sourceShotNumber).toBe(3)
    expect(formatPromoSourceBadge(secondPromoBeat as never)).toBe('S2 · Shot 3')
    expect(formatPromoSourceLongLabel(secondPromoBeat as never)).toBe('Scene 2 · Shot 3')

    // Stills Agent progress items include S2 · Shot 3 on shared Promo shots
    const expressItems = buildExpressBeatFrameItems(hydrated.scene, {
      selectedFrameKeys: [String(secondPromoBeat?.beatId)],
    })
    expect(expressItems[0]?.label).toBe('Shot 2 · S2 · Shot 3')

    // Clip gallery items include narration line on Shot 1 and sourceSceneLabel on Shot 2
    const clips = buildBeatVideoClips({
      scene: hydrated.scene,
      segments: hydrated.productionData?.segments || [],
      queue: [],
    })
    expect(clips[0]?.prompt).toContain('Every memory has a price.')
    expect(clips[0]?.prompt).not.toContain('No spoken dialogue')
    expect(clips[1]?.sourceSceneLabel).toBe('S2 · Shot 3')
    expect(clips[1]?.sourceSceneLongLabel).toBe('Scene 2 · Shot 3')

    // 4. Updating direction on the Promo scene beat syncs back to Scene 2 Shot 3
    const afterDirectionUpdate = applyBeatDirectionToScenes({
      scenes: allScenes,
      sceneIdx: 2,
      beatId: String(secondPromoBeat?.beatId),
      direction: {
        shotType: 'Extreme Close-Up',
        cameraAngle: 'Low angle',
        cameraMovement: 'Push in',
        frozenMoment: 'Sparks arc across Gideon’s glasses',
      },
    })
    const updatedSourceScene2Beats = getSceneBeats(afterDirectionUpdate[1])
    expect(updatedSourceScene2Beats[2]?.beatDirection?.shotType).toBe('Extreme Close-Up')
    expect(updatedSourceScene2Beats[2]?.beatDirection?.frozenMoment).toBe(
      'Sparks arc across Gideon’s glasses'
    )

    // 5. Updating a still frame on the Promo scene beat syncs back to Scene 2 Shot 3
    const promoWithNewFrame = {
      ...(afterDirectionUpdate[2] as Record<string, unknown>),
      beats: getSceneBeats(afterDirectionUpdate[2]).map((b, i) =>
        i === 1
          ? {
              ...b,
              storyboardImageUrl: 'https://example.com/s2-shot3-new-from-promo.png',
              storyboardImageVersions: [
                {
                  id: 'v-new',
                  url: 'https://example.com/s2-shot3-new-from-promo.png',
                  createdAt: new Date(Date.now() + 60_000).toISOString(),
                },
              ],
            }
          : b
      ),
    }
    const syncedScenes = syncPromoSharedBeatsToSourceScenes([
      afterDirectionUpdate[0],
      afterDirectionUpdate[1],
      promoWithNewFrame,
    ])
    const syncedScene2Beats = getSceneBeats(syncedScenes[1])
    expect(syncedScene2Beats[2]?.storyboardImageUrl).toBe(
      'https://example.com/s2-shot3-new-from-promo.png'
    )
  })
})
