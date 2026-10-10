/**
 * Promo mix shared by the in-tab preview and the trailer stitch.
 * Narration leads the clip. The music bed sits under them, and spoken shots
 * duck it further. The stitch has one music level, so the rendered file uses
 * the lower bed.
 */
export const PROMO_MUSIC_BURIES_AT = 0.35

/** Lowshelf on the narration voice. Preview and the ffmpeg overlay use the same shelf. */
export const PROMO_NARRATION_BASS_HZ = 120
export const PROMO_NARRATION_BASS_DB = 6

export const PROMO_AUDIO_MIX = {
  clip: 0.85,
  /** Bed for silent shots and for the stitched file. */
  music: 0.22,
  /** Preview level while a dialogue or narration shot is on screen. */
  musicDucked: 0.12,
  /**
   * Above the clip. HTML media volume cannot exceed 1, so the preview applies
   * this through a Web Audio gain. The stitch passes it to ffmpeg volume=.
   */
  narration: 1.5,
} as const

export function promoPreviewMusicVolume(shot?: { beatKind?: string } | null): number {
  if (shot?.beatKind === 'dialogue' || shot?.beatKind === 'narration') {
    return PROMO_AUDIO_MIX.musicDucked
  }
  return PROMO_AUDIO_MIX.music
}
