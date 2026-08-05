'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Globe, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { GoogleTranslate } from '@/app/components/GoogleTranslate'
import { applyGoogleTranslateLanguage } from '@/components/blueprint/BlueprintShareLanguageControls'
import { LocalePicker } from '@/components/i18n/LocalePicker'
import { allowsGoogleTranslate } from '@/config/i18n/gtSurfaces'
import { DEFAULT_LOCALE, getLocaleNativeName, isLocale } from '@/i18n/locale'
import { readUiLocaleCookie } from '@/i18n/useUiLocale'

const ACTIVE_COOKIE = 'sf-gt-active'

function readActiveLocale(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ACTIVE_COOKIE}=([^;]+)`))
  const value = match?.[1] ? decodeURIComponent(match[1]) : undefined
  return isLocale(value) ? value : undefined
}

function writeActiveLocale(locale: string | null): void {
  if (typeof document === 'undefined') return
  if (locale) {
    document.cookie = `${ACTIVE_COOKIE}=${locale}; path=/; max-age=86400; SameSite=Lax`
  } else {
    document.cookie = `${ACTIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    // Clearing Google's own cookie is what actually reverts the page.
    document.cookie = 'googtrans=; path=/; max-age=0'
    document.cookie = `googtrans=; domain=${window.location.hostname}; path=/; max-age=0`
  }
}

/**
 * Opt-in browser translation for read-mostly surfaces.
 *
 * Never auto-on, and never rendered on a studio route — see
 * `src/config/i18n/gtSurfaces.ts` for why. The honest framing matters: this is a
 * machine translating the page in the browser, not a translated build, and the
 * control says so rather than implying the same quality as the catalogs.
 */
export function PageTranslateControl({ className }: { className?: string }) {
  const pathname = usePathname()
  const t = useTranslations('common.language')
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const permitted = allowsGoogleTranslate(pathname ?? '/')

  useEffect(() => {
    setMounted(true)
    const stored = readActiveLocale()
    if (stored) setActive(stored)
  }, [])

  // Re-apply after client navigation: the widget does not observe route changes.
  useEffect(() => {
    if (!active || !permitted) return
    const timer = window.setTimeout(() => applyGoogleTranslateLanguage(active), 600)
    return () => window.clearTimeout(timer)
  }, [active, permitted, pathname])

  const translateTo = useCallback((locale: string) => {
    setActive(locale)
    writeActiveLocale(locale)
    applyGoogleTranslateLanguage(locale)
    setExpanded(false)
  }, [])

  const revert = useCallback(() => {
    setActive(null)
    writeActiveLocale(null)
    // Google's widget has no clean teardown; a reload is the reliable revert.
    window.location.reload()
  }, [])

  if (!permitted || !mounted) return null

  const suggested = readUiLocaleCookie() ?? DEFAULT_LOCALE

  return (
    <div className={cn('flex items-center gap-2', className)} translate="no">
      {active ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
            <Globe className="h-3 w-3" />
            {getLocaleNativeName(active)}
          </span>
          <button
            type="button"
            onClick={revert}
            className="inline-flex items-center gap-1 text-xs text-gray-400 underline-offset-2 hover:text-gray-200 hover:underline"
          >
            <X className="h-3 w-3" />
            {t('stopTranslating')}
          </button>
        </>
      ) : expanded ? (
        <LocalePicker
          value={suggested}
          onValueChange={translateTo}
          size="sm"
          align="end"
          placeholder={t('translatePage')}
          ariaLabel={t('translatePage')}
        />
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={t('translatePageHint')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-cyan-500/40 hover:text-white"
        >
          <Globe className="h-3.5 w-3.5" />
          {t('translatePage')}
        </button>
      )}

      <GoogleTranslate />
    </div>
  )
}
