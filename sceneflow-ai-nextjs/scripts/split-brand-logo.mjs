#!/usr/bin/env node
/**
 * Generate brand assets from the film-strip infinity JPEG.
 *
 * The source is a landscape cyan-to-purple infinity on navy. Header badges
 * stay landscape (`contain` on navy). Square icons (favicon, PWA, Open Graph)
 * are also `contain` on navy so both loops stay in frame.
 *
 * Usage:
 *   node scripts/split-brand-logo.mjs
 */

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'public/brand/sf-infinity-source.jpg')
const BRAND = join(ROOT, 'public/brand')
const NAVY = { r: 5, g: 10, b: 24, alpha: 1 }

const PNG = { compressionLevel: 9, palette: false }

function contain(width, height) {
  return sharp(SRC)
    .resize(width, height, { fit: 'contain', background: NAVY })
    .png(PNG)
}

async function run() {
  mkdirSync(BRAND, { recursive: true })
  mkdirSync(join(ROOT, 'public/icons'), { recursive: true })

  const landscape = [
    { out: join(BRAND, 'sf-badge.png'), width: 81, height: 44 },
    { out: join(BRAND, 'sf-badge@2x.png'), width: 162, height: 88 },
  ]
  const square = [
    { out: join(BRAND, 'sf-logo-lockup.png'), size: 512 },
    { out: join(ROOT, 'public/apple-touch-icon.png'), size: 180 },
    { out: join(ROOT, 'public/favicon-32.png'), size: 32 },
    ...[72, 96, 128, 144, 152, 192, 384, 512].map((size) => ({
      out: join(ROOT, 'public/icons', `icon-${size}x${size}.png`),
      size,
    })),
  ]

  for (const { out, width, height } of landscape) {
    await contain(width, height).toFile(out)
    console.log('Wrote', out)
  }
  for (const { out, size } of square) {
    await contain(size, size).toFile(out)
    console.log('Wrote', out)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
