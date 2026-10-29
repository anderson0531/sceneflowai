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
  budget: 'Production Planner',
  productionScript: 'Production Script',
  series: 'Series Room',
  blueprint: 'Blueprint Room',
  ara: 'Audience Resonance Analysis',
  iad: 'Intelligent Assistant Director',
  multilanguage: 'Multilanguage Streams',
  express: 'Production Agents',
  screeningRoom: 'Screening Room',
  upscale: 'Delivery-Quality Upscale',
  youtubePublish: 'YouTube Publishing',
  newSeries: 'New Series',
  seriesReview: 'Review the first cut',
  seriesResonance: 'Series Audience Resonance',
  seriesDirector: 'Series Director',
  directEpisode: 'Direct this episode',
  startEpisode: 'Start the episode',
  startBlueprint: 'Start the Blueprint',
  treatment: 'Direct the beats',
  castLocations: 'Direct the cast and locations',
  blueprintResonance: 'Audience Resonance',
  blueprintDirector: 'Blueprint Director',
  goToProduction: 'Go to Production Stage',
  stakeholderReview: 'Stakeholder review',
  scriptResonance: 'Audience Resonance',
  castVisual: 'Cast, wardrobe, and voice',
  directShot: 'Direct Shot',
  sceneWorkflow: 'Scene Production Workflow',
  audioAgent: 'Audio Agent',
  musicScore: 'Dialogue, SFX and Score Workbench',
  continuity: 'Continuity',
  stillsAgent: 'Stills Agent',
  stillsWorkbench: 'Stills and Keyframe Studio',
  animatic: 'Animatic',
  videoAgent: 'Video Agent',
  clipsWorkbench: 'Multi-Take Clips Studio',
  productionAgent: 'Production Agent',
  mixer: 'Mixer',
  languageStreams: 'Language versions',
  promoTrailers: 'Promo & Trailers',
  shipPackage: 'Package and ship',
  screeningPlayer: 'Screening Room player',
  screeningCollab: 'Collaborate on the cut',
}

const LOCALE_FILENAME_LABELS: Record<VideoLocaleId, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese',
  ar: 'Arabic',
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
  // English: web H.264/AAC encode shipped from public/ (lean landing asset).
  // Other locales: Blob masters are already browser-decodable H.264/AAC —
  // serve from Blob directly (same pattern as production showcase).
  byok: {
    en: { src: '/landing/key-features/BYOK-English.mp4?v=20260810#t=0.1' },
    es: { src: videoUrl('BYOK (Spanish).mp4', '20260810') },
    zh: { src: videoUrl('BYOK (Chinese).mp4', '20260810') },
    ar: { src: videoUrl('BYOK (Arabic).mp4', '20260810') },
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
