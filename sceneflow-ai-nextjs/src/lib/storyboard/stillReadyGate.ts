/**
 * Stall the animatic playhead until the current still has decoded.
 *
 * Stage images remount per beat; audio used to start on the clock while the
 * new still was still loading. Holding elapsed (and skipping new clip starts)
 * keeps picture and sound together. Empty URLs fail open immediately. Beat 1
 * waits longer than later cuts, then both fail open so a broken still cannot
 * freeze the room.
 */

/** Beat 1 may wait out a cold optimizer fetch before any audio starts. */
export const ANIMATIC_OPENING_STILL_READY_TIMEOUT_SEC = 8
/** Later beats hold the previous frame, then fail open so a broken URL cannot freeze the room. */
export const ANIMATIC_LATER_STILL_READY_TIMEOUT_SEC = 4
export const ANIMATIC_STILL_READY_TIMEOUT_SEC = ANIMATIC_LATER_STILL_READY_TIMEOUT_SEC
export const STILL_HOLD_EPSILON_SEC = 0.001

/** Opening frame (start at 0) uses the longer hold. Every later cut uses the shorter one. */
export function stillReadyTimeoutSec(pendingClipStartTime: number | undefined): number {
  if (pendingClipStartTime == null || pendingClipStartTime <= STILL_HOLD_EPSILON_SEC) {
    return ANIMATIC_OPENING_STILL_READY_TIMEOUT_SEC
  }
  return ANIMATIC_LATER_STILL_READY_TIMEOUT_SEC
}

export interface StillGatedClip {
  id: string
  startTime: number
  duration: number
  thumbnailUrl?: string
}

export function isAnimaticStillReady(
  imageUrl: string | undefined,
  readyUrls: ReadonlySet<string>,
  failedUrls: ReadonlySet<string>
): boolean {
  const url = imageUrl?.trim()
  if (!url) return true
  return readyUrls.has(url) || failedUrls.has(url)
}

export function findVisualClipAtTime<T extends { startTime: number; duration: number }>(
  clips: T[],
  time: number
): T | undefined {
  for (const clip of clips) {
    if (time >= clip.startTime && time < clip.startTime + clip.duration) {
      return clip
    }
  }
  return clips[clips.length - 1]
}

/**
 * Keep waiting for `pending` until it is ready, otherwise wait for the clip
 * under `elapsed` if that still has not loaded.
 */
export function resolvePendingStillClip<T extends StillGatedClip>(
  elapsed: number,
  clips: T[],
  pending: T | null,
  isReady: (clip: T) => boolean
): T | null {
  if (pending && !isReady(pending)) return pending
  const clip = findVisualClipAtTime(clips, elapsed)
  if (clip && !isReady(clip)) return clip
  return null
}

/**
 * Pin elapsed so the unready still has not yet started (previous frame stays
 * on screen). First-frame holds freeze at 0. After timeoutSec, fail open.
 */
export function holdElapsedForUnreadyStill(input: {
  elapsed: number
  pendingClipStartTime: number | undefined
  stillReady: boolean
  holdStartedAtMs: number | null
  nowMs: number
  timeoutSec?: number
}): { elapsed: number; holding: boolean; holdStartedAtMs: number | null } {
  const timeoutSec = input.timeoutSec ?? stillReadyTimeoutSec(input.pendingClipStartTime)
  if (input.stillReady || input.pendingClipStartTime === undefined) {
    return { elapsed: input.elapsed, holding: false, holdStartedAtMs: null }
  }

  const holdStartedAtMs = input.holdStartedAtMs ?? input.nowMs
  if ((input.nowMs - holdStartedAtMs) / 1000 >= timeoutSec) {
    return { elapsed: input.elapsed, holding: false, holdStartedAtMs: null }
  }

  const start = input.pendingClipStartTime
  const heldElapsed = start > 0 ? Math.max(0, start - STILL_HOLD_EPSILON_SEC) : 0
  return { elapsed: heldElapsed, holding: true, holdStartedAtMs }
}
