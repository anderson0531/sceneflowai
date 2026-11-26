#!/usr/bin/env npx tsx
/**
 * Local zero-GCP-spend assembler for Chapter 2:
 * "Letters Across the Water — Chapter 2: Rain on the Naples Pier & A New Horizon (1966)"
 *
 * Produces 6 web-optimized H.264 masters in `public/videos/`:
 *   - chapter2-fullmotion-{en,es,ja}.mp4  (30 Google Flow clips + elastic timing + 3-layer audio)
 *   - chapter2-express-{en,es,ja}.mp4     (30 extracted hero stills + smooth Ken Burns + same 3-layer audio)
 *   - chapter2-poster.webp                (hero poster frame from Clip 06)
 */

import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const FFMPEG = join(ROOT, 'node_modules/ffmpeg-static/ffmpeg')
const BASE = join(ROOT, 'tmp/sample-chapter-2')
const BUILD = join(BASE, 'build')
const OUT_DIR = join(ROOT, 'public/videos')

type Lang = 'en' | 'es' | 'ja'
const LANGS: readonly Lang[] = ['en', 'es', 'ja']

const SCENES: readonly { id: number; music: string; clips: readonly number[] }[] = [
  { id: 1, music: 'scene1.mp3', clips: [1, 2, 3] },
  { id: 2, music: 'scene2.mp3', clips: [4, 5, 6, 7, 8, 9] },
  { id: 3, music: 'scene3.mp3', clips: [10, 11, 12, 13, 14, 15] },
  { id: 4, music: 'scene4.mp3', clips: [16, 17, 18, 19, 20] },
  { id: 5, music: 'scene5.mp3', clips: [21, 22, 23, 24, 25, 26] },
  { id: 6, music: 'scene6.mp3', clips: [27, 28, 29, 30] },
]

// Clips where on-camera dialogue audio comes from the video clip itself
const MULTILANG_DIALOGUE_CLIPS = new Set([13, 14, 19, 20])
// Scene end clips get a subtle 0.30s fade-out / next scene start gets 0.30s fade-in
const SCENE_END_CLIPS = new Set([3, 9, 15, 20, 26])
const SCENE_START_CLIPS = new Set([1, 4, 10, 16, 21, 27])

const pad2 = (n: number) => String(n).padStart(2, '0')

function runFfmpeg(args: string[], label: string) {
  try {
    execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024,
    })
  } catch (e: any) {
    const stderr = String(e.stderr || e.message || '')
    throw new Error(`ffmpeg failed [${label}]: ${stderr.slice(-1200)}`)
  }
}

function probeDuration(file: string): number {
  try {
    execFileSync(FFMPEG, ['-i', file], { stdio: 'pipe' })
  } catch (e: any) {
    const err = String(e.stderr || '')
    const m = err.match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
  }
  return 0
}

function getClipPath(clipNum: number, lang: Lang): string {
  const n = pad2(clipNum)
  if (MULTILANG_DIALOGUE_CLIPS.has(clipNum)) {
    return join(BASE, 'clips', `${n}-${lang}.mp4`)
  }
  return join(BASE, 'clips', `${n}.mp4`)
}

function usesNativeDialogue(clipNum: number, lang: Lang): boolean {
  if (MULTILANG_DIALOGUE_CLIPS.has(clipNum)) return true
  if (clipNum === 12 && lang === 'en') return true
  return false
}

function extractHeroStills() {
  const stillsDir = join(BUILD, 'stills')
  mkdirSync(stillsDir, { recursive: true })
  console.log('Extracting 30 hero stills + poster...')
  for (let i = 1; i <= 30; i++) {
    const out = join(stillsDir, `${pad2(i)}.png`)
    if (!existsSync(out)) {
      const clip = getClipPath(i, 'en')
      const seek = i === 23 ? '4.5' : i === 30 ? '2.5' : '4.0'
      runFfmpeg(['-ss', seek, '-i', clip, '-frames:v', '1', '-q:v', '2', out], `still-${i}`)
    }
  }
  // Extract crisp WebP poster from Clip 06 (Young Elena in 1966 Naples rain with notebook)
  const posterOut = join(OUT_DIR, 'chapter2-poster.webp')
  runFfmpeg(
    ['-ss', '4.2', '-i', getClipPath(6, 'en'), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '86', posterOut],
    'poster-webp'
  )
  console.log('  -> poster saved to public/videos/chapter2-poster.webp')
}

function buildLanguage(lang: Lang) {
  console.log(`\n=== Building Chapter 2 (${lang.toUpperCase()}) ===`)
  const langDir = join(BUILD, lang)
  const voDir = join(langDir, 'vo')
  const sfxDir = join(langDir, 'sfx')
  const fmDir = join(langDir, 'fm')
  const exDir = join(langDir, 'ex')
  mkdirSync(voDir, { recursive: true })
  mkdirSync(sfxDir, { recursive: true })
  mkdirSync(fmDir, { recursive: true })
  mkdirSync(exDir, { recursive: true })

  interface ShotPlan {
    clipNum: number
    dur: number
    voWav: string
    sfxWav: string
    fmMp4: string
    exMp4: string
  }

  const plans: ShotPlan[] = []
  const sceneDurations: number[] = []

  for (const scene of SCENES) {
    let sceneDur = 0
    for (const clipNum of scene.clips) {
      const n = pad2(clipNum)
      const clipPath = getClipPath(clipNum, lang)
      const clipDur = Math.min(9.96, probeDuration(clipPath) || 10.0)
      const voWav = join(voDir, `${n}.wav`)
      const sfxWav = join(sfxDir, `${n}.wav`)
      const fmMp4 = join(fmDir, `${n}.mp4`)
      const exMp4 = join(exDir, `${n}.mp4`)

      let dur = 8.0

      if (clipNum === 30) {
        // Music-only closing shot
        dur = 8.0
        runFfmpeg(
          ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', dur.toFixed(3), '-c:a', 'pcm_s16le', voWav],
          `${lang}-vo-30`
        )
        runFfmpeg(
          [
            '-i', clipPath,
            '-t', dur.toFixed(3),
            '-af', `aresample=48000,pan=stereo|c0=c0|c1=c1,highpass=f=120,volume=0.08,afade=t=out:st=${(dur - 2.5).toFixed(2)}:d=2.5`,
            '-vn', '-c:a', 'pcm_s16le', sfxWav,
          ],
          `${lang}-sfx-30`
        )
      } else if (usesNativeDialogue(clipNum, lang)) {
        // In-scene synced dialogue clip: preserve exact 1.0x timing & native synced speech
        dur = Number(clipDur.toFixed(3))
        runFfmpeg(
          [
            '-i', clipPath,
            '-t', dur.toFixed(3),
            '-af', 'aresample=48000,highpass=f=75,acompressor=threshold=-20dB:ratio=2.5:attack=15:release=180,loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=in:st=0:d=0.05,afade=t=out:st=' + (dur - 0.12).toFixed(2) + ':d=0.12',
            '-vn', '-ar', '48000', '-c:a', 'pcm_s16le', voWav,
          ],
          `${lang}-dlg-${n}`
        )
        // Silent sfx_bus since native dialogue clip already carries its natural room/deck ambience
        runFfmpeg(
          ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', dur.toFixed(3), '-c:a', 'pcm_s16le', sfxWav],
          `${lang}-sfx-dlg-${n}`
        )
      } else {
        // Separate V.O. shot (or Clip 12 dubbed in es/ja)
        const rawVo = join(BASE, 'vo', lang, `${n}.wav`)
        const trimmedVo = join(voDir, `${n}-trimmed.wav`)
        runFfmpeg(
          [
            '-i', rawVo,
            '-af',
            'aresample=48000,aformat=channel_layouts=stereo,highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=1.8,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,loudnorm=I=-16:TP=-1.5:LRA=8',
            '-c:a', 'pcm_s16le',
            trimmedVo,
          ],
          `${lang}-trim-vo-${n}`
        )
        const speechDur = probeDuration(trimmedVo)
        const leadIn = 0.35
        const tailPad = 0.55
        dur = Number(Math.max(5.8, speechDur + leadIn + tailPad).toFixed(3))

        // Pad VO cleanly to exact shot duration with lead-in delay
        const delayMs = Math.round(leadIn * 1000)
        runFfmpeg(
          [
            '-i', trimmedVo,
            '-af', `adelay=${delayMs}|${delayMs},apad=whole_dur=${dur.toFixed(3)},atrim=0:${dur.toFixed(3)}`,
            '-ar', '48000', '-c:a', 'pcm_s16le',
            voWav,
          ],
          `${lang}-pad-vo-${n}`
        )

        // Subtle clip SFX/ambience bed (mute completely on Clip 12 es/ja so EN Mateo speech doesn't bleed!)
        if (clipNum === 12) {
          runFfmpeg(
            ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', dur.toFixed(3), '-c:a', 'pcm_s16le', sfxWav],
            `${lang}-sfx-mute12`
          )
        } else {
          // Attenuate native clip audio to -17 dB (0.14) so subtle rain/foghorn/waves remain while featured orchestral score shines
          const sfxLoop = dur > clipDur ? `-stream_loop 1` : ''
          const sfxArgs = [
            ...(sfxLoop ? ['-stream_loop', '1'] : []),
            '-i', clipPath,
            '-t', dur.toFixed(3),
            '-af',
            `aresample=48000,highpass=f=130,lowpass=f=7500,volume=0.14,afade=t=in:st=0:d=0.25,afade=t=out:st=${Math.max(0.1, dur - 0.35).toFixed(2)}:d=0.35`,
            '-vn', '-c:a', 'pcm_s16le',
            sfxWav,
          ]
          runFfmpeg(sfxArgs, `${lang}-sfx-${n}`)
        }
      }

      // Render Full-Motion video segment (elastic slow-down if VO > 10s, + gentle tpad hold if > 16.5s)
      const vFilters: string[] = ['scale=1280:720:flags=lanczos', 'setsar=1']
      if (dur > clipDur) {
        const maxSlowDur = clipDur * 1.65 // down to ~0.60x buttery slow motion
        const stretchDur = Math.min(dur, maxSlowDur)
        const ptsFactor = stretchDur / clipDur
        vFilters.push(`setpts=${ptsFactor.toFixed(5)}*PTS`)
        if (dur > stretchDur + 0.04) {
          const padExtra = dur - stretchDur + 0.25
          vFilters.push(`tpad=stop_mode=clone:stop_duration=${padExtra.toFixed(3)}`)
        }
      }
      vFilters.push('fps=24')
      if (SCENE_START_CLIPS.has(clipNum)) {
        vFilters.push(`fade=t=in:st=0:d=${clipNum === 1 ? '0.60' : '0.30'}`)
      }
      if (clipNum === 30) {
        vFilters.push(`fade=t=out:st=${(dur - 2.2).toFixed(2)}:d=2.2`)
      } else if (SCENE_END_CLIPS.has(clipNum)) {
        vFilters.push(`fade=t=out:st=${(dur - 0.30).toFixed(2)}:d=0.30`)
      }

      runFfmpeg(
        [
          '-i', clipPath,
          '-t', dur.toFixed(3),
          '-vf', vFilters.join(','),
          '-an',
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '18',
          '-pix_fmt', 'yuv420p',
          fmMp4,
        ],
        `${lang}-fm-${n}`
      )

      // Render Express 4K-style Ken Burns segment from the extracted hero still (same exact duration!)
      const stillPath = join(BUILD, 'stills', `${n}.png`)
      const totalFrames = Math.max(24, Math.round(dur * 24))
      const moveType = clipNum % 4
      // Smooth subtle 6% cinema Ken Burns moves on upscaled 2x canvas for silky sub-pixel smoothness
      let zpExpr = ''
      if (moveType === 1) {
        // Gentle push-in
        zpExpr = `zoompan=z='1.0+0.06*(on/${totalFrames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=24`
      } else if (moveType === 2) {
        // Gentle pull-back
        zpExpr = `zoompan=z='1.06-0.06*(on/${totalFrames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=24`
      } else if (moveType === 3) {
        // Slow pan right at 1.06x
        zpExpr = `zoompan=z='1.06':x='(iw-iw/zoom)*(0.2+0.6*(on/${totalFrames}))':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=24`
      } else {
        // Slow pan left at 1.06x
        zpExpr = `zoompan=z='1.06':x='(iw-iw/zoom)*(0.8-0.6*(on/${totalFrames}))':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=24`
      }
      const exFilters = ['scale=1920:1080:flags=lanczos', zpExpr, 'setsar=1']
      if (SCENE_START_CLIPS.has(clipNum)) {
        exFilters.push(`fade=t=in:st=0:d=${clipNum === 1 ? '0.60' : '0.30'}`)
      }
      if (clipNum === 30) {
        exFilters.push(`fade=t=out:st=${(dur - 2.2).toFixed(2)}:d=2.2`)
      } else if (SCENE_END_CLIPS.has(clipNum)) {
        exFilters.push(`fade=t=out:st=${(dur - 0.30).toFixed(2)}:d=0.30`)
      }

      runFfmpeg(
        [
          '-loop', '1',
          '-i', stillPath,
          '-t', dur.toFixed(3),
          '-vf', exFilters.join(','),
          '-an',
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '18',
          '-pix_fmt', 'yuv420p',
          exMp4,
        ],
        `${lang}-ex-${n}`
      )

      plans.push({ clipNum, dur, voWav, sfxWav, fmMp4, exMp4 })
      sceneDur += dur
    }
    sceneDurations.push(sceneDur)
  }

  const totalDur = sceneDurations.reduce((a, b) => a + b, 0)
  console.log(
    `  Scene durations (${lang}): [${sceneDurations.map((d) => d.toFixed(1) + 's').join(', ')}] -> Total: ${(totalDur / 60).toFixed(2)} min (${totalDur.toFixed(1)}s)`
  )

  // Concatenate VO bus, SFX bus, Full-Motion video, and Express video
  const writeConcat = (name: string, files: string[]) => {
    const p = join(langDir, `${name}.txt`)
    writeFileSync(p, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n')
    return p
  }

  const voConcatList = writeConcat('vo-list', plans.map((p) => p.voWav))
  const sfxConcatList = writeConcat('sfx-list', plans.map((p) => p.sfxWav))
  const fmConcatList = writeConcat('fm-list', plans.map((p) => p.fmMp4))
  const exConcatList = writeConcat('ex-list', plans.map((p) => p.exMp4))

  const voFull = join(langDir, 'vo-bus.wav')
  const sfxFull = join(langDir, 'sfx-bus.wav')
  const fmVideoOnly = join(langDir, 'fm-video.mp4')
  const exVideoOnly = join(langDir, 'ex-video.mp4')

  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', voConcatList, '-c:a', 'pcm_s16le', voFull], `${lang}-vo-concat`)
  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', sfxConcatList, '-c:a', 'pcm_s16le', sfxFull], `${lang}-sfx-concat`)
  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', fmConcatList, '-c:v', 'copy', fmVideoOnly], `${lang}-fm-concat`)
  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', exConcatList, '-c:v', 'copy', exVideoOnly], `${lang}-ex-concat`)

  // Build 6-movement continuous crossfaded orchestral score aligned to exact scene boundaries!
  const xfade = 2.0
  const musicInputs: string[] = []
  const musicTrimFilters: string[] = []
  for (let i = 0; i < SCENES.length; i++) {
    musicInputs.push('-i', join(BASE, 'music', SCENES[i].music))
    // Add overlap compensation for acrossfade so total score matches exact scene boundaries
    const extra = (i > 0 ? xfade / 2 : 0) + (i < SCENES.length - 1 ? xfade / 2 : 0)
    const trimDur = sceneDurations[i] + extra + (i === SCENES.length - 1 ? 0.5 : 0)
    let f = `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${trimDur.toFixed(3)},asetpts=PTS-STARTPTS`
    if (i === 0) f += ',afade=t=in:st=0:d=1.2'
    if (i === SCENES.length - 1) f += `,afade=t=out:st=${Math.max(1, trimDur - 3.6).toFixed(2)}:d=3.6`
    f += `[m${i}]`
    musicTrimFilters.push(f)
  }
  const xfadeChain: string[] = []
  let prev = 'm0'
  for (let i = 1; i < SCENES.length; i++) {
    const outTag = i === SCENES.length - 1 ? 'music_all' : `mx${i}`
    xfadeChain.push(`[${prev}][m${i}]acrossfade=d=${xfade}:c1=tri:c2=tri[${outTag}]`)
    prev = outTag
  }
  const musicFull = join(langDir, 'music-bus.wav')
  runFfmpeg(
    [
      ...musicInputs,
      '-filter_complex',
      [...musicTrimFilters, ...xfadeChain, `[music_all]atrim=0:${totalDur.toFixed(3)}[mout]`].join(';'),
      '-map', '[mout]',
      '-c:a', 'pcm_s16le',
      musicFull,
    ],
    `${lang}-music-score`
  )

  // Final 3-Layer Broadcast Mix:
  // Featured orchestral score (volume=0.38) ducked smoothly by voice bus + subtle SFX bus + crystal-clear VO/Dialogue -> -14 LUFS
  const masterAudio = join(langDir, 'master-audio.m4a')
  runFfmpeg(
    [
      '-i', voFull,
      '-i', sfxFull,
      '-i', musicFull,
      '-filter_complex',
      [
        '[0:a]asplit=2[vo_mix][vo_sc]',
        '[2:a]volume=0.40[mus_base]',
        '[mus_base][vo_sc]sidechaincompress=threshold=0.025:ratio=4.5:attack=120:release=550:makeup=1[mus_duck]',
        '[vo_mix][1:a][mus_duck]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]',
      ].join(';'),
      '-map', '[aout]',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-ar', '48000',
      masterAudio,
    ],
    `${lang}-master-mix`
  )

  // Mux & web-optimize final Full-Motion & Express masters (-movflags +faststart for instant playback)
  const outFullMotion = join(OUT_DIR, `chapter2-fullmotion-${lang}.mp4`)
  const outExpress = join(OUT_DIR, `chapter2-express-${lang}.mp4`)

  runFfmpeg(
    [
      '-i', fmVideoOnly,
      '-i', masterAudio,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-maxrate', '1600k',
      '-bufsize', '3200k',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      '-shortest',
      outFullMotion,
    ],
    `${lang}-final-fullmotion`
  )

  runFfmpeg(
    [
      '-i', exVideoOnly,
      '-i', masterAudio,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-maxrate', '1400k',
      '-bufsize', '2800k',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      '-shortest',
      outExpress,
    ],
    `${lang}-final-express`
  )

  console.log(`  -> Built ${outFullMotion}`)
  console.log(`  -> Built ${outExpress}`)
}

function main() {
  mkdirSync(BUILD, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })
  extractHeroStills()
  for (const lang of LANGS) {
    buildLanguage(lang)
  }
  console.log('\nALL 6 CHAPTER 2 MASTERS + POSTER BUILT SUCCESSFULLY!')
}

main()
