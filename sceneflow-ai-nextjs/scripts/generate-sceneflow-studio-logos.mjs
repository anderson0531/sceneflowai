#!/usr/bin/env node
/**
 * Generate high-resolution "SceneFlow Studio" logo lockups (horizontal & stacked,
 * transparent, dark navy, and light-background variants) in `public/brand/`.
 *
 * Usage:
 *   node scripts/generate-sceneflow-studio-logos.mjs
 */

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BRAND_DIR = join(ROOT, 'public/brand')
const SOURCE_JPG = join(BRAND_DIR, 'sf-infinity-source.jpg')

const PNG_OPTS = { compressionLevel: 9, palette: false }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

/**
 * Compute smooth alpha (0..255) for each pixel of `sf-infinity-source.jpg` so the
 * cyan-to-purple film-strip infinity symbol and its subtle neon rim are preserved
 * cleanly while the dark navy/gray radial vignette and halftone dither are keyed out.
 */
async function extractCleanInfinityMark() {
  const image = sharp(SOURCE_JPG)
  const meta = await image.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(data)

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = out[idx]
      const g = out[idx + 1]
      const b = out[idx + 2]

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const chroma = max - min

      // The film strip is strongly saturated cyan/blue/purple (high chroma and blue/cyan/magenta dominance).
      // The background vignette is low-chroma dark navy/slate (r≈g≈b, chroma < 28, max < 75).
      // Compute a smooth alpha ramp based on chroma and colorfulness so there is zero gray cloud.
      const chromaSignal = Math.max(0, (chroma - 36) / 48) // 0 at chroma<=36, 1 at chroma>=84
      const brightColorSignal = chroma >= 30 ? Math.max(0, (max - 90) / 65) : 0
      const rawAlpha = Math.min(1, Math.max(chromaSignal, brightColorSignal))

      // Smoothstep for clean anti-aliased edge
      const alphaNorm = rawAlpha * rawAlpha * (3 - 2 * rawAlpha)
      const alpha = Math.round(alphaNorm * 255)

      if (alpha < 14) {
        out[idx] = 0
        out[idx + 1] = 0
        out[idx + 2] = 0
        out[idx + 3] = 0
      } else {
        // Lift semi-transparent outer-glow pixels to pure neon cyan/purple chromaticity
        // so they never leave a dark shadow fringe when composited over white backgrounds.
        if (alphaNorm < 0.95 && max > 0) {
          const cleanR = Math.max(0, r - min * 0.65)
          const cleanG = Math.max(0, g - min * 0.65)
          const cleanB = Math.max(0, b - min * 0.65)
          const cleanMax = Math.max(cleanR, cleanG, cleanB, 1)
          const targetPeak = Math.max(max, 235)
          const gain = targetPeak / cleanMax
          out[idx] = Math.min(255, Math.round(cleanR * gain))
          out[idx + 1] = Math.min(255, Math.round(cleanG * gain))
          out[idx + 2] = Math.min(255, Math.round(cleanB * gain))
        }
        out[idx + 3] = alpha
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const pad = 16
  const cropLeft = Math.max(0, minX - pad)
  const cropTop = Math.max(0, minY - pad)
  const cropWidth = Math.min(width - cropLeft, maxX - minX + 1 + pad * 2)
  const cropHeight = Math.min(height - cropTop, maxY - minY + 1 + pad * 2)

  return sharp(out, {
    raw: { width, height, channels: 4 },
  })
    .extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    })
    .png(PNG_OPTS)
    .toBuffer()
}

/**
 * Render an SVG backdrop with SceneFlow's signature deep navy (#050A18) and
 * subtle cyan/purple radial atmospheric glow.
 */
function buildDarkNavyBackdropSvg(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGlowLeft" cx="25%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#00F2FF" stop-opacity="0.10" />
          <stop offset="100%" stop-color="#050A18" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="bgGlowRight" cx="70%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#9333EA" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#050A18" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#050A18" />
      <rect width="${width}" height="${height}" fill="url(#bgGlowLeft)" />
      <rect width="${width}" height="${height}" fill="url(#bgGlowRight)" />
    </svg>`
  )
}

/**
 * Build SVG wordmark for "SceneFlow Studio".
 */
function buildWordmarkSvg({
  width,
  height,
  textX,
  baselineY,
  textAnchor = 'start',
  sceneFlowSize = 118,
  studioSize = 90,
  theme = 'dark',
}) {
  const primaryColor = theme === 'light' ? '#050A18' : '#FFFFFF'
  const studioColor = theme === 'light' ? '#64748B' : '#94A3B8'

  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .wordmark {
          font-family: 'Montserrat', 'Inter', 'Helvetica Neue', 'Arial', sans-serif;
          letter-spacing: -0.025em;
        }
        .sf-main {
          font-weight: 700;
          font-size: ${sceneFlowSize}px;
          fill: ${primaryColor};
        }
        .sf-studio {
          font-weight: 500;
          font-size: ${studioSize}px;
          fill: ${studioColor};
          letter-spacing: -0.01em;
        }
      </style>
      <text x="${textX}" y="${baselineY}" text-anchor="${textAnchor}" class="wordmark">
        <tspan class="sf-main">SceneFlow</tspan><tspan dx="${Math.round(sceneFlowSize * 0.16)}" class="sf-studio">Studio</tspan>
      </text>
    </svg>`
  )
}

async function generateHorizontalLockup({
  markBuffer,
  outPath,
  theme = 'dark',
  withSolidBackground = false,
}) {
  const width = 1800
  const height = 420
  const markWidth = 390
  const markHeight = 220
  const markLeft = 75
  const markTop = Math.round((height - markHeight) / 2)

  const resizedMark = await sharp(markBuffer)
    .resize(markWidth, markHeight, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer()

  const wordmarkSvg = buildWordmarkSvg({
    width,
    height,
    textX: markLeft + markWidth + 52,
    baselineY: Math.round(height / 2 + 40),
    textAnchor: 'start',
    sceneFlowSize: 132,
    studioSize: 100,
    theme,
  })

  const layers = []
  if (withSolidBackground) {
    layers.push({ input: buildDarkNavyBackdropSvg(width, height), top: 0, left: 0 })
  }
  layers.push({ input: resizedMark, top: markTop, left: markLeft })
  layers.push({ input: wordmarkSvg, top: 0, left: 0 })

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite(layers)
    .png(PNG_OPTS)
    .toFile(outPath)

  console.log('Wrote', outPath)
}

async function generateStackedLockup({
  markBuffer,
  outPath,
  theme = 'dark',
  withSolidBackground = false,
}) {
  const width = 1400
  const height = 900
  const markWidth = 680
  const markHeight = 370
  const markLeft = Math.round((width - markWidth) / 2)
  const markTop = 145

  const resizedMark = await sharp(markBuffer)
    .resize(markWidth, markHeight, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer()

  const wordmarkSvg = buildWordmarkSvg({
    width,
    height,
    textX: Math.round(width / 2),
    baselineY: markTop + markHeight + 175,
    textAnchor: 'middle',
    sceneFlowSize: 124,
    studioSize: 94,
    theme,
  })

  const layers = []
  if (withSolidBackground) {
    layers.push({ input: buildDarkNavyBackdropSvg(width, height), top: 0, left: 0 })
  }
  layers.push({ input: resizedMark, top: markTop, left: markLeft })
  layers.push({ input: wordmarkSvg, top: 0, left: 0 })

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite(layers)
    .png(PNG_OPTS)
    .toFile(outPath)

  console.log('Wrote', outPath)
}

async function run() {
  mkdirSync(BRAND_DIR, { recursive: true })
  const markBuffer = await extractCleanInfinityMark()

  // 1. Horizontal lockup — transparent background (white "SceneFlow" + slate "Studio" for dark UI/overlays)
  await generateHorizontalLockup({
    markBuffer,
    outPath: join(BRAND_DIR, 'sceneflow-studio-logo-horizontal.png'),
    theme: 'dark',
    withSolidBackground: false,
  })

  // 2. Horizontal lockup — on SceneFlow dark navy (#050A18) background
  await generateHorizontalLockup({
    markBuffer,
    outPath: join(BRAND_DIR, 'sceneflow-studio-logo-horizontal-dark.png'),
    theme: 'dark',
    withSolidBackground: true,
  })

  // 3. Horizontal lockup — transparent background with dark navy text (for light/white backgrounds)
  await generateHorizontalLockup({
    markBuffer,
    outPath: join(BRAND_DIR, 'sceneflow-studio-logo-horizontal-light.png'),
    theme: 'light',
    withSolidBackground: false,
  })

  // 4. Stacked lockup — transparent background (white "SceneFlow" + slate "Studio")
  await generateStackedLockup({
    markBuffer,
    outPath: join(BRAND_DIR, 'sceneflow-studio-logo-stacked.png'),
    theme: 'dark',
    withSolidBackground: false,
  })

  // 5. Stacked lockup — on SceneFlow dark navy (#050A18) background
  await generateStackedLockup({
    markBuffer,
    outPath: join(BRAND_DIR, 'sceneflow-studio-logo-stacked-dark.png'),
    theme: 'dark',
    withSolidBackground: true,
  })
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
