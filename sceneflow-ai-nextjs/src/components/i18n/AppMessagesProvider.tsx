import { NextIntlClientProvider } from 'next-intl'
import { getAppMessages } from '@/i18n/appMessages'
import { resolveUiLocale } from '@/i18n/serverLocale'
import type { AppSurface } from '@/i18n/appSurfaces'

/**
 * Server component that loads the chrome catalog for a route group and provides
 * it to the subtree.
 *
 * One of these sits at each route-group layout. A nested provider replaces the
 * context for its subtree, so every instance receives `common` plus its own
 * surfaces rather than inheriting from an outer one — which is why
 * `getAppMessages` always includes the base surface.
 *
 * Several existing layouts (`studio`, `settings`) are client components and
 * cannot load messages themselves, so they are wrapped by this instead of being
 * converted.
 */
export async function AppMessagesProvider({
  surfaces,
  children,
}: {
  surfaces: readonly AppSurface[]
  children: React.ReactNode
}) {
  const locale = await resolveUiLocale()
  const messages = await getAppMessages(locale, surfaces)

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      // Server and client can disagree on the clock by enough to trip
      // relative-time formatting; pin it to the server render.
      now={new Date()}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  )
}
