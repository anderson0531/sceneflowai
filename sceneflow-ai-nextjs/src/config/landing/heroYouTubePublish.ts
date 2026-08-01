/**
 * Localized YouTube publish metadata for landing hero commercial dubs.
 * Used by scripts/publish-hero-videos-youtube.mjs and upload tooling.
 */

import en from '../../../messages/en.json'
import es from '../../../messages/es.json'
import pt from '../../../messages/pt.json'
import hi from '../../../messages/hi.json'
import zh from '../../../messages/zh-CN.json'
import ar from '../../../messages/ar.json'
import th from '../../../messages/th.json'
import { appendSceneFlowCta } from '@/lib/premiere/distributionMetadata'
import {
  HERO_VIDEO_BLOB_PATHS,
  HERO_VIDEO_LOCALES,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'

export const HERO_YOUTUBE_BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

export const HERO_YOUTUBE_CHANNEL_HANDLE = 'sceneflowaistudio'
export const HERO_YOUTUBE_CHANNEL_ID = 'UCSXGf2gMfCRtktBCrFBDc0g'
export const HERO_YOUTUBE_CATEGORY_ID = '28' // Science & Technology

const MESSAGE_LOCALES: Record<HeroVideoLocaleId, { headline: string; subheadline: string }> = {
  en: { headline: en.hero.headline, subheadline: en.hero.subheadline },
  es: { headline: es.hero.headline, subheadline: es.hero.subheadline },
  pt: { headline: pt.hero.headline, subheadline: pt.hero.subheadline },
  hi: { headline: hi.hero.headline, subheadline: hi.hero.subheadline },
  zh: { headline: zh.hero.headline, subheadline: zh.hero.subheadline },
  ar: { headline: ar.hero.headline, subheadline: ar.hero.subheadline },
  th: { headline: th.hero.headline, subheadline: th.hero.subheadline },
}

const BASE_TAGS = ['SceneFlow', 'SceneFlow AI', 'AI video', 'video production', 'video studio']

const LOCALE_TAGS: Record<HeroVideoLocaleId, string[]> = {
  en: ['English'],
  es: ['Spanish', 'Español'],
  pt: ['Portuguese', 'Português'],
  hi: ['Hindi', 'हिन्दी'],
  zh: ['Chinese', '中文'],
  ar: ['Arabic', 'العربية'],
  th: ['Thai', 'ไทย'],
}

const HASHTAGS: Record<HeroVideoLocaleId, string> = {
  en: '#SceneFlow #AIVideo #VideoProduction #English',
  es: '#SceneFlow #AIVideo #VideoProduction #Español',
  pt: '#SceneFlow #AIVideo #VideoProduction #Português',
  hi: '#SceneFlow #AIVideo #VideoProduction #Hindi',
  zh: '#SceneFlow #AIVideo #VideoProduction #中文',
  ar: '#SceneFlow #AIVideo #VideoProduction #العربية',
  th: '#SceneFlow #AIVideo #VideoProduction #ไทย',
}

export type HeroYouTubePublishBundle = {
  locale: HeroVideoLocaleId
  title: string
  description: string
  tags: string[]
  videoUrl: string
  thumbnailUrl: string
  language: HeroVideoLocaleId
  categoryId: string
}

function heroPosterUrl(locale: HeroVideoLocaleId): string {
  return `${HERO_YOUTUBE_BLOB_HOST}/landing/hero/sceneflow-hero-${locale}-poster.jpg`
}

function heroVideoUploadUrl(locale: HeroVideoLocaleId): string {
  return `${HERO_YOUTUBE_BLOB_HOST}/${encodeURI(HERO_VIDEO_BLOB_PATHS[locale])}`
}

/** YouTube title max length */
export function truncateYouTubeTitle(title: string, max = 100): string {
  const trimmed = title.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export function buildHeroYouTubeTitle(locale: HeroVideoLocaleId): string {
  const { headline } = MESSAGE_LOCALES[locale]
  return truncateYouTubeTitle(`SceneFlow AI Studio — ${headline}`)
}

export function buildHeroYouTubeDescription(locale: HeroVideoLocaleId): string {
  const { subheadline } = MESSAGE_LOCALES[locale]
  const body = [
    subheadline.trim(),
    '',
    '🔗 Start your production: https://sceneflow.ai',
    `📺 Subscribe: https://www.youtube.com/@${HERO_YOUTUBE_CHANNEL_HANDLE}`,
    '',
    HASHTAGS[locale],
  ].join('\n')

  return appendSceneFlowCta(body, locale)
}

export function getHeroYouTubePublishBundle(locale: HeroVideoLocaleId): HeroYouTubePublishBundle {
  return {
    locale,
    title: buildHeroYouTubeTitle(locale),
    description: buildHeroYouTubeDescription(locale),
    tags: [...BASE_TAGS, ...LOCALE_TAGS[locale]],
    videoUrl: heroVideoUploadUrl(locale),
    thumbnailUrl: heroPosterUrl(locale),
    language: locale,
    categoryId: HERO_YOUTUBE_CATEGORY_ID,
  }
}

export const HERO_YOUTUBE_PUBLISH_BUNDLES: HeroYouTubePublishBundle[] = HERO_VIDEO_LOCALES.filter(
  (entry) => entry.available
).map((entry) => getHeroYouTubePublishBundle(entry.id))

export function getHeroYouTubePublishBundleByLocale(
  locale: HeroVideoLocaleId
): HeroYouTubePublishBundle | undefined {
  return HERO_YOUTUBE_PUBLISH_BUNDLES.find((bundle) => bundle.locale === locale)
}
