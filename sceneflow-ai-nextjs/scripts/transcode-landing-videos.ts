/**
 * Transcode landing hero videos to adaptive HLS on Google Cloud Storage.
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS_JSON
 *   - Transcoder API enabled: gcloud services enable transcoder.googleapis.com
 *   - Bucket + CORS + Transcoder IAM: npm run landing:setup-hero-cdn
 *
 * Usage:
 *   npx tsx scripts/transcode-landing-videos.ts --locale en
 *   npx tsx scripts/transcode-landing-videos.ts --batch
 *   npx tsx scripts/transcode-landing-videos.ts --locale en --input ./master.mp4
 *   npx tsx scripts/transcode-landing-videos.ts --locale en --dry-run
 *
 * Output:
 *   gs://{bucket}/hero/{locale}/master.mp4
 *   gs://{bucket}/hero/{locale}/hls/manifest.m3u8
 *   gs://{bucket}/hero/{locale}/hls/fallback-720p.mp4
 *
 * Then set NEXT_PUBLIC_LANDING_VIDEO_CDN (GCS HTTPS or Cloud CDN host) and redeploy.
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { Storage, type Bucket } from '@google-cloud/storage'
import { TranscoderServiceClient } from '@google-cloud/video-transcoder'
import {
  HERO_VIDEO_BLOB_HOST,
  HERO_VIDEO_BLOB_PATHS,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import {
  buildHeroHlsJob,
  heroHlsManifestObject,
  heroHlsObjectPrefix,
} from '@/lib/landing/heroHlsJobConfig'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const HERO_LOCALES = Object.keys(HERO_VIDEO_BLOB_PATHS) as HeroVideoLocaleId[]

type ServiceAccount = {
  project_id: string
  client_email?: string
}

function readCredentials(): ServiceAccount {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is required')
  }
  return JSON.parse(credentialsJson) as ServiceAccount
}

function getStorage(credentials: ServiceAccount): Storage {
  return new Storage({ credentials, projectId: credentials.project_id })
}

function getTranscoder(credentials: ServiceAccount): TranscoderServiceClient {
  return new TranscoderServiceClient({
    credentials,
    projectId: credentials.project_id,
  })
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const flag = (name: string): string | undefined => {
    const idx = argv.indexOf(name)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  return {
    locale: flag('--locale') as HeroVideoLocaleId | undefined,
    input: flag('--input'),
    batch: argv.includes('--batch'),
    dryRun: argv.includes('--dry-run'),
    skipUpload: argv.includes('--skip-upload'),
    skipTranscode: argv.includes('--skip-transcode'),
    noWait: argv.includes('--no-wait'),
  }
}

async function downloadBlobMaster(locale: HeroVideoLocaleId): Promise<string> {
  const blobPath = HERO_VIDEO_BLOB_PATHS[locale]
  if (!blobPath) throw new Error(`Unknown locale: ${locale}`)
  const url = `${HERO_VIDEO_BLOB_HOST}/${encodeURI(blobPath)}`
  console.log(`  Downloading 4K master from Blob: ${blobPath}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Blob download failed ${locale}: ${res.status} ${url}`)
  }
  const tmp = join(ROOT, 'tmp', `hero-${locale}-master.mp4`)
  mkdirSync(dirname(tmp), { recursive: true })
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp))
  return tmp
}

async function uploadMaster(
  bucket: Bucket,
  locale: string,
  localPath: string
): Promise<string> {
  const dest = `hero/${locale}/master.mp4`
  await bucket.upload(localPath, {
    destination: dest,
    resumable: true,
    metadata: { contentType: 'video/mp4', cacheControl: 'public, max-age=31536000' },
  })
  console.log(`  Uploaded gs://${bucket.name}/${dest}`)
  return `gs://${bucket.name}/${dest}`
}

async function uploadPosterFromSite(bucket: Bucket, locale: string): Promise<void> {
  const posterUrl = `https://sceneflowai.studio/landing/hero/sceneflow-hero-${locale}-poster.jpg`
  const res = await fetch(posterUrl)
  if (!res.ok) {
    console.warn(`  Poster skip ${locale}: ${res.status} ${posterUrl}`)
    return
  }
  const dest = `hero/${locale}/poster.jpg`
  await bucket.file(dest).save(Buffer.from(await res.arrayBuffer()), {
    contentType: 'image/jpeg',
    metadata: { cacheControl: 'public, max-age=31536000' },
  })
  console.log(`  Uploaded gs://${bucket.name}/${dest}`)
}

function jobStateName(state: unknown): string {
  if (typeof state === 'string') return state
  const names = ['UNSPECIFIED', 'PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']
  if (typeof state === 'number' && names[state]) return names[state]
  return String(state)
}

async function waitForJob(
  client: TranscoderServiceClient,
  name: string
): Promise<void> {
  const timeoutMs = 45 * 60 * 1000
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const [job] = await client.getJob({ name })
    const state = jobStateName(job.state)
    console.log(`  Transcoder ${state} (${name})`)
    if (state === 'SUCCEEDED') return
    if (state === 'FAILED') {
      const message = job.error?.message || JSON.stringify(job.error) || 'unknown error'
      throw new Error(`Transcoder job failed: ${message}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000))
  }
  throw new Error(`Transcoder job timed out: ${name}`)
}

async function submitTranscoderJob(args: {
  client: TranscoderServiceClient
  projectId: string
  location: string
  inputUri: string
  outputUri: string
  wait: boolean
}): Promise<string> {
  const job = buildHeroHlsJob(args.inputUri, args.outputUri)
  const parent = args.client.locationPath(args.projectId, args.location)
  const [created] = await args.client.createJob({ parent, job })
  if (!created.name) throw new Error('Transcoder createJob returned no job name')
  console.log(`  Submitted ${created.name}`)
  if (args.wait) {
    await waitForJob(args.client, created.name)
  }
  return created.name
}

async function processLocale(args: {
  storage?: Storage
  transcoder?: TranscoderServiceClient
  credentials?: ServiceAccount
  bucketName: string
  location: string
  locale: HeroVideoLocaleId
  inputPath?: string
  dryRun: boolean
  skipUpload: boolean
  skipTranscode: boolean
  wait: boolean
}): Promise<void> {
  console.log(`\n=== ${args.locale} ===`)

  const outputUri = `gs://${args.bucketName}/${heroHlsObjectPrefix(args.locale)}/`
  const inputUri = `gs://${args.bucketName}/hero/${args.locale}/master.mp4`

  if (args.dryRun) {
    const job = buildHeroHlsJob(inputUri, outputUri)
    console.log(JSON.stringify(job, null, 2))
    console.log(`  CDN manifest: ${heroHlsManifestObject(args.locale)}`)
    return
  }

  if (!args.skipUpload) {
    if (!args.storage) throw new Error('Storage client required unless --dry-run')
    const bucket = args.storage.bucket(args.bucketName)
    const masterPath = args.inputPath || (await downloadBlobMaster(args.locale))
    if (!existsSync(masterPath)) {
      throw new Error(`Input not found: ${masterPath}`)
    }
    await uploadMaster(bucket, args.locale, masterPath)
    await uploadPosterFromSite(bucket, args.locale)
  }

  if (!args.skipTranscode) {
    if (!args.transcoder || !args.credentials) {
      throw new Error('Transcoder credentials required unless --dry-run')
    }
    await submitTranscoderJob({
      client: args.transcoder,
      projectId: args.credentials.project_id,
      location: args.location,
      inputUri,
      outputUri,
      wait: args.wait,
    })
  }

  console.log(`  HLS: gs://${args.bucketName}/${heroHlsManifestObject(args.locale)}`)
}

async function main(): Promise<void> {
  const flags = parseArgs()
  const bucketName = process.env.GCS_LANDING_VIDEO_BUCKET || 'sceneflow-landing-videos'
  const location = process.env.GCP_TRANSCODER_LOCATION || 'us-central1'
  const credentials = flags.dryRun ? undefined : readCredentials()

  console.log(`Landing video bucket: gs://${bucketName}`)
  console.log(`Transcoder location: ${location}`)
  console.log(
    'After SUCCEEDED, set NEXT_PUBLIC_LANDING_VIDEO_CDN to your Cloud CDN host or https://storage.googleapis.com/' +
      bucketName
  )

  if (!flags.batch && !flags.locale) {
    console.error('Usage: --locale en [--input path] [--dry-run]  OR  --batch')
    process.exit(1)
  }

  const storage = credentials ? getStorage(credentials) : undefined
  const transcoder = credentials ? getTranscoder(credentials) : undefined
  const locales = flags.batch ? HERO_LOCALES : [flags.locale!]

  try {
    for (const locale of locales) {
      if (!HERO_VIDEO_BLOB_PATHS[locale]) {
        throw new Error(`Unknown locale: ${locale}`)
      }
      await processLocale({
        storage,
        transcoder,
        credentials,
        bucketName,
        location,
        locale,
        inputPath: flags.input,
        dryRun: flags.dryRun,
        skipUpload: flags.skipUpload,
        skipTranscode: flags.skipTranscode,
        wait: !flags.noWait,
      })
    }
  } finally {
    await transcoder?.close()
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
