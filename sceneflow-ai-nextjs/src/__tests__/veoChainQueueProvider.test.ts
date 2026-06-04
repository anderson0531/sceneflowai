import { describe, expect, it } from 'vitest'
import {
  priorSegmentSupportsVertexExt,
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
})
