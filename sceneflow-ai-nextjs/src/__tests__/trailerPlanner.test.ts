import { describe, it, expect } from 'vitest'
import { planPromoTrailer } from '@/lib/publish/trailerPlanner'
import { buildPromoShotCatalog, slimPromoProductionState } from '@/lib/publish/promoShotCatalog'
import { promoPlanWithLiveMedia, resolvePromoBeatMedia } from '@/lib/publish/promoBeatMedia'
import {
  buildPromoSceneFromPlan,
  isPromoCinematicScene,
  filmSceneIndices,
  upsertPromoSceneInScenes,
} from '@/lib/publish/buildPromoScene'
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
    expect(source).toContain('onRunPromoAgent')
    expect(source).not.toContain('existing shots, frames, and clips')
    expect(source).not.toContain('This shot needs a Studio segment first')
    const page = path.join(
      process.cwd(),
      'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
    )
    const pageSource = readFileSync(page, 'utf8')
    expect(pageSource).toContain("title: 'Promo Agent'")
    expect(pageSource).toContain('ensurePromoShotSegment')
  })

  it('trailer render enables narration/music for promo', () => {
    const route = path.join(process.cwd(), 'src/app/api/publish/trailer/render/route.ts')
    const source = readFileSync(route, 'utf8')
    expect(source).toContain('includeNarration')
    expect(source).toContain('includeMusic')
    expect(source).toContain('videoUrl')
  })
})
