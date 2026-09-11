#!/usr/bin/env node
/**
 * Encode the current 4K Blob hero masters to web-sized progressive MP4s.
 *
 *   720p  — phones / Save-Data / slow networks (~4–6 Mbps, +faststart)
 *   1080p — desktop / theater when you do not want the 4K master on the wire
 *
 * Do not use the older watermarked landing/hero/sceneflow-hero-{locale}.mp4
 * files — those are a different encode. This script always starts from the
 * live 4K paths in heroVideoLocales.ts.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... node scripts/encode-hero-web-mp4.mjs --locale en --upload
 *   BLOB_READ_WRITE_TOKEN=... node scripts/encode-hero-web-mp4.mjs --batch --upload
 *   node scripts/encode-hero-web-mp4.mjs --locale en --rung 720
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { put } from '@vercel/blob'
import { config } from 'dotenv'
import ffmpegStatic from 'ffmpeg-static'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

/** Must match HERO_VIDEO_BLOB_PATHS in src/config/landing/heroVideoLocales.ts */
export const LOCALE_SOURCE_PATHS = {
  en: 'SceneFlow Hero Video.mp4',
  es: 'Hero Video (Spanish).mp4',
  pt: 'Hero Video (Portuguese).mp4',
  hi: 'Hero Video (Hindi).mp4',
  zh: 'Hero Video (Chinese).mp4',
  ar: 'Hero Video (Arabic).mp4',
  th: 'Hero Video (Thai).mp4',
}

/** Must match HERO_VIDEO_WEB_720P_PATHS / HERO_VIDEO_WEB_1080P_PATHS */
export const WEB_ENCODE_PATHS = {
  720: {
    en: 'landing/hero/sceneflow-hero-en-720p.mp4',
    es: 'landing/hero/sceneflow-hero-es-720p.mp4',
    pt: 'landing/hero/sceneflow-hero-pt-720p.mp4',
    hi: 'landing/hero/sceneflow-hero-hi-720p.mp4',
    zh: 'landing/hero/sceneflow-hero-zh-720p.mp4',
    ar: 'landing/hero/sceneflow-hero-ar-720p.mp4',
    th: 'landing/hero/sceneflow-hero-th-720p.mp4',
  },
  1080: {
    en: 'landing/hero/sceneflow-hero-en-1080p.mp4',
    es: 'landing/hero/sceneflow-hero-es-1080p.mp4',
    pt: 'landing/hero/sceneflow-hero-pt-1080p.mp4',
    hi: 'landing/hero/sceneflow-hero-hi-1080p.mp4',
    zh: 'landing/hero/sceneflow-hero-zh-1080p.mp4',
    ar: 'landing/hero/sceneflow-hero-ar-1080p.mp4',
    th: 'landing/hero/sceneflow-hero-th-1080p.mp4',
  },
}

const RUNGS = {
  720: {
    height: 720,
    crf: 23,
    maxrate: '6M',
    bufsize: '12M',
    audio: '128k',
  },
  1080: {
    height: 1080,
    crf: 20,
    maxrate: '12M',
    bufsize: '24M',
    audio: '160k',
  },
}

function parseArgs(argv) {
  const flag = (name) => {
    const idx = argv.indexOf(name)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const rungArg = flag('--rung')
  const rungs = rungArg
    ? rungArg.split(',').map((value) => Number(value.trim()))
    : [720, 1080]
  return {
    locale: flag('--locale'),
    input: flag('--input'),
    batch: argv.includes('--batch'),
    upload: argv.includes('--upload') || argv.includes('--batch'),
    rungs,
  }
}

function resolveFfmpeg() {
  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic
  return 'ffmpeg'
}

async function downloadMaster(locale) {
  const blobPath = LOCALE_SOURCE_PATHS[locale]
  if (!blobPath) throw new Error(`Unknown locale: ${locale}`)
  const url = `${BLOB_HOST}/${encodeURI(blobPath)}`
  console.log(`  Downloading 4K master: ${blobPath}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Blob download failed ${locale}: ${res.status} ${url}`)
  }
  const tmp = join(ROOT, 'tmp', 'hero-web', `${locale}-master.mp4`)
  mkdirSync(dirname(tmp), { recursive: true })
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp))
  return tmp
}

function encodeRung(inputPath, outputPath, rung) {
  const spec = RUNGS[rung]
  if (!spec) throw new Error(`Unsupported rung: ${rung}`)
  mkdirSync(dirname(outputPath), { recursive: true })
  const args = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    `scale=-2:${spec.height}`,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    String(spec.crf),
    '-maxrate',
    spec.maxrate,
    '-bufsize',
    spec.bufsize,
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    spec.audio,
    '-movflags',
    '+faststart',
    outputPath,
  ]
  console.log(`  ffmpeg ${rung}p → ${outputPath}`)
  const result = spawnSync(resolveFfmpeg(), args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`ffmpeg ${rung}p failed with status ${result.status}`)
  }
}

async function uploadWebEncode(localPath, blobPath) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for --upload')
  }
  const { readFileSync } = await import('fs')
  const buffer = readFileSync(localPath)
  console.log(`  Uploading ${blobPath} (${buffer.length} bytes)`)
  const blob = await put(blobPath, buffer, {
    access: 'public',
    token,
    contentType: 'video/mp4',
    allowOverwrite: true,
    addRandomSuffix: false,
  })
  console.log(`  Uploaded ${blob.url}`)
}

async function processLocale(locale, inputPath, rungs, upload) {
  console.log(`\n=== ${locale} ===`)
  const master = inputPath || (await downloadMaster(locale))
  if (!existsSync(master)) throw new Error(`Input not found: ${master}`)

  for (const rung of rungs) {
    const blobPath = WEB_ENCODE_PATHS[rung]?.[locale]
    if (!blobPath) throw new Error(`No web path for ${locale} ${rung}p`)
    const outputPath = join(ROOT, 'tmp', 'hero-web', `${locale}-${rung}p.mp4`)
    encodeRung(master, outputPath, rung)
    if (upload) {
      await uploadWebEncode(outputPath, blobPath)
    } else {
      console.log(`  Wrote ${outputPath} (pass --upload to publish)`)
    }
  }
}

export async function main() {
  const { locale, input, batch, upload, rungs } = parseArgs(process.argv.slice(2))
  for (const rung of rungs) {
    if (!RUNGS[rung]) {
      console.error(`Unknown --rung ${rung} (use 720, 1080, or 720,1080)`)
      process.exit(1)
    }
  }

  const locales = batch ? Object.keys(LOCALE_SOURCE_PATHS) : locale ? [locale] : []
  if (locales.length === 0) {
    console.error('Usage: --locale en [--rung 720] [--upload]  OR  --batch --upload')
    process.exit(1)
  }

  for (const code of locales) {
    await processLocale(code, input, rungs, upload)
  }
}

const launchedDirectly = process.argv[1] && process.argv[1].endsWith('encode-hero-web-mp4.mjs')

if (launchedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
