#!/usr/bin/env npx tsx
/**
 * Stage 2 (100% Local / Sandbox-Safe):
 * Stitches all 7 localized Video Business Promo Demonstration films (`en`, `es`,
 * `pt`, `hi`, `zh`, `ar`, `th`) for a vertical (`memoir`, `realestate`, `training`, `brand`)
 * from cached clips + score + Studio Narrator VO tracks in `tmp/video-services-build/<vertical>/`.
 *
 * Key Audio-Visual Guarantees:
 * 1. Speech-band VAD on every localized lip-sync clip (e.g. Block 01 & Block 09)
 *    detects the exact end of character on-camera dialogue (`speechEndSec`), gates out
 *    post-dialogue clip noise, and starts Narrator VO at `Math.max(speechEndSec + 0.55, 3.60)`
 *    so Narration NEVER overlaps Character Dialogue in any language.
 * 2. Gentle onset/tail trimming on Narrator VO (`120ms` pre-pad, `160ms` post-pad, `1.0x` natural
 *    pacing — zero `atempo` rush and zero clipped leading syllables).
 * 3. Frame-exact (`24 fps`) smooth slow-motion extension (~80% speed) whenever
 *    dialogue + VO (or VO alone) exceeds a block's raw clip length (~10.0s), replacing
 *    static freeze frames while keeping on-camera lip-sync portions strictly at 1.0x speed.
 * 4. Gentle orchestral underscore (`~14%` during transitions, ducked smoothly `-17 dB` below
 *    speech during both character dialogue and narrator VO) so music never drowns out speech.
 * 5. Preserves pre-encoded clip watermarks (`watermarkAlreadyInClips: true`) and optionally
 *    encodes web-ready `.webm` + `.mp4` + `.webp` poster via `scripts/encode-video-services-webm.mjs`.
 *
 * Usage:
 *   npx tsx scripts/build-video-service-promos.ts --vertical memoir
 *   npx tsx scripts/build-video-service-promos.ts --vertical memoir --inspect-only
 *   npx tsx scripts/build-video-service-promos.ts --vertical memoir --locale pt --encode-web
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
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

const ALL_LOCALES: readonly FeaturePanLocaleId[] = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

const SR = 48000
const FPS = 24

// Audio balance constants (tuned so speech is crystal-clear and music never drowns dialogue)
const TARGET_VO_RMS = 0.188
const TARGET_DIALOGUE_RMS = 0.185
const TARGET_MUSIC_BED_RMS = 0.130
const MUSIC_GAIN_IDLE = 0.30 // Gentle nostalgic underscore during silent visual transitions
const MUSIC_GAIN_DUCKED = 0.12 // ~20.5 dB below speech during Studio Narrator VO
const MUSIC_GAIN_CLIP_LIVE = 0.05 // Deeply ducked while on-camera lip-sync clip audio is live

interface StereoPcm {
  L: Float64Array
  R: Float64Array
  durationSec: number
}

interface DialogueDetectionResult {
  speechStartSec: number
  speechEndSec: number
  peakRms: number
  noiseFloorRms: number
  sparkline: string
}

interface BlockTimingPlan {
  blockNumber: number
  isDialogueBlock: boolean
  clipPath: string
  rawClipDurSec: number
  dialogueStartSec: number
  dialogueEndSec: number
  voPath: string
  voDurSec: number
  voStartSec: number
  voEndSec: number
  targetFrames: number
  exactBlockDurSec: number
  freezeHoldSec: number
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const localeArg = get('--locale')
  const requestedLocales = localeArg
    ? (localeArg.split(',').map((s) => s.trim()).filter(Boolean) as FeaturePanLocaleId[])
    : [...ALL_LOCALES]
  return {
    vertical: (get('--vertical') || 'memoir') as VideoServiceVerticalId,
    locales: requestedLocales,
    inspectOnly: argv.includes('--inspect-only'),
    encodeWeb: argv.includes('--encode-web'),
    forceSegments: argv.includes('--force-segments'),
  }
}

function runFfmpeg(args: string[], label: string) {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (res.status !== 0) {
    throw new Error(`FFmpeg failed (${label}):\n${(res.stderr || '').slice(-1800)}`)
  }
  return res
}

function probeMedia(filePath: string): { durationSec: number; width: number; height: number; hasAudio: boolean } {
  const res = spawnSync(FFMPEG, ['-hide_banner', '-i', filePath], { encoding: 'utf8' })
  const info = `${res.stderr || ''}\n${res.stdout || ''}`
  const durMatch = info.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  const durationSec = durMatch
    ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
    : 0
  const dimMatch = info.match(/Stream #\d+:\d+.*Video:.*?\s(\d{2,5})x(\d{2,5})(?:\s|,|\[)/)
  const width = dimMatch ? Number(dimMatch[1]) : 1280
  const height = dimMatch ? Number(dimMatch[2]) : 720
  const hasAudio = /Stream #\d+:\d+.*Audio:/i.test(info)
  return { durationSec, width, height, hasAudio }
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

function decodeStereoWav(wavPath: string): StereoPcm {
  const buf = readFileSync(wavPath)
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

function decodeMonoWav(wavPath: string): Float64Array {
  const buf = readFileSync(wavPath)
  const { offset, byteLength } = findWavDataChunk(buf)
  const samples = Math.floor(byteLength / 2)
  const M = new Float64Array(samples)
  for (let i = 0; i < samples; i++) {
    M[i] = buf.readInt16LE(offset + i * 2) / 32768
  }
  return M
}

function writeStereoWav(wavPath: string, L: Float64Array, R: Float64Array) {
  const samples = Math.min(L.length, R.length)
  const dataBytes = samples * 4
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 4, 'ascii')
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8, 4, 'ascii')
  header.write('fmt ', 12, 4, 'ascii')
  header.writeUInt32LE(16, 16) // PCM fmt chunk size
  header.writeUInt16LE(1, 20) // PCM = 1
  header.writeUInt16LE(2, 22) // 2 channels
  header.writeUInt32LE(SR, 24)
  header.writeUInt32LE(SR * 4, 28) // byte rate
  header.writeUInt16LE(4, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
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

/**
 * Gentle onset/offset trim for TTS voiceover cues:
 * - Low threshold (`0.0011`) preserves soft leading vowels/fricatives ("através", "cerimonialistas", "SceneFlow").
 * - Generous `120ms` pre-pad and `160ms` post-pad prevent any syllable clipping.
 */
function trimVoGentle(pcm: StereoPcm): StereoPcm {
  const n = pcm.L.length
  const win = Math.floor(SR * 0.01) // 10ms window
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

  const prePad = Math.floor(SR * 0.12) // 120ms pre-pad
  const postPad = Math.floor(SR * 0.16) // 160ms post-pad
  const start = Math.max(0, firstActive - prePad)
  const end = Math.min(n, lastActive + postPad)

  const L = pcm.L.slice(start, end)
  const R = pcm.R.slice(start, end)

  // Tiny 10ms cosine anti-click ramp on the outer silence padding
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

function normalizeActiveRms(
  L: Float64Array,
  R: Float64Array,
  targetRms: number,
  options: { startSample?: number; endSample?: number; maxGain?: number; minGain?: number; gateThreshold?: number } = {}
): number {
  const s0 = Math.max(0, options.startSample ?? 0)
  const s1 = Math.min(L.length, options.endSample ?? L.length)
  const gate = options.gateThreshold ?? 0.007
  let sumSq = 0
  let count = 0
  let peak = 0.001

  for (let i = s0; i < s1; i++) {
    const m = 0.5 * (L[i]! + R[i]!)
    const absM = Math.max(Math.abs(L[i]!), Math.abs(R[i]!))
    if (absM > peak) peak = absM
    if (Math.abs(m) >= gate) {
      sumSq += m * m
      count++
    }
  }

  if (count < SR * 0.05) return 1.0
  const rms = Math.sqrt(sumSq / count)
  const minG = options.minGain ?? 0.55
  const maxG = options.maxGain ?? 3.0
  let gain = Math.min(maxG, Math.max(minG, targetRms / Math.max(0.008, rms)))
  // Prevent hard clipping on sharp plosives
  if (peak * gain > 0.94) {
    gain = 0.94 / peak
  }

  for (let i = 0; i < L.length; i++) {
    L[i]! *= gain
    R[i]! *= gain
  }
  return gain
}

/**
 * Dual-band Speech + Articulation Voice Activity Detector for Google Omni 1.2 Flash lip-sync blocks.
 * Combines `300–3400 Hz` speech formants (`mid`) with `2200–6500 Hz` consonant/sibilance articulation (`hi`)
 * so trailing solo piano/string chords generated by Omni never masquerade as speech, while preserving
 * soft trailing syllables and gentle vocal chuckles.
 */
function detectClipDialogueBounds(clipPath: string, workDir: string, tag: string): DialogueDetectionResult {
  const meta = probeMedia(clipPath)
  if (!meta.hasAudio) {
    return {
      speechStartSec: 0.6,
      speechEndSec: 3.4,
      peakRms: 0,
      noiseFloorRms: 0,
      sparkline: '(no audio stream)',
    }
  }

  const midWav = join(workDir, `vad-mid-${tag}.wav`)
  const hiWav = join(workDir, `vad-hi-${tag}.wav`)
  if (!existsSync(midWav)) {
    runFfmpeg(
      [
        '-y',
        '-i',
        clipPath,
        '-vn',
        '-af',
        'highpass=f=300,lowpass=f=3400',
        '-ac',
        '1',
        '-ar',
        String(SR),
        '-c:a',
        'pcm_s16le',
        midWav,
      ],
      `vad-mid ${tag}`
    )
  }
  if (!existsSync(hiWav)) {
    runFfmpeg(
      [
        '-y',
        '-i',
        clipPath,
        '-vn',
        '-af',
        'highpass=f=2200,lowpass=f=6500',
        '-ac',
        '1',
        '-ar',
        String(SR),
        '-c:a',
        'pcm_s16le',
        hiWav,
      ],
      `vad-hi ${tag}`
    )
  }

  const midMono = decodeMonoWav(midWav)
  const hiMono = decodeMonoWav(hiWav)
  const frameSec = 0.1 // 100ms frames
  const frameSamples = Math.floor(SR * frameSec)
  const numFrames = Math.floor(Math.min(midMono.length, hiMono.length) / frameSamples)
  const midArr = new Float64Array(numFrames)
  const hiArr = new Float64Array(numFrames)

  for (let f = 0; f < numFrames; f++) {
    let sumMid = 0
    let sumHi = 0
    const base = f * frameSamples
    for (let i = 0; i < frameSamples; i++) {
      const vm = midMono[base + i]!
      const vh = hiMono[base + i]!
      sumMid += vm * vm
      sumHi += vh * vh
    }
    midArr[f] = Math.sqrt(sumMid / frameSamples)
    hiArr[f] = Math.sqrt(sumHi / frameSamples)
  }

  // Suppress initial 200ms IIR high-pass startup transient so it cannot skew peak thresholds
  if (numFrames > 2) {
    midArr[0] = midArr[2]!
    midArr[1] = midArr[2]!
    hiArr[0] = hiArr[2]!
    hiArr[1] = hiArr[2]!
  }

  const sortedMid = Array.from(midArr).sort((a, b) => a - b)
  const noiseFloorRms = sortedMid[Math.floor(sortedMid.length * 0.2)] ?? 0.001
  const peakRms = Math.max(...Array.from(midArr), 0.001)
  const peakHi = Math.max(...Array.from(hiArr), 0.0005)

  // 0.5s sparkline of articulated speech score (`sqrt(normMid * normHi)`) for visual QA
  const bucketFrames = Math.round(0.5 / frameSec)
  const bars = ' ▂▃▄▅▆▇█'
  let spark = ''
  for (let b = 0; b * bucketFrames < numFrames; b++) {
    let bMax = 0
    for (let f = b * bucketFrames; f < Math.min(numFrames, (b + 1) * bucketFrames); f++) {
      const score = Math.sqrt((midArr[f]! / peakRms) * (hiArr[f]! / peakHi))
      if (score > bMax) bMax = score
    }
    spark += bars[Math.min(bars.length - 1, Math.round(Math.min(1, bMax) * (bars.length - 1)))]
  }

  // Group articulated 200ms frames into speech islands (bridging intra-sentence pauses <= 1.0s),
  // discarding isolated short foley transients (< 0.6s, e.g. a champagne glass clink 2s after speech).
  interface ArticulatedIsland {
    startF: number
    endF: number
    energy: number
  }
  const islands: ArticulatedIsland[] = []
  const maxBridgeFrames = 10 // 1.0s bridge across natural comma/breath pauses
  for (let f = 2; f < numFrames; f++) {
    const hiAvg = (hiArr[f]! + hiArr[f - 1]!) * 0.5
    const midAvg = (midArr[f]! + midArr[f - 1]!) * 0.5
    if (hiAvg >= peakHi * 0.13 && midAvg >= peakRms * 0.10) {
      const s = f - 1
      const prev = islands[islands.length - 1]
      const frameScore = midAvg * hiAvg
      if (prev && s - prev.endF <= maxBridgeFrames) {
        prev.endF = f
        prev.energy += frameScore
      } else {
        islands.push({ startF: s, endF: f, energy: frameScore })
      }
    }
  }

  const maxIslEnergy = islands.reduce((m, x) => Math.max(m, x.energy), 0)
  const speechIslands = islands.filter((isl) => {
    const durFrames = isl.endF - isl.startF + 1
    // Keep the main speech island + any substantial multi-syllable phrase (>= 0.6s and >= 20% of main island energy)
    if (isl.energy >= maxIslEnergy * 0.85) return true
    return durFrames >= 6 && isl.energy >= maxIslEnergy * 0.20
  })

  if (speechIslands.length === 0) {
    return {
      speechStartSec: 0.6,
      speechEndSec: 3.4,
      peakRms,
      noiseFloorRms,
      sparkline: spark,
    }
  }

  const firstArticulated = speechIslands[0]!.startF
  const lastArticulated = speechIslands[speechIslands.length - 1]!.endF

  // Allow up to +0.8s post-speech extension ONLY if a fresh vocal/chuckle onset occurs (rising mid burst + hi presence),
  // avoiding monotonically decaying background piano chords or late glass clinks.
  let lastVocal = lastArticulated
  for (let f = lastArticulated + 1; f <= Math.min(numFrames - 1, lastArticulated + 8); f++) {
    const prevMid = midArr[Math.max(0, f - 2)]!
    if (midArr[f]! >= peakRms * 0.18 && midArr[f]! > prevMid * 1.35 && hiArr[f]! >= peakHi * 0.07) {
      lastVocal = f
    }
  }

  const speechStartSec = Math.max(0, firstArticulated * frameSec - 0.14)
  const speechEndSec = Math.min(meta.durationSec, (lastVocal + 1) * frameSec + 0.22)

  return {
    speechStartSec,
    speechEndSec,
    peakRms,
    noiseFloorRms,
    sparkline: spark,
  }
}

/**
 * Build a continuous stereo music bed of `totalSamples` length, crossfade-looping
 * cleanly if the source score is shorter than the freeze-extended timeline.
 */
function buildMusicBed(musicPcm: StereoPcm, totalSamples: number): StereoPcm {
  const srcLen = musicPcm.L.length
  const outL = new Float64Array(totalSamples)
  const outR = new Float64Array(totalSamples)

  if (srcLen >= totalSamples) {
    outL.set(musicPcm.L.subarray(0, totalSamples))
    outR.set(musicPcm.R.subarray(0, totalSamples))
  } else {
    // Copy initial run, leaving 4s before music end so we don't loop a silent tail decay
    const trimTail = Math.min(Math.floor(SR * 4.0), Math.floor(srcLen * 0.15))
    const usableEnd = Math.max(Math.floor(SR * 15), srcLen - trimTail)
    const loopStart = Math.min(Math.floor(SR * 8.0), Math.floor(usableEnd * 0.2))
    const xfade = Math.min(Math.floor(SR * 3.5), Math.floor((usableEnd - loopStart) * 0.25))

    let writePos = Math.min(totalSamples, usableEnd)
    outL.set(musicPcm.L.subarray(0, writePos))
    outR.set(musicPcm.R.subarray(0, writePos))

    while (writePos < totalSamples) {
      const overlapStart = Math.max(0, writePos - xfade)
      const segLen = usableEnd - loopStart
      for (let i = 0; i < segLen && overlapStart + i < totalSamples; i++) {
        const dstIdx = overlapStart + i
        const srcIdx = loopStart + i
        if (i < xfade && dstIdx < writePos) {
          const t = i / xfade
          const fadeOut = Math.cos(t * Math.PI * 0.5)
          const fadeIn = Math.sin(t * Math.PI * 0.5)
          outL[dstIdx] = outL[dstIdx]! * fadeOut + musicPcm.L[srcIdx]! * fadeIn
          outR[dstIdx] = outR[dstIdx]! * fadeOut + musicPcm.R[srcIdx]! * fadeIn
        } else {
          outL[dstIdx] = musicPcm.L[srcIdx]!
          outR[dstIdx] = musicPcm.R[srcIdx]!
        }
      }
      writePos = overlapStart + segLen
    }
  }

  normalizeActiveRms(outL, outR, TARGET_MUSIC_BED_RMS, { maxGain: 2.2, minGain: 0.3 })

  // Smooth 0.6s fade-in at t=0 and 2.6s resolving fade-out at end of film
  const fadeIn = Math.min(Math.floor(SR * 0.6), totalSamples)
  for (let i = 0; i < fadeIn; i++) {
    const g = 0.5 * (1 - Math.cos((Math.PI * i) / fadeIn))
    outL[i]! *= g
    outR[i]! *= g
  }
  const fadeOut = Math.min(Math.floor(SR * 2.6), totalSamples)
  for (let i = 0; i < fadeOut; i++) {
    const g = 0.5 * (1 - Math.cos((Math.PI * i) / fadeOut))
    const rev = totalSamples - 1 - i
    outL[rev]! *= g
    outR[rev]! *= g
  }

  return { L: outL, R: outR, durationSec: totalSamples / SR }
}

function applyMusicSpeechDucking(
  music: StereoPcm,
  speechWindows: Array<{ startSec: number; endSec: number; targetGain?: number }>
) {
  const n = music.L.length
  const env = new Float32Array(n)
  env.fill(MUSIC_GAIN_IDLE)

  const preDuckSec = 0.28
  const postHoldSec = 0.22
  const attackSamples = Math.floor(SR * 0.32)
  const releaseSamples = Math.floor(SR * 0.58)

  for (const win of speechWindows) {
    const targetG = win.targetGain ?? MUSIC_GAIN_DUCKED
    const s0 = Math.max(0, Math.floor((win.startSec - preDuckSec) * SR))
    const s1 = Math.min(n, Math.ceil((win.endSec + postHoldSec) * SR))

    for (let i = s0; i < s1; i++) {
      env[i] = Math.min(env[i]!, targetG)
    }

    // Smooth cosine ramp down before s0
    const rampStart = Math.max(0, s0 - attackSamples)
    const rampDownLen = s0 - rampStart
    for (let i = 0; i < rampDownLen; i++) {
      const t = i / rampDownLen
      const g = MUSIC_GAIN_IDLE + (targetG - MUSIC_GAIN_IDLE) * (0.5 * (1 - Math.cos(Math.PI * t)))
      env[rampStart + i] = Math.min(env[rampStart + i]!, g)
    }

    // Smooth cosine ramp up after s1
    const rampEnd = Math.min(n, s1 + releaseSamples)
    const rampUpLen = rampEnd - s1
    for (let i = 0; i < rampUpLen; i++) {
      const t = i / rampUpLen
      const g = targetG + (MUSIC_GAIN_IDLE - targetG) * (0.5 * (1 - Math.cos(Math.PI * t)))
      env[s1 + i] = Math.min(env[s1 + i]!, g)
    }
  }

  for (let i = 0; i < n; i++) {
    music.L[i]! *= env[i]!
    music.R[i]! *= env[i]!
  }
}

function encodeNormalizedVideoSegment(args: {
  clipPath: string
  targetFrames: number
  rawClipDurSec: number
  isDialogueBlock: boolean
  dialogueEndSec: number
  width: number
  height: number
  outSegPath: string
  force?: boolean
}) {
  if (!args.force && existsSync(args.outSegPath) && statSync(args.outSegPath).size > 20_000) {
    return
  }
  mkdirSync(dirname(args.outSegPath), { recursive: true })

  const targetSec = args.targetFrames / FPS
  const needsStretch = targetSec > args.rawClipDurSec + 0.04
  const scalePad = `scale=${args.width}:${args.height}:force_original_aspect_ratio=decrease,pad=${args.width}:${args.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`

  const tmpSegPath = `${args.outSegPath}.${process.pid}.tmp.mp4`
  const ffmpegArgs: string[] = ['-y', '-i', args.clipPath, '-an']

  if (needsStretch && args.isDialogueBlock && args.dialogueEndSec > 0.5) {
    // Keep on-camera in-scene sync audio strictly at 1.0x speed, then slow ONLY the narrated VO tail to 80% speed
    const splitSec = Math.min(
      Math.max(1.5, args.dialogueEndSec + 0.3),
      Math.max(1.5, args.rawClipDurSec - 0.6)
    )
    const tailRawSec = Math.max(0.5, args.rawClipDurSec - splitSec)
    const tailNeededSec = Math.max(0.5, targetSec - splitSec)
    const splitFmt = splitSec.toFixed(3)

    // At 80% speed (1.25x duration), check if one forward slow-mo pass covers the VO tail
    const singlePassAt80 = tailRawSec * 1.25
    if (singlePassAt80 >= tailNeededSec + 0.08) {
      const fc = [
        `[0:v]split=2[v1][v2]`,
        `[v1]trim=start=0:end=${splitFmt},setpts=PTS-STARTPTS,fps=${FPS}[p1]`,
        `[v2]trim=start=${splitFmt},setpts=(PTS-STARTPTS)*1.25,fps=${FPS}[p2]`,
        `[p1][p2]concat=n=2:v=1:a=0,fps=${FPS},${scalePad},tpad=stop_mode=clone:stop_duration=0.25[vout]`,
      ].join(';')
      ffmpegArgs.push('-filter_complex', fc, '-map', '[vout]')
    } else {
      // Verbose localized VO tail exceeds 1.25x of post-dialogue footage:
      // Keep 1.0x lip-sync strictly untouched, then play post-dialogue tail at lush 80% speed
      // with seamless forward/reverse ping-pong cycles (0-pixel jump, constant 80% speed, zero freeze frame!)
      const cycleDurSec = Math.max(0.5, 2 * singlePassAt80)
      const extraCycles = Math.max(1, Math.ceil((tailNeededSec + 1.0) / cycleDurSec))
      const cycleMaxFrames = Math.ceil((cycleDurSec + 1.5) * FPS)
      const fc = [
        `[0:v]split=2[v1][v2]`,
        `[v1]trim=start=0:end=${splitFmt},setpts=PTS-STARTPTS,fps=${FPS}[p1]`,
        `[v2]trim=start=${splitFmt},setpts=(PTS-STARTPTS)*1.25,fps=${FPS},split=2[tf][tr]`,
        `[tr]reverse,setpts=PTS-STARTPTS[tr2]`,
        `[tf][tr2]concat=n=2:v=1:a=0[cycle]`,
        `[cycle]loop=loop=${extraCycles}:size=${cycleMaxFrames}:start=0,setpts=N/(${FPS}*TB)[ptail]`,
        `[p1][ptail]concat=n=2:v=1:a=0,fps=${FPS},${scalePad},tpad=stop_mode=clone:stop_duration=0.25[vout]`,
      ].join(';')
      ffmpegArgs.push('-filter_complex', fc, '-map', '[vout]')
    }
  } else if (needsStretch) {
    // Non-dialogue VO-only block: smooth 80% slow-motion (1.25x duration = 12.54s from 10.03s clip) — zero freeze frame
    const singlePassAt80 = args.rawClipDurSec * 1.25
    if (singlePassAt80 >= targetSec + 0.08) {
      const vf = [
        `setpts=(PTS-STARTPTS)*1.25`,
        `fps=${FPS}`,
        scalePad,
        'tpad=stop_mode=clone:stop_duration=0.25',
      ].join(',')
      ffmpegArgs.push('-vf', vf)
    } else {
      // Verbose localized VO-only block (>12.5s): constant 80% slow-mo forward + seamless reverse ping-pong (zero freeze!)
      const cycleDurSec = Math.max(1.0, 2 * singlePassAt80)
      const extraCycles = Math.max(1, Math.ceil((targetSec + 1.0) / cycleDurSec))
      const cycleMaxFrames = Math.ceil((cycleDurSec + 1.5) * FPS)
      const fc = [
        `[0:v]setpts=(PTS-STARTPTS)*1.25,fps=${FPS},split=2[tf][tr]`,
        `[tr]reverse,setpts=PTS-STARTPTS[tr2]`,
        `[tf][tr2]concat=n=2:v=1:a=0[cycle]`,
        `[cycle]loop=loop=${extraCycles}:size=${cycleMaxFrames}:start=0,setpts=N/(${FPS}*TB),${scalePad},tpad=stop_mode=clone:stop_duration=0.25[vout]`,
      ].join(';')
      ffmpegArgs.push('-filter_complex', fc, '-map', '[vout]')
    }
  } else {
    const vf = [
      `fps=${FPS}`,
      scalePad,
      'tpad=stop_mode=clone:stop_duration=0.35',
    ].join(',')
    ffmpegArgs.push('-vf', vf)
  }

  ffmpegArgs.push(
    '-frames:v',
    String(args.targetFrames),
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-video_track_timescale',
    '24000',
    tmpSegPath
  )

  runFfmpeg(ffmpegArgs, `seg ${args.outSegPath.split('/').pop()}`)
  if (existsSync(args.outSegPath) && !args.force) {
    try {
      unlinkSync(tmpSegPath)
    } catch {
      /* ignore */
    }
    return
  }
  renameSync(tmpSegPath, args.outSegPath)
}

async function main() {
  const { vertical, locales, inspectOnly, encodeWeb, forceSegments } = parseArgs(process.argv.slice(2))
  const manifestPath = resolve(ROOT, 'scripts', 'video-service-sources', `${vertical}.json`)
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`)
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as VerticalSourceManifest
  const script = VIDEO_SERVICE_PROMO_SCRIPTS[vertical]

  const buildRoot = join(ROOT, 'tmp', 'video-services-build', vertical)
  const clipsDir = join(buildRoot, 'clips')
  const voDir = join(buildRoot, 'vo')
  const workDir = join(buildRoot, 'work')
  const segCacheDir = join(workDir, 'seg-cache')
  const sourceOutDir = join(ROOT, 'tmp', 'video-services-source')
  mkdirSync(workDir, { recursive: true })
  mkdirSync(segCacheDir, { recursive: true })
  mkdirSync(sourceOutDir, { recursive: true })

  // Determine canonical target resolution from the first shared clip
  const firstSharedBlock = Object.keys(manifest.sharedBlocks)[0]!
  const sampleClipPath = join(clipsDir, `block-${String(Number(firstSharedBlock)).padStart(2, '0')}.mp4`)
  if (!existsSync(sampleClipPath)) {
    throw new Error(`Missing downloaded clips in ${clipsDir}. Run fetch-video-service-assets.ts first.`)
  }
  const sampleProbe = probeMedia(sampleClipPath)
  const targetWidth = Math.min(1920, Math.ceil(sampleProbe.width / 2) * 2)
  const targetHeight = Math.min(1080, Math.ceil(sampleProbe.height / 2) * 2)
  console.log(`\nTarget canvas for [${vertical}]: ${targetWidth}x${targetHeight} @ ${FPS} fps`)

  // Decode music MP3 once
  const musicMp3Path = join(buildRoot, 'music.mp3')
  const musicWavPath = join(workDir, 'music-raw.wav')
  if (!existsSync(musicWavPath)) {
    runFfmpeg(
      ['-y', '-i', musicMp3Path, '-ac', '2', '-ar', String(SR), '-c:a', 'pcm_s16le', musicWavPath],
      'decode music.mp3'
    )
  }
  const musicRawPcm = decodeStereoWav(musicWavPath)
  console.log(`Music score duration: ${musicRawPcm.durationSec.toFixed(2)}s`)

  // Step 1: Detect & print dialogue bounds across all localized lip-sync clips
  console.log(`\n=== Speech-Band Dialogue Boundary Analysis (Zero-Overlap Guard) ===`)
  const dialogueBoundsCache = new Map<string, DialogueDetectionResult>()
  for (const blockStr of Object.keys(manifest.localizedBlocks).sort((a, b) => Number(a) - Number(b))) {
    const pad = String(Number(blockStr)).padStart(2, '0')
    for (const loc of locales) {
      const clipPath = join(clipsDir, `block-${pad}-${loc}.mp4`)
      const key = `${pad}-${loc}`
      const det = detectClipDialogueBounds(clipPath, workDir, key)
      dialogueBoundsCache.set(key, det)
      console.log(
        `  Block ${pad} [${loc}]: dialogue ${det.speechStartSec.toFixed(2)}s -> ${det.speechEndSec.toFixed(2)}s | VO starts >= ${Math.max(det.speechEndSec + 0.55, 3.6).toFixed(2)}s | [${det.sparkline}]`
      )
    }
  }

  if (inspectOnly) {
    console.log('\n(--inspect-only complete)')
    return
  }

  // Step 2: Build each locale's frame-accurate timeline, mix audio, and stitch MP4
  for (const loc of locales) {
    console.log(`\n================ Building [${vertical}-${loc}] ================`)
    const plans: BlockTimingPlan[] = []
    const trimmedVos = new Map<number, StereoPcm>()

    for (const block of script.blocks) {
      const bNum = block.blockNumber
      const pad = String(bNum).padStart(2, '0')
      const isDialogueBlock = Boolean(manifest.localizedBlocks[String(bNum)])
      const clipPath = isDialogueBlock
        ? join(clipsDir, `block-${pad}-${loc}.mp4`)
        : join(clipsDir, `block-${pad}.mp4`)

      const clipMeta = probeMedia(clipPath)
      const voMp3 = join(voDir, loc, `block-${pad}.mp3`)
      const voRawWav = join(workDir, `vo-${loc}-${pad}.wav`)
      if (!existsSync(voRawWav)) {
        runFfmpeg(
          ['-y', '-i', voMp3, '-ac', '2', '-ar', String(SR), '-c:a', 'pcm_s16le', voRawWav],
          `decode vo ${loc} block-${pad}`
        )
      }
      const voTrimmed = trimVoGentle(decodeStereoWav(voRawWav))
      normalizeActiveRms(voTrimmed.L, voTrimmed.R, TARGET_VO_RMS)
      trimmedVos.set(bNum, voTrimmed)

      const isFinalBlock = bNum === script.blocks[script.blocks.length - 1]?.blockNumber
      const postBreathSec = isFinalBlock ? 1.15 : 0.45

      let dialogueStartSec = 0
      let dialogueEndSec = 0
      let voStartSec = 0.45

      if (isDialogueBlock) {
        const det = dialogueBoundsCache.get(`${pad}-${loc}`)!
        dialogueStartSec = det.speechStartSec
        dialogueEndSec = det.speechEndSec
        // Strictly wait 0.55s after character's final syllable so narration NEVER overlaps dialogue
        voStartSec = Math.max(dialogueEndSec + 0.55, 3.60)
      }

      const voEndSec = voStartSec + voTrimmed.durationSec
      const minNeededSec = Math.max(clipMeta.durationSec, voEndSec + postBreathSec)
      const targetFrames = Math.max(1, Math.ceil(minNeededSec * FPS))
      const exactBlockDurSec = targetFrames / FPS
      const freezeHoldSec = Math.max(0, exactBlockDurSec - clipMeta.durationSec)

      plans.push({
        blockNumber: bNum,
        isDialogueBlock,
        clipPath,
        rawClipDurSec: clipMeta.durationSec,
        dialogueStartSec,
        dialogueEndSec,
        voPath: voMp3,
        voDurSec: voTrimmed.durationSec,
        voStartSec,
        voEndSec,
        targetFrames,
        exactBlockDurSec,
        freezeHoldSec,
      })

      console.log(
        `  Block ${pad}${isDialogueBlock ? ' [LipSync+VO]' : ' [VO-Only]   '}: raw=${clipMeta.durationSec.toFixed(2)}s` +
          (isDialogueBlock ? ` | dlg=${dialogueStartSec.toFixed(2)}..${dialogueEndSec.toFixed(2)}s` : '') +
          ` | vo=${voStartSec.toFixed(2)}..${voEndSec.toFixed(2)}s (${voTrimmed.durationSec.toFixed(2)}s)` +
          ` -> block=${exactBlockDurSec.toFixed(2)}s` +
          (freezeHoldSec > 0.04 ? ` (80% slow-mo stretch +${freezeHoldSec.toFixed(2)}s)` : '')
      )
    }

    const totalFrames = plans.reduce((acc, p) => acc + p.targetFrames, 0)
    const totalDurSec = totalFrames / FPS
    const totalSamples = Math.round(totalDurSec * SR)
    console.log(`  Total [${vertical}-${loc}] runtime: ${totalDurSec.toFixed(2)}s (${totalFrames} frames)`)

    // Step 2A: Encode / reuse frame-exact normalized 80%-speed slow-mo video segments
    const segPaths: string[] = []
    for (const plan of plans) {
      const pad = String(plan.blockNumber).padStart(2, '0')
      const needsMultiPassV3 =
        (plan.isDialogueBlock && plan.exactBlockDurSec > plan.rawClipDurSec + 0.04) ||
        plan.exactBlockDurSec > plan.rawClipDurSec * 1.25 - 0.08
      const segVer = needsMultiPassV3 ? 'slow80v3' : 'slow80v2'
      const segKey = plan.isDialogueBlock
        ? `block-${pad}-${loc}-${plan.targetFrames}f-${segVer}.mp4`
        : `block-${pad}-shared-${plan.targetFrames}f-${segVer}.mp4`
      const outSegPath = join(segCacheDir, segKey)
      encodeNormalizedVideoSegment({
        clipPath: plan.clipPath,
        targetFrames: plan.targetFrames,
        rawClipDurSec: plan.rawClipDurSec,
        isDialogueBlock: plan.isDialogueBlock,
        dialogueEndSec: plan.dialogueEndSec,
        width: targetWidth,
        height: targetHeight,
        outSegPath,
        force: forceSegments,
      })
      segPaths.push(outSegPath)
    }

    // Step 2B: Assemble master stereo audio track (Ducked Score + Gated Character Dialogue + Studio VO)
    const speechWindows: Array<{ startSec: number; endSec: number; targetGain?: number }> = []
    const voiceTrackL = new Float64Array(totalSamples)
    const voiceTrackR = new Float64Array(totalSamples)

    let blockOffsetSec = 0
    for (const plan of plans) {
      const pad = String(plan.blockNumber).padStart(2, '0')

      // 1. Character lip-sync audio on localized dialogue blocks (gated strictly around speech & before VO starts)
      if (plan.isDialogueBlock) {
        const dlgWav = join(workDir, `dlg-stereo-${pad}-${loc}.wav`)
        if (!existsSync(dlgWav)) {
          runFfmpeg(
            [
              '-y',
              '-i',
              plan.clipPath,
              '-vn',
              '-af',
              'highpass=f=85',
              '-ac',
              '2',
              '-ar',
              String(SR),
              '-c:a',
              'pcm_s16le',
              dlgWav,
            ],
            `decode dlg ${pad}-${loc}`
          )
        }
        const dlgPcm = decodeStereoWav(dlgWav)
        const sStart = Math.floor(plan.dialogueStartSec * SR)
        const sEnd = Math.min(dlgPcm.L.length, Math.ceil(plan.dialogueEndSec * SR))
        normalizeActiveRms(dlgPcm.L, dlgPcm.R, TARGET_DIALOGUE_RMS, {
          startSample: sStart,
          endSample: sEnd,
          maxGain: 3.2,
          minGain: 0.65,
          gateThreshold: 0.005,
        })

        // Gate clip audio cleanly: fade in 0.32s before character speaks (suppressing stray early Veo piano),
        // hold full clarity through dialogueEndSec + 0.08s, and cosine fade-out ending >= 0.14s BEFORE voStartSec!
        const gateStartSec = Math.max(0, plan.dialogueStartSec - 0.32)
        const gateFadeInEndSec = Math.min(plan.dialogueEndSec, gateStartSec + 0.28)
        const gateFadeOutStartSec = plan.dialogueEndSec + 0.08
        const gateEndSec = Math.min(plan.dialogueEndSec + 0.38, plan.voStartSec - 0.14)

        const iStart = Math.max(0, Math.floor(gateStartSec * SR))
        const iFadeInEnd = Math.min(dlgPcm.L.length, Math.floor(gateFadeInEndSec * SR))
        const iFadeOutStart = Math.min(dlgPcm.L.length, Math.floor(gateFadeOutStartSec * SR))
        const iEnd = Math.min(dlgPcm.L.length, Math.floor(gateEndSec * SR))

        const baseOut = Math.round(blockOffsetSec * SR)
        for (let i = iStart; i < iEnd && baseOut + i < totalSamples; i++) {
          let g = 1.0
          if (i < iFadeInEnd && iFadeInEnd > iStart) {
            const t = (i - iStart) / (iFadeInEnd - iStart)
            g = 0.5 * (1 - Math.cos(Math.PI * t))
          } else if (i >= iFadeOutStart && iEnd > iFadeOutStart) {
            const t = (i - iFadeOutStart) / (iEnd - iFadeOutStart)
            g = 0.5 * (1 + Math.cos(Math.PI * t))
          }
          voiceTrackL[baseOut + i]! += dlgPcm.L[i]! * g
          voiceTrackR[baseOut + i]! += dlgPcm.R[i]! * g
        }

        speechWindows.push({
          startSec: blockOffsetSec + gateStartSec,
          endSec: blockOffsetSec + gateEndSec,
          targetGain: MUSIC_GAIN_CLIP_LIVE,
        })
      }

      // 2. Studio Narrator VO cue
      const voPcm = trimmedVos.get(plan.blockNumber)!
      const voAbsStartSec = blockOffsetSec + plan.voStartSec
      const voAbsStartSample = Math.round(voAbsStartSec * SR)
      for (let i = 0; i < voPcm.L.length && voAbsStartSample + i < totalSamples; i++) {
        voiceTrackL[voAbsStartSample + i]! += voPcm.L[i]!
        voiceTrackR[voAbsStartSample + i]! += voPcm.R[i]!
      }
      speechWindows.push({
        startSec: voAbsStartSec,
        endSec: voAbsStartSec + voPcm.durationSec,
        targetGain: MUSIC_GAIN_DUCKED,
      })

      blockOffsetSec += plan.exactBlockDurSec
    }

    // Build and duck orchestral score bed
    const musicBed = buildMusicBed(musicRawPcm, totalSamples)
    applyMusicSpeechDucking(musicBed, speechWindows)

    const masterL = new Float64Array(totalSamples)
    const masterR = new Float64Array(totalSamples)
    for (let i = 0; i < totalSamples; i++) {
      masterL[i] = voiceTrackL[i]! + musicBed.L[i]!
      masterR[i] = voiceTrackR[i]! + musicBed.R[i]!
    }

    const mixedWavPath = join(workDir, `master-mix-${loc}.wav`)
    writeStereoWav(mixedWavPath, masterL, masterR)

    // Step 2C: Concat frame-exact video segments + mux master audio into tmp/video-services-source/<vertical>-<loc>.mp4
    const concatListPath = join(workDir, `concat-${loc}.txt`)
    writeFileSync(
      concatListPath,
      segPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n',
      'utf8'
    )

    const masterMp4Path = join(sourceOutDir, `${vertical}-${loc}.mp4`)
    runFfmpeg(
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatListPath,
        '-i',
        mixedWavPath,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        String(SR),
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        '-shortest',
        masterMp4Path,
      ],
      `mux master ${vertical}-${loc}.mp4`
    )

    const mb = (statSync(masterMp4Path).size / (1024 * 1024)).toFixed(2)
    console.log(`  ✓ Master stitched: tmp/video-services-source/${vertical}-${loc}.mp4 (${mb} MB, ${totalDurSec.toFixed(1)}s)`)

    if (encodeWeb) {
      const encRes = spawnSync(
        process.execPath,
        [
          join(ROOT, 'scripts', 'encode-video-services-webm.mjs'),
          '--vertical',
          vertical,
          '--locale',
          loc,
          '--input',
          masterMp4Path,
        ],
        { stdio: 'inherit' }
      )
      if (encRes.status !== 0) {
        throw new Error(`encode-video-services-webm.mjs failed for ${vertical}-${loc}`)
      }
    }
  }

  console.log(`\n✓ Finished building [${vertical}] across ${locales.length} language(s): ${locales.join(', ')}`)
}

main().catch((err) => {
  console.error('\n[build-video-service-promos] Fatal error:', err)
  process.exit(1)
})
