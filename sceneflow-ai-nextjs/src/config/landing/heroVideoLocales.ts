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
  /** Progressive MP4 URL (Blob today; CDN fallback when HLS unavailable) */
  src: string
  /** Adaptive HLS manifest when NEXT_PUBLIC_LANDING_VIDEO_CDN is configured */
  hlsSrc?: string
  /** Explicit MP4 fallback (same as src when unset) */
  mp4Src?: string
  /** JPG poster shown while video loads */
  poster: string
  available: boolean
}

export const HERO_VIDEO_BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

/** Optional GCP Cloud CDN base — set when Transcoder HLS output is live. */
export const LANDING_VIDEO_CDN_HOST = (
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LANDING_VIDEO_CDN : undefined
)?.replace(/\/$/, '')

const BLOB_HOST = HERO_VIDEO_BLOB_HOST

/** Blob CDN poster (~110 KB) — loads immediately on mobile while video buffers. */
export function getHeroVideoPosterUrl(locale: HeroVideoLocaleId): string {
  if (locale === 'en' || locale === 'es' || locale === 'pt' || locale === 'hi') {
    // Regenerated from the current Blob master — site-served for instant deploy parity
    return getHeroVideoPosterPath(locale)
  }
  return `${BLOB_HOST}/landing/hero/sceneflow-hero-${locale}-poster.jpg`
}

/** Site-served poster path (regenerated via regenerate-hero-posters.mjs). */
export function getHeroVideoPosterPath(locale: HeroVideoLocaleId): string {
  return `/landing/hero/sceneflow-hero-${locale}-poster.jpg`
}

/** HLS manifest on landing video CDN (Phase 2 — enabled via env). */
export function getHeroVideoHlsUrl(locale: HeroVideoLocaleId): string | undefined {
  if (!LANDING_VIDEO_CDN_HOST) return undefined
  return `${LANDING_VIDEO_CDN_HOST}/hero/${locale}/hls/manifest.m3u8`
}

/** Blob master filename for each locale once produced. */
export const HERO_VIDEO_BLOB_PATHS: Record<HeroVideoLocaleId, string> = {
  en: 'SceneFlow Hero Video.mp4',
  es: 'Hero Video (Spanish).mp4',
  pt: 'Hero Video (Portuguese).mp4',
  hi: 'Hero Video (Hindi).mp4',
  zh: 'Hero Video (Chinese).mp4',
  ar: 'Hero Video (Arabic) .mp4',
  th: 'Hero Video (Thai) .mp4',
}

function heroSrc(path: string): string {
  return `${BLOB_HOST}/${encodeURI(path)}#t=0.1`
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

/** Locales with a produced Blob master. Others render as disabled "Soon" pills. */
const PRODUCED_HERO_VIDEOS: Partial<
  Record<HeroVideoLocaleId, { src: string; poster: string; hlsSrc?: string }>
> = {
  en: {
    src: heroSrc(HERO_VIDEO_BLOB_PATHS.en),
    poster: getHeroVideoPosterUrl('en'),
    hlsSrc: getHeroVideoHlsUrl('en'),
  },
  es: {
    src: heroSrc(HERO_VIDEO_BLOB_PATHS.es),
    poster: getHeroVideoPosterUrl('es'),
    hlsSrc: getHeroVideoHlsUrl('es'),
  },
  pt: {
    src: heroSrc(HERO_VIDEO_BLOB_PATHS.pt),
    poster: getHeroVideoPosterUrl('pt'),
    hlsSrc: getHeroVideoHlsUrl('pt'),
  },
  hi: {
    src: heroSrc(HERO_VIDEO_BLOB_PATHS.hi),
    poster: getHeroVideoPosterUrl('hi'),
    hlsSrc: getHeroVideoHlsUrl('hi'),
  },
  zh: {
    src: heroSrc(HERO_VIDEO_BLOB_PATHS.zh),
    poster: getHeroVideoPosterUrl('zh'),
    hlsSrc: getHeroVideoHlsUrl('zh'),
  },
  ar: {
    src: heroSrc(HERO_VIDEO_BLOB_PATHS.ar),
    poster: getHeroVideoPosterUrl('ar'),
    hlsSrc: getHeroVideoHlsUrl('ar'),
  },
  th: {
    src: heroSrc(HERO_VIDEO_BLOB_PATHS.th),
    poster: getHeroVideoPosterUrl('th'),
    hlsSrc: getHeroVideoHlsUrl('th'),
  },
}

export const HERO_VIDEO_LOCALES: HeroVideoLocale[] = (
  Object.keys(HERO_VIDEO_LABELS) as HeroVideoLocaleId[]
).map((id) => {
  const produced = PRODUCED_HERO_VIDEOS[id]
  const { label, nativeLabel } = HERO_VIDEO_LABELS[id]

  const mp4Src = produced?.src ?? ''

  return {
    id,
    label,
    nativeLabel,
    src: mp4Src,
    hlsSrc: produced?.hlsSrc,
    mp4Src: mp4Src || undefined,
    poster: produced?.poster ?? (mp4Src ? getHeroVideoPosterUrl(id) : ''),
    available: Boolean(mp4Src),
  }
})

export const HERO_VIDEO_MULTILANG_HINT =
  'Hero dubs in 7 languages — full pipeline supports 70+ in Production Studio.'

export const HERO_VIDEO_LANGUAGE_PROMPT =
  'Hear the hero in your language — same pipeline, new markets'

export const HERO_VIDEO_LOCALE_STORAGE_KEY = 'sf-hero-video-locale'

/** User dismissed the first-visit "Play with narration" prompt */
export const HERO_VIDEO_UNMUTE_DISMISSED_KEY = 'sf-hero-unmute-dismissed'

export function getHeroVideoLocale(id: HeroVideoLocaleId): HeroVideoLocale | undefined {
  return HERO_VIDEO_LOCALES.find((l) => l.id === id)
}

/** Map hero locale config into the shared video player model. */
export function getHeroVideoLocalesAsVideoLocales(): VideoLocale[] {
  return HERO_VIDEO_LOCALES.map(({ id, src, hlsSrc, poster, available }) => ({
    id,
    src: hlsSrc ?? src,
    poster: poster || undefined,
    available,
  }))
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
  const locale = getHeroVideoLocale(DEFAULT_HERO_VIDEO_LOCALE)
  return locale?.src ?? HERO_VIDEO_LOCALES[0].src
}

export function getDefaultHeroVideoPoster(): string {
  const locale = getHeroVideoLocale(DEFAULT_HERO_VIDEO_LOCALE)
  return locale?.poster ?? HERO_VIDEO_LOCALES[0].poster
}

/** Locales that can be selected in the hero player */
export function getAvailableHeroVideoLocales(): HeroVideoLocale[] {
  return HERO_VIDEO_LOCALES.filter((l) => l.available && l.src.trim())
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
