import React from 'react'
import type { Metadata } from 'next'
import { KeepsakeCinemaStorefront } from '@/components/showcase/KeepsakeCinemaStorefront'
import { resolveClientPortalLocale } from '@/lib/intake/clientPortalCopy'

export const metadata: Metadata = {
  title: 'Keepsake Cinema — Same-Day 4K Milestone & Life Films',
  description:
    'Turn treasured photos and spoken memories into a director-crafted, longform 4K Cinema Feature Film with a 1–3 min theatrical trailer—accelerated by SceneFlow Studio for same-day delivery in 70+ languages.',
}

type ShowcasePageProps = {
  searchParams?: Promise<{ lang?: string | string[] }>
}

export default async function ShowcaseStorefrontPage({ searchParams }: ShowcasePageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const rawLang = Array.isArray(resolvedParams?.lang)
    ? resolvedParams?.lang[0]
    : resolvedParams?.lang
  const initialLocale = rawLang ? resolveClientPortalLocale(rawLang) : 'en'

  return (
    <KeepsakeCinemaStorefront
      initialLocale={initialLocale}
      hasExplicitLocaleParam={Boolean(rawLang)}
    />
  )
}
