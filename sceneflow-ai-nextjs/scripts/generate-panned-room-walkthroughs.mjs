#!/usr/bin/env node
/**
 * Automated Ken Burns Panned-Screenshot Walkthrough Video Generator (7 Languages)
 *
 * Renders 1920x1080 H.264 (.mp4) and VP9 (.webm) panned Studio screenshot walkthroughs
 * synchronized to the 7-language Ana narration tracks (en, es, pt, hi, zh, ar, th)
 * across all 4 Studio Rooms:
 *   - series-desk
 *   - blueprint-board
 *   - production-stage
 *   - screening-room
 *
 * Usage:
 *   node scripts/generate-panned-room-walkthroughs.mjs --dry-run
 *   node scripts/generate-panned-room-walkthroughs.mjs --room=screening-room --locale=en
 *   node scripts/generate-panned-room-walkthroughs.mjs --out-dir=public/landing/key-features/panned-rooms
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SCREENSHOTS_DIR = join(ROOT, 'public', 'landing', 'key-features', 'screenshots')
const ROOMS_MEDIA_DIR = join(ROOT, 'public', 'landing', 'key-features', 'rooms')
const TMP_WORK_DIR = join(ROOT, 'tmp', 'panned-room-walkthroughs')
const DEFAULT_OUT_DIR = join(ROOT, 'public', 'landing', 'key-features', 'panned-rooms')

const ALL_LOCALES = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th']

/**
 * Beat-synchronized 5K Studio screenshot choreography matching `ROOM_PANNED_SLIDES`
 * in `src/config/landing/doorWalkthroughCopy.ts` and `FEATURE_ROOM_SCRIPTS`.
 */
const ROOM_CHOREOGRAPHY = {
  'series-desk': {
    durationSeconds: 89.73,
    beatStartSeconds: [0.4, 11.2, 23.0, 35.3, 43.0, 53.5, 65.7, 74.5],
    slides: [
      { file: 'series-review.webp', fromY: 0.0, toY: 0.35 },
      { file: 'series-review.webp', fromY: 0.25, toY: 0.65 },
      { file: 'series-review.webp', fromY: 0.55, toY: 0.95 },
      { file: 'continuity-library.webp', fromY: 0.15, toY: 0.85 },
      { file: 'series-resonance.webp', fromY: 0.05, toY: 0.85 },
      { file: 'series-director.webp', fromY: 0.15, toY: 0.85 },
      { file: 'episode-director.webp', fromY: 0.1, toY: 0.85 },
      { file: 'series-start-project.webp', fromY: 0.15, toY: 0.85 },
    ],
  },
  'blueprint-board': {
    durationSeconds: 77.89,
    beatStartSeconds: [0.3, 10.9, 23.2, 33.8, 44.7, 55.8, 67.7],
    slides: [
      { file: 'start-blueprint.webp', fromY: 0.2, toY: 0.7 },
      { file: 'start-blueprint.webp', fromY: 0.65, toY: 0.15 },
      { file: 'blueprint-beats.webp', fromY: 0.04, toY: 0.48 },
      { file: 'blueprint-beats.webp', fromY: 0.48, toY: 0.94 },
      { file: 'blueprint-director.webp', fromY: 0.15, toY: 0.85 },
      { file: 'blueprint-resonance.webp', fromY: 0.06, toY: 0.88 },
      { file: 'blueprint-production-stage.webp', fromY: 0.15, toY: 0.8 },
    ],
  },
  'production-stage': {
    durationSeconds: 132.4,
    beatStartSeconds: [0.3, 10.2, 22.3, 36.0, 43.2, 54.1, 65.0, 77.2, 88.8, 100.5, 111.8, 123.4],
    slides: [
      { file: 'scene-workflow.webp', fromY: 0.15, toY: 0.85 },
      { file: 'production-script.webp', fromY: 0.15, toY: 0.8 },
      { file: 'continuity-library.webp', fromY: 0.15, toY: 0.85 },
      { file: 'scene-director.webp', fromY: 0.1, toY: 0.85 },
      { file: 'production-planner.webp', fromY: 0.08, toY: 0.88 },
      { file: 'audio-agent.webp', fromY: 0.15, toY: 0.85 },
      { file: 'stills-agent.webp', fromY: 0.15, toY: 0.85 },
      { file: 'pre-vis-animatic.webp', fromY: 0.15, toY: 0.85 },
      { file: 'clips-agent.webp', fromY: 0.15, toY: 0.85 },
      { file: 'production-mixer.webp', fromY: 0.08, toY: 0.88 },
      { file: 'promo-trailers.webp', fromY: 0.08, toY: 0.88 },
      { file: 'production-agent.webp', fromY: 0.15, toY: 0.85 },
    ],
  },
  'screening-room': {
    durationSeconds: 53.66,
    beatStartSeconds: [0.8, 10.2, 21.8, 32.6, 44.8],
    slides: [
      { file: 'screening-player.webp', fromY: 0.15, toY: 0.8 },
      { file: 'screening-player.webp', fromY: 0.75, toY: 0.2 },
      { file: 'streams-multilanguage.webp', fromY: 0.15, toY: 0.8 },
      { file: 'screening-collab.webp', fromY: 0.15, toY: 0.85 },
      { file: 'direct-publishing.webp', fromY: 0.15, toY: 0.85 },
    ],
  },
}

function resolveFfmpeg() {
  const localBin = join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg')
  return existsSync(localBin) ? localBin : 'ffmpeg'
}

function parseCliArgs(argv) {
  const opts = {
    dryRun: false,
    help: false,
    rooms: Object.keys(ROOM_CHOREOGRAPHY),
    locales: [...ALL_LOCALES],
    outDir: DEFAULT_OUT_DIR,
    fps: 30,
  }
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--help' || arg === '-h') opts.help = true
    else if (arg.startsWith('--room=')) {
      opts.rooms = arg.slice('--room='.length).split(',').filter(Boolean)
    } else if (arg.startsWith('--locale=')) {
      opts.locales = arg.slice('--locale='.length).split(',').filter(Boolean)
    } else if (arg.startsWith('--out-dir=')) {
      opts.outDir = resolve(ROOT, arg.slice('--out-dir='.length))
    }
  }
  return opts
}

function runFfmpeg(ffmpegBin, args, label) {
  const res = spawnSync(ffmpegBin, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (res.status !== 0) {
    throw new Error(
      `ffmpeg (${label}) exited with status ${res.status}:\n${(res.stderr || '').slice(-1000)}`
    )
  }
}

function resolveAudioSource(roomId, locale) {
  const webmCandidate = join(ROOMS_MEDIA_DIR, `${roomId}-${locale}.webm`)
  if (existsSync(webmCandidate)) return webmCandidate
  const mp4Candidate = join(ROOMS_MEDIA_DIR, `${roomId}-${locale}.mp4`)
  if (existsSync(mp4Candidate)) return mp4Candidate
  return null
}

function renderRoomVisualMaster(ffmpegBin, roomId, spec, fps, dryRun) {
  const roomTmpDir = join(TMP_WORK_DIR, roomId)
  const masterMp4 = join(roomTmpDir, `${roomId}-panned-visual-master.mp4`)

  const segmentDurations = spec.beatStartSeconds.map((startSec, idx) => {
    const prevBoundary = idx === 0 ? 0 : startSec
    const nextBoundary =
      idx + 1 < spec.beatStartSeconds.length
        ? spec.beatStartSeconds[idx + 1]
        : spec.durationSeconds
    return Math.max(1.5, Number((nextBoundary - prevBoundary).toFixed(3)))
  })

  if (dryRun) {
    return { masterMp4, segmentDurations }
  }

  mkdirSync(roomTmpDir, { recursive: true })
  const segmentPaths = []

  spec.slides.forEach((slide, idx) => {
    const screenshotPath = join(SCREENSHOTS_DIR, slide.file)
    if (!existsSync(screenshotPath)) {
      throw new Error(`Missing screenshot: ${screenshotPath}`)
    }
    const duration = segmentDurations[idx]
    const totalFrames = Math.max(15, Math.round(duration * fps))
    const segPath = join(roomTmpDir, `seg-${String(idx).padStart(2, '0')}.mp4`)

    // Scale width to 1920 preserving aspect ratio, pad if shorter than 1080, then pan vertically fromY -> toY
    const vf = [
      'scale=1920:-2:flags=lanczos',
      'pad=1920:max(ih\\,1080):0:(oh-ih)/2:color=#020617',
      `crop=1920:1080:0:'(ih-1080)*(${slide.fromY.toFixed(3)}+(${(slide.toY - slide.fromY).toFixed(3)})*(n/${totalFrames}))'`,
      `fps=${fps}`,
      'format=yuv420p',
    ].join(',')

    runFfmpeg(
      ffmpegBin,
      [
        '-y',
        '-loop',
        '1',
        '-t',
        String(duration),
        '-i',
        screenshotPath,
        '-vf',
        vf,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-an',
        segPath,
      ],
      `${roomId} beat ${idx + 1}`
    )
    segmentPaths.push(segPath)
  })

  const concatListPath = join(roomTmpDir, 'segments.txt')
  writeFileSync(
    concatListPath,
    segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n',
    'utf8'
  )

  runFfmpeg(
    ffmpegBin,
    ['-y', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', masterMp4],
    `${roomId} concat visual master`
  )

  return { masterMp4, segmentDurations }
}

function muxLocalizedOutputs(ffmpegBin, roomId, locale, visualMasterMp4, audioSrc, outDir, dryRun) {
  const outMp4 = join(outDir, `${roomId}-${locale}.mp4`)
  const outWebm = join(outDir, `${roomId}-${locale}.webm`)

  if (dryRun) {
    return { outMp4, outWebm }
  }

  mkdirSync(outDir, { recursive: true })

  runFfmpeg(
    ffmpegBin,
    [
      '-y',
      '-i',
      visualMasterMp4,
      '-i',
      audioSrc,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      '-shortest',
      outMp4,
    ],
    `${roomId}-${locale}.mp4`
  )

  runFfmpeg(
    ffmpegBin,
    [
      '-y',
      '-i',
      visualMasterMp4,
      '-i',
      audioSrc,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '33',
      '-row-mt',
      '1',
      '-c:a',
      'libopus',
      '-b:a',
      '96k',
      '-shortest',
      outWebm,
    ],
    `${roomId}-${locale}.webm`
  )

  return { outMp4, outWebm }
}

function main() {
  const opts = parseCliArgs(process.argv.slice(2))
  if (opts.help) {
    console.log(
      'Usage: node scripts/generate-panned-room-walkthroughs.mjs [--dry-run] [--room=series-desk,...] [--locale=en,es,...] [--out-dir=...]'
    )
    return
  }

  const ffmpegBin = resolveFfmpeg()
  console.log(`[panned-walkthroughs] ffmpeg: ${ffmpegBin}`)
  console.log(
    `[panned-walkthroughs] mode=${opts.dryRun ? 'DRY-RUN' : 'RENDER'} rooms=${opts.rooms.join(',')} locales=${opts.locales.join(',')}`
  )

  let verifiedPairs = 0

  for (const roomId of opts.rooms) {
    const spec = ROOM_CHOREOGRAPHY[roomId]
    if (!spec) {
      throw new Error(`Unknown roomId "${roomId}". Expected one of: ${Object.keys(ROOM_CHOREOGRAPHY).join(', ')}`)
    }

    for (const slide of spec.slides) {
      const screenshotPath = join(SCREENSHOTS_DIR, slide.file)
      if (!existsSync(screenshotPath)) {
        throw new Error(`[${roomId}] Missing 5K screenshot asset: ${screenshotPath}`)
      }
    }

    const { masterMp4, segmentDurations } = renderRoomVisualMaster(
      ffmpegBin,
      roomId,
      spec,
      opts.fps,
      opts.dryRun
    )
    console.log(
      `  ✓ [${roomId}] ${spec.slides.length} panned 5K beats (${segmentDurations.reduce((a, b) => a + b, 0).toFixed(1)}s)`
    )

    for (const locale of opts.locales) {
      const audioSrc = resolveAudioSource(roomId, locale)
      if (!audioSrc) {
        throw new Error(`[${roomId}] Missing localized audio source for locale "${locale}" in ${ROOMS_MEDIA_DIR}`)
      }
      const { outMp4, outWebm } = muxLocalizedOutputs(
        ffmpegBin,
        roomId,
        locale,
        masterMp4,
        audioSrc,
        opts.outDir,
        opts.dryRun
      )
      verifiedPairs += 1
      if (!opts.dryRun) {
        console.log(`    → ${outMp4}`)
        console.log(`    → ${outWebm}`)
      }
    }
  }

  console.log(
    `[panned-walkthroughs] Completed ${verifiedPairs} room×locale walkthrough targets (${opts.dryRun ? 'verified all screenshots + 7-language audio sources' : 'rendered'}).`
  )
}

main()
