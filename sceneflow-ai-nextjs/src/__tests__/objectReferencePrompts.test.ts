import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  OBJECT_REFERENCE_GENERATION_INSTRUCTION,
  OBJECT_REFERENCE_ISOLATION,
  OBJECT_REFERENCE_NEGATIVE_PROMPT,
  OBJECT_REFERENCE_PURPOSE,
  OBJECT_REFERENCE_REAL_WORLD_SCALE,
  OBJECT_REFERENCE_SCALE_RULER,
  withObjectReferenceInstruction,
} from '@/lib/vision/objectReferencePrompts'
import { buildObjectReferencePrompt } from '@/lib/vision/referenceExpressPrompts'

describe('objectReferencePrompts', () => {
  it('leads with purpose, isolation, and a scale ruler as the only extra', () => {
    expect(OBJECT_REFERENCE_PURPOSE).toBe(
      'Create the image to be used as a reference image for consistency across image and video generations.'
    )
    expect(OBJECT_REFERENCE_ISOLATION).toMatch(/isolated subject only/i)
    expect(OBJECT_REFERENCE_ISOLATION).toMatch(/do not add people, hands, tables/i)
    expect(OBJECT_REFERENCE_ISOLATION).toMatch(/not a scene/i)
    expect(OBJECT_REFERENCE_SCALE_RULER).toMatch(/ruler or height\/width/i)
    expect(OBJECT_REFERENCE_SCALE_RULER).toMatch(/beside the object/i)
    expect(OBJECT_REFERENCE_SCALE_RULER).toMatch(/never engrave, print, paint, or draw measurements/i)
    expect(OBJECT_REFERENCE_SCALE_RULER).toMatch(/on the object itself/i)
    expect(OBJECT_REFERENCE_SCALE_RULER).toMatch(/nothing else/i)
    expect(OBJECT_REFERENCE_SCALE_RULER).not.toMatch(/marks on the object are allowed/i)
    expect(OBJECT_REFERENCE_GENERATION_INSTRUCTION).toContain(OBJECT_REFERENCE_PURPOSE)
    expect(OBJECT_REFERENCE_GENERATION_INSTRUCTION).toContain(OBJECT_REFERENCE_REAL_WORLD_SCALE)
  })

  it('appends the block to a bare object description without duplicating it', () => {
    const first = withObjectReferenceInstruction('12-inch metal sample canister, handheld')
    expect(first.startsWith('12-inch metal sample canister, handheld')).toBe(true)
    expect(first).toContain(OBJECT_REFERENCE_PURPOSE)
    expect(first).toContain(OBJECT_REFERENCE_ISOLATION)
    expect(first).toContain(OBJECT_REFERENCE_SCALE_RULER)
    expect(first).toMatch(/true real-world scale/i)

    const second = withObjectReferenceInstruction(first)
    expect(second).toBe(first)

    const legacy = withObjectReferenceInstruction(
      '12-inch bar. A simple ruler or height/width marks on the object are allowed so real-world size stays measurable.'
    )
    expect(legacy).not.toContain('Place a simple ruler')
  })

  it('buildObjectReferencePrompt no longer uses product-hero staging copy', () => {
    const prompt = buildObjectReferencePrompt({
      id: 'obj-1',
      type: 'object',
      name: 'Canister',
      description: '12-inch metal sample canister, handheld',
    })
    expect(prompt).toContain(OBJECT_REFERENCE_PURPOSE)
    expect(prompt).toMatch(/true real-world scale/i)
    expect(prompt).not.toMatch(/hero prop|museum quality|professional product photography/i)
  })

  it('negative prompt bars people, hands holding the object, and set furniture', () => {
    expect(OBJECT_REFERENCE_NEGATIVE_PROMPT).toMatch(/people/)
    expect(OBJECT_REFERENCE_NEGATIVE_PROMPT).toMatch(/hands holding the object/)
    expect(OBJECT_REFERENCE_NEGATIVE_PROMPT).toMatch(/tables used as a set/)
    expect(OBJECT_REFERENCE_NEGATIVE_PROMPT).toMatch(/measurements on the object/)
    expect(OBJECT_REFERENCE_NEGATIVE_PROMPT).toMatch(/tick marks on the object/)
    expect(OBJECT_REFERENCE_NEGATIVE_PROMPT).toMatch(/engraved scale on the object/)
    expect(OBJECT_REFERENCE_NEGATIVE_PROMPT).not.toMatch(/dress form|mannequin/)
  })

  it('suggest-objects and the add-dialog use the shared instruction helper', () => {
    const suggest = readFileSync(
      join(process.cwd(), 'src/app/api/vision/suggest-objects/route.ts'),
      'utf8'
    )
    expect(suggest).toContain('withObjectReferenceInstruction')
    expect(suggest).not.toMatch(/Professional product photography/)

    const sidebar = readFileSync(
      join(process.cwd(), 'src/components/vision/VisionReferencesSidebar.tsx'),
      'utf8'
    )
    expect(sidebar).toContain('buildObjectReferencePrompt')
    expect(sidebar).not.toMatch(/Professional product photography/)
  })
})
