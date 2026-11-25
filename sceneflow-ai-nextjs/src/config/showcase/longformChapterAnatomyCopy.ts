import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import type { LongformChapterAnatomyLocaleCopy } from './longformChapterAnatomyTypes'
import { CHAPTER_ANATOMY_EN } from './anatomyLocales/en'
import { CHAPTER_ANATOMY_ES } from './anatomyLocales/es'
import { CHAPTER_ANATOMY_PT } from './anatomyLocales/pt'
import { CHAPTER_ANATOMY_HI } from './anatomyLocales/hi'
import { CHAPTER_ANATOMY_ZH_CN } from './anatomyLocales/zhCN'
import { CHAPTER_ANATOMY_AR } from './anatomyLocales/ar'
import { CHAPTER_ANATOMY_TH } from './anatomyLocales/th'
import { CHAPTER_ANATOMY_JA } from './anatomyLocales/ja'
import { CHAPTER_ANATOMY_KO } from './anatomyLocales/ko'
import { CHAPTER_ANATOMY_DE } from './anatomyLocales/de'
import { CHAPTER_ANATOMY_FR } from './anatomyLocales/fr'
import { CHAPTER_ANATOMY_IT } from './anatomyLocales/it'
import { CHAPTER_ANATOMY_NL } from './anatomyLocales/nl'
import { CHAPTER_ANATOMY_RU } from './anatomyLocales/ru'

export * from './longformChapterAnatomyTypes'

export const LONGFORM_CHAPTER_ANATOMY_COPY: Record<
  ClientPortalLocale,
  LongformChapterAnatomyLocaleCopy
> = {
  en: CHAPTER_ANATOMY_EN,
  es: CHAPTER_ANATOMY_ES,
  pt: CHAPTER_ANATOMY_PT,
  hi: CHAPTER_ANATOMY_HI,
  'zh-CN': CHAPTER_ANATOMY_ZH_CN,
  ar: CHAPTER_ANATOMY_AR,
  th: CHAPTER_ANATOMY_TH,
  ja: CHAPTER_ANATOMY_JA,
  ko: CHAPTER_ANATOMY_KO,
  de: CHAPTER_ANATOMY_DE,
  fr: CHAPTER_ANATOMY_FR,
  it: CHAPTER_ANATOMY_IT,
  nl: CHAPTER_ANATOMY_NL,
  ru: CHAPTER_ANATOMY_RU,
}
