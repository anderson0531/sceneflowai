/**
 * Still screenshots for Key Features cards.
 * A card keeps the text placeholder until its screenshot is listed here.
 * Each WebM is one full-resolution still (VP9), not a dubbed feature demo.
 *
 * New Series is 5120×3558. The source PNG was 5120×3559; the height is even
 * so 4:2:0 can keep the full width.
 */

export const NEW_SERIES_SCREENSHOT_WEBM =
  '/landing/key-features/screenshots/new-series.webm'

export type KeyFeatureScreenshot = {
  webmUrl: string
}

const KEY_FEATURE_SCREENSHOTS: Record<string, KeyFeatureScreenshot> = {
  newSeries: { webmUrl: NEW_SERIES_SCREENSHOT_WEBM },
}

export function getKeyFeatureScreenshot(icon: string): KeyFeatureScreenshot | null {
  return KEY_FEATURE_SCREENSHOTS[icon] ?? null
}
