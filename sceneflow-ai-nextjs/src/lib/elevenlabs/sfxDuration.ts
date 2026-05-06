/**
 * Single source of truth for ElevenLabs SFX duration resolution.
 *
 * The `/v1/sound-generation` endpoint accepts `duration_seconds` in [0.5, 22].
 * When omitted, the model auto-picks a length that is usually too short for
 * cues that are anchored to a 4-12s creative segment, so callers (the per-cue
 * card, the legacy SFX block, the batch generator) should always resolve a
 * value through this helper.
 *
 * Behavior:
 *   - 'auto'   -> segmentDurationSeconds ?? FALLBACK_SECONDS, then clamped.
 *   - 'short'  -> 3
 *   - 'medium' -> 8
 *   - 'long'   -> 15
 *
 * The result is always clamped to [SFX_DURATION_MIN, SFX_DURATION_MAX] so we
 * never trip the upstream validator.
 */

export type SfxDurationOverride = 'auto' | 'short' | 'medium' | 'long'

export const SFX_DURATION_MIN = 0.5
export const SFX_DURATION_MAX = 22
const FALLBACK_SECONDS = 8

export const SFX_PRESET_SECONDS: Record<Exclude<SfxDurationOverride, 'auto'>, number> = {
  short: 3,
  medium: 8,
  long: 15,
}

export interface ResolveSfxDurationParams {
  /** Parent segment's duration in seconds (segment.endTime - segment.startTime). */
  segmentDurationSeconds?: number
  /** User-selected preset; defaults to 'auto'. */
  override?: SfxDurationOverride
}

/**
 * Returns the duration (seconds) to send to ElevenLabs `sound-generation`,
 * always clamped to the API's accepted range.
 */
export function resolveSfxDuration(params: ResolveSfxDurationParams = {}): number {
  const { segmentDurationSeconds, override = 'auto' } = params

  let raw: number
  if (override === 'short' || override === 'medium' || override === 'long') {
    raw = SFX_PRESET_SECONDS[override]
  } else {
    const segOk =
      typeof segmentDurationSeconds === 'number' &&
      Number.isFinite(segmentDurationSeconds) &&
      segmentDurationSeconds > 0
    raw = segOk ? (segmentDurationSeconds as number) : FALLBACK_SECONDS
  }

  return clampSfxDuration(raw)
}

/**
 * Returns the duration that "Auto" would resolve to for a given segment, used
 * by the UI to render labels like `Auto (10s)`.
 */
export function resolveAutoSfxDuration(segmentDurationSeconds?: number): number {
  return resolveSfxDuration({ segmentDurationSeconds, override: 'auto' })
}

/**
 * Clamp an arbitrary number to the ElevenLabs-accepted SFX duration range,
 * rounding to one decimal place to match the API's expected granularity.
 */
export function clampSfxDuration(value: number): number {
  if (!Number.isFinite(value)) return FALLBACK_SECONDS
  const clamped = Math.min(SFX_DURATION_MAX, Math.max(SFX_DURATION_MIN, value))
  return Math.round(clamped * 10) / 10
}
