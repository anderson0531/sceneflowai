import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isLocale, UI_LOCALE_COOKIE } from './locale'

/**
 * Resolve the interface locale for a server-rendered app surface.
 *
 * The `sf-locale` cookie mirrors `users.preferred_locale` and is rewritten
 * whenever the setting changes, so the durable profile value is honoured
 * without a database round trip on every layout render.
 *
 * Nothing else is consulted. App chrome is only partially translated, so
 * inferring a locale from the marketing cookie or `Accept-Language` produced a
 * half-Spanish studio for users who never asked for one. A non-English
 * interface now requires an explicit in-app choice, which is what writes
 * `sf-locale`.
 */
export async function resolveUiLocale(): Promise<string> {
  const cookieStore = await cookies()

  const fromCookie = cookieStore.get(UI_LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie

  return DEFAULT_LOCALE
}

/** Locale used for the `<html>` element on app surfaces. */
export async function resolveDocumentLocale(): Promise<string> {
  return resolveUiLocale()
}
