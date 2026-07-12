import type { SceneSegment } from '@/components/vision/scene-production/types'

export type SegmentVideoProvider = 'vertex' | 'fal' | 'kling' | 'aggregator'

/** True when a prior segment can supply a Vertex Veo ref for EXT (not Fal/Kling fallback). */
export function priorSegmentSupportsVertexExt(
  prev: SceneSegment | undefined
): boolean {
  if (!prev) return false
  const provider = (prev as SceneSegment & { generationProvider?: SegmentVideoProvider })
    .generationProvider
  if (provider === 'fal' || provider === 'kling' || provider === 'aggregator') return false
  const ref = prev.takes?.[0]?.veoVideoRef
  return typeof ref === 'string' && ref.trim().length > 0
}

/** Segment is part of a Veo extension chain (not the initial clip). */
export function isVeoChainContinuation(segment: SceneSegment): boolean {
  return (
    segment.veoTimelineContinuation === true ||
    segment.generationMethod === 'EXT' ||
    segment.videoChain?.chainMethod === 'extension'
  )
}

export function segmentHasVeoChain(segment: SceneSegment): boolean {
  return (
    isVeoChainContinuation(segment) ||
    (segment.videoChain != null && segment.videoChain.partCount > 1)
  )
}

/** Prior segment in the same beat / dialogue split chain. */
export function findPreviousChainSegment(
  segments: SceneSegment[],
  current: SceneSegment
): SceneSegment | undefined {
  const partIndex = current.dialoguePortion?.partIndex ?? current.videoChain?.partIndex
  if (partIndex != null && partIndex > 0 && current.beatId) {
    const byBeat = segments.find(
      (s) =>
        s.beatId === current.beatId &&
        (s.dialoguePortion?.partIndex === partIndex - 1 ||
          s.videoChain?.partIndex === partIndex - 1)
    )
    if (byBeat) return byBeat
  }
  if (current.sequenceIndex > 0) {
    return segments.find((s) => s.sequenceIndex === current.sequenceIndex - 1)
  }
  return undefined
}

export function resolveVeoRefForExtension(
  segments: SceneSegment[],
  current: SceneSegment
): string | undefined {
  const prev = findPreviousChainSegment(segments, current)
  if (!priorSegmentSupportsVertexExt(prev)) return undefined
  const ref = prev?.takes?.[0]?.veoVideoRef
  return typeof ref === 'string' && ref.trim() ? ref.trim() : undefined
}

/** Last frame URL from the prior segment in a beat/dialogue chain (for Kling I2V continuations). */
export function resolvePriorChainLastFrameUrl(
  segments: SceneSegment[],
  current: SceneSegment
): string | undefined {
  const prev = findPreviousChainSegment(segments, current)
  if (!prev) return undefined

  const successfulTakes =
    prev.takes?.filter(
      (t) => t.status === 'done' && (t.lastFrameUrl || t.thumbnailUrl)
    ) || []

  if (successfulTakes.length > 0) {
    const latestTake = successfulTakes[successfulTakes.length - 1]
    return latestTake.lastFrameUrl || latestTake.thumbnailUrl || undefined
  }

  return prev.references?.endFrameUrl || prev.lastFrameUrl || undefined
}

/** Ordered segments belonging to one beat chain. */
export function getBeatChainSegments(
  segments: SceneSegment[],
  beatId: string
): SceneSegment[] {
  return segments
    .filter((s) => s.beatId === beatId)
    .sort((a, b) => {
      const ai =
        a.dialoguePortion?.partIndex ?? a.videoChain?.partIndex ?? a.sequenceIndex
      const bi =
        b.dialoguePortion?.partIndex ?? b.videoChain?.partIndex ?? b.sequenceIndex
      return ai - bi
    })
}
