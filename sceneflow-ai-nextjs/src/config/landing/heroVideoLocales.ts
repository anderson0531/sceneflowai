/**
 * Landing hero commercial — per-locale dubbed MP4s (watermarked via scripts/watermark-hero-video.mjs).
 * Append #t=0.1 to skip black first frame when supported.
 */

export type HeroVideoLocaleId = 'en' | 'th' | 'es' | 'zh' | 'ar'

export type HeroVideoLocale = {
  id: HeroVideoLocaleId
  /** UI label (English) */
  label: string
  /** Native language name for pills */
  nativeLabel: string
  /** Public Blob URL; empty when not yet produced */
  src: string
  /** JPG poster shown while the MP4 loads */
  poster: string
  available: boolean
}

const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

function heroSrc(path: string): string {
  return `${BLOB_HOST}/${encodeURI(path)}#t=0.1`
}

function heroPoster(path: string): string {
  return `${BLOB_HOST}/${encodeURI(path)}`
}

export const DEFAULT_HERO_VIDEO_LOCALE: HeroVideoLocaleId = 'en'

export const HERO_VIDEO_LOCALES: HeroVideoLocale[] = [
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    src: heroSrc('landing/hero/sceneflow-hero-en.mp4'),
    poster: heroPoster('landing/hero/sceneflow-hero-en-poster.jpg'),
    available: true,
  },
  {
    id: 'th',
    label: 'Thai',
    nativeLabel: 'ไทย',
    src: heroSrc('landing/hero/sceneflow-hero-th.mp4'),
    poster: heroPoster('landing/hero/sceneflow-hero-th-poster.jpg'),
    available: true,
  },
  {
    id: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    src: heroSrc('landing/hero/sceneflow-hero-es.mp4'),
    poster: heroPoster('landing/hero/sceneflow-hero-es-poster.jpg'),
    available: true,
  },
  {
    id: 'zh',
    label: 'Chinese',
    nativeLabel: '中文',
    src: heroSrc('landing/hero/sceneflow-hero-zh.mp4'),
    poster: heroPoster('landing/hero/sceneflow-hero-zh-poster.jpg'),
    available: true,
  },
  {
    id: 'ar',
    label: 'Arabic',
    nativeLabel: 'العربية',
    src: heroSrc('landing/hero/sceneflow-hero-ar.mp4'),
    poster: heroPoster('landing/hero/sceneflow-hero-ar-poster.jpg'),
    available: true,
  },
]

export const HERO_VIDEO_MULTILANG_HINT =
  'Hero dubs in 5 languages — full pipeline supports 70+ in Production.'

export const HERO_VIDEO_LANGUAGE_PROMPT = 'Hear the hero in your language'

export const HERO_VIDEO_LOCALE_STORAGE_KEY = 'sf-hero-video-locale'

/** User dismissed the first-visit "Play with narration" prompt */
export const HERO_VIDEO_UNMUTE_DISMISSED_KEY = 'sf-hero-unmute-dismissed'

export function getHeroVideoLocale(id: HeroVideoLocaleId): HeroVideoLocale | undefined {
  return HERO_VIDEO_LOCALES.find((l) => l.id === id)
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
    th: 'th',
    es: 'es',
    zh: 'zh',
    ar: 'ar',
  }

  const id = map[prefix]
  if (!id) return null
  return getHeroVideoLocale(id)?.available ? id : null
}
