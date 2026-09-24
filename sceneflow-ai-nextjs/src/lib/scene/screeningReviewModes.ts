/** In-app Screening Room review stages. `video` remains the rendered-scene id. */
export type ScreeningReviewMode = 'animatic' | 'beats' | 'video' | 'stream' | 'promo'

/** One-shot open request: mode, optional language, and the scene to start on. */
export type ScreeningPlaybackHint = {
  mode: ScreeningReviewMode
  language?: string
  sceneIndex?: number
}

/**
 * Pre-Vis and beat review have no burned-in studio mark.
 * Rough Cut, Final, and Promo default off so a render watermark is not doubled.
 */
export function defaultPlayerWatermarkVisible(mode: ScreeningReviewMode): boolean {
  return mode === 'animatic' || mode === 'beats'
}
