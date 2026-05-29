#!/usr/bin/env node
/**
 * Burn "SceneFlow AI Studio" into hero MP4s (bottom-right) and optionally upload to Vercel Blob.
 *
 * Usage:
 *   node scripts/watermark-hero-video.mjs <input.mp4> [--locale en|th|es|zh|ar|hi|pt] [--upload] [--output path]
 *
 * Examples:
 *   node scripts/watermark-hero-video.mjs ./SceneFlow\ Hero.mp4 --locale en
 *   node scripts/watermark-hero-video.mjs ./hero-th.mp4 --locale th --upload
 */

import { spawnSync } from 'child_process'
import { readFileSync, existsSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import ffmpegStatic from 'ffmpeg-static'
import sharp from 'sharp'
import { basename, dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { put } from '@vercel/blob'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

config({ path: join(PROJECT_ROOT, '.env.vercel.local') })
config({ path: join(PROJECT_ROOT, '.env.local') })

const WATERMARK_TEXT = 'SceneFlow AI Studio'
const LOCALE_BLOB_PATHS = {
  en: 'landing/hero/sceneflow-hero-en.mp4',
  th: 'landing/hero/sceneflow-hero-th.mp4',
  es: 'landing/hero/sceneflow-hero-es.mp4',
  zh: 'landing/hero/sceneflow-hero-zh.mp4',
  ar: 'landing/hero/sceneflow-hero-ar.mp4',
  hi: 'landing/hero/sceneflow-hero-hi.mp4',
  pt: 'landing/hero/sceneflow-hero-pt.mp4',
}

function parseArgs(argv) {
  const positional = []
  let locale = null
  let upload = false
  let uploadOnly = false
  let output = null

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--upload-only') {
      uploadOnly = true
      upload = true
    } else if (arg === '--upload') {
      upload = true
    } else if (arg === '--locale' && argv[i + 1]) {
      locale = argv[++i]
    } else if (arg === '--output' && argv[i + 1]) {
      output = argv[++i]
    } else if (!arg.startsWith('--')) {
      positional.push(arg)
    }
  }

  return { input: positional[0], locale, upload, uploadOnly, output }
}

/** PNG overlay (ffmpeg-static lacks libfreetype drawtext). */
async function createWatermarkPng(outPath) {
  const svg = `
<svg width="300" height="44" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="300" height="44" rx="8" fill="rgba(0,0,0,0.35)"/>
  <text x="14" y="28" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="500" fill="rgba(255,255,255,0.85)">${WATERMARK_TEXT}</text>
</svg>`
  await sharp(Buffer.from(svg)).png().toFile(outPath)
  return outPath
}

function resolveFfmpegBinary() {
  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic
  return 'ffmpeg'
}

async function watermarkVideo(inputPath, outputPath) {
  const padding = 24
  const tmpDir = mkdtempSync(join(tmpdir(), 'sf-hero-wm-'))
  const watermarkPng = join(tmpDir, 'watermark.png')
  await createWatermarkPng(watermarkPng)

  const ffmpegBin = resolveFfmpegBinary()
  console.log('Using ffmpeg:', ffmpegBin)
  console.log('Watermark PNG:', watermarkPng)

  const filterComplex = `[1:v]format=rgba[wm];[0:v][wm]overlay=W-w-${padding}:H-h-${padding}`

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

async function uploadToBlob(filePath, locale) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN not set (use .env.vercel.local)')
  }

  const blobPath = LOCALE_BLOB_PATHS[locale]
  if (!blobPath) {
    throw new Error(`Unknown locale "${locale}". Use: ${Object.keys(LOCALE_BLOB_PATHS).join(', ')}`)
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

async function run() {
  const { input, locale, upload, uploadOnly, output } = parseArgs(process.argv.slice(2))

  if (!input) {
    console.error(`Usage: node scripts/watermark-hero-video.mjs <input.mp4> [--locale en|th|es|zh|ar] [--upload] [--output path]`)
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
    console.log(`\nUpdate src/config/landing/heroVideoLocales.ts → ${locale}.src with the URL above.`)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
