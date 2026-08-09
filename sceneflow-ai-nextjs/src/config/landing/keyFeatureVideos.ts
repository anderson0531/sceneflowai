/**
 * Per-feature demo videos for the Key Features landing section — one dubbed MP4
 * per locale (same model as hero and production showcase). Unproduced locales
 * render as disabled "Soon" pills with a gradient placeholder frame.
 */

import { KEY_FEATURE_ICON_KEYS } from '@/components/landing/keyFeatureIcons'
import {
  buildVideoLocales,
  defaultVideoLocale,
  videoUrl,
  VIDEO_LOCALE_ORDER,
  type VideoLocale,
  type VideoLocaleId,
} from '@/config/landing/videoLocales'

/** Short label used in Blob filenames — keys match keyFeatures.categories[].features[].icon */
export const KEY_FEATURE_VIDEO_LABELS: Record<string, string> = {
  byok: 'BYOK',
  budget: 'Production Budget',
  series: 'Series Studio',
  blueprint: 'Blueprint Studio',
  writersRoom: "Writer's Room",
  ara: 'Audience Resonance Analysis',
  referenceLibrary: 'Reference Library',
  iad: 'Intelligent Assistant Director',
  multilanguage: 'Multilanguage Streams',
  express: 'Express Generation',
  screeningRoom: 'Screening Room',
  upscale: 'Delivery-Quality Upscale',
  versionControl: 'Version Control',
  promoTrailer: 'Promotion Trailers',
  youtubePublish: 'YouTube Publishing',
}

const LOCALE_FILENAME_LABELS: Record<VideoLocaleId, string> = {
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  hi: 'Hindi',
  zh: 'Chinese',
  ar: 'Arabic',
  th: 'Thai',
}

/** Predictable Blob path for upload scripts — features/{icon}/{Label} ({Language}).mp4 */
export function keyFeatureVideoBlobPath(icon: string, locale: VideoLocaleId): string {
  const label = KEY_FEATURE_VIDEO_LABELS[icon] ?? icon
  return `features/${icon}/${label} (${LOCALE_FILENAME_LABELS[locale]}).mp4`
}

/**
 * Produced videos only. A feature/locale absent here renders as a disabled
 * "Soon" pill. Add entries as dubbed masters are published to Blob storage.
 */
const PRODUCED_VIDEOS: Partial<
  Record<string, Partial<Record<VideoLocaleId, { src: string; poster?: string }>>>
> = {
  // Web H.264/AAC encode of the ProRes master. Prefer Blob root path once
  // `node scripts/upload-byok-english-mp4.mjs` has overwritten BYOK (English).mp4;
  // until then ship from public/ so browsers get a decodable video track.
  byok: {
    en: { src: '/landing/key-features/BYOK-English.mp4#t=0.1' },
  },
}

export function getKeyFeatureVideoLocales(icon: string): VideoLocale[] {
  return buildVideoLocales(PRODUCED_VIDEOS[icon])
}

export function getDefaultKeyFeatureVideoLocale(icon: string): VideoLocaleId {
  return defaultVideoLocale(getKeyFeatureVideoLocales(icon))
}

export function hasKeyFeatureVideo(icon: string): boolean {
  return getKeyFeatureVideoLocales(icon).some((locale) => locale.available)
}

/** Reserved Blob paths for every feature × locale (upload manifest / QA). */
export function getKeyFeatureVideoBlobManifest(): Record<
  string,
  Record<VideoLocaleId, string>
> {
  return Object.fromEntries(
    KEY_FEATURE_ICON_KEYS.map((icon) => [
      icon,
      Object.fromEntries(
        VIDEO_LOCALE_ORDER.map((locale) => [locale, keyFeatureVideoBlobPath(icon, locale)])
      ) as Record<VideoLocaleId, string>,
    ])
  )
}

/** Convenience for scripts that register a produced locale after upload. */
export function keyFeatureVideoSrc(icon: string, locale: VideoLocaleId, version?: string): string {
  return videoUrl(keyFeatureVideoBlobPath(icon, locale), version)
}
