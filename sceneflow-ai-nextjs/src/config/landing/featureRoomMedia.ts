/**
 * Room films for the four feature rooms.
 * Each film defines the room and walks its workflow (60–90 seconds).
 * The in-page band loops an 8-second muted cold open until the visitor
 * plays the film with sound. English ships before any dub.
 * WebM is listed before the MP4 fallback. Slots stay empty until a file exists.
 */

import {
  VIDEO_LOCALE_ORDER,
  type VideoLocale,
  type VideoLocaleId,
} from '@/config/landing/videoLocales'

/** Muted cold open looped in the room band until the visitor plays the film. */
export const FEATURE_ROOM_COLD_OPEN_SECONDS = 8

/** Room films are a workflow, longer than a single feature demo. */
export const FEATURE_ROOM_FILM_MIN_SECONDS = 60
export const FEATURE_ROOM_FILM_MAX_SECONDS = 90

export const FEATURE_ROOM_IDS = [
  'series-desk',
  'blueprint-board',
  'production-stage',
  'screening-room',
] as const

export type FeatureRoomId = (typeof FEATURE_ROOM_IDS)[number]

export type FeatureRoomMediaEntry = {
  posterUrl: string
  webmUrl: string
  mp4Url: string
}

/** Picker row: shared video locale plus the sources the overview actually plays. */
export type FeatureRoomVideoLocale = VideoLocale & {
  webmUrl: string
  mp4Url: string
}

const EMPTY_ROOM_MEDIA: FeatureRoomMediaEntry = {
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
}

/**
 * Locales whose room film is published.
 * Leave empty until the English WebM and MP4 exist at the reserved paths.
 * A dub is ignored until English is in this set.
 */
const PRODUCED_LOCALES = new Set<VideoLocaleId>([])

function roomFilmLocaleReady(locale: VideoLocaleId): boolean {
  if (!PRODUCED_LOCALES.has('en')) return false
  return PRODUCED_LOCALES.has(locale)
}

/** Reserved site path. Not requested until the locale is in PRODUCED_LOCALES. */
export function featureRoomOverviewPath(
  roomId: string,
  locale: VideoLocaleId,
  ext: 'webm' | 'mp4'
): string {
  return `/landing/key-features/rooms/${roomId}-${locale}.${ext}`
}

function localeMedia(roomId: string, locale: VideoLocaleId): FeatureRoomMediaEntry {
  if (!roomFilmLocaleReady(locale)) return { ...EMPTY_ROOM_MEDIA }
  return {
    posterUrl: '',
    webmUrl: featureRoomOverviewPath(roomId, locale, 'webm'),
    mp4Url: featureRoomOverviewPath(roomId, locale, 'mp4'),
  }
}

export const FEATURE_ROOM_MEDIA: Record<FeatureRoomId, FeatureRoomMediaEntry> = {
  'series-desk': localeMedia('series-desk', 'en'),
  'blueprint-board': localeMedia('blueprint-board', 'en'),
  'production-stage': localeMedia('production-stage', 'en'),
  'screening-room': localeMedia('screening-room', 'en'),
}

export function getFeatureRoomMedia(
  id: string,
  locale: VideoLocaleId = 'en'
): FeatureRoomMediaEntry {
  if ((FEATURE_ROOM_IDS as readonly string[]).includes(id)) {
    return localeMedia(id, locale)
  }
  return { ...EMPTY_ROOM_MEDIA }
}

export function getFeatureRoomVideoLocales(roomId: string): FeatureRoomVideoLocale[] {
  return VIDEO_LOCALE_ORDER.map((id) => {
    const media = localeMedia(roomId, id)
    const available = Boolean(media.webmUrl || media.mp4Url)
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

/** Reserved source order once a locale is produced: WebM, then MP4. */
export function featureRoomVideoSources(
  roomId: string,
  locale: VideoLocaleId
): Array<{ src: string; type: 'video/webm' | 'video/mp4' }> {
  return [
    { src: featureRoomOverviewPath(roomId, locale, 'webm'), type: 'video/webm' },
    { src: featureRoomOverviewPath(roomId, locale, 'mp4'), type: 'video/mp4' },
  ]
}

export function featureRoomHasVideo(entry: FeatureRoomMediaEntry): boolean {
  return Boolean(entry.webmUrl || entry.mp4Url)
}
