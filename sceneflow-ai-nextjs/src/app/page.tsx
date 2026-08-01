import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { cookies } from 'next/headers'
import LandingPageClient from './LandingPageClient'
import {
  DEFAULT_LANDING_LOCALE,
  getLandingLocaleDirection,
  isLandingLocale,
} from '@/i18n/locale'
import { generateLandingMetadata } from '@/i18n/landingMetadata'

export async function generateMetadata() {
  const locale = await resolveLandingLocale()
  return generateLandingMetadata(locale)
}

async function resolveLandingLocale(): Promise<string> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get('sf-landing-locale')?.value
  if (fromCookie && isLandingLocale(fromCookie)) return fromCookie
  return DEFAULT_LANDING_LOCALE
}

export default async function LandingPage() {
  const locale = await resolveLandingLocale()
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
