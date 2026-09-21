/**
 * Union production takes, streams, and start/end still versions on PATCH.
 * Replacing a scene blob must not wipe take/stream history.
 */

import type {
  ProductionStream,
  SceneProductionData,
  SceneSegment,
  SceneSegmentReferences,
  SceneSegmentTake,
} from '@/components/vision/scene-production/types'
import {
  END_FRAME_STILL_SLOT,
  START_FRAME_STILL_SLOT,
  mergeStillSlot,
  resolveCurrentTakeId,
  unionRowsById,
} from '@/lib/storyboard/mediaVersions'

export function mergeProductionSegment(
  incoming: SceneSegment,
  existing: SceneSegment
): SceneSegment {
  const takes = unionRowsById(incoming.takes, existing.takes, 'id') as SceneSegmentTake[]
  const refs: Record<string, unknown> = {
    ...(existing.references || {}),
    ...(incoming.references || {}),
  }
  mergeStillSlot(
    refs,
    incoming.references as unknown as Record<string, unknown> | undefined,
    existing.references as unknown as Record<string, unknown> | undefined,
    START_FRAME_STILL_SLOT
  )
  mergeStillSlot(
    refs,
    incoming.references as unknown as Record<string, unknown> | undefined,
    existing.references as unknown as Record<string, unknown> | undefined,
    END_FRAME_STILL_SLOT
  )
  const currentTakeId = resolveCurrentTakeId(
    takes,
    incoming.currentTakeId ?? existing.currentTakeId,
    incoming.activeAssetUrl ?? existing.activeAssetUrl
  )
  const currentTake = takes.find((take) => take.id === currentTakeId)
  return {
    ...existing,
    ...incoming,
    takes,
    currentTakeId,
    activeAssetUrl:
      currentTake?.assetUrl ||
      currentTake?.videoUrl ||
      incoming.activeAssetUrl ||
      existing.activeAssetUrl,
    references: refs as SceneSegmentReferences,
  }
}

export function mergeSceneProductionData(
  existing: SceneProductionData | undefined,
  incoming: SceneProductionData | undefined
): SceneProductionData | undefined {
  if (!existing) return incoming
  if (!incoming) return existing

  // Incoming segments are the clip list. Matching ids still merge takes and stills.
  // Ids that are not in the incoming list are dropped so a 1:1 re-derive cannot
  // be undone by leftover dialogue-split rows. An omitted field leaves clips alone.
  const segments = Array.isArray(incoming.segments)
    ? incoming.segments.map((segment) => {
        const previous = existing.segments?.find((row) => row.segmentId === segment.segmentId)
        return previous ? mergeProductionSegment(segment, previous) : segment
      })
    : existing.segments
  const productionStreams = unionRowsById(
    incoming.productionStreams,
    existing.productionStreams,
    'id'
  ) as ProductionStream[]

  return {
    ...existing,
    ...incoming,
    segments,
    productionStreams:
      productionStreams.length > 0 ? productionStreams : existing.productionStreams,
    currentStreamId: incoming.currentStreamId || existing.currentStreamId,
  }
}
