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
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas'

const ROOT = process.cwd()
const FFMPEG = join(ROOT, 'node_modules/ffmpeg-static/ffmpeg')
const BASE = join(ROOT, 'tmp/sample-chapter-2')
const BUILD = join(BASE, 'build')
const OUT_DIR = join(ROOT, 'public/videos')

type Lang = 'en' | 'es' | 'ja'
const LANGS: readonly Lang[] = ['en', 'es', 'ja']

const CLIP30_DURATION_SEC = 13.5

interface NextChapterCardItem {
  tag: string
  title: string
  meta: string
}

interface Clip30OverlayCopy {
  card1Eyebrow: string
  card1Title: string
  card1Subtitle: string
  card2Eyebrow: string
  card2Chapters: readonly [
    NextChapterCardItem,
    NextChapterCardItem,
    NextChapterCardItem,
    NextChapterCardItem,
  ]
  card2Footer: string
  card3Eyebrow: string
  card3Title: string
}

const CLIP30_TITLE_COPY: Record<Lang, Clip30OverlayCopy> = {
  en: {
    card1Eyebrow: 'END OF CHAPTER 2 OF 6',
    card1Title: 'Letters Across the Water',
    card1Subtitle: 'A 68-Minute 4K Feature Film  ·  or  6-Episode Series',
    card2Eyebrow: 'THE STORY CONTINUES  —  NEXT CHAPTERS',
    card2Chapters: [
      {
        tag: 'CHAPTER 3  ·  1974',
        title: 'First Winter at the Corner Brick Oven',
        meta: '11.5 min  ·  22:30 – 34:00',
      },
      {
        tag: 'CHAPTER 4  ·  1978',
        title: 'The Night the Neighborhood Saved the Bakery',
        meta: '11.5 min  ·  34:00 – 45:30',
      },
      {
        tag: 'CHAPTER 5  ·  1994–2012',
        title: 'Graduations, Weddings & Sunday Tables',
        meta: '11.0 min  ·  45:30 – 56:30',
      },
      {
        tag: 'CHAPTER 6  ·  TODAY',
        title: 'The 80th Reunion & The Recipe Passed Forward',
        meta: '11.5 min  ·  56:30 – 68:00',
      },
    ],
    card2Footer: 'Same Age-Locked Cast  ·  Same Heirloom Props  ·  68 Minutes of Continuous 4K Cinema',
    card3Eyebrow: 'ONLY ONE CHAPTER OF A 1-HOUR+ STORY',
    card3Title: 'Explore All 6 Chapters in the Interactive Blueprint',
  },
  es: {
    card1Eyebrow: 'FIN DEL CAPÍTULO 2 DE 6',
    card1Title: 'Cartas a Través del Agua',
    card1Subtitle: 'Largometraje 4K de 68 Minutos  ·  o  Serie de 6 Episodios',
    card2Eyebrow: 'LA HISTORIA CONTINÚA  —  PRÓXIMOS CAPÍTULOS',
    card2Chapters: [
      {
        tag: 'CAPÍTULO 3  ·  1974',
        title: 'Primer invierno en el horno de ladrillo de la esquina',
        meta: '11,5 min  ·  22:30 – 34:00',
      },
      {
        tag: 'CAPÍTULO 4  ·  1978',
        title: 'La noche en que el barrio salvó la panadería',
        meta: '11,5 min  ·  34:00 – 45:30',
      },
      {
        tag: 'CAPÍTULO 5  ·  1994–2012',
        title: 'Graduaciones, bodas y mesas de domingo',
        meta: '11,0 min  ·  45:30 – 56:30',
      },
      {
        tag: 'CAPÍTULO 6  ·  HOY',
        title: 'La reunión de los 80 años y la receta heredada',
        meta: '11,5 min  ·  56:30 – 68:00',
      },
    ],
    card2Footer: 'Mismo elenco con edad fiel  ·  Mismas reliquias  ·  68 minutos de cine 4K continuo',
    card3Eyebrow: 'SOLO UN CAPÍTULO DE UNA HISTORIA DE 1 HORA+',
    card3Title: 'Explora los 6 capítulos en el plano interactivo',
  },
  ja: {
    card1Eyebrow: '全6章 · 第2章 完',
    card1Title: '海を越えた手紙',
    card1Subtitle: '全68分 4K長編映画  ·  または  全6話シリーズ',
    card2Eyebrow: '物語は続く  —  これからのチャプター',
    card2Chapters: [
      {
        tag: '第3章  ·  1974年',
        title: '角のレンガ窯で迎えた最初の冬',
        meta: '11.5分  ·  22:30 – 34:00',
      },
      {
        tag: '第4章  ·  1978年',
        title: '街のみんながベーカリーを救った夜',
        meta: '11.5分  ·  34:00 – 45:30',
      },
      {
        tag: '第5章  ·  1994〜2012年',
        title: '卒業式、結婚式、そして日曜の食卓',
        meta: '11.0分  ·  45:30 – 56:30',
      },
      {
        tag: '第6章  ·  現在',
        title: '80歳の再会と次世代へ手渡すレシピ',
        meta: '11.5分  ·  56:30 – 68:00',
      },
    ],
    card2Footer: '年齢一貫キャスト  ·  受け継ぐ家宝  ·  途切れない全68分の4Kシネマ',
    card3Eyebrow: '1時間超の物語の、ほんの1章',
    card3Title: '全6章の構成をインタラクティブ設計図でご覧ください',
  },
}

let fontsRegistered = false
function registerOverlayFonts() {
  if (fontsRegistered) return
  fontsRegistered = true
  const pairs: readonly [string, string][] = [
    ['/System/Library/Fonts/Supplemental/Georgia.ttf', 'SFGeorgia'],
    ['/System/Library/Fonts/Supplemental/Georgia Bold.ttf', 'SFGeorgiaBold'],
    ['/System/Library/Fonts/Avenir Next.ttc', 'SFAvenir'],
    ['/System/Library/Fonts/ヒラギノ明朝 ProN.ttc', 'SFMincho'],
    ['/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc', 'SFGothicBold'],
    ['/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc', 'SFGothic'],
  ]
  for (const [fontPath, alias] of pairs) {
    if (existsSync(fontPath)) {
      GlobalFonts.registerFromPath(fontPath, alias)
    }
  }
}

function drawRoundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapTextLines(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  isCjk: boolean
): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text]
  const tokens = isCjk ? Array.from(text) : text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const token of tokens) {
    const candidate = current ? (isCjk ? current + token : `${current} ${token}`) : token
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = token
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 2)
}

function drawTrackedCenteredText(
  ctx: SKRSContext2D,
  text: string,
  cx: number,
  y: number,
  trackingPx: number
) {
  if (trackingPx <= 0) {
    ctx.textAlign = 'center'
    ctx.fillText(text, cx, y)
    return
  }
  const chars = Array.from(text)
  const widths = chars.map((ch) => ctx.measureText(ch).width)
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + trackingPx * Math.max(0, chars.length - 1)
  let x = cx - totalWidth / 2
  ctx.textAlign = 'left'
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y)
    x += widths[i] + trackingPx
  }
}

function renderClip30TitleCards(lang: Lang, outDir: string): [string, string, string] {
  registerOverlayFonts()
  mkdirSync(outDir, { recursive: true })
  const copy = CLIP30_TITLE_COPY[lang]
  const isJa = lang === 'ja'
  const serifFont = isJa ? 'SFMincho, Hiragino Mincho ProN, serif' : 'SFGeorgia, Georgia, serif'
  const sansFont = isJa ? 'SFGothicBold, Hiragino Sans, sans-serif' : 'SFAvenir, Helvetica Neue, sans-serif'
  const sansLight = isJa ? 'SFGothic, Hiragino Sans, sans-serif' : 'SFAvenir, Helvetica Neue, sans-serif'

  const W = 1280
  const H = 720

  // --- CARD 1: End of Chapter 2 of 6 (framed cleanly in upper third above the sunlit journal) ---
  const card1Path = join(outDir, 'clip30-card1.png')
  {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    const topGrad = ctx.createLinearGradient(0, 0, 0, 390)
    topGrad.addColorStop(0, 'rgba(6, 9, 16, 0.78)')
    topGrad.addColorStop(0.68, 'rgba(6, 9, 16, 0.42)')
    topGrad.addColorStop(1, 'rgba(6, 9, 16, 0.0)')
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, W, 390)

    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 2

    // Gold eyebrow
    ctx.font = `700 17px ${sansFont}`
    ctx.fillStyle = '#F0CB92'
    drawTrackedCenteredText(ctx, copy.card1Eyebrow, W / 2, 92, isJa ? 4 : 3.5)

    // Main film title
    ctx.font = `600 ${isJa ? 48 : 50}px ${serifFont}`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText(copy.card1Title, W / 2, 152)

    // Gold hairline divider
    ctx.shadowBlur = 0
    const ruleGrad = ctx.createLinearGradient(W / 2 - 140, 0, W / 2 + 140, 0)
    ruleGrad.addColorStop(0, 'rgba(223, 180, 115, 0)')
    ruleGrad.addColorStop(0.5, 'rgba(223, 180, 115, 0.9)')
    ruleGrad.addColorStop(1, 'rgba(223, 180, 115, 0)')
    ctx.fillStyle = ruleGrad
    ctx.fillRect(W / 2 - 140, 194, 280, 1.5)

    // Subtitle
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.shadowBlur = 12
    ctx.font = `500 21px ${sansLight}`
    ctx.fillStyle = '#E5E7EB'
    ctx.textAlign = 'center'
    ctx.fillText(copy.card1Subtitle, W / 2, 228)

    writeFileSync(card1Path, canvas.toBuffer('image/png'))
  }

  // --- CARD 2: Upcoming Chapters 3–6 Grid (cinema scrim + 2x2 prestige editorial cards) ---
  const card2Path = join(outDir, 'clip30-card2.png')
  {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 760)
    bgGrad.addColorStop(0, 'rgba(7, 10, 18, 0.72)')
    bgGrad.addColorStop(1, 'rgba(5, 7, 13, 0.86)')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 2

    // Eyebrow
    ctx.font = `700 18px ${sansFont}`
    ctx.fillStyle = '#F0CB92'
    drawTrackedCenteredText(ctx, copy.card2Eyebrow, W / 2, 78, isJa ? 4 : 3.2)

    // Divider
    ctx.shadowBlur = 0
    const ruleGrad = ctx.createLinearGradient(W / 2 - 180, 0, W / 2 + 180, 0)
    ruleGrad.addColorStop(0, 'rgba(223, 180, 115, 0)')
    ruleGrad.addColorStop(0.5, 'rgba(223, 180, 115, 0.85)')
    ruleGrad.addColorStop(1, 'rgba(223, 180, 115, 0)')
    ctx.fillStyle = ruleGrad
    ctx.fillRect(W / 2 - 180, 108, 360, 1.5)

    // 2x2 Chapter Cards
    const cardW = 532
    const cardH = 176
    const gapX = 28
    const gapY = 24
    const startX = (W - (cardW * 2 + gapX)) / 2
    const startY = 140

    copy.card2Chapters.forEach((ch, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const x = startX + col * (cardW + gapX)
      const y = startY + row * (cardH + gapY)

      // Card fill
      drawRoundedRect(ctx, x, y, cardW, cardH, 16)
      const cardGrad = ctx.createLinearGradient(x, y, x + cardW, y + cardH)
      cardGrad.addColorStop(0, 'rgba(15, 22, 38, 0.88)')
      cardGrad.addColorStop(1, 'rgba(9, 13, 24, 0.92)')
      ctx.fillStyle = cardGrad
      ctx.fill()

      // Gold border
      ctx.lineWidth = 1.5
      ctx.strokeStyle = 'rgba(223, 180, 115, 0.42)'
      ctx.stroke()

      // Subtle left accent bar
      drawRoundedRect(ctx, x + 20, y + 26, 3.5, cardH - 52, 2)
      ctx.fillStyle = '#DFB473'
      ctx.fill()

      // Tag (CHAPTER X · YEAR)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.font = `700 15px ${sansFont}`
      ctx.fillStyle = '#F0CB92'
      ctx.fillText(ch.tag, x + 38, y + 26)

      // Chapter Title (wrapped up to 2 lines)
      ctx.font = `600 ${isJa ? 24 : 25}px ${serifFont}`
      ctx.fillStyle = '#FFFFFF'
      const lines = wrapTextLines(ctx, ch.title, cardW - 64, isJa)
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, x + 38, y + 58 + lIdx * 34)
      })

      // Runtime / timecode meta
      ctx.font = `500 14px ${sansLight}`
      ctx.fillStyle = '#94A3B8'
      ctx.fillText(ch.meta, x + 38, y + cardH - 36)
    })

    // Bottom continuity tagline (aligned left-center safely away from bottom-right SceneFlow watermark)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.shadowBlur = 10
    ctx.font = `600 17px ${sansLight}`
    ctx.fillStyle = '#CBD5E1'
    ctx.fillText(copy.card2Footer, W / 2 - 36, 594)

    writeFileSync(card2Path, canvas.toBuffer('image/png'))
  }

  // --- CARD 3: Prestige Closing Tag (fades into final fade-to-black) ---
  const card3Path = join(outDir, 'clip30-card3.png')
  {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    const veil = ctx.createLinearGradient(0, 0, 0, H)
    veil.addColorStop(0, 'rgba(6, 9, 16, 0.72)')
    veil.addColorStop(0.55, 'rgba(6, 9, 16, 0.45)')
    veil.addColorStop(1, 'rgba(6, 9, 16, 0.18)')
    ctx.fillStyle = veil
    ctx.fillRect(0, 0, W, H)

    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 2

    ctx.font = `700 17px ${sansFont}`
    ctx.fillStyle = '#F0CB92'
    drawTrackedCenteredText(ctx, copy.card3Eyebrow, W / 2, 148, isJa ? 4 : 3.2)

    ctx.font = `600 ${isJa ? 34 : 38}px ${serifFont}`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText(copy.card3Title, W / 2, 204)

    ctx.shadowBlur = 0
    const ruleGrad = ctx.createLinearGradient(W / 2 - 120, 0, W / 2 + 120, 0)
    ruleGrad.addColorStop(0, 'rgba(223, 180, 115, 0)')
    ruleGrad.addColorStop(0.5, 'rgba(223, 180, 115, 0.85)')
    ruleGrad.addColorStop(1, 'rgba(223, 180, 115, 0)')
    ctx.fillStyle = ruleGrad
    ctx.fillRect(W / 2 - 120, 244, 240, 1.5)

    writeFileSync(card3Path, canvas.toBuffer('image/png'))
  }

  return [card1Path, card2Path, card3Path]
}

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
        dur = CLIP30_DURATION_SEC
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

      // Clip 30 carries the localized 3-card "Next Chapters (Ch. 3–6)" cinema title sequence overlay
      if (clipNum === 30) {
        const overlayDir = join(langDir, 'overlays')
        const [card1Png, card2Png, card3Png] = renderClip30TitleCards(lang, overlayDir)
        const durStr = dur.toFixed(3)
        const ptsFactor = (dur / clipDur).toFixed(5)
        const fadeOutStart = (dur - 1.6).toFixed(2)

        const overlayChain = [
          `[1:v]format=rgba,fade=t=in:st=0.45:d=0.70:alpha=1,fade=t=out:st=3.50:d=0.65:alpha=1[c1]`,
          `[2:v]format=rgba,fade=t=in:st=4.35:d=0.70:alpha=1,fade=t=out:st=9.90:d=0.70:alpha=1[c2]`,
          `[3:v]format=rgba,fade=t=in:st=10.75:d=0.55:alpha=1[c3]`,
          `[base][c1]overlay=0:0:shortest=1[v1]`,
          `[v1][c2]overlay=0:0:shortest=1[v2]`,
          `[v2][c3]overlay=0:0:shortest=1,fade=t=out:st=${fadeOutStart}:d=1.60[vout]`,
        ]

        // Full-Motion Clip 30 with gentle 1.35x dreamlike slow-motion + Next Chapters Title Sequence
        runFfmpeg(
          [
            '-i', clipPath,
            '-loop', '1', '-t', durStr, '-i', card1Png,
            '-loop', '1', '-t', durStr, '-i', card2Png,
            '-loop', '1', '-t', durStr, '-i', card3Png,
            '-filter_complex',
            [
              `[0:v]scale=1280:720:flags=lanczos,setsar=1,setpts=${ptsFactor}*PTS,fps=24,trim=0:${durStr},setpts=PTS-STARTPTS[base]`,
              ...overlayChain,
            ].join(';'),
            '-map', '[vout]',
            '-t', durStr,
            '-an',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '18',
            '-pix_fmt', 'yuv420p',
            fmMp4,
          ],
          `${lang}-fm-30-titles`
        )

        // Express 4K Clip 30 with subtle zoom-out still + identical Next Chapters Title Sequence
        const stillPath = join(BUILD, 'stills', `${n}.png`)
        const totalFrames = Math.max(24, Math.round(dur * 24))
        const zpExpr = `zoompan=z='1.06-0.06*(on/${totalFrames})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=24`
        runFfmpeg(
          [
            '-loop', '1', '-t', durStr, '-i', stillPath,
            '-loop', '1', '-t', durStr, '-i', card1Png,
            '-loop', '1', '-t', durStr, '-i', card2Png,
            '-loop', '1', '-t', durStr, '-i', card3Png,
            '-filter_complex',
            [
              `[0:v]scale=1920:1080:flags=lanczos,${zpExpr},setsar=1,trim=0:${durStr},setpts=PTS-STARTPTS[base]`,
              ...overlayChain,
            ].join(';'),
            '-map', '[vout]',
            '-t', durStr,
            '-an',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '18',
            '-pix_fmt', 'yuv420p',
            exMp4,
          ],
          `${lang}-ex-30-titles`
        )

        // Export QA preview frames for all 3 title cards
        const qaDir = join(BASE, 'qa')
        mkdirSync(qaDir, { recursive: true })
        for (const [label, ts] of [
          ['card1', '2.0'],
          ['card2', '7.0'],
          ['card3', '11.5'],
        ] as const) {
          runFfmpeg(
            ['-ss', ts, '-i', fmMp4, '-frames:v', '1', '-q:v', '2', join(qaDir, `clip30-${lang}-${label}.png`)],
            `${lang}-qa-${label}`
          )
        }
      } else {
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
          if (SCENE_END_CLIPS.has(clipNum)) {
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
          if (SCENE_END_CLIPS.has(clipNum)) {
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
