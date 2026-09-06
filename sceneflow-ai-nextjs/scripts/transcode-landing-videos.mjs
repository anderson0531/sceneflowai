#!/usr/bin/env node
/**
 * Transcode landing hero videos to adaptive HLS on Google Cloud Storage.
 *
 * Prerequisites (GCP account live):
 *   - GOOGLE_APPLICATION_CREDENTIALS_JSON in .env.local
 *   - GCS_LANDING_VIDEO_BUCKET (default: sceneflow-landing-videos)
 *   - Transcoder API enabled on the project
 *
 * Usage:
 *   node scripts/transcode-landing-videos.mjs --locale en
 *   node scripts/transcode-landing-videos.mjs --batch
 *   node scripts/transcode-landing-videos.mjs --locale en --input ./Hero\ Video\ \(English\).mp4
 *
 * Output layout:
 *   gs://{bucket}/hero/{locale}/master.mp4
 *   gs://{bucket}/hero/{locale}/hls/manifest.m3u8
 *   gs://{bucket}/hero/{locale}/poster.jpg
 *
 * After upload, set NEXT_PUBLIC_LANDING_VIDEO_CDN to your Cloud CDN URL.
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { Storage } from '@google-cloud/storage'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const HERO_LOCALES = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th']
const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'
const BLOB_PATHS = {
  en: 'Hero%20Video%20(English).mp4',
  es: 'Hero%20Video%20(Spanish).mp4',
  pt: 'Hero%20Video%20(Portuguese).mp4',
  hi: 'Hero%20Video%20(Hindi).mp4',
  zh: 'Hero%20Video%20(Chinese).mp4',
  ar: 'Hero%20Video%20(Arabic)%20.mp4',
  th: 'Hero%20Video%20(Thai)%20.mp4',
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

async function uploadMaster(bucket, locale, localPath) {
  const dest = `hero/${locale}/master.mp4`
  await bucket.upload(localPath, {
    destination: dest,
    metadata: { contentType: 'video/mp4', cacheControl: 'public, max-age=31536000' },
  })
  console.log(`  Uploaded gs://${bucket.name}/${dest}`)
  return `gs://${bucket.name}/${dest}`
}

async function uploadPosterFromBlob(bucket, locale) {
  const posterUrl = `${BLOB_HOST}/landing/hero/sceneflow-hero-${locale}-poster.jpg`
  const res = await fetch(posterUrl)
  if (!res.ok) throw new Error(`Poster fetch failed ${locale}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const dest = `hero/${locale}/poster.jpg`
  await bucket.file(dest).save(buf, {
    contentType: 'image/jpeg',
    metadata: { cacheControl: 'public, max-age=31536000' },
  })
  console.log(`  Uploaded gs://${bucket.name}/${dest}`)
}

/**
 * Submit a Transcoder API job for HLS adaptive ladder.
 * Requires @google-cloud/video-transcoder (install when GCP is live).
 */
async function submitTranscoderJob(projectId, location, inputUri, outputUri) {
  console.log('  Transcoder API job (configure when GCP account is live):')
  console.log(`    input:  ${inputUri}`)
  console.log(`    output: ${outputUri}`)
  console.log('    renditions: 360p / 720p / 1080p H.264 + AAC → HLS manifest.m3u8')
  console.log('')
  console.log('  Enable: gcloud services enable transcoder.googleapis.com')
  console.log('  Then wire @google-cloud/video-transcoder TranscoderServiceClient.createJob()')
  console.log('  with elementaryStreams + muxStreams per Google Transcoder HLS template.')
}

async function processLocale(storage, bucketName, locale, inputPath) {
  const bucket = storage.bucket(bucketName)
  console.log(`\n=== ${locale} ===`)

  let masterPath = inputPath
  if (!masterPath) {
    const blobPath = BLOB_PATHS[locale]
    if (!blobPath) throw new Error(`Unknown locale: ${locale}`)
    console.log(`  Downloading master from Blob: ${locale}`)
    const res = await fetch(`${BLOB_HOST}/${blobPath}`)
    if (!res.ok) throw new Error(`Blob download failed: ${res.status}`)
    const tmp = join(ROOT, 'tmp', `hero-${locale}-master.mp4`)
    const { mkdirSync, writeFileSync } = await import('fs')
    mkdirSync(dirname(tmp), { recursive: true })
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()))
    masterPath = tmp
  }

  if (!existsSync(masterPath)) {
    throw new Error(`Input not found: ${masterPath}`)
  }

  const inputUri = await uploadMaster(bucket, locale, masterPath)
  await uploadPosterFromBlob(bucket, locale)

  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  const projectId = credentials.project_id
  const location = process.env.GCP_TRANSCODER_LOCATION || 'us-central1'
  const outputUri = `gs://${bucketName}/hero/${locale}/hls/`

  await submitTranscoderJob(projectId, location, inputUri, outputUri)

  console.log(`  CDN manifest (after transcode): hero/${locale}/hls/manifest.m3u8`)
}

async function main() {
  const { locale, input, batch } = parseArgs()
  const bucketName = process.env.GCS_LANDING_VIDEO_BUCKET || 'sceneflow-landing-videos'
  const storage = getStorage()

  console.log(`Landing video bucket: gs://${bucketName}`)
  console.log(`Set NEXT_PUBLIC_LANDING_VIDEO_CDN to your Cloud CDN base URL after deploy.`)

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
