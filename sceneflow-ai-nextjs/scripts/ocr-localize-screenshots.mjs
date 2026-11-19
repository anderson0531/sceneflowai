#!/usr/bin/env node
/**
 * Two-stage 100% local (zero external API billing) screenshot localization:
 *
 * Stage 1 (`--extract`):
 *   Converts each 5K dark-mode WebP screenshot into inverted high-contrast
 *   1440px vertical bands (so macOS Vision OCR detects 99%+ of light-on-dark
 *   UI text), caches exact pixel bounding boxes to `tmp/ocr-boxes/<stem>.json`,
 *   and writes a deduplicated list of English UI strings to `tmp/ocr-strings.json`.
 *
 * Stage 2 (`--render`):
 *   Reads a translations dictionary JSON (`{ "<english>": { es, pt, hi, zh, ar, th } }`),
 *   samples exact background & foreground RGB around each OCR box, and composites
 *   razor-sharp native macOS vector typography into:
 *     `public/landing/key-features/screenshots/locales/<locale>/<stem>.webp`
 *
 * Usage:
 *   node scripts/ocr-localize-screenshots.mjs --extract series-review series-consistency ...
 *   node scripts/ocr-localize-screenshots.mjs --render --dict=tmp/room1-translations.json series-review ...
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SCREENSHOTS_DIR = join(ROOT, 'public', 'landing', 'key-features', 'screenshots')
const LOCALES_OUT_ROOT = join(SCREENSHOTS_DIR, 'locales')
const TMP_DIR = join(ROOT, 'tmp', 'ocr-localize')
const BOXES_DIR = join(TMP_DIR, 'boxes')
const OCR_BIN = join(ROOT, 'tmp', 'vision-ocr')

const TARGET_LOCALES = ['es', 'pt', 'hi', 'zh', 'ar', 'th']
const MASTER_W = 2560

const FONT_STACK_BY_LOCALE = {
  es: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif",
  pt: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif",
  hi: "'Kohinoor Devanagari', 'Devanagari Sangam MN', -apple-system, sans-serif",
  zh: "'PingFang SC', 'Hiragino Sans GB', -apple-system, sans-serif",
  ar: "'Geeza Pro', 'Damascus', -apple-system, sans-serif",
  th: "'Thonburi', 'Sukhumvit Set', -apple-system, sans-serif",
}

const PROTECTED_EXACT = new Set([
  'SceneFlow Studio',
  'SceneFlow',
  'FlowDirector',
  'Audience Resonance',
  'Pre-Vis',
  'Vertex AI',
  'Veo',
  'Imagen',
  'Kling',
  'ElevenLabs',
  'BYOK',
  '4K',
  'MP4',
  'SFX',
  'BGM',
  'F2V',
  'I2V',
  'FTV',
  'T2V',
  '1080p',
  '16:9',
  '9:16',
])

function escXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function shouldSkipText(raw) {
  const s = raw.trim()
  if (s.length < 2) return true
  if (PROTECTED_EXACT.has(s)) return true
  if (/^[\d\s.,:%+\-–—/()[\]|•·✓✕×<>@#=~]+$/.test(s)) return true
  if (/^(https?:\/\/|sceneflowai\.studio|www\.)/i.test(s)) return true
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return true
  if (/^(AR\s*\d+|v\d+(\.\d+)?|\d+:\d+|\d+p|\-?\d+\s*LUFS|\d+\.?\d*k)$/i.test(s)) return true
  const latinLetters = (s.match(/[A-Za-z]/g) || []).length
  if (latinLetters < 2) return true
  return false
}

async function prepareMasterPng(stem) {
  mkdirSync(TMP_DIR, { recursive: true })
  const srcPath = join(SCREENSHOTS_DIR, `${stem}.webp`)
  if (!existsSync(srcPath)) throw new Error(`Missing screenshot: ${srcPath}`)
  const pngPath = join(TMP_DIR, `${stem}-${MASTER_W}.png`)
  const meta = await sharp(srcPath).metadata()
  const rawW = meta.width || MASTER_W
  const rawH = meta.height || 1440
  const outW = Math.min(MASTER_W, rawW)
  const outH = Math.round((rawH * outW) / rawW)
  await sharp(srcPath).resize(outW, outH, { kernel: 'lanczos3' }).png().toFile(pngPath)
  return { pngPath, width: outW, height: outH }
}

/**
 * Runs macOS Vision OCR on native-RGB 720px horizontal bands with 80px overlap
 * (stride 640px) so Vision never downsamples small UI labels and captures ~100%
 * of dark-mode text without splitting lines at band seams.
 */
async function extractBoxesForStem(stem) {
  mkdirSync(BOXES_DIR, { recursive: true })
  const { pngPath, width, height } = await prepareMasterPng(stem)
  const bandH = 720
  const overlap = 80
  const stride = bandH - overlap
  const allBoxes = []

  for (let top = 0; top < height; top += stride) {
    const sliceH = Math.min(bandH, height - top)
    if (sliceH < 40) break
    const bandPath = join(TMP_DIR, `${stem}-band-${top}.png`)

    await sharp(pngPath)
      .extract({ left: 0, top, width, height: sliceH })
      .png()
      .toFile(bandPath)

    const res = spawnSync(OCR_BIN, [bandPath], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
    if (res.status !== 0) {
      throw new Error(`vision-ocr failed on ${stem} band ${top}: ${res.stderr}`)
    }
    const bandBoxes = JSON.parse(res.stdout)
    for (const b of bandBoxes) {
      const candidate = {
        text: b.text.trim(),
        x: b.x,
        y: b.y + top,
        w: b.w,
        h: b.h,
        confidence: b.confidence,
      }
      // Deduplicate overlap with already-recorded boxes
      const dupIdx = allBoxes.findIndex((existing) => {
        const ix0 = Math.max(existing.x, candidate.x)
        const iy0 = Math.max(existing.y, candidate.y)
        const ix1 = Math.min(existing.x + existing.w, candidate.x + candidate.w)
        const iy1 = Math.min(existing.y + existing.h, candidate.y + candidate.h)
        if (ix1 <= ix0 || iy1 <= iy0) return false
        const inter = (ix1 - ix0) * (iy1 - iy0)
        const minArea = Math.min(existing.w * existing.h, candidate.w * candidate.h)
        return minArea > 0 && inter / minArea > 0.45
      })
      if (dupIdx >= 0) {
        const prev = allBoxes[dupIdx]
        if (
          candidate.confidence > prev.confidence + 0.05 ||
          (Math.abs(candidate.confidence - prev.confidence) <= 0.05 &&
            candidate.text.length > prev.text.length)
        ) {
          allBoxes[dupIdx] = candidate
        }
      } else {
        allBoxes.push(candidate)
      }
    }
    if (top + sliceH >= height) break
  }

  const outJson = join(BOXES_DIR, `${stem}.json`)
  writeFileSync(outJson, JSON.stringify({ stem, width, height, boxes: allBoxes }, null, 2), 'utf8')
  return { stem, width, height, boxes: allBoxes }
}

function median(arr) {
  if (!arr.length) return 15
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

function sampleBoxColors(rawBuf, imgW, imgH, box) {
  const x0 = Math.max(0, Math.floor(box.x))
  const y0 = Math.max(0, Math.floor(box.y))
  const x1 = Math.min(imgW - 1, Math.ceil(box.x + box.w))
  const y1 = Math.min(imgH - 1, Math.ceil(box.y + box.h))

  const bgR = []
  const bgG = []
  const bgB = []
  const pushPx = (px, py) => {
    if (px < 0 || py < 0 || px >= imgW || py >= imgH) return
    const off = (py * imgW + px) * 3
    bgR.push(rawBuf[off])
    bgG.push(rawBuf[off + 1])
    bgB.push(rawBuf[off + 2])
  }

  const stepX = Math.max(1, Math.floor((x1 - x0) / 14))
  for (let x = x0; x <= x1; x += stepX) {
    pushPx(x, y0 - 2)
    pushPx(x, y1 + 2)
  }
  const stepY = Math.max(1, Math.floor((y1 - y0) / 6))
  for (let y = y0; y <= y1; y += stepY) {
    pushPx(x0 - 2, y)
    pushPx(x1 + 2, y)
  }

  const mR = median(bgR)
  const mG = median(bgG)
  const mB = median(bgB)

  let bestDist = -1
  let fgR = 238
  let fgG = 242
  let fgB = 248
  const inStepX = Math.max(1, Math.floor((x1 - x0) / 20))
  const inStepY = Math.max(1, Math.floor((y1 - y0) / 8))
  for (let y = y0; y <= y1; y += inStepY) {
    for (let x = x0; x <= x1; x += inStepX) {
      const off = (y * imgW + x) * 3
      const r = rawBuf[off]
      const g = rawBuf[off + 1]
      const b = rawBuf[off + 2]
      const dist = (r - mR) ** 2 + (g - mG) ** 2 + (b - mB) ** 2
      if (dist > bestDist) {
        bestDist = dist
        fgR = r
        fgG = g
        fgB = b
      }
    }
  }

  if (bestDist < 1800) {
    const bgLum = 0.299 * mR + 0.587 * mG + 0.114 * mB
    if (bgLum < 128) {
      fgR = 232
      fgG = 238
      fgB = 246
    } else {
      fgR = 15
      fgG = 23
      fgB = 42
    }
  }

  return { bgHex: rgbToHex(mR, mG, mB), fgHex: rgbToHex(fgR, fgG, fgB) }
}

async function renderStemWithDict(stem, dict, locales) {
  const boxesPath = join(BOXES_DIR, `${stem}.json`)
  if (!existsSync(boxesPath)) throw new Error(`Run --extract first for ${stem}`)
  const { width, height, boxes } = JSON.parse(readFileSync(boxesPath, 'utf8'))
  const pngPath = join(TMP_DIR, `${stem}-${MASTER_W}.png`)
  const { data: rawBuf } = await sharp(pngPath).removeAlpha().raw().toBuffer({ resolveWithObject: true })

  for (const locale of locales) {
    const fontFamily = FONT_STACK_BY_LOCALE[locale]
    const isRtl = locale === 'ar'
    const overlays = []

    for (const box of boxes) {
      if (box.h < 9 || box.w < 12) continue
      if (shouldSkipText(box.text)) continue
      const entry = dict[box.text]
      const translated = entry?.[locale]
      if (!translated || translated.trim() === box.text.trim()) continue

      const { bgHex, fgHex } = sampleBoxColors(rawBuf, width, height, box)
      const padX = Math.max(3, Math.round(box.h * 0.18))
      const padY = Math.max(2, Math.round(box.h * 0.14))
      const rx = Math.max(0, box.x - padX)
      const ry = Math.max(0, box.y - padY)
      const rw = Math.min(width - rx, box.w + padX * 2)
      const rh = Math.min(height - ry, box.h + padY * 2)

      let fontSize = Math.max(10, Math.round(box.h * 0.78))
      const maxTextW = Math.max(20, box.w + padX * 1.4)

      const charFactor =
        locale === 'zh' ? 0.96 : locale === 'th' ? 0.52 : locale === 'ar' ? 0.5 : 0.54
      const estW = translated.length * fontSize * charFactor
      if (estW > maxTextW * 1.04) {
        fontSize = Math.max(9, Math.floor(fontSize * ((maxTextW * 1.02) / estW)))
      }
      const baselineY = Math.round(box.y + box.h * 0.5 + fontSize * 0.34)
      const fontWeight = box.h >= 28 ? 700 : 500

      const textX = isRtl ? Math.round(box.x + box.w) : Math.round(box.x)
      const anchor = isRtl ? 'end' : 'start'

      overlays.push(
        `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" rx="4" fill="${bgHex}"/>` +
          `<text x="${textX}" y="${baselineY}" fill="${fgHex}" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${anchor}">${escXml(translated)}</text>`
      )
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${fontFamily}">
${overlays.join('\n')}
</svg>`

    const outPath = join(LOCALES_OUT_ROOT, locale, `${stem}.webp`)
    mkdirSync(dirname(outPath), { recursive: true })
    await sharp(pngPath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .webp({ quality: 92, effort: 5 })
      .toFile(outPath)
  }
  console.log(`  ✓ Rendered ${stem} -> ${locales.join(', ')} (${boxes.length} total boxes)`)
}

async function main() {
  const args = process.argv.slice(2)
  const isExtract = args.includes('--extract')
  const isRender = args.includes('--render')
  const dictArg = args.find((a) => a.startsWith('--dict='))?.slice('--dict='.length)
  const localeArg = args.find((a) => a.startsWith('--locale='))?.slice('--locale='.length)
  const stems = args.filter((a) => !a.startsWith('--'))

  if (stems.length === 0 || (!isExtract && !isRender)) {
    console.error('Usage: --extract <stems...> OR --render --dict=<json> <stems...>')
    process.exit(1)
  }

  if (isExtract) {
    const unique = new Set()
    for (const stem of stems) {
      const { boxes } = await extractBoxesForStem(stem)
      const kept = boxes.filter((b) => b.h >= 9 && b.w >= 12 && !shouldSkipText(b.text))
      kept.forEach((b) => unique.add(b.text))
      console.log(`  ✓ [OCR] ${stem}: ${boxes.length} boxes (${kept.length} translatable)`)
    }
    const list = Array.from(unique)
    const outStrings = join(TMP_DIR, 'ocr-strings.json')
    writeFileSync(outStrings, JSON.stringify(list, null, 2), 'utf8')
    console.log(`\nWrote ${list.length} unique English strings -> ${outStrings}`)
  }

  if (isRender) {
    if (!dictArg || !existsSync(dictArg)) {
      throw new Error(`Missing --dict=<path> JSON file`)
    }
    const dict = JSON.parse(readFileSync(dictArg, 'utf8'))
    const locales = localeArg
      ? localeArg
          .split(',')
          .map((s) => s.trim())
          .filter((s) => TARGET_LOCALES.includes(s))
      : [...TARGET_LOCALES]
    for (const stem of stems) {
      await renderStemWithDict(stem, dict, locales)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
