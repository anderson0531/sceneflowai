import { readFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const BADGE_PATH = join(process.cwd(), 'public/brand/sf-badge.png')

describe('sf-badge.png brand asset', () => {
  it('is RGBA with transparent pixels and a wide opaque span', async () => {
    const file = readFileSync(BADGE_PATH)
    const meta = await sharp(file).metadata()
    expect(meta.width).toBe(81)
    expect(meta.height).toBe(44)
    expect(meta.channels).toBe(4)
    expect(meta.hasAlpha).toBe(true)

    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    let transparent = 0
    let minOpaqueX = info.width
    let maxOpaqueX = -1

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const alpha = data[(y * info.width + x) * 4 + 3]
        if (alpha < 16) {
          transparent++
        } else {
          if (x < minOpaqueX) minOpaqueX = x
          if (x > maxOpaqueX) maxOpaqueX = x
        }
      }
    }

    expect(transparent).toBeGreaterThan(0)
    const opaqueSpan =
      maxOpaqueX >= minOpaqueX ? (maxOpaqueX - minOpaqueX + 1) / info.width : 0
    expect(opaqueSpan).toBeGreaterThan(0.85)
  })
})
