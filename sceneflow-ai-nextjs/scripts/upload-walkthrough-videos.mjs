#!/usr/bin/env node
/**
 * Upload platform walkthrough clips to Vercel Blob.
 *
 * Usage:
 *   node scripts/upload-walkthrough-videos.mjs --dry-run
 *   node scripts/upload-walkthrough-videos.mjs --id trust-safety
 *   node scripts/upload-walkthrough-videos.mjs --all
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env.local
 */

import { put } from '@vercel/blob'
import { readFileSync, existsSync } from 'fs'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

config({ path: path.join(ROOT, '.env.local') })
config({ path: path.join(ROOT, '.env.vercel.local') })

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
const BLOB = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

/** id → { blobPath, localPath, note } */
const WALKTHROUGH_UPLOADS = {
  'platform-overview': {
    blobPath: 'walkthrough/PlatformOverview.mp4',
    localPath: null,
    fallbackBlob: `${BLOB}/One%20Platform%20.mp4`,
    note: 'Record new 90s overview; interim uses One Platform clip via featureStoryboardMedia id 1',
  },
  'trust-safety': {
    blobPath: 'walkthrough/TrustSafety.mp4',
    localPath: '.tmp/use-case-demos/trust-validation-workflow.mp4',
    note: 'Trust validation workflow stock clip — replace with in-app trust tour when recorded',
  },
  production: {
    blobPath: 'walkthrough/Production.mp4',
    localPath: null,
    fallbackBlob: `${BLOB}/Express.mp4`,
    note: 'Replace with beat-first + EXT chain screen recording',
  },
  'final-cut': {
    blobPath: 'walkthrough/FinalCut.mp4',
    localPath: null,
    fallbackBlob: `${BLOB}/Automation%202%20.mp4`,
    note: 'Replace with Final Cut assembly screen recording',
  },
  premiere: {
    blobPath: 'walkthrough/Premiere.mp4',
    localPath: null,
    fallbackBlob: `${BLOB}/Audience%20.mp4`,
    note: 'Replace with Premiere + Screening Room screen recording',
  },
}

async function uploadBuffer(blobPath, buffer, contentType = 'video/mp4') {
  const result = await put(blobPath, buffer, {
    access: 'public',
    contentType,
    token: BLOB_TOKEN,
    allowOverwrite: true,
  })
  return result.url
}

async function uploadEntry(id, dryRun) {
  const entry = WALKTHROUGH_UPLOADS[id]
  if (!entry) {
    console.error(`Unknown id: ${id}`)
    process.exit(1)
  }

  console.log(`\n=== ${id} ===`)
  console.log(`  Note: ${entry.note}`)

  let local = entry.localPath ? path.join(ROOT, entry.localPath) : null
  if (local && !existsSync(local) && entry.fallbackLocal) {
    local = path.join(ROOT, entry.fallbackLocal)
  }

  if (local && existsSync(local)) {
    const buf = readFileSync(local)
    console.log(`  Source: ${local} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`)
    if (dryRun) {
      console.log(`  Would upload → ${entry.blobPath}`)
      return `${BLOB}/${entry.blobPath}`
    }
    const url = await uploadBuffer(entry.blobPath, buf)
    console.log(`  Blob: ${url}`)
    return url
  }

  if (entry.fallbackBlob) {
    console.log(`  No local file — fetching fallback: ${entry.fallbackBlob}`)
    if (dryRun) {
      console.log(`  Would re-upload fallback → ${entry.blobPath}`)
      return `${BLOB}/${entry.blobPath}`
    }
    const res = await fetch(entry.fallbackBlob)
    if (!res.ok) throw new Error(`Fallback fetch failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const url = await uploadBuffer(entry.blobPath, buf)
    console.log(`  Blob: ${url}`)
    return url
  }

  console.log('  Skipped — no source or fallback')
  return null
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const all = args.includes('--all')
  const idIdx = args.indexOf('--id')
  const id = idIdx >= 0 ? args[idIdx + 1] : null

  if (!dryRun && !BLOB_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN not found')
    process.exit(1)
  }

  const ids = all
    ? Object.keys(WALKTHROUGH_UPLOADS).filter((k) => k !== 'platform-overview')
    : id
      ? [id]
      : ['trust-safety', 'production', 'final-cut', 'premiere']

  const results = {}
  for (const walkId of ids) {
    results[walkId] = await uploadEntry(walkId, dryRun)
  }

  console.log('\n--- Summary ---')
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}: ${v ?? 'skipped'}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
