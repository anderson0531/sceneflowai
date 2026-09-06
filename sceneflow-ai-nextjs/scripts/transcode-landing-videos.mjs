#!/usr/bin/env node
/**
 * Upload landing hero masters to GCS (public progressive MP4 + optional HLS later).
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS_JSON in .env.local
 *   - GCS_LANDING_VIDEO_BUCKET (default: sceneflow-assets)
 *
 * Usage:
 *   node scripts/transcode-landing-videos.mjs --locale en
 *   node scripts/transcode-landing-videos.mjs --batch
 *   node scripts/transcode-landing-videos.mjs --locale en --input ./SceneFlow\ Hero\ Video.mp4
 *
 * Output layout:
 *   gs://{bucket}/hero/{locale}/master.mp4
 *   gs://{bucket}/hero/{locale}/hls/manifest.m3u8  (Transcoder stub — later)
 *   gs://{bucket}/hero/{locale}/poster.jpg
 *
 * After upload, set:
 *   NEXT_PUBLIC_LANDING_VIDEO_CDN=https://storage.googleapis.com/sceneflow-assets
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { Storage } from '@google-cloud/storage'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const HERO_LOCALES = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th']
const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'
/** Must match HERO_VIDEO_BLOB_PATHS in heroVideoLocales.ts */
const BLOB_PATHS = {
  en: 'SceneFlow Hero Video.mp4',
  es: 'Hero Video (Spanish) .mp4',
  pt: 'Hero Video (Portuguese).mp4',
  hi: 'Hero Video (Hindi).mp4',
  zh: 'Hero Video (Chinese).mp4',
  ar: 'Hero Video (Arabic) .mp4',
  th: 'Hero Video (Thai) .mp4',
}

function getStorage() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is required for GCS upload')
  }
  const credentials = JSON.parse(credentialsJson)
  return new Storage({ credentials, projectId: credentials.project_id })
}

function parseArgs() {
  const localeIdx = process.argv.indexOf('--locale')
  const locale = localeIdx >= 0 ? process.argv[localeIdx + 1] : null
  const inputIdx = process.argv.indexOf('--input')
  const input = inputIdx >= 0 ? process.argv[inputIdx + 1] : null
  const batch = process.argv.includes('--batch')
  return { locale, input, batch }
}

function remuxFaststart(inputPath) {
  const outPath = inputPath.replace(/\.mp4$/i, '.faststart.mp4')
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-i', inputPath, '-c', 'copy', '-movflags', '+faststart', outPath],
    { stdio: 'inherit' }
  )
  if (result.status !== 0 || !existsSync(outPath)) {
    console.warn('  ffmpeg faststart remux failed — uploading original')
    return inputPath
  }
  console.log('  Remuxed with +faststart')
  return outPath
}

async function uploadMaster(bucket, locale, localPath) {
  const dest = `hero/${locale}/master.mp4`
  const uploadPath = remuxFaststart(localPath)
  await bucket.upload(uploadPath, {
    destination: dest,
    metadata: { contentType: 'video/mp4', cacheControl: 'public, max-age=31536000' },
  })
  console.log(`  Uploaded gs://${bucket.name}/${dest}`)
  return `gs://${bucket.name}/${dest}`
}

async function uploadPoster(bucket, locale) {
  const publicPoster = join(ROOT, 'public/landing/hero', `sceneflow-hero-${locale}-poster.jpg`)
  let buf
  if (existsSync(publicPoster)) {
    const { readFileSync } = await import('fs')
    buf = readFileSync(publicPoster)
  } else {
    const posterUrl = `${BLOB_HOST}/landing/hero/sceneflow-hero-${locale}-poster.jpg`
    const res = await fetch(posterUrl)
    if (!res.ok) throw new Error(`Poster fetch failed ${locale}: ${res.status}`)
    buf = Buffer.from(await res.arrayBuffer())
  }
  const dest = `hero/${locale}/poster.jpg`
  await bucket.file(dest).save(buf, {
    contentType: 'image/jpeg',
    metadata: { cacheControl: 'public, max-age=31536000' },
  })
  console.log(`  Uploaded gs://${bucket.name}/${dest}`)
}

/**
 * Submit a Transcoder API job for HLS adaptive ladder.
 * Requires @google-cloud/video-transcoder (install when HLS is enabled).
 */
async function submitTranscoderJob(projectId, location, inputUri, outputUri) {
  console.log('  Transcoder API job (optional — HLS gated by NEXT_PUBLIC_LANDING_VIDEO_HLS):')
  console.log(`    input:  ${inputUri}`)
  console.log(`    output: ${outputUri}`)
  console.log('    renditions: 360p / 720p / 1080p H.264 + AAC → HLS manifest.m3u8')
}

async function processLocale(storage, bucketName, locale, inputPath) {
  const bucket = storage.bucket(bucketName)
  console.log(`\n=== ${locale} ===`)

  let masterPath = inputPath
  if (!masterPath) {
    const blobPath = BLOB_PATHS[locale]
    if (!blobPath) throw new Error(`Unknown locale: ${locale}`)
    console.log(`  Downloading master from Blob: ${locale}`)
    const res = await fetch(`${BLOB_HOST}/${encodeURI(blobPath)}`)
    if (!res.ok) throw new Error(`Blob download failed: ${res.status}`)
    const tmp = join(ROOT, 'tmp', `hero-${locale}-master.mp4`)
    mkdirSync(dirname(tmp), { recursive: true })
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()))
    masterPath = tmp
  }

  if (!existsSync(masterPath)) {
    throw new Error(`Input not found: ${masterPath}`)
  }

  const inputUri = await uploadMaster(bucket, locale, masterPath)
  await uploadPoster(bucket, locale)

  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  const projectId = credentials.project_id
  const location = process.env.GCP_TRANSCODER_LOCATION || 'us-central1'
  const outputUri = `gs://${bucketName}/hero/${locale}/hls/`

  await submitTranscoderJob(projectId, location, inputUri, outputUri)

  console.log(`  Public MP4: https://storage.googleapis.com/${bucketName}/hero/${locale}/master.mp4`)
}

async function main() {
  const { locale, input, batch } = parseArgs()
  const bucketName = process.env.GCS_LANDING_VIDEO_BUCKET || 'sceneflow-assets'
  const storage = getStorage()

  console.log(`Landing video bucket: gs://${bucketName}`)
  console.log(
    `Set NEXT_PUBLIC_LANDING_VIDEO_CDN=https://storage.googleapis.com/${bucketName}`
  )

  if (batch) {
    for (const code of HERO_LOCALES) {
      await processLocale(storage, bucketName, code, null)
    }
    return
  }

  if (!locale) {
    console.error('Usage: --locale en [--input path]  OR  --batch')
    process.exit(1)
  }

  await processLocale(storage, bucketName, locale, input)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
