import { LANDING_TRANSLATE_LANGUAGES } from '@/config/landingTranslateLanguages'

/** BCP-47-ish locale codes used on the landing page. */
export const LANDING_LOCALES = LANDING_TRANSLATE_LANGUAGES.map((l) => l.code)

export const DEFAULT_LANDING_LOCALE = 'en'

export const LANDING_LOCALE_STORAGE_KEY = 'sf-landing-locale'

/** Locales that render right-to-left. */
export const RTL_LANDING_LOCALES = new Set(['ar', 'he', 'fa', 'ur'])

export function isLandingLocale(locale: string | null | undefined): locale is string {
  return Boolean(locale && LANDING_LOCALES.includes(locale))
}

export function getLandingLocaleDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_LANDING_LOCALES.has(locale) ? 'rtl' : 'ltr'
}

/** Hero-video locales with Tier A human-review priority for headline/CTA strings. */
export const TIER_A_HERO_LOCALES = ['es', 'pt', 'hi', 'zh-CN', 'ar', 'th'] as const

/** Map browser language tag to a supported landing locale. */
export function matchBrowserLocale(browserLang: string | undefined): string {
  if (!browserLang) return DEFAULT_LANDING_LOCALE
  const lower = browserLang.toLowerCase()
  const exact = LANDING_LOCALES.find((l) => l.toLowerCase() === lower)
  if (exact) return exact
  const base = lower.split('-')[0]
  const byBase = LANDING_LOCALES.find((l) => l.toLowerCase().split('-')[0] === base)
  return byBase ?? DEFAULT_LANDING_LOCALE
}

export function getLandingLocalePath(locale: string, hash?: string): string {
  const path = locale === DEFAULT_LANDING_LOCALE ? '/' : `/${locale}`
  return hash ? `${path}${hash.startsWith('#') ? hash : `#${hash}`}` : path
}
