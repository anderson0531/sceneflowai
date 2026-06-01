#!/usr/bin/env node

/**
 * Upload Thai landing visuals from a local folder to Vercel Blob.
 *
 * Expected layout:
 *   assets/landing-visuals/th/storyboard/1.png … 14.png
 *   assets/landing-visuals/th/comparison/sceneflow-comparison-th.jpeg
 *
 * Usage:
 *   node scripts/upload-landing-visual-media.mjs
 *   node scripts/upload-landing-visual-media.mjs --dir ./assets/landing-visuals/th
 */

import { put } from '@vercel/blob'
import { config } from 'dotenv'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const DEFAULT_DIR = join(ROOT, 'assets/landing-visuals/th')

function contentTypeFor(fileName) {
  if (fileName.endsWith('.png')) return 'image/png'
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

async function uploadFile(blobToken, localPath, blobPath) {
  const buffer = readFileSync(localPath)
  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType: contentTypeFor(blobPath),
    token: blobToken,
  })
  console.log(`✓ ${blobPath}\n  ${blob.url}`)
  return blob.url
}

async function main() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) {
    console.error('BLOB_READ_WRITE_TOKEN is required')
    process.exit(1)
  }

  const dirArg = process.argv.find((arg) => arg.startsWith('--dir='))
  const dir = dirArg ? dirArg.slice('--dir='.length) : DEFAULT_DIR

  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`)
    console.error('Run: npx tsx scripts/generate-thai-landing-visuals.ts')
    process.exit(1)
  }

  const storyboardDir = join(dir, 'storyboard')
  const comparisonPath = join(dir, 'comparison/sceneflow-comparison-th.jpeg')

  if (existsSync(storyboardDir)) {
    const ids = readdirSync(storyboardDir)
      .filter((name) => /^\d+\.png$/.test(name))
      .sort((a, b) => Number(a) - Number(b))

    for (const name of ids) {
      const id = name.replace('.png', '')
      await uploadFile(blobToken, join(storyboardDir, name), `landing/storyboard/th/${id}.png`)
    }
  }

  if (existsSync(comparisonPath)) {
    await uploadFile(blobToken, comparisonPath, 'landing/comparison/sceneflow-comparison-th.jpeg')
  }

  console.log('\nDone. URLs are registered in src/config/landing/landingVisualMedia.ts')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
