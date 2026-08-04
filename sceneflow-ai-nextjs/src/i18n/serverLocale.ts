import { cookies, headers } from 'next/headers'
import {
  DEFAULT_LOCALE,
  isLocale,
  LANDING_LOCALE_COOKIE,
  matchAcceptLanguage,
  UI_LOCALE_COOKIE,
} from './locale'

/**
 * Resolve the interface locale for a server-rendered app surface.
 *
 * The `sf-locale` cookie mirrors `users.preferred_locale` and is rewritten
 * whenever the setting changes, so the durable profile value is honoured
 * without a database round trip on every layout render. When no cookie is
 * present we inherit the landing-page choice (so a visitor who read the
 * marketing site in Japanese lands in a Japanese app) before falling back to
 * the browser's `Accept-Language`.
 */
export async function resolveUiLocale(): Promise<string> {
  const cookieStore = await cookies()

  const fromCookie = cookieStore.get(UI_LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie

  const fromLanding = cookieStore.get(LANDING_LOCALE_COOKIE)?.value
  if (isLocale(fromLanding)) return fromLanding

  try {
    const headerStore = await headers()
    const fromHeader = matchAcceptLanguage(headerStore.get('accept-language'))
    if (fromHeader) return fromHeader
  } catch {
    // `headers()` is unavailable in some render contexts; the default is fine.
  }

  return DEFAULT_LOCALE
}

/**
 * Locale used for the `<html>` element. Landing routes keep their own cookie,
 * so prefer whichever cookie is set while still yielding a single document
 * direction.
 */
export async function resolveDocumentLocale(): Promise<string> {
  return resolveUiLocale()
}
