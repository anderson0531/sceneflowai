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
const KB_SOURCE_W = 4224 // 1.10x overscan for crisp subpixel Ken Burns motion
const KB_SOURCE_H = 2376

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
  const denom = Math.max(1, totalFrames - 1)
  const motion = blockIndex % 4

  let zExpr: string
  let xExpr: string
  let yExpr: string

  switch (motion) {
    case 0:
      // Gentle push-in (1.00 -> 1.08), upper-centered for portraits
      zExpr = `1.00+0.08*on/${denom}`
      xExpr = `iw/2-(iw/zoom/2)`
      yExpr = `(ih/2-(ih/zoom/2))*0.75`
      break
    case 1:
      // Smooth left-to-right drift at 1.07x zoom
      zExpr = `1.07`
      xExpr = `(iw-iw/zoom)*(0.15+0.70*on/${denom})`
      yExpr = `(ih-ih/zoom)*0.45`
      break
    case 2:
      // Gentle pull-back reveal (1.08 -> 1.00)
      zExpr = `1.08-0.08*on/${denom}`
      xExpr = `iw/2-(iw/zoom/2)`
      yExpr = `(ih/2-(ih/zoom/2))*0.85`
      break
    default:
      // Smooth right-to-left drift at 1.07x zoom
      zExpr = `1.07`
      xExpr = `(iw-iw/zoom)*(0.85-0.70*on/${denom})`
      yExpr = `(ih-ih/zoom)*0.45`
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
    const basePath = join(baseDir, `block-${pad}-${maxFrames}f-base4k.mp4`)
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
        '2200k',
        '-maxrate',
        '3400k',
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
        '25',
        '-maxrate',
        '3400k',
        '-bufsize',
        '6800k',
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
