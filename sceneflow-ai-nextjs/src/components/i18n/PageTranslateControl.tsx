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
import { DEFAULT_LOCALE, getLocaleNativeName } from '@/i18n/locale'
import { readUiLocaleCookie } from '@/i18n/useUiLocale'

const ACTIVE_COOKIE = 'sf-gt-active'

function clearStoredTranslation(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${ACTIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  document.cookie = 'googtrans=; path=/; max-age=0'
  document.cookie = `googtrans=; domain=${window.location.hostname}; path=/; max-age=0`
}

function holdDocumentUntranslated(): void {
  document.documentElement.setAttribute('translate', 'no')
}

function releaseDocumentForTranslation(): void {
  document.documentElement.removeAttribute('translate')
}

/**
 * Opt-in browser translation for read-mostly surfaces.
 *
 * The Google script stays unloaded until the viewer picks a language. A stored
 * `googtrans` cookie or the marketing locale must not start a translation on
 * its own. Never rendered on a studio route — see `src/config/i18n/gtSurfaces.ts`.
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
  }, [])

  useEffect(() => {
    if (!permitted) return
    // A previous visit must not turn translation back on.
    clearStoredTranslation()
    holdDocumentUntranslated()
  }, [permitted])

  // Re-apply after client navigation: the widget does not observe route changes.
  useEffect(() => {
    if (!active || !permitted) return
    releaseDocumentForTranslation()
    const timer = window.setTimeout(() => applyGoogleTranslateLanguage(active), 600)
    return () => window.clearTimeout(timer)
  }, [active, permitted, pathname])

  const translateTo = useCallback((locale: string) => {
    releaseDocumentForTranslation()
    setActive(locale)
    applyGoogleTranslateLanguage(locale)
    setExpanded(false)
  }, [])

  const revert = useCallback(() => {
    setActive(null)
    clearStoredTranslation()
    holdDocumentUntranslated()
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

      {active ? <GoogleTranslate /> : null}
    </div>
  )
}
