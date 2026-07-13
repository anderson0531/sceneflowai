import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  collectKlingElementSources,
  resolveKlingElementsFromSources,
} from '@/lib/kling/elementRegistry'

vi.mock('@/lib/kling/klingDirectClient', () => ({
  registerKlingElement: vi.fn(),
  registerKlingElementMulti: vi.fn(),
}))

vi.mock('@/models/Project', () => ({
  default: { findByPk: vi.fn() },
}))

import { registerKlingElement, registerKlingElementMulti } from '@/lib/kling/klingDirectClient'

describe('collectKlingElementSources bind elements', () => {
  it('binds character identity as frontal and wardrobe images as refer_images', () => {
    const sources = collectKlingElementSources({
      characters: [
        {
          id: 'char-sarah',
          name: 'Sarah',
          referenceImage: 'https://cdn.example.com/sarah-identity.jpg',
          wardrobes: [
            {
              id: 'ward-casual',
              name: 'Casual',
              headshotUrl: 'https://cdn.example.com/sarah-casual-head.jpg',
              fullBodyUrl: 'https://cdn.example.com/sarah-casual-body.jpg',
            },
          ],
        },
      ],
      characterIds: ['char-sarah'],
      characterWardrobes: [{ characterId: 'char-sarah', wardrobeId: 'ward-casual' }],
    })

    expect(sources).toHaveLength(1)
    expect(sources[0]).toMatchObject({
      name: 'Sarah',
      frontalImageUrl: 'https://cdn.example.com/sarah-identity.jpg',
      referImageUrls: [
        'https://cdn.example.com/sarah-casual-head.jpg',
        'https://cdn.example.com/sarah-casual-body.jpg',
      ],
      wardrobeId: 'ward-casual',
      tagId: 'o_102',
      type: 'character',
    })
  })

  it('promotes wardrobe image to frontal when identity image is missing', () => {
    const sources = collectKlingElementSources({
      characters: [
        {
          id: 'char-bob',
          name: 'Bob',
          wardrobes: [
            {
              id: 'ward-formal',
              name: 'Formal',
              headshotUrl: 'https://cdn.example.com/bob-formal.jpg',
            },
          ],
        },
      ],
      characterIds: ['char-bob'],
      characterWardrobes: [{ characterId: 'char-bob', wardrobeId: 'ward-formal' }],
    })

    expect(sources[0].frontalImageUrl).toBe('https://cdn.example.com/bob-formal.jpg')
    expect(sources[0].referImageUrls).toBeUndefined()
  })

  it('uses single-image shape for props and locations', () => {
    const sources = collectKlingElementSources({
      objectRefIds: ['prop-sword'],
      objectReferences: [
        {
          id: 'prop-sword',
          type: 'object',
          name: 'Magic Sword',
          imageUrl: 'https://cdn.example.com/sword.jpg',
        },
      ],
      locationRefId: 'loc-alley',
      locationReferences: [
        {
          id: 'loc-alley',
          location: 'ALLEY',
          locationDisplay: 'INT. ALLEY - NIGHT',
          imageUrl: 'https://cdn.example.com/alley.jpg',
          sourceSceneIndex: 0,
          sourceSceneHeading: 'INT. ALLEY - NIGHT',
          pinnedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })

    expect(sources).toHaveLength(2)
    expect(sources[0]).toMatchObject({
      type: 'prop',
      frontalImageUrl: 'https://cdn.example.com/sword.jpg',
      tagId: 'o_104',
    })
    expect(sources[0].referImageUrls).toBeUndefined()
    expect(sources[1]).toMatchObject({
      type: 'location',
      frontalImageUrl: 'https://cdn.example.com/alley.jpg',
      tagId: 'o_106',
    })
  })

  it('reuses cached wardrobe klingElementId without re-registering', () => {
    const sources = collectKlingElementSources({
      characters: [
        {
          id: 'char-sarah',
          name: 'Sarah',
          referenceImage: 'https://cdn.example.com/sarah-identity.jpg',
          wardrobes: [
            {
              id: 'ward-casual',
              name: 'Casual',
              headshotUrl: 'https://cdn.example.com/sarah-casual-head.jpg',
              klingElementId: 'elem-cached-99',
            },
          ],
        },
      ],
      characterIds: ['char-sarah'],
      characterWardrobes: [{ characterId: 'char-sarah', wardrobeId: 'ward-casual' }],
    })

    expect(sources[0].klingElementId).toBe('elem-cached-99')
  })
})

describe('resolveKlingElementsFromSources registration routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls registerKlingElementMulti when refer images are present', async () => {
    vi.mocked(registerKlingElementMulti).mockResolvedValue('elem-multi-1')

    const result = await resolveKlingElementsFromSources(
      [
        {
          id: 'char-sarah',
          name: 'Sarah',
          imageUrl: 'https://cdn.example.com/sarah-identity.jpg',
          frontalImageUrl: 'https://cdn.example.com/sarah-identity.jpg',
          referImageUrls: ['https://cdn.example.com/sarah-casual-head.jpg'],
          type: 'character',
          tagId: 'o_102',
        },
      ],
      'kling-v3-omni'
    )

    expect(registerKlingElementMulti).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sarah',
        frontalImageUrl: 'https://cdn.example.com/sarah-identity.jpg',
        referImageUrls: ['https://cdn.example.com/sarah-casual-head.jpg'],
        tagId: 'o_102',
      })
    )
    expect(registerKlingElement).not.toHaveBeenCalled()
    expect(result.elementIds).toEqual(['elem-multi-1'])
    expect(result.newRegistrations[0]?.klingElementId).toBe('elem-multi-1')
  })

  it('falls back to single-image registerKlingElement when no refer images', async () => {
    vi.mocked(registerKlingElement).mockResolvedValue('elem-single-1')

    await resolveKlingElementsFromSources(
      [
        {
          id: 'prop-sword',
          name: 'Magic Sword',
          imageUrl: 'https://cdn.example.com/sword.jpg',
          frontalImageUrl: 'https://cdn.example.com/sword.jpg',
          type: 'prop',
          tagId: 'o_104',
        },
      ],
      'kling-v3-omni'
    )

    expect(registerKlingElement).toHaveBeenCalledWith(
      'https://cdn.example.com/sword.jpg',
      'Magic Sword'
    )
    expect(registerKlingElementMulti).not.toHaveBeenCalled()
  })
})
