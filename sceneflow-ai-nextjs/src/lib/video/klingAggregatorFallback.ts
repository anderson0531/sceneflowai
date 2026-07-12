import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'
import type { KlingCreativePreset } from '@/lib/kling/types'

export interface AggregatorBackupEligibilityInput {
  method: VideoGenerationMethod
  multiShot?: boolean
  elementList?: string[]
  voiceList?: Array<{ voice_id: string; name?: string }>
  preset?: KlingCreativePreset
  endFrameUrl?: string | null
  sourceVideoUrl?: string | null
}

/** True when the all-platform aggregator can faithfully reproduce this segment (basic T2V/I2V/REF only). */
export function isBasicSegmentEligibleForAggregator(
  input: AggregatorBackupEligibilityInput
): boolean {
  const { method } = input

  if (method === 'EXT' || method === 'FTV') return false
  if (method !== 'T2V' && method !== 'I2V' && method !== 'REF') return false

  if (input.multiShot) return false
  if (input.elementList?.length) return false
  if (input.voiceList?.length) return false
  if (input.preset) return false
  if (input.endFrameUrl?.trim()) return false
  if (input.sourceVideoUrl?.trim()) return false

  return true
}

export function formatAdvancedKlingFailureMessage(directError: string): string {
  const base = directError || 'Direct Kling video generation failed'
  return (
    `${base}. All-platform backup is unavailable for this segment because it uses advanced ` +
    `features (multi-shot, elements, voices, presets, extension, interpolation, or lip-sync). ` +
    `Try again later, or open Advanced and choose a different video engine.`
  )
}

export function formatBasicKlingFailureMessage(directError: string, aggregatorError?: string): string {
  const base = directError || 'Direct Kling video generation failed'
  if (aggregatorError) {
    return (
      `${base}. All-platform Kling backup also failed: ${aggregatorError}. ` +
      `Try again later, or open Advanced and choose a different video engine.`
    )
  }
  return (
    `${base}. All-platform Kling backup is not configured on this server. ` +
    `Try again later, or open Advanced and choose a different video engine.`
  )
}
