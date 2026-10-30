/**
 * Room films for the four feature rooms.
 * Each film defines the room and walks its workflow (60–90 seconds).
 * The in-page band loops an 8-second muted cold open until the visitor
 * plays the film with sound.
 * WebM is listed before the MP4 fallback. A room stays empty until its film is set.
 */

import {
  HERO_VIDEO_LOCALE_ORDER,
  landingLocaleToHeroVideoLocale,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
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

export type FeatureRoomDubLocale = FeatureRoomMediaEntry & {
  id: HeroVideoLocaleId
  available: boolean
}

const EMPTY_ROOM_MEDIA: FeatureRoomMediaEntry = {
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
}

/**
 * Room overviews. WebM plays first, and the MP4 is the fallback.
 * Each room ships English plus 6 Ana-voiced dubbed locales (es, pt, hi, zh, ar, th).
 */
export const SERIES_ROOM_OVERVIEW_WEBM = '/landing/key-features/rooms/series-desk-en.webm'

export const SERIES_ROOM_OVERVIEW_MP4 =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Series%20Room%20Overview%20.mp4'

export const BLUEPRINT_ROOM_OVERVIEW_WEBM = '/landing/key-features/rooms/blueprint-board-en.webm'

export const BLUEPRINT_ROOM_OVERVIEW_MP4 =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Blueprint%20Room%20Overview.mp4'

export const PRODUCTION_STAGE_OVERVIEW_WEBM = '/landing/key-features/rooms/production-stage-en.webm'

export const PRODUCTION_STAGE_OVERVIEW_MP4 =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Production%20Stage%20.mp4'

export const SCREENING_ROOM_OVERVIEW_WEBM = '/landing/key-features/rooms/screening-room-en.webm'

export const SCREENING_ROOM_OVERVIEW_MP4 =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screening%20Room%202.mp4'

/** Reserved site path for a room film in a given locale. */
export function featureRoomOverviewPath(
  roomId: string,
  locale: HeroVideoLocaleId | VideoLocaleId,
  ext: 'webm' | 'mp4'
): string {
  return `/landing/key-features/rooms/${roomId}-${locale}.${ext}`
}

function buildProducedRoomLocales(
  roomId: FeatureRoomId,
  enWebmUrl: string,
  enMp4Url: string
): Record<HeroVideoLocaleId, FeatureRoomMediaEntry> {
  return {
    en: {
      posterUrl: '',
      webmUrl: enWebmUrl,
      mp4Url: enMp4Url,
    },
    es: {
      posterUrl: '',
      webmUrl: featureRoomOverviewPath(roomId, 'es', 'webm'),
      mp4Url: featureRoomOverviewPath(roomId, 'es', 'mp4'),
    },
    pt: {
      posterUrl: '',
      webmUrl: featureRoomOverviewPath(roomId, 'pt', 'webm'),
      mp4Url: featureRoomOverviewPath(roomId, 'pt', 'mp4'),
    },
    hi: {
      posterUrl: '',
      webmUrl: featureRoomOverviewPath(roomId, 'hi', 'webm'),
      mp4Url: featureRoomOverviewPath(roomId, 'hi', 'mp4'),
    },
    zh: {
      posterUrl: '',
      webmUrl: featureRoomOverviewPath(roomId, 'zh', 'webm'),
      mp4Url: featureRoomOverviewPath(roomId, 'zh', 'mp4'),
    },
    ar: {
      posterUrl: '',
      webmUrl: featureRoomOverviewPath(roomId, 'ar', 'webm'),
      mp4Url: featureRoomOverviewPath(roomId, 'ar', 'mp4'),
    },
    th: {
      posterUrl: '',
      webmUrl: featureRoomOverviewPath(roomId, 'th', 'webm'),
      mp4Url: featureRoomOverviewPath(roomId, 'th', 'mp4'),
    },
  }
}

const PRODUCED_ROOM_FILMS: Partial<
  Record<FeatureRoomId, Partial<Record<HeroVideoLocaleId, FeatureRoomMediaEntry>>>
> = {
  'series-desk': buildProducedRoomLocales(
    'series-desk',
    SERIES_ROOM_OVERVIEW_WEBM,
    SERIES_ROOM_OVERVIEW_MP4
  ),
  'blueprint-board': buildProducedRoomLocales(
    'blueprint-board',
    BLUEPRINT_ROOM_OVERVIEW_WEBM,
    BLUEPRINT_ROOM_OVERVIEW_MP4
  ),
  'production-stage': buildProducedRoomLocales(
    'production-stage',
    PRODUCTION_STAGE_OVERVIEW_WEBM,
    PRODUCTION_STAGE_OVERVIEW_MP4
  ),
  'screening-room': buildProducedRoomLocales(
    'screening-room',
    SCREENING_ROOM_OVERVIEW_WEBM,
    SCREENING_ROOM_OVERVIEW_MP4
  ),
}

function localeMedia(roomId: string, locale: HeroVideoLocaleId): FeatureRoomMediaEntry {
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
  locale: string = 'en'
): FeatureRoomMediaEntry {
  if ((FEATURE_ROOM_IDS as readonly string[]).includes(id)) {
    const resolved = landingLocaleToHeroVideoLocale(locale)
    return localeMedia(id, resolved)
  }
  return { ...EMPTY_ROOM_MEDIA }
}

export function getFeatureRoomDubLocales(roomId: string): FeatureRoomDubLocale[] {
  return HERO_VIDEO_LOCALE_ORDER.map((id) => {
    const media = localeMedia(roomId, id)
    const available = Boolean(media.webmUrl || media.mp4Url)
    return {
      id,
      ...media,
      available,
    }
  })
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
  locale: HeroVideoLocaleId | VideoLocaleId
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
