/**
 * Wall-clock budget for `/api/vision/generate-scene-audio`.
 *
 * Must stay in sync with `export const maxDuration` on that route and the
 * matching `vercel.json` functions entry. Google/Gemini TTS can hang past
 * Vercel's default 60s; we abort in time to persist or fall back to Edge.
 */

/** Mirrors `export const maxDuration` on generate-scene-audio and vercel.json. */
export const SCENE_AUDIO_MAX_DURATION_SECONDS = 180

/** Leave room after paid TTS for Edge fallback, blob upload, duration, and DB persist. */
export const SCENE_AUDIO_POST_TTS_RESERVE_MS = 25_000

/** Persist-only reserve after Edge (or after a successful Google call). */
export const SCENE_AUDIO_POST_EDGE_RESERVE_MS = 10_000

/** Hard cap per Cloud TTS fetch attempt (Gemini Flash helper uses 90s). */
export const SCENE_AUDIO_GOOGLE_FETCH_CAP_MS = 90_000

export const SCENE_AUDIO_MIN_FETCH_TIMEOUT_MS = 1_000
export const SCENE_AUDIO_MIN_EDGE_TIMEOUT_MS = 5_000
export const SCENE_AUDIO_MIN_RETRY_FETCH_MS = 5_000

export class GoogleTtsTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Google TTS timed out after ${timeoutMs}ms`)
    this.name = 'GoogleTtsTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export function remainingSceneAudioBudgetMs(
  startedAtMs: number,
  nowMs: number = Date.now(),
  routeBudgetMs: number = SCENE_AUDIO_MAX_DURATION_SECONDS * 1000
): number {
  return Math.max(0, routeBudgetMs - (nowMs - startedAtMs))
}

export function googleTtsFetchTimeoutMs(remainingMs: number): number {
  return Math.max(
    SCENE_AUDIO_MIN_FETCH_TIMEOUT_MS,
    Math.min(SCENE_AUDIO_GOOGLE_FETCH_CAP_MS, remainingMs - SCENE_AUDIO_POST_TTS_RESERVE_MS)
  )
}

/** Skip paid TTS when the leftover window cannot fit a meaningful fetch plus reserve. */
export function shouldSkipGoogleTtsForBudget(remainingMs: number): boolean {
  return remainingMs - SCENE_AUDIO_POST_TTS_RESERVE_MS < SCENE_AUDIO_MIN_RETRY_FETCH_MS
}

export function canAffordGoogleTtsRetry(remainingMs: number, delayMs: number): boolean {
  return remainingMs - delayMs - SCENE_AUDIO_POST_TTS_RESERVE_MS >= SCENE_AUDIO_MIN_RETRY_FETCH_MS
}

export function edgeTtsTimeoutMs(remainingMs: number): number {
  return Math.max(
    SCENE_AUDIO_MIN_EDGE_TIMEOUT_MS,
    remainingMs - SCENE_AUDIO_POST_EDGE_RESERVE_MS
  )
}
