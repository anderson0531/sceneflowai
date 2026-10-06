/**
 * Background slots for the two value sections under friction.
 * Direction ("The control you keep") and publish ("The cut you publish")
 * each play a dubbed WebM per language, with an H.264 MP4 fallback,
 * encoded from the Blob master.
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
const PUBLISH_POSTER = `${ILLUSTRATION_BASE}/publish.webp`

const EMPTY_MEDIA: TwoModesMediaEntry = {
  imageUrl: '',
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
}

const LOCALE_FILENAME_LABELS: Record<VideoLocaleId, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese',
  ar: 'Arabic',
}

/** Blob master for each Control dub. */
export const DIRECT_CONTROL_VIDEO_BLOB_PATHS: Record<VideoLocaleId, string> = {
  en: 'The Control (English).mp4',
  es: 'The Control (Spanish).mp4',
  zh: `The Control (${LOCALE_FILENAME_LABELS.zh}).mp4`,
  ar: `The Control (${LOCALE_FILENAME_LABELS.ar}).mp4`,
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
  zh: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-zh.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-zh.mp4`,
  },
  ar: {
    webmUrl: `${ILLUSTRATION_BASE}/direction-ar.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/direction-ar.mp4`,
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

/** Blob master for each Cut dub. */
export const PUBLISH_CUT_VIDEO_BLOB_PATHS: Record<VideoLocaleId, string> = {
  en: 'The Cut (English).mp4',
  es: 'The Cut (Spanish).mp4',
  zh: `The Cut (${LOCALE_FILENAME_LABELS.zh}).mp4`,
  ar: `The Cut (${LOCALE_FILENAME_LABELS.ar}).mp4`,
}

export function publishCutVideoBlobPath(locale: VideoLocaleId): string {
  return PUBLISH_CUT_VIDEO_BLOB_PATHS[locale]
}

/** 720p encodes shipped with the app, transcoded from each locale's Blob master. */
const PUBLISH_CUT_LOCAL_MEDIA: Record<VideoLocaleId, { webmUrl: string; mp4Url: string }> = {
  en: {
    webmUrl: `${ILLUSTRATION_BASE}/publish-en.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/publish-en.mp4`,
  },
  es: {
    webmUrl: `${ILLUSTRATION_BASE}/publish-es.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/publish-es.mp4`,
  },
  zh: {
    webmUrl: `${ILLUSTRATION_BASE}/publish-zh.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/publish-zh.mp4`,
  },
  ar: {
    webmUrl: `${ILLUSTRATION_BASE}/publish-ar.webm`,
    mp4Url: `${ILLUSTRATION_BASE}/publish-ar.mp4`,
  },
}

function publishMedia(id: VideoLocaleId): TwoModesMediaEntry {
  const local = PUBLISH_CUT_LOCAL_MEDIA[id]
  return {
    ...EMPTY_MEDIA,
    posterUrl: id === 'en' ? PUBLISH_POSTER : '',
    webmUrl: local.webmUrl,
    mp4Url: local.mp4Url,
  }
}

export const PRIMARY_VALUE_MEDIA: Record<PrimaryValueMediaId, TwoModesMediaEntry> = {
  direction: directionMedia('en'),
  publish: publishMedia('en'),
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

/** Language versions of The Cut You Publish backdrop. */
export function getPublishCutVideoLocales(): TwoModesVideoLocale[] {
  return VIDEO_LOCALE_ORDER.map((id) => {
    const media = publishMedia(id)
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
