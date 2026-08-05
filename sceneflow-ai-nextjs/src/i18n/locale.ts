import {
  getPlatformLanguage,
  LANDING_TRANSLATE_LANGUAGES,
  PLATFORM_LANGUAGES,
} from '@/config/landingTranslateLanguages'

/** BCP-47-ish locale codes the platform ships, landing and app alike. */
export const LOCALES = PLATFORM_LANGUAGES.map((l) => l.code)

export const DEFAULT_LOCALE = 'en'

/** Cookie holding the interface locale for authenticated app surfaces. */
export const UI_LOCALE_COOKIE = 'sf-locale'

/** Cookie holding the landing-page locale (predates the app-wide setting). */
export const LANDING_LOCALE_COOKIE = 'sf-landing-locale'

export const UI_LOCALE_STORAGE_KEY = 'sf-locale'

/** Locales that render right-to-left. */
export const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur'])

export function isLocale(locale: string | null | undefined): locale is string {
  return Boolean(locale && LOCALES.includes(locale))
}

export function getLocaleDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'
}

/** Endonym, for language pickers. */
export function getLocaleNativeName(locale: string): string {
  return getPlatformLanguage(locale)?.name ?? locale
}

/** English exonym, for LLM prompt directives and admin tooling. */
export function getLocaleEnglishName(locale: string): string {
  return getPlatformLanguage(locale)?.englishName ?? locale
}

/**
 * Coerce an arbitrary language tag to a supported locale, or undefined.
 * Handles `es-419` -> `es` and `zh-Hans-CN` -> `zh-CN`.
 */
export function normalizeLocale(tag: string | null | undefined): string | undefined {
  if (!tag) return undefined
  const cleaned = tag.trim()
  if (!cleaned) return undefined

  const exact = LOCALES.find((l) => l.toLowerCase() === cleaned.toLowerCase())
  if (exact) return exact

  const lower = cleaned.toLowerCase()

  // Script-qualified Chinese tags carry the region in a later subtag.
  if (lower.startsWith('zh')) {
    if (/hant|\btw\b|\bhk\b|\bmo\b/.test(lower)) return 'zh-TW'
    return 'zh-CN'
  }

  const base = lower.split('-')[0]
  return LOCALES.find((l) => l.toLowerCase().split('-')[0] === base)
}

/** Map a browser language tag to a supported locale, falling back to English. */
export function matchBrowserLocale(browserLang: string | undefined): string {
  return normalizeLocale(browserLang) ?? DEFAULT_LOCALE
}

/**
 * Pick the best supported locale from an `Accept-Language` header, honouring
 * quality weights.
 */
export function matchAcceptLanguage(header: string | null | undefined): string | undefined {
  if (!header) return undefined

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0 }
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.q > 0)
    .sort((a, b) => b.q - a.q)

  for (const entry of ranked) {
    const match = normalizeLocale(entry.tag)
    if (match) return match
  }
  return undefined
}

/** Locales prioritised for human translation review. */
export const TIER_A_LOCALES = ['es', 'pt', 'hi', 'zh-CN', 'ar', 'th'] as const

// ---------------------------------------------------------------------------
// Landing-page aliases. The landing page predates the app-wide locale setting
// and keeps its own cookie and URL scheme; these names are kept so existing
// landing code continues to compile unchanged.
// ---------------------------------------------------------------------------

export const LANDING_LOCALES = LANDING_TRANSLATE_LANGUAGES.map((l) => l.code)
export const DEFAULT_LANDING_LOCALE = DEFAULT_LOCALE
export const LANDING_LOCALE_STORAGE_KEY = LANDING_LOCALE_COOKIE
export const RTL_LANDING_LOCALES = RTL_LOCALES
export const TIER_A_HERO_LOCALES = TIER_A_LOCALES

export function isLandingLocale(locale: string | null | undefined): locale is string {
  return isLocale(locale)
}

export function getLandingLocaleDirection(locale: string): 'ltr' | 'rtl' {
  return getLocaleDirection(locale)
}

export function getLandingLocalePath(locale: string, hash?: string): string {
  const path = locale === DEFAULT_LOCALE ? '/' : `/${locale}`
  return hash ? `${path}${hash.startsWith('#') ? hash : `#${hash}`}` : path
}
