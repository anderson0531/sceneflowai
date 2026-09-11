/**
 * Scene fade helpers for Screening Room animatic playback.
 */

/** How black a frame still is while it fades up, at the head of its window. */
export function computeFrameFadeIn(
  timeIntoFrame: number,
  fadeDurationSec: number
): number {
  if (fadeDurationSec <= 0) return 0
  if (timeIntoFrame >= fadeDurationSec) return 0
  return Math.max(0, 1 - timeIntoFrame / fadeDurationSec)
}

/** How black a frame has gone while it fades down, at the tail of its window. */
export function computeFrameFadeOut(
  timeIntoFrame: number,
  frameDurationSec: number,
  fadeDurationSec: number
): number {
  if (fadeDurationSec <= 0) return 0
  const fadeStart = Math.max(0, frameDurationSec - fadeDurationSec)
  if (timeIntoFrame < fadeStart) return 0
  return Math.min(1, (timeIntoFrame - fadeStart) / fadeDurationSec)
}

/**
 * Fade-from-black amount at the start of a scene frame.
 * Skip when idle poster already showed this start frame (press-play on same scene).
 */
export function computeSceneStartFadeBlack(
  timeIntoFrame: number,
  fadeDurationSec: number,
  options: {
    isSceneStart: boolean
    skipFadeFromBlack: boolean
  }
): number {
  if (!options.isSceneStart || options.skipFadeFromBlack) return 0
  return computeFrameFadeIn(timeIntoFrame, fadeDurationSec)
}

/** True when switching from screening poster to the same beat-1 URL should not crossfade. */
export function shouldSkipPosterToPrimaryCrossfade(
  previousUrl: string | null | undefined,
  nextUrl: string | null | undefined,
  posterUrl: string | null | undefined
): boolean {
  if (!previousUrl || !nextUrl || previousUrl === nextUrl) return true
  if (posterUrl && previousUrl === posterUrl && nextUrl === posterUrl) return true
  // Poster and primary are the same asset under different variables.
  if (posterUrl && (previousUrl === posterUrl || nextUrl === posterUrl) && previousUrl === nextUrl) {
    return true
  }
  return false
}
