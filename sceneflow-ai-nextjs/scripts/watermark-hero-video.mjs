#!/usr/bin/env node
/**
 * Burn "SceneFlow AI Studio" into hero MP4s (Production Mixer style) and upload to Vercel Blob.
 *
 * Matches DEFAULT_WATERMARK_CONFIG in SceneProductionMixer.tsx:
 * Inter 500, 3% of video height, white @ 60% opacity, text shadow, bottom-right, 60px padding.
 *
 * Usage:
 *   node scripts/watermark-hero-video.mjs <input.mp4> [--locale en|th|es|zh|ar|hi|pt] [--upload] [--output path]
 *   node scripts/watermark-hero-video.mjs --batch [--upload-posters]
 *
 * Examples:
 *   node scripts/watermark-hero-video.mjs ./SceneFlow\ Hero.mp4 --locale en --upload
 *   node scripts/watermark-hero-video.mjs --batch --upload-posters
 */

import { spawnSync } from 'child_process'
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import ffmpegStatic from 'ffmpeg-static'
import sharp from 'sharp'
import { basename, dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { put } from '@vercel/blob'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const TMP_DIR = join(PROJECT_ROOT, 'tmp/hero-watermark')
const INTER_FONT = join(__dirname, 'assets/Inter-Medium.ttf')

config({ path: join(PROJECT_ROOT, '.env.vercel.local') })
config({ path: join(PROJECT_ROOT, '.env.local') })

const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

/** Mirrors DEFAULT_WATERMARK_CONFIG in SceneProductionMixer.tsx */
const WATERMARK = {
  text: 'SceneFlow AI Studio',
  fontSizePercent: 3,
  fontWeight: 500,
  color: '#FFFFFF',
  opacity: 0.6,
  textShadow: true,
  anchor: 'bottom-right',
  padding: 60,
}

const LOCALE_BLOB_PATHS = {
  en: 'landing/hero/sceneflow-hero-en.mp4',
  th: 'landing/hero/sceneflow-hero-th.mp4',
  es: 'landing/hero/sceneflow-hero-es.mp4',
  zh: 'landing/hero/sceneflow-hero-zh.mp4',
  ar: 'landing/hero/sceneflow-hero-ar.mp4',
  hi: 'landing/hero/sceneflow-hero-hi.mp4',
  pt: 'landing/hero/sceneflow-hero-pt.mp4',
}

/** Root Blob source MP4s — never watermark from landing/hero/* (double-burn). */
const LOCALE_SOURCE_PATHS = {
  en: 'SceneFlow Hero.mp4',
  es: 'SceneFlow Hero (Spanish).mp4',
  pt: 'SceneFlow Hero (Portugese).mp4',
  hi: 'SceneFlow Hero (Hindi) .mp4',
  zh: 'SceneFlow Hero (Chinese).mp4',
  ar: 'SceneFlow Hero (Arabic).mp4',
  th: 'SceneFlow Hero (Thai).mp4',
}

const ALL_LOCALES = Object.keys(LOCALE_BLOB_PATHS)

function parseArgs(argv) {
  const positional = []
  let locale = null
  let upload = false
  let uploadOnly = false
  let output = null
  let batch = false
  let uploadPosters = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--upload-only') {
      uploadOnly = true
      upload = true
    } else if (arg === '--upload') {
      upload = true
    } else if (arg === '--batch') {
      batch = true
      upload = true
    } else if (arg === '--upload-posters') {
      uploadPosters = true
    } else if (arg === '--locale' && argv[i + 1]) {
      locale = argv[++i]
    } else if (arg === '--output' && argv[i + 1]) {
      output = argv[++i]
    } else if (!arg.startsWith('--')) {
      positional.push(arg)
    }
  }

  return { input: positional[0], locale, upload, uploadOnly, output, batch, uploadPosters }
}

function resolveFfmpegBinary() {
  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic
  return 'ffmpeg'
}

function probeVideo(inputPath) {
  const ffmpegBin = resolveFfmpegBinary()
  const result = spawnSync(ffmpegBin, ['-hide_banner', '-i', inputPath], {
    encoding: 'utf8',
  })
  const output = `${result.stderr || ''}${result.stdout || ''}`
  const match = output.match(/,\s*(\d{2,5})x(\d{2,5})(?:\s|,|\[)/)
  if (!match) {
    throw new Error(`Could not probe video dimensions: ${inputPath}`)
  }
  return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) }
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Full-frame transparent PNG with Mixer-style text watermark. */
async function createWatermarkPng(outPath, { width, height }) {
  if (!existsSync(INTER_FONT)) {
    throw new Error(`Inter font not found: ${INTER_FONT}`)
  }

  const fontSize = Math.max(12, Math.round((WATERMARK.fontSizePercent / 100) * height))
  const padding = WATERMARK.padding
  const fontUrl = `file://${INTER_FONT.replace(/\\/g, '/')}`
  const shadowFilter = WATERMARK.textShadow
    ? `<filter id="wmShadow" x="-50%" y="-50%" width="200%" height="200%">
         <feDropShadow dx="2" dy="2" stdDeviation="1" flood-color="#000000" flood-opacity="0.5"/>
       </filter>`
    : ''
  const shadowAttr = WATERMARK.textShadow ? ' filter="url(#wmShadow)"' : ''

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Inter';
        src: url('${fontUrl}') format('truetype');
        font-weight: ${WATERMARK.fontWeight};
      }
    </style>
    ${shadowFilter}
  </defs>
  <text
    x="${width - padding}"
    y="${height - padding}"
    text-anchor="end"
    dominant-baseline="text-after-edge"
    font-family="Inter, sans-serif"
    font-size="${fontSize}"
    font-weight="${WATERMARK.fontWeight}"
    fill="rgba(255,255,255,${WATERMARK.opacity})"
    ${shadowAttr.trim()}
  >${escapeXml(WATERMARK.text)}</text>
</svg>`

  await sharp(Buffer.from(svg)).png().toFile(outPath)
  return outPath
}

async function watermarkVideo(inputPath, outputPath) {
  const { width, height } = probeVideo(inputPath)
  const tmpDir = mkdtempSync(join(tmpdir(), 'sf-hero-wm-'))
  const watermarkPng = join(tmpDir, 'watermark.png')
  await createWatermarkPng(watermarkPng, { width, height })

  const ffmpegBin = resolveFfmpegBinary()
  console.log(`Using ffmpeg: ${ffmpegBin}`)
  console.log(`Video: ${width}x${height}, watermark PNG: ${watermarkPng}`)

  const filterComplex = '[1:v]format=rgba[wm];[0:v][wm]overlay=0:0'

  const result = spawnSync(
    ffmpegBin,
    [
      '-y',
      '-i',
      inputPath,
      '-i',
      watermarkPng,
      '-filter_complex',
      filterComplex,
      '-c:v',
      'libx264',
      '-crf',
      '18',
      '-preset',
      'medium',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    { stdio: 'inherit' }
  )

  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with code ${result.status}`)
  }

  console.log('Wrote:', outputPath)
  return outputPath
}

function extractPoster(videoPath, posterPath) {
  const ffmpegBin = resolveFfmpegBinary()
  const result = spawnSync(
    ffmpegBin,
    ['-y', '-ss', '0.5', '-i', videoPath, '-frames:v', '1', '-q:v', '2', posterPath],
    { stdio: 'inherit' }
  )
  if (result.status !== 0) {
    throw new Error(`Poster extraction failed with code ${result.status}`)
  }
  console.log('Poster:', posterPath)
  return posterPath
}

async function downloadSource(locale, destPath) {
  const sourcePath = LOCALE_SOURCE_PATHS[locale]
  if (!sourcePath) {
    throw new Error(`No source path for locale "${locale}"`)
  }
  const url = `${BLOB_HOST}/${encodeURI(sourcePath)}`
  console.log(`Downloading ${locale} source: ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  writeFileSync(destPath, buffer)
  console.log(`Saved: ${destPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
}

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN not set (use .env.vercel.local)')
  }
  return token
}

async function uploadToBlob(filePath, locale) {
  const token = getBlobToken()
  const blobPath = LOCALE_BLOB_PATHS[locale]
  if (!blobPath) {
    throw new Error(`Unknown locale "${locale}". Use: ${ALL_LOCALES.join(', ')}`)
  }

  const buffer = readFileSync(filePath)
  console.log('Uploading to Blob:', blobPath, `(${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)

  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType: 'video/mp4',
    token,
    allowOverwrite: true,
  })

  console.log('Blob URL:', blob.url)
  return blob.url
}

async function uploadPosterToBlob(filePath, locale) {
  const token = getBlobToken()
  const blobPath = `landing/hero/sceneflow-hero-${locale}-poster.jpg`
  const buffer = readFileSync(filePath)
  console.log('Uploading poster:', blobPath, `(${(buffer.length / 1024).toFixed(1)} KB)`)

  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
    token,
    allowOverwrite: true,
  })

  console.log('Poster URL:', blob.url)
  return blob.url
}

async function processLocale(locale, { uploadPosters }) {
  mkdirSync(TMP_DIR, { recursive: true })
  const sourcePath = join(TMP_DIR, `hero-${locale}-source.mp4`)
  const outputPath = join(TMP_DIR, `sceneflow-hero-${locale}.mp4`)
  const posterPath = join(TMP_DIR, `sceneflow-hero-${locale}-poster.jpg`)

  console.log(`\n=== Locale: ${locale} ===`)
  await downloadSource(locale, sourcePath)
  await watermarkVideo(sourcePath, outputPath)
  await uploadToBlob(outputPath, locale)

  if (uploadPosters) {
    extractPoster(outputPath, posterPath)
    await uploadPosterToBlob(posterPath, locale)
  }
}

async function runBatch({ uploadPosters }) {
  for (const locale of ALL_LOCALES) {
    await processLocale(locale, { uploadPosters })
  }
  console.log('\nBatch complete for all locales:', ALL_LOCALES.join(', '))
}

async function run() {
  const { input, locale, upload, uploadOnly, output, batch, uploadPosters } = parseArgs(
    process.argv.slice(2)
  )

  if (batch) {
    await runBatch({ uploadPosters: uploadPosters || true })
    return
  }

  if (!input) {
    console.error(`Usage:
  node scripts/watermark-hero-video.mjs <input.mp4> [--locale en|th|es|zh|ar|hi|pt] [--upload] [--output path]
  node scripts/watermark-hero-video.mjs --batch [--upload-posters]`)
    process.exit(1)
  }

  const inputPath = resolve(input)
  if (!existsSync(inputPath)) {
    console.error('Input file not found:', inputPath)
    process.exit(1)
  }

  const base = basename(inputPath, '.mp4').replace(/\.mov$/i, '')
  const defaultOut = join(dirname(inputPath), `${base}-watermarked.mp4`)
  const outputPath = output ? resolve(output) : defaultOut

  if (!uploadOnly) {
    await watermarkVideo(inputPath, outputPath)
  }

  const fileToUpload = uploadOnly ? inputPath : outputPath

  if (upload) {
    if (!locale) {
      console.error('--upload requires --locale (en, th, es, zh, ar, hi, pt)')
      process.exit(1)
    }
    await uploadToBlob(fileToUpload, locale)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
