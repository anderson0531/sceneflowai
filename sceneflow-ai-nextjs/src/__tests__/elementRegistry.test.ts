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
  it('defaults to binding character frontal identity + scene-assigned wardrobe refer_images (with identity-only opt-out)', () => {
    const characterRow = {
      id: 'char-sarah',
      name: 'Sarah',
      referenceImage: 'https://cdn.example.com/sarah-identity.jpg',
      klingElementId: 'elem-char-frontal',
      wardrobes: [
        {
          id: 'ward-casual',
          name: 'Casual',
          description: 'Charcoal wool coat over knit sweater',
          accessories: 'Leather boots',
          headshotUrl: 'https://cdn.example.com/sarah-casual-head.jpg',
          fullBodyUrl: 'https://cdn.example.com/sarah-casual-body.jpg',
          klingElementId: 'elem-wardrobe-scene',
        },
      ],
    }

    const sources = collectKlingElementSources({
      characters: [characterRow],
      characterIds: ['char-sarah'],
      characterWardrobes: [{ characterId: 'char-sarah', wardrobeId: 'ward-casual' }],
    })

    expect(sources).toHaveLength(1)
    expect(sources[0]).toMatchObject({
      name: 'Char_Sarah',
      frontalImageUrl: 'https://cdn.example.com/sarah-identity.jpg',
      referImageUrls: [
        'https://cdn.example.com/sarah-casual-head.jpg',
        'https://cdn.example.com/sarah-casual-body.jpg',
      ],
      wardrobeId: 'ward-casual',
      klingElementId: 'elem-wardrobe-scene',
      tagId: 'o_102',
      type: 'character',
    })

    const optOut = collectKlingElementSources({
      characters: [characterRow],
      characterIds: ['char-sarah'],
      characterWardrobes: [{ characterId: 'char-sarah', wardrobeId: 'ward-casual' }],
      includeWardrobeReferenceImages: false,
    })
    expect(optOut[0]).toMatchObject({
      frontalImageUrl: 'https://cdn.example.com/sarah-identity.jpg',
      referImageUrls: undefined,
      wardrobeDescription: 'Charcoal wool coat over knit sweater, Leather boots',
      klingElementId: 'elem-char-frontal',
    })
  })

  it('binds character identity as frontal and wardrobe images as refer_images when opted in', () => {
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
      includeWardrobeReferenceImages: true,
    })

    expect(sources).toHaveLength(1)
    expect(sources[0]).toMatchObject({
      name: 'Char_Sarah',
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
      type: 'location',
      frontalImageUrl: 'https://cdn.example.com/alley.jpg',
      tagId: 'o_106',
    })
    expect(sources[0].referImageUrls).toBeUndefined()
    expect(sources[1]).toMatchObject({
      type: 'prop',
      frontalImageUrl: 'https://cdn.example.com/sword.jpg',
      tagId: 'o_104',
    })
  })

  it('attaches a location version still instead of the intact base', () => {
    const sources = collectKlingElementSources({
      locationRefId: 'loc-alley',
      locationVersionId: 'ver-blast',
      locationReferences: [
        {
          id: 'loc-alley',
          location: 'ALLEY',
          locationDisplay: 'INT. ALLEY - NIGHT',
          imageUrl: 'https://cdn.example.com/alley.jpg',
          sourceSceneIndex: 0,
          sourceSceneHeading: 'INT. ALLEY - NIGHT',
          pinnedAt: '2026-01-01T00:00:00.000Z',
          versions: [
            {
              id: 'ver-blast',
              name: 'Blown storefront',
              stateNotes: 'Storefront windows shattered',
              imageUrl: 'https://cdn.example.com/alley-blast.jpg',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      ],
    })

    expect(sources).toHaveLength(1)
    expect(sources[0].imageUrl).toBe('https://cdn.example.com/alley-blast.jpg')
    expect(sources[0].frontalImageUrl).toBe('https://cdn.example.com/alley-blast.jpg')
    expect(sources[0].id).toBe('loc-alley')
  })

  it('reuses cached wardrobe klingElementId when wardrobe refer_images are opted in', () => {
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
      includeWardrobeReferenceImages: true,
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

  it('orders character+wardrobe -> location -> props so Kling Omni maxElements=4 never drops location for props', async () => {
    vi.mocked(registerKlingElement).mockImplementation(async (_url, name) => `elem-${name}`)
    vi.mocked(registerKlingElementMulti).mockImplementation(async ({ name }) => `elem-multi-${name}`)

    const sources = collectKlingElementSources({
      characters: [
        {
          id: 'c1',
          name: 'Gideon',
          referenceImage: 'https://cdn.example.com/gideon-id.jpg',
          wardrobes: [{ id: 'w1', name: 'Smock', fullBodyUrl: 'https://cdn.example.com/gideon-body.jpg' }],
        },
        {
          id: 'c2',
          name: 'Piper',
          referenceImage: 'https://cdn.example.com/piper-id.jpg',
          wardrobes: [{ id: 'w2', name: 'Parka', fullBodyUrl: 'https://cdn.example.com/piper-body.jpg' }],
        },
      ],
      characterIds: ['c1', 'c2'],
      locationRefId: 'loc-vault',
      locationReferences: [
        { id: 'loc-vault', location: 'VAULT', imageUrl: 'https://cdn.example.com/vault.jpg' },
      ],
      objectRefIds: ['p-minor', 'p-hero'],
      objectReferences: [
        { id: 'p-minor', name: 'Chalk', imageUrl: 'https://cdn.example.com/chalk.jpg', importance: 'secondary', category: 'prop' },
        { id: 'p-hero', name: 'Core', imageUrl: 'https://cdn.example.com/core.jpg', importance: 'critical', category: 'prop' },
      ],
    })

    expect(sources.map((s) => s.type)).toEqual(['character', 'character', 'location', 'prop', 'prop'])
    expect(sources[3].name).toBe('Core')

    const resolved = await resolveKlingElementsFromSources(sources, 'kling-v3-omni')
    expect(resolved.elementIds).toHaveLength(4)
    expect(resolved.bindings.map((b) => b.name)).toEqual([
      'Char_Gideon',
      'Char_Piper',
      'VAULT',
      'Core',
    ])
  })
})
