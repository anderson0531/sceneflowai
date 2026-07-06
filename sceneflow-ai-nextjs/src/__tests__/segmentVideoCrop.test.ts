import { describe, it, expect } from 'vitest'
import {
  buildFfmpegBottomCropFilter,
  clampWatermarkCropPercent,
  getBottomCropClipPath,
  getBottomCropSourceRect,
  WATERMARK_CROP_DEFAULT,
} from '@/lib/video/segmentVideoCrop'

describe('clampWatermarkCropPercent', () => {
  it('accepts 2–10 and rejects out of range', () => {
    expect(clampWatermarkCropPercent(5)).toBe(5)
    expect(clampWatermarkCropPercent(2)).toBe(2)
    expect(clampWatermarkCropPercent(10)).toBe(10)
    expect(clampWatermarkCropPercent(1)).toBeUndefined()
    expect(clampWatermarkCropPercent(11)).toBeUndefined()
    expect(clampWatermarkCropPercent(undefined)).toBeUndefined()
  })
})

describe('getBottomCropSourceRect', () => {
  it('removes bottom percent from height', () => {
    expect(getBottomCropSourceRect(1920, 1000, 5)).toEqual({
      sx: 0,
      sy: 0,
      sw: 1920,
      sh: 950,
    })
  })

  it('returns full frame when crop invalid', () => {
    expect(getBottomCropSourceRect(800, 600, 0)).toEqual({
      sx: 0,
      sy: 0,
      sw: 800,
      sh: 600,
    })
  })
})

describe('buildFfmpegBottomCropFilter', () => {
  it('builds crop expression for valid percent', () => {
    expect(buildFfmpegBottomCropFilter(5)).toBe('crop=iw:ih*0.95:0:0,')
    expect(buildFfmpegBottomCropFilter(10)).toBe('crop=iw:ih*0.9:0:0,')
    expect(buildFfmpegBottomCropFilter(2)).toBe('crop=iw:ih*0.98:0:0,')
  })

  it('returns empty when disabled', () => {
    expect(buildFfmpegBottomCropFilter(undefined)).toBe('')
  })
})

describe('getBottomCropClipPath', () => {
  it('returns inset clip path for preview', () => {
    expect(getBottomCropClipPath(WATERMARK_CROP_DEFAULT)).toBe('inset(0 0 5% 0)')
    expect(getBottomCropClipPath(undefined)).toBeUndefined()
  })
})
