#!/usr/bin/env node
/**
 * Download and encode a Cinematic Drama locale video (en, es, pt, hi, zh, ar, th)
 * into both WebM (VP9 with front-loaded Cues) and MP4 (+faststart) in public/videos/.
 *
 * Usage:
 *   node scripts/update-cinematic-drama-locale-video.mjs --locale es --url https://.../Spanish-Video-v11.mp4
 *   node scripts/update-cinematic-drama-locale-video.mjs --locale en --input /tmp/English-Video-v11.mp4 --poster
 */

import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const VIDEOS_DIR = join(ROOT, 'public', 'videos')
const POSTERS_DIR = join(ROOT, 'public', 'images', 'trailers')
const VALID_LOCALES = new Set(['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'])

function resolveFfmpeg() {
  const bundled = join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg')
  if (existsSync(bundled)) return bundled
  return 'ffmpeg'
}

function parseArgs(argv) {
  const flag = (name) => {
    const idx = argv.indexOf(name)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  return {
    locale: flag('--locale'),
    url: flag('--url'),
    input: flag('--input'),
    poster: argv.includes('--poster'),
    webmOnly: argv.includes('--webm-only'),
  }
}

function runFfmpeg(args, label) {
  console.log(`  ffmpeg ${label}...`)
  const res = spawnSync(resolveFfmpeg(), args, { stdio: 'inherit' })
  if (res.status !== 0) {
    throw new Error(`ffmpeg ${label} failed with exit code ${res.status}`)
  }
}

async function downloadToTmp(url, locale) {
  const dest = join('/tmp', `cinematic-drama-${locale}-source.mp4`)
  console.log(`Downloading ${url} -> ${dest}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}): ${url}`)
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
  return dest
}

async function main() {
  const { locale, url, input, poster, webmOnly } = parseArgs(process.argv.slice(2))
  if (!locale || !VALID_LOCALES.has(locale)) {
    console.error('Error: --locale must be one of: en, es, pt, hi, zh, ar, th')
    process.exit(1)
  }
  if (!url && !input) {
    console.error('Error: provide either --url <https://...> or --input </path/to/video.mp4>')
    process.exit(1)
  }

  mkdirSync(VIDEOS_DIR, { recursive: true })
  const stem = locale === 'en' ? 'cinematic-drama-trailer' : `cinematic-drama-trailer-${locale}`
  const outMp4 = join(VIDEOS_DIR, `${stem}.mp4`)
  const outWebm = join(VIDEOS_DIR, `${stem}.webm`)

  const srcPath = input || (await downloadToTmp(url, locale))
  const cleanup = !input

  try {
    if (!webmOnly) {
      runFfmpeg(
        [
          '-y',
          '-i',
          srcPath,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '23',
          '-maxrate',
          '2500k',
          '-bufsize',
          '5000k',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '160k',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-movflags',
          '+faststart',
          outMp4,
        ],
        `mp4 (${stem}.mp4)`
      )
    }

    runFfmpeg(
      [
        '-y',
        '-i',
        srcPath,
        '-c:v',
        'libvpx-vp9',
        '-crf',
        '32',
        '-b:v',
        '0',
        '-row-mt',
        '1',
        '-threads',
        '8',
        '-deadline',
        'realtime',
        '-cpu-used',
        '6',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'libopus',
        '-b:a',
        '128k',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-cues_to_front',
        '1',
        outWebm,
      ],
      `webm (${stem}.webm)`
    )

    if (poster && locale === 'en') {
      mkdirSync(POSTERS_DIR, { recursive: true })
      const outPoster = join(POSTERS_DIR, 'cinematic-drama-poster.webp')
      runFfmpeg(
        [
          '-y',
          '-ss',
          '00:00:02.5',
          '-i',
          srcPath,
          '-frames:v',
          '1',
          '-c:v',
          'libwebp',
          '-quality',
          '82',
          outPoster,
        ],
        'poster (cinematic-drama-poster.webp)'
      )
    }

    const mp4Mb = (statSync(outMp4).size / (1024 * 1024)).toFixed(1)
    const webmMb = (statSync(outWebm).size / (1024 * 1024)).toFixed(1)
    console.log(`\nDone: ${stem}.mp4 (${mp4Mb} MB), ${stem}.webm (${webmMb} MB)`)
  } finally {
    if (cleanup && existsSync(srcPath)) {
      unlinkSync(srcPath)
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
