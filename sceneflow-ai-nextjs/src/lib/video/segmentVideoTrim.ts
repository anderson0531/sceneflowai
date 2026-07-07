import type { SceneSegment } from '@/components/vision/scene-production/types'

export const MIN_TRIM_PLAYABLE_SEC = 0.5

export interface VideoTrimWindow {
  inSec: number
  outSec: number
  playableSec: number
  isTrimmed: boolean
  sourceDurationSec: number
}

function finitePositive(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

/** Resolve full source file duration from segment metadata or measured probe. */
export function resolveSegmentSourceDurationSec(
  segment: Pick<SceneSegment, 'actualVideoDuration' | 'endTime' | 'startTime'>,
  measuredDurationSec?: number
): number {
  const measured = finitePositive(measuredDurationSec)
  if (measured != null) return measured
  const actual = finitePositive(segment.actualVideoDuration)
  if (actual != null) return actual
  const span = segment.endTime - segment.startTime
  if (Number.isFinite(span) && span > 0) return span
  return 4
}

/**
 * Resolve in/out points within the source MP4 (non-destructive trim metadata).
 */
export function resolveVideoTrimWindow(
  segment: Pick<SceneSegment, 'videoTrimInSec' | 'videoTrimOutSec' | 'actualVideoDuration' | 'endTime' | 'startTime'>,
  sourceDurationSec: number
): VideoTrimWindow {
  const source = Math.max(MIN_TRIM_PLAYABLE_SEC, finitePositive(sourceDurationSec) ?? MIN_TRIM_PLAYABLE_SEC)

  let outSec = source
  const rawOut = finitePositive(segment.videoTrimOutSec)
  if (rawOut != null) {
    outSec = Math.min(source, rawOut)
  }

  let inSec = 0
  const rawIn = segment.videoTrimInSec
  if (typeof rawIn === 'number' && Number.isFinite(rawIn) && rawIn > 0) {
    inSec = Math.min(rawIn, Math.max(0, outSec - MIN_TRIM_PLAYABLE_SEC))
  }

  if (outSec - inSec < MIN_TRIM_PLAYABLE_SEC) {
    inSec = Math.max(0, outSec - MIN_TRIM_PLAYABLE_SEC)
  }

  const playableSec = Math.max(MIN_TRIM_PLAYABLE_SEC, outSec - inSec)
  const isTrimmed = inSec > 0.001 || outSec < source - 0.001

  return {
    inSec,
    outSec,
    playableSec,
    isTrimmed,
    sourceDurationSec: source,
  }
}

/** Format seconds as M:SS.s for trim inputs. */
export function formatTrimTimeSec(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const mins = Math.floor(clamped / 60)
  const secs = clamped % 60
  return `${mins}:${secs.toFixed(1).padStart(mins > 0 ? 4 : 3, '0')}`
}

/** Parse M:SS, SS.s, or plain number strings into seconds. */
export function parseTrimTimeInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return 0
  if (trimmed.includes(':')) {
    const [mPart, sPart] = trimmed.split(':')
    const mins = Number(mPart)
    const secs = Number(sPart)
    if (!Number.isFinite(mins) || !Number.isFinite(secs) || mins < 0 || secs < 0) return null
    return mins * 60 + secs
  }
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}
