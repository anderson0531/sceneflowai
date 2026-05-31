import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import LandingPageClient from '../LandingPageClient'
import SharedStoryboardSlugPage from './SharedStoryboardSlugPage'
import { generateLandingMetadata } from '@/i18n/landingMetadata'
import { getLandingLocaleDirection, isLandingLocale } from '@/i18n/locale'

type SlugPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params
  if (isLandingLocale(slug)) {
    return generateLandingMetadata(slug)
  }
  return {}
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params

  if (isLandingLocale(slug)) {
    return <LocalizedLandingPage locale={slug} />
  }

  return <SharedStoryboardSlugPage slug={slug} />
}

async function LocalizedLandingPage({ locale }: { locale: string }) {
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
