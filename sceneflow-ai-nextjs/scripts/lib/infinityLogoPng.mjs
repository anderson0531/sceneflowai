/**
 * Build transparent PNG brand assets from the film-strip infinity JPEG.
 * Tight-crops the source, keys out dark navy/bokeh, trims, then fits into target canvas.
 */

import sharp from 'sharp'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const INFINITY_SOURCE_JPG = join(
  __dirname,
  '../../public/brand/sf-infinity-source.jpg',
)

const PNG = { compressionLevel: 9, palette: false }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

/** Dark plate + low-chroma bokeh → transparent; keep cyan–purple film strip. */
export function shouldKeyOutPixel(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min
  if (max < 45 && chroma < 28) return true
  if (r < 35 && g < 40 && b < 55 && max < 55) return true
  return false
}

/**
 * @param {Buffer} rgba
 * @param {number} width
 * @param {number} height
 */
export function keyOutDarkPlate(rgba, width, height) {
  const out = Buffer.from(rgba)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const r = out[o]
    const g = out[o + 1]
    const b = out[o + 2]
    if (shouldKeyOutPixel(r, g, b)) {
      out[o + 3] = 0
    }
  }
  return out
}

/**
 * @param {import('sharp').Sharp} input
 * @param {number} [paddingPx] padding on full-res coordinates
 */
export async function detectContentCrop(input, paddingPx = 24) {
  const meta = await input.metadata()
  const fullW = meta.width ?? 0
  const fullH = meta.height ?? 0
  const scale = Math.min(1, 900 / Math.max(fullW, fullH))
  const w = Math.max(1, Math.round(fullW * scale))
  const h = Math.max(1, Math.round(fullH * scale))
  const { data } = await input
    .clone()
    .resize(w, h)
    .raw()
    .toBuffer({ resolveWithObject: true })

  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      if (!shouldKeyOutPixel(data[i], data[i + 1], data[i + 2])) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    return { left: 0, top: 0, width: fullW, height: fullH }
  }

  const pad = Math.round(paddingPx)
  const left = Math.max(0, Math.floor(minX / scale) - pad)
  const top = Math.max(0, Math.floor(minY / scale) - pad)
  const right = Math.min(fullW, Math.ceil(maxX / scale) + pad)
  const bottom = Math.min(fullH, Math.ceil(maxY / scale) + pad)
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }
}

let trimmedMarkCache = /** @type {Promise<Buffer> | null} */ (null)

/** RGBA PNG buffer: tight infinity mark, transparent background. */
export async function getTrimmedMarkBuffer(sourcePath = INFINITY_SOURCE_JPG) {
  if (!trimmedMarkCache) {
    trimmedMarkCache = buildTrimmedMark(sourcePath)
  }
  return trimmedMarkCache
}

/** @param {string} sourcePath */
async function buildTrimmedMark(sourcePath) {
  const base = sharp(sourcePath)
  const crop = await detectContentCrop(base)
  const cropped = base.extract(crop)

  const meta = await cropped.metadata()
  const maxDim = Math.max(meta.width ?? 1, meta.height ?? 1)
  const processScale = maxDim > 2200 ? 2200 / maxDim : 1
  const procW = Math.max(1, Math.round((meta.width ?? 1) * processScale))
  const procH = Math.max(1, Math.round((meta.height ?? 1) * processScale))

  const { data, info } = await cropped
    .resize(procW, procH, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const keyed = keyOutDarkPlate(data, info.width, info.height)

  return sharp(keyed, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 12 })
    .png(PNG)
    .toBuffer()
}

/**
 * @param {number} width
 * @param {number} height
 * @param {string} [sourcePath]
 */
export async function renderInfinityLogoPng(width, height, sourcePath) {
  const mark = await getTrimmedMarkBuffer(sourcePath)
  return sharp(mark)
    .resize(width, height, { fit: 'contain', background: TRANSPARENT })
    .png(PNG)
    .toBuffer()
}

/**
 * @param {string} outPath
 * @param {number} width
 * @param {number} height
 * @param {string} [sourcePath]
 */
export async function writeInfinityLogoPng(outPath, width, height, sourcePath) {
  const buf = await renderInfinityLogoPng(width, height, sourcePath)
  await sharp(buf).toFile(outPath)
}

/** Clear in-process cache (tests). */
export function resetInfinityLogoCache() {
  trimmedMarkCache = null
}
