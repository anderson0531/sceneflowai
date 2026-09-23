#!/usr/bin/env node
/**
 * Generate brand assets from SFAI LOGO.jpg (circular badge).
 *
 * The source is a square badge with SceneFlow on the top arc, the clapper in
 * the center, and a caption along the lower rim. Keep the top portion only,
 * then scale it to cover each square size from the top so the ring stays in
 * frame and the caption is gone.
 *
 * Usage:
 *   curl -o tmp/brand/SFAI-LOGO.jpg "https://xxavfkdhdebrqida.public.blob.vercel-storage.com/SFAI%20LOGO.jpg"
 *   node scripts/split-brand-logo.mjs
 */

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'tmp/brand/SFAI-LOGO.jpg')
const BRAND = join(ROOT, 'public/brand')

/** Top fraction of the source. Caption glyphs on the 600px JPEG start at y=511. */
const CAPTION_CROP_RATIO = 500 / 600

async function croppedBadge(size) {
  const meta = await sharp(SRC).metadata()
  const width = meta.width
  const height = meta.height
  const cropHeight = Math.max(1, Math.round(height * CAPTION_CROP_RATIO))

  return sharp(SRC)
    .extract({ left: 0, top: 0, width, height: cropHeight })
    .resize(size, size, { fit: 'cover', position: 'top' })
    .png({ compressionLevel: 9, palette: false })
}

async function run() {
  mkdirSync(join(ROOT, 'tmp/brand'), { recursive: true })
  mkdirSync(BRAND, { recursive: true })
  mkdirSync(join(ROOT, 'public/icons'), { recursive: true })

  const outputs = [
    { out: join(BRAND, 'sf-badge.png'), size: 88 },
    { out: join(BRAND, 'sf-badge@2x.png'), size: 176 },
    { out: join(BRAND, 'sf-logo-lockup.png'), size: 512 },
    { out: join(ROOT, 'public/apple-touch-icon.png'), size: 180 },
    { out: join(ROOT, 'public/icons/icon-192x192.png'), size: 192 },
    { out: join(ROOT, 'public/icons/icon-152x152.png'), size: 152 },
    { out: join(ROOT, 'public/favicon-32.png'), size: 32 },
  ]

  for (const { out, size } of outputs) {
    await (await croppedBadge(size)).toFile(out)
    console.log('Wrote', out)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
