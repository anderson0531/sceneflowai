#!/usr/bin/env npx tsx
/**
 * Stitches high-quality Studio Narrator (`Charon`) voiceover files for the
 * Landing Page Customer Portal Animatic (`#customer-portal-animatic`), mixing in
 * the gentle ducked orchestral underscore from the Video Services pitch films
 * and writing frame-accurate beat windows to `src/config/landing/customerPortalAudioManifest.ts`.
 *
 * Accepts EITHER drop-in layout inside `tmp/customer-portal-vo/`:
 *   Option A (1 file per language — fastest in Google AI Studio Speech):
 *     tmp/customer-portal-vo/en.wav   (or .mp3 / .m4a / .ogg)
 *     tmp/customer-portal-vo/es.wav   ...
 *
 *   Option B (8 per-beat files per language):
 *     tmp/customer-portal-vo/en/01.wav ... 08.wav  (or .mp3 / .m4a / .ogg)
 *
 * Usage:
 *   npx tsx scripts/stitch-customer-portal-narration.ts
 *   npx tsx scripts/stitch-customer-portal-narration.ts --locale en
 */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'
import {
  CUSTOMER_PORTAL_ANIMATIC_COPY,
  type FeaturePanLocaleId,
  type PortalAnimaticBeatId,
} from '../src/config/landing/customerPortalAnimaticCopy'
import type {
  CustomerPortalBeatAudioWindow,
  CustomerPortalLocaleAudioTiming,
} from '../src/config/landing/customerPortalAudioManifest'

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

const AUDIO_EXTS = new Set(['.wav', '.mp3', '.m4a', '.ogg', '.aac', '.flac'])
const SR = 48000

const LEAD_IN_SEC = 0.4
const INTER_BEAT_GAP_SEC = 0.55
const TAIL_PAD_SEC = 0.7

const TARGET_VO_RMS = 0.188
const TARGET_MUSIC_BED_RMS = 0.125
const MUSIC_GAIN_IDLE = 0.22
const MUSIC_GAIN_DUCKED = 0.085

interface StereoPcm {
  L: Float64Array
  R: Float64Array
  durationSec: number
}

function runFfmpeg(args: string[], label: string) {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (res.status !== 0) {
    throw new Error(`FFmpeg failed (${label}):\n${(res.stderr || '').slice(-1600)}`)
  }
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

function decodeToStereoPcm(inputPath: string, scratchDir: string, tag: string): StereoPcm {
  mkdirSync(scratchDir, { recursive: true })
  const tmpWav = join(scratchDir, `${tag}.wav`)
  runFfmpeg(
    [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-ac',
      '2',
      '-ar',
      String(SR),
      '-c:a',
      'pcm_s16le',
      tmpWav,
    ],
    `decode:${tag}`
  )
  const buf = readFileSync(tmpWav)
  try {
    unlinkSync(tmpWav)
  } catch {
    /* ignore */
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
  const buf = Buffer.alloc(44 + dataBytes)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataBytes, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 4, 28)
  buf.writeUInt16LE(4, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataBytes, 40)
  for (let i = 0; i < samples; i++) {
    const sL = Math.max(-1, Math.min(1, L[i]!))
    const sR = Math.max(-1, Math.min(1, R[i]!))
    buf.writeInt16LE(Math.round(sL * 32767), 44 + i * 4)
    buf.writeInt16LE(Math.round(sR * 32767), 44 + i * 4 + 2)
  }
  writeFileSync(wavPath, buf)
}

function trimAndNormalizeSpeech(pcm: StereoPcm): StereoPcm {
  const n = pcm.L.length
  const win = Math.floor(SR * 0.025) // 25ms RMS frames
  const frames = Math.max(1, Math.floor(n / win))
  const rmsArr = new Float64Array(frames)
  let peak = 0
  for (let f = 0; f < frames; f++) {
    let sum = 0
    const base = f * win
    for (let i = 0; i < win; i++) {
      const m = 0.5 * (pcm.L[base + i]! + pcm.R[base + i]!)
      sum += m * m
    }
    const r = Math.sqrt(sum / win)
    rmsArr[f] = r
    if (r > peak) peak = r
  }

  const thresh = Math.max(0.004, peak * 0.045)
  let firstActive = 0
  while (firstActive < frames - 1 && rmsArr[firstActive]! < thresh) firstActive++
  let lastActive = frames - 1
  while (lastActive > firstActive && rmsArr[lastActive]! < thresh) lastActive--

  const prePadSamples = Math.floor(0.12 * SR)
  const postPadSamples = Math.floor(0.16 * SR)
  const startSample = Math.max(0, firstActive * win - prePadSamples)
  const endSample = Math.min(n, (lastActive + 1) * win + postPadSamples)
  const len = Math.max(1, endSample - startSample)

  const outL = pcm.L.slice(startSample, endSample)
  const outR = pcm.R.slice(startSample, endSample)

  // Compute active speech RMS for consistent broadcast leveling
  let activeSum = 0
  let activeCount = 0
  for (let i = 0; i < len; i++) {
    const m = 0.5 * (outL[i]! + outR[i]!)
    if (Math.abs(m) > thresh * 0.8) {
      activeSum += m * m
      activeCount++
    }
  }
  const activeRms = activeCount > 0 ? Math.sqrt(activeSum / activeCount) : 0.08
  const gain = Math.min(4.0, Math.max(0.35, TARGET_VO_RMS / Math.max(0.01, activeRms)))

  // Gentle 20ms fade-in/out to prevent clicks + soft limiter at 0.96
  const fadeSamples = Math.min(Math.floor(0.02 * SR), Math.floor(len / 4))
  for (let i = 0; i < len; i++) {
    let env = 1.0
    if (i < fadeSamples) env = i / fadeSamples
    else if (i > len - fadeSamples) env = (len - i) / fadeSamples
    outL[i] = Math.tanh(outL[i]! * gain * env * 1.04) * 0.96
    outR[i] = Math.tanh(outR[i]! * gain * env * 1.04) * 0.96
  }

  return { L: outL, R: outR, durationSec: len / SR }
}

/**
 * Splits a single combined narration recording into `expectedCount` (8) beat segments
 * by locating the deepest inter-sentence silence valleys near the expected text-length
 * cumulative proportions.
 */
function splitCombinedNarrationIntoBeats(
  fullPcm: StereoPcm,
  narrationTexts: readonly string[]
): StereoPcm[] {
  const trimmedFull = trimAndNormalizeSpeech(fullPcm)
  const totalSamples = trimmedFull.L.length
  const beatCount = narrationTexts.length
  if (beatCount <= 1) return [trimmedFull]

  const frameSamples = Math.floor(SR * 0.04) // 40ms frames
  const numFrames = Math.max(beatCount * 10, Math.floor(totalSamples / frameSamples))
  const env = new Float64Array(numFrames)
  for (let f = 0; f < numFrames; f++) {
    let sum = 0
    const start = f * frameSamples
    const end = Math.min(totalSamples, start + frameSamples)
    for (let i = start; i < end; i++) {
      const m = 0.5 * (trimmedFull.L[i]! + trimmedFull.R[i]!)
      sum += m * m
    }
    env[f] = Math.sqrt(sum / Math.max(1, end - start))
  }

  // Smooth over 5 frames (~200ms) so multi-frame breath pauses score cleanest
  const smooth = new Float64Array(numFrames)
  for (let f = 0; f < numFrames; f++) {
    let acc = 0
    let c = 0
    for (let d = -2; d <= 2; d++) {
      const idx = f + d
      if (idx >= 0 && idx < numFrames) {
        acc += env[idx]!
        c++
      }
    }
    smooth[f] = acc / c
  }

  const weights = narrationTexts.map((t) => Math.max(12, t.trim().length))
  const weightSum = weights.reduce((a, b) => a + b, 0)

  const cutSamples: number[] = [0]
  let cumWeight = 0
  const minBeatFrames = Math.floor(3.0 / 0.04) // >= 3.0s per beat

  for (let b = 0; b < beatCount - 1; b++) {
    cumWeight += weights[b]!
    const expectedFrac = cumWeight / weightSum
    const expectedFrame = Math.round(expectedFrac * numFrames)
    const prevFrame = Math.floor(cutSamples[cutSamples.length - 1]! / frameSamples)
    const remainingBeats = beatCount - 1 - b

    const searchRadius = Math.round(numFrames * 0.1) // +/-10% of total track
    const minFrame = Math.max(prevFrame + minBeatFrames, expectedFrame - searchRadius)
    const maxFrame = Math.min(
      numFrames - remainingBeats * minBeatFrames,
      expectedFrame + searchRadius
    )

    let bestFrame = Math.max(minFrame, Math.min(maxFrame, expectedFrame))
    let bestScore = Number.POSITIVE_INFINITY

    for (let f = minFrame; f <= maxFrame; f++) {
      const distPenalty = (Math.abs(f - expectedFrame) / Math.max(1, searchRadius)) * 0.008
      const score = smooth[f]! + distPenalty
      if (score < bestScore) {
        bestScore = score
        bestFrame = f
      }
    }
    cutSamples.push(bestFrame * frameSamples)
  }
  cutSamples.push(totalSamples)

  const segments: StereoPcm[] = []
  for (let b = 0; b < beatCount; b++) {
    const s = cutSamples[b]!
    const e = cutSamples[b + 1]!
    segments.push(
      trimAndNormalizeSpeech({
        L: trimmedFull.L.slice(s, e),
        R: trimmedFull.R.slice(s, e),
        durationSec: (e - s) / SR,
      })
    )
  }
  return segments
}

function findCachedMusicTrack(scratchDir: string): StereoPcm | null {
  const candidates = [
    join(ROOT, 'tmp', 'video-services-build', 'brand', 'music.mp3'),
    join(ROOT, 'tmp', 'video-services-build', 'memoir', 'music.mp3'),
    join(ROOT, 'tmp', 'video-services-build', 'realestate', 'music.mp3'),
    join(ROOT, 'tmp', 'video-services-build', 'training', 'music.mp3'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      console.log(`  [music] Mixing gentle ducked score from ${p.replace(`${ROOT}/`, '')}`)
      return decodeToStereoPcm(p, scratchDir, 'music-bed')
    }
  }
  return null
}

function discoverLocaleInputs(
  voRoot: string,
  locale: FeaturePanLocaleId
): { mode: 'per-beat'; files: string[] } | { mode: 'combined'; file: string } | null {
  const subDir = join(voRoot, locale)
  if (existsSync(subDir)) {
    const entries = readdirSync(subDir)
      .filter((f) => AUDIO_EXTS.has(extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => join(subDir, f))
    if (entries.length === 8) {
      return { mode: 'per-beat', files: entries }
    }
    if (entries.length === 1) {
      return { mode: 'combined', file: entries[0]! }
    }
    if (entries.length > 0) {
      throw new Error(
        `Expected either 1 combined file or 8 per-beat files in ${subDir}, found ${entries.length}`
      )
    }
  }

  for (const ext of AUDIO_EXTS) {
    const candidate = join(voRoot, `${locale}${ext}`)
    if (existsSync(candidate)) {
      return { mode: 'combined', file: candidate }
    }
  }
  return null
}

function mixAndExportLocale(args: {
  locale: FeaturePanLocaleId
  beatPcms: StereoPcm[]
  beatIds: readonly PortalAnimaticBeatId[]
  musicBed: StereoPcm | null
  outDir: string
  scratchDir: string
}): CustomerPortalLocaleAudioTiming {
  const leadSamples = Math.round(LEAD_IN_SEC * SR)
  const gapSamples = Math.round(INTER_BEAT_GAP_SEC * SR)
  const tailSamples = Math.round(TAIL_PAD_SEC * SR)

  let totalSamples = leadSamples + tailSamples
  for (let i = 0; i < args.beatPcms.length; i++) {
    totalSamples += args.beatPcms[i]!.L.length
    if (i < args.beatPcms.length - 1) totalSamples += gapSamples
  }

  const mixL = new Float64Array(totalSamples)
  const mixR = new Float64Array(totalSamples)
  const speechActive = new Uint8Array(totalSamples)
  const windows: CustomerPortalBeatAudioWindow[] = []

  let cursor = leadSamples
  for (let i = 0; i < args.beatPcms.length; i++) {
    const seg = args.beatPcms[i]!
    const startSample = cursor
    for (let s = 0; s < seg.L.length; s++) {
      mixL[cursor + s] = seg.L[s]!
      mixR[cursor + s] = seg.R[s]!
      speechActive[cursor + s] = 1
    }
    cursor += seg.L.length
    const isLast = i === args.beatPcms.length - 1
    const windowEndSample = isLast ? totalSamples : cursor + gapSamples
    windows.push({
      id: args.beatIds[i]!,
      startSec: Number(((i === 0 ? 0 : startSample) / SR).toFixed(2)),
      endSec: Number((windowEndSample / SR).toFixed(2)),
    })
    if (!isLast) cursor += gapSamples
  }

  // Mix gentle ducked orchestral music bed (matching the Video Services pitch films)
  if (args.musicBed && args.musicBed.L.length > SR) {
    let mSum = 0
    const mLen = args.musicBed.L.length
    for (let i = 0; i < mLen; i++) {
      const m = 0.5 * (args.musicBed.L[i]! + args.musicBed.R[i]!)
      mSum += m * m
    }
    const mRms = Math.sqrt(mSum / mLen)
    const normScale = TARGET_MUSIC_BED_RMS / Math.max(0.005, mRms)

    let duckGain = MUSIC_GAIN_IDLE
    const attackAlpha = 1 - Math.exp(-1 / (0.12 * SR))
    const releaseAlpha = 1 - Math.exp(-1 / (0.45 * SR))
    const fadeOutSamples = Math.min(Math.round(1.4 * SR), Math.floor(totalSamples * 0.15))

    for (let i = 0; i < totalSamples; i++) {
      const target = speechActive[i] ? MUSIC_GAIN_DUCKED : MUSIC_GAIN_IDLE
      const alpha = target < duckGain ? attackAlpha : releaseAlpha
      duckGain += (target - duckGain) * alpha

      let endFade = 1.0
      if (i > totalSamples - fadeOutSamples) {
        endFade = (totalSamples - i) / fadeOutSamples
      }

      const mIdx = i % mLen
      const g = normScale * duckGain * endFade
      mixL[i] = Math.max(-0.98, Math.min(0.98, mixL[i]! + args.musicBed.L[mIdx]! * g))
      mixR[i] = Math.max(-0.98, Math.min(0.98, mixR[i]! + args.musicBed.R[mIdx]! * g))
    }
  }

  mkdirSync(args.outDir, { recursive: true })
  const tmpWav = join(args.scratchDir, `mixed-${args.locale}.wav`)
  const outMp3 = join(args.outDir, `customer-portal-${args.locale}.mp3`)
  writeStereoWav(tmpWav, mixL, mixR)
  runFfmpeg(
    [
      '-y',
      '-i',
      tmpWav,
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      '-ar',
      String(SR),
      outMp3,
    ],
    `encode-mp3:${args.locale}`
  )
  try {
    unlinkSync(tmpWav)
  } catch {
    /* ignore */
  }

  const totalDurationSec = Number((totalSamples / SR).toFixed(2))
  console.log(
    `  ✓ Wrote public/landing/video-services/portal-animatic/customer-portal-${args.locale}.mp3 (${totalDurationSec.toFixed(1)}s)`
  )

  return {
    audioSrc: `/landing/video-services/portal-animatic/customer-portal-${args.locale}.mp3`,
    totalDurationSec,
    beats: windows,
  }
}

function writeAudioManifestFile(
  manifest: Partial<Record<FeaturePanLocaleId, CustomerPortalLocaleAudioTiming>>
) {
  const manifestPath = join(
    ROOT,
    'src',
    'config',
    'landing',
    'customerPortalAudioManifest.ts'
  )
  const content = `import type {
  FeaturePanLocaleId,
  PortalAnimaticBeatId,
} from './customerPortalAnimaticCopy'

export interface CustomerPortalBeatAudioWindow {
  id: PortalAnimaticBeatId
  startSec: number
  endSec: number
}

export interface CustomerPortalLocaleAudioTiming {
  audioSrc: string
  totalDurationSec: number
  beats: readonly CustomerPortalBeatAudioWindow[]
}

/**
 * Auto-generated by \`npx tsx scripts/stitch-customer-portal-narration.ts\`.
 */
export const CUSTOMER_PORTAL_AUDIO_MANIFEST: Partial<
  Record<FeaturePanLocaleId, CustomerPortalLocaleAudioTiming>
> = ${JSON.stringify(manifest, null, 2)}
`
  writeFileSync(manifestPath, content, 'utf8')
  console.log(`✓ Updated src/config/landing/customerPortalAudioManifest.ts`)
}

async function main() {
  const voRoot = join(ROOT, 'tmp', 'customer-portal-vo')
  const scratchDir = join(voRoot, '.scratch')
  const outDir = join(ROOT, 'public', 'landing', 'video-services', 'portal-animatic')
  mkdirSync(voRoot, { recursive: true })

  const localeFlagIdx = process.argv.indexOf('--locale')
  const requestedLocales =
    localeFlagIdx >= 0 && process.argv[localeFlagIdx + 1]
      ? (process.argv[localeFlagIdx + 1]!
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean) as FeaturePanLocaleId[])
      : [...ALL_LOCALES]

  // Preserve existing manifest entries for locales not re-stitched in this run
  const existingManifestMod = await import('../src/config/landing/customerPortalAudioManifest')
  const nextManifest: Partial<Record<FeaturePanLocaleId, CustomerPortalLocaleAudioTiming>> = {
    ...(existingManifestMod.CUSTOMER_PORTAL_AUDIO_MANIFEST || {}),
  }

  let musicBed: StereoPcm | null | undefined
  let stitchedCount = 0

  for (const locale of requestedLocales) {
    const discovered = discoverLocaleInputs(voRoot, locale)
    if (!discovered) continue

    if (musicBed === undefined) {
      musicBed = findCachedMusicTrack(scratchDir)
    }

    const copy = CUSTOMER_PORTAL_ANIMATIC_COPY[locale]
    const beatIds = copy.beats.map((b) => b.id)
    const narrationTexts = copy.beats.map((b) => b.narration)

    console.log(`\n=== Stitching [${locale}] (${discovered.mode}) ===`)
    let beatPcms: StereoPcm[]
    if (discovered.mode === 'per-beat') {
      beatPcms = discovered.files.map((f, idx) =>
        trimAndNormalizeSpeech(decodeToStereoPcm(f, scratchDir, `${locale}-b${idx + 1}`))
      )
    } else {
      const rawFull = decodeToStereoPcm(discovered.file, scratchDir, `${locale}-combined`)
      beatPcms = splitCombinedNarrationIntoBeats(rawFull, narrationTexts)
    }

    beatPcms.forEach((seg, idx) => {
      console.log(`  Beat ${String(idx + 1).padStart(2, '0')} (${beatIds[idx]}): ${seg.durationSec.toFixed(2)}s`)
    })

    nextManifest[locale] = mixAndExportLocale({
      locale,
      beatPcms,
      beatIds,
      musicBed: musicBed ?? null,
      outDir,
      scratchDir,
    })
    stitchedCount++
  }

  if (stitchedCount === 0) {
    console.log(
      `No audio files found yet in tmp/customer-portal-vo/.\n` +
        `Drop either:\n` +
        `  • 1 file per language: tmp/customer-portal-vo/en.wav (or .mp3/.m4a)\n` +
        `  • OR 8 beat files:     tmp/customer-portal-vo/en/01.wav ... 08.wav\n` +
        `Then re-run: npx tsx scripts/stitch-customer-portal-narration.ts`
    )
    return
  }

  writeAudioManifestFile(nextManifest)
}

main().catch((err) => {
  console.error('[stitch-customer-portal-narration] Error:', err)
  process.exit(1)
})
