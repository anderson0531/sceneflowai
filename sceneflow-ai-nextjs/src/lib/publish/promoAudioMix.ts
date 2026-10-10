/**
 * Promo mix shared by the in-tab preview and the trailer stitch.
 * Clip sound leads. The music bed sits under dialogue, and spoken shots
 * duck it further. The stitch has one music level, so the rendered file
 * uses the lower bed.
 */
export const PROMO_MUSIC_BURIES_AT = 0.35

export const PROMO_AUDIO_MIX = {
  clip: 0.85,
  /** Bed for silent shots and for the stitched file. */
  music: 0.22,
  /** Preview level while a dialogue or narration shot is on screen. */
  musicDucked: 0.12,
  narration: 0.4,
} as const

export function promoPreviewMusicVolume(shot?: { beatKind?: string } | null): number {
  if (shot?.beatKind === 'dialogue' || shot?.beatKind === 'narration') {
    return PROMO_AUDIO_MIX.musicDucked
  }
  return PROMO_AUDIO_MIX.music
}
