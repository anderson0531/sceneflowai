/**
 * Background slots for the two value sections under friction.
 * Publish plays one public encode (WebM first, MP4 fallback).
 * Direction ("The control you keep") plays a dubbed WebM per language,
 * with an H.264 MP4 fallback, encoded from the Blob master.
 */

import type { TwoModesMediaEntry, TwoModesVideoLocale } from '@/config/landing/twoModesMedia'
import {
  VIDEO_LOCALE_ORDER,
  type VideoLocaleId,
} from '@/config/landing/videoLocales'

export const PRIMARY_VALUE_MEDIA_IDS = ['direction', 'publish'] as const

export type PrimaryValueMediaId = (typeof PRIMARY_VALUE_MEDIA_IDS)[number]

const ILLUSTRATION_BASE = '/landing/primary-value'
const DIRECTION_POSTER = `${ILLUSTRATION_BASE}/direction.webp`

const EMPTY_MEDIA: TwoModesMediaEntry = {
  imageUrl: '',
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
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

/** Blob master for each Control dub. */
export const DIRECT_CONTROL_VIDEO_BLOB_PATHS: Record<VideoLocaleId, string> = {
  en: 'The Control (English).mp4',
  es: 'The Control (Spanish).mp4',
  pt: `The Control (${LOCALE_FILENAME_LABELS.pt}).mp4`,
  hi: `The Control (${LOCALE_FILENAME_LABELS.hi}).mp4`,
  zh: `The Control (${LOCALE_FILENAME_LABELS.zh}).mp4`,
  ar: `The Control (${LOCALE_FILENAME_LABELS.ar}).mp4`,
  th: `The Control (${LOCALE_FILENAME_LABELS.th}).mp4`,
}

export function directControlVideoBlobPath(locale: VideoLocaleId): string {
  return DIRECT_CONTROL_VIDEO_BLOB_PATHS[locale]
}

/** 720p encodes shipped with the app, transcoded from each locale's Blob master. */
const DIRECT_CONTROL_LOCAL_MEDIA: Record<
  VideoLocaleId,
  { webmUrl: string; mp4Url: string }
> = {
  en: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-en.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-en.mp4`,
  },
  es: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-es.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-es.mp4`,
  },
  pt: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-pt.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-pt.mp4`,
  },
  hi: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-hi.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-hi.mp4`,
  },
  zh: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-zh.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-zh.mp4`,
  },
  ar: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-ar.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-ar.mp4`,
  },
  th: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-th.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-th.mp4`,
  },
}

function directionMedia(id: VideoLocaleId): TwoModesMediaEntry {
  const local = DIRECT_CONTROL_LOCAL_MEDIA[id]
  return {
    ...EMPTY_MEDIA,
    posterUrl: id === 'en' ? DIRECTION_POSTER : '',
    webmUrl: local.webmUrl,
    mp4Url: local.mp4Url,
  }
}

export const PRIMARY_VALUE_MEDIA: Record<PrimaryValueMediaId, TwoModesMediaEntry> = {
  direction: directionMedia('en'),
  publish: {
    ...EMPTY_MEDIA,
    posterUrl: `${ILLUSTRATION_BASE}/publish.webp`,
    webmUrl: `${ILLUSTRATION_BASE}/publish.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/publish.mp4`,
  },
}

export function getPrimaryValueMedia(id: string): TwoModesMediaEntry {
  if ((PRIMARY_VALUE_MEDIA_IDS as readonly string[]).includes(id)) {
    return PRIMARY_VALUE_MEDIA[id as PrimaryValueMediaId]
  }
  return EMPTY_MEDIA
}

/** Language versions of The Control You Keep backdrop. */
export function getDirectControlVideoLocales(): TwoModesVideoLocale[] {
  return VIDEO_LOCALE_ORDER.map((id) => {
    const media = directionMedia(id)
    return {
      id,
      src: media.mp4Url,
      poster: media.posterUrl || undefined,
      available: Boolean(media.mp4Url || media.webmUrl),
      webmUrl: media.webmUrl,
      mp4Url: media.mp4Url,
    }
  })
}
