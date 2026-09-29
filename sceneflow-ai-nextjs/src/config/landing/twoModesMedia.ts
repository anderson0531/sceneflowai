/**
 * Media for the section under the hero.
 * The comparison slot is a dubbed background: WebM first when present, then MP4.
 * English plays the Blob master. Other locales stay unavailable until their files land.
 */

import {
  videoUrl,
  VIDEO_LOCALE_ORDER,
  type VideoLocale,
  type VideoLocaleId,
} from '@/config/landing/videoLocales'

export const TWO_MODES_MEDIA_IDS = ['comparison'] as const

export type TwoModesMediaId = (typeof TWO_MODES_MEDIA_IDS)[number]

export type TwoModesMediaEntry = {
  /** WebP still. Diagrams and screenshots use this field. */
  imageUrl: string
  /** WebP poster for a walkthrough. */
  posterUrl: string
  /** VP9 walkthrough. Listed before MP4 in the player. */
  webmUrl: string
  /** Safari fallback for the walkthrough. */
  mp4Url: string
}

/** Picker row: shared video locale plus the sources the backdrop actually plays. */
export type TwoModesVideoLocale = VideoLocale & {
  webmUrl: string
  mp4Url: string
}

const EMPTY_MEDIA: TwoModesMediaEntry = {
  imageUrl: '',
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
}

const ILLUSTRATION_BASE = '/landing/two-modes'
const ENGLISH_POSTER = `${ILLUSTRATION_BASE}/comparison.webp`

const LOCALE_FILENAME_LABELS: Record<VideoLocaleId, string> = {
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  hi: 'Hindi',
  zh: 'Chinese',
  ar: 'Arabic',
  th: 'Thai',
}

/** Reserved Blob object for each dub. Enable a locale by adding it to PRODUCED_LOCALES. */
export function twoModesVideoBlobPath(locale: VideoLocaleId): string {
  return `Front Page/You Direct (${LOCALE_FILENAME_LABELS[locale]}).mp4`
}

export const TWO_MODES_VIDEO_BLOB_PATHS: Record<VideoLocaleId, string> = {
  en: twoModesVideoBlobPath('en'),
  es: twoModesVideoBlobPath('es'),
  pt: twoModesVideoBlobPath('pt'),
  hi: twoModesVideoBlobPath('hi'),
  zh: twoModesVideoBlobPath('zh'),
  ar: twoModesVideoBlobPath('ar'),
  th: twoModesVideoBlobPath('th'),
}

/** Locales whose Blob master is published. Others render as disabled "Soon" pills. */
const PRODUCED_LOCALES = new Set<VideoLocaleId>(['en'])

function localeMedia(id: VideoLocaleId): TwoModesMediaEntry {
  if (!PRODUCED_LOCALES.has(id)) return EMPTY_MEDIA
  return {
    ...EMPTY_MEDIA,
    posterUrl: id === 'en' ? ENGLISH_POSTER : '',
    webmUrl: '',
    mp4Url: videoUrl(TWO_MODES_VIDEO_BLOB_PATHS[id]),
  }
}

export const TWO_MODES_MEDIA: Record<TwoModesMediaId, TwoModesMediaEntry> = {
  comparison: localeMedia('en'),
}

export function getTwoModesMedia(id: string): TwoModesMediaEntry {
  if ((TWO_MODES_MEDIA_IDS as readonly string[]).includes(id)) {
    return TWO_MODES_MEDIA[id as TwoModesMediaId]
  }
  return EMPTY_MEDIA
}

export function getTwoModesVideoLocales(): TwoModesVideoLocale[] {
  return VIDEO_LOCALE_ORDER.map((id) => {
    const media = localeMedia(id)
    const available = Boolean(media.mp4Url || media.webmUrl)
    return {
      id,
      src: media.mp4Url || media.webmUrl,
      poster: media.posterUrl || undefined,
      available,
      webmUrl: media.webmUrl,
      mp4Url: media.mp4Url,
    }
  })
}

export function twoModesVideoSources(
  entry: TwoModesMediaEntry
): Array<{ src: string; type: 'video/webm' | 'video/mp4' }> {
  const sources: Array<{ src: string; type: 'video/webm' | 'video/mp4' }> = []
  if (entry.webmUrl) sources.push({ src: entry.webmUrl, type: 'video/webm' })
  if (entry.mp4Url) sources.push({ src: entry.mp4Url, type: 'video/mp4' })
  return sources
}

/** WebP still used when a slot has a picture and no walkthrough yet. */
export function twoModesStillSrc(entry: TwoModesMediaEntry): string {
  return entry.imageUrl
}
