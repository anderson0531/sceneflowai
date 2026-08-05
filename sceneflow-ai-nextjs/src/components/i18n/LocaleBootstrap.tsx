'use client'

import { useEffect, useState } from 'react'
import { Globe, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import {
  DEFAULT_LOCALE,
  getLocaleNativeName,
  isLocale,
  normalizeLocale,
} from '@/i18n/locale'
import {
  applyDocumentLocale,
  readUiLocaleCookie,
  writeUiLocaleCookie,
} from '@/i18n/useUiLocale'

const DISMISSED_KEY = 'sf-locale-suggestion-dismissed'

/**
 * Reconciles the stored locale preference with the current device, once per app
 * load.
 *
 * Two jobs:
 *  - Sync the profile value into the `sf-locale` cookie. A user who signs in on
 *    a new device has the preference in Postgres but no cookie, so server
 *    layouts would render English until this runs.
 *  - Offer, rather than impose, the browser's language when the user has never
 *    chosen one. Silently switching the interface out from under someone who
 *    happens to be travelling is worse than asking.
 */
export function LocaleBootstrap() {
  const t = useTranslations('common.language')
  const [suggestion, setSuggestion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      let profile: { uiLocale?: string; isExplicit?: boolean } | null = null
      try {
        const response = await fetch('/api/user/locale')
        if (response.ok) profile = await response.json()
      } catch {
        return
      }
      if (cancelled || !profile) return

      const cookieLocale = readUiLocaleCookie()

      if (profile.isExplicit && isLocale(profile.uiLocale)) {
        if (cookieLocale !== profile.uiLocale) {
          writeUiLocaleCookie(profile.uiLocale)
          applyDocumentLocale(profile.uiLocale)
          window.location.reload()
        }
        return
      }

      // No explicit choice on record. Suggest the browser language if it is
      // supported, differs from what is showing, and has not been dismissed.
      if (cookieLocale) return
      try {
        if (localStorage.getItem(DISMISSED_KEY) === '1') return
      } catch {
        return
      }

      const browserLocale = normalizeLocale(
        typeof navigator !== 'undefined' ? navigator.language : undefined
      )
      if (!browserLocale || browserLocale === DEFAULT_LOCALE) return
      if (browserLocale === document.documentElement.lang) return

      setSuggestion(browserLocale)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Nothing to do; the prompt simply reappears next load.
    }
    setSuggestion(null)
  }

  const accept = async () => {
    if (!suggestion) return
    writeUiLocaleCookie(suggestion)
    applyDocumentLocale(suggestion)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Non-fatal.
    }
    try {
      await fetch('/api/user/locale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uiLocale: suggestion }),
      })
    } catch {
      // The cookie already carries the choice.
    }
    window.location.reload()
  }

  if (!suggestion) return null

  const nativeName = getLocaleNativeName(suggestion)

  return (
    <div
      role="status"
      className="fixed bottom-4 end-4 z-[120] max-w-sm rounded-xl border border-cyan-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white" lang={suggestion}>
            {t('suggestionPrompt', { language: nativeName })}
          </p>
          <p className="mt-1 text-xs text-gray-400">{t('suggestionHint')}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="bg-cyan-500 text-white hover:bg-cyan-600" onClick={accept}>
              <span lang={suggestion}>{nativeName}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-gray-300"
              onClick={dismiss}
            >
              {t('keepEnglish')}
            </Button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label={t('dismiss')}
          className="rounded p-1 text-gray-500 hover:bg-slate-800 hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
