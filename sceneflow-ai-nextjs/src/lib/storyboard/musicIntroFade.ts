/**
 * Music intro fade envelope for Pre-vis Player — smooth ramp from startLevel to full volume.
 */

export interface MusicIntroFadeConfig {
  enabled: boolean
  /** Seconds to ramp from startLevel to 1.0 */
  durationSec: number
  /** Initial volume multiplier (0.3–0.7 typical) relative to music slider target */
  startLevel: number
}

export const DEFAULT_MUSIC_INTRO_FADE: MusicIntroFadeConfig = {
  enabled: true,
  durationSec: 4,
  startLevel: 0.5,
}

export const MUSIC_INTRO_FADE_START_MIN = 0.3
export const MUSIC_INTRO_FADE_START_MAX = 0.7
export const MUSIC_INTRO_FADE_DURATION_MIN = 2
export const MUSIC_INTRO_FADE_DURATION_MAX = 8

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/**
 * Volume multiplier for a music clip based on elapsed time since the clip started.
 * Returns startLevel at t=0, 1.0 at t>=durationSec (smoothstep interpolation).
 */
export function computeMusicIntroFadeMultiplier(
  elapsedSinceClipStart: number,
  config: Pick<MusicIntroFadeConfig, 'durationSec' | 'startLevel'>
): number {
  const { durationSec, startLevel } = config
  const clampedStart = Math.max(0, Math.min(1, startLevel))

  if (durationSec <= 0) return 1

  const t = Math.max(0, elapsedSinceClipStart) / durationSec
  const eased = smoothstep(t)
  return clampedStart + (1 - clampedStart) * eased
}

export function clampMusicIntroFadeConfig(
  partial: Partial<MusicIntroFadeConfig>
): MusicIntroFadeConfig {
  return {
    enabled: partial.enabled ?? DEFAULT_MUSIC_INTRO_FADE.enabled,
    durationSec: Math.max(
      MUSIC_INTRO_FADE_DURATION_MIN,
      Math.min(
        MUSIC_INTRO_FADE_DURATION_MAX,
        partial.durationSec ?? DEFAULT_MUSIC_INTRO_FADE.durationSec
      )
    ),
    startLevel: Math.max(
      MUSIC_INTRO_FADE_START_MIN,
      Math.min(
        MUSIC_INTRO_FADE_START_MAX,
        partial.startLevel ?? DEFAULT_MUSIC_INTRO_FADE.startLevel
      )
    ),
  }
}
