import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import LandingPageClient from './LandingPageClient'
import {
  DEFAULT_LANDING_LOCALE,
  LANDING_LOCALE_COOKIE,
  LANDING_LOCALE_EXPLICIT_COOKIE,
  getLandingLocaleDirection,
  getLandingLocalePath,
  isLandingLocale,
} from '@/i18n/locale'
import { generateLandingMetadata } from '@/i18n/landingMetadata'
import { resolveLandingLocaleFromHints } from '@/i18n/resolveLandingLocale'

export async function generateMetadata() {
  const locale = await resolveLandingLocale()
  return generateLandingMetadata(locale)
}

async function resolveLandingLocale(): Promise<string> {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const rawCookie = cookieStore.get(LANDING_LOCALE_COOKIE)?.value
  const isExplicit = cookieStore.get(LANDING_LOCALE_EXPLICIT_COOKIE)?.value === '1'
  return resolveLandingLocaleFromHints({
    cookie: isExplicit ? rawCookie : undefined,
    acceptLanguage: headerStore.get('accept-language'),
  })
}

export default async function LandingPage() {
  const cookieStore = await cookies()
  const locale = await resolveLandingLocale()
  const cookie = cookieStore.get(LANDING_LOCALE_COOKIE)?.value
  const isExplicit = cookieStore.get(LANDING_LOCALE_EXPLICIT_COOKIE)?.value === '1'
  const hasStoredChoice = Boolean(isExplicit && cookie && isLandingLocale(cookie))

  if (!hasStoredChoice && locale !== DEFAULT_LANDING_LOCALE) {
    redirect(getLandingLocalePath(locale))
  }

  setRequestLocale(locale)
  const messages = await getMessages()
  const dir = getLandingLocaleDirection(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div lang={locale} dir={dir} className={dir === 'rtl' ? 'rtl' : undefined}>
        <LandingPageClient />
      </div>
    </NextIntlClientProvider>
  )
}
