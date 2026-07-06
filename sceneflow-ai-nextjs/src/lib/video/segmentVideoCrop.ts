/** Valid bottom crop range for uploaded beat watermark removal (percent of frame height). */
export const WATERMARK_CROP_MIN = 2
export const WATERMARK_CROP_MAX = 10
export const WATERMARK_CROP_DEFAULT = 5

export interface BottomCropSourceRect {
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
 * Source rectangle that removes `cropPercent` from the bottom edge (before scale/pad).
 */
export function getBottomCropSourceRect(
  width: number,
  height: number,
  cropPercent: number
): BottomCropSourceRect {
  const pct = clampWatermarkCropPercent(cropPercent)
  if (!pct || width <= 0 || height <= 0) {
    return { sx: 0, sy: 0, sw: width, sh: height }
  }
  const sh = Math.max(1, Math.round(height * (1 - pct / 100)))
  return { sx: 0, sy: 0, sw: width, sh }
}

/**
 * FFmpeg crop filter fragment (includes trailing comma when non-empty).
 */
export function buildFfmpegBottomCropFilter(cropPercent: unknown): string {
  const pct = clampWatermarkCropPercent(cropPercent)
  if (!pct) return ''
  const factor = 1 - pct / 100
  return `crop=iw:ih*${factor}:0:0,`
}

/**
 * CSS clip-path inset for preview (percent of element box, bottom edge).
 */
export function getBottomCropClipPath(cropPercent: unknown): string | undefined {
  const pct = clampWatermarkCropPercent(cropPercent)
  if (!pct) return undefined
  return `inset(0 0 ${pct}% 0)`
}
