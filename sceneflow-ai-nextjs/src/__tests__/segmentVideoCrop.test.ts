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
  it('crops evenly from all sides while preserving aspect ratio', () => {
    expect(getFrameCropSourceRect(1920, 1080, 5)).toEqual({
      sx: 48,
      sy: 27,
      sw: 1824,
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
  it('builds centered crop expression for valid percent', () => {
    expect(buildFfmpegFrameCropFilter(5)).toBe(
      'crop=iw*0.95:ih*0.95:(iw-iw*0.95)/2:(ih-ih*0.95)/2,'
    )
    expect(buildFfmpegFrameCropFilter(10)).toBe(
      'crop=iw*0.9:ih*0.9:(iw-iw*0.9)/2:(ih-ih*0.9)/2,'
    )
  })

  it('returns empty when disabled', () => {
    expect(buildFfmpegFrameCropFilter(undefined)).toBe('')
  })
})

describe('getFrameCropClipPath', () => {
  it('returns even inset clip path for preview', () => {
    expect(getFrameCropClipPath(WATERMARK_CROP_DEFAULT)).toBe('inset(2.5% 2.5% 2.5% 2.5%)')
    expect(getFrameCropClipPath(undefined)).toBeUndefined()
  })
})
