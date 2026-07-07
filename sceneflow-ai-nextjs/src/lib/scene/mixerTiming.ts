/**
 * Production Mixer timing — single source for segment ↔ dialogue alignment.
 */
import type { AudioTrackClipV2, SceneSegment } from '@/components/vision/scene-production/types'
import { dialogueLineIdForIndex } from '@/components/vision/scene-production/audioTrackBuilder'
import { resolveVideoTrimWindow, resolveSegmentSourceDurationSec } from '@/lib/video/segmentVideoTrim'

/** Gap between dialogue lines within the same segment (seconds). */
export const MIXER_DIALOGUE_INTRA_GAP_SEC = 0.3

/** Auto pause after a segment that contains dialogue (seconds). */
export const MIXER_SEGMENT_DIALOGUE_PAUSE_SEC = 1.0

export const MIXER_MIN_SEGMENT_VISUAL_SEC = 2
export const MIXER_DEFAULT_VISUAL_SEC = 4

export function clipMatchesDialogueLineId(
  clip: Pick<AudioTrackClipV2, 'dialogueIndex' | 'id'>,
  lineId: string,
  narrationPrefix = 0
): boolean {
  if (!lineId) return false
  if (clip.id === lineId) return true
  const idx = clip.dialogueIndex
  if (typeof idx !== 'number' || idx < 0) return false
  if (lineId === dialogueLineIdForIndex(idx)) return true
  if (lineId === `dialogue-${idx}`) return true
  if (narrationPrefix > 0 && lineId === `dialogue-${narrationPrefix + idx}`) return true
  return false
}

export function getClipsAssignedToSegment(
  segment: SceneSegment,
  clips: AudioTrackClipV2[],
  narrationPrefix = 0
): AudioTrackClipV2[] {
  const lineIds = segment.dialogueLineIds ?? []
  if (lineIds.length === 0) return []
  return clips.filter((c) => lineIds.some((id) => clipMatchesDialogueLineId(c, id, narrationPrefix)))
}

export function getVisualBaseDuration(
  segment: SceneSegment,
  measuredSourceDurationSec?: number
): number {
  const sourceDuration = resolveSegmentSourceDurationSec(segment, measuredSourceDurationSec)
  const { playableSec, isTrimmed } = resolveVideoTrimWindow(segment, sourceDuration)
  if (isTrimmed) {
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
  manualPostPause?: number
  dialogueEnabled?: boolean
  narrationPrefix?: number
  getPlaybackRate?: (clipId: string) => number
}

/** Content duration (visual vs dialogue), before post-dialogue pause. */
export function computeSegmentContentDuration(input: SegmentDurationInput): number {
  const {
    segment,
    dialogueClips,
    probedDurations = {},
    measuredVideoDuration,
    dialogueEnabled = true,
    narrationPrefix = 0,
    getPlaybackRate,
  } = input

  const visual = Math.max(
    MIXER_MIN_SEGMENT_VISUAL_SEC,
    getVisualBaseDuration(segment, measuredVideoDuration)
  )

  if (!dialogueEnabled) return visual

  const assigned = getClipsAssignedToSegment(segment, dialogueClips, narrationPrefix)
  if (assigned.length === 0) return visual

  const dialogueDur = sumAssignedDialogueDuration(assigned, probedDurations, getPlaybackRate)
  return Math.max(visual, dialogueDur)
}

export function computePlaybackSegmentDuration(input: SegmentDurationInput): number {
  const content = computeSegmentContentDuration(input)
  const assigned = getClipsAssignedToSegment(
    input.segment,
    input.dialogueClips,
    input.narrationPrefix ?? 0
  )
  const hasDialogue =
    (input.dialogueEnabled ?? true) &&
    assigned.length > 0 &&
    sumAssignedDialogueDuration(assigned, input.probedDurations ?? {}, input.getPlaybackRate) > 0

  const autoPause = hasDialogue ? MIXER_SEGMENT_DIALOGUE_PAUSE_SEC : 0
  const manualPause = input.manualPostPause ?? 0
  return content + autoPause + manualPause
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
