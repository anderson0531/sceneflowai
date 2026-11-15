/**
 * Production Mixer timing — single source for segment ↔ dialogue alignment.
 */
import type { AudioTrackClipV2, SceneSegment } from '@/components/vision/scene-production/types'
import { clipMatchesDialogueLineId } from '@/components/vision/scene-production/audioTrackBuilder'
import { clampVideoPlaybackRate } from '@/lib/scene/languageShotLocalize'
import { resolveVideoTrimWindow, resolveSegmentSourceDurationSec } from '@/lib/video/segmentVideoTrim'

export { clipMatchesDialogueLineId } from '@/components/vision/scene-production/audioTrackBuilder'

/** Gap between dialogue lines within the same segment (seconds). */
export const MIXER_DIALOGUE_INTRA_GAP_SEC = 0.3

/** Auto pause after a segment that contains dialogue (seconds). */
export const MIXER_SEGMENT_DIALOGUE_PAUSE_SEC = 1.0

export const MIXER_MIN_SEGMENT_VISUAL_SEC = 2
export const MIXER_DEFAULT_VISUAL_SEC = 4

export function getClipsAssignedToSegment(
  segment: SceneSegment,
  clips: AudioTrackClipV2[],
  narrationPrefix = 0,
  scene?: Record<string, unknown> | null,
  excludedLineIds?: ReadonlySet<string>
): AudioTrackClipV2[] {
  const lineIds = (segment.dialogueLineIds ?? []).filter(
    (id) => !excludedLineIds || !excludedLineIds.has(id)
  )
  if (lineIds.length === 0) return []
  return clips.filter((c) => {
    if (excludedLineIds && ((c.lineId && excludedLineIds.has(c.lineId)) || excludedLineIds.has(c.id))) {
      return false
    }
    return lineIds.some((id) => clipMatchesDialogueLineId(c, id, narrationPrefix, scene))
  })
}

export function getVisualBaseDuration(
  segment: SceneSegment,
  measuredSourceDurationSec?: number
): number {
  const hasVideoDuration =
    (typeof measuredSourceDurationSec === 'number' &&
      Number.isFinite(measuredSourceDurationSec) &&
      measuredSourceDurationSec > 0) ||
    (typeof segment.actualVideoDuration === 'number' &&
      Number.isFinite(segment.actualVideoDuration) &&
      segment.actualVideoDuration > 0)
  const sourceDuration = resolveSegmentSourceDurationSec(segment, measuredSourceDurationSec)
  const { playableSec, isTrimmed } = resolveVideoTrimWindow(segment, sourceDuration)
  if (isTrimmed || hasVideoDuration) {
    return Math.max(MIXER_MIN_SEGMENT_VISUAL_SEC, playableSec)
  }

  const raw =
    segment.imageDuration ??
    segment.actualVideoDuration ??
    (segment.endTime > segment.startTime ? segment.endTime - segment.startTime : MIXER_DEFAULT_VISUAL_SEC)
  return Number.isFinite(raw) && raw > 0 ? raw : MIXER_DEFAULT_VISUAL_SEC
}

export function sumAssignedDialogueDuration(
  clips: AudioTrackClipV2[],
  probedDurations: Record<string, number> = {},
  getPlaybackRate?: (clipId: string) => number
): number {
  if (clips.length === 0) return 0
  let total = 0
  for (const clip of clips) {
    const src = probedDurations[clip.id] ?? clip.actualDuration ?? clip.duration ?? 3
    const rate = getPlaybackRate?.(clip.id) ?? 1
    const clampedRate = Math.min(1.5, Math.max(0.5, rate > 0 ? rate : 1))
    total += src / clampedRate
  }
  if (clips.length > 1) {
    total += (clips.length - 1) * MIXER_DIALOGUE_INTRA_GAP_SEC
  }
  return total
}

export interface SegmentDurationInput {
  segment: SceneSegment
  dialogueClips: AudioTrackClipV2[]
  probedDurations?: Record<string, number>
  measuredVideoDuration?: number
  /** Intro freeze-frame hold on Frame 0 before motion begins (seconds). */
  preSegmentHoldSec?: number
  manualPostPause?: number
  /** Automatic narration overrun hold added to this shot (seconds). */
  narrationPostPause?: number
  dialogueEnabled?: boolean
  narrationPrefix?: number
  excludedLineIds?: ReadonlySet<string>
  getPlaybackRate?: (clipId: string) => number
  /** Picture speed (0.5x slow-mo to 1.5x fast). 1 leaves master timing unchanged. */
  videoPlaybackRate?: number
}

/** Content duration (visual vs dialogue), before intro hold and post-dialogue/narration pause. */
export function computeSegmentContentDuration(input: SegmentDurationInput): number {
  const {
    segment,
    dialogueClips,
    probedDurations = {},
    measuredVideoDuration,
    dialogueEnabled = true,
    narrationPrefix = 0,
    excludedLineIds,
    getPlaybackRate,
    videoPlaybackRate,
  } = input

  const visual =
    Math.max(MIXER_MIN_SEGMENT_VISUAL_SEC, getVisualBaseDuration(segment, measuredVideoDuration)) /
    clampVideoPlaybackRate(videoPlaybackRate)

  if (!dialogueEnabled) return visual

  const assigned = getClipsAssignedToSegment(
    segment,
    dialogueClips,
    narrationPrefix,
    null,
    excludedLineIds
  )
  if (assigned.length === 0) return visual

  const dialogueDur = sumAssignedDialogueDuration(assigned, probedDurations, getPlaybackRate)
  return Math.max(visual, dialogueDur)
}

export function computePlaybackSegmentDuration(input: SegmentDurationInput): number {
  const preHold = Math.max(0, input.preSegmentHoldSec ?? 0)
  const content = computeSegmentContentDuration(input)
  const assigned = getClipsAssignedToSegment(
    input.segment,
    input.dialogueClips,
    input.narrationPrefix ?? 0,
    null,
    input.excludedLineIds
  )
  const hasDialogue =
    (input.dialogueEnabled ?? true) &&
    assigned.length > 0 &&
    sumAssignedDialogueDuration(assigned, input.probedDurations ?? {}, input.getPlaybackRate) > 0

  const autoPause = hasDialogue ? MIXER_SEGMENT_DIALOGUE_PAUSE_SEC : 0
  const manualPause = Math.max(0, input.manualPostPause ?? 0)
  const narrationPause = Math.max(0, input.narrationPostPause ?? 0)
  return preHold + content + autoPause + manualPause + narrationPause
}

export interface AlignSegmentsToDialogueOptions {
  segments: SceneSegment[]
  dialogueClips: AudioTrackClipV2[]
  probedDurations?: Record<string, number>
  narrationPrefix?: number
  postDialoguePause?: number
  /** When true, set imageDuration to content length (extends animatic holds). */
  extendAnimaticToDialogue?: boolean
}

/**
 * Rebuild segment start/end times from dialogue durations so timeline, preview, and mixer agree.
 */
export function alignSegmentsToDialogueTimeline(
  options: AlignSegmentsToDialogueOptions
): SceneSegment[] {
  const {
    segments,
    dialogueClips,
    probedDurations = {},
    narrationPrefix = 0,
    postDialoguePause = MIXER_SEGMENT_DIALOGUE_PAUSE_SEC,
    extendAnimaticToDialogue = true,
  } = options

  const sorted = [...segments].sort((a, b) => {
    const ai = a.sequenceIndex ?? 0
    const bi = b.sequenceIndex ?? 0
    if (ai !== bi) return ai - bi
    return (a.startTime ?? 0) - (b.startTime ?? 0)
  })

  let cursor = 0
  return sorted.map((seg) => {
    const content = computeSegmentContentDuration({
      segment: seg,
      dialogueClips,
      probedDurations,
      narrationPrefix,
      dialogueEnabled: true,
    })
    const assigned = getClipsAssignedToSegment(seg, dialogueClips, narrationPrefix)
    const pause = assigned.length > 0 ? postDialoguePause : 0
    const total = content + pause

    const next: SceneSegment = {
      ...seg,
      startTime: cursor,
      endTime: cursor + total,
    }

    if (extendAnimaticToDialogue) {
      next.imageDuration = content
    }

    cursor += total
    return next
  })
}
