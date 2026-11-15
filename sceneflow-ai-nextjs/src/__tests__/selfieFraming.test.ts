import { describe, expect, it } from 'vitest'
import {
  applyPixelDragToSelfieTransform,
  clampSelfieCropTransform,
  computeAutoCenterTransformFromFaceBox,
  computeSelfieSourceCropRect,
  DEFAULT_SELFIE_CROP_TRANSFORM,
  evaluateSelfieLighting,
  SELFIE_TARGET_ASPECT,
} from '@/lib/character/selfieFraming'

describe('selfieFraming', () => {
  it('clamps out-of-range crop transform values safely', () => {
    const clamped = clampSelfieCropTransform({
      panX: 4,
      panY: -3,
      zoom: 99,
      rotationDeg: -45,
      flipHorizontal: true,
    })
    expect(clamped).toEqual({
      panX: 1,
      panY: -1,
      zoom: 2.5,
      rotationDeg: -15,
      flipHorizontal: true,
    })

    const nanClamped = clampSelfieCropTransform({
      panX: Number.NaN,
      zoom: Number.POSITIVE_INFINITY,
    })
    expect(nanClamped.panX).toBe(0)
    expect(nanClamped.zoom).toBe(1)
  })

  it('computes exact 9:16 inscribed crop from 16:9 desktop webcam dimensions', () => {
    const rect = computeSelfieSourceCropRect(1920, 1080, DEFAULT_SELFIE_CROP_TRANSFORM)
    expect(rect.cropHeight).toBeCloseTo(1080, 4)
    expect(rect.cropWidth).toBeCloseTo(607.5, 4)
    expect(rect.cropWidth / rect.cropHeight).toBeCloseTo(SELFIE_TARGET_ASPECT, 6)
    expect(rect.centerX).toBeCloseTo(960, 4)
    expect(rect.centerY).toBeCloseTo(540, 4)
    expect(rect.slackX).toBeCloseTo((1920 - 607.5) / 2, 4)
    expect(rect.slackY).toBeCloseTo(0, 4)
  })

  it('keeps all 4 rotated crop corners strictly inside source bounds at ±15° and max pan', () => {
    for (const [w, h] of [
      [1920, 1080],
      [1280, 720],
      [640, 480],
      [1080, 1920],
    ]) {
      for (const rotationDeg of [-15, -7.5, 7.5, 15]) {
        for (const panX of [-1, 0, 1]) {
          for (const panY of [-1, 0, 1]) {
            const rect = computeSelfieSourceCropRect(w, h, {
              panX,
              panY,
              zoom: 1,
              rotationDeg,
              flipHorizontal: false,
            })
            const rad = (rotationDeg * Math.PI) / 180
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            const hw = rect.cropWidth / 2
            const hh = rect.cropHeight / 2

            for (const [cx, cy] of [
              [-hw, -hh],
              [hw, -hh],
              [-hw, hh],
              [hw, hh],
            ]) {
              const sx = rect.centerX + cx * cos - cy * sin
              const sy = rect.centerY + cx * sin + cy * cos
              expect(sx).toBeGreaterThanOrEqual(-1e-4)
              expect(sx).toBeLessThanOrEqual(w + 1e-4)
              expect(sy).toBeGreaterThanOrEqual(-1e-4)
              expect(sy).toBeLessThanOrEqual(h + 1e-4)
            }
          }
        }
      }
    }
  })

  it('converts pointer drags to normalized pan and respects horizontal flip', () => {
    const base = { ...DEFAULT_SELFIE_CROP_TRANSFORM, zoom: 1.5 }
    const unflipped = applyPixelDragToSelfieTransform(
      1920,
      1080,
      300,
      533,
      60,
      30,
      base
    )
    expect(unflipped.panX).toBeLessThan(0)
    expect(unflipped.panY).toBeLessThan(0)

    const flipped = applyPixelDragToSelfieTransform(
      1920,
      1080,
      300,
      533,
      60,
      30,
      { ...base, flipHorizontal: true }
    )
    expect(flipped.panX).toBeGreaterThan(0)
    expect(flipped.panX).toBeCloseTo(-unflipped.panX, 5)
  })

  it('auto-centers a detected face onto the 9:16 upper-third eye line', () => {
    // Small off-center face in a 1920x1080 webcam frame
    const transform = computeAutoCenterTransformFromFaceBox(1920, 1080, {
      x: 1180,
      y: 260,
      width: 200,
      height: 240,
    })
    expect(transform.zoom).toBeGreaterThan(1.3)
    expect(transform.panX).toBeGreaterThan(0.2)

    const rect = computeSelfieSourceCropRect(1920, 1080, transform)
    const eyeLineY = 260 + 240 * 0.38
    const normalizedEyePosInCrop =
      (eyeLineY - (rect.centerY - rect.cropHeight / 2)) / rect.cropHeight
    expect(normalizedEyePosInCrop).toBeCloseTo(0.36, 1)
  })

  it('evaluates low light, backlight, overexposure, and balanced lighting', () => {
    const w = 64
    const h = 36
    const makeBuffer = (
      fillPixel: (x: number, y: number) => [number, number, number]
    ) => {
      const buf = new Uint8ClampedArray(w * h * 4)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const [r, g, b] = fillPixel(x, y)
          const idx = (y * w + x) * 4
          buf[idx] = r
          buf[idx + 1] = g
          buf[idx + 2] = b
          buf[idx + 3] = 255
        }
      }
      return buf
    }

    const dark = evaluateSelfieLighting(makeBuffer(() => [22, 24, 25]), w, h)
    expect(dark.status).toBe('low_light')
    expect(dark.message).toMatch(/dim lighting/i)

    const good = evaluateSelfieLighting(makeBuffer(() => [135, 130, 125]), w, h)
    expect(good.status).toBe('good')
    expect(good.message).toBeNull()

    const overexposed = evaluateSelfieLighting(makeBuffer(() => [245, 245, 245]), w, h)
    expect(overexposed.status).toBe('overexposed')

    const backlit = evaluateSelfieLighting(
      makeBuffer((x) => (x >= 24 && x <= 40 ? [65, 65, 65] : [250, 250, 250])),
      w,
      h
    )
    expect(backlit.status).toBe('backlit')
    expect(backlit.message).toMatch(/backlight/i)
  })
})
