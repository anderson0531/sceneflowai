import { describe, expect, it } from 'vitest'
import { deriveSegmentsFromBeats } from '@/lib/scene/deriveSegmentsFromBeats'
import { isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  countStoryboardFrameStats,
  enumerateStoryboardFrameSlots,
} from '@/lib/storyboard/types'
import { buildExpressBeatFrameItems } from '@/lib/storyboard/expressBeatFrameProgress'

describe('isBeatExcluded', () => {
  it('returns true only when excluded is explicitly true', () => {
    expect(isBeatExcluded({ beatId: 'b1', sequenceIndex: 0, kind: 'action' } as SceneBeat)).toBe(
      false
    )
    expect(
      isBeatExcluded({
        beatId: 'b1',
        sequenceIndex: 0,
        kind: 'action',
        excluded: true,
      } as SceneBeat)
    ).toBe(true)
    expect(
      isBeatExcluded({
        beatId: 'b1',
        sequenceIndex: 0,
        kind: 'action',
        excluded: false,
      } as SceneBeat)
    ).toBe(false)
  })
})

describe('excluded beats in storyboard slots', () => {
  const scene = {
    beats: [
      {
        beatId: 'bt_active',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Active beat',
        storyboardImageUrl: 'https://example.com/active.jpg',
      },
      {
        beatId: 'bt_excluded',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'Excluded beat',
        excluded: true,
      },
    ],
  }

  it('enumerateStoryboardFrameSlots omits excluded beats', () => {
    const slots = enumerateStoryboardFrameSlots(scene)
    expect(slots).toHaveLength(1)
    expect(slots[0].beatId).toBe('bt_active')
  })

  it('countStoryboardFrameStats does not count excluded beats as missing', () => {
    const stats = countStoryboardFrameStats(scene)
    expect(stats.total).toBe(1)
    expect(stats.missing).toBe(0)
    expect(stats.withImage).toBe(1)
  })

  it('buildExpressBeatFrameItems omits excluded beats', () => {
    const items = buildExpressBeatFrameItems(scene, {
      scope: 'missing',
      includeEndFrames: false,
      storyboardQuality: 'draft',
    })
    expect(items.every((item) => item.key !== 'bt_excluded')).toBe(true)
  })
})

describe('deriveSegmentsFromBeats with excluded beats', () => {
  it('skips excluded beats without failing on missing frames', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Active establishing shot',
        storyboardImageUrl: 'https://example.com/frame-1.jpg',
      },
      {
        beatId: 'bt_2',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'Excluded filler beat',
        excluded: true,
      },
      {
        beatId: 'bt_3',
        sequenceIndex: 2,
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Hello there.',
        lineId: 'ln_1',
        durationSeconds: 4,
        storyboardImageUrl: 'https://example.com/frame-3.jpg',
      },
    ]

    const result = deriveSegmentsFromBeats({
      storyboardStatus: 'approved',
      beats,
    })

    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(2)
    expect(result.segments.map((seg) => seg.beatId)).toEqual(['bt_1', 'bt_3'])
  })
})
