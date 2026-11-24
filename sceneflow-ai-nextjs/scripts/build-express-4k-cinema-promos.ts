#!/usr/bin/env npx tsx
/**
 * Builds true 4K (3840x2160 @ 24fps) Express 4K Cinema Film examples across all
 * 4 verticals (`memoir`, `realestate`, `training`, `brand`) and all 7 languages
 * (`en`, `es`, `pt`, `hi`, `zh`, `ar`, `th`) = 28 Express 4K Cinema Films.
 *
 * Fast 2-Phase Architecture:
 *   Phase 1: Extracts 1 crisp hero still per block (~12 per vertical = ~48 total)
 *            and renders 1 smooth 4K Ken Burns base clip per block at `maxTargetFrames`
 *            (4-way varied documentary push-in / pull-back / L-R / R-L motion).
 *   Phase 2: For each of the 7 languages, frame-accurately trims each block's 4K base
 *            clip to that language's exact `targetFrames`, stitches them seamlessly,
 *            and muxes with `master-mix-{loc}.wav` into:
 *              public/landing/video-services/videos/express-{vertical}-{locale}.mp4
 *
 * Usage:
 *   npx tsx scripts/build-express-4k-cinema-promos.ts --vertical memoir
 *   npx tsx scripts/build-express-4k-cinema-promos.ts --all
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'
import { VIDEO_SERVICE_PROMO_SCRIPTS } from '../src/config/landing/videoServicePromoScripts'
import type {
  FeaturePanLocaleId,
  VideoServiceVerticalId,
} from '../src/config/landing/videoServicesNarratedPan'
import type { VerticalSourceManifest } from './fetch-video-service-assets'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FFMPEG = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg'

const ALL_VERTICALS: readonly VideoServiceVerticalId[] = [
  'memoir',
  'realestate',
  'training',
  'brand',
] as const

const ALL_LOCALES: readonly FeaturePanLocaleId[] = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

const FPS = 24
const TARGET_W = 3840
const TARGET_H = 2160
const KB_SOURCE_W = 5760 // 1.50x overscan for silky sub-pixel 4K Ken Burns motion even at 1.32x zoom
const KB_SOURCE_H = 3240

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const runAll = argv.includes('--all')
  const verticalArg = get('--vertical')
  const verticals = runAll
    ? [...ALL_VERTICALS]
    : ([(verticalArg || 'memoir') as VideoServiceVerticalId] as VideoServiceVerticalId[])
  const localeArg = get('--locale')
  const locales = localeArg
    ? (localeArg.split(',').map((s) => s.trim()).filter(Boolean) as FeaturePanLocaleId[])
    : [...ALL_LOCALES]
  const concurrency = Math.max(1, Math.min(6, Number(get('--concurrency') || 4)))
  const force = argv.includes('--force')
  return { verticals, locales, concurrency, force }
}

function runFfmpegSync(args: string[], label: string) {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (res.status !== 0) {
    throw new Error(`FFmpeg failed (${label}):\n${(res.stderr || '').slice(-1500)}`)
  }
}

function runFfmpegAsync(args: string[], label: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
      if (stderr.length > 8000) stderr = stderr.slice(-4000)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`FFmpeg failed (${label}, code=${code}):\n${stderr.slice(-1500)}`))
    })
  })
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let nextIdx = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = nextIdx++
      if (idx >= items.length) break
      await worker(items[idx]!)
    }
  })
  await Promise.all(runners)
}

function hasVideoToolbox(): boolean {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-encoders'], { encoding: 'utf8' })
  return /h264_videotoolbox/.test(r.stdout || '')
}

function loadBlockFrameCountsFromConcat(
  workDir: string,
  loc: FeaturePanLocaleId
): Array<{ blockNumber: number; targetFrames: number }> {
  const concatPath = join(workDir, `concat-${loc}.txt`)
  if (!existsSync(concatPath)) {
    throw new Error(`Missing ${concatPath} — run build-video-service-promos.ts first.`)
  }
  const lines = readFileSync(concatPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('file '))

  return lines.map((line) => {
    const m = line.match(/block-(\d+)-[^-]+-(\d+)f/)
    if (!m) {
      throw new Error(`Could not parse block/frame count from concat line: ${line}`)
    }
    return {
      blockNumber: Number(m[1]),
      targetFrames: Number(m[2]),
    }
  })
}

function buildKenBurnsFilter(blockIndex: number, totalFrames: number): string {
  // Time-normalized documentary cinema curve:
  // sin(PI * on / 540) starts moving immediately at full cinema velocity on frame 0,
  // hits ~98.5% of the full sweep across a standard 10s (240f) shot, reaches a smooth
  // zero-jerk apex at 11.25s (270f), and gracefully arcs back on longer 13-21s localized
  // dialogue blocks — zero freeze, zero stall, unmistakably alive from the very first frame!
  const s = 'sin(PI*on/540)'
  const motion = blockIndex % 6

  let zExpr: string
  let xExpr: string
  let yExpr: string

  switch (motion) {
    case 0:
      // Confident documentary push-in (1.00 -> 1.26), upper-thirds portrait anchor
      zExpr = `1.00+0.26*${s}`
      xExpr = `(iw-iw/zoom)*0.50`
      yExpr = `(ih-ih/zoom)*0.35`
      break
    case 1:
      // Sweeping left-to-right dolly pan + gentle push (1.22 -> 1.32, ~22% frame travel)
      zExpr = `1.22+0.10*${s}`
      xExpr = `(iw-iw/zoom)*(0.03+0.94*${s})`
      yExpr = `(ih-ih/zoom)*(0.42+0.12*${s})`
      break
    case 2:
      // Grand pull-back reveal (1.28 -> 1.02)
      zExpr = `1.28-0.26*${s}`
      xExpr = `(iw-iw/zoom)*0.50`
      yExpr = `(ih-ih/zoom)*0.40`
      break
    case 3:
      // Sweeping right-to-left dolly pan + gentle pull (1.32 -> 1.20, ~22% frame travel)
      zExpr = `1.32-0.12*${s}`
      xExpr = `(iw-iw/zoom)*(0.97-0.94*${s})`
      yExpr = `(ih-ih/zoom)*(0.52-0.12*${s})`
      break
    case 4:
      // Diagonal crane rise: bottom-left -> upper-right push (1.15 -> 1.32)
      zExpr = `1.15+0.17*${s}`
      xExpr = `(iw-iw/zoom)*(0.12+0.76*${s})`
      yExpr = `(ih-ih/zoom)*(0.78-0.54*${s})`
      break
    default:
      // Diagonal crane glide: upper-right -> lower-left reveal (1.30 -> 1.14)
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

async function buildVerticalExpress4k(
  vertical: VideoServiceVerticalId,
  locales: FeaturePanLocaleId[],
  concurrency: number,
  useVideoToolbox: boolean,
  force: boolean
) {
  const manifestPath = resolve(ROOT, 'scripts', 'video-service-sources', `${vertical}.json`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as VerticalSourceManifest
  const script = VIDEO_SERVICE_PROMO_SCRIPTS[vertical]

  const buildRoot = join(ROOT, 'tmp', 'video-services-build', vertical)
  const clipsDir = join(buildRoot, 'clips')
  const workDir = join(buildRoot, 'work')
  const expressDir = join(workDir, 'express-4k')
  const stillsDir = join(expressDir, 'stills')
  const baseDir = join(expressDir, 'base-4k')
  const outDir = join(ROOT, 'public', 'landing', 'video-services', 'videos')

  mkdirSync(stillsDir, { recursive: true })
  mkdirSync(baseDir, { recursive: true })
  mkdirSync(outDir, { recursive: true })

  console.log(`\n==================== Express 4K Cinema [${vertical}] ====================`)

  // Load exact block frame counts across ALL 7 locales so each base clip covers the longest locale
  const plansByLocale = new Map<
    FeaturePanLocaleId,
    Array<{ blockNumber: number; targetFrames: number }>
  >()
  const maxFramesByBlock = new Map<number, number>()

  for (const loc of ALL_LOCALES) {
    const concatPath = join(workDir, `concat-${loc}.txt`)
    if (!existsSync(concatPath)) continue
    const blockFrames = loadBlockFrameCountsFromConcat(workDir, loc)
    plansByLocale.set(loc, blockFrames)
    for (const bf of blockFrames) {
      const prev = maxFramesByBlock.get(bf.blockNumber) || 0
      if (bf.targetFrames > prev) {
        maxFramesByBlock.set(bf.blockNumber, bf.targetFrames)
      }
    }
  }

  // Phase 1: Extract 1 hero still per block & render 1 true-4K Ken Burns base clip per block
  interface BaseJob {
    blockNumber: number
    blockIndex: number
    maxFrames: number
    stillPath: string
    basePath: string
  }

  const baseJobs: BaseJob[] = []
  for (let idx = 0; idx < script.blocks.length; idx++) {
    const block = script.blocks[idx]!
    const pad = String(block.blockNumber).padStart(2, '0')
    const isDialogue = Boolean(manifest.localizedBlocks[String(block.blockNumber)])
    const clipPath = isDialogue
      ? join(clipsDir, `block-${pad}-en.mp4`)
      : join(clipsDir, `block-${pad}.mp4`)
    const stillPath = join(stillsDir, `block-${pad}.png`)

    if (force || !existsSync(stillPath) || statSync(stillPath).size < 10_000) {
      const seekSec = isDialogue ? '2.8' : '2.0'
      runFfmpegSync(
        ['-y', '-ss', seekSec, '-i', clipPath, '-frames:v', '1', stillPath],
        `extract still ${vertical} block-${pad}`
      )
    }

    const maxFrames = (maxFramesByBlock.get(block.blockNumber) || 264) + 12
    const basePath = join(baseDir, `block-${pad}-${maxFrames}f-base4k-kb2.mp4`)
    baseJobs.push({
      blockNumber: block.blockNumber,
      blockIndex: idx,
      maxFrames,
      stillPath,
      basePath,
    })
  }

  const pendingBaseJobs = baseJobs.filter(
    (j) => force || !existsSync(j.basePath) || statSync(j.basePath).size < 50_000
  )
  console.log(
    `  Phase 1 [${vertical}]: ${baseJobs.length} base 4K Ken Burns clips (${pendingBaseJobs.length} to render, concurrency=${concurrency}, encoder=${useVideoToolbox ? 'h264_videotoolbox' : 'libx264'})`
  )

  let baseDone = 0
  await runPool(pendingBaseJobs, concurrency, async (job) => {
    const vf = buildKenBurnsFilter(job.blockIndex, job.maxFrames)
    const codecArgs = useVideoToolbox
      ? ['-c:v', 'h264_videotoolbox', '-b:v', '6000k', '-profile:v', 'high', '-g', '24']
      : ['-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-g', '24']

    const tmpOut = `${job.basePath}.${process.pid}.tmp.mp4`
    await runFfmpegAsync(
      [
        '-y',
        '-i',
        job.stillPath,
        '-an',
        '-vf',
        vf,
        '-frames:v',
        String(job.maxFrames),
        ...codecArgs,
        '-pix_fmt',
        'yuv420p',
        tmpOut,
      ],
      `base 4K KB ${vertical} block-${job.blockNumber}`
    )
    renameSync(tmpOut, job.basePath)
    baseDone++
    console.log(`  [${vertical}] Base 4K clip ${baseDone}/${pendingBaseJobs.length} ready (block ${job.blockNumber}, ${job.maxFrames}f)`)
  })

  // Phase 2: Stitch each locale's exact frame-aligned 4K MP4 with master stereo audio (parallelized!)
  const basePathByBlock = new Map(baseJobs.map((j) => [j.blockNumber, j.basePath]))
  const finalCodecArgs = useVideoToolbox
    ? [
        '-c:v',
        'h264_videotoolbox',
        '-b:v',
        '2800k',
        '-maxrate',
        '4200k',
        '-profile:v',
        'high',
        '-g',
        '72',
      ]
    : [
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '23',
        '-maxrate',
        '4200k',
        '-bufsize',
        '8400k',
        '-g',
        '72',
      ]

  console.log(`  Phase 2 [${vertical}]: Assembling ${locales.length} localized 4K Express Cinema MP4s...`)
  await runPool(locales, Math.min(2, concurrency), async (loc) => {
    const blockFrames = plansByLocale.get(loc)
    if (!blockFrames || blockFrames.length === 0) {
      throw new Error(`Missing block frame plan for ${vertical}-${loc}`)
    }
    const audioWav = join(workDir, `master-mix-${loc}.wav`)
    if (!existsSync(audioWav)) {
      throw new Error(`Missing pre-mixed audio track: ${audioWav}`)
    }

    const inputArgs: string[] = []
    const filterParts: string[] = []
    const concatInputs: string[] = []

    blockFrames.forEach((bf, i) => {
      const basePath = basePathByBlock.get(bf.blockNumber)
      if (!basePath) throw new Error(`Missing base 4K clip for block ${bf.blockNumber}`)
      inputArgs.push('-i', basePath)
      filterParts.push(
        `[${i}:v]trim=start_frame=0:end_frame=${bf.targetFrames},setpts=PTS-STARTPTS[v${i}]`
      )
      concatInputs.push(`[v${i}]`)
    })

    const audioInputIdx = blockFrames.length
    inputArgs.push('-i', audioWav)
    filterParts.push(`${concatInputs.join('')}concat=n=${blockFrames.length}:v=1:a=0,fps=${FPS}[vout]`)

    const outMp4 = join(outDir, `express-${vertical}-${loc}.mp4`)
    const tmpMp4 = `${outMp4}.${process.pid}.tmp.mp4`

    await runFfmpegAsync(
      [
        '-y',
        ...inputArgs,
        '-filter_complex',
        filterParts.join(';'),
        '-map',
        '[vout]',
        '-map',
        `${audioInputIdx}:a:0`,
        ...finalCodecArgs,
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
        '-shortest',
        tmpMp4,
      ],
      `assemble express-${vertical}-${loc}.mp4`
    )
    renameSync(tmpMp4, outMp4)

    const mb = (statSync(outMp4).size / (1024 * 1024)).toFixed(2)
    const totalSec = (
      blockFrames.reduce((acc, bf) => acc + bf.targetFrames, 0) / FPS
    ).toFixed(1)
    console.log(
      `  ✓ public/landing/video-services/videos/express-${vertical}-${loc}.mp4 (${mb} MB, ${totalSec}s, 3840x2160 4K)`
    )
  })
}

async function main() {
  const { verticals, locales, concurrency, force } = parseArgs(process.argv.slice(2))
  const useVT = hasVideoToolbox()
  const t0 = Date.now()

  for (const vertical of verticals) {
    await buildVerticalExpress4k(vertical, locales, concurrency, useVT, force)
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n✓ Completed Express 4K Cinema build for [${verticals.join(', ')}] in ${elapsed}s`)
}

main().catch((err) => {
  console.error('\n[build-express-4k-cinema-promos] Fatal error:', err)
  process.exit(1)
})
