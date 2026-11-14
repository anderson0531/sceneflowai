#!/usr/bin/env node
/**
 * Batch-encodes user-produced Video Business Promo Demonstration Trailers into
 * web-optimized 1080p VP9 + Opus `.webm` (and Safari-safe H.264 + AAC `.mp4`)
 * files for all 4 verticals × 7 priority languages:
 *
 *   public/landing/video-services/videos/{memoir|realestate|training|brand}-{en|es|pt|hi|zh|ar|th}.webm
 *   public/landing/video-services/videos/{memoir|realestate|training|brand}-{en|es|pt|hi|zh|ar|th}.mp4
 *
 * Usage:
 *   node scripts/encode-video-services-webm.mjs [sourceDirectory]
 *
 * Default source directory: `tmp/video-services-source`
 * Accepted input filenames (case-insensitive):
 *   memoir-en.mp4, realestate-es.mov, training-zh-CN.mp4, brand_ar.mp4, etc.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import ffmpegPath from 'ffmpeg-static'

if (!ffmpegPath) {
  console.error('Error: ffmpeg-static binary not found in node_modules.')
  process.exit(1)
}

const ROOT = process.cwd()
const DEFAULT_INPUT_DIR = join(ROOT, 'tmp/video-services-source')
const OUTPUT_DIR = join(ROOT, 'public/landing/video-services/videos')

const VERTICAL_ALIASES = {
  memoir: 'memoir',
  memoirs: 'memoir',
  videomemoir: 'memoir',
  videomemoirs: 'memoir',
  realestate: 'realestate',
  'real-estate': 'realestate',
  property: 'realestate',
  training: 'training',
  sop: 'training',
  sops: 'training',
  brand: 'brand',
  brands: 'brand',
  brandstory: 'brand',
  brandstories: 'brand',
}

const LOCALE_ALIASES = {
  en: 'en',
  'en-us': 'en',
  english: 'en',
  es: 'es',
  'es-es': 'es',
  'es-mx': 'es',
  spanish: 'es',
  pt: 'pt',
  'pt-br': 'pt',
  portuguese: 'pt',
  hi: 'hi',
  'hi-in': 'hi',
  hindi: 'hi',
  zh: 'zh',
  'zh-cn': 'zh',
  chinese: 'zh',
  mandarin: 'zh',
  ar: 'ar',
  'ar-sa': 'ar',
  arabic: 'ar',
  th: 'th',
  'th-th': 'th',
  thai: 'th',
}

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.mkv', '.webm'])

function parseTargetFromFilename(fileName) {
  const stem = basename(fileName, extname(fileName)).toLowerCase().trim()
  for (const [vAlias, canonicalVertical] of Object.entries(VERTICAL_ALIASES)) {
    for (const sep of ['-', '_']) {
      const prefix = `${vAlias}${sep}`
      if (stem.startsWith(prefix)) {
        const rawLoc = stem.slice(prefix.length)
        const canonicalLocale = LOCALE_ALIASES[rawLoc]
        if (canonicalLocale) {
          return { verticalId: canonicalVertical, locale: canonicalLocale }
        }
      }
    }
  }
  return null
}

function probeDurationSec(filePath) {
  const res = spawnSync(ffmpegPath, ['-i', filePath], { encoding: 'utf8' })
  const m = (res.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!m) return 0
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

function hasAudioStream(filePath) {
  const res = spawnSync(ffmpegPath, ['-i', filePath], { encoding: 'utf8' })
  return /Stream #\d+:\d+.*Audio:/i.test(res.stderr || '')
}

function encodeWebmAndMp4(inputPath, verticalId, locale) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const outWebm = join(OUTPUT_DIR, `${verticalId}-${locale}.webm`)
  const outMp4 = join(OUTPUT_DIR, `${verticalId}-${locale}.mp4`)
  const withAudio = hasAudioStream(inputPath)

  // Scale up to 1920x1080 max preserving 16:9 pad-free aspect ratio and even dimensions
  const vf =
    'scale=1920:1080:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2:(ow-iw)/2:(oh-ih)/2,setsar=1'
  const af = 'loudnorm=I=-16:TP=-1.5:LRA=11'

  console.log(`\n[encode] ${verticalId}-${locale} <- ${basename(inputPath)}`)

  // 1. Primary VP9 + Opus .webm
  const webmArgs = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    vf,
    '-c:v',
    'libvpx-vp9',
    '-crf',
    '29',
    '-b:v',
    '0',
    '-deadline',
    'good',
    '-cpu-used',
    '2',
    '-row-mt',
    '1',
    '-pix_fmt',
    'yuv420p',
    ...(withAudio
      ? ['-af', af, '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000']
      : ['-an']),
    outWebm,
  ]

  const webmRes = spawnSync(ffmpegPath, webmArgs, { encoding: 'utf8' })
  if (webmRes.status !== 0) {
    console.error(`Failed encoding ${outWebm}:\n${webmRes.stderr}`)
    process.exit(1)
  }

  // 2. Safari/iOS fallback H.264 + AAC .mp4
  const mp4Args = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    vf,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    ...(withAudio
      ? ['-af', af, '-c:a', 'aac', '-b:a', '160k', '-ar', '48000']
      : ['-an']),
    outMp4,
  ]

  const mp4Res = spawnSync(ffmpegPath, mp4Args, { encoding: 'utf8' })
  if (mp4Res.status !== 0) {
    console.error(`Failed encoding ${outMp4}:\n${mp4Res.stderr}`)
    process.exit(1)
  }

  const dur = probeDurationSec(outWebm).toFixed(1)
  const webmMb = (statSync(outWebm).size / (1024 * 1024)).toFixed(2)
  const mp4Mb = (statSync(outMp4).size / (1024 * 1024)).toFixed(2)
  console.log(
    `  ✓ ${verticalId}-${locale}.webm (${webmMb} MB, ${dur}s) + .mp4 (${mp4Mb} MB)`
  )
}

function main() {
  const cliDir = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_INPUT_DIR
  if (!existsSync(cliDir)) {
    console.log(
      `Source directory not found: ${cliDir}\nPlace rendered videos named e.g. "memoir-en.mp4", "realestate-es.mp4", "training-zh.mp4", "brand-ar.mp4" inside ${cliDir} and re-run.`
    )
    process.exit(0)
  }

  const entries = readdirSync(cliDir).filter((name) =>
    VIDEO_EXTS.has(extname(name).toLowerCase())
  )

  if (entries.length === 0) {
    console.log(`No video files found in ${cliDir}.`)
    process.exit(0)
  }

  const matched = []
  for (const name of entries.sort()) {
    const parsed = parseTargetFromFilename(name)
    if (!parsed) {
      console.warn(
        `Skipping unrecognized filename "${name}" (expected <vertical>-<locale>.mp4, e.g. memoir-en.mp4)`
      )
      continue
    }
    matched.push({ ...parsed, inputPath: join(cliDir, name) })
  }

  for (const item of matched) {
    encodeWebmAndMp4(item.inputPath, item.verticalId, item.locale)
  }

  console.log(
    `\nEncoded ${matched.length} promo trailer(s) into ${OUTPUT_DIR}.\nRemember to update VIDEO_SERVICE_AVAILABLE_PROMO_LOCALES in src/config/landing/videoServicePromoScripts.ts!`
  )
}

main()
