#!/usr/bin/env node
/**
 * Muxes the 30 synthesized Ana multilingual dub MP3s (from tmp/hero-sequence-dubs/)
 * with the 5 hero sequence video masters into .mp4 (H.264 + AAC +faststart)
 * and .webm (VP9 + Opus) across Spanish, Portuguese, Hindi, Chinese, Arabic, and Thai.
 *
 * Runs locally with ffmpeg-static (no network access needed).
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const AUDIO_DIR = join(ROOT, 'tmp', 'hero-sequence-dubs')
const TMP_VIDEO_DIR = join(ROOT, 'tmp', 'hero-sequence-video-masters')

const TARGET_LOCALES = ['es', 'pt', 'hi', 'zh', 'ar', 'th']

const SECTIONS = [
  {
    id: 'friction',
    outDir: join(ROOT, 'public', 'landing', 'two-modes'),
    filePrefix: 'friction',
    enMp4: join(ROOT, 'public', 'landing', 'two-modes', 'friction-en.mp4'),
    enWebm: join(ROOT, 'public', 'landing', 'two-modes', 'friction-en.webm'),
    loopCount: 1,
  },
  {
    id: 'control',
    outDir: join(ROOT, 'public', 'landing', 'primary-value'),
    filePrefix: 'direction',
    enMp4: join(ROOT, 'public', 'landing', 'primary-value', 'direction-en.mp4'),
    enWebm: join(ROOT, 'public', 'landing', 'primary-value', 'direction-en.webm'),
    loopCount: 1,
  },
  {
    id: 'agent',
    outDir: join(ROOT, 'public', 'landing', 'primary-value'),
    filePrefix: 'production-agent',
    enMp4: join(ROOT, 'public', 'landing', 'primary-value', 'production-agent-en.mp4'),
    enWebm: join(ROOT, 'public', 'landing', 'primary-value', 'production-agent-en.webm'),
    loopCount: 1,
  },
  {
    id: 'cut',
    outDir: join(ROOT, 'public', 'landing', 'primary-value'),
    filePrefix: 'publish',
    enMp4: join(ROOT, 'public', 'landing', 'primary-value', 'publish-en.mp4'),
    enWebm: join(ROOT, 'public', 'landing', 'primary-value', 'publish-en.webm'),
    /** publish-en is 10.00s (1 beat); loop 3x (30.00s) so all 3 narration beats play without truncation. */
    loopCount: 3,
  },
  {
    id: 'academy',
    outDir: join(ROOT, 'public', 'landing', 'primary-value'),
    filePrefix: 'studio-academy',
    enMp4: join(ROOT, 'public', 'landing', 'primary-value', 'studio-academy-en.mp4'),
    enWebm: join(ROOT, 'public', 'landing', 'primary-value', 'studio-academy-en.webm'),
    loopCount: 1,
  },
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
  if (!match) return 30
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

function runFfmpeg(args, label) {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8' })
  if (res.status !== 0) {
    throw new Error(`ffmpeg ${label} failed (${res.status}):\n${(res.stderr || '').slice(-600)}`)
  }
}

function prepareVideoMasters(section) {
  if (section.loopCount <= 1) {
    return { mp4Master: section.enMp4, webmMaster: section.enWebm }
  }
  mkdirSync(TMP_VIDEO_DIR, { recursive: true })
  const mp4ConcatTxt = join(TMP_VIDEO_DIR, `${section.id}-mp4-concat.txt`)
  const webmConcatTxt = join(TMP_VIDEO_DIR, `${section.id}-webm-concat.txt`)
  const mp4Master = join(TMP_VIDEO_DIR, `${section.id}-looped.mp4`)
  const webmMaster = join(TMP_VIDEO_DIR, `${section.id}-looped.webm`)

  writeFileSync(
    mp4ConcatTxt,
    Array.from({ length: section.loopCount }, () => `file '${section.enMp4}'`).join('\n') + '\n',
    'utf8'
  )
  writeFileSync(
    webmConcatTxt,
    Array.from({ length: section.loopCount }, () => `file '${section.enWebm}'`).join('\n') + '\n',
    'utf8'
  )

  runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', mp4ConcatTxt, '-c', 'copy', mp4Master], `${section.id} loop mp4`)
  runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', webmConcatTxt, '-c', 'copy', webmMaster], `${section.id} loop webm`)

  return { mp4Master, webmMaster }
}

function main() {
  for (const section of SECTIONS) {
    mkdirSync(section.outDir, { recursive: true })
    const { mp4Master, webmMaster } = prepareVideoMasters(section)
    const videoDur = getMediaDurationSec(mp4Master)
    console.log(`\n=== Section: ${section.id} (${section.filePrefix}, video ${videoDur.toFixed(2)}s) ===`)

    for (const locale of TARGET_LOCALES) {
      const voiceMp3 = join(AUDIO_DIR, `${section.id}-${locale}.mp3`)
      if (!existsSync(voiceMp3)) {
        throw new Error(`Missing synthesized audio: ${voiceMp3}`)
      }
      const voiceDur = getMediaDurationSec(voiceMp3)
      const targetVoiceBudget = Math.max(8, videoDur - 0.8)
      const tempo =
        voiceDur > targetVoiceBudget
          ? Math.min(1.45, Math.max(1.0, voiceDur / targetVoiceBudget))
          : 1.0

      const tempoFilter = tempo > 1.01 ? `,atempo=${tempo.toFixed(3)}` : ''
      // Extract subtle stereo-difference low-passed room/score ambience from original track (cancels center English speech)
      // and mix under Ana's clear voiceover track padded to exact video duration.
      const filterComplex = [
        `[0:a]pan=stereo|c0=c0-c1|c1=c1-c0,lowpass=f=240,volume=0.16,apad,atrim=0:${videoDur.toFixed(3)}[bed]`,
        `[1:a]aformat=sample_rates=48000:channel_layouts=stereo${tempoFilter},adelay=350|350,volume=1.15,apad,atrim=0:${videoDur.toFixed(3)}[vo]`,
        `[bed][vo]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
      ].join(';')

      const outMp4 = join(section.outDir, `${section.filePrefix}-${locale}.mp4`)
      const outWebm = join(section.outDir, `${section.filePrefix}-${locale}.webm`)

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
        `${section.filePrefix}-${locale}.mp4`
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
        `${section.filePrefix}-${locale}.webm`
      )

      const mp4Mb = (statSync(outMp4).size / (1024 * 1024)).toFixed(2)
      const webmMb = (statSync(outWebm).size / (1024 * 1024)).toFixed(2)
      console.log(
        `  [${locale}] voice=${voiceDur.toFixed(1)}s tempo=${tempo.toFixed(2)}x -> ${section.filePrefix}-${locale}.mp4 (${mp4Mb}MB) & .webm (${webmMb}MB)`
      )
    }
  }

  console.log('\nAll 30 MP4 and 30 WebM dubbed hero sequence videos encoded successfully.')
}

main()
