#!/usr/bin/env npx tsx
/**
 * Local zero-GCP-spend broadcast assembler for Chapter 2:
 * "Letters Across the Water — Chapter 2: Rain on the Naples Pier & A New Horizon (1966)"
 *
 * Studio Audio Architecture (Zero Double-Music Clash, Zero Hallucinated Voice Bleed):
 *   - All 24 Separate V.O. clips + Clip 30 (+ Clip 12 ES/JA): Flow native audio muted so
 *     Elena (82) VO + the 6 dedicated continuous orchestral score movements play cleanly.
 *   - Clip 12 (EN): Regenerated `12-en.mp4` native synced dialogue + pure ocean wind foley,
 *     scored seamlessly by `scene3.mp3` (auto-ducked under Mateo's voice).
 *   - Clips 13–14 & 19–20 (EN/ES/JA): Verified native in-scene synced dialogue clips with
 *     their own clean accompaniment — external `music_bus` smoothly fades to 0 (-inf dB)
 *     across `[13–14]` and `[19–20]` (0.7s fade-out / 0.9s fade-in) for zero key clash!
 *
 * Produces 6 web-optimized H.264 masters in `public/videos/`:
 *   - chapter2-fullmotion-{en,es,ja}.mp4
 *   - chapter2-express-{en,es,ja}.mp4
 *   - chapter2-poster.webp
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

// Clips with multi-language native in-scene synced dialogue AND baked-in Flow accompaniment
const MULTILANG_DIALOGUE_CLIPS = new Set([13, 14, 19, 20])
const SCENE_END_CLIPS = new Set([3, 9, 15, 20, 26])
const SCENE_START_CLIPS = new Set([1, 4, 10, 16, 21, 27])

// Pass --force-video to force re-encoding all cached per-shot video segments
const FORCE_VIDEO = process.argv.includes('--force-video')

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
  if (clipNum === 12 && lang === 'en' && existsSync(join(BASE, 'clips', '12-en.mp4'))) {
    return join(BASE, 'clips', '12-en.mp4')
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
  console.log('Verifying 30 hero stills + poster...')
  for (let i = 1; i <= 30; i++) {
    const out = join(stillsDir, `${pad2(i)}.png`)
    // Always refresh Clip 12 still from regenerated 12-en.mp4
    if (!existsSync(out) || i === 12) {
      const clip = getClipPath(i, 'en')
      const seek = i === 23 ? '4.5' : i === 30 ? '2.5' : '4.0'
      runFfmpeg(['-ss', seek, '-i', clip, '-frames:v', '1', '-q:v', '2', out], `still-${i}`)
    }
  }
  const posterOut = join(OUT_DIR, 'chapter2-poster.webp')
  if (!existsSync(posterOut)) {
    runFfmpeg(
      ['-ss', '4.2', '-i', getClipPath(6, 'en'), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '86', posterOut],
      'poster-webp'
    )
  }
}

/**
 * Builds an ffmpeg `volume` expression (`eval=frame`) that smoothly dips external
 * `music_bus` to 0.0 during time windows `[start, end]` where native in-scene dialogue
 * clips (13–14 and 19–20) already carry their own baked-in musical accompaniment.
 */
function buildMusicDipExpression(windows: { start: number; end: number }[]): string {
  const fadeOut = 0.7
  const fadeIn = 0.9
  const factors = windows.map(({ start, end }) => {
    const pre = Math.max(0, start - fadeOut).toFixed(3)
    const s = start.toFixed(3)
    const e = end.toFixed(3)
    const post = (end + fadeIn).toFixed(3)
    return `if(between(t,${pre},${s}),1-(t-${pre})/${fadeOut},if(between(t,${s},${e}),0,if(between(t,${e},${post}),(t-${e})/${fadeIn},1)))`
  })
  return factors.join('*')
}

function buildLanguage(lang: Lang) {
  console.log(`\n=== Building Studio-Clean Chapter 2 (${lang.toUpperCase()}) ===`)
  const langDir = join(BUILD, lang)
  const voDir = join(langDir, 'vo')
  const fmDir = join(langDir, 'fm')
  const exDir = join(langDir, 'ex')
  mkdirSync(voDir, { recursive: true })
  mkdirSync(fmDir, { recursive: true })
  mkdirSync(exDir, { recursive: true })

  interface ShotPlan {
    clipNum: number
    start: number
    end: number
    dur: number
    voWav: string
    fmMp4: string
    exMp4: string
  }

  const plans: ShotPlan[] = []
  const sceneDurations: number[] = []
  let cursor = 0

  for (const scene of SCENES) {
    let sceneDur = 0
    for (const clipNum of scene.clips) {
      const n = pad2(clipNum)
      const clipPath = getClipPath(clipNum, lang)
      const clipDur = Math.min(9.96, probeDuration(clipPath) || 10.0)
      const voWav = join(voDir, `${n}-clean48k.wav`)
      const fmMp4 = join(fmDir, `${n}.mp4`)
      const exMp4 = join(exDir, `${n}.mp4`)

      let dur = 8.0

      if (clipNum === 30) {
        dur = 8.0
        runFfmpeg(
          ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', dur.toFixed(3), '-c:a', 'pcm_s16le', voWav],
          `${lang}-vo-30`
        )
      } else if (usesNativeDialogue(clipNum, lang)) {
        // Verified native in-scene synced dialogue clip (12[en], 13, 14, 19, 20)
        dur = Number(clipDur.toFixed(3))
        runFfmpeg(
          [
            '-i', clipPath,
            '-t', dur.toFixed(3),
            '-af',
            `aresample=48000,aformat=channel_layouts=stereo,highpass=f=75,acompressor=threshold=-20dB:ratio=2.4:attack=15:release=180,loudnorm=I=-15.5:TP=-1.5:LRA=9,aresample=48000,afade=t=in:st=0:d=0.06,afade=t=out:st=${(dur - 0.14).toFixed(2)}:d=0.14`,
            '-vn', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', voWav,
          ],
          `${lang}-dlg-${n}`
        )
      } else {
        // Separate V.O. shot (or Clip 12 ES/JA): native Flow audio muted cleanly -> zero whisper/music bleed
        const rawVo = join(BASE, 'vo', lang, `${n}.wav`)
        const trimmedVo = join(voDir, `${n}-trimmed.wav`)
        runFfmpeg(
          [
            '-i', rawVo,
            '-af',
            'aresample=48000,aformat=channel_layouts=stereo,highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=1.8,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,loudnorm=I=-15.5:TP=-1.5:LRA=8,aresample=48000',
            '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
            trimmedVo,
          ],
          `${lang}-trim-vo-${n}`
        )
        const speechDur = probeDuration(trimmedVo)
        const leadIn = 0.35
        const tailPad = 0.55
        dur = Number(Math.max(5.8, speechDur + leadIn + tailPad).toFixed(3))
        const delayMs = Math.round(leadIn * 1000)
        runFfmpeg(
          [
            '-i', trimmedVo,
            '-af', `adelay=${delayMs}|${delayMs},apad=whole_dur=${dur.toFixed(3)},atrim=0:${dur.toFixed(3)}`,
            '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
            voWav,
          ],
          `${lang}-pad-vo-${n}`
        )
      }

      // Check if we need to (re)render FM / EX video segment
      const mustRebuildClip =
        FORCE_VIDEO ||
        (clipNum === 12 && lang === 'en') ||
        (dur > 16.5) ||
        !existsSync(fmMp4) ||
        Math.abs(probeDuration(fmMp4) - dur) > 0.15

      if (mustRebuildClip) {
        const vFilters: string[] = ['scale=1280:720:flags=lanczos', 'setsar=1']
        if (dur > clipDur) {
          // Smooth elastic slow-down up to 2.15x (eliminates frozen frames even on longest JA shots)
          const maxSlowDur = clipDur * 2.15
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
      }

      const mustRebuildEx =
        FORCE_VIDEO ||
        clipNum === 12 ||
        !existsSync(exMp4) ||
        Math.abs(probeDuration(exMp4) - dur) > 0.15

      if (mustRebuildEx) {
        const stillPath = join(BUILD, 'stills', `${n}.png`)
        const totalFrames = Math.max(24, Math.round(dur * 24))
        const moveType = clipNum % 4
        let zpExpr = ''
        if (moveType === 1) {
          zpExpr = `zoompan=z='1.0+0.06*(on/${totalFrames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=24`
        } else if (moveType === 2) {
          zpExpr = `zoompan=z='1.06-0.06*(on/${totalFrames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=24`
        } else if (moveType === 3) {
          zpExpr = `zoompan=z='1.06':x='(iw-iw/zoom)*(0.2+0.6*(on/${totalFrames}))':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=24`
        } else {
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
      }

      plans.push({ clipNum, start: cursor, end: cursor + dur, dur, voWav, fmMp4, exMp4 })
      cursor += dur
      sceneDur += dur
    }
    sceneDurations.push(sceneDur)
  }

  const totalDur = sceneDurations.reduce((a, b) => a + b, 0)
  const p13 = plans.find((p) => p.clipNum === 13)!
  const p14 = plans.find((p) => p.clipNum === 14)!
  const p19 = plans.find((p) => p.clipNum === 19)!
  const p20 = plans.find((p) => p.clipNum === 20)!
  const dipWindows = [
    { start: p13.start, end: p14.end },
    { start: p19.start, end: p20.end },
  ]
  console.log(
    `  Total (${lang}): ${(totalDur / 60).toFixed(2)}m (${totalDur.toFixed(1)}s) · Music dip windows for native-scored dialogue: [${p13.start.toFixed(1)}-${p14.end.toFixed(1)}s], [${p19.start.toFixed(1)}-${p20.end.toFixed(1)}s]`
  )

  const writeConcat = (name: string, files: string[]) => {
    const p = join(langDir, `${name}.txt`)
    writeFileSync(p, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n')
    return p
  }

  const voConcatList = writeConcat('vo-list-clean', plans.map((p) => p.voWav))
  const fmConcatList = writeConcat('fm-list-clean', plans.map((p) => p.fmMp4))
  const exConcatList = writeConcat('ex-list-clean', plans.map((p) => p.exMp4))

  const voFull = join(langDir, 'vo-bus-clean.wav')
  const fmVideoOnly = join(langDir, 'fm-video-clean.mp4')
  const exVideoOnly = join(langDir, 'ex-video-clean.mp4')

  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', voConcatList, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', voFull], `${lang}-vo-concat`)
  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', fmConcatList, '-c:v', 'copy', fmVideoOnly], `${lang}-fm-concat`)
  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', exConcatList, '-c:v', 'copy', exVideoOnly], `${lang}-ex-concat`)

  // 6-Movement continuous crossfaded orchestral score
  const xfade = 2.0
  const musicInputs: string[] = []
  const musicTrimFilters: string[] = []
  for (let i = 0; i < SCENES.length; i++) {
    musicInputs.push('-i', join(BASE, 'music', SCENES[i].music))
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
  const musicFull = join(langDir, 'music-bus-clean.wav')
  const dipExpr = buildMusicDipExpression(dipWindows)
  runFfmpeg(
    [
      ...musicInputs,
      '-filter_complex',
      [
        ...musicTrimFilters,
        ...xfadeChain,
        `[music_all]atrim=0:${totalDur.toFixed(3)},volume='${dipExpr}':eval=frame[mout]`,
      ].join(';'),
      '-map', '[mout]',
      '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
      musicFull,
    ],
    `${lang}-music-score`
  )

  // Clean 2-Bus Broadcast Mix: Crystal-clear Speech/Dialogue + Clash-Free Featured Orchestral Score -> -14 LUFS
  const masterAudio = join(langDir, 'master-audio-clean.m4a')
  runFfmpeg(
    [
      '-i', voFull,
      '-i', musicFull,
      '-filter_complex',
      [
        '[0:a]asplit=2[vo_mix][vo_sc]',
        '[1:a]volume=0.42[mus_base]',
        '[mus_base][vo_sc]sidechaincompress=threshold=0.025:ratio=4.5:attack=120:release=550:makeup=1[mus_duck]',
        '[vo_mix][mus_duck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]',
      ].join(';'),
      '-map', '[aout]',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-ar', '48000',
      masterAudio,
    ],
    `${lang}-master-mix`
  )

  // Mux & web-optimize final Full-Motion & Express masters
  const outFullMotion = join(OUT_DIR, `chapter2-fullmotion-${lang}.mp4`)
  const outExpress = join(OUT_DIR, `chapter2-express-${lang}.mp4`)

  runFfmpeg(
    [
      '-i', fmVideoOnly,
      '-i', masterAudio,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-maxrate', '1500k',
      '-bufsize', '3000k',
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
      '-maxrate', '1350k',
      '-bufsize', '2700k',
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
  console.log('\nALL 6 STUDIO-CLEAN CHAPTER 2 MASTERS REBUILT SUCCESSFULLY!')
}

main()
