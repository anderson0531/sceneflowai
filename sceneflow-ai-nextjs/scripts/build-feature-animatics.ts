#!/usr/bin/env npx tsx
/**
 * Stage 2 (100% Local / Sandbox-Safe):
 * Builds all 8 Studio Suite Animatic Films across 7 languages (`56` `.webm` + `56` `.mp4`
 * + `8` `-poster.webp` in `public/landing/key-features/animatics/`) and writes the exact
 * frame-accurate (`24 fps`) chapter & beat timestamp manifest to
 * `src/config/landing/keyFeatureAnimaticsManifest.ts`.
 *
 * Usage:
 *   npx tsx scripts/build-feature-animatics.ts
 *   npx tsx scripts/build-feature-animatics.ts --suite keyframes-clips-flowdirector --locale en
 */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'
import sharp from 'sharp'
import {
  KEY_FEATURE_SUITES,
  type FeatureAnimaticChapterTiming,
  type FeatureAnimaticSuiteManifest,
  type KeyFeatureSuiteId,
} from '../src/config/landing/keyFeatureAnimatics'
import {
  KEY_FEATURE_NARRATED_PAN,
  type FeaturePanLocaleId,
} from '../src/config/landing/keyFeatureNarratedPan'
import {
  KEY_FEATURE_SCREENSHOTS,
  MULTILANGUAGE_UI_AR_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_ES_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_HI_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_PT_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_TH_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_ZH_SCREENSHOT_WEBP,
  SCRIPT_SUPERVISOR_PICKUPS_SCREENSHOT_WEBP,
  SCRIPT_SUPERVISOR_SCREENSHOT_WEBP,
  keyFeatureScreenshotSrc,
} from '../src/config/landing/keyFeatureScreenshots'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FFMPEG = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg'

const ALL_LOCALES: readonly FeaturePanLocaleId[] = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

const W = 1280
const H = 720
const FPS = 4
const SR = 48000

const LEAD_IN_SEC = 0.4
const TAIL_PAD_SEC = 0.55

const TARGET_VO_RMS = 0.188
const TARGET_MUSIC_BED_RMS = 0.125
const MUSIC_GAIN_IDLE = 0.22
const MUSIC_GAIN_DUCKED = 0.085

interface StereoPcm {
  L: Float64Array
  R: Float64Array
  durationSec: number
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const suiteArg = get('--suite')
  const localeArg = get('--locale')
  const suites = suiteArg
    ? KEY_FEATURE_SUITES.filter((s) => suiteArg.split(',').includes(s.id))
    : [...KEY_FEATURE_SUITES]
  const locales = localeArg
    ? (localeArg.split(',').map((s) => s.trim()).filter(Boolean) as FeaturePanLocaleId[])
    : [...ALL_LOCALES]
  return {
    suites,
    locales,
    force: argv.includes('--force'),
  }
}

function runFfmpeg(args: string[], label: string) {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (res.status !== 0) {
    throw new Error(`FFmpeg failed (${label}):\n${(res.stderr || '').slice(-1800)}`)
  }
  return res
}

function findWavDataChunk(buf: Buffer): { offset: number; byteLength: number } {
  let pos = 12
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'data') {
      return { offset: pos + 8, byteLength: Math.min(size, buf.length - (pos + 8)) }
    }
    pos += 8 + size + (size % 2)
  }
  return { offset: 44, byteLength: Math.max(0, buf.length - 44) }
}

function decodeAudioToStereoPcm(audioPath: string, tmpWavPath: string): StereoPcm {
  mkdirSync(dirname(tmpWavPath), { recursive: true })
  runFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      audioPath,
      '-ac',
      '2',
      '-ar',
      String(SR),
      '-f',
      'wav',
      tmpWavPath,
    ],
    `decode ${audioPath}`
  )
  const buf = readFileSync(tmpWavPath)
  try {
    unlinkSync(tmpWavPath)
  } catch {
    // ignore
  }
  const { offset, byteLength } = findWavDataChunk(buf)
  const samples = Math.floor(byteLength / 4)
  const L = new Float64Array(samples)
  const R = new Float64Array(samples)
  for (let i = 0; i < samples; i++) {
    L[i] = buf.readInt16LE(offset + i * 4) / 32768
    R[i] = buf.readInt16LE(offset + i * 4 + 2) / 32768
  }
  return { L, R, durationSec: samples / SR }
}

function writeStereoWav(wavPath: string, L: Float64Array, R: Float64Array) {
  const samples = Math.min(L.length, R.length)
  const dataBytes = samples * 4
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 4, 'ascii')
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8, 4, 'ascii')
  header.write('fmt ', 12, 4, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(2, 22)
  header.writeUInt32LE(SR, 24)
  header.writeUInt32LE(SR * 4, 28)
  header.writeUInt16LE(4, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36, 4, 'ascii')
  header.writeUInt32LE(dataBytes, 40)

  const body = Buffer.alloc(dataBytes)
  const softLimit = (x: number) => Math.tanh(x * 1.04) / Math.tanh(1.04)
  for (let i = 0; i < samples; i++) {
    const l = Math.max(-32768, Math.min(32767, Math.round(softLimit(L[i]!) * 32767)))
    const r = Math.max(-32768, Math.min(32767, Math.round(softLimit(R[i]!) * 32767)))
    body.writeInt16LE(l, i * 4)
    body.writeInt16LE(r, i * 4 + 2)
  }
  mkdirSync(dirname(wavPath), { recursive: true })
  writeFileSync(wavPath, Buffer.concat([header, body]))
}

function trimVoGentle(pcm: StereoPcm): StereoPcm {
  const n = pcm.L.length
  const win = Math.floor(SR * 0.01)
  const threshold = 0.0011

  let firstActive = 0
  while (firstActive + win < n) {
    let sumSq = 0
    for (let i = 0; i < win; i++) {
      const m = 0.5 * (Math.abs(pcm.L[firstActive + i]!) + Math.abs(pcm.R[firstActive + i]!))
      sumSq += m * m
    }
    if (Math.sqrt(sumSq / win) >= threshold) break
    firstActive += win
  }

  let lastActive = n - 1
  while (lastActive - win > firstActive) {
    let sumSq = 0
    for (let i = 0; i < win; i++) {
      const m = 0.5 * (Math.abs(pcm.L[lastActive - i]!) + Math.abs(pcm.R[lastActive - i]!))
      sumSq += m * m
    }
    if (Math.sqrt(sumSq / win) >= threshold) break
    lastActive -= win
  }

  const prePad = Math.floor(SR * 0.12)
  const postPad = Math.floor(SR * 0.16)
  const start = Math.max(0, firstActive - prePad)
  const end = Math.min(n, lastActive + postPad)

  const L = pcm.L.slice(start, end)
  const R = pcm.R.slice(start, end)
  const ramp = Math.min(Math.floor(SR * 0.01), Math.floor(L.length / 4))
  for (let i = 0; i < ramp; i++) {
    const g = 0.5 * (1 - Math.cos((Math.PI * i) / ramp))
    L[i]! *= g
    R[i]! *= g
    const rev = L.length - 1 - i
    L[rev]! *= g
    R[rev]! *= g
  }
  return { L, R, durationSec: L.length / SR }
}

function normalizePcmActiveRms(pcm: StereoPcm, targetRms: number) {
  const win = Math.floor(SR * 0.05)
  let activeSumSq = 0
  let activeSamples = 0
  for (let pos = 0; pos + win <= pcm.L.length; pos += win) {
    let wSq = 0
    for (let i = 0; i < win; i++) {
      const m = 0.5 * (pcm.L[pos + i]! + pcm.R[pos + i]!)
      wSq += m * m
    }
    const wRms = Math.sqrt(wSq / win)
    if (wRms > 0.008) {
      activeSumSq += wSq
      activeSamples += win
    }
  }
  const currentRms =
    activeSamples > 0 ? Math.sqrt(activeSumSq / activeSamples) : targetRms
  const gain = Math.max(0.35, Math.min(3.2, targetRms / Math.max(0.005, currentRms)))
  for (let i = 0; i < pcm.L.length; i++) {
    pcm.L[i]! *= gain
    pcm.R[i]! *= gain
  }
}

function countWeight(text: string): number {
  return Math.max(8, Array.from(text.replace(/\s+/g, '')).length)
}

/**
 * Finds the natural inter-sentence silence pauses inside a trimmed VO PCM
 * corresponding to the boundaries between Beat 0, Beat 1, ..., Beat k-1.
 */
function detectBeatOffsetsInChapter(
  voPcm: StereoPcm,
  beatTexts: readonly string[],
  chapterDurSec: number
): number[] {
  const k = beatTexts.length
  if (k <= 1) return [0]

  const weights = beatTexts.map(countWeight)
  const totalW = weights.reduce((a, b) => a + b, 0)
  const voDur = voPcm.durationSec

  // Precompute 40ms RMS envelope
  const hop = Math.floor(SR * 0.04)
  const numFrames = Math.max(1, Math.floor(voPcm.L.length / hop))
  const rmsEnv = new Float64Array(numFrames)
  for (let f = 0; f < numFrames; f++) {
    let sq = 0
    const base = f * hop
    for (let i = 0; i < hop; i++) {
      const m = 0.5 * (Math.abs(voPcm.L[base + i]!) + Math.abs(voPcm.R[base + i]!))
      sq += m * m
    }
    rmsEnv[f] = Math.sqrt(sq / hop)
  }

  const offsets: number[] = [0]
  let cumW = 0
  let prevSec = 0.8

  for (let b = 0; b < k - 1; b++) {
    cumW += weights[b]!
    const ratio = cumW / totalW
    const expectedVoSec = ratio * voDur
    const minSearchVoSec = Math.max(prevSec + 1.2, expectedVoSec - 1.65)
    const maxSearchVoSec = Math.min(voDur - 1.2, expectedVoSec + 1.65)

    let bestVoSec = expectedVoSec
    if (maxSearchVoSec > minSearchVoSec) {
      const fStart = Math.max(0, Math.floor(minSearchVoSec / 0.04))
      const fEnd = Math.min(numFrames - 1, Math.ceil(maxSearchVoSec / 0.04))
      let minScore = Number.POSITIVE_INFINITY
      for (let f = fStart; f <= fEnd; f++) {
        // 3-frame smoothed RMS + mild distance penalty from expectedVoSec
        const rPrev = rmsEnv[Math.max(0, f - 1)]!
        const rCur = rmsEnv[f]!
        const rNext = rmsEnv[Math.min(numFrames - 1, f + 1)]!
        const localRms = 0.25 * rPrev + 0.5 * rCur + 0.25 * rNext
        const distPenalty = Math.abs(f * 0.04 - expectedVoSec) * 0.004
        const score = localRms + distPenalty
        if (score < minScore) {
          minScore = score
          bestVoSec = f * 0.04
        }
      }
    }

    const quantizedSec =
      Math.round(Math.min(chapterDurSec - 1.0, LEAD_IN_SEC + bestVoSec) * FPS) / FPS
    prevSec = bestVoSec
    offsets.push(Number(quantizedSec.toFixed(4)))
  }

  return offsets
}

function resolvePublicImageDiskPath(webUrl: string, tmpDir: string): string {
  const cleanRel = webUrl.split('?')[0]!.replace(/^\//, '')
  const fullPath = join(ROOT, 'public', cleanRel)
  if (!existsSync(fullPath)) {
    throw new Error(`Missing screenshot asset on disk: ${fullPath}`)
  }
  if (fullPath.endsWith('.webm')) {
    const extractedPng = join(tmpDir, 'new-series-extracted.png')
    if (!existsSync(extractedPng)) {
      mkdirSync(dirname(extractedPng), { recursive: true })
      runFfmpeg(
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          fullPath,
          '-frames:v',
          '1',
          extractedPng,
        ],
        'extract new-series.webm still'
      )
    }
    return extractedPng
  }
  return fullPath
}

function watermarkOverlaySvg(): Buffer {
  return Buffer.from(
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${W - 196}" y="${H - 42}" width="180" height="28" rx="14" fill="#020617" fill-opacity="0.76" stroke="#334155" stroke-width="1"/>
      <circle cx="${W - 178}" cy="${H - 28}" r="4.5" fill="#10b981"/>
      <text x="${W - 166}" y="${H - 23}" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif" font-size="12.5" font-weight="700">SceneFlow Studio</text>
    </svg>`
  )
}

/**
 * Generates crisp 1280x720 PNG beat plates for a `(icon, locale)` chapter:
 * - Standard 16:9 / wide UI screenshots: Beat 0 = full crisp 16:9 framing, Beat 1 = subtle left/top detail crop, Beat 2 = subtle right/bottom detail crop (calm, 100% readable, zero dizzying motion).
 * - Tall full-page UI captures (`height / width > 0.78`): Beat 0 = top section, Beat 1 = middle section, Beat 2 = bottom section.
 * - `scriptSupervisor`: Beats 0..2 from `script-supervisor.webp` (top, middle, bottom), Beat 3 from `script-supervisor-pickups.webp`.
 * - `multilanguageUi`: Uses matching localized UI screenshot (`es`, `pt`, `zh`, `hi`, `ar`, `th`), or cycles `es -> zh -> ar` for `en`.
 */
async function buildBeatPlatesForFeature(args: {
  icon: string
  locale: FeaturePanLocaleId
  numBeats: number
  platesDir: string
  tmpDir: string
}): Promise<string[]> {
  const { icon, locale, numBeats, platesDir, tmpDir } = args
  mkdirSync(platesDir, { recursive: true })

  const resolveBeatSourceUrl = (beatIdx: number): string => {
    if (icon === 'scriptSupervisor') {
      return beatIdx >= 3
        ? SCRIPT_SUPERVISOR_PICKUPS_SCREENSHOT_WEBP
        : SCRIPT_SUPERVISOR_SCREENSHOT_WEBP
    }
    if (icon === 'multilanguageUi') {
      if (locale === 'es') return MULTILANGUAGE_UI_ES_SCREENSHOT_WEBP
      if (locale === 'pt') return MULTILANGUAGE_UI_PT_SCREENSHOT_WEBP
      if (locale === 'zh') return MULTILANGUAGE_UI_ZH_SCREENSHOT_WEBP
      if (locale === 'hi') return MULTILANGUAGE_UI_HI_SCREENSHOT_WEBP
      if (locale === 'ar') return MULTILANGUAGE_UI_AR_SCREENSHOT_WEBP
      if (locale === 'th') return MULTILANGUAGE_UI_TH_SCREENSHOT_WEBP
      const cycle = [
        MULTILANGUAGE_UI_ES_SCREENSHOT_WEBP,
        MULTILANGUAGE_UI_ZH_SCREENSHOT_WEBP,
        MULTILANGUAGE_UI_AR_SCREENSHOT_WEBP,
      ]
      return cycle[beatIdx % cycle.length]!
    }
    const entry = KEY_FEATURE_SCREENSHOTS[icon]
    if (!entry) {
      throw new Error(`Missing KEY_FEATURE_SCREENSHOTS entry for "${icon}"`)
    }
    return keyFeatureScreenshotSrc(entry)
  }

  const platePaths: string[] = []
  const wmSvg = watermarkOverlaySvg()

  for (let b = 0; b < numBeats; b++) {
    const srcUrl = resolveBeatSourceUrl(b)
    const localeKey = icon === 'multilanguageUi' ? locale : 'shared'
    const outPng = join(platesDir, `${icon}-${localeKey}-b${b}.png`)
    if (existsSync(outPng) && statSync(outPng).size > 15_000) {
      platePaths.push(outPng)
      continue
    }

    const diskSrc = resolvePublicImageDiskPath(srcUrl, tmpDir)
    const meta = await sharp(diskSrc).metadata()
    const srcW = meta.width || 2560
    const srcH = meta.height || 1440
    const aspect = srcH / srcW

    let baseBuf: Buffer
    if (aspect > 0.78) {
      // Tall full-page screenshot: resize width to 1216px inside 1280px dark canvas and step cleanly top -> mid -> bottom
      const targetW = 1216
      const scaledH = Math.max(H, Math.round((srcH * targetW) / srcW))
      const resized = await sharp(diskSrc)
        .resize(targetW, scaledH, { kernel: 'lanczos3' })
        .png()
        .toBuffer()

      const effectiveBeats = icon === 'scriptSupervisor' && b < 3 ? 3 : numBeats
      const effectiveIdx = icon === 'scriptSupervisor' && b >= 3 ? 0 : b
      const frac =
        effectiveBeats <= 1 ? 0 : Math.min(1, effectiveIdx / (effectiveBeats - 1))
      const maxTop = Math.max(0, scaledH - (H - 24))
      const cropTop = Math.round(frac * maxTop)
      const cropH = Math.min(H - 24, scaledH - cropTop)

      const cropped = await sharp(resized)
        .extract({ left: 0, top: cropTop, width: targetW, height: cropH })
        .png()
        .toBuffer()

      baseBuf = await sharp({
        create: {
          width: W,
          height: H,
          channels: 4,
          background: { r: 2, g: 6, b: 23, alpha: 1 },
        },
      })
        .composite([
          {
            input: cropped,
            left: Math.round((W - targetW) / 2),
            top: Math.round((H - cropH) / 2),
          },
          { input: wmSvg, left: 0, top: 0 },
        ])
        .png()
        .toBuffer()
    } else {
      // Wide / 16:9 UI screenshot: Beat 0 = crisp full-screen overview; Beat 1 & Beat 2 = calm, readable ~1.08x focus crops
      if (b === 0) {
        const fitted = await sharp(diskSrc)
          .resize(W - 24, H - 20, {
            fit: 'contain',
            background: { r: 2, g: 6, b: 23, alpha: 1 },
            kernel: 'lanczos3',
          })
          .png()
          .toBuffer()

        baseBuf = await sharp({
          create: {
            width: W,
            height: H,
            channels: 4,
            background: { r: 2, g: 6, b: 23, alpha: 1 },
          },
        })
          .composite([
            { input: fitted, left: 12, top: 10 },
            { input: wmSvg, left: 0, top: 0 },
          ])
          .png()
          .toBuffer()
      } else {
        // Gentle 1.12x focus framing (left-bias on Beat 1, right-bias on Beat 2) so UI cards are crystal-clear without motion blur
        const zoomFactor = 1.12
        const cropW = Math.min(srcW, Math.round(srcW / zoomFactor))
        const cropH = Math.min(srcH, Math.round(cropW * (H / W)))
        const maxLeft = Math.max(0, srcW - cropW)
        const maxTop = Math.max(0, srcH - cropH)
        const left = b === 1 ? Math.round(maxLeft * 0.12) : Math.round(maxLeft * 0.88)
        const top = b === 1 ? Math.round(maxTop * 0.2) : Math.round(maxTop * 0.78)

        const focused = await sharp(diskSrc)
          .extract({ left, top, width: cropW, height: cropH })
          .resize(W, H, { fit: 'cover', kernel: 'lanczos3' })
          .png()
          .toBuffer()

        baseBuf = await sharp(focused)
          .composite([{ input: wmSvg, left: 0, top: 0 }])
          .png()
          .toBuffer()
      }
    }

    writeFileSync(outPng, baseBuf)
    platePaths.push(outPng)
  }

  return platePaths
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let idx = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (idx < items.length) {
        const current = items[idx++]
        if (current !== undefined) {
          await worker(current)
        }
      }
    })
  )
}

async function main() {
  const { suites, locales, force } = parseArgs(process.argv.slice(2))

  const buildRoot = join(ROOT, 'tmp', 'feature-animatics-build')
  const voRoot = join(buildRoot, 'vo')
  const platesDir = join(buildRoot, 'plates')
  const tmpDir = join(buildRoot, 'scratch')
  const outAnimaticsDir = join(ROOT, 'public', 'landing', 'key-features', 'animatics')

  mkdirSync(platesDir, { recursive: true })
  mkdirSync(tmpDir, { recursive: true })
  mkdirSync(outAnimaticsDir, { recursive: true })

  const musicMp3 = join(ROOT, 'tmp', 'video-services-build', 'training', 'music.mp3')
  if (!existsSync(musicMp3)) {
    throw new Error(`Cached background score not found at ${musicMp3}`)
  }
  console.log('Decoding & normalizing background score...')
  const musicBed = decodeAudioToStereoPcm(musicMp3, join(tmpDir, 'music-bed.wav'))
  normalizePcmActiveRms(musicBed, TARGET_MUSIC_BED_RMS)

  const manifestTsPath = join(
    ROOT,
    'src',
    'config',
    'landing',
    'keyFeatureAnimaticsManifest.ts'
  )
  const fullManifest: Partial<Record<KeyFeatureSuiteId, FeatureAnimaticSuiteManifest>> = {}

  for (const suite of suites) {
    console.log(`\n======================================================`)
    console.log(`Building Suite [${suite.id}] (${suite.featureIcons.length} chapters)`)
    console.log(`======================================================`)

    const suiteEntry: FeatureAnimaticSuiteManifest = {
      suiteId: suite.id,
      locales: {} as FeatureAnimaticSuiteManifest['locales'],
    }

    // Pre-generate shared & localized plates sequentially per suite so sharp cache is warm
    for (const icon of suite.featureIcons) {
      const spec = KEY_FEATURE_NARRATED_PAN[icon]!
      const locsForPlates: readonly FeaturePanLocaleId[] =
        icon === 'multilanguageUi' ? locales : ['en']
      for (const pLoc of locsForPlates) {
        await buildBeatPlatesForFeature({
          icon,
          locale: pLoc,
          numBeats: spec.beats.length,
          platesDir,
          tmpDir,
        })
      }
    }

    const firstIcon = suite.featureIcons[0]!
    const firstSpec = KEY_FEATURE_NARRATED_PAN[firstIcon]!
    const posterPlates = await buildBeatPlatesForFeature({
      icon: firstIcon,
      locale: 'en',
      numBeats: firstSpec.beats.length,
      platesDir,
      tmpDir,
    })
    const posterOut = join(outAnimaticsDir, `${suite.id}-poster.webp`)
    if (force || !existsSync(posterOut) || statSync(posterOut).size < 5_000) {
      await sharp(posterPlates[0]!).webp({ quality: 86, effort: 5 }).toFile(posterOut)
      console.log(`  [poster] ${suite.id}-poster.webp`)
    }

    await runPool([...locales], 3, async (locale) => {
      const chaptersMap: Record<string, FeatureAnimaticChapterTiming> = {}
      const ffconcatEntries: Array<{ pngPath: string; durSec: number }> = []
      const chapterVoPlacements: Array<{
        voPcm: StereoPcm
        voStartSample: number
        voEndSample: number
      }> = []

      let cursorFrames = 0

      for (const icon of suite.featureIcons) {
        const voMp3 = join(voRoot, locale, `${icon}.mp3`)
        if (!existsSync(voMp3)) {
          throw new Error(`Missing synthesized VO file: ${voMp3}`)
        }
        const rawVo = decodeAudioToStereoPcm(
          voMp3,
          join(tmpDir, `vo-${suite.id}-${locale}-${icon}.wav`)
        )
        const voPcm = trimVoGentle(rawVo)
        normalizePcmActiveRms(voPcm, TARGET_VO_RMS)

        const rawChapterSec = LEAD_IN_SEC + voPcm.durationSec + TAIL_PAD_SEC
        const chapterFrames = Math.max(FPS * 4, Math.ceil(rawChapterSec * FPS))
        const chapterDurSec = chapterFrames / FPS
        const chapterStartSec = cursorFrames / FPS

        const spec = KEY_FEATURE_NARRATED_PAN[icon]!
        const beatTexts = spec.beats.map((b) => b.narration[locale])
        const relBeatOffsets = detectBeatOffsetsInChapter(
          voPcm,
          beatTexts,
          chapterDurSec
        )

        const plates = await buildBeatPlatesForFeature({
          icon,
          locale,
          numBeats: spec.beats.length,
          platesDir,
          tmpDir,
        })

        const relBeatFrames = relBeatOffsets.map((sec) => Math.round(sec * FPS))
        const absBeatStartsSec: number[] = []
        let actualRenderedChapterFrames = 0

        for (let b = 0; b < spec.beats.length; b++) {
          const bStartFrame = relBeatFrames[b]!
          const bEndFrame =
            b + 1 < spec.beats.length ? relBeatFrames[b + 1]! : chapterFrames
          const bFrames = Math.max(4, bEndFrame - bStartFrame)
          absBeatStartsSec.push(
            Number(((cursorFrames + actualRenderedChapterFrames) / FPS).toFixed(4))
          )
          ffconcatEntries.push({
            pngPath: plates[b]!,
            durSec: bFrames / FPS,
          })
          actualRenderedChapterFrames += bFrames
        }

        const actualChapterEndSec =
          (cursorFrames + actualRenderedChapterFrames) / FPS

        chaptersMap[icon] = {
          startSec: Number(chapterStartSec.toFixed(4)),
          endSec: Number(actualChapterEndSec.toFixed(4)),
          beatStartsSec: absBeatStartsSec,
        }

        const voStartSample = Math.round((chapterStartSec + LEAD_IN_SEC) * SR)
        chapterVoPlacements.push({
          voPcm,
          voStartSample,
          voEndSample: voStartSample + voPcm.L.length,
        })

        cursorFrames += actualRenderedChapterFrames
      }

      const totalSuiteSec = cursorFrames / FPS
      suiteEntry.locales[locale] = {
        totalDurationSec: Number(totalSuiteSec.toFixed(4)),
        chapters: chaptersMap,
      }

      const outWebm = join(outAnimaticsDir, `${suite.id}-${locale}.webm`)
      const outMp4 = join(outAnimaticsDir, `${suite.id}-${locale}.mp4`)

      if (
        !force &&
        existsSync(outWebm) &&
        existsSync(outMp4) &&
        statSync(outWebm).size > 80_000 &&
        statSync(outMp4).size > 80_000
      ) {
        console.log(
          `  [cached] ${suite.id}-${locale} (${totalSuiteSec.toFixed(1)}s)`
        )
        return
      }

      // 1. Mix full suite stereo 48kHz audio (VO + ducked underscore + loudnorm)
      const totalSamples = Math.ceil(totalSuiteSec * SR)
      const mixL = new Float64Array(totalSamples)
      const mixR = new Float64Array(totalSamples)
      const duckEnv = new Float64Array(totalSamples).fill(MUSIC_GAIN_IDLE)

      const duckRamp = Math.floor(SR * 0.28)
      for (const placement of chapterVoPlacements) {
        const s0 = Math.max(0, placement.voStartSample)
        const s1 = Math.min(totalSamples, placement.voEndSample)
        for (let i = s0; i < s1; i++) {
          duckEnv[i] = MUSIC_GAIN_DUCKED
          const voIdx = i - placement.voStartSample
          if (voIdx >= 0 && voIdx < placement.voPcm.L.length) {
            mixL[i]! += placement.voPcm.L[voIdx]!
            mixR[i]! += placement.voPcm.R[voIdx]!
          }
        }
        for (let r = 0; r < duckRamp; r++) {
          const preIdx = s0 - duckRamp + r
          if (preIdx >= 0 && preIdx < totalSamples) {
            const t = 0.5 * (1 - Math.cos((Math.PI * r) / duckRamp))
            const g = MUSIC_GAIN_IDLE + (MUSIC_GAIN_DUCKED - MUSIC_GAIN_IDLE) * t
            if (g < duckEnv[preIdx]!) duckEnv[preIdx] = g
          }
          const postIdx = s1 + r
          if (postIdx >= 0 && postIdx < totalSamples) {
            const t = 0.5 * (1 - Math.cos((Math.PI * r) / duckRamp))
            const g = MUSIC_GAIN_DUCKED + (MUSIC_GAIN_IDLE - MUSIC_GAIN_DUCKED) * t
            if (g < duckEnv[postIdx]!) duckEnv[postIdx] = g
          }
        }
      }

      const fadeInSamples = Math.min(totalSamples, Math.floor(SR * 0.5))
      const fadeOutSamples = Math.min(totalSamples, Math.floor(SR * 0.85))
      const bedLen = Math.max(1, musicBed.L.length)

      for (let i = 0; i < totalSamples; i++) {
        let mGain = duckEnv[i]!
        if (i < fadeInSamples) {
          mGain *= i / fadeInSamples
        }
        if (i >= totalSamples - fadeOutSamples) {
          mGain *= (totalSamples - 1 - i) / fadeOutSamples
        }
        const mIdx = i % bedLen
        mixL[i]! += musicBed.L[mIdx]! * mGain
        mixR[i]! += musicBed.R[mIdx]! * mGain
      }

      const rawMixWav = join(tmpDir, `${suite.id}-${locale}-rawmix.wav`)
      const normMixWav = join(tmpDir, `${suite.id}-${locale}-norm.wav`)
      writeStereoWav(rawMixWav, mixL, mixR)

      runFfmpeg(
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          rawMixWav,
          '-af',
          'loudnorm=I=-16:TP=-1.5:LRA=11',
          '-ar',
          String(SR),
          '-ac',
          '2',
          normMixWav,
        ],
        `loudnorm ${suite.id}-${locale}`
      )

      // 2. Write ffconcat PNG timeline directly (zero intermediate H.264 re-decode overhead!)
      const concatTxt = join(tmpDir, `${suite.id}-${locale}-ffconcat.txt`)
      const lines = ['ffconcat version 1.0']
      for (const item of ffconcatEntries) {
        const escaped = item.pngPath.replace(/'/g, "'\\''")
        lines.push(`file '${escaped}'`)
        lines.push(`duration ${item.durSec.toFixed(6)}`)
      }
      if (ffconcatEntries.length > 0) {
        const lastEscaped =
          ffconcatEntries[ffconcatEntries.length - 1]!.pngPath.replace(/'/g, "'\\''")
        lines.push(`file '${lastEscaped}'`)
      }
      writeFileSync(concatTxt, lines.join('\n') + '\n')

      // 3. Encode compact H.264 + AAC `.mp4` (`+faststart`)
      runFfmpeg(
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          concatTxt,
          '-i',
          normMixWav,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-vf',
          `fps=${FPS},format=yuv420p`,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-tune',
          'stillimage',
          '-crf',
          '25',
          '-g',
          String(FPS * 4),
          '-keyint_min',
          String(FPS),
          '-c:a',
          'aac',
          '-b:a',
          '80k',
          '-ar',
          String(SR),
          '-movflags',
          '+faststart',
          '-shortest',
          outMp4,
        ],
        `encode mp4 ${suite.id}-${locale}`
      )

      // 4. Encode compact VP9 + Opus `.webm` (`-cues_to_front 1`)
      runFfmpeg(
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          concatTxt,
          '-i',
          normMixWav,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-vf',
          `fps=${FPS},format=yuv420p`,
          '-c:v',
          'libvpx-vp9',
          '-b:v',
          '0',
          '-crf',
          '35',
          '-deadline',
          'good',
          '-cpu-used',
          '5',
          '-row-mt',
          '1',
          '-g',
          String(FPS * 4),
          '-keyint_min',
          String(FPS),
          '-c:a',
          'libopus',
          '-b:a',
          '56k',
          '-cues_to_front',
          '1',
          '-shortest',
          outWebm,
        ],
        `encode webm ${suite.id}-${locale}`
      )

      try {
        unlinkSync(rawMixWav)
        unlinkSync(normMixWav)
        unlinkSync(concatTxt)
      } catch {
        // ignore
      }

      const webmKb = (statSync(outWebm).size / 1024).toFixed(0)
      const mp4Kb = (statSync(outMp4).size / 1024).toFixed(0)
      console.log(
        `  [encoded] ${suite.id}-${locale} (${totalSuiteSec.toFixed(1)}s) -> WebM ${webmKb} KB | MP4 ${mp4Kb} KB`
      )
    })

    // Re-order locales deterministically in manifest
    const orderedLocales = {} as FeatureAnimaticSuiteManifest['locales']
    for (const loc of ALL_LOCALES) {
      if (suiteEntry.locales[loc]) {
        orderedLocales[loc] = suiteEntry.locales[loc]
      }
    }
    suiteEntry.locales = orderedLocales
    fullManifest[suite.id] = suiteEntry
  }

  // Write TypeScript manifest when all 8 suites & 7 locales are built
  if (suites.length === KEY_FEATURE_SUITES.length && locales.length === ALL_LOCALES.length) {
    const tsContent = `import type { FeatureAnimaticSuiteManifest, KeyFeatureSuiteId } from './keyFeatureAnimatics'

/**
 * Auto-generated by \`scripts/build-feature-animatics.ts\`.
 * Frame-exact (\`24 fps\`) chapter \`[startSec, endSec]\` and per-beat timestamps
 * across all 8 Studio Suite Animatics and all 7 languages.
 */
export const KEY_FEATURE_ANIMATICS_MANIFEST: Partial<
  Record<KeyFeatureSuiteId, FeatureAnimaticSuiteManifest>
> = ${JSON.stringify(fullManifest, null, 2)}
`
    writeFileSync(manifestTsPath, tsContent)
    console.log(`\n✓ Wrote ${manifestTsPath.replace(`${ROOT}/`, '')}`)
  }
}

main().catch((err) => {
  console.error('\n[build-feature-animatics] Fatal error:', err)
  process.exit(1)
})
