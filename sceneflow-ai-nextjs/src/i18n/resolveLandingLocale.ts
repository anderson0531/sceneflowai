import {
  DEFAULT_LANDING_LOCALE,
  isLandingLocale,
  matchAcceptLanguage,
} from './locale'

export type LandingLocaleHints = {
  cookie?: string | null
  acceptLanguage?: string | null
}

/**
 * Marketing locale for `/`: explicit cookie, then Accept-Language, then English.
 * URL slugs (`/es`) are handled separately and always win.
 */
export function resolveLandingLocaleFromHints(hints: LandingLocaleHints): string {
  if (hints.cookie && isLandingLocale(hints.cookie)) return hints.cookie

  const fromHeader = matchAcceptLanguage(hints.acceptLanguage)
  if (fromHeader && isLandingLocale(fromHeader)) return fromHeader

  return DEFAULT_LANDING_LOCALE
}
