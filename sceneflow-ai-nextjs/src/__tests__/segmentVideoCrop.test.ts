import { describe, it, expect } from 'vitest'
import {
  buildFfmpegFrameCropFilter,
  clampWatermarkCropPercent,
  getFrameCropClipPath,
  getFrameCropSourceRect,
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

describe('getFrameCropSourceRect', () => {
  it('crops from the bottom edge only', () => {
    expect(getFrameCropSourceRect(1920, 1080, 5)).toEqual({
      sx: 0,
      sy: 0,
      sw: 1920,
      sh: 1026,
    })
  })

  it('returns full frame when crop invalid', () => {
    expect(getFrameCropSourceRect(800, 600, 0)).toEqual({
      sx: 0,
      sy: 0,
      sw: 800,
      sh: 600,
    })
  })
})

describe('buildFfmpegFrameCropFilter', () => {
  it('builds bottom crop expression for valid percent', () => {
    expect(buildFfmpegFrameCropFilter(5)).toBe('crop=iw:ih*0.95:0:0,')
    expect(buildFfmpegFrameCropFilter(10)).toBe('crop=iw:ih*0.9:0:0,')
  })

  it('returns empty when disabled', () => {
    expect(buildFfmpegFrameCropFilter(undefined)).toBe('')
  })
})

describe('getFrameCropClipPath', () => {
  it('returns bottom inset clip path for preview', () => {
    expect(getFrameCropClipPath(WATERMARK_CROP_DEFAULT)).toBe('inset(0 0 5% 0)')
    expect(getFrameCropClipPath(undefined)).toBeUndefined()
  })
})
