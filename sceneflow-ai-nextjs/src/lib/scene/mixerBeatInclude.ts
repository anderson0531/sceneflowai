import type { SceneSegment } from '@/components/vision/scene-production/types'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import { resolveLiveTake, segmentHasPlayableVideo } from '@/lib/storyboard/mediaVersions'

/** Included when undefined or true; excluded only when explicitly false. */
export function isMixerBeatIncluded(
  segment: Pick<SceneSegment, 'mixerBeatIncluded'>
): boolean {
  return segment.mixerBeatIncluded !== false
}

/**
 * Direction Include is the source of truth. A stored `mixerBeatIncluded: false`
 * left over from an earlier exclude must not hide the beat in the Mixer.
 */
export function restoreIncludedMixerBeats<T extends Pick<SceneSegment, 'beatId' | 'mixerBeatIncluded'>>(
  segments: T[],
  includedBeatIds: Iterable<string>
): { segments: T[]; changed: boolean } {
  const included = new Set(includedBeatIds)
  let changed = false
  const next = segments.map((segment) => {
    if (!segment.beatId || !included.has(segment.beatId)) return segment
    if (segment.mixerBeatIncluded !== false) return segment
    changed = true
    return { ...segment, mixerBeatIncluded: true }
  })
  return { segments: changed ? next : segments, changed }
}

export function filterMixerIncludedSegments<T extends Pick<SceneSegment, 'mixerBeatIncluded'>>(
  segments: T[]
): T[] {
  return segments.filter(isMixerBeatIncluded)
}

const BEAT_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v']

/** True when the beat's active asset is a video file, including uploads without assetType. */
export function isMixerVideoAsset(
  segment: Pick<SceneSegment, 'assetType' | 'activeAssetUrl'>
): boolean {
  if (segment.assetType === 'video') return true
  const url = segment.activeAssetUrl?.toLowerCase() ?? ''
  if (!url) return false
  if (BEAT_VIDEO_EXTENSIONS.some((ext) => url.includes(ext))) return true
  if (url.includes('video/') || url.includes('/videos/')) return true
  return false
}

export interface MixerBeatRow {
  beatId: string
  beatNumber: number
  segment?: SceneSegment
}

function segmentTakeTimestamp(segment: SceneSegment): number {
  const live = resolveLiveTake(segment.takes, segment.currentTakeId, segment.activeAssetUrl)
  if (!live?.createdAt) return 0
  const parsed = Date.parse(live.createdAt)
  return Number.isFinite(parsed) ? parsed : 0
}

function hasExplicitSelectedTake(segment: SceneSegment): boolean {
  if (segment.currentTakeId && Array.isArray(segment.takes)) {
    return segment.takes.some((t) => t.id === segment.currentTakeId)
  }
  return false
}

function pickDesignatedBeatSegment(matches: SceneSegment[]): SceneSegment | undefined {
  if (matches.length === 0) return undefined
  if (matches.length === 1) return matches[0]
  const playable = matches.filter((row) => segmentHasPlayableVideo(row))
  const pool = playable.length > 0 ? playable : matches
  const includedPool = pool.filter(isMixerBeatIncluded)
  const candidates = includedPool.length > 0 ? includedPool : pool
  const primaryPortion = candidates.filter((row) => (row.dialoguePortion?.partIndex ?? 0) === 0)
  const finalPool = primaryPortion.length > 0 ? primaryPortion : candidates
  if (finalPool.length === 1) return finalPool[0]
  const withSelectedTake = finalPool.filter(hasExplicitSelectedTake)
  const rankedPool = withSelectedTake.length > 0 ? withSelectedTake : finalPool
  if (rankedPool.length === 1) return rankedPool[0]
  return [...rankedPool]
    .map((seg, idx) => ({ seg, idx, ts: segmentTakeTimestamp(seg) }))
    .sort((a, b) => (b.ts !== a.ts ? b.ts - a.ts : b.idx - a.idx))[0]?.seg
}

/** Direction-included beats in script order, each matched to its clip when one exists. */
export function listMixerBeatRows(
  scene: Record<string, unknown> | null | undefined,
  segments: SceneSegment[] | null | undefined
): MixerBeatRow[] {
  const allBeats = getSceneBeats(scene ?? null)
  const beats = allBeats.filter((beat) => !isBeatExcluded(beat))
  const rows = segments ?? []
  return beats.map((beat, index) => {
    const rawBeatIndex = allBeats.findIndex((entry) => entry.beatId === beat.beatId)
    const beatNumber =
      (typeof beat.sequenceIndex === 'number'
        ? beat.sequenceIndex
        : rawBeatIndex >= 0
          ? rawBeatIndex
          : index) + 1
    const matches = rows.filter((segment) => segment.beatId === beat.beatId)
    const segment = pickDesignatedBeatSegment(matches)
    return segment
      ? { beatId: beat.beatId, beatNumber, segment }
      : { beatId: beat.beatId, beatNumber }
  })
}

function segmentHasMixerVideo(segment: SceneSegment): boolean {
  if (!segmentHasPlayableVideo(segment)) return false
  if (isMixerVideoAsset(segment)) return true
  const take = segment.takes?.find((row) => row.videoUrl || row.assetUrl)
  return isMixerVideoAsset({
    assetType: segment.assetType,
    activeAssetUrl: take?.videoUrl || take?.assetUrl || null,
  })
}

function normalizeDesignatedSegmentVideo(segment: SceneSegment): SceneSegment {
  const live = resolveLiveTake(segment.takes, segment.currentTakeId, segment.activeAssetUrl)
  if (!live?.url) return segment
  if (segment.activeAssetUrl === live.url && segment.assetType === 'video') {
    return segment
  }
  return {
    ...segment,
    activeAssetUrl: live.url,
    ...(segment.currentTakeId ? {} : { currentTakeId: live.id }),
    assetType: 'video',
  }
}

function dedupeSegmentsByBeatId(segments: SceneSegment[]): SceneSegment[] {
  const byBeatId = new Map<string, SceneSegment[]>()
  for (const seg of segments) {
    const beatId = seg.beatId?.trim()
    if (!beatId) continue
    const list = byBeatId.get(beatId) ?? []
    list.push(seg)
    byBeatId.set(beatId, list)
  }

  const seenBeatIds = new Set<string>()
  const seenSegmentIds = new Set<string>()
  const result: SceneSegment[] = []

  for (const seg of segments) {
    const beatId = seg.beatId?.trim()
    if (beatId) {
      if (seenBeatIds.has(beatId)) continue
      seenBeatIds.add(beatId)
      const winner = pickDesignatedBeatSegment(byBeatId.get(beatId) ?? [seg])
      if (winner && (!winner.segmentId || !seenSegmentIds.has(winner.segmentId))) {
        if (winner.segmentId) seenSegmentIds.add(winner.segmentId)
        result.push(winner)
      }
      continue
    }
    if (seg.segmentId) {
      if (seenSegmentIds.has(seg.segmentId)) continue
      seenSegmentIds.add(seg.segmentId)
    }
    result.push(seg)
  }

  return result
}

/**
 * Included beats that already have a playable video, including an uploaded take.
 * When `scene` is provided and has Direction-included beats, resolves at most one
 * designated clip per included beat in beat order and normalizes its active take URL.
 */
export function listIncludedBeatVideos(
  segments: SceneSegment[] | null | undefined,
  scene?: Record<string, unknown> | null
): SceneSegment[] {
  const raw = segments ?? []
  if (raw.length === 0) return []

  let candidates: SceneSegment[]
  const includedBeats = scene
    ? getSceneBeats(scene).filter((beat) => !isBeatExcluded(beat))
    : []
  if (includedBeats.length > 0) {
    const rows = listMixerBeatRows(scene, raw)
    const matched = rows
      .map((row) => row.segment)
      .filter((segment): segment is SceneSegment => Boolean(segment))
    candidates = matched.length > 0 ? matched : dedupeSegmentsByBeatId(raw)
  } else {
    candidates = dedupeSegmentsByBeatId(raw)
  }

  return filterMixerIncludedSegments(candidates.filter(segmentHasMixerVideo)).map(
    normalizeDesignatedSegmentVideo
  )
}
