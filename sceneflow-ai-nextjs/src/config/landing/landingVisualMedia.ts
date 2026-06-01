/**
 * Locale-aware landing visuals — walkthrough screenshots and comparison infographic.
 * English defaults live in featureStoryboardMedia.ts; Thai overrides on Vercel Blob.
 */

import { FEATURE_STORYBOARD_MEDIA } from '@/config/landing/featureStoryboardMedia'

const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

function blobUrl(path: string): string {
  return `${BLOB_HOST}/${encodeURI(path)}`
}

/** English comparison infographic (SlotMachine section) */
export const COMPARISON_IMAGE_EN = blobUrl('Gemini_Generated_Image_y6ocnvy6ocnvy6oc.jpeg')

/** Thai comparison infographic (uploaded manually to Blob) */
export const COMPARISON_IMAGE_TH = blobUrl('Gemini_Generated_Image_untyd1untyd1unty (1).jpeg')

/** Use-case persona hero images (UseCasesSection) */
export const USE_CASE_PERSONA_IMAGES = {
  creator: '/landing/use-cases/youtube-creator.jpg',
  team: blobUrl('Gemini_Generated_Image_w4oqphw4oqphw4oq.jpeg'),
  productionShop: blobUrl('Gemini_Generated_Image_wm0332wm0332wm03.jpeg'),
  agency: '/landing/use-cases/agency-pitch.jpg',
} as const satisfies Record<'creator' | 'team' | 'productionShop' | 'agency', string>

/** Thai walkthrough screenshots — ids 1–14 (upload to landing/storyboard/th/{id}.png) */
const TH_FEATURE_STORYBOARD_SCREENSHOTS: Partial<Record<number, string>> = {
  1: blobUrl('landing/storyboard/th/1.png'),
  2: blobUrl('landing/storyboard/th/2.png'),
  3: blobUrl('landing/storyboard/th/3.png'),
  4: blobUrl('landing/storyboard/th/4.png'),
  5: blobUrl('landing/storyboard/th/5.png'),
  6: blobUrl('landing/storyboard/th/6.png'),
  7: blobUrl('landing/storyboard/th/7.png'),
  8: blobUrl('landing/storyboard/th/8.png'),
  9: blobUrl('landing/storyboard/th/9.png'),
  10: blobUrl('landing/storyboard/th/10.png'),
  11: blobUrl('landing/storyboard/th/11.png'),
  12: blobUrl('landing/storyboard/th/12.png'),
  13: blobUrl('landing/storyboard/th/13.png'),
  14: blobUrl('landing/storyboard/th/14.png'),
}

/** Flip to true as each id is uploaded to Blob (falls back to EN until ready) */
const TH_STORYBOARD_READY: Partial<Record<number, boolean>> = {
  // 1: true, 2: true, … enable per upload
}

export function getComparisonImageUrl(locale: string): string {
  return locale === 'th' ? COMPARISON_IMAGE_TH : COMPARISON_IMAGE_EN
}

export function getFeatureStoryboardScreenshot(
  id: number,
  locale: string
): string | undefined {
  if (locale === 'th' && TH_STORYBOARD_READY[id]) {
    return TH_FEATURE_STORYBOARD_SCREENSHOTS[id]
  }
  return FEATURE_STORYBOARD_MEDIA[id]?.screenshotUrl
}
