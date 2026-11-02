import {
  LANDING_LOCALE_COOKIE,
  LANDING_LOCALE_EXPLICIT_COOKIE,
  LANDING_LOCALE_STORAGE_KEY,
  isLandingLocale,
} from './locale'

const COOKIE_MAX_AGE_SECONDS = 31_536_000

export type PersistLandingLocaleOptions = {
  explicit?: boolean
}

/** Persist the marketing locale the same way the header language switcher does. */
export function persistLandingLocale(
  locale: string,
  options?: PersistLandingLocaleOptions
): void {
  if (typeof window === 'undefined' || !isLandingLocale(locale)) return

  localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, locale)
  document.cookie = `${LANDING_LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  if (options?.explicit) {
    document.cookie = `${LANDING_LOCALE_EXPLICIT_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
  }
}

export function hasExplicitLandingLocaleChoice(): boolean {
  if (typeof document === 'undefined') return false
  return new RegExp(`(?:^|;\\s*)${LANDING_LOCALE_EXPLICIT_COOKIE}=1(?:;|$)`).test(
    document.cookie
  )
}

/** Cookie first, then localStorage. Undefined when the visitor has no stored choice. */
export function readPersistedLandingLocale(): string | undefined {
  if (typeof document === 'undefined') return undefined

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LANDING_LOCALE_COOKIE}=([^;]*)`)
  )
  const fromCookie = match?.[1] ? decodeURIComponent(match[1]) : undefined
  if (fromCookie && isLandingLocale(fromCookie)) return fromCookie

  try {
    const fromStorage = localStorage.getItem(LANDING_LOCALE_STORAGE_KEY)
    if (fromStorage && isLandingLocale(fromStorage)) return fromStorage
  } catch {
    // private mode / blocked storage
  }

  return undefined
}
