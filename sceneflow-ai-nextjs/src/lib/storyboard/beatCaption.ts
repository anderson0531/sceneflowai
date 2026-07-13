import type { BeatOverlayType, SceneBeat } from '@/lib/script/segmentTypes'
import { defaultBeatOverlayType } from '@/lib/storyboard/playerTranslations'

export function getBeatOverlayFields(
  beat: SceneBeat
): { overlayText?: string; overlayType?: BeatOverlayType } {
  const overlayText = beat.overlayText?.trim() || undefined
  if (!overlayText) return {}
  const overlayType = beat.overlayType || defaultBeatOverlayType(beat.beatRole)
  return { overlayText, overlayType }
}
