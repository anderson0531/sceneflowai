import { describe, expect, it } from 'vitest'
import {
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
