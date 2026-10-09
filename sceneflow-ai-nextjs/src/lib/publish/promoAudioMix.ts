/**
 * Promo mix shared by the in-tab preview and the trailer stitch. Clip sound
 * leads, music sits under it, and promo narration is a quieter third layer.
 */
export const PROMO_AUDIO_MIX = {
  clip: 0.85,
  music: 0.45,
  narration: 0.4,
} as const
