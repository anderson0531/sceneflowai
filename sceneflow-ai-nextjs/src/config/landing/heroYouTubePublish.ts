/**
 * Localized YouTube publish metadata for landing hero commercial dubs.
 * Descriptions are built from landing page copy (hero, pipeline, value props, CTAs).
 */

import en from '../../../messages/en.json'
import es from '../../../messages/es.json'
import zh from '../../../messages/zh-CN.json'
import ar from '../../../messages/ar.json'
import { appendSceneFlowCta } from '@/lib/premiere/distributionMetadata'
import { interpolateDestinations } from '@/lib/network/destinations'
import {
  HERO_VIDEO_BLOB_PATHS,
  HERO_VIDEO_LOCALES,
  getHeroVideoPosterUrl,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'

export const HERO_YOUTUBE_BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'
export const HERO_YOUTUBE_SITE_URL = 'https://sceneflowai.studio'

export const HERO_YOUTUBE_CHANNEL_HANDLE = 'sceneflowaistudio'
export const HERO_YOUTUBE_CHANNEL_ID = 'UCSXGf2gMfCRtktBCrFBDc0g'
export const HERO_YOUTUBE_CATEGORY_ID = '28' // Science & Technology

type ValuePill = { label: string; detail: string }

type MessagesFile = {
  hero: {
    headline: string
    subheadline: string
    multilangHint: string
    ctaPrimaryLaunch: string
    ctaSupportingLine: string
  }
  pipeline?: { subtitle: string }
  valueProp: { pills: ValuePill[] }
}

type LandingYouTubeCopy = {
  headline: string
  subheadline: string
  multilangHint: string
  ctaPrimary: string
  ctaSupporting: string
  pipelineSubtitle: string
  valuePills: ValuePill[]
  sections: {
    whatIs: string
    whySwitch: string
    startProduction: string
    moreOnChannel: string
  }
}

function pipelineSubtitle(messages: MessagesFile): string {
  return messages.pipeline?.subtitle ?? en.pipeline.subtitle
}

function landingFromMessages(
  messages: MessagesFile,
  locale: HeroVideoLocaleId,
  sections: LandingYouTubeCopy['sections']
): LandingYouTubeCopy {
  return {
    headline: messages.hero.headline,
    subheadline: messages.hero.subheadline,
    multilangHint: messages.hero.multilangHint,
    ctaPrimary: messages.hero.ctaPrimaryLaunch,
    ctaSupporting: interpolateDestinations(
      messages.hero.ctaSupportingLine,
      locale === 'zh' ? 'zh-CN' : locale
    ),
    pipelineSubtitle: pipelineSubtitle(messages),
    valuePills: messages.valueProp.pills,
    sections,
  }
}

const LANDING_COPY: Record<HeroVideoLocaleId, LandingYouTubeCopy> = {
  en: landingFromMessages(en, 'en', {
    whatIs: 'WHAT IS SCENEFLOW?',
    whySwitch: 'WHY CREATORS SWITCH',
    startProduction: 'START YOUR PRODUCTION',
    moreOnChannel: 'More demos & example productions on our channel',
  }),
  es: landingFromMessages(es, 'es', {
    whatIs: '¿QUÉ ES SCENEFLOW?',
    whySwitch: 'POR QUÉ LOS CREADORES CAMBIAN',
    startProduction: 'INICIA TU PRODUCCIÓN',
    moreOnChannel: 'Más demos y producciones de ejemplo en nuestro canal',
  }),
  zh: landingFromMessages(zh, 'zh', {
    whatIs: '什么是 SCENEFLOW？',
    whySwitch: '创作者为何选择 SceneFlow',
    startProduction: '开始您的制作',
    moreOnChannel: '在我们的频道观看更多演示与示例作品',
  }),
  ar: landingFromMessages(ar, 'ar', {
    whatIs: 'ما هو SceneFlow؟',
    whySwitch: 'لماذا ينتقل المبدعون إلى SceneFlow',
    startProduction: 'ابدأ إنتاجك',
    moreOnChannel: 'المزيد من العروض التوضيحية والإنتاجات على قناتنا',
  }),
}

const BASE_TAGS = ['SceneFlow', 'SceneFlow Studio', 'AI video', 'video production', 'video studio']

const LOCALE_TAGS: Record<HeroVideoLocaleId, string[]> = {
  en: ['English'],
  es: ['Spanish', 'Español'],
  zh: ['Chinese', '中文'],
  ar: ['Arabic', 'العربية'],
}

const HASHTAGS: Record<HeroVideoLocaleId, string> = {
  en: '#SceneFlow #AIVideo #VideoProduction #YouTubeCreator #English',
  es: '#SceneFlow #AIVideo #VideoProduction #Creadores #Español',
  zh: '#SceneFlow #AIVideo #VideoProduction #中文 #创作者',
  ar: '#SceneFlow #AIVideo #VideoProduction #العربية #صناع_المحتوى',
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
  const poster = getHeroVideoPosterUrl(locale)
  if (poster.startsWith('/')) {
    return `${HERO_YOUTUBE_SITE_URL}${poster}`
  }
  return poster
}

export function getHeroYouTubeThumbnailPublicPath(locale: HeroVideoLocaleId): string {
  return `/landing/hero/sceneflow-hero-${locale}-poster.jpg`
}

function heroVideoUploadUrl(locale: HeroVideoLocaleId): string {
  return `${HERO_YOUTUBE_BLOB_HOST}/${encodeURI(HERO_VIDEO_BLOB_PATHS[locale])}`
}

export function truncateYouTubeTitle(title: string, max = 100): string {
  const trimmed = title.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export function buildHeroYouTubeTitle(locale: HeroVideoLocaleId): string {
  const { headline } = LANDING_COPY[locale]
  return truncateYouTubeTitle(`SceneFlow Studio — ${headline}`)
}

export function buildHeroYouTubeDescription(locale: HeroVideoLocaleId): string {
  const copy = LANDING_COPY[locale]
  const bullets = copy.valuePills.map((pill) => `• ${pill.label} — ${pill.detail}`).join('\n')

  const body = [
    copy.headline.trim(),
    '',
    copy.subheadline.trim(),
    '',
    `▶ ${copy.sections.whatIs}`,
    copy.pipelineSubtitle.trim(),
    '',
    `✅ ${copy.sections.whySwitch}`,
    bullets,
    '',
    copy.multilangHint.trim(),
    '',
    `🚀 ${copy.sections.startProduction}`,
    `→ ${HERO_YOUTUBE_SITE_URL}`,
    copy.ctaPrimary.trim(),
    copy.ctaSupporting.trim(),
    '',
    `📺 ${copy.sections.moreOnChannel}: https://www.youtube.com/@${HERO_YOUTUBE_CHANNEL_HANDLE}`,
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
