#!/usr/bin/env npx tsx
/**
 * Builds true 4K (3840x2160 @ 24fps) Ken Burns Express Cinema editions of the
 * consumer-facing family memoir film ("Harbor Books: Fifty Years on Pike Street",
 * sourced from `public/videos/video-memoir-trailer*.mp4`) across all 7 priority
 * languages (`en`, `es`, `pt`, `hi`, `zh`, `ar`, `th`).
 *
 * Outputs:
 *   public/videos/video-memoir-trailer-4k.mp4
 *   public/videos/video-memoir-trailer-4k-{es,pt,hi,zh,ar,th}.mp4
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FFMPEG = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg'

const FPS = 24
const TARGET_W = 3840
const TARGET_H = 2160
const KB_SOURCE_W = 5760
const KB_SOURCE_H = 3240
const XFADE_SEC = 0.5
const XFADE_FRAMES = Math.round(XFADE_SEC * FPS) // 12 frames

interface MemoirBeat {
  index: number
  startSec: number
  endSec: number
  stillSec: number
  label: string
}

// Exact cross-dissolve boundaries detected from public/videos/video-memoir-trailer.mp4 (73.08s)
const BEATS: readonly MemoirBeat[] = [
  { index: 0, startSec: 0.0, endSec: 9.25, stillSec: 4.5, label: 'armchair-book' },
  { index: 1, startSec: 9.25, endSec: 18.71, stillSec: 13.5, label: 'steamship-arrival' },
  { index: 2, startSec: 18.71, endSec: 27.5, stillSec: 22.5, label: 'cabin-writing' },
  { index: 3, startSec: 27.5, endSec: 36.29, stillSec: 32.0, label: 'brick-oven' },
  { index: 4, startSec: 36.29, endSec: 45.75, stillSec: 41.0, label: '1974-opening' },
  { index: 5, startSec: 45.75, endSec: 54.75, stillSec: 50.0, label: 'passing-heirloom' },
  { index: 6, startSec: 54.75, endSec: 63.33, stillSec: 59.0, label: 'family-courtyard' },
  { index: 7, startSec: 63.33, endSec: 73.08, stillSec: 68.5, label: 'candlelight-album' },
]

const LOCALES = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'] as const

function hasVideoToolbox(): boolean {
  const res = spawnSync(FFMPEG, ['-hide_banner', '-encoders'], { encoding: 'utf8' })
  return (res.stdout || '').includes('h264_videotoolbox')
}

function runFfmpegSync(args: string[], label: string): void {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (res.status !== 0) {
    throw new Error(`ffmpeg failed (${label}):\n${(res.stderr || '').slice(-1500)}`)
  }
}

function runFfmpegAsync(args: string[], label: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
      if (stderr.length > 16000) stderr = stderr.slice(-16000)
    })
    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`ffmpeg failed (${label}, code=${code}):\n${stderr.slice(-1500)}`))
    })
  })
}

function buildKenBurnsFilter(beatIndex: number, totalFrames: number): string {
  const s = 'sin(PI*on/540)'
  const motion = beatIndex % 6

  let zExpr: string
  let xExpr: string
  let yExpr: string

  switch (motion) {
    case 0:
      zExpr = `1.00+0.26*${s}`
      xExpr = `(iw-iw/zoom)*0.50`
      yExpr = `(ih-ih/zoom)*0.35`
      break
    case 1:
      zExpr = `1.22+0.10*${s}`
      xExpr = `(iw-iw/zoom)*(0.03+0.94*${s})`
      yExpr = `(ih-ih/zoom)*(0.42+0.12*${s})`
      break
    case 2:
      zExpr = `1.28-0.26*${s}`
      xExpr = `(iw-iw/zoom)*0.50`
      yExpr = `(ih-ih/zoom)*0.40`
      break
    case 3:
      zExpr = `1.32-0.12*${s}`
      xExpr = `(iw-iw/zoom)*(0.97-0.94*${s})`
      yExpr = `(ih-ih/zoom)*(0.52-0.12*${s})`
      break
    case 4:
      zExpr = `1.15+0.17*${s}`
      xExpr = `(iw-iw/zoom)*(0.12+0.76*${s})`
      yExpr = `(ih-ih/zoom)*(0.78-0.54*${s})`
      break
    default:
      zExpr = `1.30-0.16*${s}`
      xExpr = `(iw-iw/zoom)*(0.88-0.76*${s})`
      yExpr = `(ih-ih/zoom)*(0.24+0.54*${s})`
      break
  }

  return [
    `scale=${KB_SOURCE_W}:${KB_SOURCE_H}:force_original_aspect_ratio=increase:flags=lanczos`,
    `crop=${KB_SOURCE_W}:${KB_SOURCE_H}`,
    `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${TARGET_W}x${TARGET_H}:fps=${FPS}`,
    'setsar=1',
  ].join(',')
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++
      await worker(items[idx]!)
    }
  })
  await Promise.all(runners)
}

async function main() {
  const t0 = Date.now()
  const useVT = hasVideoToolbox()
  const sourceVideo = join(ROOT, 'public', 'videos', 'video-memoir-trailer.mp4')
  const workDir = join(ROOT, 'tmp', 'harbor-books-4k')
  const stillsDir = join(workDir, 'stills')
  const clipsDir = join(workDir, 'clips')
  mkdirSync(stillsDir, { recursive: true })
  mkdirSync(clipsDir, { recursive: true })

  console.log(`=== Building Harbor Books True-4K Ken Burns Cinema (encoder=${useVT ? 'h264_videotoolbox' : 'libx264'}) ===`)

  // Step 1: Extract crisp hero stills for all 8 story beats
  const beatJobs = BEATS.map((beat, idx) => {
    const isLast = idx === BEATS.length - 1
    const baseFrames = Math.round((beat.endSec - beat.startSec) * FPS)
    // Add overlap frames for smooth xfade dissolve into the next beat
    const renderFrames = isLast ? baseFrames : baseFrames + XFADE_FRAMES
    const stillPath = join(stillsDir, `beat-${idx + 1}-${beat.label}.png`)
    const clipPath = join(clipsDir, `beat-${idx + 1}-${renderFrames}f-4k.mp4`)
    if (!existsSync(stillPath) || statSync(stillPath).size < 10_000) {
      runFfmpegSync(
        ['-y', '-ss', beat.stillSec.toFixed(2), '-i', sourceVideo, '-frames:v', '1', stillPath],
        `extract beat ${idx + 1}`
      )
    }
    return { beat, idx, baseFrames, renderFrames, stillPath, clipPath }
  })

  // Step 2: Render all 8 true-4K Ken Burns beats in parallel
  const pending = beatJobs.filter((j) => !existsSync(j.clipPath) || statSync(j.clipPath).size < 50_000)
  console.log(`Phase 1: Rendering ${pending.length}/${beatJobs.length} 4K Ken Burns beats (concurrency=4)...`)
  await runPool(pending, 4, async (job) => {
    const vf = buildKenBurnsFilter(job.idx, job.renderFrames)
    const codecArgs = useVT
      ? ['-c:v', 'h264_videotoolbox', '-b:v', '6000k', '-profile:v', 'high', '-g', '24']
      : ['-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-g', '24']
    const tmpOut = `${job.clipPath}.${process.pid}.tmp.mp4`
    await runFfmpegAsync(
      [
        '-y',
        '-i',
        job.stillPath,
        '-an',
        '-vf',
        vf,
        '-frames:v',
        String(job.renderFrames),
        ...codecArgs,
        '-pix_fmt',
        'yuv420p',
        tmpOut,
      ],
      `render 4K beat ${job.idx + 1}`
    )
    renameSync(tmpOut, job.clipPath)
    console.log(`  ✓ Beat ${job.idx + 1}/8 (${job.beat.label}, ${job.renderFrames}f)`)
  })

  // Step 3: Stitch all 8 4K clips with silky 0.5s xfade cross-dissolves into ONE 73.08s 4K master
  const videoMasterPath = join(workDir, 'harbor-books-4k-video-master.mp4')
  const tmpMasterPath = `${videoMasterPath}.${process.pid}.tmp.mp4`
  const inputArgs: string[] = []
  beatJobs.forEach((j) => inputArgs.push('-i', j.clipPath))

  const filterParts: string[] = []
  beatJobs.forEach((_, i) => {
    filterParts.push(`[${i}:v]settb=AVTB,fps=${FPS},format=yuv420p[v${i}]`)
  })

  let prevLabel = 'v0'
  let offsetSec = beatJobs[0]!.baseFrames / FPS
  for (let i = 1; i < beatJobs.length; i++) {
    const outLabel = i === beatJobs.length - 1 ? 'vout' : `x${i}`
    filterParts.push(
      `[${prevLabel}][v${i}]xfade=transition=fade:duration=${XFADE_SEC.toFixed(2)}:offset=${offsetSec.toFixed(3)}[${outLabel}]`
    )
    prevLabel = outLabel
    offsetSec += beatJobs[i]!.baseFrames / FPS
  }

  const masterCodecArgs = useVT
    ? ['-c:v', 'h264_videotoolbox', '-b:v', '2800k', '-maxrate', '4200k', '-profile:v', 'high', '-g', '72']
    : ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-maxrate', '4200k', '-bufsize', '8400k', '-g', '72']

  console.log('Phase 2: Stitching 73.08s true-4K master with 0.5s cinema cross-dissolves...')
  await runFfmpegAsync(
    [
      '-y',
      ...inputArgs,
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[vout]',
      '-an',
      ...masterCodecArgs,
      '-pix_fmt',
      'yuv420p',
      tmpMasterPath,
    ],
    'stitch 4K xfade master'
  )
  renameSync(tmpMasterPath, videoMasterPath)

  // Step 4: Instant stream-copy mux with all 7 localized Harbor Books audio tracks!
  console.log('Phase 3: Muxing all 7 localized 4K Harbor Books reels...')
  for (const loc of LOCALES) {
    const srcAudioVideo =
      loc === 'en'
        ? join(ROOT, 'public', 'videos', 'video-memoir-trailer.mp4')
        : join(ROOT, 'public', 'videos', `video-memoir-trailer-${loc}.mp4`)
    const outFile =
      loc === 'en'
        ? join(ROOT, 'public', 'videos', 'video-memoir-trailer-4k.mp4')
        : join(ROOT, 'public', 'videos', `video-memoir-trailer-4k-${loc}.mp4`)
    const tmpOut = `${outFile}.${process.pid}.tmp.mp4`
    runFfmpegSync(
      [
        '-y',
        '-i',
        videoMasterPath,
        '-i',
        srcAudioVideo,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-c:v',
        'copy',
        '-c:a',
        'copy',
        '-movflags',
        '+faststart',
        '-shortest',
        tmpOut,
      ],
      `mux 4K ${loc}`
    )
    renameSync(tmpOut, outFile)
    const mb = (statSync(outFile).size / (1024 * 1024)).toFixed(2)
    console.log(`  ✓ ${outFile.replace(ROOT + '/', '')} (${mb} MB, 3840x2160 4K)`)
  }

  console.log(`\n✓ Completed all 7 Harbor Books 4K Cinema reels in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
