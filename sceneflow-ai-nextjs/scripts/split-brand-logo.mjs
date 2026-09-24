#!/usr/bin/env node
/**
 * Generate brand assets from the film-strip infinity JPEG (transparent PNGs).
 *
 * Usage:
 *   node scripts/split-brand-logo.mjs
 */

import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { writeInfinityLogoPng } from './lib/infinityLogoPng.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BRAND = join(ROOT, 'public/brand')

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
    await writeInfinityLogoPng(out, width, height)
    console.log('Wrote', out)
  }
  for (const { out, size } of square) {
    await writeInfinityLogoPng(out, size, size)
    console.log('Wrote', out)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
