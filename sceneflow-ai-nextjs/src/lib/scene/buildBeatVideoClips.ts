import type { BeatVideoClip } from '@/components/vision/scene-production/BeatVideoGallery'
import type { DirectorQueueItem, SceneSegment } from '@/components/vision/scene-production/types'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import { parsePersistedMusicCues, resolveBeatMusicCue } from '@/lib/script/sceneMusicCues'
import { resolveCurrentStillTier, segmentHasPlayableVideo } from '@/lib/storyboard/mediaVersions'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import { f2vStartFromPreviousEnd, resolveF2VFrameUrls } from '@/lib/vision/segmentConfigBuilder'
import type { DetailedSceneDirection } from '@/types/scene-direction'

export interface BuildBeatVideoClipsArgs {
  scene: Record<string, unknown> | null | undefined
  segments: SceneSegment[]
  queue: DirectorQueueItem[]
}

/**
 * Build the ordered list of clip rows for the Clips tab (`BeatVideoGallery`).
 *
 * Key invariants:
 * - Only non-excluded beats appear in `fromBeats`.
 * - Each beat keeps its canonical 1-based shot number (`beat.sequenceIndex + 1`)
 *   so Shot 2..Shot 15 stay numbered 2..15 when Shot 1 is excluded (matching
 *   Direction, Audio, Continuity, and Stills).
 * - Preserved segments belonging to excluded beats (`excludedBeatIds`) are
 *   never appended to `orphanClips` (preventing an excluded Shot 1's clip from
 *   appearing at the end as a fake "Shot 15" with `imageTier: undefined` /
 *   status "Missing" and then migrating back to Shot 1 when re-included).
 */
export function buildBeatVideoClips({
  scene,
  segments,
  queue,
}: BuildBeatVideoClipsArgs): BeatVideoClip[] {
  const sceneRecord = scene ?? null
  const allBeats = getSceneBeats(sceneRecord)
  const beats = allBeats.filter((beat) => !isBeatExcluded(beat))
  const excludedBeatIds = new Set(
    allBeats.filter((beat) => isBeatExcluded(beat)).map((beat) => beat.beatId)
  )
  const sceneDirection = ((sceneRecord?.sceneDirection ?? sceneRecord?.detailedDirection ?? null) ||
    null) as DetailedSceneDirection | null
  const persistedMusicCues = parsePersistedMusicCues(sceneRecord?.sceneMusicCues, allBeats)
  const used = new Set<string>()

  const fromBeats: BeatVideoClip[] = beats.map((beat, index) => {
    const matches = segments.filter((segment) => segment.beatId === beat.beatId)
    for (const row of matches) {
      used.add(row.segmentId)
    }
    const segment =
      matches.find((row) => segmentHasPlayableVideo(row)) ??
      matches.find((row) => (row.dialoguePortion?.partIndex ?? 0) === 0) ??
      matches[0]
    if (segment) used.add(segment.segmentId)
    const item = segment ? queue.find((entry) => entry.segmentId === segment.segmentId) : undefined
    const f2v = segment
      ? resolveF2VFrameUrls(segment, sceneRecord ?? undefined)
      : { startFrameUrl: null, endFrameUrl: null }
    const previousBeat = index > 0 ? beats[index - 1] : undefined
    const previousSegment = previousBeat
      ? segments.find((row) => row.beatId === previousBeat.beatId)
      : undefined
    const previousEndFrameUrl = f2vStartFromPreviousEnd(
      previousSegment
        ? resolveF2VFrameUrls(previousSegment, sceneRecord ?? undefined).endFrameUrl
        : null
    )
    const thumbnail =
      beat.storyboardImageUrl?.trim() ||
      item?.thumbnailUrl ||
      segment?.startFrameUrl ||
      segment?.references?.startFrameUrl ||
      undefined
    const spoken = beat.kind === 'action' ? beat.actionDescription : beat.line
    const rawBeatIndex = allBeats.findIndex((entry) => entry.beatId === beat.beatId)
    const beatNumber =
      (typeof beat.sequenceIndex === 'number'
        ? beat.sequenceIndex
        : rawBeatIndex >= 0
          ? rawBeatIndex
          : index) + 1
    const musicCue =
      rawBeatIndex >= 0 ? resolveBeatMusicCue(persistedMusicCues, rawBeatIndex) : undefined
    const resolvedPrompt =
      item?.config.prompt ||
      segment?.userEditedPrompt ||
      segment?.generatedPrompt ||
      beat.beatDirection?.videoPrompt?.trim() ||
      compileBeatVideoPromptFromDirection(beat, sceneDirection, {
        previousBeat,
        ...(musicCue ? { musicCue } : {}),
      }).prompt
    return {
      key: beat.beatId,
      beatId: beat.beatId,
      beatNumber,
      label: (spoken || beat.kind || `Shot ${beatNumber}`).replace(/\s+/g, ' ').trim(),
      prompt: resolvedPrompt,
      kind: beat.kind,
      thumbnailUrl: thumbnail,
      hasStartFrame: !!thumbnail,
      f2vStartUrl: f2v.startFrameUrl,
      f2vEndUrl: f2v.endFrameUrl,
      previousEndFrameUrl,
      segment,
      queueItem: item,
      imageTier: resolveCurrentStillTier({
        url: beat.storyboardImageUrl,
        versionId: beat.storyboardImageVersionId,
        versions: beat.storyboardImageVersions,
        beatTier: beat.storyboardImageTier,
      }),
      promptChanged: isBeatFrameStale(beat) || !!segment?.isStale,
    }
  })

  const maxBeatNumber = fromBeats.reduce(
    (max, clip) => Math.max(max, clip.beatNumber),
    allBeats.length
  )

  const orphanClips: BeatVideoClip[] = segments
    .filter(
      (segment) =>
        !used.has(segment.segmentId) &&
        !(segment.beatId && excludedBeatIds.has(segment.beatId)) &&
        segmentHasPlayableVideo(segment)
    )
    .map((segment, index) => {
      const item = queue.find((entry) => entry.segmentId === segment.segmentId)
      const beatNumber = maxBeatNumber + index + 1
      return {
        key: segment.segmentId,
        beatNumber,
        label: (
          item?.config.prompt ||
          segment.userEditedPrompt ||
          segment.generatedPrompt ||
          `Clip ${beatNumber}`
        )
          .replace(/\s+/g, ' ')
          .trim(),
        prompt: item?.config.prompt || segment.userEditedPrompt || segment.generatedPrompt,
        thumbnailUrl:
          item?.thumbnailUrl ||
          segment.startFrameUrl ||
          segment.references?.startFrameUrl ||
          undefined,
        hasStartFrame: !!(
          item?.thumbnailUrl ||
          segment.startFrameUrl ||
          segment.references?.startFrameUrl
        ),
        segment,
        queueItem: item,
        promptChanged: !!segment.isStale,
      }
    })

  if (allBeats.length > 0) return [...fromBeats, ...orphanClips]

  return queue
    .filter((item) => !used.has(item.segmentId))
    .map((item, index) => {
      const segment = segments.find((row) => row.segmentId === item.segmentId)
      return {
        key: item.segmentId,
        beatNumber: index + 1,
        label: item.config.prompt || `Clip ${index + 1}`,
        prompt: item.config.prompt,
        thumbnailUrl: item.thumbnailUrl || undefined,
        hasStartFrame: !!(item.thumbnailUrl || segment?.startFrameUrl),
        segment,
        queueItem: item,
        promptChanged: !!segment?.isStale,
      }
    })
}
