/**
 * After a beat reorder the production segments still run in the old order.
 * The ids are all unchanged, so set membership cannot see it — only the
 * ordered beatId list can.
 */

import { describe, expect, it } from 'vitest'
import {
  needsProductionDerive,
  reorderSegmentsToMatchBeats,
  segmentOrderMatchesBeats,
} from '@/lib/scene/deriveSegmentsFromBeats'
import { reorderSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { SceneSegment } from '@/components/vision/scene-production/types'

function beats(): SceneBeat[] {
  return ['bt_a1', 'bt_a2', 'bt_a3', 'bt_a4'].map((beatId, index) => ({
    beatId,
    sequenceIndex: index,
    kind: 'action' as const,
    actionDescription: `Beat ${index + 1} plays out.`,
    storyboardImageUrl: `https://cdn.test/${beatId}.png`,
  }))
}

function approvedScene(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sc_1',
    heading: 'INT. WAREHOUSE - NIGHT',
    storyboardStatus: 'approved',
    beats: beats(),
    ...overrides,
  }
}

/** One 6s segment per beat, each carrying a generated video. */
function segments(): SceneSegment[] {
  return beats().map((beat, index) => ({
    segmentId: `seg_${index + 1}`,
    sequenceIndex: index,
    startTime: index * 6,
    endTime: index * 6 + 6,
    status: 'COMPLETED',
    assetType: 'VIDEO',
    activeAssetUrl: `https://cdn.test/${beat.beatId}.mp4`,
    references: { characterIds: [], sceneRefIds: [], objectRefIds: [] },
    takes: [],
    beatId: beat.beatId,
  })) as SceneSegment[]
}

function beatIds(row: SceneSegment[]): string[] {
  return row.map((segment) => segment.beatId as string)
}

describe('segmentOrderMatchesBeats', () => {
  it('accepts segments that already run in beat order', () => {
    expect(segmentOrderMatchesBeats(approvedScene(), segments())).toBe(true)
  })

  it('rejects segments left in the order the beats had before a move', () => {
    const moved = reorderSceneBeats(approvedScene(), 3, 0)

    expect(segmentOrderMatchesBeats(moved, segments())).toBe(false)
  })

  it('ignores beats that have no segment yet', () => {
    const partial = segments().filter((segment) => segment.beatId !== 'bt_a2')

    expect(segmentOrderMatchesBeats(approvedScene(), partial)).toBe(true)
  })

  it('accepts an empty or unlinked segment row rather than forcing a derive', () => {
    const unlinked = segments().map((segment) => ({ ...segment, beatId: undefined }))

    expect(segmentOrderMatchesBeats(approvedScene(), [])).toBe(true)
    expect(segmentOrderMatchesBeats(approvedScene(), unlinked)).toBe(true)
  })
})

describe('needsProductionDerive', () => {
  it('is true after a reorder even though no beat ids changed', () => {
    const moved = reorderSceneBeats(approvedScene(), 3, 0)

    expect(needsProductionDerive(approvedScene(), segments())).toBe(false)
    expect(needsProductionDerive(moved, segments())).toBe(true)
  })

  it('stays false for an unapproved scene', () => {
    const moved = reorderSceneBeats(
      approvedScene({ storyboardStatus: 'pending_review' }),
      3,
      0
    )

    expect(needsProductionDerive(moved, segments())).toBe(false)
  })
})

describe('reorderSegmentsToMatchBeats', () => {
  it('puts the segments in the beats new order', () => {
    const moved = reorderSceneBeats(approvedScene(), 3, 0)
    const row = reorderSegmentsToMatchBeats(moved, segments())

    expect(beatIds(row)).toEqual(['bt_a4', 'bt_a1', 'bt_a2', 'bt_a3'])
    expect(segmentOrderMatchesBeats(moved, row)).toBe(true)
  })

  it('keeps each segment generated video and id', () => {
    const moved = reorderSceneBeats(approvedScene(), 3, 0)
    const row = reorderSegmentsToMatchBeats(moved, segments())

    expect(row[0].segmentId).toBe('seg_4')
    expect(row[0].activeAssetUrl).toBe('https://cdn.test/bt_a4.mp4')
    expect(row.map((segment) => segment.status)).toEqual(Array(4).fill('COMPLETED'))
  })

  it('recomputes sequenceIndex and cumulative timing', () => {
    const moved = reorderSceneBeats(approvedScene(), 3, 0)
    const row = reorderSegmentsToMatchBeats(moved, segments())

    expect(row.map((segment) => segment.sequenceIndex)).toEqual([0, 1, 2, 3])
    expect(row.map((segment) => [segment.startTime, segment.endTime])).toEqual([
      [0, 6],
      [6, 12],
      [12, 18],
      [18, 24],
    ])
  })

  it('preserves each segment own duration rather than a uniform one', () => {
    const uneven = segments().map((segment, index) =>
      index === 0 ? { ...segment, startTime: 0, endTime: 10 } : segment
    )
    // bt_a1's 10s segment moves to the end and keeps its length.
    const moved = reorderSceneBeats(approvedScene(), 0, 3)
    const row = reorderSegmentsToMatchBeats(moved, uneven)

    expect(beatIds(row)).toEqual(['bt_a2', 'bt_a3', 'bt_a4', 'bt_a1'])
    expect(row.map((segment) => segment.endTime - segment.startTime)).toEqual([6, 6, 6, 10])
    expect(row[3].startTime).toBe(18)
  })

  it('keeps dialogue split parts in their own order inside the beat', () => {
    const split = [
      ...segments().slice(0, 1),
      {
        ...segments()[1],
        segmentId: 'seg_2b',
        dialoguePortion: { lineId: 'ln_2', partIndex: 1, partCount: 2, excerpt: 'second' },
      },
      {
        ...segments()[1],
        segmentId: 'seg_2a',
        dialoguePortion: { lineId: 'ln_2', partIndex: 0, partCount: 2, excerpt: 'first' },
      },
      ...segments().slice(2),
    ] as SceneSegment[]

    const row = reorderSegmentsToMatchBeats(approvedScene(), split)

    expect(row.map((segment) => segment.segmentId)).toEqual([
      'seg_1',
      'seg_2a',
      'seg_2b',
      'seg_3',
      'seg_4',
    ])
  })

  it('refuses to reorder when a segment has no beat to place it against', () => {
    const orphaned = segments().map((segment, index) =>
      index === 2 ? { ...segment, beatId: 'bt_gone' } : segment
    )
    const moved = reorderSceneBeats(approvedScene(), 3, 0)

    expect(reorderSegmentsToMatchBeats(moved, orphaned)).toBe(orphaned)
  })

  it('leaves excluded beats out of the running order', () => {
    const withExcluded = beats().map((beat) =>
      beat.beatId === 'bt_a2' ? { ...beat, excluded: true } : beat
    )
    const scene = reorderSceneBeats(approvedScene({ beats: withExcluded }), 3, 0)
    const active = segments().filter((segment) => segment.beatId !== 'bt_a2')
    const row = reorderSegmentsToMatchBeats(scene, active)

    expect(beatIds(row)).toEqual(['bt_a4', 'bt_a1', 'bt_a3'])
  })
})
