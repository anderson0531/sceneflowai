/**
 * Still screenshots for Key Features cards.
 * A listed feature shows its still inside the shared card window, beside the
 * feature menu. A card keeps the text placeholder until its screenshot is
 * listed here.
 * A WebM entry is one full-resolution still (VP9). A WebP entry is a
 * lossless full-resolution image. Neither is a dubbed feature demo.
 *
 * New Series is 5120×3558. The source PNG was 5120×3559; the height is even
 * so 4:2:0 can keep the full width. Review the first cut is a lossless WebP
 * at 5120×5648. Series Audience Resonance is a lossless WebP at 5120×6008.
 * Series Director is a lossless WebP at 5120×2805.
 * Direct this episode is a lossless WebP at 5120×4407.
 * Start the episode is a lossless WebP at 1534×2425.
 * Start the Blueprint is a lossless WebP at 5120×2804.
 * Direct the beats is a lossless WebP at 5120×8059.
 * Direct the cast and locations is a lossless WebP at 5120×9875.
 * Blueprint Director is a lossless WebP at 5120×2805.
 * Blueprint Audience Resonance is a lossless WebP at 5120×9875.
 */

export const NEW_SERIES_SCREENSHOT_WEBM =
  '/landing/key-features/screenshots/new-series.webm'

export const SERIES_REVIEW_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/series-review.webp'

export const SERIES_RESONANCE_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/series-resonance.webp'

export const SERIES_DIRECTOR_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/series-director.webp'

export const DIRECT_EPISODE_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/episode-director.webp'

export const START_EPISODE_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/series-start-project.webp?v=20261015'

export const START_BLUEPRINT_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/start-blueprint.webp'

export const DIRECT_BEATS_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/blueprint-beats.webp'

export const CAST_LOCATIONS_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/blueprint-cast.webp'

export const BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/blueprint-director.webp'

export const BLUEPRINT_RESONANCE_SCREENSHOT_WEBP =
  '/landing/key-features/screenshots/blueprint-resonance.webp'

export type KeyFeatureScreenshot = {
  webmUrl?: string
  imageUrl?: string
}

const KEY_FEATURE_SCREENSHOTS: Record<string, KeyFeatureScreenshot> = {
  newSeries: { webmUrl: NEW_SERIES_SCREENSHOT_WEBM },
  seriesReview: { imageUrl: SERIES_REVIEW_SCREENSHOT_WEBP },
  seriesResonance: { imageUrl: SERIES_RESONANCE_SCREENSHOT_WEBP },
  seriesDirector: { imageUrl: SERIES_DIRECTOR_SCREENSHOT_WEBP },
  directEpisode: { imageUrl: DIRECT_EPISODE_SCREENSHOT_WEBP },
  startEpisode: { imageUrl: START_EPISODE_SCREENSHOT_WEBP },
  startBlueprint: { imageUrl: START_BLUEPRINT_SCREENSHOT_WEBP },
  treatment: { imageUrl: DIRECT_BEATS_SCREENSHOT_WEBP },
  castLocations: { imageUrl: CAST_LOCATIONS_SCREENSHOT_WEBP },
  blueprintDirector: { imageUrl: BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP },
  blueprintResonance: { imageUrl: BLUEPRINT_RESONANCE_SCREENSHOT_WEBP },
}

export function getKeyFeatureScreenshot(icon: string): KeyFeatureScreenshot | null {
  return KEY_FEATURE_SCREENSHOTS[icon] ?? null
}

export function keyFeatureScreenshotSrc(entry: KeyFeatureScreenshot): string {
  return entry.imageUrl || entry.webmUrl || ''
}
