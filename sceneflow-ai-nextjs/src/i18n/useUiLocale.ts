'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  isAppSurfacePath,
  isLocale,
  UI_LOCALE_COOKIE,
  UI_LOCALE_STORAGE_KEY,
} from './locale'
import { beginLocaleSwitch, endLocaleSwitch } from './localeSwitchStatus'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function readUiLocaleCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${UI_LOCALE_COOKIE}=([^;]+)`)
  )
  const value = match?.[1] ? decodeURIComponent(match[1]) : undefined
  return isLocale(value) ? value : undefined
}

export function writeUiLocaleCookie(locale: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${UI_LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale)
  } catch {
    // Private browsing modes can reject storage writes; the cookie is enough.
  }
}

/** Apply `lang` / `dir` to the document without waiting for a server round trip. */
export function applyDocumentLocale(locale: string): void {
  if (typeof document === 'undefined') return
  const dir = getLocaleDirection(locale)
  document.documentElement.lang = locale
  document.documentElement.dir = dir
  document.documentElement.classList.toggle('rtl', dir === 'rtl')
  document.body?.classList.toggle('rtl', dir === 'rtl')
}

/**
 * Resolve the client's UI locale without waiting for a useEffect tick.
 * Content MT needs this on the first render so chrome catalogs and body
 * translation agree about the reading language.
 *
 * On app surfaces the cookie is the only source. `<html lang>` can still hold a
 * marketing locale after a client-side navigation out of the landing page, and
 * honouring it there would disagree with the server render.
 */
export function resolveClientUiLocale(): string {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const fromCookie = readUiLocaleCookie()
  if (fromCookie) return fromCookie
  if (isAppSurfacePath(window.location?.pathname)) return DEFAULT_LOCALE
  const fromDocument = document.documentElement.lang
  return isLocale(fromDocument) ? fromDocument : DEFAULT_LOCALE
}

/**
 * Read and change the interface locale for app surfaces.
 *
 * Persists to `users.preferred_locale` and mirrors to the `sf-locale` cookie so
 * the next server render is already correct, then reloads so server components
 * re-render with the new catalog.
 *
 * Story authorship is a separate setting (`users.story_locale` in Settings).
 * Writing both here made leftover Español into the language AR and refine
 * stored on the blueprint.
 */
export function useUiLocale() {
  const [locale, setLocale] = useState<string>(() => resolveClientUiLocale())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const resolved = resolveClientUiLocale()
    if (resolved !== locale) setLocale(resolved)
    // Sync once on mount; switchLocale owns later updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchLocale = useCallback(
    async (nextLocale: string, options?: { reload?: boolean }) => {
      if (!isLocale(nextLocale)) return

      const willReload = options?.reload !== false && typeof window !== 'undefined'

      setLocale(nextLocale)
      writeUiLocaleCookie(nextLocale)
      applyDocumentLocale(nextLocale)

      // Raised before the request so the overlay covers the whole gap, not just
      // the reload at the end of it.
      if (willReload) beginLocaleSwitch(nextLocale)

      setIsSaving(true)
      try {
        await fetch('/api/user/locale', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uiLocale: nextLocale }),
        })
      } catch {
        // The cookie already carries the choice; the profile write can retry
        // on the next change.
      } finally {
        setIsSaving(false)
      }

      // Server components hold the message catalog, so a reload is what makes
      // the new language actually appear.
      if (willReload) {
        window.location.reload()
      } else {
        endLocaleSwitch()
      }
    },
    []
  )

  return { locale, switchLocale, isSaving, direction: getLocaleDirection(locale) }
}
