#!/usr/bin/env node

/**
 * Upload Living Wall demo to Vercel Blob for the K-12 use case example.
 *
 * Usage:
 *   node scripts/migrate-living-wall-to-blob.mjs "/path/to/Living Wall 4.mp4"
 *   node scripts/migrate-living-wall-to-blob.mjs --from-gcs
 */

import { put } from '@vercel/blob'
import { Storage } from '@google-cloud/storage'
import { config } from 'dotenv'
import { createWriteStream, mkdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })
config({ path: join(ROOT, '.env.development.local') })

const BLOB_PATH = 'demo/use-cases/knowledge/k12-higher-ed.mp4'
const GCS_OBJECT = 'demo/living-wall.mp4'
const TMP_PATH = join(ROOT, '.tmp/living-wall.mp4')

async function loadFromGcs() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is required to read from GCS')
  }

  const credentials = JSON.parse(credentialsJson)
  const storage = new Storage({
    credentials,
    projectId: credentials.project_id,
  })

  mkdirSync(dirname(TMP_PATH), { recursive: true })
  console.log(`Downloading gs://sceneflow-assets/${GCS_OBJECT} ...`)

  await pipeline(
    storage.bucket('sceneflow-assets').file(GCS_OBJECT).createReadStream(),
    createWriteStream(TMP_PATH)
  )

  return readFileSync(TMP_PATH)
}

async function main() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) {
    console.error('BLOB_READ_WRITE_TOKEN is required')
    process.exit(1)
  }

  const localPath = process.argv.find((arg) => !arg.startsWith('-') && arg.endsWith('.mp4'))
  const fromGcs = process.argv.includes('--from-gcs')

  let buffer
  if (localPath) {
    console.log(`Reading local file: ${localPath}`)
    buffer = readFileSync(localPath)
  } else if (fromGcs) {
    buffer = await loadFromGcs()
  } else {
    console.error('Usage: node scripts/migrate-living-wall-to-blob.mjs "/path/to/video.mp4"')
    console.error('       node scripts/migrate-living-wall-to-blob.mjs --from-gcs')
    process.exit(1)
  }

  console.log(`Uploading ${(buffer.length / 1024 / 1024).toFixed(1)} MB to Blob: ${BLOB_PATH} ...`)

  const blob = await put(BLOB_PATH, buffer, {
    access: 'public',
    contentType: 'video/mp4',
    token: blobToken,
    allowOverwrite: true,
  })

  console.log('Blob URL:', blob.url)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
