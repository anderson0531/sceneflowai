#!/usr/bin/env node
/**
 * Encode the direct-control (direction) landing walkthrough for git + CDN.
 *
 * Default source: public Blob `Demo.mp4` (upload a replacement before re-running).
 *
 * Writes:
 *   public/landing/primary-value/direction.webm  (1080p VP9 + Opus)
 *   public/landing/primary-value/direction.mp4   (1080p H.264 + AAC)
 *   public/landing/primary-value/direction.webp  (poster at 2s)
 *
 * Usage:
 *   node scripts/publish-primary-value-video.mjs
 *   node scripts/publish-primary-value-video.mjs --source ./master.mp4
 *   node scripts/publish-primary-value-video.mjs --source-url https://example.com/clip.mp4
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'
const DEFAULT_BLOB_PATH = 'Demo.mp4'
const OUT_DIR = join(ROOT, 'public', 'landing', 'primary-value')
const MAX_VIDEO_BYTES = 95 * 1024 * 1024

function parseArgs(argv) {
  const sourceIdx = argv.indexOf('--source')
  const urlIdx = argv.indexOf('--source-url')
  return {
    localSource: sourceIdx >= 0 ? argv[sourceIdx + 1] : undefined,
    sourceUrl: urlIdx >= 0 ? argv[urlIdx + 1] : undefined,
  }
}

function resolveFfmpeg() {
  try {
    const ffmpegStatic = join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg')
    if (existsSync(ffmpegStatic)) return ffmpegStatic
  } catch {
    /* optional dep */
  }
  return 'ffmpeg'
}

function runFfmpeg(args, label) {
  console.log(`  ffmpeg ${label}`)
  const result = spawnSync(resolveFfmpeg(), args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`ffmpeg ${label} failed with status ${result.status}`)
  }
}

function assertUnderLimit(filePath) {
  const size = statSync(filePath).size
  if (size >= MAX_VIDEO_BYTES) {
    throw new Error(`${filePath} is ${(size / (1024 * 1024)).toFixed(1)}MB (>= 95MB)`)
  }
}

async function downloadToTemp(url, dest) {
  mkdirSync(dirname(dest), { recursive: true })
  console.log(`  Downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Download failed ${res.status}: ${url}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

async function resolveInput({ localSource, sourceUrl }) {
  if (localSource) {
    const path = join(ROOT, localSource)
    if (!existsSync(path)) throw new Error(`Missing --source file: ${path}`)
    return path
  }
  const url =
    sourceUrl ?? `${BLOB_HOST}/${encodeURI(DEFAULT_BLOB_PATH)}`
  const tmp = join(ROOT, 'tmp', 'primary-value-source.mp4')
  await downloadToTemp(url, tmp)
  return tmp
}

function encodeAll(inputPath) {
  mkdirSync(OUT_DIR, { recursive: true })
  const mp4 = join(OUT_DIR, 'direction.mp4')
  const webm = join(OUT_DIR, 'direction.webm')
  const poster = join(OUT_DIR, 'direction.webp')

  runFfmpeg(
    [
      '-y',
      '-i',
      inputPath,
      '-vf',
      'scale=-2:1080',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '22',
      '-maxrate',
      '8M',
      '-bufsize',
      '16M',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      mp4,
    ],
    `mp4 → ${mp4}`
  )
  assertUnderLimit(mp4)

  runFfmpeg(
    [
      '-y',
      '-i',
      inputPath,
      '-vf',
      'scale=-2:1080',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '32',
      '-row-mt',
      '1',
      '-cpu-used',
      '4',
      '-deadline',
      'good',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'libopus',
      '-b:a',
      '96k',
      webm,
    ],
    `webm → ${webm}`
  )
  assertUnderLimit(webm)

  runFfmpeg(
    [
      '-y',
      '-ss',
      '00:00:02',
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-c:v',
      'libwebp',
      '-quality',
      '80',
      poster,
    ],
    `poster → ${poster}`
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = await resolveInput(args)
  encodeAll(inputPath)
  console.log('\nDone. URLs are registered in src/config/landing/primaryValueMedia.ts')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
