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

export interface VaultHeadlineSpec {
  whitePart: string
  yellowPart: string
  fontFamily: string
  fontSize: number
  letterSpacing?: number
  rtl?: boolean
  useOriginalEnglishArt?: boolean
  vaultPlateLine1: string
  vaultPlateLine2: string
  vaultPlateSize1: number
  vaultPlateSize2: number
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildVaultLocalizedOverlaySvg(spec: VaultHeadlineSpec): string {
  const whiteText = escapeXml(spec.whitePart)
  const yellowText = escapeXml(spec.yellowPart)
  const plate1 = escapeXml(spec.vaultPlateLine1)
  const plate2 = escapeXml(spec.vaultPlateLine2)
  const ls = spec.letterSpacing ?? 0

  // For Arabic RTL in librsvg, render each visual token explicitly right-to-left:
  // Right (white): "300" then "دقيقة" -> reads "300 دقيقة" RTL;
  // Left (yellow): "تلقائي" then "4K" -> reads "تلقائي 4K" RTL.
  const headlineMarkup = spec.rtl
    ? `
      <text x="1030" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffffff" filter="url(#headlineShadow)">300</text>
      <text x="875" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffffff" filter="url(#headlineShadow)">دقيقة</text>
      <text x="640" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffde00" filter="url(#headlineShadow)">تلقائي</text>
      <text x="395" y="114" text-anchor="end" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" fill="#ffde00" filter="url(#headlineShadow)">4K</text>
    `
    : `
      <text x="640" y="118" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.fontSize}" font-weight="900" letter-spacing="${ls}" fill="#ffffff" filter="url(#headlineShadow)">${whiteText} <tspan fill="#ffde00">${yellowText}</tspan></text>
    `

  // Fine horizontal brushed-steel grain lines for the inner lock nameplate (rotated -11.9deg around 648,376)
  let brushLines = ''
  for (let y = -52; y <= 52; y += 3) {
    const op = y % 6 === 0 ? '0.075' : '0.035'
    const col = y % 9 === 0 ? '#ffffff' : '#0b1016'
    brushLines += `<line x1="-112" y1="${y}" x2="112" y2="${y}" stroke="${col}" stroke-opacity="${op}" stroke-width="1"/>`
  }

  return `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Single seamless vertical gradient matching exact #09121e obsidian sky with zero horizon seam -->
    <linearGradient id="seamlessTopSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070e18" stop-opacity="1"/>
      <stop offset="81%" stop-color="#0a1420" stop-opacity="1"/>
      <stop offset="91%" stop-color="#0c1724" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#0e1a28" stop-opacity="0"/>
    </linearGradient>

    <!-- Brushed steel plate surface matching original lock lighting (warm dark bottom-left -> cool bright steel top-right) -->
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

    <!-- Embossed metallic typography fill matching original raised steel letters -->
    <linearGradient id="embossMetalFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d5e4ee"/>
      <stop offset="46%" stop-color="#9aaab6"/>
      <stop offset="56%" stop-color="#7f8f9b"/>
      <stop offset="100%" stop-color="#b8c9d6"/>
    </linearGradient>

    <!-- Clip inside the 4 corner bolts (real outer chamfered steel frame + 4 real hex bolts stay 100% untouched!) -->
    <clipPath id="innerPlateClip">
      <!-- Octagonal cutout cleanly avoids all 4 corner bolts at (±113, ±53) -->
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

  <!-- 1. Seamless top headline mask (y=0..176, above vault lock) -->
  <rect x="0" y="0" width="1280" height="176" fill="url(#seamlessTopSky)"/>

  <!-- Single bold high-contrast two-tone top headline -->
  ${headlineMarkup}

  <!-- 2. Localized brushed-steel center lock plaque (exact center 648,376 · rotation -11.9°) -->
  <g transform="translate(648, 376) rotate(-11.9)">
    <!-- Soft feathered steel cover cleanly replacing English "CONTINUITY VAULT" while keeping all 4 real corner bolts -->
    <polygon points="-96,-54 96,-54 114,-36 114,36 96,54 -96,54 -114,36 -114,-36" fill="url(#steelPlateBg)" filter="url(#plateSoftEdge)"/>
    <g clip-path="url(#innerPlateClip)">
      <rect x="-116" y="-56" width="232" height="112" fill="url(#steelPlateBg)"/>
      <rect x="-116" y="-56" width="232" height="112" fill="url(#steelSpecular)"/>
      ${brushLines}
    </g>

    <!-- 3D Embossed Steel Localized "Continuity Vault" Text -->
    <!-- Top specular bevel edge -->
    <text x="1" y="-8" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.vaultPlateSize1}" font-weight="900" letter-spacing="0.8" fill="#eef6fc" fill-opacity="0.55">${plate1}</text>
    <text x="1" y="34" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.vaultPlateSize2}" font-weight="900" letter-spacing="0.8" fill="#eef6fc" fill-opacity="0.55">${plate2}</text>

    <!-- Raised metallic body + deep forged shadow -->
    <text x="0" y="-7" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.vaultPlateSize1}" font-weight="900" letter-spacing="0.8" fill="url(#embossMetalFill)" stroke="#1b2229" stroke-width="1.1" paint-order="stroke" filter="url(#metalEmbossShadow)">${plate1}</text>
    <text x="0" y="35" text-anchor="middle" font-family="${spec.fontFamily}" font-size="${spec.vaultPlateSize2}" font-weight="900" letter-spacing="0.8" fill="url(#embossMetalFill)" stroke="#1b2229" stroke-width="1.1" paint-order="stroke" filter="url(#metalEmbossShadow)">${plate2}</text>
  </g>
</svg>`
}

export async function generateConcept2Thumbnails(args: {
  outDir: string
  prefix?: string
  locales?: SocialPromoLocale[]
  artworkPath?: string
}) {
  const artworkPath = args.artworkPath || CONCEPT_2_VAULT_ARTWORK
  if (!existsSync(artworkPath)) {
    throw new Error(`Missing Concept 2 Continuity Vault base artwork: ${artworkPath}`)
  }

  mkdirSync(args.outDir, { recursive: true })
  const locales = args.locales || [...SOCIAL_PROMO_LOCALES]
  const prefix = args.prefix || 'vault'

  // Resize original 1365×768 artwork cleanly to exact YouTube 1280×720
  const base1280Buf = await sharp(artworkPath)
    .resize(1280, 720, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer()

  const outputs: Record<string, string> = {}

  for (const locale of locales) {
    const spec = VAULT_LOCALIZED_HEADLINES[locale]
    const outPath = join(args.outDir, `${prefix}-${locale}.jpg`)

    if (spec.useOriginalEnglishArt) {
      await sharp(base1280Buf).jpeg({ quality: 93, mozjpeg: true }).toFile(outPath)
    } else {
      const svg = buildVaultLocalizedOverlaySvg(spec)
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

  await generateConcept2Thumbnails({ outDir, prefix })
  console.log(`\nGenerated all 7 Concept 2 Continuity Vault thumbnails in ${outDir.replace(`${ROOT}/`, '')}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('ERROR:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
