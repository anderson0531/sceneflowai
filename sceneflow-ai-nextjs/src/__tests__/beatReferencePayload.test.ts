import { describe, it, expect } from 'vitest'
import {
  mapBeatReferenceSelectionForApi,
  shouldUseExplicitBeatReferences,
} from '@/lib/vision/beatFrameGenerationContext'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

const characters = [
  { id: 'c1', name: 'Elara Vance', referenceImage: 'https://blob.example/elara.jpg' },
  { id: 'c2', name: 'Marcus Thorne', referenceImage: 'https://blob.example/marcus.jpg' },
]

const locations: LocationReference[] = [
  {
    id: 'loc-kitchen',
    location: 'KITCHEN',
    imageUrl: 'https://blob.example/kitchen.jpg',
  },
]

const objects: VisualReference[] = [
  {
    id: 'obj-briefcase',
    type: 'object',
    name: 'Briefcase',
    imageUrl: 'https://blob.example/briefcase.jpg',
  },
]

describe('mapBeatReferenceSelectionForApi', () => {
  it('maps saved beat selection to explicit API payload', () => {
    const selection: BeatReferenceSelection = {
      characterIds: ['c1'],
      locationRefId: 'loc-kitchen',
      objectRefIds: ['obj-briefcase'],
      characterWardrobes: [{ characterId: 'c1', wardrobeId: 'w1' }],
      resolvedAt: '2026-06-09T12:00:00.000Z',
    }

    const payload = mapBeatReferenceSelectionForApi(
      selection,
      characters,
      locations,
      objects
    )

    expect(payload.selectedCharacters).toEqual(['c1'])
    expect(payload.locationReferences).toHaveLength(1)
    expect(payload.locationReferences[0].id).toBe('loc-kitchen')
    expect(payload.objectReferences).toHaveLength(1)
    expect(payload.objectReferences[0].name).toBe('Briefcase')
    expect(payload.characterSelectionExplicit).toBe(true)
    expect(payload.skipObjectAutoDetection).toBe(true)
  })

  it('disables location auto-detect when a location ref is provided', () => {
    const payload = mapBeatReferenceSelectionForApi(
      {
        characterIds: [],
        locationRefId: 'loc-kitchen',
        objectRefIds: [],
        resolvedAt: '2026-06-09T12:00:00.000Z',
      },
      characters,
      locations,
      objects
    )

    const autoDetectLocations = payload.locationReferences.length === 0
    expect(autoDetectLocations).toBe(false)
  })
})

describe('shouldUseExplicitBeatReferences', () => {
  it('requires resolvedAt on saved beat selection', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      referenceSelection: {
        characterIds: ['c1'],
        objectRefIds: [],
      },
    }

    expect(shouldUseExplicitBeatReferences(beat)).toBe(false)

    beat.referenceSelection!.resolvedAt = '2026-06-09T12:00:00.000Z'
    expect(shouldUseExplicitBeatReferences(beat)).toBe(true)
  })
})
