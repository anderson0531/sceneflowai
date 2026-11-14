#!/usr/bin/env node
/**
 * Encodes Video Business Promo Demonstration Trailers into web-optimized
 * VP9 + Opus `.webm` (with front-loaded Cues for instant seeking), Safari-safe
 * H.264 + AAC `.mp4` (`+faststart`), and a matching `.webp` poster frame:
 *
 *   public/landing/video-services/videos/{memoir|realestate|training|brand}-{en|es|pt|hi|zh|ar|th}.webm
 *   public/landing/video-services/videos/{memoir|realestate|training|brand}-{en|es|pt|hi|zh|ar|th}.mp4
 *   public/landing/video-services/videos/{memoir|realestate|training|brand}-poster.webp
 *
 * Usage:
 *   # Single file or Vercel Blob URL:
 *   node scripts/encode-video-services-webm.mjs --vertical memoir --locale en --input "/tmp/memoir-en.mp4"
 *   node scripts/encode-video-services-webm.mjs --vertical memoir --locale es --url "https://.../Video%20Memoir%20(Spanish).mp4"
 *
 *   # Batch directory (supports both "memoir-en.mp4" and "Video Memoir (English).mp4"):
 *   node scripts/encode-video-services-webm.mjs [sourceDirectory]
 */

import { spawnSync } from 'node:child_process'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import ffmpegPath from 'ffmpeg-static'

if (!ffmpegPath) {
  console.error('Error: ffmpeg-static binary not found in node_modules.')
  process.exit(1)
}

const ROOT = process.cwd()
const DEFAULT_INPUT_DIR = join(ROOT, 'tmp/video-services-source')
const OUTPUT_DIR = join(ROOT, 'public/landing/video-services/videos')

const VERTICAL_ALIASES = {
  'video-memoirs': 'memoir',
  'video-memoir': 'memoir',
  videomemoirs: 'memoir',
  videomemoir: 'memoir',
  memoirs: 'memoir',
  memoir: 'memoir',
  'real-estate': 'realestate',
  realestate: 'realestate',
  property: 'realestate',
  training: 'training',
  sops: 'training',
  sop: 'training',
  'brand-stories': 'brand',
  'brand-story': 'brand',
  brandstories: 'brand',
  brandstory: 'brand',
  brands: 'brand',
  brand: 'brand',
}

const LOCALE_ALIASES = {
  'en-us': 'en',
  english: 'en',
  en: 'en',
  'es-es': 'es',
  'es-mx': 'es',
  spanish: 'es',
  espanol: 'es',
  es: 'es',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  portuguese: 'pt',
  portugues: 'pt',
  pt: 'pt',
  'hi-in': 'hi',
  hindi: 'hi',
  hi: 'hi',
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  chinese: 'zh',
  mandarin: 'zh',
  zh: 'zh',
  'ar-sa': 'ar',
  arabic: 'ar',
  ar: 'ar',
  'th-th': 'th',
  thai: 'th',
  th: 'th',
}

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.mkv', '.webm'])

export function parseTargetFromFilename(fileName) {
  const rawStem = basename(fileName, extname(fileName)).toLowerCase().trim()

  // 1. Canonical `<vertical>-<locale>` / `<vertical>_<locale>` match
  for (const [vAlias, canonicalVertical] of Object.entries(VERTICAL_ALIASES)) {
    for (const sep of ['-', '_']) {
      const prefix = `${vAlias}${sep}`
      if (rawStem.startsWith(prefix)) {
        const rawLoc = rawStem.slice(prefix.length).trim()
        const canonicalLocale = LOCALE_ALIASES[rawLoc]
        if (canonicalLocale) {
          return { verticalId: canonicalVertical, locale: canonicalLocale }
        }
      }
    }
  }

  // 2. Natural human title match, e.g. "Video Memoir (English) .mp4"
  const slugged = rawStem
    .replace(/[()[\]]+/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const tokens = slugged.split('-').filter(Boolean)

  let matchedVertical = null
  for (const [vAlias, canonicalVertical] of Object.entries(VERTICAL_ALIASES)) {
    if (slugged.includes(vAlias)) {
      matchedVertical = canonicalVertical
      break
    }
  }
  if (!matchedVertical) return null

  // Match longest locale alias from end tokens (e.g. "zh-cn", "english", "es")
  for (let i = tokens.length - 1; i >= 0; i--) {
    const pair = i > 0 ? `${tokens[i - 1]}-${tokens[i]}` : null
    if (pair && LOCALE_ALIASES[pair]) {
      return { verticalId: matchedVertical, locale: LOCALE_ALIASES[pair] }
    }
    if (LOCALE_ALIASES[tokens[i]]) {
      return { verticalId: matchedVertical, locale: LOCALE_ALIASES[tokens[i]] }
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

function encodeWebmAndMp4(inputPath, verticalId, locale, { generatePoster = locale === 'en' } = {}) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const outWebm = join(OUTPUT_DIR, `${verticalId}-${locale}.webm`)
  const outMp4 = join(OUTPUT_DIR, `${verticalId}-${locale}.mp4`)
  const outPoster = join(OUTPUT_DIR, `${verticalId}-poster.webp`)
  const withAudio = hasAudioStream(inputPath)

  // Preserve native resolution up to 1920x1080 without upscaling 720p sources; guarantee even dimensions
  const vf =
    "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2:(ow-iw)/2:(oh-ih)/2,setsar=1"
  const af = 'loudnorm=I=-16:TP=-1.5:LRA=11'

  console.log(`\n[encode] ${verticalId}-${locale} <- ${basename(inputPath)}`)

  // 1. Primary VP9 + Opus .webm with front-loaded Cues for instant HTTP range seeking
  const webmArgs = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    vf,
    '-c:v',
    'libvpx-vp9',
    '-crf',
    '30',
    '-b:v',
    '0',
    '-deadline',
    'good',
    '-cpu-used',
    '3',
    '-row-mt',
    '1',
    '-threads',
    '8',
    '-g',
    '120',
    '-pix_fmt',
    'yuv420p',
    ...(withAudio
      ? ['-af', af, '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', '-ac', '2']
      : ['-an']),
    '-cues_to_front',
    '1',
    outWebm,
  ]

  const webmRes = spawnSync(ffmpegPath, webmArgs, { encoding: 'utf8' })
  if (webmRes.status !== 0) {
    console.error(`Failed encoding ${outWebm}:\n${webmRes.stderr}`)
    process.exit(1)
  }

  // 2. Safari/iOS fallback H.264 + AAC .mp4 (+faststart)
  const mp4Args = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    vf,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-maxrate',
    '2800k',
    '-bufsize',
    '5600k',
    '-g',
    '120',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    ...(withAudio
      ? ['-af', af, '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2']
      : ['-an']),
    outMp4,
  ]

  const mp4Res = spawnSync(ffmpegPath, mp4Args, { encoding: 'utf8' })
  if (mp4Res.status !== 0) {
    console.error(`Failed encoding ${outMp4}:\n${mp4Res.stderr}`)
    process.exit(1)
  }

  // 3. Matching first-scene WebP poster so initial frame matches t=0 seamlessly
  if (generatePoster) {
    const posterArgs = [
      '-y',
      '-ss',
      '00:00:01.2',
      '-i',
      inputPath,
      '-vf',
      vf,
      '-frames:v',
      '1',
      '-c:v',
      'libwebp',
      '-quality',
      '85',
      outPoster,
    ]
    const posterRes = spawnSync(ffmpegPath, posterArgs, { encoding: 'utf8' })
    if (posterRes.status !== 0) {
      console.warn(`Warning: poster generation failed for ${outPoster}:\n${posterRes.stderr}`)
    }
  }

  const dur = probeDurationSec(outWebm).toFixed(1)
  const webmMb = (statSync(outWebm).size / (1024 * 1024)).toFixed(2)
  const mp4Mb = (statSync(outMp4).size / (1024 * 1024)).toFixed(2)
  const posterInfo =
    generatePoster && existsSync(outPoster)
      ? ` + poster (${(statSync(outPoster).size / 1024).toFixed(0)} KB)`
      : ''
  console.log(
    `  ✓ ${verticalId}-${locale}.webm (${webmMb} MB, ${dur}s) + .mp4 (${mp4Mb} MB)${posterInfo}`
  )
}

function parseCliFlags(argv) {
  const getFlag = (name) => {
    const idx = argv.indexOf(name)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const positional = argv.filter((arg, i) => {
    if (arg.startsWith('--')) return false
    const prev = i > 0 ? argv[i - 1] : ''
    if (['--vertical', '--locale', '--input', '--url'].includes(prev)) return false
    return true
  })
  return {
    vertical: getFlag('--vertical'),
    locale: getFlag('--locale'),
    input: getFlag('--input'),
    url: getFlag('--url'),
    noPoster: argv.includes('--no-poster'),
    positionalDir: positional[0],
  }
}

async function downloadTempVideo(url, verticalId, locale) {
  const dest = join('/tmp', `sceneflow-${verticalId}-${locale}-src.mp4`)
  console.log(`Downloading ${url} -> ${dest}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download (${res.status}): ${url}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
  return dest
}

async function main() {
  const flags = parseCliFlags(process.argv.slice(2))

  if (flags.input || flags.url) {
    const verticalId = VERTICAL_ALIASES[(flags.vertical || '').toLowerCase()]
    const locale = LOCALE_ALIASES[(flags.locale || '').toLowerCase()]
    if (!verticalId || !locale) {
      console.error(
        'Error: when using --input or --url, pass valid --vertical (memoir|realestate|training|brand) and --locale (en|es|pt|hi|zh|ar|th).'
      )
      process.exit(1)
    }

    const srcPath = flags.input
      ? resolve(flags.input)
      : await downloadTempVideo(flags.url, verticalId, locale)
    const shouldCleanup = !flags.input && Boolean(flags.url)

    try {
      encodeWebmAndMp4(srcPath, verticalId, locale, {
        generatePoster: !flags.noPoster && locale === 'en',
      })
    } finally {
      if (shouldCleanup && existsSync(srcPath)) {
        unlinkSync(srcPath)
      }
    }
    return
  }

  const cliDir = flags.positionalDir ? resolve(flags.positionalDir) : DEFAULT_INPUT_DIR
  if (!existsSync(cliDir)) {
    console.log(
      `Source directory not found: ${cliDir}\nPlace rendered videos named e.g. "memoir-en.mp4" or "Video Memoir (English).mp4" inside ${cliDir} and re-run.`
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
        `Skipping unrecognized filename "${name}" (expected e.g. memoir-en.mp4 or "Video Memoir (English).mp4")`
      )
      continue
    }
    matched.push({ ...parsed, inputPath: join(cliDir, name) })
  }

  for (const item of matched) {
    encodeWebmAndMp4(item.inputPath, item.verticalId, item.locale, {
      generatePoster: !flags.noPoster && item.locale === 'en',
    })
  }

  console.log(
    `\nEncoded ${matched.length} promo trailer(s) into ${OUTPUT_DIR}.\nRemember to update VIDEO_SERVICE_AVAILABLE_PROMO_LOCALES in src/config/landing/videoServicePromoScripts.ts!`
  )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
