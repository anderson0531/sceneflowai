import type { QualifiedWatchExclusion, WatchHeartbeat } from './types'

/** Seconds of playback that never count toward the pool. */
export const QUALIFIED_WATCH_THRESHOLD_SECONDS = 30

/** Cap one subscriber's contribution to a title per UTC day. */
export const QUALIFIED_WATCH_DAILY_CAP_SECONDS = 4 * 60 * 60

export type QualifyWatchResult =
  | { ok: true; seconds: number }
  | { ok: false; reason: QualifiedWatchExclusion }

export function utcDayKey(atMs: number): string {
  return new Date(atMs).toISOString().slice(0, 10)
}

/**
 * Decide whether a player heartbeat counts as qualified minutes.
 * Heartbeats — not CDN logs or raw views — are the v1 source of truth.
 */
export function qualifyWatchHeartbeat(
  beat: WatchHeartbeat,
  alreadyCountedSecondsForDay: number
): QualifyWatchResult {
  if (!beat.isSubscriber) return { ok: false, reason: 'unauthenticated' }
  if (beat.isTrailer) return { ok: false, reason: 'trailer' }
  if (beat.accountId === beat.creatorUserId) return { ok: false, reason: 'self_watch' }
  if (!beat.isVisible) return { ok: false, reason: 'hidden_tab' }
  if (beat.deltaSeconds <= 0 || beat.deltaSeconds > 120) {
    return { ok: false, reason: 'bot_burst' }
  }
  if (beat.titleElapsedSeconds < QUALIFIED_WATCH_THRESHOLD_SECONDS) {
    return { ok: false, reason: 'under_threshold' }
  }

  const remaining = QUALIFIED_WATCH_DAILY_CAP_SECONDS - alreadyCountedSecondsForDay
  if (remaining <= 0) return { ok: false, reason: 'daily_cap' }

  return { ok: true, seconds: Math.min(beat.deltaSeconds, remaining) }
}
