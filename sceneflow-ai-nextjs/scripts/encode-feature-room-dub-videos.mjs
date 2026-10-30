#!/usr/bin/env node
/**
 * Muxes the 24 synthesized Ana multilingual dub MP3s (from tmp/feature-room-dubs/)
 * with the 4 Key Features Room Overview video masters into:
 *   - public/landing/key-features/rooms/${roomId}-${locale}.webm (VP9 + Opus)
 *   - public/landing/key-features/rooms/${roomId}-${locale}.mp4  (H.264 + AAC +faststart)
 * across Spanish (es), Portuguese (pt), Hindi (hi), Chinese (zh), Arabic (ar), and Thai (th).
 *
 * Runs locally with ffmpeg-static (no network access needed).
 */

import { existsSync, mkdirSync, statSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const AUDIO_DIR = join(ROOT, 'tmp', 'feature-room-dubs')
const TMP_VIDEO_DIR = join(ROOT, 'tmp', 'feature-room-video-masters')
const ROOMS_DIR = join(ROOT, 'public', 'landing', 'key-features', 'rooms')

const TARGET_LOCALES = ['es', 'pt', 'hi', 'zh', 'ar', 'th']

const ROOM_IDS = [
  'series-desk',
  'blueprint-board',
  'production-stage',
  'screening-room',
]

function resolveFfmpeg() {
  const ffmpegStatic = join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg')
  if (existsSync(ffmpegStatic)) return ffmpegStatic
  return 'ffmpeg'
}

const FFMPEG = resolveFfmpeg()

function getMediaDurationSec(filePath) {
  const res = spawnSync(FFMPEG, ['-i', filePath], { encoding: 'utf8' })
  const match = (res.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!match) return 60
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

function detectSilenceMidpoints(filePath, minDuration = 0.35) {
  const res = spawnSync(
    FFMPEG,
    ['-i', filePath, '-af', `silencedetect=noise=-32dB:d=${minDuration}`, '-f', 'null', '-'],
    { encoding: 'utf8' }
  )
  const stderr = res.stderr || ''
  const starts = []
  const mids = []
  for (const line of stderr.split('\n')) {
    const sMatch = line.match(/silence_start:\s*([\d.]+)/)
    if (sMatch) {
      starts.push(Number(sMatch[1]))
    }
    const eMatch = line.match(/silence_end:\s*([\d.]+)/)
    if (eMatch && starts.length > 0) {
      const start = starts.pop()
      const end = Number(eMatch[1])
      if (start > 1.0) {
        mids.push((start + end) / 2)
      }
    }
  }
  return mids
}

function runFfmpeg(args, label) {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (res.status !== 0) {
    throw new Error(`ffmpeg ${label} failed (${res.status}):\n${(res.stderr || '').slice(-800)}`)
  }
}

function ensureMp4VideoMaster(roomId, webmMaster) {
  mkdirSync(TMP_VIDEO_DIR, { recursive: true })
  const mp4Master = join(TMP_VIDEO_DIR, `${roomId}-master.mp4`)
  if (existsSync(mp4Master) && statSync(mp4Master).size > 100_000) {
    return mp4Master
  }
  console.log(`Creating H.264 video master for ${roomId} from ${webmMaster}...`)
  runFfmpeg(
    [
      '-y',
      '-i',
      webmMaster,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      mp4Master,
    ],
    `${roomId}-master.mp4`
  )
  return mp4Master
}

function buildVoiceFilterWithPacing(voiceMp3, videoDur) {
  const voiceDur = getMediaDurationSec(voiceMp3)
  const targetVoiceBudget = Math.max(15, videoDur - 1.8)

  if (voiceDur > targetVoiceBudget) {
    const tempo = Math.min(1.5, Math.max(1.0, voiceDur / targetVoiceBudget))
    return {
      voiceDur,
      tempo,
      extraGapTotal: 0,
      voChain: `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atempo=${tempo.toFixed(3)},adelay=400|400,volume=1.15,apad,atrim=0:${videoDur.toFixed(3)}[vo]`,
    }
  }

  const slack = targetVoiceBudget - voiceDur
  const mids = detectSilenceMidpoints(voiceMp3, 0.32)
  if (slack > 3.0 && mids.length >= 2) {
    // Pick up to 14 well-spaced pause points to distribute the inter-beat slack naturally
    const selectedMids = mids.slice(0, 14)
    const gapEach = Math.min(2.2, (slack * 0.78) / selectedMids.length)
    const points = [0, ...selectedMids, voiceDur]
    const parts = []
    const concatInputs = []
    for (let i = 0; i < points.length - 1; i++) {
      const segStart = points[i].toFixed(3)
      const segEnd = points[i + 1].toFixed(3)
      const padDur = i < points.length - 2 ? gapEach.toFixed(3) : '0.010'
      parts.push(
        `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=${segStart}:end=${segEnd},asetpts=PTS-STARTPTS,apad=pad_dur=${padDur}[vseg${i}]`
      )
      concatInputs.push(`[vseg${i}]`)
    }
    parts.push(
      `${concatInputs.join('')}concat=n=${concatInputs.length}:v=0:a=1,adelay=450|450,volume=1.15,apad,atrim=0:${videoDur.toFixed(3)}[vo]`
    )
    return {
      voiceDur,
      tempo: 1.0,
      extraGapTotal: gapEach * selectedMids.length,
      voChain: parts.join(';'),
    }
  }

  return {
    voiceDur,
    tempo: 1.0,
    extraGapTotal: 0,
    voChain: `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=450|450,volume=1.15,apad,atrim=0:${videoDur.toFixed(3)}[vo]`,
  }
}

function main() {
  mkdirSync(ROOMS_DIR, { recursive: true })

  for (const roomId of ROOM_IDS) {
    const webmMaster = join(ROOMS_DIR, `${roomId}-en.webm`)
    if (!existsSync(webmMaster)) {
      throw new Error(`Missing English WebM master: ${webmMaster}`)
    }
    const mp4Master = ensureMp4VideoMaster(roomId, webmMaster)
    const videoDur = getMediaDurationSec(webmMaster)
    console.log(`\n=== Room: ${roomId} (video ${videoDur.toFixed(2)}s) ===`)

    for (const locale of TARGET_LOCALES) {
      const voiceMp3 = join(AUDIO_DIR, `${roomId}-${locale}.mp3`)
      if (!existsSync(voiceMp3)) {
        throw new Error(`Missing synthesized audio: ${voiceMp3}`)
      }

      const { voiceDur, tempo, extraGapTotal, voChain } = buildVoiceFilterWithPacing(
        voiceMp3,
        videoDur
      )

      const filterComplex = [
        `[0:a]pan=stereo|c0=c0-c1|c1=c1-c0,lowpass=f=240,volume=0.16,apad,atrim=0:${videoDur.toFixed(3)}[bed]`,
        voChain,
        `[bed][vo]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
      ].join(';')

      const outMp4 = join(ROOMS_DIR, `${roomId}-${locale}.mp4`)
      const outWebm = join(ROOMS_DIR, `${roomId}-${locale}.webm`)

      runFfmpeg(
        [
          '-y',
          '-i',
          mp4Master,
          '-i',
          voiceMp3,
          '-filter_complex',
          filterComplex,
          '-map',
          '0:v:0',
          '-map',
          '[aout]',
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-t',
          videoDur.toFixed(3),
          '-movflags',
          '+faststart',
          outMp4,
        ],
        `${roomId}-${locale}.mp4`
      )

      runFfmpeg(
        [
          '-y',
          '-i',
          webmMaster,
          '-i',
          voiceMp3,
          '-filter_complex',
          filterComplex,
          '-map',
          '0:v:0',
          '-map',
          '[aout]',
          '-c:v',
          'copy',
          '-c:a',
          'libopus',
          '-b:a',
          '96k',
          '-t',
          videoDur.toFixed(3),
          outWebm,
        ],
        `${roomId}-${locale}.webm`
      )

      const mp4Mb = (statSync(outMp4).size / (1024 * 1024)).toFixed(2)
      const webmMb = (statSync(outWebm).size / (1024 * 1024)).toFixed(2)
      console.log(
        `  [${locale}] voice=${voiceDur.toFixed(1)}s (+${extraGapTotal.toFixed(1)}s pauses, tempo=${tempo.toFixed(2)}x) -> ${roomId}-${locale}.mp4 (${mp4Mb}MB) & .webm (${webmMb}MB)`
      )
    }
  }

  console.log('\nAll 24 MP4 and 24 WebM dubbed feature room overview videos encoded successfully.')
}

main()
