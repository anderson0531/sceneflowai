#!/usr/bin/env node
/**
 * Regenerate hero poster JPGs from the current Blob master MP4s (Hero Video *.mp4).
 * Replaces stale posters that were extracted from deprecated SceneFlow Hero*.mp4 sources.
 *
 * Usage:
 *   node scripts/regenerate-hero-posters.mjs
 *   node scripts/regenerate-hero-posters.mjs --upload
 *   node scripts/regenerate-hero-posters.mjs --locale en
 *
 * Writes:
 *   public/landing/hero/sceneflow-hero-{locale}-poster.jpg
 *   content/youtube-hero-upload-pack/{locale}/sceneflow-hero-{locale}-poster.jpg
 *
 * With --upload (requires BLOB_READ_WRITE_TOKEN):
 *   landing/hero/sceneflow-hero-{locale}-poster.jpg on Vercel Blob
 */

import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { put } from '@vercel/blob'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

/** Must match HERO_VIDEO_BLOB_PATHS in heroVideoLocales.ts */
const HERO_MASTERS = {
  en: 'SceneFlow Hero Video.mp4',
  es: 'Hero Video (Spanish).mp4',
  pt: 'Hero Video (Portuguese).mp4',
  hi: 'Hero Video (Hindi).mp4',
  zh: 'Hero Video (Chinese).mp4',
  ar: 'Hero Video (Arabic) .mp4',
  th: 'Hero Video (Thai) .mp4',
}

const ALL_LOCALES = Object.keys(HERO_MASTERS)
/** Skip black first frame — landing uses #t=0.1; pick a representative mid-open frame */
const POSTER_TIMESTAMP = '00:00:02'

function parseArgs(argv) {
  let upload = false
  let locale = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--upload') upload = true
    else if (argv[i] === '--locale' && argv[i + 1]) locale = argv[++i]
  }
  return { upload, locale }
}

function masterUrl(path) {
  return `${BLOB_HOST}/${encodeURI(path)}`
}

function extractPoster(videoUrl, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true })
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-ss',
      POSTER_TIMESTAMP,
      '-i',
      videoUrl,
      '-frames:v',
      '1',
      '-update',
      '1',
      '-q:v',
      '2',
      outputPath,
    ],
    { stdio: 'inherit' }
  )
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${videoUrl}`)
  }
}

async function uploadPoster(filePath, locale) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN required for --upload')
  const blobPath = `landing/hero/sceneflow-hero-${locale}-poster.jpg`
  const buffer = readFileSync(filePath)
  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
    token,
    allowOverwrite: true,
  })
  console.log('Blob poster:', blob.url)
  return blob.url
}

async function processLocale(locale, { upload }) {
  const masterPath = HERO_MASTERS[locale]
  const videoUrl = masterUrl(masterPath)
  const publicPath = join(ROOT, 'public/landing/hero', `sceneflow-hero-${locale}-poster.jpg`)
  const packPath = join(
    ROOT,
    'content/youtube-hero-upload-pack',
    locale,
    `sceneflow-hero-${locale}-poster.jpg`
  )

  console.log(`\n=== ${locale} ===`)
  console.log('Source:', videoUrl)
  extractPoster(videoUrl, publicPath)
  extractPoster(videoUrl, packPath)
  console.log('Wrote:', publicPath)
  console.log('Wrote:', packPath)

  if (upload) {
    await uploadPoster(publicPath, locale)
  }
}

async function main() {
  const { upload, locale } = parseArgs(process.argv.slice(2))
  const locales = locale ? [locale] : ALL_LOCALES

  for (const loc of locales) {
    if (!HERO_MASTERS[loc]) {
      console.error(`Unknown locale: ${loc}`)
      process.exit(1)
    }
    await processLocale(loc, { upload })
  }

  console.log('\nDone. Re-run: npm run youtube:hero-upload-pack')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
