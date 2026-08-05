'use client'

import { useEffect, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import enCommon from '../../../messages/app/en/common.json'
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locale'
import { mergeMessages } from '@/i18n/mergeMessages'

const LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {}

/**
 * Provider for chrome that renders in the root layout, above every route group.
 *
 * The root layout deliberately does not read cookies — that would opt the static
 * marketing and legal pages into dynamic rendering — so it cannot resolve the
 * locale server-side. This reads the locale from `<html lang>`, which
 * `DocumentLocaleScript` sets before first paint, and loads the localized
 * `common` catalog after mount.
 *
 * The trade is a brief English render of the header on a non-English first load.
 * That is acceptable here because the header is mostly icons and because the
 * alternative costs every marketing page its static render. Route-group chrome
 * uses {@link AppMessagesProvider} and is correct on the server.
 */
export function ClientAppMessagesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>(DEFAULT_LOCALE)
  const [messages, setMessages] = useState<Record<string, unknown>>({
    common: enCommon as Record<string, unknown>,
  })

  useEffect(() => {
    const documentLocale = document.documentElement.lang
    if (!isLocale(documentLocale) || documentLocale === DEFAULT_LOCALE) return

    let cancelled = false
    ;(async () => {
      try {
        const loaded = await import(`../../../messages/app/${documentLocale}/common.json`)
        if (cancelled) return
        setLocale(documentLocale)
        setMessages({
          common: mergeMessages(
            enCommon as Record<string, unknown>,
            loaded.default as Record<string, unknown>
          ),
        })
      } catch {
        // Not translated yet; English is the correct fallback.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )
}
