import { describe, expect, it } from 'vitest'
import {
  claimNextRunnableVideoIndex,
  isVideoQueueItemRunnable,
  priorSegmentSupportsVertexExt,
  resolvePriorChainLastFrameUrl,
  resolveVeoRefForExtension,
} from '@/lib/video/veoChainQueue'
import type { SceneSegment } from '@/components/vision/scene-production/types'

function seg(partial: Partial<SceneSegment> & { segmentId: string; sequenceIndex: number }): SceneSegment {
  return {
    segmentId: partial.segmentId,
    sequenceIndex: partial.sequenceIndex,
    startTime: 0,
    endTime: 8,
    generatedPrompt: 'test',
    ...partial,
  } as SceneSegment
}

describe('veoChainQueue provider awareness', () => {
  it('rejects EXT ref when previous part used Fal fallback', () => {
    const prev = seg({
      segmentId: 'a',
      sequenceIndex: 0,
      generationProvider: 'fal',
      takes: [{ veoVideoRef: 'files/abc' }],
    })
    expect(priorSegmentSupportsVertexExt(prev)).toBe(false)
    const current = seg({ segmentId: 'b', sequenceIndex: 1, beatId: 'beat-1' })
    const ref = resolveVeoRefForExtension([prev, current], current)
    expect(ref).toBeUndefined()
  })

  it('returns ref when previous part is Vertex', () => {
    const prev = seg({
      segmentId: 'a',
      sequenceIndex: 0,
      generationProvider: 'vertex',
      takes: [{ veoVideoRef: 'projects/x/locations/y/files/z' }],
    })
    const current = seg({ segmentId: 'b', sequenceIndex: 1, beatId: 'beat-1' })
    expect(priorSegmentSupportsVertexExt(prev)).toBe(true)
    expect(resolveVeoRefForExtension([prev, current], current)).toBe(
      'projects/x/locations/y/files/z'
    )
  })

  it('resolves prior chain last frame from latest successful take', () => {
    const prev = seg({
      segmentId: 'a',
      sequenceIndex: 0,
      beatId: 'beat-1',
      dialoguePortion: { partIndex: 0, partCount: 2, lineId: 'ln-1', excerpt: 'Part one' },
      takes: [
        {
          status: 'done',
          lastFrameUrl: 'https://cdn.example.com/part-0-last.png',
        },
      ],
    })
    const current = seg({
      segmentId: 'b',
      sequenceIndex: 1,
      beatId: 'beat-1',
      dialoguePortion: { partIndex: 1, partCount: 2, lineId: 'ln-1', excerpt: 'Part two' },
      generationMethod: 'EXT',
    })

    expect(resolvePriorChainLastFrameUrl([prev, current], current)).toBe(
      'https://cdn.example.com/part-0-last.png'
    )
  })
})

describe('video queue claim', () => {
  const part0 = seg({
    segmentId: 'part-0',
    sequenceIndex: 0,
    beatId: 'beat-1',
    dialoguePortion: { partIndex: 0, partCount: 2, lineId: 'ln-1', excerpt: 'Part one' },
  })
  const part1 = seg({
    segmentId: 'part-1',
    sequenceIndex: 1,
    beatId: 'beat-1',
    dialoguePortion: { partIndex: 1, partCount: 2, lineId: 'ln-1', excerpt: 'Part two' },
    generationMethod: 'EXT',
  })
  const independent = seg({
    segmentId: 'other',
    sequenceIndex: 2,
    beatId: 'beat-2',
  })
  const segments = [part0, part1, independent]
  const items = [
    { segmentId: 'part-0' },
    { segmentId: 'part-1' },
    { segmentId: 'other' },
  ]

  it('starts an independent shot while a continuation waits on its previous part', () => {
    const batchIds = new Set(items.map((item) => item.segmentId))
    const finished = new Set<string>()
    expect(isVideoQueueItemRunnable(part1, batchIds, finished, segments)).toBe(false)
    expect(isVideoQueueItemRunnable(independent, batchIds, finished, segments)).toBe(true)
    expect(isVideoQueueItemRunnable(part0, batchIds, finished, segments)).toBe(true)

    const claimed = new Set<number>([0])
    expect(claimNextRunnableVideoIndex(items, segments, claimed, finished)).toBe(2)
  })

  it('claims a continuation once its previous part in the batch has finished', () => {
    const finished = new Set(['part-0'])
    const claimed = new Set<number>([0])
    expect(claimNextRunnableVideoIndex(items, segments, claimed, finished)).toBe(1)
  })

  it('starts a continuation immediately when its predecessor is not in this batch', () => {
    const onlyContinuation = [{ segmentId: 'part-1' }]
    expect(claimNextRunnableVideoIndex(onlyContinuation, segments, new Set(), new Set())).toBe(0)
  })
})
