#!/usr/bin/env npx tsx
/**
 * Generate high-CTR, minimalist Concept 2 ("The Continuous Timeline Vault")
 * 1280×720 YouTube thumbnails across all 7 languages — including both:
 *   1. Localized two-tone top headline (White metric + Vivid Yellow payoff)
 *   2. Localized embossed brushed-steel center lock plaque ("Continuity Vault" translated
 *      natively in ES, PT, HI, ZH, AR, TH while preserving the real 3D outer bezel & 4 bolts).
 *
 * Usage:
 *   npx tsx scripts/generate-social-promo-thumbnails.ts --spot svc-01
 *   npx tsx scripts/generate-social-promo-thumbnails.ts --out-dir tmp/youtube-thumbnails/concept-2
 */

import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import {
  SOCIAL_PROMO_LOCALES,
  type SocialPromoLocale,
  type SocialPromoSpotId,
} from './social-promo-sources/socialPromoScripts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

export const CONCEPT_2_VAULT_ARTWORK = join(
  __dirname,
  'social-promo-sources',
  'assets',
  'concept-2-continuity-vault.png'
)

export const SVC_02_PORTAL_ARTWORK = join(
  __dirname,
  'social-promo-sources',
  'assets',
  'svc-02-white-label-portal.jpg'
)

export const SVC_03_SCALE_ARTWORK = join(
  __dirname,
  'social-promo-sources',
  'assets',
  'svc-03-agency-scale.jpg'
)

export const CRT_01_MEMOIR_ARTWORK = join(
  __dirname,
  'social-promo-sources',
  'assets',
  'crt-01-memoir-studio.jpg'
)

export const CRT_02_LAPTOP_ARTWORK = join(
  __dirname,
  'social-promo-sources',
  'assets',
  'crt-02-laptop-income-studio.jpg'
)

export const CRT_03_GLOBAL_ARTWORK = join(
  __dirname,
  'social-promo-sources',
  'assets',
  'crt-03-global-channels.jpg'
)

export interface VaultHeadlineSpec {
  whitePart: string
  yellowPart: string
  fontFamily: string
  fontSize: number
  letterSpacing?: number
  rtl?: boolean
  rtlTokens?: { white: string[]; yellow: string[] }
  rtlCustom?: Array<{ x: number; text: string; color: '#ffffff' | '#ffde00' }>
  useOriginalEnglishArt?: boolean
  vaultPlateLine1?: string
  vaultPlateLine2?: string
  vaultPlateSize1?: number
  vaultPlateSize2?: number
}

export const VAULT_LOCALIZED_HEADLINES: Record<SocialPromoLocale, VaultHeadlineSpec> = {
  en: {
    whitePart: '300 MIN',
    yellowPart: 'AUTOMATED 4K',
    fontFamily: 'DIN Condensed, Impact, Arial Narrow, sans-serif',
    fontSize: 112,
    letterSpacing: 1,
    useOriginalEnglishArt: true,
    vaultPlateLine1: 'CONTINUITY',
    vaultPlateLine2: 'VAULT',
    vaultPlateSize1: 36,
    vaultPlateSize2: 46,
  },
  es: {
    whitePart: '300 MIN',
    yellowPart: '4K AUTOMÁTICO',
    fontFamily: 'Impact, Arial Narrow, sans-serif',
    fontSize: 96,
    letterSpacing: 1.5,
    vaultPlateLine1: 'BÓVEDA DE',
    vaultPlateLine2: 'CONTINUIDAD',
    vaultPlateSize1: 30,
    vaultPlateSize2: 31,
  },
  pt: {
    whitePart: '300 MIN',
    yellowPart: '4K AUTOMÁTICO',
    fontFamily: 'Impact, Arial Narrow, sans-serif',
    fontSize: 96,
    letterSpacing: 1.5,
    vaultPlateLine1: 'COFRE DE',
    vaultPlateLine2: 'CONTINUIDADE',
    vaultPlateSize1: 31,
    vaultPlateSize2: 29,
  },
  hi: {
    whitePart: '300 मिनट',
    yellowPart: 'ऑटोमेटेड 4K',
    fontFamily: 'Kohinoor Devanagari, Noto Sans Devanagari, sans-serif',
    fontSize: 80,
    letterSpacing: 0,
    vaultPlateLine1: 'कंटिन्यूटी',
    vaultPlateLine2: 'वॉल्ट',
    vaultPlateSize1: 38,
    vaultPlateSize2: 42,
  },
  zh: {
    whitePart: '300分钟',
    yellowPart: '全自动 4K',
    fontFamily: 'PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif',
    fontSize: 88,
    letterSpacing: 2,
    vaultPlateLine1: '连续性',
    vaultPlateLine2: '资产库',
    vaultPlateSize1: 42,
    vaultPlateSize2: 42,
  },
  ar: {
    whitePart: '300 دقيقة',
    yellowPart: '4K تلقائي',
    fontFamily: 'Geeza Pro, Arial, Noto Sans Arabic, sans-serif',
    fontSize: 80,
    letterSpacing: 0,
    rtl: true,
    vaultPlateLine1: 'خزنة',
    vaultPlateLine2: 'الاستمرارية',
    vaultPlateSize1: 38,
    vaultPlateSize2: 36,
  },
  th: {
    whitePart: '300 นาที',
    yellowPart: '4K อัตโนมัติ',
    fontFamily: 'Thonburi, Sukhumvit Set, Noto Sans Thai, sans-serif',
    fontSize: 82,
    letterSpacing: 0,
    vaultPlateLine1: 'คลังล็อก',
    vaultPlateLine2: 'ความต่อเนื่อง',
    vaultPlateSize1: 36,
    vaultPlateSize2: 32,
  },
}

export const SPOT_THUMBNAIL_TEMPLATES: Partial<
  Record<
    SocialPromoSpotId,
    {
      artworkPath: string
      maskTopSky: boolean
      headlines: Record<SocialPromoLocale, VaultHeadlineSpec>
    }
  >
> = {
  'svc-01': {
    artworkPath: CONCEPT_2_VAULT_ARTWORK,
    maskTopSky: true,
    headlines: VAULT_LOCALIZED_HEADLINES,
  },
  'svc-02': {
    artworkPath: SVC_02_PORTAL_ARTWORK,
    maskTopSky: false, // Base artwork is completely text-free!
    headlines: {
      en: {
        whitePart: 'ZERO LOGIN',
        yellowPart: '100% YOUR BRAND',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 90,
        letterSpacing: 1.5,
      },
      es: {
        whitePart: 'SIN LOGIN',
        yellowPart: '100% TU MARCA',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 92,
        letterSpacing: 1.5,
      },
      pt: {
        whitePart: 'SEM LOGIN',
        yellowPart: '100% SUA MARCA',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 90,
        letterSpacing: 1.5,
      },
      hi: {
        whitePart: 'ज़ीरो लॉगिन',
        yellowPart: '100% आपका ब्रांड',
        fontFamily: 'Kohinoor Devanagari, Noto Sans Devanagari, sans-serif',
        fontSize: 74,
        letterSpacing: 0,
      },
      zh: {
        whitePart: '免登录审片',
        yellowPart: '100% 专属白标',
        fontFamily: 'PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif',
        fontSize: 82,
        letterSpacing: 2,
      },
      ar: {
        whitePart: 'دون تسجيل',
        yellowPart: 'علامتك 100%',
        fontFamily: 'Geeza Pro, Arial, Noto Sans Arabic, sans-serif',
        fontSize: 78,
        letterSpacing: 0,
        rtl: true,
        rtlTokens: { white: ['دون تسجيل'], yellow: ['علامتك', '100%'] },
      },
      th: {
        whitePart: 'ไม่ต้องล็อกอิน',
        yellowPart: 'แบรนด์คุณ 100%',
        fontFamily: 'Thonburi, Sukhumvit Set, Noto Sans Thai, sans-serif',
        fontSize: 76,
        letterSpacing: 0,
      },
    },
  },
  'svc-03': {
    artworkPath: SVC_03_SCALE_ARTWORK,
    maskTopSky: false,
    headlines: {
      en: {
        whitePart: '100+ CLIENTS',
        yellowPart: 'AUTO-SCALED 4K',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 88,
        letterSpacing: 1.5,
      },
      es: {
        whitePart: '100+ CLIENTES',
        yellowPart: 'ESCALA 4K AUTO',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 88,
        letterSpacing: 1.5,
      },
      pt: {
        whitePart: '100+ CLIENTES',
        yellowPart: 'ESCALA 4K AUTO',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 88,
        letterSpacing: 1.5,
      },
      hi: {
        whitePart: '100+ प्रोजेक्ट्स',
        yellowPart: 'ऑटो-स्केल 4K',
        fontFamily: 'Kohinoor Devanagari, Noto Sans Devanagari, sans-serif',
        fontSize: 76,
        letterSpacing: 0,
      },
      zh: {
        whitePart: '100+ 项目',
        yellowPart: '机构全自动 4K',
        fontFamily: 'PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif',
        fontSize: 84,
        letterSpacing: 2,
      },
      ar: {
        whitePart: '100+ مشروع',
        yellowPart: 'توسّع آلي 4K',
        fontFamily: 'Geeza Pro, Arial, Noto Sans Arabic, sans-serif',
        fontSize: 76,
        letterSpacing: 0,
        rtl: true,
        rtlTokens: { white: ['100+', 'مشروع'], yellow: ['توسّع آلي', '4K'] },
      },
      th: {
        whitePart: '100+ โปรเจกต์',
        yellowPart: 'ขยายงาน 4K อัตโนมัติ',
        fontFamily: 'Thonburi, Sukhumvit Set, Noto Sans Thai, sans-serif',
        fontSize: 70,
        letterSpacing: 0,
      },
    },
  },
  'crt-01': {
    artworkPath: CRT_01_MEMOIR_ARTWORK,
    maskTopSky: false,
    headlines: {
      en: {
        whitePart: '90% MARGIN',
        yellowPart: 'MEMOIR STUDIO',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 92,
        letterSpacing: 1.5,
      },
      es: {
        whitePart: '90% MARGEN',
        yellowPart: 'VIDEO MEMORIAS',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 88,
        letterSpacing: 1.5,
      },
      pt: {
        whitePart: '90% MARGEM',
        yellowPart: 'FILMES MEMÓRIA',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 88,
        letterSpacing: 1.5,
      },
      hi: {
        whitePart: '90% मार्जिन',
        yellowPart: 'मेमॉयर स्टूडियो',
        fontFamily: 'Kohinoor Devanagari, Noto Sans Devanagari, sans-serif',
        fontSize: 80,
        letterSpacing: 0,
      },
      zh: {
        whitePart: '90% 净利',
        yellowPart: '传记影视创业',
        fontFamily: 'PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif',
        fontSize: 86,
        letterSpacing: 2,
      },
      ar: {
        whitePart: '90% أرباح',
        yellowPart: 'استوديو السيرة',
        fontFamily: 'Geeza Pro, Arial, Noto Sans Arabic, sans-serif',
        fontSize: 78,
        letterSpacing: 0,
        rtl: true,
        rtlTokens: { white: ['90%', 'أرباح'], yellow: ['استوديو السيرة'] },
      },
      th: {
        whitePart: 'กำไร 90%',
        yellowPart: 'สตูดิโอชีวประวัติ',
        fontFamily: 'Thonburi, Sukhumvit Set, Noto Sans Thai, sans-serif',
        fontSize: 78,
        letterSpacing: 0,
      },
    },
  },
  'crt-02': {
    artworkPath: CRT_02_LAPTOP_ARTWORK,
    maskTopSky: false,
    headlines: {
      en: {
        whitePart: 'ZERO GEAR',
        yellowPart: '4K INCOME STUDIO',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 88,
        letterSpacing: 1.5,
      },
      es: {
        whitePart: 'SIN EQUIPO',
        yellowPart: 'INGRESOS EN 4K',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 90,
        letterSpacing: 1.5,
      },
      pt: {
        whitePart: 'SEM CÂMERA',
        yellowPart: 'RENDA EM 4K',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 92,
        letterSpacing: 1.5,
      },
      hi: {
        whitePart: 'ज़ीरो गियर',
        yellowPart: '4K इनकम स्टूडियो',
        fontFamily: 'Kohinoor Devanagari, Noto Sans Devanagari, sans-serif',
        fontSize: 78,
        letterSpacing: 0,
      },
      zh: {
        whitePart: '零器材接单',
        yellowPart: '4K 商业创收',
        fontFamily: 'PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif',
        fontSize: 86,
        letterSpacing: 2,
      },
      ar: {
        whitePart: 'دون معدات',
        yellowPart: 'دخل 4K شهري',
        fontFamily: 'Geeza Pro, Arial, Noto Sans Arabic, sans-serif',
        fontSize: 78,
        letterSpacing: 0,
        rtl: true,
        rtlCustom: [
          { x: 1090, text: 'دون معدات', color: '#ffffff' },
          { x: 675, text: 'دخل شهري', color: '#ffde00' },
          { x: 270, text: '4K', color: '#ffde00' },
        ],
      },
      th: {
        whitePart: 'ไม่ต้องมีกล้อง',
        yellowPart: 'สร้างรายได้ 4K',
        fontFamily: 'Thonburi, Sukhumvit Set, Noto Sans Thai, sans-serif',
        fontSize: 78,
        letterSpacing: 0,
      },
    },
  },
  'crt-03': {
    artworkPath: CRT_03_GLOBAL_ARTWORK,
    maskTopSky: false,
    headlines: {
      en: {
        whitePart: '1 SERIES',
        yellowPart: '70+ LANGUAGES',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 94,
        letterSpacing: 1.5,
      },
      es: {
        whitePart: '1 SERIE',
        yellowPart: '70+ IDIOMAS',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 96,
        letterSpacing: 1.5,
      },
      pt: {
        whitePart: '1 SÉRIE',
        yellowPart: '70+ IDIOMAS',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: 96,
        letterSpacing: 1.5,
      },
      hi: {
        whitePart: '1 सीरीज़',
        yellowPart: '70+ भाषाएँ',
        fontFamily: 'Kohinoor Devanagari, Noto Sans Devanagari, sans-serif',
        fontSize: 88,
        letterSpacing: 0,
      },
      zh: {
        whitePart: '1 部剧集',
        yellowPart: '70+ 语种变现',
        fontFamily: 'PingFang SC, Hiragino Sans GB, Noto Sans SC, sans-serif',
        fontSize: 88,
        letterSpacing: 2,
      },
      ar: {
        whitePart: 'سلسلة واحدة',
        yellowPart: '70+ لغة عالمية',
        fontFamily: 'Geeza Pro, Arial, Noto Sans Arabic, sans-serif',
        fontSize: 76,
        letterSpacing: 0,
        rtl: true,
        rtlCustom: [
          { x: 1125, text: 'سلسلة واحدة', color: '#ffffff' },
          { x: 675, text: '70+', color: '#ffde00' },
          { x: 515, text: 'لغة عالمية', color: '#ffde00' },
        ],
      },
      th: {
        whitePart: '1 ซีรีส์',
        yellowPart: 'พากย์ 70+ ภาษา',
        fontFamily: 'Thonburi, Sukhumvit Set, Noto Sans Thai, sans-serif',
        fontSize: 84,
        letterSpacing: 0,
      },
    },
  },
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildVaultLocalizedOverlaySvg(spec: VaultHeadlineSpec, maskTopSky = true): string {
  const whiteText = escapeXml(spec.whitePart)
  const yellowText = escapeXml(spec.yellowPart)
  const hasPlate = Boolean(spec.vaultPlateLine1 && spec.vaultPlateLine2)
  const plate1 = escapeXml(spec.vaultPlateLine1 || '')
  const plate2 = escapeXml(spec.vaultPlateLine2 || '')
  const ls = spec.letterSpacing ?? 0

  let headlineMarkup: string
  if (spec.rtl && spec.rtlCustom) {
    headlineMarkup = spec.rtlCustom
      .map(
        (t) =>
          `<text x="${t.x}" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="${t.color}" filter="url(#headlineShadow)">${escapeXml(t.text)}</text>`
      )
      .join('\n')
  } else if (spec.rtl && spec.rtlTokens) {
    // Explicit RTL token positioning so Latin digits/4K never flip bidi order in librsvg
    const wTokens = spec.rtlTokens.white
    const yTokens = spec.rtlTokens.yellow
    const whiteMarkup =
      wTokens.length === 2
        ? `
      <text x="1115" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffffff" filter="url(#headlineShadow)">${escapeXml(wTokens[0]!)}</text>
      <text x="905" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffffff" filter="url(#headlineShadow)">${escapeXml(wTokens[1]!)}</text>`
        : `
      <text x="1080" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffffff" filter="url(#headlineShadow)">${escapeXml(wTokens.join(' '))}</text>`
    const yellowMarkup =
      yTokens.length === 2
        ? `
      <text x="640" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffde00" filter="url(#headlineShadow)">${escapeXml(yTokens[0]!)}</text>
      <text x="320" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffde00" filter="url(#headlineShadow)">${escapeXml(yTokens[1]!)}</text>`
        : `
      <text x="635" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffde00" filter="url(#headlineShadow)">${escapeXml(yTokens.join(' '))}</text>`
    headlineMarkup = `${whiteMarkup}\n${yellowMarkup}`
  } else if (spec.rtl) {
    headlineMarkup = `
      <text x="1030" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffffff" filter="url(#headlineShadow)">300</text>
      <text x="875" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffffff" filter="url(#headlineShadow)">دقيقة</text>
      <text x="640" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffde00" filter="url(#headlineShadow)">تلقائي</text>
      <text x="395" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffde00" filter="url(#headlineShadow)">4K</text>
    `
  } else {
    headlineMarkup = `
      <text x="640" y="118" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" letter-spacing="${ls}" fill="#ffffff" filter="url(#headlineShadow)">${whiteText} <tspan fill="#ffde00">${yellowText}</tspan></text>
    `
  }

  let brushLines = ''
  if (hasPlate) {
    for (let y = -52; y <= 52; y += 3) {
      const op = y % 6 === 0 ? '0.075' : '0.035'
      const col = y % 9 === 0 ? '#ffffff' : '#0b1016'
      brushLines += `<line x1="-112" y1="${y}" x2="112" y2="${y}" stroke="${col}" stroke-opacity="${op}" stroke-width="1"/>`
    }
  }

  const topMaskMarkup = maskTopSky
    ? `<rect x="0" y="0" width="1280" height="176" fill="url(#seamlessTopSky)"/>`
    : ''

  const plateMarkup = hasPlate
    ? `
  <g transform="translate(648, 376) rotate(-11.9)">
    <polygon points="-96,-54 96,-54 114,-36 114,36 96,54 -96,54 -114,36 -114,-36" fill="url(#steelPlateBg)" filter="url(#plateSoftEdge)"/>
    <g clip-path="url(#innerPlateClip)">
      <rect x="-116" y="-56" width="232" height="112" fill="url(#steelPlateBg)"/>
      <rect x="-116" y="-56" width="232" height="112" fill="url(#steelSpecular)"/>
      ${brushLines}
    </g>
    <text x="1" y="-8" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.vaultPlateSize1}" font-weight="900" letter-spacing="0.8" fill="#eef6fc" fill-opacity="0.55">${plate1}</text>
    <text x="1" y="34" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.vaultPlateSize2}" font-weight="900" letter-spacing="0.8" fill="#eef6fc" fill-opacity="0.55">${plate2}</text>
    <text x="0" y="-7" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.vaultPlateSize1}" font-weight="900" letter-spacing="0.8" fill="url(#embossMetalFill)" stroke="#1b2229" stroke-width="1.1" paint-order="stroke" filter="url(#metalEmbossShadow)">${plate1}</text>
    <text x="0" y="35" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.vaultPlateSize2}" font-weight="900" letter-spacing="0.8" fill="url(#embossMetalFill)" stroke="#1b2229" stroke-width="1.1" paint-order="stroke" filter="url(#metalEmbossShadow)">${plate2}</text>
  </g>`
    : ''

  return `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="seamlessTopSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070e18" stop-opacity="1"/>
      <stop offset="81%" stop-color="#0a1420" stop-opacity="1"/>
      <stop offset="91%" stop-color="#0c1724" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#0e1a28" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="steelPlateBg" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#2a3138"/>
      <stop offset="35%" stop-color="#424d57"/>
      <stop offset="72%" stop-color="#60717f"/>
      <stop offset="100%" stop-color="#768b9b"/>
    </linearGradient>
    <linearGradient id="steelSpecular" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c6d9e6" stop-opacity="0.22"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#080d12" stop-opacity="0.32"/>
    </linearGradient>
    <linearGradient id="embossMetalFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d5e4ee"/>
      <stop offset="46%" stop-color="#9aaab6"/>
      <stop offset="56%" stop-color="#7f8f9b"/>
      <stop offset="100%" stop-color="#b8c9d6"/>
    </linearGradient>
    <clipPath id="innerPlateClip">
      <polygon points="-96,-54 96,-54 114,-36 114,36 96,54 -96,54 -114,36 -114,-36"/>
    </clipPath>
    <filter id="headlineShadow" x="-10%" y="-15%" width="120%" height="145%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.85"/>
    </filter>
    <filter id="plateSoftEdge" x="-8%" y="-8%" width="116%" height="116%">
      <feGaussianBlur stdDeviation="1.4"/>
    </filter>
    <filter id="metalEmbossShadow" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="-2" dy="3.2" stdDeviation="1.6" flood-color="#090e13" flood-opacity="0.92"/>
    </filter>
  </defs>

  ${topMaskMarkup}
  ${headlineMarkup}
  ${plateMarkup}
</svg>`
}

export async function generateConcept2Thumbnails(args: {
  outDir: string
  spotId?: SocialPromoSpotId
  prefix?: string
  locales?: SocialPromoLocale[]
  artworkPath?: string
}) {
  const spotId = args.spotId || 'svc-01'
  const tpl = SPOT_THUMBNAIL_TEMPLATES[spotId] || SPOT_THUMBNAIL_TEMPLATES['svc-01']!
  const artworkPath = args.artworkPath || tpl.artworkPath
  if (!existsSync(artworkPath)) {
    throw new Error(`Missing thumbnail base artwork: ${artworkPath}`)
  }

  mkdirSync(args.outDir, { recursive: true })
  const locales = args.locales || [...SOCIAL_PROMO_LOCALES]
  const prefix = args.prefix || spotId

  const base1280Buf = await sharp(artworkPath)
    .resize(1280, 720, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer()

  const outputs: Record<string, string> = {}

  for (const locale of locales) {
    const spec = tpl.headlines[locale]
    const outPath = join(args.outDir, `${prefix}-${locale}.jpg`)

    if (spec.useOriginalEnglishArt) {
      await sharp(base1280Buf).jpeg({ quality: 93, mozjpeg: true }).toFile(outPath)
    } else {
      const svg = buildVaultLocalizedOverlaySvg(spec, tpl.maskTopSky)
      await sharp(base1280Buf)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .jpeg({ quality: 93, mozjpeg: true })
        .toFile(outPath)
    }

    outputs[locale] = outPath
    console.log(`  [Concept 2 thumbnail] ${outPath.replace(`${ROOT}/`, '')}`)
  }

  return outputs
}

async function main() {
  const argv = process.argv.slice(2)
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const spotId = ((get('--spot') || 'svc-01').trim().toLowerCase()) as SocialPromoSpotId
  const customOutDir = get('--out-dir')
  const outDir = customOutDir
    ? resolve(ROOT, customOutDir)
    : join(ROOT, 'tmp', 'social-promos-build', spotId, 'thumbnails')
  const prefix = get('--prefix') || spotId

  await generateConcept2Thumbnails({ outDir, spotId, prefix })
  console.log(`\nGenerated all 7 thumbnails for ${spotId.toUpperCase()} in ${outDir.replace(`${ROOT}/`, '')}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('ERROR:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
