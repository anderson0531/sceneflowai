#!/usr/bin/env node
/**
 * Mix an MP3 background score at 25% volume (0.25 / -12 dB) into a landing trailer video,
 * preserving the trailer's original dialogue/VO/SFX track at 100% volume (1.0) and
 * re-encoding both the 1080p MP4 (+faststart) and VP9/Opus WebM in public/videos/.
 *
 * Usage:
 *   node scripts/mix-trailer-music.mjs --id drama --music https://.../score.mp3
 *   node scripts/mix-trailer-music.mjs --id animation --music ./path/to/score.mp3 --volume 0.25
 */

import { copyFileSync, createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import ffmpegStatic from 'ffmpeg-static'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const TRAILER_FILES = {
  drama: 'cinematic-drama-trailer',
  animation: 'animated-series-trailer',
  documentary: 'documentary-trailer',
  training: 'training-series-trailer',
  podcast: 'creator-podcast-trailer',
  memoir: 'video-memoir-trailer',
}

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  return {
    id: get('--id'),
    video: get('--video'),
    music: get('--music'),
    volume: Number(get('--volume') ?? '0.25'),
  }
}

async function resolveInputFile(source, tmpName) {
  if (/^https?:\/\//i.test(source)) {
    const tmpPath = join('/tmp', tmpName)
    console.log(`Downloading ${source} -> ${tmpPath}`)
    const res = await fetch(source)
    if (!res.ok || !res.body) {
      throw new Error(`Download failed (${res.status}): ${source}`)
    }
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmpPath))
    return { path: tmpPath, cleanup: true }
  }
  const resolved = resolve(source)
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`)
  }
  return { path: resolved, cleanup: false }
}

async function main() {
  const { id, video, music, volume } = parseArgs(process.argv.slice(2))
  if (!id || !TRAILER_FILES[id] || !music) {
    console.error(
      `Usage: node scripts/mix-trailer-music.mjs --id <${Object.keys(TRAILER_FILES).join('|')}> --music <mp3-path-or-url> [--video <mp4-path-or-url>] [--volume 0.25]`
    )
    process.exit(1)
  }

  const baseName = TRAILER_FILES[id]
  const mp4Dest = join(ROOT, 'public', 'videos', `${baseName}.mp4`)
  const webmDest = join(ROOT, 'public', 'videos', `${baseName}.webm`)

  const videoInput = video
    ? await resolveInputFile(video, `${baseName}-source-video.mp4`)
    : { path: join('/tmp', `${baseName}-current-video.mp4`), cleanup: true }

  if (!video) {
    copyFileSync(mp4Dest, videoInput.path)
  }

  const musicInput = await resolveInputFile(music, `${baseName}-score.mp3`)

  try {
    mkdirSync(dirname(mp4Dest), { recursive: true })
    const filterComplex = `[0:a]volume=1.0[va];[1:a]volume=${volume},afade=t=out:st=70:d=4[ma];[va][ma]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]`

    console.log(`Mixing music at ${(volume * 100).toFixed(0)}% volume into ${mp4Dest}...`)
    const mp4Res = spawnSync(
      ffmpegStatic,
      [
        '-y',
        '-i',
        videoInput.path,
        '-stream_loop',
        '-1',
        '-i',
        musicInput.path,
        '-filter_complex',
        filterComplex,
        '-map',
        '0:v:0',
        '-map',
        '[aout]',
        '-vf',
        'scale=-2:1080',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '22',
        '-maxrate',
        '8M',
        '-bufsize',
        '16M',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        '-shortest',
        mp4Dest,
      ],
      { stdio: 'inherit' }
    )
    if (mp4Res.status !== 0) {
      throw new Error(`MP4 mix failed with status ${mp4Res.status}`)
    }

    console.log(`Encoding mixed WebM to ${webmDest}...`)
    const webmRes = spawnSync(
      ffmpegStatic,
      [
        '-y',
        '-i',
        mp4Dest,
        '-vf',
        'scale=-2:1080',
        '-c:v',
        'libvpx-vp9',
        '-b:v',
        '0',
        '-crf',
        '32',
        '-row-mt',
        '1',
        '-cpu-used',
        '4',
        '-deadline',
        'good',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'libopus',
        '-b:a',
        '128k',
        webmDest,
      ],
      { stdio: 'inherit' }
    )
    if (webmRes.status !== 0) {
      throw new Error(`WebM encode failed with status ${webmRes.status}`)
    }

    console.log(
      `Done! MP4: ${(statSync(mp4Dest).size / (1024 * 1024)).toFixed(1)} MB | WebM: ${(statSync(webmDest).size / (1024 * 1024)).toFixed(1)} MB`
    )
  } finally {
    if (videoInput.cleanup && existsSync(videoInput.path)) unlinkSync(videoInput.path)
    if (musicInput.cleanup && existsSync(musicInput.path)) unlinkSync(musicInput.path)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
