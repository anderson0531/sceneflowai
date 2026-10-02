/**
 * Room films for the four feature rooms.
 * Each film defines the room and walks its workflow (60–90 seconds).
 * The in-page band loops an 8-second muted cold open until the visitor
 * plays the film with sound. English ships before any dub.
 * WebM is listed before the MP4 fallback. A room stays empty until its English film is set.
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
 * English Series overview. The published master is an MP4. The player uses it
 * until a WebM encode of the same cut is added beside it.
 * A dub for a room is ignored until that room's English film is in this map.
 */
export const SERIES_OVERVIEW_EN_MP4 =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Series%20Overview.mp4'

const PRODUCED_ROOM_FILMS: Partial<
  Record<FeatureRoomId, Partial<Record<VideoLocaleId, FeatureRoomMediaEntry>>>
> = {
  'series-desk': {
    en: {
      posterUrl: '',
      webmUrl: '',
      mp4Url: SERIES_OVERVIEW_EN_MP4,
    },
  },
}

/** Reserved site path for a room film that is not published yet. */
export function featureRoomOverviewPath(
  roomId: string,
  locale: VideoLocaleId,
  ext: 'webm' | 'mp4'
): string {
  return `/landing/key-features/rooms/${roomId}-${locale}.${ext}`
}

function localeMedia(roomId: string, locale: VideoLocaleId): FeatureRoomMediaEntry {
  if (!(FEATURE_ROOM_IDS as readonly string[]).includes(roomId)) {
    return { ...EMPTY_ROOM_MEDIA }
  }
  const room = PRODUCED_ROOM_FILMS[roomId as FeatureRoomId]
  const english = room?.en
  if (!english?.webmUrl && !english?.mp4Url) return { ...EMPTY_ROOM_MEDIA }
  const produced = room?.[locale]
  if (!produced?.webmUrl && !produced?.mp4Url) return { ...EMPTY_ROOM_MEDIA }
  return { ...produced }
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

/** Produced sources when a film exists, otherwise the reserved WebM then MP4 paths. */
export function featureRoomVideoSources(
  roomId: string,
  locale: VideoLocaleId
): Array<{ src: string; type: 'video/webm' | 'video/mp4' }> {
  const media = localeMedia(roomId, locale)
  const sources: Array<{ src: string; type: 'video/webm' | 'video/mp4' }> = []
  if (media.webmUrl) sources.push({ src: media.webmUrl, type: 'video/webm' })
  if (media.mp4Url) sources.push({ src: media.mp4Url, type: 'video/mp4' })
  if (sources.length > 0) return sources
  return [
    { src: featureRoomOverviewPath(roomId, locale, 'webm'), type: 'video/webm' },
    { src: featureRoomOverviewPath(roomId, locale, 'mp4'), type: 'video/mp4' },
  ]
}

export function featureRoomHasVideo(entry: FeatureRoomMediaEntry): boolean {
  return Boolean(entry.webmUrl || entry.mp4Url)
}
