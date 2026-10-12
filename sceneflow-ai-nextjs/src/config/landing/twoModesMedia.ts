/**
 * Media for the section under the hero.
 * The comparison slot is one English background: WebM first, then MP4.
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
  zh: 'Chinese',
  ar: 'Arabic',
}

/** Reserved Blob object for each dub. The friction section plays English only. */
export const TWO_MODES_VIDEO_BLOB_PATHS: Record<VideoLocaleId, string> = {
  en: 'The friction (English).mp4',
  es: 'The Friction (Spanish).mp4',
  zh: `The Friction (${LOCALE_FILENAME_LABELS.zh}).mp4`,
  ar: `The Friction (${LOCALE_FILENAME_LABELS.ar}).mp4`,
}

export function twoModesVideoBlobPath(locale: VideoLocaleId): string {
  return TWO_MODES_VIDEO_BLOB_PATHS[locale]
}

/** The friction section ships one English cut. */
const PRODUCED_LOCALES = new Set<VideoLocaleId>(['en'])

/** Cache-bust when the English cut is replaced at the same path. */
const FRICTION_EN_VERSION = '20261012'

/**
 * Encodes shipped with the app. English is the only cut the section plays.
 */
const LOCAL_ENCODED_MEDIA: Partial<
  Record<VideoLocaleId, { webmUrl: string; mp4Url: string }>
> = {
  en: {
    webmUrl: `/landing/two-modes/friction-en.webm?v=${FRICTION_EN_VERSION}`,
    mp4Url: `/landing/two-modes/friction-en.mp4?v=${FRICTION_EN_VERSION}`,
  },
  es: {
    webmUrl: '/landing/two-modes/friction-es.webm',
    mp4Url: '/landing/two-modes/friction-es.mp4',
  },
  zh: {
    webmUrl: '/landing/two-modes/friction-zh.webm',
    mp4Url: '/landing/two-modes/friction-zh.mp4',
  },
  ar: {
    webmUrl: '/landing/two-modes/friction-ar.webm',
    mp4Url: '/landing/two-modes/friction-ar.mp4',
  },
}

function localeMedia(id: VideoLocaleId): TwoModesMediaEntry {
  if (!PRODUCED_LOCALES.has(id)) return EMPTY_MEDIA
  const local = LOCAL_ENCODED_MEDIA[id]
  return {
    ...EMPTY_MEDIA,
    posterUrl: id === 'en' ? ENGLISH_POSTER : '',
    webmUrl: local?.webmUrl ?? '',
    mp4Url: local?.mp4Url ?? videoUrl(TWO_MODES_VIDEO_BLOB_PATHS[id]),
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
