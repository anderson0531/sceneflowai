import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import {
  COMBINED_CHARACTER_REF_HEIGHT,
  COMBINED_CHARACTER_REF_WIDTH,
  FACE_BADGE_DIAMETER,
  FACE_BADGE_PADDING_PX,
  FACE_BADGE_RING_PX,
  composeIdentityWardrobeDiptych,
  composeIdentityWardrobePipBuffers,
  composePipFromDiptychBuffer,
  consolidateBeatCharacterRefsIntoPipBadges,
  cropIdentityPlateForPro,
  hasVerticalCenterSeam,
  identityPlateNeedsFaceCrop,
  IDENTITY_PRO_CU_SIZE,
  looksLikeHorizontalDiptych,
  splitHorizontalDiptychBuffer,
  stitchIdentityWardrobeBuffers,
  expandLeftoverDiptychSheetsIntoDualSlots,
} from '@/lib/character/composeIdentityWardrobeDiptych'

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

function badgeCenter(): { x: number; y: number } {
  const outer = FACE_BADGE_DIAMETER + FACE_BADGE_RING_PX * 2
  const left = COMBINED_CHARACTER_REF_WIDTH - FACE_BADGE_PADDING_PX - outer
  const top = FACE_BADGE_PADDING_PX
  return {
    x: left + FACE_BADGE_RING_PX + Math.floor(FACE_BADGE_DIAMETER / 2),
    y: top + FACE_BADGE_RING_PX + Math.floor(FACE_BADGE_DIAMETER / 2),
  }
}

describe('composeIdentityWardrobePipBuffers', () => {
  it('emits a 16:9 canvas with a circular face badge and no vertical seam', async () => {
    const identity = await solidJpeg(400, 400, { r: 180, g: 40, b: 40 })
    const wardrobe = await solidJpeg(800, 200, { r: 40, g: 80, b: 180 })

    const composed = await composeIdentityWardrobePipBuffers(identity, wardrobe)
    const meta = await sharp(composed).metadata()
    expect(meta.width).toBe(COMBINED_CHARACTER_REF_WIDTH)
    expect(meta.height).toBe(COMBINED_CHARACTER_REF_HEIGHT)
    expect(meta.format).toBe('jpeg')

    const { data, info } = await sharp(composed).raw().toBuffer({ resolveWithObject: true })
    const { x: bx, y: by } = badgeCenter()
    const [br, bg, bb] = pixelAt(data, info, bx, by)
    expect(br).toBeGreaterThan(120)
    expect(bg).toBeLessThan(80)

    const [cr, cg, cb] = pixelAt(data, info, 960, 540)
    expect(cb).toBeGreaterThan(120)
    expect(cr).toBeLessThan(80)

    const seam = await hasVerticalCenterSeam(composed)
    expect(seam).toBe(false)
  })

  it('letterboxes a wide wardrobe sheet instead of cropping it', async () => {
    const identity = await solidJpeg(200, 200, { r: 10, g: 10, b: 10 })
    const wardrobe = await solidJpeg(1200, 200, { r: 0, g: 255, b: 0 })

    const composed = await composeIdentityWardrobePipBuffers(identity, wardrobe)
    const { data, info } = await sharp(composed).raw().toBuffer({ resolveWithObject: true })

    const [r, g, b] = pixelAt(data, info, 20, 8)
    expect(r).toBeLessThan(40)
    expect(g).toBeLessThan(40)
    expect(b).toBeLessThan(40)

    const [, midG] = pixelAt(data, info, 400, Math.floor(info.height / 2))
    expect(midG).toBeGreaterThan(200)
  })

  it('keeps stitchIdentityWardrobeBuffers as a PiP alias', async () => {
    expect(stitchIdentityWardrobeBuffers).toBe(composeIdentityWardrobePipBuffers)
  })
})

describe('diptych split then PiP', () => {
  it('splits a 50/50 sheet and rebuilds it as a corner-badge reference', async () => {
    const left = await solidJpeg(960, 1080, { r: 200, g: 30, b: 30 })
    const right = await solidJpeg(960, 1080, { r: 30, g: 180, b: 40 })
    const diptych = await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite([
        { input: left, left: 0, top: 0 },
        { input: right, left: 960, top: 0 },
      ])
      .jpeg()
      .toBuffer()

    expect(await looksLikeHorizontalDiptych(diptych)).toBe(true)

    const { identity, wardrobe } = await splitHorizontalDiptychBuffer(diptych)
    const identityMeta = await sharp(identity).metadata()
    expect(identityMeta.width).toBe(960)

    const pip = await composePipFromDiptychBuffer(diptych)
    const { data, info } = await sharp(pip).raw().toBuffer({ resolveWithObject: true })
    const { x: bx, y: by } = badgeCenter()
    const [br] = pixelAt(data, info, bx, by)
    expect(br).toBeGreaterThan(120)

    const [, midG] = pixelAt(data, info, 960, 540)
    expect(midG).toBeGreaterThan(120)
    expect(await hasVerticalCenterSeam(pip)).toBe(false)
  })
})

describe('consolidateBeatCharacterRefsIntoPipBadges', () => {
  it('replaces a dual-ref pair with one combined character slot', async () => {
    const refs = await consolidateBeatCharacterRefsIntoPipBadges(
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
        width: COMBINED_CHARACTER_REF_WIDTH,
        height: COMBINED_CHARACTER_REF_HEIGHT,
      })
    )

    expect(refs).toHaveLength(1)
    expect(refs[0].hasWardrobeDiptych).toBe(true)
    expect(refs[0].hasDualReferences).toBe(false)
    expect(refs[0].identityImageUrl).toBe('https://example.com/gideon-face.jpg')
    expect(refs[0].identityReferenceId).toBe(1)
    expect(refs[0].wardrobeImageUrl).toBeUndefined()
    expect(refs[0].wardrobeDiptychImageUrl).toBe('data:image/jpeg;base64,aaa')
    expect(refs[0].diptychReferenceId).toBe(2)
    expect(refs[0].description).not.toMatch(/RIGHT panel/i)
    expect(refs[0].description).toContain('character reference')
  })

  it('leaves a stored PiP Blob URL alone', async () => {
    const refs = await consolidateBeatCharacterRefsIntoPipBadges(
      [
        {
          name: 'Gideon Croft',
          hasWardrobeDiptych: true,
          isStoredPip: true,
          wardrobeDiptychImageUrl: 'https://example.com/gideon-pip.jpg',
          imageUrl: 'https://example.com/gideon-pip.jpg',
        },
      ],
      {
        composePair: async () => {
          throw new Error('composePair should not run for a stored PiP')
        },
        composeDiptych: async () => {
          throw new Error('composeDiptych should not run for a stored PiP')
        },
      }
    )

    expect(refs[0].wardrobeDiptychImageUrl).toBe('https://example.com/gideon-pip.jpg')
    expect(refs[0].isStoredPip).toBe(true)
  })

  it('keeps a stored PiP identity headshot URL for likeness scoring', async () => {
    const refs = await consolidateBeatCharacterRefsIntoPipBadges(
      [
        {
          name: 'Piper Hayes',
          hasWardrobeDiptych: true,
          isStoredPip: true,
          identityImageUrl: 'https://example.com/piper-face.jpg',
          identityReferenceId: 1,
          diptychReferenceId: 2,
          wardrobeDiptychImageUrl: 'https://example.com/piper-pip.jpg',
        },
      ],
      {
        composePair: async () => {
          throw new Error('composePair should not run for a stored PiP')
        },
        composeDiptych: async () => {
          throw new Error('composeDiptych should not run for a stored PiP')
        },
      }
    )

    expect(refs[0].identityImageUrl).toBe('https://example.com/piper-face.jpg')
    expect(refs[0].identityReferenceId).toBe(1)
    expect(refs[0].wardrobeDiptychImageUrl).toBe('https://example.com/piper-pip.jpg')
    expect(refs[0].diptychReferenceId).toBe(2)
  })

  it('attaches a persisted Blob URL instead of a data URL', async () => {
    const persistCombined = vi.fn(async () => 'https://blob.example/gideon-pip.jpg')
    const refs = await consolidateBeatCharacterRefsIntoPipBadges(
      [
        {
          name: 'Gideon Croft',
          hasDualReferences: true,
          identityImageUrl: 'https://example.com/gideon-face.jpg',
          wardrobeImageUrl: 'https://example.com/gideon-wardrobe.jpg',
          characterId: 'c1',
          wardrobeId: 'w1',
        },
      ],
      {
        composePair: async () => ({
          base64: 'aaa',
          mimeType: 'image/jpeg',
          dataUrl: 'data:image/jpeg;base64,aaa',
          width: COMBINED_CHARACTER_REF_WIDTH,
          height: COMBINED_CHARACTER_REF_HEIGHT,
        }),
        persistCombined,
      }
    )

    expect(persistCombined).toHaveBeenCalledOnce()
    expect(refs[0].wardrobeDiptychImageUrl).toBe('https://blob.example/gideon-pip.jpg')
    expect(refs[0].isStoredPip).toBe(true)
    expect(refs[0].hasDualReferences).toBe(false)
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

    const refs = await consolidateBeatCharacterRefsIntoPipBadges([original], async () => null)

    expect(refs[0]).toEqual(original)
  })

  it('converts a stored two-panel sheet through composeDiptych', async () => {
    const refs = await consolidateBeatCharacterRefsIntoPipBadges(
      [
        {
          name: 'Julian Ward',
          hasWardrobeDiptych: true,
          wardrobeDiptychImageUrl: 'https://example.com/julian-diptych.jpg',
        },
      ],
      {
        composePair: async () => {
          throw new Error('composePair should not run')
        },
        composeDiptych: async () => ({
          base64: 'bbb',
          mimeType: 'image/jpeg',
          dataUrl: 'data:image/jpeg;base64,bbb',
          width: COMBINED_CHARACTER_REF_WIDTH,
          height: COMBINED_CHARACTER_REF_HEIGHT,
        }),
      }
    )

    expect(refs[0].wardrobeDiptychImageUrl).toBe('data:image/jpeg;base64,bbb')
    expect(refs[0].hasWardrobeDiptych).toBe(true)
  })

  it('leaves a combined data-URL slot alone', async () => {
    const refs = await consolidateBeatCharacterRefsIntoPipBadges(
      [
        {
          name: 'Julian Ward',
          hasWardrobeDiptych: true,
          wardrobeDiptychImageUrl: 'data:image/jpeg;base64,already',
        },
      ],
      {
        composeDiptych: async () => {
          throw new Error('composeDiptych should not run for data URLs')
        },
      }
    )

    expect(refs[0].wardrobeDiptychImageUrl).toBe('data:image/jpeg;base64,already')
  })
})

describe('expandLeftoverDiptychSheetsIntoDualSlots', () => {
  it('leaves dual identity + wardrobe refs alone', async () => {
    const original = {
      name: 'Gideon Croft',
      hasDualReferences: true,
      identityImageUrl: 'https://example.com/gideon-face.jpg',
      wardrobeImageUrl: 'https://example.com/gideon-wardrobe.jpg',
      identityReferenceId: 1,
      wardrobeReferenceId: 2,
    }

    const refs = await expandLeftoverDiptychSheetsIntoDualSlots([original], {
      splitDiptych: async () => {
        throw new Error('splitDiptych should not run for dual refs')
      },
    })

    expect(refs[0]).toEqual(original)
  })

  it('splits a leftover two-panel sheet into original identity + RIGHT wardrobe', async () => {
    const refs = await expandLeftoverDiptychSheetsIntoDualSlots(
      [
        {
          name: 'Julian Ward',
          hasWardrobeDiptych: true,
          identityImageUrl: 'https://example.com/julian-face.jpg',
          wardrobeDiptychImageUrl: 'https://example.com/julian-diptych.jpg',
          identityReferenceId: 1,
          diptychReferenceId: 2,
          description:
            'Julian Ward, copy outfit from the RIGHT panel of their wardrobe diptych reference only — do not describe clothing in text',
        },
      ],
      {
        splitDiptych: async () => ({
          identityDataUrl: 'data:image/jpeg;base64,left',
          wardrobeDataUrl: 'data:image/jpeg;base64,right',
        }),
      }
    )

    expect(refs[0].hasDualReferences).toBe(true)
    expect(refs[0].hasWardrobeDiptych).toBe(false)
    expect(refs[0].identityImageUrl).toBe('https://example.com/julian-face.jpg')
    expect(refs[0].wardrobeImageUrl).toBe('data:image/jpeg;base64,right')
    expect(refs[0].wardrobeDiptychImageUrl).toBeUndefined()
    expect(refs[0].identityReferenceId).toBe(1)
    expect(refs[0].wardrobeReferenceId).toBe(2)
    expect(refs[0].description).toContain('wardrobe reference image')
    expect(refs[0].description).not.toMatch(/RIGHT panel/i)
  })

  it('drops a stored PiP card instead of attaching it', async () => {
    const refs = await expandLeftoverDiptychSheetsIntoDualSlots(
      [
        {
          name: 'Gideon Croft',
          hasWardrobeDiptych: true,
          isStoredPip: true,
          identityImageUrl: 'https://example.com/gideon-face.jpg',
          wardrobeImageUrl: 'https://example.com/gideon-wardrobe.jpg',
          wardrobeDiptychImageUrl: 'https://example.com/gideon-pip.jpg',
        },
      ],
      {
        splitDiptych: async () => {
          throw new Error('must not split a stored PiP card')
        },
      }
    )

    expect(refs[0].hasWardrobeDiptych).toBe(false)
    expect(refs[0].isStoredPip).toBe(false)
    expect(refs[0].wardrobeDiptychImageUrl).toBeUndefined()
    expect(refs[0].identityImageUrl).toBe('https://example.com/gideon-face.jpg')
    expect(refs[0].wardrobeImageUrl).toBe('https://example.com/gideon-wardrobe.jpg')
  })

  it('keeps identity only when leftover split fails', async () => {
    const refs = await expandLeftoverDiptychSheetsIntoDualSlots(
      [
        {
          name: 'Piper Hayes',
          hasWardrobeDiptych: true,
          identityImageUrl: 'https://example.com/piper-face.jpg',
          wardrobeDiptychImageUrl: 'https://example.com/piper-diptych.jpg',
        },
      ],
      {
        splitDiptych: async () => null,
      }
    )

    expect(refs[0].hasWardrobeDiptych).toBe(false)
    expect(refs[0].wardrobeDiptychImageUrl).toBeUndefined()
    expect(refs[0].identityImageUrl).toBe('https://example.com/piper-face.jpg')
    expect(refs[0].wardrobeImageUrl).toBeUndefined()
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

describe('cropIdentityPlateForPro', () => {
  it('passes through a square or 9:16 headshot', async () => {
    expect(identityPlateNeedsFaceCrop(1024, 1024)).toBe(false)
    expect(identityPlateNeedsFaceCrop(720, 1280)).toBe(false)
    const square = await solidJpeg(400, 400, { r: 180, g: 40, b: 40 })
    const result = await cropIdentityPlateForPro(square)
    expect(result.cropped).toBe(false)
    expect(result.buffer).toBe(square)
  })

  it('centre-crops a wide cinematic portrait to a 1:1 CU', async () => {
    const wide = await solidJpeg(1920, 800, { r: 40, g: 80, b: 180 })
    const result = await cropIdentityPlateForPro(wide)
    expect(result.cropped).toBe(true)
    expect(result.reason).toBe('wide-portrait')
    const meta = await sharp(result.buffer).metadata()
    expect(meta.width).toBe(IDENTITY_PRO_CU_SIZE)
    expect(meta.height).toBe(IDENTITY_PRO_CU_SIZE)
  })

  it('extracts the PiP face badge instead of the full-body canvas', async () => {
    const identity = await solidJpeg(400, 400, { r: 180, g: 40, b: 40 })
    const wardrobe = await solidJpeg(800, 200, { r: 40, g: 80, b: 180 })
    const pip = await composeIdentityWardrobePipBuffers(identity, wardrobe)

    const result = await cropIdentityPlateForPro(pip)
    expect(result.cropped).toBe(true)
    expect(result.reason).toBe('pip-badge')

    const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true })
    const i = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels
    expect(data[i]).toBeGreaterThan(120)
    expect(data[i + 1]).toBeLessThan(80)
  })
})
