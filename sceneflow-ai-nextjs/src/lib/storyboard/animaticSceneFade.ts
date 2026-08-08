/**
 * Scene fade helpers for Screening Room animatic playback.
 */

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
  if (fadeDurationSec <= 0) return 0
  if (timeIntoFrame >= fadeDurationSec) return 0
  return Math.max(0, 1 - timeIntoFrame / fadeDurationSec)
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
