import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import type { RealEstateAnatomyLocaleCopy } from './realEstateAnatomyTypes'
import { REAL_ESTATE_ANATOMY_EN } from './realEstateAnatomyLocales/en'
import { REAL_ESTATE_ANATOMY_ES } from './realEstateAnatomyLocales/es'
import { REAL_ESTATE_ANATOMY_PT } from './realEstateAnatomyLocales/pt'
import { REAL_ESTATE_ANATOMY_HI } from './realEstateAnatomyLocales/hi'
import { REAL_ESTATE_ANATOMY_ZH_CN } from './realEstateAnatomyLocales/zhCN'
import { REAL_ESTATE_ANATOMY_AR } from './realEstateAnatomyLocales/ar'
import { REAL_ESTATE_ANATOMY_TH } from './realEstateAnatomyLocales/th'
import { REAL_ESTATE_ANATOMY_JA } from './realEstateAnatomyLocales/ja'
import { REAL_ESTATE_ANATOMY_KO } from './realEstateAnatomyLocales/ko'
import { REAL_ESTATE_ANATOMY_DE } from './realEstateAnatomyLocales/de'
import { REAL_ESTATE_ANATOMY_FR } from './realEstateAnatomyLocales/fr'
import { REAL_ESTATE_ANATOMY_IT } from './realEstateAnatomyLocales/it'
import { REAL_ESTATE_ANATOMY_NL } from './realEstateAnatomyLocales/nl'
import { REAL_ESTATE_ANATOMY_RU } from './realEstateAnatomyLocales/ru'

export * from './realEstateAnatomyTypes'

export const REAL_ESTATE_ANATOMY_COPY: Record<
  ClientPortalLocale,
  RealEstateAnatomyLocaleCopy
> = {
  en: REAL_ESTATE_ANATOMY_EN,
  es: REAL_ESTATE_ANATOMY_ES,
  pt: REAL_ESTATE_ANATOMY_PT,
  hi: REAL_ESTATE_ANATOMY_HI,
  'zh-CN': REAL_ESTATE_ANATOMY_ZH_CN,
  ar: REAL_ESTATE_ANATOMY_AR,
  th: REAL_ESTATE_ANATOMY_TH,
  ja: REAL_ESTATE_ANATOMY_JA,
  ko: REAL_ESTATE_ANATOMY_KO,
  de: REAL_ESTATE_ANATOMY_DE,
  fr: REAL_ESTATE_ANATOMY_FR,
  it: REAL_ESTATE_ANATOMY_IT,
  nl: REAL_ESTATE_ANATOMY_NL,
  ru: REAL_ESTATE_ANATOMY_RU,
}
