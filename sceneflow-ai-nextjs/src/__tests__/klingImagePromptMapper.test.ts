import { describe, expect, it } from 'vitest'
import {
  mapSceneImageToKlingO3,
  mapSimpleRefsToKlingO3,
  MAX_FAL_KLING_REFERENCE_SLOTS,
} from '@/lib/fal/klingImagePromptMapper'
import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'

function makeCharRef(
  overrides: Partial<PrioritizedReferenceImage> & { imageUrl: string; characterName: string }
): PrioritizedReferenceImage {
  return {
    name: overrides.name ?? `${overrides.characterName} identity`,
    role: 'identity',
    refRole: 'identity',
    sendIndex: overrides.sendIndex ?? 1,
    ...overrides,
  }
}

describe('mapSceneImageToKlingO3', () => {
  it('rewrites person [N] tokens to @ElementN', () => {
    const refs: PrioritizedReferenceImage[] = [
      makeCharRef({
        imageUrl: 'https://blob.example/char-a.jpg',
        characterName: 'Alice',
        sendIndex: 1,
      }),
      makeCharRef({
        imageUrl: 'https://blob.example/char-b.jpg',
        characterName: 'Bob',
        name: 'Bob identity',
        sendIndex: 2,
      }),
    ]

    const result = mapSceneImageToKlingO3({
      scenePrompt: 'Wide shot of person [1] talking to person [2] in a cafe.',
      selectedReferences: refs,
      characterOrdinals: [
        { name: 'Alice', subjectOrdinal: 1 },
        { name: 'Bob', subjectOrdinal: 2 },
      ],
    })

    expect(result.prompt).toContain('@Element1')
    expect(result.prompt).toContain('@Element2')
    expect(result.prompt).not.toMatch(/person\s*\[\s*1\s*\]/i)
    expect(result.elements).toHaveLength(2)
    expect(result.elements[0].frontal_image_url).toBe('https://blob.example/char-a.jpg')
    expect(result.elements[1].frontal_image_url).toBe('https://blob.example/char-b.jpg')
  })

  it('maps location refs to image_urls and rewrites Reference image N tokens', () => {
    const refs: PrioritizedReferenceImage[] = [
      {
        imageUrl: 'https://blob.example/location.jpg',
        name: 'Location: Cafe',
        role: 'location',
        sendIndex: 3,
        locationName: 'Cafe',
      },
    ]

    const result = mapSceneImageToKlingO3({
      scenePrompt: 'Interior scene matching Reference image 3 with warm lighting.',
      selectedReferences: refs,
    })

    expect(result.imageUrls).toEqual(['https://blob.example/location.jpg'])
    expect(result.prompt).toContain('@Image1')
    expect(result.prompt).not.toMatch(/Reference image\s*3/i)
  })

  it('groups wardrobe refs under element reference_image_urls', () => {
    const refs: PrioritizedReferenceImage[] = [
      makeCharRef({
        imageUrl: 'https://blob.example/alice-id.jpg',
        characterName: 'Alice',
        sendIndex: 1,
      }),
      {
        imageUrl: 'https://blob.example/alice-wardrobe.jpg',
        name: 'Alice wardrobe',
        role: 'identity',
        refRole: 'wardrobe',
        characterName: 'Alice',
        sendIndex: 2,
      },
    ]

    const result = mapSceneImageToKlingO3({
      scenePrompt: 'person [1] in frame',
      selectedReferences: refs,
      characterOrdinals: [{ name: 'Alice', subjectOrdinal: 1 }],
    })

    expect(result.elements).toHaveLength(1)
    expect(result.elements[0].reference_image_urls).toEqual([
      'https://blob.example/alice-wardrobe.jpg',
    ])
  })

  it('caps total references at MAX_FAL_KLING_REFERENCE_SLOTS', () => {
    const refs: PrioritizedReferenceImage[] = Array.from({ length: 12 }, (_, i) =>
      makeCharRef({
        imageUrl: `https://blob.example/char-${i}.jpg`,
        characterName: `Char${i}`,
        sendIndex: i + 1,
      })
    )

    const result = mapSceneImageToKlingO3({
      scenePrompt: 'Scene',
      selectedReferences: refs,
      maxTotalRefs: MAX_FAL_KLING_REFERENCE_SLOTS,
    })

    expect(result.elements.length + result.imageUrls.length).toBeLessThanOrEqual(
      MAX_FAL_KLING_REFERENCE_SLOTS
    )
  })

  it('prepends instructionPrefix before rewritten scene prompt', () => {
    const result = mapSceneImageToKlingO3({
      scenePrompt: 'person [1] at desk',
      selectedReferences: [
        makeCharRef({
          imageUrl: 'https://blob.example/id.jpg',
          characterName: 'Alice',
        }),
      ],
      characterOrdinals: [{ name: 'Alice', subjectOrdinal: 1 }],
      instructionPrefix: 'CRITICAL: Match identity references exactly.',
    })

    expect(result.prompt.startsWith('CRITICAL: Match identity references exactly.')).toBe(true)
    expect(result.prompt).toContain('@Element1')
  })
})

describe('mapSimpleRefsToKlingO3', () => {
  it('routes location/prop names to image_urls and others to elements', () => {
    const result = mapSimpleRefsToKlingO3('A hero in a forest', [
      { imageUrl: 'https://blob.example/hero.jpg', name: 'Hero identity' },
      { imageUrl: 'https://blob.example/forest.jpg', name: 'Location forest' },
      { imageUrl: 'https://blob.example/sword.jpg', name: 'Prop sword' },
    ])

    expect(result.elements).toHaveLength(1)
    expect(result.imageUrls).toHaveLength(2)
    expect(result.elements[0].frontal_image_url).toBe('https://blob.example/hero.jpg')
    expect(result.imageUrls).toContain('https://blob.example/forest.jpg')
    expect(result.imageUrls).toContain('https://blob.example/sword.jpg')
  })
})
