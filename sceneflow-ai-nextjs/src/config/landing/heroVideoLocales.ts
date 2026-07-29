/**
 * Landing hero commercial — per-locale dubbed MP4s (watermarked via scripts/watermark-hero-video.mjs).
 * Append #t=0.1 to skip black first frame when supported.
 */

export type HeroVideoLocaleId = 'en' | 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'

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

/** Blob master filename for each locale once produced. */
export const HERO_VIDEO_BLOB_PATHS: Record<HeroVideoLocaleId, string> = {
  en: 'Hero Video (English).mp4',
  es: 'Hero Video (Spanish).mp4',
  pt: 'Hero Video (Portuguese).mp4',
  hi: 'Hero Video (Hindi).mp4',
  zh: 'Hero Video (Chinese).mp4',
  ar: 'Hero Video (Arabic).mp4',
  th: 'Hero Video (Thai).mp4',
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
const PRODUCED_HERO_VIDEOS: Partial<Record<HeroVideoLocaleId, { src: string; poster?: string }>> = {
  en: { src: heroSrc(HERO_VIDEO_BLOB_PATHS.en) },
}

export const HERO_VIDEO_LOCALES: HeroVideoLocale[] = (
  Object.keys(HERO_VIDEO_LABELS) as HeroVideoLocaleId[]
).map((id) => {
  const produced = PRODUCED_HERO_VIDEOS[id]
  const { label, nativeLabel } = HERO_VIDEO_LABELS[id]

  return {
    id,
    label,
    nativeLabel,
    src: produced?.src ?? '',
    poster: produced?.poster ?? '',
    available: Boolean(produced?.src),
  }
})

export const HERO_VIDEO_MULTILANG_HINT =
  'Hero dubs in 7 languages — full pipeline supports 70+ in Production.'

export const HERO_VIDEO_LANGUAGE_PROMPT =
  'Hear the hero in your language — same pipeline, new markets'

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
