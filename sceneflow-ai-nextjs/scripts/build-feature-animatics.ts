#!/usr/bin/env npx tsx
/**
 * Stage 2 (100% Local / Sandbox-Safe):
 * Builds all 8 Studio Suite Animatic Films across 7 languages (`56` `.webm` + `56` `.mp4`
 * + `8` `-poster.webp` in `public/landing/key-features/animatics/`) at **1920×1080, 30 fps**
 * using a 4-ROI cubic ease-in-out pan + zoom camera choreography:
 *
 *   Hold ROI 1 (>=3.0s) -> Cubic Ease-In-Out Pan+Zoom (1.5s)
 *   -> Hold ROI 2 (>=3.0s) -> Cubic Ease-In-Out Pan+Zoom (1.5s)
 *   -> Hold ROI 3 (>=3.0s) -> Cubic Ease-In-Out Pan+Zoom (1.5s)
 *   -> Hold ROI 4 (>=3.0s)
 *
 * Writes the frame-accurate (`30 fps`) chapter & beat timestamp manifest to
 * `src/config/landing/keyFeatureAnimaticsManifest.ts`.
 *
 * Usage:
 *   npx tsx scripts/build-feature-animatics.ts --force
 *   npx tsx scripts/build-feature-animatics.ts --suite keyframes-clips-flowdirector --locale en --force
 */

import { spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'
import sharp from 'sharp'
import {
  KEY_FEATURE_SUITES,
  type FeatureAnimaticChapterTiming,
  type FeatureAnimaticSuiteManifest,
  type KeyFeatureSuiteId,
} from '../src/config/landing/keyFeatureAnimatics'
import {
  KEY_FEATURE_NARRATED_PAN,
  type FeaturePanLocaleId,
} from '../src/config/landing/keyFeatureNarratedPan'
import {
  KEY_FEATURE_SCREENSHOTS,
  MULTILANGUAGE_UI_AR_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_ES_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_HI_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_PT_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_TH_SCREENSHOT_WEBP,
  MULTILANGUAGE_UI_ZH_SCREENSHOT_WEBP,
  SCRIPT_SUPERVISOR_SCREENSHOT_WEBP,
  keyFeatureScreenshotSrc,
} from '../src/config/landing/keyFeatureScreenshots'

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

const W = 1920
const H = 1080
const FPS = 30
const SR = 48000

const MIN_HOLD_SEC = 3.0
const TRANS_SEC = 1.5
const TRANS_FRAMES = Math.round(TRANS_SEC * FPS) // 45 frames @ 30fps
const HOLD_CHUNK_3S_FRAMES = 90 // 3.0s self-contained GOP chunk (1 keyframe per 3s!)
const HOLD_CHUNK_1S_FRAMES = 30 // 1.0s self-contained GOP chunk for fine duration matching

const LEAD_IN_SEC = 0.4
const TAIL_PAD_SEC = 0.55

const TARGET_VO_RMS = 0.188
const TARGET_MUSIC_BED_RMS = 0.125
const MUSIC_GAIN_IDLE = 0.22
const MUSIC_GAIN_DUCKED = 0.085

interface StereoPcm {
  L: Float64Array
  R: Float64Array
  durationSec: number
}

/** Normalized Region of Interest `[cxFrac, cyFrac, widthFrac]` in `[0..1]` source coords. */
interface NormalizedRoi {
  cxFrac: number
  cyFrac: number
  widthFrac: number
}

interface CameraState {
  cx: number
  cy: number
  scale: number
}

interface CachedFeatureSegments {
  posterPng: string
  hold3sMp4: [string, string, string, string]
  hold1sMp4: [string, string, string, string]
  hold3sWebm: [string, string, string, string]
  hold1sWebm: [string, string, string, string]
  transMp4: [string, string, string]
  transWebm: [string, string, string]
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const suiteArg = get('--suite')
  const localeArg = get('--locale')
  const suites = suiteArg
    ? KEY_FEATURE_SUITES.filter((s) => suiteArg.split(',').includes(s.id))
    : [...KEY_FEATURE_SUITES]
  const locales = localeArg
    ? (localeArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as FeaturePanLocaleId[])
    : [...ALL_LOCALES]
  return {
    suites,
    locales,
    force: argv.includes('--force'),
    regenOutputs: argv.includes('--force') || argv.includes('--regen-outputs'),
  }
}

function runFfmpeg(args: string[], label: string) {
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (res.status !== 0) {
    throw new Error(`FFmpeg failed (${label}):\n${(res.stderr || '').slice(-1800)}`)
  }
  return res
}

function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Defines 4 Rectangular Regions of Interest (ROIs) tailored to each screenshot's
 * aspect ratio and UI panel layout so every ROI fills the 1920×1080 16:9 frame
 * with large, crisp, legible typography.
 */
function getFourRoisForFeature(
  icon: string,
  srcW: number,
  srcH: number
): [NormalizedRoi, NormalizedRoi, NormalizedRoi, NormalizedRoi] {
  if (icon === 'blueprintResonance') {
    // Tall page with right-hand Audience Resonance drawer (94/100 + Score Breakdown) + left Cast/Locations
    return [
      { cxFrac: 0.78, cyFrac: 0.13, widthFrac: 0.44 },
      { cxFrac: 0.78, cyFrac: 0.31, widthFrac: 0.44 },
      { cxFrac: 0.37, cyFrac: 0.2, widthFrac: 0.52 },
      { cxFrac: 0.37, cyFrac: 0.58, widthFrac: 0.52 },
    ]
  }

  if (icon === 'scriptSupervisor') {
    // FlowDirector (5120x3967): AR 86 + Director 81 -> Perspective Breakdown -> Shot-by-Shot Compliance -> 1-Click Pickups
    return [
      { cxFrac: 0.34, cyFrac: 0.24, widthFrac: 0.64 },
      { cxFrac: 0.68, cyFrac: 0.24, widthFrac: 0.62 },
      { cxFrac: 0.64, cyFrac: 0.56, widthFrac: 0.66 },
      { cxFrac: 0.5, cyFrac: 0.86, widthFrac: 0.72 },
    ]
  }

  const aspectHOverW = srcH / srcW
  if (aspectHOverW > 1.05) {
    // Tall centered-column pages (`blueprint-beats.webp`, `blueprint-cast.webp`, `startEpisode` if tall)
    return [
      { cxFrac: 0.5, cyFrac: 0.15, widthFrac: 0.54 },
      { cxFrac: 0.5, cyFrac: 0.38, widthFrac: 0.54 },
      { cxFrac: 0.5, cyFrac: 0.62, widthFrac: 0.54 },
      { cxFrac: 0.5, cyFrac: 0.85, widthFrac: 0.54 },
    ]
  }

  // Standard 16:9 / wide 2-column Studio screens (5120x2880, 5120x2936, 2560x1440):
  // Section 1 (Top-Left) -> Section 2 (Bottom-Left) -> Section 3 (Top-Right) -> Section 4 (Bottom-Right)
  return [
    { cxFrac: 0.29, cyFrac: 0.33, widthFrac: 0.56 },
    { cxFrac: 0.29, cyFrac: 0.69, widthFrac: 0.56 },
    { cxFrac: 0.71, cyFrac: 0.35, widthFrac: 0.56 },
    { cxFrac: 0.71, cyFrac: 0.7, widthFrac: 0.56 },
  ]
}

function resolveCameraState(roi: NormalizedRoi, srcW: number, srcH: number): CameraState {
  const desiredW = Math.min(srcW, Math.max(W * 0.4, roi.widthFrac * srcW))
  const clampedH = Math.min(srcH, desiredW * (H / W))
  const finalW = clampedH * (W / H)
  const scale = W / finalW
  const halfW = finalW * 0.5
  const halfH = clampedH * 0.5
  const cx = Math.max(halfW, Math.min(srcW - halfW, roi.cxFrac * srcW))
  const cy = Math.max(halfH, Math.min(srcH - halfH, roi.cyFrac * srcH))
  return { cx, cy, scale }
}

/**
 * Sub-pixel floating-point bilinear sampler into `1920×1080` RGB24 buffer.
 * Precomputing horizontal weights reduces inner-loop math so each 1080p frame renders in ~10ms.
 */
function sampleFrameBilinear(
  srcRgb: Buffer,
  srcW: number,
  srcH: number,
  cx: number,
  cy: number,
  scale: number,
  outBuf: Buffer
) {
  const invScale = 1 / scale
  const halfW = W * 0.5
  const halfH = H * 0.5
  const maxX = srcW - 1.001
  const maxY = srcH - 1.001

  const x0Arr = new Int32Array(W)
  const wxArr = new Float32Array(W)
  for (let ox = 0; ox < W; ox++) {
    let sx = cx + (ox - halfW + 0.5) * invScale - 0.5
    if (sx < 0) sx = 0
    else if (sx > maxX) sx = maxX
    const ix = sx | 0
    x0Arr[ox] = ix * 3
    wxArr[ox] = sx - ix
  }

  const rowStride = srcW * 3
  let outOffset = 0
  for (let oy = 0; oy < H; oy++) {
    let sy = cy + (oy - halfH + 0.5) * invScale - 0.5
    if (sy < 0) sy = 0
    else if (sy > maxY) sy = maxY
    const iy = sy | 0
    const wy = sy - iy
    const wy0 = 1 - wy
    const r0 = iy * rowStride
    const r1 = r0 + rowStride

    for (let ox = 0; ox < W; ox++) {
      const c0 = x0Arr[ox]!
      const wx = wxArr[ox]!
      const wx0 = 1 - wx

      const w00 = wx0 * wy0
      const w10 = wx * wy0
      const w01 = wx0 * wy
      const w11 = wx * wy

      const i00 = r0 + c0
      const i10 = i00 + 3
      const i01 = r1 + c0
      const i11 = i01 + 3

      outBuf[outOffset] =
        srcRgb[i00]! * w00 + srcRgb[i10]! * w10 + srcRgb[i01]! * w01 + srcRgb[i11]! * w11
      outBuf[outOffset + 1] =
        srcRgb[i00 + 1]! * w00 +
        srcRgb[i10 + 1]! * w10 +
        srcRgb[i01 + 1]! * w01 +
        srcRgb[i11 + 1]! * w11
      outBuf[outOffset + 2] =
        srcRgb[i00 + 2]! * w00 +
        srcRgb[i10 + 2]! * w10 +
        srcRgb[i01 + 2]! * w01 +
        srcRgb[i11 + 2]! * w11
      outOffset += 3
    }
  }
}

interface WatermarkPatch {
  left: number
  top: number
  width: number
  height: number
  rgba: Buffer
}

let cachedWatermarkPatch: WatermarkPatch | null = null

async function getWatermarkPatch(): Promise<WatermarkPatch> {
  if (cachedWatermarkPatch) return cachedWatermarkPatch
  const pw = 236
  const ph = 42
  const svg = Buffer.from(
    `<svg width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="${pw - 4}" height="${ph - 4}" rx="19" fill="#020617" fill-opacity="0.82" stroke="#334155" stroke-width="1.5"/>
      <circle cx="24" cy="${ph / 2}" r="5.5" fill="#10b981"/>
      <text x="38" y="${ph / 2 + 5}" fill="#f1f5f9" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif" font-size="15.5" font-weight="700">SceneFlow Studio</text>
    </svg>`
  )
  const { data } = await sharp(svg).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  cachedWatermarkPatch = {
    left: W - pw - 22,
    top: H - ph - 18,
    width: pw,
    height: ph,
    rgba: data,
  }
  return cachedWatermarkPatch
}

function blendWatermarkInPlace(rgbFrame: Buffer, patch: WatermarkPatch) {
  const { left, top, width, height, rgba } = patch
  for (let py = 0; py < height; py++) {
    const dstY = top + py
    if (dstY < 0 || dstY >= H) continue
    let srcIdx = py * width * 4
    let dstIdx = (dstY * W + left) * 3
    for (let px = 0; px < width; px++) {
      const a = rgba[srcIdx + 3]! / 255
      if (a > 0) {
        const invA = 1 - a
        rgbFrame[dstIdx] = rgba[srcIdx]! * a + rgbFrame[dstIdx]! * invA
        rgbFrame[dstIdx + 1] = rgba[srcIdx + 1]! * a + rgbFrame[dstIdx + 1]! * invA
        rgbFrame[dstIdx + 2] = rgba[srcIdx + 2]! * a + rgbFrame[dstIdx + 2]! * invA
      }
      srcIdx += 4
      dstIdx += 3
    }
  }
}

function encodeRawFramesToVideo(
  frames: Buffer[],
  outPath: string,
  codecArgs: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      FFMPEG,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        '-s',
        `${W}x${H}`,
        '-r',
        String(FPS),
        '-i',
        'pipe:0',
        ...codecArgs,
        outPath,
      ],
      { stdio: ['pipe', 'ignore', 'pipe'] }
    )
    let errText = ''
    proc.stderr?.on('data', (chunk) => {
      errText += String(chunk)
    })
    proc.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg raw encode failed (${outPath}): ${errText.slice(-1200)}`))
    })
    ;(async () => {
      for (const frame of frames) {
        if (!proc.stdin.write(frame)) {
          await new Promise<void>((res) => proc.stdin.once('drain', res))
        }
      }
      proc.stdin.end()
    })().catch(reject)
  })
}

function mp4EncodeArgs(gopFrames: number, stillTune: boolean): string[] {
  return [
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    ...(stillTune ? ['-tune', 'stillimage'] : []),
    '-crf',
    '25',
    '-bf',
    '0',
    '-g',
    String(gopFrames),
    '-keyint_min',
    String(gopFrames),
    '-sc_threshold',
    '0',
    '-video_track_timescale',
    '30000',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
  ]
}

function webmEncodeArgs(gopFrames: number): string[] {
  return [
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '35',
    '-deadline',
    'good',
    '-cpu-used',
    '5',
    '-row-mt',
    '1',
    '-g',
    String(gopFrames),
    '-keyint_min',
    String(gopFrames),
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
  ]
}

function resolvePublicImageDiskPath(webUrl: string, tmpDir: string): string {
  const cleanRel = webUrl.split('?')[0]!.replace(/^\//, '')
  const fullPath = join(ROOT, 'public', cleanRel)
  if (!existsSync(fullPath)) {
    throw new Error(`Missing screenshot asset on disk: ${fullPath}`)
  }
  if (fullPath.endsWith('.webm')) {
    const extractedPng = join(tmpDir, 'new-series-extracted.png')
    if (!existsSync(extractedPng)) {
      mkdirSync(dirname(extractedPng), { recursive: true })
      runFfmpeg(
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          fullPath,
          '-frames:v',
          '1',
          extractedPng,
        ],
        'extract new-series.webm still'
      )
    }
    return extractedPng
  }
  return fullPath
}

function resolveFeatureScreenshotUrl(icon: string, locale: FeaturePanLocaleId): string {
  if (icon === 'scriptSupervisor') {
    return SCRIPT_SUPERVISOR_SCREENSHOT_WEBP
  }
  if (icon === 'multilanguageUi') {
    if (locale === 'es') return MULTILANGUAGE_UI_ES_SCREENSHOT_WEBP
    if (locale === 'pt') return MULTILANGUAGE_UI_PT_SCREENSHOT_WEBP
    if (locale === 'zh') return MULTILANGUAGE_UI_ZH_SCREENSHOT_WEBP
    if (locale === 'hi') return MULTILANGUAGE_UI_HI_SCREENSHOT_WEBP
    if (locale === 'ar') return MULTILANGUAGE_UI_AR_SCREENSHOT_WEBP
    if (locale === 'th') return MULTILANGUAGE_UI_TH_SCREENSHOT_WEBP
    return MULTILANGUAGE_UI_ES_SCREENSHOT_WEBP
  }
  const entry = KEY_FEATURE_SCREENSHOTS[icon]
  if (!entry) {
    throw new Error(`Missing KEY_FEATURE_SCREENSHOTS entry for "${icon}"`)
  }
  return keyFeatureScreenshotSrc(entry)
}

/**
 * Builds (or reuses cached) 1920×1080 @ 30fps GOP-aligned hold & 1.5s cubic ease-in-out
 * transition segments for a `(icon, visualKey)` screenshot source.
 */
async function ensureFeatureVisualSegments(args: {
  icon: string
  locale: FeaturePanLocaleId
  segDir: string
  tmpDir: string
  force: boolean
}): Promise<CachedFeatureSegments> {
  const { icon, locale, segDir, tmpDir, force } = args
  const visualKey = icon === 'multilanguageUi' ? `${icon}-${locale}` : icon
  const featureDir = join(segDir, visualKey)
  mkdirSync(featureDir, { recursive: true })

  const posterPng = join(featureDir, 'roi0.png')
  const hold3sMp4 = [0, 1, 2, 3].map((i) => join(featureDir, `hold3s_${i}.mp4`)) as [
    string,
    string,
    string,
    string,
  ]
  const hold1sMp4 = [0, 1, 2, 3].map((i) => join(featureDir, `hold1s_${i}.mp4`)) as [
    string,
    string,
    string,
    string,
  ]
  const hold3sWebm = [0, 1, 2, 3].map((i) => join(featureDir, `hold3s_${i}.webm`)) as [
    string,
    string,
    string,
    string,
  ]
  const hold1sWebm = [0, 1, 2, 3].map((i) => join(featureDir, `hold1s_${i}.webm`)) as [
    string,
    string,
    string,
    string,
  ]
  const transMp4 = [0, 1, 2].map((i) => join(featureDir, `trans${i}.mp4`)) as [
    string,
    string,
    string,
  ]
  const transWebm = [0, 1, 2].map((i) => join(featureDir, `trans${i}.webm`)) as [
    string,
    string,
    string,
  ]

  const allFiles = [
    posterPng,
    ...hold3sMp4,
    ...hold1sMp4,
    ...hold3sWebm,
    ...hold1sWebm,
    ...transMp4,
    ...transWebm,
  ]
  if (!force && allFiles.every((f) => existsSync(f) && statSync(f).size > 1_000)) {
    return {
      posterPng,
      hold3sMp4,
      hold1sMp4,
      hold3sWebm,
      hold1sWebm,
      transMp4,
      transWebm,
    }
  }

  const srcUrl = resolveFeatureScreenshotUrl(icon, locale)
  const diskSrc = resolvePublicImageDiskPath(srcUrl, tmpDir)
  const meta = await sharp(diskSrc).metadata()
  const rawW = meta.width || 2560
  const rawH = meta.height || 1440

  const roisNorm = getFourRoisForFeature(icon, rawW, rawH)
  const minWidthFrac = Math.min(...roisNorm.map((r) => r.widthFrac))

  // Pre-filter with Lanczos-3 so pixels inside the tightest ROI map ~1.08:1 to 1920px:
  // crisp anti-aliased UI typography + zero bilinear shimmer during slow pans!
  const targetMasterW = Math.min(5120, Math.max(W, Math.round((W / minWidthFrac) * 1.08)))
  const targetMasterH = Math.max(H, Math.round((rawH * targetMasterW) / rawW))

  const { data: srcRgb, info } = await sharp(diskSrc)
    .resize(targetMasterW, targetMasterH, { kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const srcW = info.width
  const srcH = info.height
  const cams = roisNorm.map((r) => resolveCameraState(r, srcW, srcH))
  const wmPatch = await getWatermarkPatch()

  // 1. Render & encode 4 self-contained 3.0s (90f) + 1.0s (30f) single-GOP hold chunks
  for (let s = 0; s < 4; s++) {
    const cam = cams[s]!
    const holdFrame = Buffer.allocUnsafe(W * H * 3)
    sampleFrameBilinear(srcRgb, srcW, srcH, cam.cx, cam.cy, cam.scale, holdFrame)
    blendWatermarkInPlace(holdFrame, wmPatch)

    const roiPng = join(featureDir, `roi${s}.png`)
    await sharp(holdFrame, { raw: { width: W, height: H, channels: 3 } })
      .png({ compressionLevel: 4 })
      .toFile(roiPng)

    const frames3s = Array.from({ length: HOLD_CHUNK_3S_FRAMES }, () => holdFrame)
    const frames1s = Array.from({ length: HOLD_CHUNK_1S_FRAMES }, () => holdFrame)
    await encodeRawFramesToVideo(frames3s, hold3sMp4[s]!, mp4EncodeArgs(HOLD_CHUNK_3S_FRAMES, true))
    await encodeRawFramesToVideo(frames1s, hold1sMp4[s]!, mp4EncodeArgs(HOLD_CHUNK_1S_FRAMES, true))
    await encodeRawFramesToVideo(frames3s, hold3sWebm[s]!, webmEncodeArgs(HOLD_CHUNK_3S_FRAMES))
    await encodeRawFramesToVideo(frames1s, hold1sWebm[s]!, webmEncodeArgs(HOLD_CHUNK_1S_FRAMES))
  }

  // 2. Render & encode 3 cubic ease-in-out pan+zoom transitions (1.5s = 45 frames @ 30fps)
  for (let s = 0; s < 3; s++) {
    const cur = cams[s]!
    const nxt = cams[s + 1]!
    const frames: Buffer[] = []
    for (let f = 1; f <= TRANS_FRAMES; f++) {
      const e = cubicEaseInOut(f / (TRANS_FRAMES + 1))
      const cx = cur.cx + (nxt.cx - cur.cx) * e
      const cy = cur.cy + (nxt.cy - cur.cy) * e
      const sc = cur.scale + (nxt.scale - cur.scale) * e
      const buf = Buffer.allocUnsafe(W * H * 3)
      sampleFrameBilinear(srcRgb, srcW, srcH, cx, cy, sc, buf)
      blendWatermarkInPlace(buf, wmPatch)
      frames.push(buf)
    }

    await encodeRawFramesToVideo(frames, transMp4[s]!, mp4EncodeArgs(TRANS_FRAMES, false))
    await encodeRawFramesToVideo(frames, transWebm[s]!, webmEncodeArgs(TRANS_FRAMES))
  }

  console.log(`  [segments] ${visualKey} (4 ROIs @ 1920x1080 30fps ready)`)
  return {
    posterPng,
    hold3sMp4,
    hold1sMp4,
    hold3sWebm,
    hold1sWebm,
    transMp4,
    transWebm,
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

function decodeAudioToStereoPcm(audioPath: string, tmpWavPath: string): StereoPcm {
  mkdirSync(dirname(tmpWavPath), { recursive: true })
  runFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      audioPath,
      '-ac',
      '2',
      '-ar',
      String(SR),
      '-f',
      'wav',
      tmpWavPath,
    ],
    `decode ${audioPath}`
  )
  const buf = readFileSync(tmpWavPath)
  try {
    unlinkSync(tmpWavPath)
  } catch {
    // ignore
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
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 4, 'ascii')
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8, 4, 'ascii')
  header.write('fmt ', 12, 4, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(2, 22)
  header.writeUInt32LE(SR, 24)
  header.writeUInt32LE(SR * 4, 28)
  header.writeUInt16LE(4, 32)
  header.writeUInt16LE(16, 34)
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

function trimVoGentle(pcm: StereoPcm): StereoPcm {
  const n = pcm.L.length
  const win = Math.floor(SR * 0.01)
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

  const prePad = Math.floor(SR * 0.12)
  const postPad = Math.floor(SR * 0.16)
  const start = Math.max(0, firstActive - prePad)
  const end = Math.min(n, lastActive + postPad)

  const L = pcm.L.slice(start, end)
  const R = pcm.R.slice(start, end)
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

function normalizePcmActiveRms(pcm: StereoPcm, targetRms: number) {
  const win = Math.floor(SR * 0.05)
  let activeSumSq = 0
  let activeSamples = 0
  for (let pos = 0; pos + win <= pcm.L.length; pos += win) {
    let wSq = 0
    for (let i = 0; i < win; i++) {
      const m = 0.5 * (pcm.L[pos + i]! + pcm.R[pos + i]!)
      wSq += m * m
    }
    const wRms = Math.sqrt(wSq / win)
    if (wRms > 0.008) {
      activeSumSq += wSq
      activeSamples += win
    }
  }
  const currentRms =
    activeSamples > 0 ? Math.sqrt(activeSumSq / activeSamples) : targetRms
  const gain = Math.max(0.35, Math.min(3.2, targetRms / Math.max(0.005, currentRms)))
  for (let i = 0; i < pcm.L.length; i++) {
    pcm.L[i]! *= gain
    pcm.R[i]! *= gain
  }
}

function countWeight(text: string): number {
  return Math.max(8, Array.from(text.replace(/\s+/g, '')).length)
}

function detectBeatOffsetsInChapter(
  voPcm: StereoPcm,
  beatTexts: readonly string[],
  chapterDurSec: number
): number[] {
  const k = beatTexts.length
  if (k <= 1) return [0]

  const weights = beatTexts.map(countWeight)
  const totalW = weights.reduce((a, b) => a + b, 0)
  const voDur = voPcm.durationSec

  const hop = Math.floor(SR * 0.04)
  const numFrames = Math.max(1, Math.floor(voPcm.L.length / hop))
  const rmsEnv = new Float64Array(numFrames)
  for (let f = 0; f < numFrames; f++) {
    let sq = 0
    const base = f * hop
    for (let i = 0; i < hop; i++) {
      const m = 0.5 * (Math.abs(voPcm.L[base + i]!) + Math.abs(voPcm.R[base + i]!))
      sq += m * m
    }
    rmsEnv[f] = Math.sqrt(sq / hop)
  }

  const offsets: number[] = [0]
  let cumW = 0
  let prevSec = 0.8

  for (let b = 0; b < k - 1; b++) {
    cumW += weights[b]!
    const ratio = cumW / totalW
    const expectedVoSec = ratio * voDur
    const minSearchVoSec = Math.max(prevSec + 1.2, expectedVoSec - 1.65)
    const maxSearchVoSec = Math.min(voDur - 1.2, expectedVoSec + 1.65)

    let bestVoSec = expectedVoSec
    if (maxSearchVoSec > minSearchVoSec) {
      const fStart = Math.max(0, Math.floor(minSearchVoSec / 0.04))
      const fEnd = Math.min(numFrames - 1, Math.ceil(maxSearchVoSec / 0.04))
      let minScore = Number.POSITIVE_INFINITY
      for (let f = fStart; f <= fEnd; f++) {
        const rPrev = rmsEnv[Math.max(0, f - 1)]!
        const rCur = rmsEnv[f]!
        const rNext = rmsEnv[Math.min(numFrames - 1, f + 1)]!
        const localRms = 0.25 * rPrev + 0.5 * rCur + 0.25 * rNext
        const distPenalty = Math.abs(f * 0.04 - expectedVoSec) * 0.004
        const score = localRms + distPenalty
        if (score < minScore) {
          minScore = score
          bestVoSec = f * 0.04
        }
      }
    }

    const quantizedSec =
      Math.round(Math.min(chapterDurSec - 1.0, LEAD_IN_SEC + bestVoSec) * FPS) / FPS
    prevSec = bestVoSec
    offsets.push(Number(quantizedSec.toFixed(4)))
  }

  return offsets
}

/**
 * Computes the 4 GOP-aligned (`0.5s` step) hold durations `[h0, h1, h2, h3]`
 * (each guaranteed `>= 3.0s` and `<= HOLD_MASTER_MAX_SEC`) so that
 * `h0 + h1 + h2 + h3 + 3 * 1.5s` covers the full narration chapter cleanly.
 */
function computeFourHoldDurationsSec(rawChapterSec: number): [number, number, number, number] {
  const minTotalHoldSec = 4 * MIN_HOLD_SEC // 12.0s
  const totalWholeSec = Math.max(minTotalHoldSec, Math.ceil(rawChapterSec - 3 * TRANS_SEC))
  const baseSec = Math.floor(totalWholeSec / 4)
  const remSec = totalWholeSec - baseSec * 4

  return [0, 1, 2, 3].map((idx) => baseSec + (idx < remSec ? 1 : 0)) as [
    number,
    number,
    number,
    number,
  ]
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let idx = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (idx < items.length) {
        const current = items[idx++]
        if (current !== undefined) {
          await worker(current)
        }
      }
    })
  )
}

async function main() {
  const { suites, locales, force, regenOutputs } = parseArgs(process.argv.slice(2))

  const buildRoot = join(ROOT, 'tmp', 'feature-animatics-build')
  const voRoot = join(buildRoot, 'vo')
  const segDir = join(buildRoot, 'segments-1080p30')
  const tmpDir = join(buildRoot, 'scratch-1080p30')
  const outAnimaticsDir = join(ROOT, 'public', 'landing', 'key-features', 'animatics')

  mkdirSync(segDir, { recursive: true })
  mkdirSync(tmpDir, { recursive: true })
  mkdirSync(outAnimaticsDir, { recursive: true })

  const musicMp3 = join(ROOT, 'tmp', 'video-services-build', 'training', 'music.mp3')
  if (!existsSync(musicMp3)) {
    throw new Error(`Cached background score not found at ${musicMp3}`)
  }
  console.log('Decoding & normalizing background score...')
  const musicBed = decodeAudioToStereoPcm(musicMp3, join(tmpDir, 'music-bed.wav'))
  normalizePcmActiveRms(musicBed, TARGET_MUSIC_BED_RMS)

  // Stage A: Pre-render 1920x1080 @ 30fps 4-ROI hold & cubic ease-in-out transition segments
  const visualTasks: Array<{ icon: string; locale: FeaturePanLocaleId }> = []
  for (const suite of suites) {
    for (const icon of suite.featureIcons) {
      if (icon === 'multilanguageUi') {
        for (const loc of locales) {
          visualTasks.push({ icon, locale: loc })
        }
      } else {
        visualTasks.push({ icon, locale: 'en' })
      }
    }
  }

  console.log(
    `\nStage A: Preparing ${visualTasks.length} 1920x1080 @ 30fps 4-ROI visual segment sets...`
  )
  const segmentMap = new Map<string, CachedFeatureSegments>()
  await runPool(visualTasks, 3, async (task) => {
    const key = task.icon === 'multilanguageUi' ? `${task.icon}-${task.locale}` : task.icon
    const segs = await ensureFeatureVisualSegments({
      icon: task.icon,
      locale: task.locale,
      segDir,
      tmpDir,
      force,
    })
    segmentMap.set(key, segs)
  })

  // Load existing manifest so partial `--suite` / `--locale` runs preserve other suites cleanly
  const manifestTsPath = join(
    ROOT,
    'src',
    'config',
    'landing',
    'keyFeatureAnimaticsManifest.ts'
  )
  let existingManifest: Partial<Record<KeyFeatureSuiteId, FeatureAnimaticSuiteManifest>> = {}
  if (existsSync(manifestTsPath)) {
    try {
      const mod = await import(manifestTsPath)
      if (mod?.KEY_FEATURE_ANIMATICS_MANIFEST) {
        existingManifest = { ...mod.KEY_FEATURE_ANIMATICS_MANIFEST }
      }
    } catch {
      // ignore
    }
  }

  const fullManifest: Partial<Record<KeyFeatureSuiteId, FeatureAnimaticSuiteManifest>> = {
    ...existingManifest,
  }

  for (const suite of suites) {
    console.log(`\n======================================================`)
    console.log(`Stage B: Muxing Suite [${suite.id}] (${suite.featureIcons.length} chapters)`)
    console.log(`======================================================`)

    const prevSuite = existingManifest[suite.id]
    const suiteEntry: FeatureAnimaticSuiteManifest = {
      suiteId: suite.id,
      locales: { ...(prevSuite?.locales ?? {}) } as FeatureAnimaticSuiteManifest['locales'],
    }

    const firstIcon = suite.featureIcons[0]!
    const firstKey = firstIcon === 'multilanguageUi' ? `${firstIcon}-en` : firstIcon
    const firstSegs = segmentMap.get(firstKey)!
    const posterOut = join(outAnimaticsDir, `${suite.id}-poster.webp`)
    if (regenOutputs || !existsSync(posterOut) || statSync(posterOut).size < 5_000) {
      await sharp(firstSegs.posterPng).webp({ quality: 86, effort: 5 }).toFile(posterOut)
      console.log(`  [poster] ${suite.id}-poster.webp (1920x1080)`)
    }

    await runPool([...locales], 3, async (locale) => {
      const chaptersMap: Record<string, FeatureAnimaticChapterTiming> = {}
      const mp4ConcatLines = ['ffconcat version 1.0']
      const webmConcatLines = ['ffconcat version 1.0']

      const chapterVoPlacements: Array<{
        voPcm: StereoPcm
        voStartSample: number
        voEndSample: number
      }> = []

      let cursorSec = 0

      for (const icon of suite.featureIcons) {
        const voMp3 = join(voRoot, locale, `${icon}.mp3`)
        if (!existsSync(voMp3)) {
          throw new Error(`Missing synthesized VO file: ${voMp3}`)
        }
        const rawVo = decodeAudioToStereoPcm(
          voMp3,
          join(tmpDir, `vo-${suite.id}-${locale}-${icon}.wav`)
        )
        const voPcm = trimVoGentle(rawVo)
        normalizePcmActiveRms(voPcm, TARGET_VO_RMS)

        const rawChapterSec = LEAD_IN_SEC + voPcm.durationSec + TAIL_PAD_SEC
        const holdsSec = computeFourHoldDurationsSec(rawChapterSec)
        const chapterDurSec =
          holdsSec[0] + holdsSec[1] + holdsSec[2] + holdsSec[3] + 3 * TRANS_SEC
        const chapterStartSec = Number(cursorSec.toFixed(4))

        const spec = KEY_FEATURE_NARRATED_PAN[icon]!
        const beatTexts = spec.beats.map((b) => b.narration[locale])
        const relBeatOffsets = detectBeatOffsetsInChapter(
          voPcm,
          beatTexts,
          chapterDurSec
        )
        const absBeatStartsSec = relBeatOffsets.map((rel) =>
          Number((chapterStartSec + rel).toFixed(4))
        )

        const segKey = icon === 'multilanguageUi' ? `${icon}-${locale}` : icon
        const segs = segmentMap.get(segKey)!

        for (let s = 0; s < 4; s++) {
          const hSec = Math.max(3, Math.round(holdsSec[s]!))
          const count3s = Math.floor(hSec / 3)
          const count1s = hSec % 3
          const esc3sMp4 = segs.hold3sMp4[s]!.replace(/'/g, "'\\''")
          const esc1sMp4 = segs.hold1sMp4[s]!.replace(/'/g, "'\\''")
          const esc3sWebm = segs.hold3sWebm[s]!.replace(/'/g, "'\\''")
          const esc1sWebm = segs.hold1sWebm[s]!.replace(/'/g, "'\\''")

          for (let r = 0; r < count3s; r++) {
            mp4ConcatLines.push(`file '${esc3sMp4}'`)
            webmConcatLines.push(`file '${esc3sWebm}'`)
          }
          for (let r = 0; r < count1s; r++) {
            mp4ConcatLines.push(`file '${esc1sMp4}'`)
            webmConcatLines.push(`file '${esc1sWebm}'`)
          }

          if (s < 3) {
            mp4ConcatLines.push(`file '${segs.transMp4[s]!.replace(/'/g, "'\\''")}'`)
            webmConcatLines.push(`file '${segs.transWebm[s]!.replace(/'/g, "'\\''")}'`)
          }
        }

        const chapterEndSec = Number((chapterStartSec + chapterDurSec).toFixed(4))
        chaptersMap[icon] = {
          startSec: chapterStartSec,
          endSec: chapterEndSec,
          beatStartsSec: absBeatStartsSec,
        }

        const voStartSample = Math.round((chapterStartSec + LEAD_IN_SEC) * SR)
        chapterVoPlacements.push({
          voPcm,
          voStartSample,
          voEndSample: voStartSample + voPcm.L.length,
        })

        cursorSec += chapterDurSec
      }

      const totalSuiteSec = Number(cursorSec.toFixed(4))
      suiteEntry.locales[locale] = {
        totalDurationSec: totalSuiteSec,
        chapters: chaptersMap,
      }

      const outWebm = join(outAnimaticsDir, `${suite.id}-${locale}.webm`)
      const outMp4 = join(outAnimaticsDir, `${suite.id}-${locale}.mp4`)

      if (
        !regenOutputs &&
        existsSync(outWebm) &&
        existsSync(outMp4) &&
        statSync(outWebm).size > 80_000 &&
        statSync(outMp4).size > 80_000
      ) {
        console.log(`  [cached] ${suite.id}-${locale} (${totalSuiteSec.toFixed(1)}s)`)
        return
      }

      // 1. Mix full suite stereo 48kHz audio (VO + ducked underscore + loudnorm)
      const totalSamples = Math.round(totalSuiteSec * SR)
      const mixL = new Float64Array(totalSamples)
      const mixR = new Float64Array(totalSamples)
      const duckEnv = new Float64Array(totalSamples).fill(MUSIC_GAIN_IDLE)

      const duckRamp = Math.floor(SR * 0.28)
      for (const placement of chapterVoPlacements) {
        const s0 = Math.max(0, placement.voStartSample)
        const s1 = Math.min(totalSamples, placement.voEndSample)
        for (let i = s0; i < s1; i++) {
          duckEnv[i] = MUSIC_GAIN_DUCKED
          const voIdx = i - placement.voStartSample
          if (voIdx >= 0 && voIdx < placement.voPcm.L.length) {
            mixL[i]! += placement.voPcm.L[voIdx]!
            mixR[i]! += placement.voPcm.R[voIdx]!
          }
        }
        for (let r = 0; r < duckRamp; r++) {
          const preIdx = s0 - duckRamp + r
          if (preIdx >= 0 && preIdx < totalSamples) {
            const t = 0.5 * (1 - Math.cos((Math.PI * r) / duckRamp))
            const g = MUSIC_GAIN_IDLE + (MUSIC_GAIN_DUCKED - MUSIC_GAIN_IDLE) * t
            if (g < duckEnv[preIdx]!) duckEnv[preIdx] = g
          }
          const postIdx = s1 + r
          if (postIdx >= 0 && postIdx < totalSamples) {
            const t = 0.5 * (1 - Math.cos((Math.PI * r) / duckRamp))
            const g = MUSIC_GAIN_DUCKED + (MUSIC_GAIN_IDLE - MUSIC_GAIN_DUCKED) * t
            if (g < duckEnv[postIdx]!) duckEnv[postIdx] = g
          }
        }
      }

      const fadeInSamples = Math.min(totalSamples, Math.floor(SR * 0.5))
      const fadeOutSamples = Math.min(totalSamples, Math.floor(SR * 0.85))
      const bedLen = Math.max(1, musicBed.L.length)

      for (let i = 0; i < totalSamples; i++) {
        let mGain = duckEnv[i]!
        if (i < fadeInSamples) {
          mGain *= i / fadeInSamples
        }
        if (i >= totalSamples - fadeOutSamples) {
          mGain *= (totalSamples - 1 - i) / fadeOutSamples
        }
        const mIdx = i % bedLen
        mixL[i]! += musicBed.L[mIdx]! * mGain
        mixR[i]! += musicBed.R[mIdx]! * mGain
      }

      const rawMixWav = join(tmpDir, `${suite.id}-${locale}-rawmix.wav`)
      const normMixWav = join(tmpDir, `${suite.id}-${locale}-norm.wav`)
      writeStereoWav(rawMixWav, mixL, mixR)

      runFfmpeg(
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          rawMixWav,
          '-af',
          'loudnorm=I=-16:TP=-1.5:LRA=11',
          '-ar',
          String(SR),
          '-ac',
          '2',
          normMixWav,
        ],
        `loudnorm ${suite.id}-${locale}`
      )

      // 2. Write ffconcat lists and mux with `-c:v copy` into `.webm` & `.mp4`
      const mp4ConcatTxt = join(tmpDir, `${suite.id}-${locale}-mp4.txt`)
      const webmConcatTxt = join(tmpDir, `${suite.id}-${locale}-webm.txt`)
      writeFileSync(mp4ConcatTxt, mp4ConcatLines.join('\n') + '\n', 'utf8')
      writeFileSync(webmConcatTxt, webmConcatLines.join('\n') + '\n', 'utf8')

      runFfmpeg(
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          webmConcatTxt,
          '-i',
          normMixWav,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-c:v',
          'copy',
          '-c:a',
          'libopus',
          '-b:a',
          '96k',
          '-ar',
          String(SR),
          '-ac',
          '2',
          '-t',
          totalSuiteSec.toFixed(4),
          '-cues_to_front',
          '1',
          outWebm,
        ],
        `mux webm ${suite.id}-${locale}`
      )

      runFfmpeg(
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          mp4ConcatTxt,
          '-i',
          normMixWav,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-ar',
          String(SR),
          '-ac',
          '2',
          '-t',
          totalSuiteSec.toFixed(4),
          '-movflags',
          '+faststart',
          outMp4,
        ],
        `mux mp4 ${suite.id}-${locale}`
      )

      for (const f of [rawMixWav, normMixWav, mp4ConcatTxt, webmConcatTxt]) {
        try {
          unlinkSync(f)
        } catch {
          // ignore
        }
      }

      const webmMb = (statSync(outWebm).size / 1_048_576).toFixed(2)
      const mp4Mb = (statSync(outMp4).size / 1_048_576).toFixed(2)
      console.log(
        `  [done] ${suite.id}-${locale} (${totalSuiteSec.toFixed(1)}s @ 1920x1080 30fps) -> webm=${webmMb}MB, mp4=${mp4Mb}MB`
      )
    })

    fullManifest[suite.id] = suiteEntry
  }

  // Write TypeScript chapter timing manifest when all 8 suites have complete 7-locale entries
  if (
    KEY_FEATURE_SUITES.every(
      (s) =>
        fullManifest[s.id] &&
        ALL_LOCALES.every((loc) => Boolean(fullManifest[s.id]?.locales?.[loc]))
    )
  ) {
    const tsBody = [
      '/**',
      ' * AUTO-GENERATED by `scripts/build-feature-animatics.ts` — DO NOT EDIT MANUALLY.',
      ' * Frame-accurate (1920x1080 @ 30 fps) 4-ROI cubic ease-in-out chapter & beat timing manifest',
      ' * across all 8 Studio Animatic Suites and 7 priority languages.',
      ' */',
      "import type { FeatureAnimaticSuiteManifest, KeyFeatureSuiteId } from './keyFeatureAnimatics'",
      '',
      'export const KEY_FEATURE_ANIMATICS_MANIFEST: Record<KeyFeatureSuiteId, FeatureAnimaticSuiteManifest> = ' +
        JSON.stringify(fullManifest, null, 2) +
        ' as const',
      '',
    ].join('\n')
    writeFileSync(manifestTsPath, tsBody, 'utf8')
    console.log(`\nUpdated manifest -> ${manifestTsPath}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
