import { describe, expect, it } from 'vitest'
import {
  buildPromoPlanPrompt,
  normalizePromoModelPlan,
} from '@/lib/publish/promoPlanModel'
import type { PromoShotCatalogEntry } from '@/lib/publish/promoShotCatalog'

function shot(index: number, extra?: Partial<PromoShotCatalogEntry>): PromoShotCatalogEntry {
  return {
    sceneId: `s${index}`,
    sceneIndex: index,
    beatId: `b${index}`,
    beatIndex: 0,
    label: `Shot ${index}`,
    hero: false,
    hasStill: false,
    hasClip: false,
    durationSec: 5,
    ...extra,
  }
}

describe('normalizePromoModelPlan', () => {
  const catalog = [0, 1, 2, 3, 4, 5, 6, 7].map((index) =>
    shot(index, index === 0 ? { hero: true, beatRole: 'opening' } : {})
  )

  it('drops unknown ids, clamps duration, keeps trailer order, and inserts heroes', () => {
    const result = normalizePromoModelPlan({
      catalog,
      targetDurationSec: 45,
      picks: {
        shots: [
          { sceneIndex: 99, beatId: 'missing', durationSec: 5, trailerRole: 'hook' },
          { sceneIndex: 3, beatId: 'b3', durationSec: 99, trailerRole: 'hook' },
          { sceneIndex: 1, beatId: 'b1', durationSec: 1, trailerRole: 'rise' },
          { sceneIndex: 5, beatId: 'b5', durationSec: 5, trailerRole: 'peak' },
          { sceneIndex: 2, beatId: 'b2', durationSec: 5, trailerRole: 'button' },
          { sceneIndex: 4, beatId: 'b4', durationSec: 5, trailerRole: 'rise' },
          { sceneIndex: 6, beatId: 'b6', durationSec: 5, trailerRole: 'rise' },
          { sceneIndex: 7, beatId: 'b7', durationSec: 5, trailerRole: 'rise' },
        ],
      },
    })

    expect(result).not.toBeNull()
    expect(result!.beatPlan.map((beat) => beat.beatId)).toEqual([
      'b3',
      'b1',
      'b0',
      'b5',
      'b2',
      'b4',
      'b6',
      'b7',
    ])
    expect(result!.beatPlan.some((beat) => beat.beatId === 'missing')).toBe(false)
    expect(result!.beatPlan.every((beat) => (beat.durationSec ?? 0) >= 4 && (beat.durationSec ?? 0) <= 6)).toBe(
      true
    )
    expect(result!.beatPlan[0]?.durationSec).toBe(6)
    expect(result!.beatPlan[1]?.durationSec).toBe(4)
    expect(result!.totalDurationSec).toBeGreaterThanOrEqual(30)
    expect(result!.totalDurationSec).toBeLessThanOrEqual(60)
    expect(result!.source).toBe('model')
  })

  it('rejects a plan that cannot fill 30 seconds', () => {
    const result = normalizePromoModelPlan({
      catalog: [shot(0), shot(1)],
      targetDurationSec: 30,
      picks: {
        shots: [{ sceneIndex: 0, beatId: 'b0', durationSec: 5, trailerRole: 'hook' }],
      },
    })
    expect(result).toBeNull()
  })

  it('trims the tail to the target without reordering the shots it keeps', () => {
    const longCatalog = Array.from({ length: 10 }, (_, index) => shot(index, { durationSec: 6 }))
    const result = normalizePromoModelPlan({
      catalog: longCatalog,
      targetDurationSec: 30,
      picks: {
        shots: longCatalog.map((entry, index) => ({
          sceneIndex: entry.sceneIndex,
          beatId: entry.beatId,
          durationSec: 6,
          trailerRole: index === 0 ? 'hook' : index === 9 ? 'button' : 'rise',
        })),
      },
    })
    expect(result!.beatPlan.map((beat) => beat.beatId)).toEqual(['b0', 'b1', 'b2', 'b3', 'b4'])
    expect(result!.totalDurationSec).toBe(30)
  })
})

describe('buildPromoPlanPrompt', () => {
  it('tells the model to compose from shots that have no media yet', () => {
    const prompt = buildPromoPlanPrompt({
      title: 'Night Run',
      targetDurationSec: 30,
      catalog: [shot(0)],
    })
    expect(prompt).toContain('whether a still or clip already exists')
    expect(prompt).toContain('hasStill and hasClip are production notes')
    expect(prompt).toContain('stay between 30 and 120')
    expect(prompt).toContain('"beatId":"b0"')
  })

  it('includes the audience and the director note when revising a plan', () => {
    const prompt = buildPromoPlanPrompt({
      title: 'Night Run',
      targetDurationSec: 90,
      catalog: [shot(0)],
      audienceText: 'Parents in Bangkok who watch family dramas',
      directorNotes: 'Open on the chase',
      currentPlan: [
        {
          sceneId: 's0',
          beatId: 'b0',
          sceneIndex: 0,
          startSec: 0,
          endSec: 5,
          score: 1,
          trailerRole: 'hook',
        },
      ],
    })
    expect(prompt).toContain('Parents in Bangkok who watch family dramas')
    expect(prompt).toContain('Open on the chase')
    expect(prompt).toContain('Current plan to revise')
    expect(prompt).toContain('resonate with the target audience')
  })
})

describe('normalizePromoModelPlan durations', () => {
  it('keeps a 90 second plan', () => {
    const catalog = Array.from({ length: 18 }, (_, index) => shot(index, { durationSec: 5 }))
    const result = normalizePromoModelPlan({
      catalog,
      targetDurationSec: 90,
      picks: {
        shots: catalog.map((entry, index) => ({
          sceneIndex: entry.sceneIndex,
          beatId: entry.beatId,
          durationSec: 5,
          trailerRole: index === 0 ? 'hook' : index === catalog.length - 1 ? 'button' : 'rise',
        })),
      },
    })
    expect(result).not.toBeNull()
    expect(result!.totalDurationSec).toBe(90)
    expect(result!.targetDurationSec).toBe(90)
  })

  it('trims a plan that runs past 120 seconds without dropping it', () => {
    const catalog = Array.from({ length: 25 }, (_, index) => shot(index, { durationSec: 6 }))
    const result = normalizePromoModelPlan({
      catalog,
      targetDurationSec: 120,
      picks: {
        shots: catalog.map((entry) => ({
          sceneIndex: entry.sceneIndex,
          beatId: entry.beatId,
          durationSec: 6,
          trailerRole: 'rise',
        })),
      },
    })
    expect(result).not.toBeNull()
    expect(result!.totalDurationSec).toBe(120)
    expect(result!.beatPlan).toHaveLength(20)
  })
})
