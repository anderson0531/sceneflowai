/**
 * Veo SFX duration resolution (single clip, max 8s).
 *
 * Parallel to ElevenLabs sfxDuration.ts but snaps to Veo-valid clip lengths
 * (4 | 6 | 8) for native-audio extraction from a low-cost T2V clip.
 */

import { snapToVeoDuration } from '@/lib/scene/veoDuration'
import type { SfxDurationOverride } from '@/lib/elevenlabs/sfxDuration'

export type VeoSfxClipDuration = 4 | 6 | 8

export const VEO_SFX_MAX_CLIP_SECONDS = 8
const FALLBACK_SECONDS = 8

export const VEO_SFX_PRESET_SECONDS: Record<Exclude<SfxDurationOverride, 'auto'>, number> = {
  short: 4,
  medium: 8,
  long: 8,
}

export interface ResolveVeoSfxDurationParams {
  /** Parent segment or beat duration in seconds. */
  segmentDurationSeconds?: number
  /** User-selected preset; defaults to 'auto'. */
  override?: SfxDurationOverride
}

/**
 * Maps an arbitrary target duration to a single Veo clip length (4, 6, or 8).
 */
export function resolveVeoSfxClipDuration(targetSeconds: number): VeoSfxClipDuration {
  const safe = Number.isFinite(targetSeconds) && targetSeconds > 0 ? targetSeconds : FALLBACK_SECONDS
  const capped = Math.min(safe, VEO_SFX_MAX_CLIP_SECONDS)
  const snapped = snapToVeoDuration(capped)
  if (snapped <= 5) return 4
  if (snapped <= 7) return 6
  return 8
}

/**
 * Resolves the clip duration from preset + segment context.
 */
export function resolveVeoSfxDuration(params: ResolveVeoSfxDurationParams = {}): VeoSfxClipDuration {
  const { segmentDurationSeconds, override = 'auto' } = params

  if (override === 'short' || override === 'medium' || override === 'long') {
    return resolveVeoSfxClipDuration(VEO_SFX_PRESET_SECONDS[override])
  }

  const segOk =
    typeof segmentDurationSeconds === 'number' &&
    Number.isFinite(segmentDurationSeconds) &&
    segmentDurationSeconds > 0

  return resolveVeoSfxClipDuration(segOk ? segmentDurationSeconds : FALLBACK_SECONDS)
}

/**
 * Raw target seconds before Veo snap (for UI labels and partial-coverage hints).
 */
export function resolveVeoSfxTargetSeconds(params: ResolveVeoSfxDurationParams = {}): number {
  const { segmentDurationSeconds, override = 'auto' } = params

  if (override === 'short' || override === 'medium' || override === 'long') {
    return VEO_SFX_PRESET_SECONDS[override]
  }

  const segOk =
    typeof segmentDurationSeconds === 'number' &&
    Number.isFinite(segmentDurationSeconds) &&
    segmentDurationSeconds > 0

  return segOk ? segmentDurationSeconds : FALLBACK_SECONDS
}

/**
 * Returns the clip duration that "Auto" would resolve to for a given segment.
 */
export function resolveAutoVeoSfxDuration(segmentDurationSeconds?: number): VeoSfxClipDuration {
  return resolveVeoSfxDuration({ segmentDurationSeconds, override: 'auto' })
}

export function veoSfxCoversFullBeat(
  segmentDurationSeconds: number | undefined,
  override: SfxDurationOverride = 'auto'
): boolean {
  const target = resolveVeoSfxTargetSeconds({ segmentDurationSeconds, override })
  return target <= VEO_SFX_MAX_CLIP_SECONDS
}
