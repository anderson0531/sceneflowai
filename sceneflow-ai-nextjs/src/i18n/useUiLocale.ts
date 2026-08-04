'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  isLocale,
  UI_LOCALE_COOKIE,
  UI_LOCALE_STORAGE_KEY,
} from './locale'

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
 * Read and change the interface locale for app surfaces.
 *
 * Persists to `users.preferred_locale` and mirrors to the `sf-locale` cookie so
 * the next server render is already correct, then reloads so server components
 * re-render with the new catalog.
 */
export function useUiLocale() {
  const [locale, setLocale] = useState<string>(DEFAULT_LOCALE)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fromDocument = document.documentElement.lang
    const resolved = readUiLocaleCookie() ?? (isLocale(fromDocument) ? fromDocument : undefined)
    if (resolved) setLocale(resolved)
  }, [])

  const switchLocale = useCallback(
    async (nextLocale: string, options?: { reload?: boolean }) => {
      if (!isLocale(nextLocale)) return

      setLocale(nextLocale)
      writeUiLocaleCookie(nextLocale)
      applyDocumentLocale(nextLocale)

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
      if (options?.reload !== false && typeof window !== 'undefined') {
        window.location.reload()
      }
    },
    []
  )

  return { locale, switchLocale, isSaving, direction: getLocaleDirection(locale) }
}
