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
import { mergeLanguageClipVersions } from '@/lib/scene/languageClipVersions'
import {
  END_FRAME_STILL_SLOT,
  START_FRAME_STILL_SLOT,
  mergeStillSlot,
  resolveCurrentTakeId,
  segmentHasPlayableVideo,
  unionRowsById,
} from '@/lib/storyboard/mediaVersions'

function takeMediaUrl(take: { assetUrl?: string | null; videoUrl?: string | null }): string {
  const asset = typeof take.assetUrl === 'string' ? take.assetUrl.trim() : ''
  if (asset) return asset
  return typeof take.videoUrl === 'string' ? take.videoUrl.trim() : ''
}

/** A same-id take with no file must not erase the stored video. */
function mergeTakeRow(incoming: SceneSegmentTake, existing: SceneSegmentTake): SceneSegmentTake {
  if (takeMediaUrl(existing) && !takeMediaUrl(incoming)) return existing
  return incoming
}

export function mergeProductionSegment(
  incoming: SceneSegment,
  existing: SceneSegment
): SceneSegment {
  const takes = unionRowsById(incoming.takes, existing.takes, 'id', mergeTakeRow) as SceneSegmentTake[]
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
  const languageVersions = mergeLanguageClipVersions(
    incoming.languageVersions,
    existing.languageVersions
  )
  const merged: SceneSegment = {
    ...existing,
    ...incoming,
    takes,
    currentTakeId,
    ...(languageVersions ? { languageVersions } : { languageVersions: undefined }),
    activeAssetUrl:
      currentTake?.assetUrl ||
      currentTake?.videoUrl ||
      incoming.activeAssetUrl ||
      existing.activeAssetUrl,
    references: refs as SceneSegmentReferences,
  }
  // JSON drops undefined, so a cleared trim or include flag arrives as null.
  // Null means the stored value must not come back on the next load.
  const clearable = incoming as SceneSegment & {
    videoTrimInSec?: number | null
    videoTrimOutSec?: number | null
    mixerBeatIncluded?: boolean | null
  }
  if (clearable.videoTrimInSec === null) delete merged.videoTrimInSec
  if (clearable.videoTrimOutSec === null) delete merged.videoTrimOutSec
  if (clearable.mixerBeatIncluded === null) delete merged.mixerBeatIncluded
  // A stale save (for example status GENERATING before the file existed) must
  // not clear a clip that is already stored.
  if (segmentHasPlayableVideo(existing) && !segmentHasPlayableVideo(incoming)) {
    merged.activeAssetUrl = existing.activeAssetUrl
    if (existing.assetType) merged.assetType = existing.assetType
    if (existing.status) merged.status = existing.status
    if (existing.currentTakeId) merged.currentTakeId = existing.currentTakeId
  } else if (
    segmentHasPlayableVideo(merged) &&
    incoming.status !== 'GENERATING' &&
    incoming.status !== 'ERROR'
  ) {
    if (!merged.assetType) {
      merged.assetType = existing.assetType || 'video'
    }
    if (!merged.status || merged.status === 'DRAFT') {
      merged.status =
        existing.status && existing.status !== 'DRAFT' ? existing.status : 'COMPLETE'
    }
  }
  return merged
}

function existingClipScore(segment: SceneSegment): number {
  let score = 0
  if (segment.status === 'COMPLETE' && segment.assetType === 'video' && segment.activeAssetUrl) {
    score += 100
  } else if (segment.activeAssetUrl) {
    score += 40
  }
  if ((segment.takes?.length ?? 0) > 0) score += 10
  if ((segment.dialoguePortion?.partIndex ?? 0) === 0) score += 5
  return score
}

/** Prefer the same segmentId; otherwise the strongest clip already stored on that beat. */
function findPreviousProductionSegment(
  incoming: SceneSegment,
  existing: SceneSegment[] | undefined,
  used: Set<string>
): SceneSegment | undefined {
  const rows = existing ?? []
  const byId = rows.find((row) => row.segmentId === incoming.segmentId && !used.has(row.segmentId))
  if (byId) return byId
  const beatId = incoming.beatId?.trim()
  if (!beatId) return undefined
  const candidates = rows.filter((row) => row.beatId === beatId && !used.has(row.segmentId))
  if (candidates.length === 0) return undefined
  return [...candidates].sort((a, b) => existingClipScore(b) - existingClipScore(a))[0]
}

export function mergeSceneProductionData(
  existing: SceneProductionData | undefined,
  incoming: SceneProductionData | undefined,
  options?: { preserveBeatIds?: Iterable<string> }
): SceneProductionData | undefined {
  if (!existing) return incoming
  if (!incoming) return existing

  // Incoming segments are the clip list. Matching ids still merge takes and stills.
  // A re-derive that minted new ids still keeps the stored clip when beatId matches.
  // Ids that are not in the incoming list are dropped so leftover dialogue-split
  // rows cannot undo a 1:1 beat list. An omitted field leaves clips alone.
  const used = new Set<string>()
  const segments = Array.isArray(incoming.segments)
    ? incoming.segments.map((segment) => {
        const previous = findPreviousProductionSegment(segment, existing.segments, used)
        if (!previous) return segment
        used.add(previous.segmentId)
        return {
          ...mergeProductionSegment(segment, previous),
          segmentId: previous.segmentId,
        }
      })
      : existing.segments
  const preserveBeatIds = new Set(options?.preserveBeatIds ?? [])
  const incomingBeatIds = new Set(
    (segments ?? []).map((segment) => segment.beatId).filter((beatId): beatId is string => !!beatId)
  )
  const preserved = (existing?.segments ?? []).filter((segment) => {
    const beatId = segment.beatId?.trim()
    return !!beatId && preserveBeatIds.has(beatId) && !incomingBeatIds.has(beatId) && !used.has(segment.segmentId)
  })
  const deletedStreamIds = Array.from(
    new Set([
      ...(Array.isArray(existing.deletedStreamIds) ? existing.deletedStreamIds : []),
      ...(Array.isArray(incoming.deletedStreamIds) ? incoming.deletedStreamIds : []),
    ])
  ).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  const deletedStreamIdSet = new Set(deletedStreamIds)

  const deletedStreamUrls = new Set<string>()
  for (const s of [...(existing.productionStreams ?? []), ...(incoming.productionStreams ?? [])]) {
    if (s?.id && deletedStreamIdSet.has(s.id) && typeof s.mp4Url === 'string' && s.mp4Url.trim()) {
      deletedStreamUrls.add(s.mp4Url.trim())
    }
  }

  const mergedStreams = (
    unionRowsById(
      incoming.productionStreams,
      existing.productionStreams,
      'id'
    ) as ProductionStream[]
  ).filter((s) => !s?.id || !deletedStreamIdSet.has(s.id))
  const existingNonDeletedStreams = existing.productionStreams
    ? existing.productionStreams.filter((s) => !s?.id || !deletedStreamIdSet.has(s.id))
    : undefined

  const productionStreams =
    mergedStreams.length > 0
      ? mergedStreams
      : deletedStreamIdSet.size > 0 || Array.isArray(incoming.productionStreams)
        ? mergedStreams
        : existingNonDeletedStreams

  const latestCompleteVideoUrl =
    (productionStreams ?? [])
      .filter((s) => (s.streamType === 'video' || !s.streamType) && s.status === 'complete' && s.mp4Url)
      .slice(-1)[0]?.mp4Url ?? null
  const rawRenderedSceneUrl =
    incoming.renderedSceneUrl !== undefined ? incoming.renderedSceneUrl : existing.renderedSceneUrl
  const renderedSceneUrl =
    incoming.renderedSceneUrl === null
      ? latestCompleteVideoUrl
      : typeof rawRenderedSceneUrl === 'string' && deletedStreamUrls.has(rawRenderedSceneUrl.trim())
        ? latestCompleteVideoUrl
        : rawRenderedSceneUrl

  const candidateCurrentStreamId = incoming.currentStreamId || existing.currentStreamId
  const currentStreamId =
    candidateCurrentStreamId && deletedStreamIdSet.has(candidateCurrentStreamId)
      ? (productionStreams ?? []).filter((s) => s.status === 'complete' && s.mp4Url).slice(-1)[0]?.id
      : candidateCurrentStreamId

  return {
    ...existing,
    ...incoming,
    segments: segments ? [...segments, ...preserved] : segments,
    productionStreams,
    ...(deletedStreamIds.length > 0 ? { deletedStreamIds } : {}),
    ...(renderedSceneUrl !== undefined ? { renderedSceneUrl } : {}),
    currentStreamId,
  }
}
