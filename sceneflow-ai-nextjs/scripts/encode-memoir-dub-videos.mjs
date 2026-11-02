#!/usr/bin/env node
import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import ffmpegPath from 'ffmpeg-static'

if (!ffmpegPath) {
  throw new Error('ffmpeg-static binary not found')
}

const ROOT = process.cwd()
const DUB_DIR = join(ROOT, 'tmp/memoir-dub')
const SEGMENTS_DIR = join(DUB_DIR, 'segments')
const VIDEOS_DIR = join(ROOT, 'public/videos')
const SOURCE_MP4 = join(DUB_DIR, 'memoir-source.mp4')
const ACCOMPANIMENT_WAV = join(DUB_DIR, 'master_accompaniment_bed.wav')

const LOCALES = ['es', 'pt', 'hi', 'zh', 'ar', 'th']
const SR = 48000

const CUES = [
  { blockNumber: 1, startSec: 1.50, maxDurSec: 7.20 },
  { blockNumber: 2, startSec: 8.85, maxDurSec: 8.65 },
  { blockNumber: 3, startSec: 17.70, maxDurSec: 9.40 },
  { blockNumber: 4, startSec: 27.40, maxDurSec: 8.70 },
  { blockNumber: 5, startSec: 38.10, maxDurSec: 7.80 },
  { blockNumber: 6, startSec: 46.20, maxDurSec: 8.00 },
  { blockNumber: 7, startSec: 54.50, maxDurSec: 5.15 },
  { blockNumber: 8, startSec: 62.70, maxDurSec: 10.10 },
]

function runFfmpeg(args, label) {
  const res = spawnSync(ffmpegPath, args, { encoding: 'utf8' })
  if (res.status !== 0) {
    console.error(`ffmpeg failed (${label}):`, res.stderr)
    process.exit(1)
  }
}

function getDurationSec(filePath) {
  const res = spawnSync(ffmpegPath, ['-i', filePath], { encoding: 'utf8' })
  const m = (res.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!m) return 0
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

function findDataChunkOffset(buf) {
  let pos = 12
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'data') {
      return { pos: pos + 8, size }
    }
    pos += 8 + size
  }
  return { pos: 44, size: buf.length - 44 }
}

function readWavStereoFloat(filePath) {
  const buf = readFileSync(filePath)
  const { pos, size } = findDataChunkOffset(buf)
  const totalSamples = Math.floor(Math.min(size, buf.length - pos) / 4)
  const L = new Float64Array(totalSamples)
  const R = new Float64Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    L[i] = buf.readInt16LE(pos + i * 4) / 32768
    R[i] = buf.readInt16LE(pos + i * 4 + 2) / 32768
  }
  return { buf, pos, totalSamples, L, R }
}

function trimSilenceFloatStereo(L, R, threshold = 0.004) {
  let start = 0
  let end = L.length - 1
  const win = Math.floor(SR * 0.01)

  while (start + win < L.length) {
    let sum = 0
    for (let i = 0; i < win; i++) {
      const m = 0.5 * (Math.abs(L[start + i]) + Math.abs(R[start + i]))
      sum += m * m
    }
    if (Math.sqrt(sum / win) > threshold) break
    start += win
  }

  while (end - win > start) {
    let sum = 0
    for (let i = 0; i < win; i++) {
      const m = 0.5 * (Math.abs(L[end - i]) + Math.abs(R[end - i]))
      sum += m * m
    }
    if (Math.sqrt(sum / win) > threshold) break
    end -= win
  }

  const pad = Math.floor(SR * 0.03)
  start = Math.max(0, start - pad)
  end = Math.min(L.length, end + pad)

  return {
    L: L.slice(start, end),
    R: R.slice(start, end),
  }
}

function normalizeRmsStereo(L, R, targetRms = 0.17) {
  let sum = 0
  let count = 0
  for (let i = 0; i < L.length; i++) {
    const v = 0.5 * (L[i] + R[i])
    if (Math.abs(v) > 0.008) {
      sum += v * v
      count++
    }
  }
  const rms = count > 0 ? Math.sqrt(sum / count) : 0.05
  const gain = Math.min(3.0, Math.max(0.5, targetRms / Math.max(0.01, rms)))
  for (let i = 0; i < L.length; i++) {
    L[i] *= gain
    R[i] *= gain
  }
}

function encodeEnglishMasters() {
  mkdirSync(VIDEOS_DIR, { recursive: true })
  const enMp4 = join(VIDEOS_DIR, 'video-memoir-trailer.mp4')
  const enWebm = join(VIDEOS_DIR, 'video-memoir-trailer.webm')

  if (
    existsSync(enMp4) &&
    existsSync(enWebm) &&
    statSync(enMp4).size > 5_000_000 &&
    statSync(enWebm).size > 5_000_000
  ) {
    const mp4Mb = (statSync(enMp4).size / (1024 * 1024)).toFixed(2)
    const webmMb = (statSync(enWebm).size / (1024 * 1024)).toFixed(2)
    console.log(`Using existing English masters: MP4 (${mp4Mb} MB), WebM (${webmMb} MB)`)
    return { enMp4, enWebm }
  }

  console.log('1. Encoding English MP4 master (video-memoir-trailer.mp4)...')
  runFfmpeg(
    [
      '-y',
      '-i',
      SOURCE_MP4,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '22',
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

  console.log('2. Encoding English WebM master (video-memoir-trailer.webm)...')
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
  console.log(`\n=== Building [${locale}] dubbed Letters Across the Water trailer ===`)
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
    const tempo = rawDur > budget ? Math.min(1.98, Math.max(1.0, rawDur / budget)) : 1.0

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
          '-filter:a',
          `atempo=${tempo.toFixed(4)}`,
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

    normalizeRmsStereo(finalL, finalR, 0.17)

    const fadeSamples = Math.floor(SR * 0.02)
    for (let i = 0; i < fadeSamples && i < finalL.length; i++) {
      const f = i / fadeSamples
      finalL[i] *= f
      finalR[i] *= f
      const rev = finalL.length - 1 - i
      finalL[rev] *= f
      finalR[rev] *= f
    }

    const startSample = Math.floor(cue.startSec * SR)
    const endSample = Math.min(outL.length, startSample + finalL.length)
    const actualDur = (endSample - startSample) / SR
    console.log(
      `  block-${cue.blockNumber}: [${cue.startSec.toFixed(2)}s -> ${(cue.startSec + actualDur).toFixed(2)}s] (raw=${rawDur.toFixed(2)}s, tempo=${tempo.toFixed(2)}x)`
    )

    for (let i = startSample; i < endSample; i++) {
      const segIdx = i - startSample
      outL[i] = outL[i] * 0.88 + finalL[segIdx]
      outR[i] = outR[i] * 0.88 + finalR[segIdx]
    }
  }

  const softClip = (x) => Math.tanh(x * 1.05) / Math.tanh(1.05)
  const mixedBuf = Buffer.from(bed.buf)
  for (let i = 0; i < bed.totalSamples; i++) {
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

  const outMp4 = join(VIDEOS_DIR, `video-memoir-trailer-${locale}.mp4`)
  const outWebm = join(VIDEOS_DIR, `video-memoir-trailer-${locale}.webm`)

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
  console.log(`  -> Wrote video-memoir-trailer-${locale}.mp4 (${mp4Mb} MB) & .webm (${webmMb} MB)`)
}

function main() {
  const videoDur = getDurationSec(SOURCE_MP4)
  const { enMp4, enWebm } = encodeEnglishMasters()

  for (const locale of LOCALES) {
    buildLocaleMixAndVideos(locale, enMp4, enWebm, videoDur)
  }

  console.log('\nAll English and 6 dubbed Video Memoir trailers (.mp4 & .webm) encoded!')
}

main()
