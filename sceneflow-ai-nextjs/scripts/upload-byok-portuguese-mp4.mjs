#!/usr/bin/env node
/**
 * Upload a web-encoded BYOK Portuguese master to Vercel Blob.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... node scripts/upload-byok-portuguese-mp4.mjs [path/to/BYOK-Portuguese.mp4]
 *
 * Blob pathname: BYOK (Portuguese).mp4 (blob root, contentType video/mp4, allowOverwrite)
 *
 * Landing currently serves the full-bitrate Blob master. Upload a lean web
 * encode here when available so visitors are not served the ~100MB file.
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { put } from '@vercel/blob'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

config({ path: join(PROJECT_ROOT, '.env.vercel.local') })
config({ path: join(PROJECT_ROOT, '.env.local') })

const BLOB_PATH = 'BYOK (Portuguese).mp4'
const DEFAULT_LOCAL = join(PROJECT_ROOT, 'public/landing/key-features/BYOK-Portuguese.mp4')

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN not set (use .env.local or .env.vercel.local)')
    process.exit(1)
  }

  const localPath = resolve(process.argv[2] || DEFAULT_LOCAL)
  if (!existsSync(localPath)) {
    console.error(`File not found: ${localPath}`)
    process.exit(1)
  }

  const buffer = readFileSync(localPath)
  console.log(`Uploading ${localPath} (${buffer.length} bytes) → ${BLOB_PATH}`)

  const blob = await put(BLOB_PATH, buffer, {
    access: 'public',
    token,
    contentType: 'video/mp4',
    allowOverwrite: true,
    addRandomSuffix: false,
  })

  console.log(`Uploaded: ${blob.url}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
