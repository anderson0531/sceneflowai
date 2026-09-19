import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  buildLocationScaleOverlaySvg,
  isLocationReferencePartName,
  overlayLocationScaleOnBuffer,
  overlayLocationScaleOnReferenceImages,
} from '@/lib/vision/locationScaleOverlay'
import { DEFAULT_LOCATION_CANONICAL_SCALE } from '@/lib/imagen/locationScaleClause'

async function solidJpeg(width: number, height: number, color: { r: number; g: number; b: number }) {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer()
}

function pixelAt(
  data: Buffer,
  info: { width: number; channels: number },
  x: number,
  y: number
): [number, number, number] {
  const i = (y * info.width + x) * info.channels
  return [data[i], data[i + 1], data[i + 2]]
}

describe('locationScaleOverlay', () => {
  it('treats location plates as overlay targets and leaves identity/prop alone', () => {
    expect(isLocationReferencePartName('Location reference 1: VAULT', 'location')).toBe(true)
    expect(isLocationReferencePartName('IDENTITY of person [1] (Piper)')).toBe(false)
    expect(isLocationReferencePartName('PROP prop [1] (Lantern)')).toBe(false)
    expect(isLocationReferencePartName('Wardrobe of Piper')).toBe(false)
  })

  it('draws the scale strip on the right margin without changing canvas size', async () => {
    const original = await solidJpeg(1600, 900, { r: 200, g: 30, b: 30 })
    const overlaid = await overlayLocationScaleOnBuffer(original, DEFAULT_LOCATION_CANONICAL_SCALE)
    const { data, info } = await sharp(overlaid).raw().toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(1600)
    expect(info.height).toBe(900)
    const left = pixelAt(data, info, 80, 450)
    expect(left[0]).toBeGreaterThan(150)
    const right = pixelAt(data, info, 1580, 450)
    expect(right[0]).toBeLessThan(80)
    expect(right[1]).toBeLessThan(40)
  })

  it('leaves non-location refs unchanged and overlays location base64 in place', async () => {
    const original = await solidJpeg(800, 450, { r: 20, g: 180, b: 40 })
    const result = await overlayLocationScaleOnReferenceImages([
      { name: 'IDENTITY of Piper', base64Image: original.toString('base64') },
      {
        name: 'Location reference 1: VAULT',
        role: 'location',
        locationName: 'VAULT',
        base64Image: original.toString('base64'),
      },
    ])
    expect(result[0]?.base64Image).toBe(original.toString('base64'))
    expect(result[1]?.base64Image).not.toBe(original.toString('base64'))
    expect(buildLocationScaleOverlaySvg(100, 100, DEFAULT_LOCATION_CANONICAL_SCALE)).toContain('7ft door')
  })
})
