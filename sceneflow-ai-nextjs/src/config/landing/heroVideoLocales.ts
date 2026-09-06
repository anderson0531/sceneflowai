/**
 * Landing hero commercial — per-locale dubbed MP4s (watermarked via scripts/watermark-hero-video.mjs).
 * Append #t=0.1 to skip black first frame when supported.
 */

import type { VideoLocale } from '@/config/landing/videoLocales'

export type HeroVideoLocaleId = 'en' | 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'

export type HeroVideoLocale = {
  id: HeroVideoLocaleId
  /** UI label (English) */
  label: string
  /** Native language name for pills */
  nativeLabel: string
  /** Progressive MP4 URL (GCS/CDN when configured; Blob fallback) */
  src: string
  /** Adaptive HLS manifest when CDN + NEXT_PUBLIC_LANDING_VIDEO_HLS are set */
  hlsSrc?: string
  /** Explicit MP4 fallback (same as src when unset) */
  mp4Src?: string
  /** JPG poster shown while video loads */
  poster: string
  available: boolean
}

export const HERO_VIDEO_BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

function readPublicEnv(name: string): string | undefined {
  if (typeof process === 'undefined') return undefined
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

/** Optional GCS / Cloud CDN base — e.g. https://storage.googleapis.com/sceneflow-assets */
export function getLandingVideoCdnHost(): string | undefined {
  return readPublicEnv('NEXT_PUBLIC_LANDING_VIDEO_CDN')?.replace(/\/$/, '')
}

/** HLS is opt-in; CDN env alone must not attach a missing manifest. */
export function isLandingVideoHlsEnabled(): boolean {
  const flag = readPublicEnv('NEXT_PUBLIC_LANDING_VIDEO_HLS')
  return flag === '1' || flag === 'true'
}

/** Snapshot for layout preconnect (Next inlines NEXT_PUBLIC_* at build). */
export const LANDING_VIDEO_CDN_HOST = getLandingVideoCdnHost()

const BLOB_HOST = HERO_VIDEO_BLOB_HOST

/** Site-served poster (~80–120 KB) — first paint while the MP4 buffers. */
export function getHeroVideoPosterUrl(locale: HeroVideoLocaleId): string {
  return getHeroVideoPosterPath(locale)
}

/** Site-served poster path (regenerated via regenerate-hero-posters.mjs). */
export function getHeroVideoPosterPath(locale: HeroVideoLocaleId): string {
  return `/landing/hero/sceneflow-hero-${locale}-poster.jpg`
}

/** HLS manifest — requires CDN host and NEXT_PUBLIC_LANDING_VIDEO_HLS=1. */
export function getHeroVideoHlsUrl(locale: HeroVideoLocaleId): string | undefined {
  const cdn = getLandingVideoCdnHost()
  if (!cdn || !isLandingVideoHlsEnabled()) return undefined
  return `${cdn}/hero/${locale}/hls/manifest.m3u8`
}

/** Blob master filename for each locale once produced. */
export const HERO_VIDEO_BLOB_PATHS: Record<HeroVideoLocaleId, string> = {
  en: 'SceneFlow Hero Video.mp4',
  es: 'Hero Video (Spanish) .mp4',
  pt: 'Hero Video (Portuguese).mp4',
  hi: 'Hero Video (Hindi).mp4',
  zh: 'Hero Video (Chinese).mp4',
  ar: 'Hero Video (Arabic) .mp4',
  th: 'Hero Video (Thai) .mp4',
}

function heroSrc(path: string): string {
  return `${BLOB_HOST}/${encodeURI(path)}#t=0.1`
}

/** Progressive MP4: GCS/CDN master when configured, otherwise Blob fallback. */
export function getHeroVideoMp4Url(locale: HeroVideoLocaleId): string {
  const cdn = getLandingVideoCdnHost()
  if (cdn) {
    return `${cdn}/hero/${locale}/master.mp4#t=0.1`
  }
  return heroSrc(HERO_VIDEO_BLOB_PATHS[locale])
}

export const DEFAULT_HERO_VIDEO_LOCALE: HeroVideoLocaleId = 'en'

const HERO_VIDEO_LABELS: Record<HeroVideoLocaleId, { label: string; nativeLabel: string }> = {
  en: { label: 'English', nativeLabel: 'English' },
  es: { label: 'Spanish', nativeLabel: 'Español' },
  pt: { label: 'Portuguese', nativeLabel: 'Português' },
  hi: { label: 'Hindi', nativeLabel: 'हिन्दी' },
  zh: { label: 'Chinese', nativeLabel: '中文' },
  ar: { label: 'Arabic', nativeLabel: 'العربية' },
  th: { label: 'Thai', nativeLabel: 'ไทย' },
}

/** Locales with a produced master. Others render as disabled "Soon" pills. */
const PRODUCED_HERO_VIDEO_IDS = new Set<HeroVideoLocaleId>([
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
])

function buildHeroVideoLocale(id: HeroVideoLocaleId): HeroVideoLocale {
  const { label, nativeLabel } = HERO_VIDEO_LABELS[id]
  const available = PRODUCED_HERO_VIDEO_IDS.has(id)
  const mp4Src = available ? getHeroVideoMp4Url(id) : ''

  return {
    id,
    label,
    nativeLabel,
    src: mp4Src,
    hlsSrc: available ? getHeroVideoHlsUrl(id) : undefined,
    mp4Src: mp4Src || undefined,
    poster: available ? getHeroVideoPosterUrl(id) : '',
    available,
  }
}

export const HERO_VIDEO_LOCALES: HeroVideoLocale[] = (
  Object.keys(HERO_VIDEO_LABELS) as HeroVideoLocaleId[]
).map(buildHeroVideoLocale)

export const HERO_VIDEO_MULTILANG_HINT =
  'Hero dubs in 7 languages — full pipeline supports 70+ in Production Studio.'

export const HERO_VIDEO_LANGUAGE_PROMPT =
  'Hear the hero in your language — same pipeline, new markets'

export const HERO_VIDEO_LOCALE_STORAGE_KEY = 'sf-hero-video-locale'

/** User dismissed the first-visit "Play with narration" prompt */
export const HERO_VIDEO_UNMUTE_DISMISSED_KEY = 'sf-hero-unmute-dismissed'

export function getHeroVideoLocale(id: HeroVideoLocaleId): HeroVideoLocale | undefined {
  if (!(id in HERO_VIDEO_LABELS)) return undefined
  return buildHeroVideoLocale(id)
}

/** Map hero locale config into the shared video player model. */
export function getHeroVideoLocalesAsVideoLocales(): VideoLocale[] {
  return (Object.keys(HERO_VIDEO_LABELS) as HeroVideoLocaleId[]).map((id) => {
    const locale = buildHeroVideoLocale(id)
    return {
      id,
      src: locale.hlsSrc ?? locale.src,
      poster: locale.poster || undefined,
      available: locale.available,
    }
  })
}

/** Resolve playback sources for the adaptive landing player. */
export function getHeroVideoPlaybackSources(id: HeroVideoLocaleId): {
  hlsSrc?: string
  mp4Src: string
  poster: string
} | null {
  const entry = getHeroVideoLocale(id)
  if (!entry?.available || !entry.src) return null
  return {
    hlsSrc: entry.hlsSrc,
    mp4Src: entry.mp4Src ?? entry.src,
    poster: entry.poster,
  }
}

export function getDefaultHeroVideoSrc(): string {
  return getHeroVideoMp4Url(DEFAULT_HERO_VIDEO_LOCALE)
}

export function getDefaultHeroVideoPoster(): string {
  return getHeroVideoPosterUrl(DEFAULT_HERO_VIDEO_LOCALE)
}

/** Locales that can be selected in the hero player */
export function getAvailableHeroVideoLocales(): HeroVideoLocale[] {
  return (Object.keys(HERO_VIDEO_LABELS) as HeroVideoLocaleId[])
    .map(buildHeroVideoLocale)
    .filter((locale) => locale.available && locale.src.trim())
}

/** Map browser language to a hero locale for first-visit pill hint */
export function getSuggestedHeroLocaleFromBrowser(): HeroVideoLocaleId | null {
  if (typeof navigator === 'undefined') return null

  const lang = navigator.language?.toLowerCase() ?? ''
  const prefix = lang.split('-')[0]

  const map: Record<string, HeroVideoLocaleId> = {
    en: 'en',
    es: 'es',
    pt: 'pt',
    hi: 'hi',
    zh: 'zh',
    ar: 'ar',
    th: 'th',
  }

  const id = map[prefix]
  if (!id) return null
  return getHeroVideoLocale(id)?.available ? id : null
}
