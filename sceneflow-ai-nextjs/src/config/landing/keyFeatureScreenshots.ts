/**
 * Still screenshots for Key Features cards.
 * Every listed feature uses the same full-block layout: the still fills the
 * feature menu and the open display, with the title, description, and Learn
 * more on a 50% black panel at the top. A card keeps the text placeholder
 * until its screenshot is listed here.
 * Each WebM is one full-resolution still (VP9), not a dubbed feature demo.
 *
 * New Series is 5120×3558. The source PNG was 5120×3559; the height is even
 * so 4:2:0 can keep the full width. Review the first cut is 5120×2804.
 */

export const NEW_SERIES_SCREENSHOT_WEBM =
  '/landing/key-features/screenshots/new-series.webm'

export const SERIES_REVIEW_SCREENSHOT_WEBM =
  '/landing/key-features/screenshots/series-review.webm'

export type KeyFeatureScreenshot = {
  webmUrl: string
}

const KEY_FEATURE_SCREENSHOTS: Record<string, KeyFeatureScreenshot> = {
  newSeries: { webmUrl: NEW_SERIES_SCREENSHOT_WEBM },
  seriesReview: { webmUrl: SERIES_REVIEW_SCREENSHOT_WEBM },
}

export function getKeyFeatureScreenshot(icon: string): KeyFeatureScreenshot | null {
  return KEY_FEATURE_SCREENSHOTS[icon] ?? null
}
