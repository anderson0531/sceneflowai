/**
 * How long a beat holds in the Pre-Vis Screening Room.
 *
 * Music has to be asked for this length. A 4-second script guess, or a stored
 * 30-second play setting, is what made Lyria Clip write a loop the animatic
 * then repeated. The numbers here match `buildBeatFirstPlaybackTimeline` with
 * `preVisAnimatic: true` in `src/lib/storyboard/types.ts`:
 * - action beats use `durationSeconds`, otherwise an 8-second Veo hold
 * - spoken beats use the measured voice length when a clip exists
 * - every hold is at least `SCREENING_MIN_HOLD_SEC` (ANIMATIC_MIN_FRAME_SEC)
 * - frames are separated by `BEAT_GAP_SEC` (DIALOGUE_CLIP_BUFFER_SEC)
 * - the last picture beat carries the 1-second fade through black
 */

import { DEFAULT_VEO_CLIP_DURATION } from '@/lib/config/modelConfig'
import { SCENE_FADE_TO_BLACK_SEC } from '@/lib/storyboard/transitions'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'

/** Matches ANIMATIC_MIN_FRAME_SEC. Duplicated so this file does not import the storyboard timeline. */
export const SCREENING_MIN_HOLD_SEC = 10
/** Matches DIALOGUE_CLIP_BUFFER_SEC between beat frames. */
export const SCREENING_BEAT_GAP_SEC = 0.3

function positive(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function audioLists(scene: Record<string, unknown> | undefined): Array<Record<string, unknown>> {
  if (!scene) return []
  const bag = scene.dialogueAudio
  const rows: Array<Record<string, unknown>> = []
  const push = (value: unknown) => {
    if (!Array.isArray(value)) return
    for (const entry of value) {
      if (entry && typeof entry === 'object') rows.push(entry as Record<string, unknown>)
    }
  }
  if (Array.isArray(bag)) push(bag)
  else if (bag && typeof bag === 'object') {
    for (const value of Object.values(bag as Record<string, unknown>)) push(value)
  }
  return rows
}

/**
 * Measured length of a spoken beat's voice clip, when one exists.
 * A duration with no audio URL is not what the Screening Room plays.
 */
export function spokenVoiceSeconds(
  beat: SceneBeat,
  scene?: Record<string, unknown>,
  dynamicDurations?: Record<string, number>
): number | undefined {
  if (beat.kind === 'action') return undefined

  const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
  const line = beat.lineId
    ? dialogue.find(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          (entry as { lineId?: string }).lineId === beat.lineId
      )
    : undefined
  const lineRecord =
    line && typeof line === 'object' ? (line as Record<string, unknown>) : undefined
  const lineUrl =
    (typeof lineRecord?.audioUrl === 'string' && lineRecord.audioUrl.trim()) ||
    (typeof lineRecord?.url === 'string' && lineRecord.url.trim()) ||
    ''

  const beatUrl = typeof beat.audioUrl === 'string' ? beat.audioUrl.trim() : ''

  let stored: number | undefined
  let url = lineUrl || beatUrl

  if (lineUrl) {
    stored =
      positive(lineRecord?.duration) ??
      positive(lineRecord?.durationSeconds) ??
      positive(lineRecord?.audioDuration)
  }

  if (stored == null) {
    for (const row of audioLists(scene)) {
      const rowUrl =
        (typeof row.audioUrl === 'string' && row.audioUrl.trim()) ||
        (typeof row.url === 'string' && row.url.trim()) ||
        ''
      const matches =
        (beat.lineId && row.lineId === beat.lineId) ||
        (beatUrl && rowUrl && rowUrl === beatUrl)
      if (!matches) continue
      stored = positive(row.duration) ?? positive(row.durationSeconds)
      if (rowUrl) url = rowUrl
      if (stored) break
    }
  }

  if (stored == null && url && positive(beat.durationSeconds)) {
    stored = positive(beat.durationSeconds)
  }

  if (!url) return undefined

  const probed = url && dynamicDurations ? positive(dynamicDurations[url]) : undefined
  if (stored && probed) {
    if (probed < 0.5) return stored
    return Math.max(stored, probed)
  }
  return stored ?? probed
}

/** One beat's Screening Room hold, before the gap that follows it. */
export function screeningBeatHoldSeconds(
  beat: SceneBeat,
  scene?: Record<string, unknown>,
  dynamicDurations?: Record<string, number>
): number {
  if (beat.excluded) return 0

  let raw: number
  if (beat.kind === 'action') {
    raw = positive(beat.durationSeconds) ?? DEFAULT_VEO_CLIP_DURATION
  } else {
    raw =
      spokenVoiceSeconds(beat, scene, dynamicDurations) ??
      DEFAULT_VEO_CLIP_DURATION
  }
  return Math.max(raw, SCREENING_MIN_HOLD_SEC)
}

function lastPictureIndex(beats: SceneBeat[]): number {
  for (let index = beats.length - 1; index >= 0; index--) {
    if (!beats[index]?.excluded) return index
  }
  return -1
}

/**
 * Picture length of a contiguous beat range, including the gaps between frames
 * and the fade through black when the range includes the scene's last picture.
 */
export function screeningRangeSeconds(
  beats: SceneBeat[],
  startIndex: number,
  endIndex: number,
  scene?: Record<string, unknown>,
  dynamicDurations?: Record<string, number>
): number {
  const start = Math.max(0, startIndex)
  const end = Math.min(beats.length - 1, endIndex)
  if (end < start || beats.length === 0) return SCREENING_MIN_HOLD_SEC

  let total = 0
  let pictured = 0
  for (let index = start; index <= end; index++) {
    const beat = beats[index]
    if (!beat || beat.excluded) continue
    total += screeningBeatHoldSeconds(beat, scene, dynamicDurations)
    pictured += 1
  }
  if (pictured === 0) return SCREENING_MIN_HOLD_SEC
  if (pictured > 1) total += (pictured - 1) * SCREENING_BEAT_GAP_SEC
  if (end >= lastPictureIndex(beats) && start <= lastPictureIndex(beats)) {
    total += SCENE_FADE_TO_BLACK_SEC
  }
  return Math.max(1, Math.round(total))
}

export function screeningCueSeconds(
  cue: Pick<SceneMusicCue, 'beatStart' | 'beatEnd'>,
  beats: SceneBeat[],
  scene?: Record<string, unknown>,
  dynamicDurations?: Record<string, number>
): number {
  return screeningRangeSeconds(beats, cue.beatStart, cue.beatEnd, scene, dynamicDurations)
}

export function screeningSceneSeconds(
  beats: SceneBeat[],
  scene?: Record<string, unknown>,
  dynamicDurations?: Record<string, number>
): number {
  if (beats.length === 0) return 0
  return screeningRangeSeconds(beats, 0, beats.length - 1, scene, dynamicDurations)
}
