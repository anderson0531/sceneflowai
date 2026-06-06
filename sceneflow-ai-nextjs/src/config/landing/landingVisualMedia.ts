/**
 * Locale-aware landing visuals — walkthrough screenshots, comparison infographic,
 * art-style thumbnails, output-format previews, and use-case posters.
 */

import { FEATURE_STORYBOARD_MEDIA } from '@/config/landing/featureStoryboardMedia'
import type { OutputFormatId } from '@/config/landing/outputFormatsCopy'

const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

export function blobUrl(path: string): string {
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

/** Art style preset ids — mirrors artStylePresets.ts */
export type LandingArtStyleId =
  | 'photorealistic'
  | 'anime-90s'
  | 'pixar'
  | 'concept-art'
  | 'ghibli'
  | 'comic-book'
  | 'oil-painting'
  | 'digital-art'
  | 'watercolor'
  | 'sketch'

const ART_STYLE_IDS: LandingArtStyleId[] = [
  'photorealistic',
  'anime-90s',
  'pixar',
  'concept-art',
  'ghibli',
  'comic-book',
  'oil-painting',
  'digital-art',
  'watercolor',
  'sketch',
]

/** Landing + Studio art style thumbnails on Vercel Blob (Gemini-generated) */
const ART_STYLE_BLOB_PATHS: Record<LandingArtStyleId, string> = {
  photorealistic: 'Gemini_Generated_Image_w5y03bw5y03bw5y0.jpeg',
  'anime-90s': 'Gemini_Generated_Image_5qoasf5qoasf5qoa.jpeg',
  pixar: 'Gemini_Generated_Image_zi32rnzi32rnzi32.jpeg',
  'concept-art': 'Gemini_Generated_Image_qlf261qlf261qlf2.jpeg',
  ghibli: 'Gemini_Generated_Image_xojqsuxojqsuxojq.jpeg',
  'comic-book': 'Gemini_Generated_Image_ezhp8cezhp8cezhp.jpeg',
  'oil-painting': 'Gemini_Generated_Image_7z9qm7z9qm7z9qm7.jpeg',
  'digital-art': 'Gemini_Generated_Image_omdmt6omdmt6omdm.jpeg',
  watercolor: 'Gemini_Generated_Image_7i1wus7i1wus7i1w.jpeg',
  sketch: 'Gemini_Generated_Image_bmbpbibmbpbibmbp.jpeg',
}

export const LANDING_ART_STYLE_THUMBNAILS: Record<LandingArtStyleId, string> =
  Object.fromEntries(
    ART_STYLE_IDS.map((id) => [id, blobUrl(ART_STYLE_BLOB_PATHS[id])])
  ) as Record<LandingArtStyleId, string>

export function getLandingArtStyleThumbnail(id: string): string | undefined {
  if ((ART_STYLE_IDS as readonly string[]).includes(id)) {
    return LANDING_ART_STYLE_THUMBNAILS[id as LandingArtStyleId]
  }
  return undefined
}

/** Output format preview images (Gemini-generated) */
export const LANDING_OUTPUT_FORMAT_THUMBNAILS: Record<OutputFormatId, string> = {
  '16x9': blobUrl('Gemini_Generated_Image_kna9rfkna9rfkna9.jpeg'),
  '9x16': blobUrl('Gemini_Generated_Image_a35rxra35rxra35r.jpeg'),
  '1x1': blobUrl('Gemini_Generated_Image_9ckg7o9ckg7o9ckg.jpeg'),
  '4x3': blobUrl('Gemini_Generated_Image_gyodkzgyodkzgyod.jpeg'),
}

export function getLandingOutputFormatThumbnail(id: OutputFormatId): string {
  return LANDING_OUTPUT_FORMAT_THUMBNAILS[id]
}

/** Custom poster overrides — categoryId → exampleId → Blob path (without host) */
export const USE_CASE_POSTER_OVERRIDES: Record<string, Record<string, string>> = {
  entertainment: {
    'vertical-short-drama': 'Gemini_Generated_Image_fgmse9fgmse9fgms.jpeg',
    'animated-web-series': 'Gemini_Generated_Image_d51tmxd51tmxd51t.jpeg',
    'episodic-youtube-series': 'Gemini_Generated_Image_dj2sybdj2sybdj2s.jpeg',
    'creator-reality-competition': 'Gemini_Generated_Image_ll16pfll16pfll16.jpeg',
    'ctv-ready-series': 'Gemini_Generated_Image_1xsg8i1xsg8i1xsg.jpeg',
  },
  property: {
    'residential-real-estate': 'Gemini_Generated_Image_f1hzzef1hzzef1hz.jpeg',
    'commercial-real-estate': 'Gemini_Generated_Image_3tne8l3tne8l3tne.jpeg',
    'short-term-rentals': 'Gemini_Generated_Image_1iy1n11iy1n11iy1.jpeg',
    'hospitality-tourism': 'Gemini_Generated_Image_qvck0lqvck0lqvck.jpeg',
    'museum-gallery-guides': 'Gemini_Generated_Image_cn3rfucn3rfucn3r.jpeg',
  },
  knowledge: {
    'k12-higher-ed': 'Gemini_Generated_Image_oovxa2oovxa2oovx (1).jpeg',
    'corporate-ld': 'Gemini_Generated_Image_m0cmafm0cmafm0cm.jpeg',
    'software-saas-tutorials': 'Gemini_Generated_Image_8cmxu78cmxu78cmx.jpeg',
    'niche-skill-tutoring': 'Gemini_Generated_Image_g7kb2tg7kb2tg7kb.jpeg',
    'medical-patient-education': 'Gemini_Generated_Image_ccr7z0ccr7z0ccr7.jpeg',
    'video-memoirs': 'Gemini_Generated_Image_j7adicj7adicj7ad.jpeg',
  },
  jit: {
    'hyper-local-news': 'Gemini_Generated_Image_3tqydw3tqydw3tqy.jpeg',
    'financial-market-recaps': 'Gemini_Generated_Image_knk0yeknk0yeknk0.jpeg',
    'sports-commentary': 'Gemini_Generated_Image_rphgjjrphgjjrphg.jpeg',
    'true-crime-historical-docs': 'Gemini_Generated_Image_26270i26270i2627.jpeg',
    'weather-emergency-alerts': 'Gemini_Generated_Image_6kqnqa6kqnqa6kqn.jpeg',
  },
  b2b: {
    'product-explainer-videos': 'Gemini_Generated_Image_7frt5j7frt5j7frt.jpeg',
    'case-study-testimonials': 'Gemini_Generated_Image_kj255okj255okj25.jpeg',
    'recruitment-branding': 'Gemini_Generated_Image_8nyw2m8nyw2m8nyw.jpeg',
    'conference-event-promos': 'Gemini_Generated_Image_tgut3ntgut3ntgut.jpeg',
  },
}

/** Default poster URL for a use-case example */
export function getUseCasePosterUrl(categoryId: string, exampleId: string): string {
  const override = USE_CASE_POSTER_OVERRIDES[categoryId]?.[exampleId]
  if (override) return blobUrl(override)
  return blobUrl(`demo/use-cases/${categoryId}/${exampleId}-poster.jpg`)
}

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
