import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LANDING_LOCALES, getLandingLocaleDirection, isLandingLocale } from '@/i18n/locale'

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^\/+/, '')}`
  return 'https://sceneflowai.com'
}

const SITE_URL = resolveSiteUrl()

export async function generateLandingMetadata(locale: string): Promise<Metadata> {
  if (!isLandingLocale(locale)) return {}

  const t = await getTranslations({ locale, namespace: 'metadata' })
  const title = t('title')
  const description = t('description')
  const localePath = locale === 'en' ? '' : `/${locale}`
  const canonical = `${SITE_URL}${localePath}`

  const languages: Record<string, string> = {}
  for (const code of LANDING_LOCALES) {
    const path = code === 'en' ? '' : `/${code}`
    languages[code] = `${SITE_URL}${path}`
  }

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      locale: locale.replace('-', '_'),
    },
    other: {
      'content-language': locale,
      direction: getLandingLocaleDirection(locale),
    },
  }
}
