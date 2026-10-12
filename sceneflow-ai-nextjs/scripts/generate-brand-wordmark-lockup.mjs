#!/usr/bin/env node
/**
 * Horizontal lockup: infinity badge + "SceneFlow Studio" wordmark (one PNG/SVG).
 *
 * Usage: node scripts/generate-brand-wordmark-lockup.mjs
 */

import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BRAND = join(ROOT, 'public/brand')
const CACHE = join(ROOT, 'tmp/brand-fonts')

const BADGE_SRC = join(BRAND, 'sf-badge@2x.png')
const FONT_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf'

const COLORS = {
  sceneFlowDark: '#111827',
  studioDark: '#6b7280',
  sceneFlowLight: '#ffffff',
  studioLight: '#9ca3af',
  navy: '#050A18',
}

async function ensureFont(name, url) {
  mkdirSync(CACHE, { recursive: true })
  const dest = join(CACHE, name)
  if (!existsSync(dest)) {
    const res = await fetch(url)
    if (!res.ok || !res.body) throw new Error(`Font download failed: ${url}`)
    await pipeline(res.body, createWriteStream(dest))
  }
  return dest
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

function wordmarkSvg({
  width,
  height,
  textX,
  fontPath,
  sceneFlowColor,
  studioColor,
  sceneFlowSize,
  studioSize,
  baselineY,
  studioX,
}) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'MontserratWordmark';
        src: url('file://${escapeXml(fontPath)}');
      }
    </style>
  </defs>
  <text x="${textX}" y="${baselineY}" font-family="MontserratWordmark" font-weight="700" font-size="${sceneFlowSize}" fill="${sceneFlowColor}">SceneFlow</text>
  <text x="${studioX}" y="${baselineY}" font-family="MontserratWordmark" font-weight="500" font-size="${studioSize}" fill="${studioColor}">Studio</text>
</svg>`)
}

async function buildLockup({ variant, outBase, scale = 1 }) {
  const badgeHeight = Math.round(88 * scale)
  const gap = Math.round(16 * scale)
  const sceneFlowSize = Math.round(42 * scale)
  const studioSize = Math.round(34 * scale)
  const padY = Math.round(10 * scale)
  const padX = Math.round(8 * scale)

  const fontPath = await ensureFont('Montserrat-wght.ttf', FONT_URL)

  const badgeBuf = await sharp(BADGE_SRC)
    .resize({ height: badgeHeight, fit: 'contain' })
    .png()
    .toBuffer()
  const badgeMeta = await sharp(badgeBuf).metadata()
  const badgeW = badgeMeta.width ?? 1
  const badgeH = badgeMeta.height ?? badgeHeight

  const textX = padX + badgeW + gap
  // Approximate "SceneFlow" width at this size (matches nav proportions).
  const studioX = textX + Math.round(sceneFlowSize * 5.45)
  const canvasW = studioX + Math.round(studioSize * 4.2) + padX
  const canvasH = Math.max(badgeH, sceneFlowSize + studioSize) + padY * 2
  const baselineY = Math.round(canvasH / 2 + sceneFlowSize * 0.36)

  const useLightText = variant === 'light' || variant === 'navy'
  const textSvg = wordmarkSvg({
    width: canvasW,
    height: canvasH,
    textX,
    fontPath,
    sceneFlowColor: useLightText ? COLORS.sceneFlowLight : COLORS.sceneFlowDark,
    studioColor: useLightText ? COLORS.studioLight : COLORS.studioDark,
    sceneFlowSize,
    studioSize,
    baselineY,
    studioX,
  })

  const textBuf = await sharp(textSvg).png().toBuffer()
  const badgeTop = Math.round((canvasH - badgeH) / 2)

  const layers = [
    { input: badgeBuf, left: padX, top: badgeTop },
    { input: textBuf, left: 0, top: 0 },
  ]

  const transparent = {
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }

  if (variant === 'navy') {
    const fg = await sharp(transparent)
      .composite(layers)
      .png()
      .toBuffer()
    await sharp({
      create: {
        width: canvasW,
        height: canvasH,
        channels: 4,
        background: { ...parseHex(COLORS.navy), alpha: 255 },
      },
    })
      .composite([{ input: fg, left: 0, top: 0 }])
      .png()
      .toFile(`${outBase}.png`)
  } else {
    await sharp(transparent).composite(layers).png().toFile(`${outBase}.png`)
  }

  writeFileSync(`${outBase}.svg`, buildStandaloneSvg({
    canvasW,
    canvasH,
    badgeW,
    badgeH,
    badgeTop,
    padX,
    textX,
    studioX,
    baselineY,
    sceneFlowSize,
    studioSize,
    sceneFlowColor: variant === 'navy' || variant === 'light' ? COLORS.sceneFlowLight : COLORS.sceneFlowDark,
    studioColor: variant === 'navy' || variant === 'light' ? COLORS.studioLight : COLORS.studioDark,
    bg: variant === 'navy' ? COLORS.navy : 'none',
  }))

  console.log(`Wrote ${outBase}.png`)
  console.log(`Wrote ${outBase}.svg`)
}

function parseHex(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** SVG with embedded badge (portable for download; fonts still reference Montserrat). */
function buildStandaloneSvg(opts) {
  const badgeHref = 'sf-badge@2x.png'
  const bgRect =
    opts.bg === 'none'
      ? ''
      : `<rect width="100%" height="100%" fill="${opts.bg}"/>`
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${opts.canvasW}" height="${opts.canvasH}" viewBox="0 0 ${opts.canvasW} ${opts.canvasH}" xmlns="http://www.w3.org/2000/svg">
  ${bgRect}
  <image href="${badgeHref}" x="${opts.padX}" y="${opts.badgeTop}" width="${opts.badgeW}" height="${opts.badgeH}"/>
  <text x="${opts.textX}" y="${opts.baselineY}" font-family="Montserrat, ui-sans-serif, sans-serif" font-weight="700" font-size="${opts.sceneFlowSize}" fill="${opts.sceneFlowColor}">SceneFlow</text>
  <text x="${opts.studioX}" y="${opts.baselineY}" font-family="Montserrat, ui-sans-serif, sans-serif" font-weight="500" font-size="${opts.studioSize}" fill="${opts.studioColor}">Studio</text>
</svg>
`
}

async function main() {
  mkdirSync(BRAND, { recursive: true })
  await buildLockup({ variant: 'dark', outBase: join(BRAND, 'sf-wordmark-lockup-dark'), scale: 1 })
  await buildLockup({ variant: 'light', outBase: join(BRAND, 'sf-wordmark-lockup-light'), scale: 1 })
  await buildLockup({ variant: 'navy', outBase: join(BRAND, 'sf-wordmark-lockup-navy'), scale: 1 })
  await buildLockup({ variant: 'dark', outBase: join(BRAND, 'sf-wordmark-lockup-dark@2x'), scale: 2 })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
