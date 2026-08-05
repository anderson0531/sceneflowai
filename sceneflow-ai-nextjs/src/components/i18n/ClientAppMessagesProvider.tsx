'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import enCommon from '../../../messages/app/en/common.json'
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locale'
import { getAppMessages } from '@/i18n/appMessages'
import { surfacesForPath } from '@/i18n/appSurfaces'

/**
 * Provider for chrome that renders in the root layout, above every route group.
 *
 * The root layout deliberately does not read cookies — that would opt the static
 * marketing and legal pages into dynamic rendering — so it cannot resolve the
 * locale server-side. This reads the locale from `<html lang>`, which
 * `DocumentLocaleScript` sets before first paint, and loads catalogs after mount.
 *
 * Path-scoped surfaces matter because the unified sidebar (Guide, etc.) lives
 * *outside* the studio/settings route-group providers. Without merging
 * `blueprint` on `/dashboard/studio`, Guide calls to
 * `useTranslations('blueprint.workflowGuide')` miss and next-intl renders the
 * raw key path.
 *
 * The trade is a brief English render of the header on a non-English first load.
 * That is acceptable here because the header is mostly icons and because the
 * alternative costs every marketing page its static render. Route-group chrome
 * uses {@link AppMessagesProvider} and is correct on the server for page content.
 */
export function ClientAppMessagesProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/'
  const [locale, setLocale] = useState<string>(DEFAULT_LOCALE)
  const [messages, setMessages] = useState<Record<string, unknown>>({
    common: enCommon as Record<string, unknown>,
  })

  useEffect(() => {
    const documentLocale = document.documentElement.lang
    const resolved = isLocale(documentLocale) ? documentLocale : DEFAULT_LOCALE
    const surfaces = surfacesForPath(pathname)

    let cancelled = false
    ;(async () => {
      try {
        const loaded = await getAppMessages(resolved, surfaces)
        if (cancelled) return
        setLocale(resolved)
        setMessages(loaded)
      } catch {
        // English common already seeded; leave it in place.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pathname])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )
}
