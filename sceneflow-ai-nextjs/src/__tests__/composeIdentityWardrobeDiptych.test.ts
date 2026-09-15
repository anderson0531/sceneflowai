import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  IDENTITY_WARDROBE_DIPTYCH_HEIGHT,
  IDENTITY_WARDROBE_DIPTYCH_WIDTH,
  composeIdentityWardrobeDiptych,
  consolidateBeatDualRefsIntoDiptychs,
  stitchIdentityWardrobeBuffers,
} from '@/lib/character/composeIdentityWardrobeDiptych'

async function solidJpeg(width: number, height: number, color: { r: number; g: number; b: number }) {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .jpeg()
    .toBuffer()
}

describe('stitchIdentityWardrobeBuffers', () => {
  it('emits a 16:9 two-panel card', async () => {
    const identity = await solidJpeg(400, 400, { r: 180, g: 40, b: 40 })
    const wardrobe = await solidJpeg(800, 200, { r: 40, g: 80, b: 180 })

    const stitched = await stitchIdentityWardrobeBuffers(identity, wardrobe)
    const meta = await sharp(stitched).metadata()

    expect(meta.width).toBe(IDENTITY_WARDROBE_DIPTYCH_WIDTH)
    expect(meta.height).toBe(IDENTITY_WARDROBE_DIPTYCH_HEIGHT)
    expect(meta.format).toBe('jpeg')
  })

  it('letterboxes a wide wardrobe sheet instead of cropping it', async () => {
    const identity = await solidJpeg(200, 200, { r: 10, g: 10, b: 10 })
    const wardrobe = await solidJpeg(1200, 200, { r: 0, g: 255, b: 0 })

    const stitched = await stitchIdentityWardrobeBuffers(identity, wardrobe)
    const { data, info } = await sharp(stitched)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixel = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels
      return [data[i], data[i + 1], data[i + 2]]
    }

    // Top of the right panel is letterbox, not a cropped slice of the green sheet.
    const [r, g, b] = pixel(IDENTITY_WARDROBE_DIPTYCH_WIDTH - 20, 8)
    expect(r).toBeLessThan(40)
    expect(g).toBeLessThan(40)
    expect(b).toBeLessThan(40)

    // Mid-right still holds the contained wardrobe (green).
    const [, midG] = pixel(IDENTITY_WARDROBE_DIPTYCH_WIDTH - 80, Math.floor(info.height / 2))
    expect(midG).toBeGreaterThan(200)
  })
})

describe('consolidateBeatDualRefsIntoDiptychs', () => {
  it('replaces a dual-ref pair with one diptych slot', async () => {
    const refs = await consolidateBeatDualRefsIntoDiptychs(
      [
        {
          name: 'Gideon Croft',
          hasDualReferences: true,
          identityImageUrl: 'https://example.com/gideon-face.jpg',
          wardrobeImageUrl: 'https://example.com/gideon-wardrobe.jpg',
          identityReferenceId: 1,
          wardrobeReferenceId: 2,
          referenceId: 1,
          description: 'Gideon Croft, wearing the outfit shown in their wardrobe reference image',
        },
      ],
      async () => ({
        base64: 'aaa',
        mimeType: 'image/jpeg',
        dataUrl: 'data:image/jpeg;base64,aaa',
        width: IDENTITY_WARDROBE_DIPTYCH_WIDTH,
        height: IDENTITY_WARDROBE_DIPTYCH_HEIGHT,
      })
    )

    expect(refs).toHaveLength(1)
    expect(refs[0].hasWardrobeDiptych).toBe(true)
    expect(refs[0].hasDualReferences).toBe(false)
    expect(refs[0].identityImageUrl).toBeUndefined()
    expect(refs[0].wardrobeImageUrl).toBeUndefined()
    expect(refs[0].wardrobeDiptychImageUrl).toBe('data:image/jpeg;base64,aaa')
    expect(refs[0].diptychReferenceId).toBe(1)
    expect(refs[0].description).toContain('RIGHT panel')
  })

  it('keeps dual refs when stitching fails', async () => {
    const original = {
      name: 'Piper Hayes',
      hasDualReferences: true,
      identityImageUrl: 'https://example.com/piper-face.jpg',
      wardrobeImageUrl: 'https://example.com/piper-wardrobe.jpg',
      identityReferenceId: 3,
      wardrobeReferenceId: 4,
    }

    const refs = await consolidateBeatDualRefsIntoDiptychs([original], async () => null)

    expect(refs[0]).toEqual(original)
  })

  it('leaves characters that already have a diptych alone', async () => {
    const refs = await consolidateBeatDualRefsIntoDiptychs(
      [
        {
          name: 'Julian Ward',
          hasDualReferences: true,
          hasWardrobeDiptych: true,
          identityImageUrl: 'https://example.com/julian-face.jpg',
          wardrobeImageUrl: 'https://example.com/julian-wardrobe.jpg',
          wardrobeDiptychImageUrl: 'https://example.com/julian-diptych.jpg',
        },
      ],
      async () => {
        throw new Error('compose should not run')
      }
    )

    expect(refs[0].wardrobeDiptychImageUrl).toBe('https://example.com/julian-diptych.jpg')
    expect(refs[0].hasDualReferences).toBe(true)
  })
})

describe('composeIdentityWardrobeDiptych', () => {
  it('returns null when a source URL cannot be fetched', async () => {
    const result = await composeIdentityWardrobeDiptych({
      identityUrl: 'https://127.0.0.1:1/missing-identity.jpg',
      wardrobeUrl: 'https://127.0.0.1:1/missing-wardrobe.jpg',
      label: 'Nobody',
    })
    expect(result).toBeNull()
  })
})
