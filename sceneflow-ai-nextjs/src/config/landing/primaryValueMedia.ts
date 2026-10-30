/**
 * Background slots for the two value sections under friction.
 * Direction ("The control you keep") and publish ("The cut you publish")
 * each play one English cut: WebM first, then an H.264 MP4 fallback.
 */

import {
  HERO_VIDEO_LOCALE_ORDER,
  landingLocaleToHeroVideoLocale,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import type { TwoModesMediaEntry, TwoModesVideoLocale } from '@/config/landing/twoModesMedia'
import {
  VIDEO_LOCALE_ORDER,
  type VideoLocaleId,
} from '@/config/landing/videoLocales'

export const PRIMARY_VALUE_MEDIA_IDS = ['direction', 'publish'] as const

export type PrimaryValueMediaId = (typeof PRIMARY_VALUE_MEDIA_IDS)[number]

const ILLUSTRATION_BASE = '/landing/primary-value'
const DIRECTION_POSTER = `${ILLUSTRATION_BASE}/direction.webp`
const PRODUCTION_AGENT_POSTER = `${ILLUSTRATION_BASE}/production-agent.webp`
const PUBLISH_POSTER = `${ILLUSTRATION_BASE}/publish.webp`
const STUDIO_ACADEMY_POSTER = `${ILLUSTRATION_BASE}/studio-academy.webp`

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

/** Blob master for each Control dub. The section plays English only. */
export const DIRECT_CONTROL_VIDEO_BLOB_PATHS: Record<VideoLocaleId, string> = {
  en: 'The control (English).mp4',
  es: 'The Control (Spanish).mp4',
  zh: `The Control (${LOCALE_FILENAME_LABELS.zh}).mp4`,
  ar: `The Control (${LOCALE_FILENAME_LABELS.ar}).mp4`,
}

export function directControlVideoBlobPath(locale: VideoLocaleId): string {
  return DIRECT_CONTROL_VIDEO_BLOB_PATHS[locale]
}

/** The control section ships English plus 6 dubbed locales. */
const DIRECT_CONTROL_PRODUCED = new Set<VideoLocaleId>(['en', 'es', 'zh', 'ar'])

/** Cache-bust when the English cut is replaced at the same path. */
const DIRECTION_EN_VERSION = '20261012'
const PRIMARY_VALUE_DUB_VERSION = '20261030'

function buildDubMediaMap(
  prefix: string,
  posterUrl: string,
  enVersion: string
): Record<HeroVideoLocaleId, TwoModesMediaEntry> {
  return {
    en: {
      imageUrl: '',
      posterUrl,
      webmUrl: `${ILLUSTRATION_BASE}/${prefix}-en.webm?v=${enVersion}`,
      mp4Url: `${ILLUSTRATION_BASE}/${prefix}-en.mp4?v=${enVersion}`,
    },
    es: {
      imageUrl: '',
      posterUrl,
      webmUrl: `${ILLUSTRATION_BASE}/${prefix}-es.webm?v=${PRIMARY_VALUE_DUB_VERSION}`,
      mp4Url: `${ILLUSTRATION_BASE}/${prefix}-es.mp4?v=${PRIMARY_VALUE_DUB_VERSION}`,
    },
    pt: {
      imageUrl: '',
      posterUrl,
      webmUrl: `${ILLUSTRATION_BASE}/${prefix}-pt.webm?v=${PRIMARY_VALUE_DUB_VERSION}`,
      mp4Url: `${ILLUSTRATION_BASE}/${prefix}-pt.mp4?v=${PRIMARY_VALUE_DUB_VERSION}`,
    },
    hi: {
      imageUrl: '',
      posterUrl,
      webmUrl: `${ILLUSTRATION_BASE}/${prefix}-hi.webm?v=${PRIMARY_VALUE_DUB_VERSION}`,
      mp4Url: `${ILLUSTRATION_BASE}/${prefix}-hi.mp4?v=${PRIMARY_VALUE_DUB_VERSION}`,
    },
    zh: {
      imageUrl: '',
      posterUrl,
      webmUrl: `${ILLUSTRATION_BASE}/${prefix}-zh.webm?v=${PRIMARY_VALUE_DUB_VERSION}`,
      mp4Url: `${ILLUSTRATION_BASE}/${prefix}-zh.mp4?v=${PRIMARY_VALUE_DUB_VERSION}`,
    },
    ar: {
      imageUrl: '',
      posterUrl,
      webmUrl: `${ILLUSTRATION_BASE}/${prefix}-ar.webm?v=${PRIMARY_VALUE_DUB_VERSION}`,
      mp4Url: `${ILLUSTRATION_BASE}/${prefix}-ar.mp4?v=${PRIMARY_VALUE_DUB_VERSION}`,
    },
    th: {
      imageUrl: '',
      posterUrl,
      webmUrl: `${ILLUSTRATION_BASE}/${prefix}-th.webm?v=${PRIMARY_VALUE_DUB_VERSION}`,
      mp4Url: `${ILLUSTRATION_BASE}/${prefix}-th.mp4?v=${PRIMARY_VALUE_DUB_VERSION}`,
    },
  }
}

export const DIRECT_CONTROL_DUB_MEDIA: Record<HeroVideoLocaleId, TwoModesMediaEntry> =
  buildDubMediaMap('direction', DIRECTION_POSTER, DIRECTION_EN_VERSION)

/** Encodes shipped with the app. */
const DIRECT_CONTROL_LOCAL_MEDIA: Partial<
  Record<VideoLocaleId, { webmUrl: string; mp4Url: string }>
> = {
  en: {
    webmUrl: DIRECT_CONTROL_DUB_MEDIA.en.webmUrl,
    mp4Url: DIRECT_CONTROL_DUB_MEDIA.en.mp4Url,
  },
  es: {
    webmUrl: DIRECT_CONTROL_DUB_MEDIA.es.webmUrl,
    mp4Url: DIRECT_CONTROL_DUB_MEDIA.es.mp4Url,
  },
  zh: {
    webmUrl: DIRECT_CONTROL_DUB_MEDIA.zh.webmUrl,
    mp4Url: DIRECT_CONTROL_DUB_MEDIA.zh.mp4Url,
  },
  ar: {
    webmUrl: DIRECT_CONTROL_DUB_MEDIA.ar.webmUrl,
    mp4Url: DIRECT_CONTROL_DUB_MEDIA.ar.mp4Url,
  },
}

function directionMedia(id: VideoLocaleId): TwoModesMediaEntry {
  if (!DIRECT_CONTROL_PRODUCED.has(id)) return EMPTY_MEDIA
  const local = DIRECT_CONTROL_LOCAL_MEDIA[id]
  return {
    ...EMPTY_MEDIA,
    posterUrl: DIRECTION_POSTER,
    webmUrl: local?.webmUrl ?? '',
    mp4Url: local?.mp4Url ?? '',
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

/** The cut section ships English plus 6 dubbed locales. */
const PUBLISH_CUT_PRODUCED = new Set<VideoLocaleId>(['en', 'es', 'zh', 'ar'])

/** Cache-bust when the English cut is replaced at the same path. */
const PUBLISH_EN_VERSION = '20261012'

export const PUBLISH_CUT_DUB_MEDIA: Record<HeroVideoLocaleId, TwoModesMediaEntry> =
  buildDubMediaMap('publish', PUBLISH_POSTER, PUBLISH_EN_VERSION)

/** Encodes shipped with the app. */
const PUBLISH_CUT_LOCAL_MEDIA: Partial<
  Record<VideoLocaleId, { webmUrl: string; mp4Url: string }>
> = {
  en: {
    webmUrl: PUBLISH_CUT_DUB_MEDIA.en.webmUrl,
    mp4Url: PUBLISH_CUT_DUB_MEDIA.en.mp4Url,
  },
  es: {
    webmUrl: PUBLISH_CUT_DUB_MEDIA.es.webmUrl,
    mp4Url: PUBLISH_CUT_DUB_MEDIA.es.mp4Url,
  },
  zh: {
    webmUrl: PUBLISH_CUT_DUB_MEDIA.zh.webmUrl,
    mp4Url: PUBLISH_CUT_DUB_MEDIA.zh.mp4Url,
  },
  ar: {
    webmUrl: PUBLISH_CUT_DUB_MEDIA.ar.webmUrl,
    mp4Url: PUBLISH_CUT_DUB_MEDIA.ar.mp4Url,
  },
}

function publishMedia(id: VideoLocaleId): TwoModesMediaEntry {
  if (!PUBLISH_CUT_PRODUCED.has(id)) return EMPTY_MEDIA
  const local = PUBLISH_CUT_LOCAL_MEDIA[id]
  return {
    ...EMPTY_MEDIA,
    posterUrl: PUBLISH_POSTER,
    webmUrl: local?.webmUrl ?? '',
    mp4Url: local?.mp4Url ?? '',
  }
}

export const PRIMARY_VALUE_MEDIA: Record<PrimaryValueMediaId, TwoModesMediaEntry> = {
  direction: directionMedia('en'),
  publish: publishMedia('en'),
}

/** Blob master for the Production Agent hero walkthrough. */
export const PRODUCTION_AGENT_VIDEO_BLOB_PATHS: Record<VideoLocaleId, string> = {
  en: 'Production Agent.mp4',
  es: 'Production Agent (Spanish).mp4',
  zh: `Production Agent (${LOCALE_FILENAME_LABELS.zh}).mp4`,
  ar: `Production Agent (${LOCALE_FILENAME_LABELS.ar}).mp4`,
}

export function productionAgentVideoBlobPath(locale: VideoLocaleId): string {
  return PRODUCTION_AGENT_VIDEO_BLOB_PATHS[locale]
}

const PRODUCTION_AGENT_EN_VERSION = '20261030'

export const PRODUCTION_AGENT_DUB_MEDIA: Record<HeroVideoLocaleId, TwoModesMediaEntry> =
  buildDubMediaMap('production-agent', PRODUCTION_AGENT_POSTER, PRODUCTION_AGENT_EN_VERSION)

export const PRODUCTION_AGENT_MEDIA: TwoModesMediaEntry = PRODUCTION_AGENT_DUB_MEDIA.en

/** Blob master for the SceneFlow Studio Academy hero walkthrough. */
export const STUDIO_ACADEMY_VIDEO_BLOB_PATHS: Record<VideoLocaleId, string> = {
  en: 'SceneFlow Studio Academy.mp4',
  es: 'SceneFlow Studio Academy (Spanish).mp4',
  zh: `SceneFlow Studio Academy (${LOCALE_FILENAME_LABELS.zh}).mp4`,
  ar: `SceneFlow Studio Academy (${LOCALE_FILENAME_LABELS.ar}).mp4`,
}

export function studioAcademyVideoBlobPath(locale: VideoLocaleId): string {
  return STUDIO_ACADEMY_VIDEO_BLOB_PATHS[locale]
}

const STUDIO_ACADEMY_EN_VERSION = '20261030'

export const STUDIO_ACADEMY_DUB_MEDIA: Record<HeroVideoLocaleId, TwoModesMediaEntry> =
  buildDubMediaMap('studio-academy', STUDIO_ACADEMY_POSTER, STUDIO_ACADEMY_EN_VERSION)

export const STUDIO_ACADEMY_MEDIA: TwoModesMediaEntry = STUDIO_ACADEMY_DUB_MEDIA.en

export function getPrimaryValueMedia(id: string, locale?: string): TwoModesMediaEntry {
  const resolvedLocale = locale ? landingLocaleToHeroVideoLocale(locale) : 'en'
  if (id === 'agent' || id === 'production-agent') {
    return PRODUCTION_AGENT_DUB_MEDIA[resolvedLocale] ?? PRODUCTION_AGENT_MEDIA
  }
  if (id === 'academy' || id === 'studio-academy') {
    return STUDIO_ACADEMY_DUB_MEDIA[resolvedLocale] ?? STUDIO_ACADEMY_MEDIA
  }
  if (id === 'direction') {
    return DIRECT_CONTROL_DUB_MEDIA[resolvedLocale] ?? PRIMARY_VALUE_MEDIA.direction
  }
  if (id === 'publish') {
    return PUBLISH_CUT_DUB_MEDIA[resolvedLocale] ?? PRIMARY_VALUE_MEDIA.publish
  }
  return EMPTY_MEDIA
}

export function getDirectControlDubLocales(): Array<
  TwoModesMediaEntry & { id: HeroVideoLocaleId; available: boolean }
> {
  return HERO_VIDEO_LOCALE_ORDER.map((id) => ({
    id,
    ...DIRECT_CONTROL_DUB_MEDIA[id],
    available: true,
  }))
}

export function getProductionAgentDubLocales(): Array<
  TwoModesMediaEntry & { id: HeroVideoLocaleId; available: boolean }
> {
  return HERO_VIDEO_LOCALE_ORDER.map((id) => ({
    id,
    ...PRODUCTION_AGENT_DUB_MEDIA[id],
    available: true,
  }))
}

export function getPublishCutDubLocales(): Array<
  TwoModesMediaEntry & { id: HeroVideoLocaleId; available: boolean }
> {
  return HERO_VIDEO_LOCALE_ORDER.map((id) => ({
    id,
    ...PUBLISH_CUT_DUB_MEDIA[id],
    available: true,
  }))
}

export function getStudioAcademyDubLocales(): Array<
  TwoModesMediaEntry & { id: HeroVideoLocaleId; available: boolean }
> {
  return HERO_VIDEO_LOCALE_ORDER.map((id) => ({
    id,
    ...STUDIO_ACADEMY_DUB_MEDIA[id],
    available: true,
  }))
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
