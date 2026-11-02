#!/usr/bin/env node
/**
 * Encodes the English Animated Series ("Hart House") trailer (.mp4 and .webm) from
 * tmp/animated-series-dub/hart-house-source.mp4 and muxes the 6 multilingual
 * dubbed versions (es, pt, hi, zh, ar, th) retaining all non-dialogue sound
 * (music, SFX, and non-verbal chuckles via the Demucs accompaniment stem).
 *
 * Uses exact sample-accurate PCM placement at 48kHz stereo in Node so every
 * character line lands on its exact millisecond cue without FFmpeg adelay/areverse PTS bugs.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DUB_DIR = join(ROOT, 'tmp', 'animated-series-dub')
const SEGMENTS_DIR = join(DUB_DIR, 'segments')
const VIDEOS_DIR = join(ROOT, 'public', 'videos')

const SOURCE_MP4 = join(DUB_DIR, 'hart-house-source.mp4')
const ACCOMPANIMENT_WAV = join(DUB_DIR, 'master_accompaniment_bed.wav')

const TARGET_LOCALES = ['es', 'pt', 'hi', 'zh', 'ar', 'th']
const SR = 48000

const CUES = [
  { blockNumber: 1, startSec: 1.55, maxDurSec: 7.45 },
  { blockNumber: 2, startSec: 12.75, maxDurSec: 5.75 },
  { blockNumber: 3, startSec: 19.60, maxDurSec: 6.30 },
  { blockNumber: 4, startSec: 30.70, maxDurSec: 5.50 },
  { blockNumber: 5, startSec: 38.95, maxDurSec: 6.45 },
  { blockNumber: 6, startSec: 45.65, maxDurSec: 4.10 },
  { blockNumber: 7, startSec: 55.30, maxDurSec: 5.45 },
  { blockNumber: 8, startSec: 63.40, maxDurSec: 8.80 },
]

function resolveFfmpeg() {
  const ffmpegStatic = join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg')
  if (existsSync(ffmpegStatic)) return ffmpegStatic
  return 'ffmpeg'
}

const FFMPEG = resolveFfmpeg()

function runFfmpeg(args, label) {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (res.status !== 0) {
    throw new Error(`ffmpeg ${label} failed (${res.status}):\n${(res.stderr || '').slice(-800)}`)
  }
}

function getDurationSec(filePath) {
  const res = spawnSync(FFMPEG, ['-i', filePath], { encoding: 'utf8' })
  const match = (res.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!match) return 0
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

function findWavDataChunk(buf) {
  let pos = 12
  while (pos < buf.length - 8) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'data') return { pos: pos + 8, size }
    pos += 8 + size
  }
  throw new Error('WAV data chunk not found')
}

function readWavStereoFloat(filePath) {
  const buf = readFileSync(filePath)
  const { pos, size } = findWavDataChunk(buf)
  const frames = Math.floor(size / 4)
  const L = new Float64Array(frames)
  const R = new Float64Array(frames)
  for (let i = 0; i < frames; i++) {
    L[i] = buf.readInt16LE(pos + i * 4) / 32768
    R[i] = buf.readInt16LE(pos + i * 4 + 2) / 32768
  }
  return { buf, pos, frames, L, R }
}

function trimSilenceFloatStereo(L, R, threshold = 0.008) {
  let start = 0
  let end = L.length - 1
  while (start < end && Math.abs(L[start]) < threshold && Math.abs(R[start]) < threshold) {
    start++
  }
  while (end > start && Math.abs(L[end]) < threshold && Math.abs(R[end]) < threshold) {
    end--
  }
  // Keep 20ms padding on each side
  start = Math.max(0, start - Math.floor(0.02 * SR))
  end = Math.min(L.length - 1, end + Math.floor(0.03 * SR))
  return {
    L: L.subarray(start, end + 1),
    R: R.subarray(start, end + 1),
  }
}

function encodeEnglishMasters(forceReencode = false) {
  mkdirSync(VIDEOS_DIR, { recursive: true })
  const enMp4 = join(VIDEOS_DIR, 'animated-series-trailer.mp4')
  const enWebm = join(VIDEOS_DIR, 'animated-series-trailer.webm')

  if (
    !forceReencode &&
    existsSync(enMp4) &&
    statSync(enMp4).size > 5_000_000 &&
    existsSync(enWebm) &&
    statSync(enWebm).size > 5_000_000
  ) {
    const mp4Mb = (statSync(enMp4).size / (1024 * 1024)).toFixed(2)
    const webmMb = (statSync(enWebm).size / (1024 * 1024)).toFixed(2)
    console.log(`Using existing English masters: MP4 (${mp4Mb} MB), WebM (${webmMb} MB)`)
    return { enMp4, enWebm }
  }

  console.log('1. Encoding English MP4 master (animated-series-trailer.mp4)...')
  runFfmpeg(
    [
      '-y',
      '-i',
      SOURCE_MP4,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '21',
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
      enMp4,
    ],
    'enMp4'
  )

  console.log('2. Encoding English WebM master (animated-series-trailer.webm)...')
  runFfmpeg(
    [
      '-y',
      '-i',
      SOURCE_MP4,
      '-c:v',
      'libvpx-vp9',
      '-crf',
      '30',
      '-b:v',
      '0',
      '-row-mt',
      '1',
      '-deadline',
      'good',
      '-cpu-used',
      '3',
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
      enWebm,
    ],
    'enWebm'
  )

  const mp4Mb = (statSync(enMp4).size / (1024 * 1024)).toFixed(2)
  const webmMb = (statSync(enWebm).size / (1024 * 1024)).toFixed(2)
  console.log(`   -> English masters ready: MP4 (${mp4Mb} MB), WebM (${webmMb} MB)`)
  return { enMp4, enWebm }
}

function buildLocaleMixAndVideos(locale, enMp4, enWebm, videoDur) {
  console.log(`\n=== Building [${locale}] dubbed Hart House trailer ===`)
  const bed = readWavStereoFloat(ACCOMPANIMENT_WAV)
  const outL = new Float64Array(bed.L)
  const outR = new Float64Array(bed.R)

  for (const cue of CUES) {
    const rawMp3 = join(SEGMENTS_DIR, locale, `block-${cue.blockNumber}.mp3`)
    if (!existsSync(rawMp3)) {
      throw new Error(`Missing segment: ${rawMp3}`)
    }
    const rawWav = join(SEGMENTS_DIR, locale, `block-${cue.blockNumber}-raw.wav`)
    runFfmpeg(
      ['-y', '-i', rawMp3, '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', rawWav],
      `decode ${locale} block-${cue.blockNumber}`
    )
    const decoded = readWavStereoFloat(rawWav)
    const trimmed = trimSilenceFloatStereo(decoded.L, decoded.R)
    const rawDur = trimmed.L.length / SR
    const budget = cue.maxDurSec - 0.08
    const tempo = rawDur > budget ? Math.min(1.45, Math.max(1.0, rawDur / budget)) : 1.0

    let finalL = trimmed.L
    let finalR = trimmed.R

    if (tempo > 1.01) {
      const trimmedInWav = join(SEGMENTS_DIR, locale, `block-${cue.blockNumber}-trim.wav`)
      const tempoOutWav = join(SEGMENTS_DIR, locale, `block-${cue.blockNumber}-tempo.wav`)
      const header = Buffer.alloc(44)
      decoded.buf.copy(header, 0, 0, 44)
      const dataBytes = trimmed.L.length * 4
      header.writeUInt32LE(36 + dataBytes, 4)
      header.write('data', 36, 4, 'ascii')
      header.writeUInt32LE(dataBytes, 40)
      const body = Buffer.alloc(dataBytes)
      for (let i = 0; i < trimmed.L.length; i++) {
        body.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(trimmed.L[i] * 32768))), i * 4)
        body.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(trimmed.R[i] * 32768))), i * 4 + 2)
      }
      writeFileSync(trimmedInWav, Buffer.concat([header, body]))
      runFfmpeg(
        [
          '-y',
          '-i',
          trimmedInWav,
          '-af',
          `atempo=${tempo.toFixed(3)}`,
          '-ac',
          '2',
          '-ar',
          '48000',
          '-c:a',
          'pcm_s16le',
          tempoOutWav,
        ],
        `atempo ${locale} block-${cue.blockNumber}`
      )
      const stretched = readWavStereoFloat(tempoOutWav)
      finalL = stretched.L
      finalR = stretched.R
    }

    const startFrame = Math.round(cue.startSec * SR)
    const finalDur = finalL.length / SR
    const endSec = cue.startSec + finalDur
    const voiceGain = 1.22
    const fadeLen = Math.min(Math.floor(0.015 * SR), Math.floor(finalL.length / 4))

    for (let i = 0; i < finalL.length && startFrame + i < bed.frames; i++) {
      let env = voiceGain
      if (i < fadeLen) env *= i / fadeLen
      else if (finalL.length - 1 - i < fadeLen) env *= (finalL.length - 1 - i) / fadeLen

      outL[startFrame + i] += finalL[i] * env
      outR[startFrame + i] += finalR[i] * env
    }

    console.log(
      `  block-${cue.blockNumber}: [${cue.startSec.toFixed(2)}s -> ${endSec.toFixed(2)}s] (raw=${rawDur.toFixed(2)}s, tempo=${tempo.toFixed(2)}x)`
    )
  }

  // Write mixed WAV with soft limiter
  const mixedBuf = Buffer.from(bed.buf)
  for (let i = 0; i < bed.frames; i++) {
    const softClip = (x) => {
      if (x > 0.95) return 0.95 + 0.04 * Math.tanh((x - 0.95) / 0.04)
      if (x < -0.95) return -0.95 + 0.04 * Math.tanh((x + 0.95) / 0.04)
      return x
    }
    const lInt = Math.max(-32768, Math.min(32767, Math.round(softClip(outL[i]) * 32768)))
    const rInt = Math.max(-32768, Math.min(32767, Math.round(softClip(outR[i]) * 32768)))
    mixedBuf.writeInt16LE(lInt, bed.pos + i * 4)
    mixedBuf.writeInt16LE(rInt, bed.pos + i * 4 + 2)
  }

  const mixedWav = join(DUB_DIR, `mixed-${locale}.wav`)
  const mixedMp3 = join(DUB_DIR, `mixed-${locale}.mp3`)
  writeFileSync(mixedWav, mixedBuf)
  runFfmpeg(
    ['-y', '-i', mixedWav, '-c:a', 'libmp3lame', '-b:a', '128k', mixedMp3],
    `mp3-${locale}`
  )

  const outMp4 = join(VIDEOS_DIR, `animated-series-trailer-${locale}.mp4`)
  const outWebm = join(VIDEOS_DIR, `animated-series-trailer-${locale}.webm`)

  runFfmpeg(
    [
      '-y',
      '-i',
      enMp4,
      '-i',
      mixedWav,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-t',
      videoDur.toFixed(3),
      '-movflags',
      '+faststart',
      outMp4,
    ],
    `mp4-${locale}`
  )

  runFfmpeg(
    [
      '-y',
      '-i',
      enWebm,
      '-i',
      mixedWav,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'libopus',
      '-b:a',
      '128k',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-t',
      videoDur.toFixed(3),
      '-cues_to_front',
      '1',
      outWebm,
    ],
    `webm-${locale}`
  )

  const mp4Mb = (statSync(outMp4).size / (1024 * 1024)).toFixed(2)
  const webmMb = (statSync(outWebm).size / (1024 * 1024)).toFixed(2)
  console.log(
    `  -> Wrote animated-series-trailer-${locale}.mp4 (${mp4Mb} MB) & .webm (${webmMb} MB)`
  )
}

function main() {
  const forceReencode = process.argv.includes('--force-en')
  const { enMp4, enWebm } = encodeEnglishMasters(forceReencode)
  const videoDur = getDurationSec(enMp4)
  for (const locale of TARGET_LOCALES) {
    buildLocaleMixAndVideos(locale, enMp4, enWebm, videoDur)
  }
  console.log('\nAll English and 6 dubbed Animated Series trailers (.mp4 & .webm) encoded!')
}

main()
