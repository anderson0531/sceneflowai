#!/usr/bin/env node
/**
 * Publish locale-dubbed hero files into public/ for the full-viewport player.
 *
 * Prefers the 1080p Blob web encode when it exists; otherwise downloads the
 * 4K Blob master and encodes 1080p. Writes:
 *
 *   public/videos/hero-{locale}.mp4
 *   public/videos/hero-{locale}.webm
 *   public/images/hero-poster-{locale}.webp
 *   public/images/hero-poster.webp  (English copy)
 *
 * Each video must stay under 95MB (GitHub 100MB hard limit).
 *
 * Usage:
 *   node scripts/publish-hero-public-assets.mjs
 *   node scripts/publish-hero-public-assets.mjs --locale en
 */

import { createWriteStream, copyFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import ffmpegStatic from 'ffmpeg-static'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'
const MAX_VIDEO_BYTES = 95 * 1024 * 1024
const POSTER_TIMESTAMP = '00:00:02'

/** Must match HERO_VIDEO_BLOB_PATHS in src/config/landing/heroVideoLocales.ts */
const MASTERS = {
  en: 'SceneFlow Hero Video.mp4',
  es: 'Hero Video (Spanish).mp4',
  pt: 'Hero Video (Portuguese).mp4',
  hi: 'Hero Video (Hindi).mp4',
  zh: 'Hero Video (Chinese).mp4',
  ar: 'Hero Video (Arabic).mp4',
  th: 'Hero Video (Thai).mp4',
}

/** Must match HERO_VIDEO_WEB_1080P_PATHS */
const WEB_1080P = {
  en: 'landing/hero/sceneflow-hero-en-1080p.mp4',
  es: 'landing/hero/sceneflow-hero-es-1080p.mp4',
  pt: 'landing/hero/sceneflow-hero-pt-1080p.mp4',
  hi: 'landing/hero/sceneflow-hero-hi-1080p.mp4',
  zh: 'landing/hero/sceneflow-hero-zh-1080p.mp4',
  ar: 'landing/hero/sceneflow-hero-ar-1080p.mp4',
  th: 'landing/hero/sceneflow-hero-th-1080p.mp4',
}

const LOCALES = Object.keys(MASTERS)

function parseArgs(argv) {
  const idx = argv.indexOf('--locale')
  return { locale: idx >= 0 ? argv[idx + 1] : undefined }
}

function resolveFfmpeg() {
  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic
  return 'ffmpeg'
}

function blobUrl(path) {
  return `${BLOB_HOST}/${encodeURI(path)}`
}

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

async function blobExists(path) {
  const res = await fetch(blobUrl(path), { method: 'HEAD' })
  return res.ok
}

async function download(path, dest) {
  mkdirSync(dirname(dest), { recursive: true })
  const url = blobUrl(path)
  console.log(`  Downloading ${path}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Blob download failed ${res.status}: ${url}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
  console.log(`  Saved ${dest} (${formatBytes(statSync(dest).size)})`)
  return dest
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
  console.log(`  ${filePath} → ${formatBytes(size)}`)
  if (size >= MAX_VIDEO_BYTES) {
    throw new Error(
      `${filePath} is ${formatBytes(size)} (>= 95MB). Re-encode leaner before committing.`
    )
  }
}

function encodeMp4(inputPath, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true })
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
      outputPath,
    ],
    `mp4 → ${outputPath}`
  )
  assertUnderLimit(outputPath)
}

function encodeWebm(inputPath, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true })
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
      outputPath,
    ],
    `webm → ${outputPath}`
  )
  assertUnderLimit(outputPath)
}

function extractPoster(inputPath, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true })
  runFfmpeg(
    [
      '-y',
      '-ss',
      POSTER_TIMESTAMP,
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-c:v',
      'libwebp',
      '-quality',
      '80',
      outputPath,
    ],
    `poster → ${outputPath}`
  )
}

async function resolveSource(locale) {
  const tmp = join(ROOT, 'tmp', 'hero-public', `${locale}-source.mp4`)
  if (await blobExists(WEB_1080P[locale])) {
    await download(WEB_1080P[locale], tmp)
    return { path: tmp, cleanup: true }
  }
  console.log(`  1080p web encode missing; using 4K master`)
  await download(MASTERS[locale], tmp)
  return { path: tmp, cleanup: true }
}

async function processLocale(locale) {
  console.log(`\n=== ${locale} ===`)
  if (!MASTERS[locale]) throw new Error(`Unknown locale: ${locale}`)

  const source = await resolveSource(locale)
  const mp4 = join(ROOT, 'public', 'videos', `hero-${locale}.mp4`)
  const webm = join(ROOT, 'public', 'videos', `hero-${locale}.webm`)
  const poster = join(ROOT, 'public', 'images', `hero-poster-${locale}.webp`)

  try {
    encodeMp4(source.path, mp4)
    encodeWebm(source.path, webm)
    extractPoster(source.path, poster)
  } finally {
    if (source.cleanup && existsSync(source.path)) {
      unlinkSync(source.path)
    }
  }
}

async function main() {
  const { locale } = parseArgs(process.argv.slice(2))
  const locales = locale ? [locale] : LOCALES
  if (locale && !MASTERS[locale]) {
    console.error(`Unknown locale: ${locale}`)
    process.exit(1)
  }

  mkdirSync(join(ROOT, 'public', 'videos'), { recursive: true })
  mkdirSync(join(ROOT, 'public', 'images'), { recursive: true })

  for (const code of locales) {
    await processLocale(code)
  }

  const enPoster = join(ROOT, 'public', 'images', 'hero-poster-en.webp')
  const fallback = join(ROOT, 'public', 'images', 'hero-poster.webp')
  if (existsSync(enPoster)) {
    copyFileSync(enPoster, fallback)
    console.log(`\nCopied English poster → ${fallback}`)
  }

  console.log('\nDone.')
}

const launchedDirectly =
  process.argv[1] && process.argv[1].endsWith('publish-hero-public-assets.mjs')

if (launchedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
