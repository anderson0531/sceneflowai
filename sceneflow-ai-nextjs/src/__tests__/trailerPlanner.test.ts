import { describe, it, expect } from 'vitest'
import { planPromoTrailer } from '@/lib/publish/trailerPlanner'
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

  it('prefers beats with video URLs and keeps chronological order', () => {
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
    for (let i = 1; i < result.beatPlan.length; i++) {
      const prev = result.beatPlan[i - 1]!
      const curr = result.beatPlan[i]!
      expect(curr.sceneIndex).toBeGreaterThanOrEqual(prev.sceneIndex)
    }
    const ids = result.beatPlan.map((b) => `${b.sceneIndex}:${b.beatId}`)
    expect(new Set(ids).size).toBe(ids.length)
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

describe('promo source guards', () => {
  it('Screening Room toolbar includes Promo mode', () => {
    const player = path.join(process.cwd(), 'src/components/vision/AudioGalleryPlayer.tsx')
    expect(existsSync(player)).toBe(true)
    const source = readFileSync(player, 'utf8')
    expect(source).toContain("'promo'")
    expect(source).toContain('Promo')
    expect(source).toContain('promoTrailerUrl')
    expect(source).toContain('setPlaybackMode(\'promo\')')
  })

  it('trailer render enables narration/music for promo', () => {
    const route = path.join(process.cwd(), 'src/app/api/publish/trailer/render/route.ts')
    const source = readFileSync(route, 'utf8')
    expect(source).toContain('includeNarration')
    expect(source).toContain('includeMusic')
    expect(source).toContain('videoUrl')
  })
})
