#!/usr/bin/env npx tsx
/**
 * Generate high-CTR localized 1280×720 YouTube thumbnails for all 7 languages
 * by compositing crisp multilingual SVG typography + cinematic gradient scrim
 * over each spot's hero Omni 1.2 Flash cinema keyframe using `sharp`.
 *
 * Usage:
 *   npx tsx scripts/generate-social-promo-thumbnails.ts --spot svc-01
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'
import sharp from 'sharp'
import {
  SOCIAL_PROMO_LOCALES,
  type SocialPromoLocale,
  type SocialPromoSpotId,
} from './social-promo-sources/socialPromoScripts'
import {
  SOCIAL_PROMO_YOUTUBE_META,
  type SpotThumbnailSpec,
} from './social-promo-sources/youtubeMetadata'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FFMPEG = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildThumbnailOverlaySvg(spec: SpotThumbnailSpec, locale: SocialPromoLocale): string {
  const isRtl = Boolean(spec.rtl)
  const headlineSize =
    spec.headlineTop.length >= 20
      ? 48
      : spec.headlineTop.length >= 15
        ? 56
        : locale === 'zh'
          ? 62
          : locale === 'hi' || locale === 'th'
            ? 58
            : locale === 'ar'
              ? 52
              : 66
  const accentSize =
    spec.headlineAccent.length >= 20
      ? 48
      : spec.headlineAccent.length >= 15
        ? 56
        : locale === 'zh'
          ? 62
          : locale === 'hi' || locale === 'th'
            ? 58
            : locale === 'ar'
              ? 50
              : 66
  const eyebrowFontSize = spec.eyebrow.length >= 30 ? 18 : 21
  const eyebrowWidth = spec.eyebrow.length >= 30 ? 500 : 440
  const eyebrowCenterX = 60 + eyebrowWidth / 2
  const statFontSize = spec.statLine.length >= 40 ? 25 : spec.statLine.length >= 32 ? 28 : 31
  const ctaFontSize = spec.ctaPill.length >= 34 ? 23 : 26
  const ctaWidth = spec.ctaPill.length >= 34 ? 530 : 490
  const ctaCenterX = 60 + ctaWidth / 2

  // Keep all typography inside the clean left 52% safe column (x = 60..580)
  // so the smiling founder on the right half and SceneFlow Studio bottom-right logo stay unobstructed.
  // For Arabic RTL in librsvg, centering inside the left column (x=310, text-anchor="middle")
  // prevents RTL anchor mirroring from pushing text over the right-side actor.
  const xAnchor = isRtl ? 310 : 60
  const textAnchor = isRtl ? 'middle' : 'start'
  const barX = isRtl ? 190 : 60
  const headlineFinalSize = isRtl ? 56 : headlineSize
  const accentFinalSize = isRtl ? 54 : accentSize

  // Clean separate pill for eyebrow & bottom CTA
  const eyebrowText = escapeXml(spec.eyebrow)
  const topLine = escapeXml(spec.headlineTop)
  const accentLine = escapeXml(spec.headlineAccent)
  const statLine = escapeXml(spec.statLine)
  const ctaLine = escapeXml(spec.ctaPill)

  return `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="leftScrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#060b16" stop-opacity="0.93"/>
      <stop offset="44%" stop-color="#081020" stop-opacity="0.78"/>
      <stop offset="68%" stop-color="#081020" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#081020" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <filter id="textShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.65"/>
    </filter>
  </defs>

  <!-- Left cinematic gradient scrim keeping right subject bright and natural -->
  <rect x="0" y="0" width="1280" height="720" fill="url(#leftScrim)"/>

  <!-- Subtle top & bottom framing edge -->
  <rect x="0" y="0" width="1280" height="6" fill="url(#accentBar)" opacity="0.9"/>

  <!-- Eyebrow Pill -->
  <rect x="60" y="96" width="${eyebrowWidth}" height="48" rx="24" fill="#0f172a" fill-opacity="0.88" stroke="#22d3ee" stroke-opacity="0.65" stroke-width="2"/>
  <text x="${eyebrowCenterX}" y="127" text-anchor="middle" font-family="sans-serif" font-size="${eyebrowFontSize}" font-weight="800" letter-spacing="0.9" fill="#67e8f9">${eyebrowText}</text>

  <!-- Bold 2-Line Hero Headline -->
  <text x="${xAnchor}" y="268" text-anchor="${textAnchor}" font-family="sans-serif" font-size="${headlineFinalSize}" font-weight="900" fill="#ffffff" filter="url(#textShadow)">${topLine}</text>
  <text x="${xAnchor}" y="352" text-anchor="${textAnchor}" font-family="sans-serif" font-size="${accentFinalSize}" font-weight="900" fill="#fbbf24" filter="url(#textShadow)">${accentLine}</text>

  <!-- Accent Divider -->
  <rect x="${barX}" y="392" width="240" height="6" rx="3" fill="url(#accentBar)"/>

  <!-- Stat Line -->
  <text x="${xAnchor}" y="454" text-anchor="${textAnchor}" font-family="sans-serif" font-size="${statFontSize}" font-weight="700" fill="#e2e8f0" filter="url(#textShadow)">${statLine}</text>

  <!-- Bottom CTA Chip -->
  <rect x="60" y="534" width="${ctaWidth}" height="68" rx="14" fill="url(#ctaGrad)" filter="url(#textShadow)"/>
  <text x="${ctaCenterX}" y="577" text-anchor="middle" font-family="sans-serif" font-size="${ctaFontSize}" font-weight="800" fill="#04101c">${ctaLine}</text>
</svg>`
}

async function main() {
  const idx = process.argv.indexOf('--spot')
  const spotId = ((idx >= 0 ? process.argv[idx + 1] : 'svc-01') || 'svc-01') as SocialPromoSpotId
  const cfg = SOCIAL_PROMO_YOUTUBE_META[spotId]
  if (!cfg) {
    throw new Error(`No YouTube metadata configured for spot "${spotId}"`)
  }

  const clipPath = join(ROOT, 'tmp', 'social-promos-build', spotId, 'clips', `block-0${cfg.heroFrameBlock}.mp4`)
  if (!existsSync(clipPath)) {
    throw new Error(`Missing hero clip: ${clipPath}`)
  }

  const outDir = join(ROOT, 'tmp', 'social-promos-build', spotId, 'thumbnails')
  mkdirSync(outDir, { recursive: true })

  const baseFramePath = join(outDir, '_base-frame.png')
  const extract = spawnSync(
    FFMPEG,
    [
      '-y',
      '-ss',
      String(cfg.heroFrameTimestampSec),
      '-i',
      clipPath,
      '-vframes',
      '1',
      '-vf',
      'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720',
      baseFramePath,
    ],
    { encoding: 'utf8' }
  )
  if (extract.status !== 0) {
    throw new Error(`Failed extracting base hero frame: ${(extract.stderr || '').slice(-300)}`)
  }

  for (const locale of SOCIAL_PROMO_LOCALES) {
    const meta = cfg.locales[locale]
    const svg = buildThumbnailOverlaySvg(meta.thumbnail, locale)
    const outPath = join(outDir, `${spotId}-${locale}.jpg`)
    await sharp(baseFramePath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(outPath)
    console.log(`  [thumbnail] ${outPath.replace(`${ROOT}/`, '')}`)
  }

  console.log(`\nGenerated all 7 thumbnails in ${outDir.replace(`${ROOT}/`, '')}`)
}

main().catch((err) => {
  console.error('ERROR:', err instanceof Error ? err.message : err)
  process.exit(1)
})
