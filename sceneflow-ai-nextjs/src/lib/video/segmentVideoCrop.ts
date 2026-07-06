/** Valid uniform frame crop range for uploaded beats (percent shrink, preserves aspect ratio). */
export const WATERMARK_CROP_MIN = 2
export const WATERMARK_CROP_MAX = 10
export const WATERMARK_CROP_DEFAULT = 5

export interface FrameCropSourceRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

/**
 * Returns a validated crop percent (2–10) or undefined when disabled/invalid.
 */
export function clampWatermarkCropPercent(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  const rounded = Math.round(n)
  if (rounded < WATERMARK_CROP_MIN || rounded > WATERMARK_CROP_MAX) return undefined
  return rounded
}

/**
 * Centered source rectangle that shrinks width and height by `cropPercent` evenly (before scale/pad).
 */
export function getFrameCropSourceRect(
  width: number,
  height: number,
  cropPercent: number
): FrameCropSourceRect {
  const pct = clampWatermarkCropPercent(cropPercent)
  if (!pct || width <= 0 || height <= 0) {
    return { sx: 0, sy: 0, sw: width, sh: height }
  }
  const factor = 1 - pct / 100
  const sw = Math.max(1, Math.round(width * factor))
  const sh = Math.max(1, Math.round(height * factor))
  const sx = Math.max(0, Math.round((width - sw) / 2))
  const sy = Math.max(0, Math.round((height - sh) / 2))
  return { sx, sy, sw, sh }
}

/** @deprecated Use getFrameCropSourceRect */
export const getBottomCropSourceRect = getFrameCropSourceRect

/**
 * FFmpeg crop filter fragment (includes trailing comma when non-empty).
 */
export function buildFfmpegFrameCropFilter(cropPercent: unknown): string {
  const pct = clampWatermarkCropPercent(cropPercent)
  if (!pct) return ''
  const factor = 1 - pct / 100
  return `crop=iw*${factor}:ih*${factor}:(iw-iw*${factor})/2:(ih-ih*${factor})/2,`
}

/** @deprecated Use buildFfmpegFrameCropFilter */
export const buildFfmpegBottomCropFilter = buildFfmpegFrameCropFilter

/**
 * CSS clip-path inset for preview (even inset on all sides).
 */
export function getFrameCropClipPath(cropPercent: unknown): string | undefined {
  const pct = clampWatermarkCropPercent(cropPercent)
  if (!pct) return undefined
  const inset = pct / 2
  return `inset(${inset}% ${inset}% ${inset}% ${inset}%)`
}

/** @deprecated Use getFrameCropClipPath */
export const getBottomCropClipPath = getFrameCropClipPath
