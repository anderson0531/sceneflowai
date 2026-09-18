import { describe, it, expect } from 'vitest'
import {
  mapBeatReferenceSelectionForApi,
  resolveVerifiedBeatRefsForApi,
  shouldUseExplicitBeatReferences,
  unionBeatSelectionWithPromptText,
  toBeatReferenceSelection,
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

  it('maps a location version still onto the parent location ref', () => {
    const versioned: LocationReference[] = [
      {
        ...locations[0],
        locationDisplay: 'INT. KITCHEN - DAY',
        sourceSceneIndex: 0,
        sourceSceneHeading: 'INT. KITCHEN - DAY',
        pinnedAt: '2026-01-01T00:00:00.000Z',
        versions: [
          {
            id: 'ver-blast',
            name: 'Exploded fridge',
            stateNotes: 'Refrigerator door blown off',
            imageUrl: 'https://blob.example/kitchen-blast.jpg',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ]
    const payload = mapBeatReferenceSelectionForApi(
      {
        characterIds: [],
        locationRefId: 'loc-kitchen',
        locationVersionId: 'ver-blast',
        objectRefIds: [],
        resolvedAt: '2026-06-09T12:00:00.000Z',
      },
      characters,
      versioned,
      objects
    )
    expect(payload.locationReferences).toHaveLength(1)
    expect(payload.locationReferences[0].id).toBe('loc-kitchen')
    expect(payload.locationReferences[0].imageUrl).toBe('https://blob.example/kitchen-blast.jpg')
    expect(payload.locationReferences[0].boundVersionId).toBe('ver-blast')
  })

  it('keeps the parent establishing shot when the user binds the base version', () => {
    const versioned: LocationReference[] = [
      {
        ...locations[0],
        locationDisplay: 'INT. KITCHEN - DAY',
        sourceSceneIndex: 0,
        sourceSceneHeading: 'INT. KITCHEN - DAY',
        pinnedAt: '2026-01-01T00:00:00.000Z',
        versions: [
          {
            id: 'ver-blast',
            name: 'Exploded fridge',
            stateNotes: 'Refrigerator door blown off',
            imageUrl: 'https://blob.example/kitchen-blast.jpg',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ]
    const payload = mapBeatReferenceSelectionForApi(
      {
        characterIds: [],
        locationRefId: 'loc-kitchen',
        locationVersionId: null,
        objectRefIds: [],
        source: 'user',
        resolvedAt: '2026-06-09T12:00:00.000Z',
      },
      characters,
      versioned,
      objects
    )
    expect(payload.locationReferences[0].imageUrl).toBe('https://blob.example/kitchen.jpg')
    expect(payload.locationReferences[0].boundVersionId).toBeUndefined()
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

describe('resolveVerifiedBeatRefsForApi', () => {
  it('maps a saved user selection to the explicit generate-image payload', () => {
    const beat: SceneBeat = {
      beatId: 'b-director',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara opens the Briefcase.',
      referenceSelection: {
        characterIds: ['c1'],
        locationRefId: 'loc-kitchen',
        objectRefIds: ['obj-briefcase'],
        characterWardrobes: [{ characterId: 'c1', wardrobeId: 'w1' }],
        resolvedAt: '2026-06-09T12:00:00.000Z',
        source: 'user',
      },
    }
    const payload = resolveVerifiedBeatRefsForApi({
      beat,
      scene: { heading: 'INT. KITCHEN - DAY' },
      projectCharacters: characters,
      locationReferences: locations,
      objectReferences: objects,
    })
    expect(payload.characterSelectionExplicit).toBe(true)
    expect(payload.skipObjectAutoDetection).toBe(true)
    expect(payload.selectedCharacters).toEqual(['c1'])
    expect(payload.objectReferences.map((obj) => obj.id)).toEqual(['obj-briefcase'])
    expect(payload.locationReferences[0]?.id).toBe('loc-kitchen')
    expect(payload.characterWardrobes).toEqual([{ characterId: 'c1', wardrobeId: 'w1' }])
  })
})

describe('shouldUseExplicitBeatReferences', () => {
  it('requires a user-saved selection, not Express auto-resolve', () => {
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
    expect(shouldUseExplicitBeatReferences(beat)).toBe(false)

    beat.referenceSelection!.source = 'auto'
    expect(shouldUseExplicitBeatReferences(beat)).toBe(false)

    beat.referenceSelection!.source = 'user'
    expect(shouldUseExplicitBeatReferences(beat)).toBe(true)
  })
})

describe('unionBeatSelectionWithPromptText', () => {
  it('adds prompt-named cast members to the saved selection', () => {
    const selection = toBeatReferenceSelection({
      characterIds: ['c1'],
      objectRefIds: [],
      source: 'auto',
    })
    const unioned = unionBeatSelectionWithPromptText({
      selection,
      promptText: 'Dutch Angle: Gideon reclaims his academic authority.',
      projectCharacters: characters.concat([
        { id: 'c3', name: 'Gideon', referenceImage: 'https://blob.example/gideon.jpg' },
      ]),
      scene: { heading: 'INT. OFFICE - DAY' },
    })
    expect(unioned.characterIds).toEqual(expect.arrayContaining(['c1', 'c3']))
  })

  it('does not widen the cast of a beat that stated who is in frame', () => {
    const selection = toBeatReferenceSelection({
      characterIds: ['c1'],
      objectRefIds: [],
      source: 'auto',
    })
    const unioned = unionBeatSelectionWithPromptText({
      selection,
      promptText: 'Dutch Angle: Gideon reclaims his academic authority.',
      beat: {
        beatId: 'b1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Elara holds the doorway.',
        beatDirection: { shotType: 'Dutch Angle', castInFrame: ['Elara Vance'] },
      },
      projectCharacters: characters.concat([
        { id: 'c3', name: 'Gideon', referenceImage: 'https://blob.example/gideon.jpg' },
      ]),
      scene: { heading: 'INT. OFFICE - DAY' },
    })

    expect(unioned).toBe(selection)
  })

  it('does not add props to a beat that listed its key props', () => {
    const selection = toBeatReferenceSelection({
      characterIds: [],
      objectRefIds: [],
      source: 'auto',
    })
    const unioned = unionBeatSelectionWithPromptText({
      selection,
      promptText: 'Insert Shot: the Briefcase sits open on the counter.',
      beat: {
        beatId: 'b2',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'The counter is bare but for one thing.',
        beatDirection: { shotType: 'Insert Shot', keyProps: ['Leather Ledger'] },
      },
      projectCharacters: characters,
      scene: { heading: 'INT. KITCHEN - DAY' },
      sceneIndex: 0,
      objectReferences: objects,
      locationReferences: locations,
    })

    expect(unioned).toBe(selection)
  })

  it('still widens a legacy beat that stated no cast at all', () => {
    const selection = toBeatReferenceSelection({
      characterIds: [],
      objectRefIds: [],
      source: 'auto',
    })
    const unioned = unionBeatSelectionWithPromptText({
      selection,
      promptText: 'Two-Shot: Elara Vance faces Marcus Thorne.',
      beat: {
        beatId: 'b3',
        sequenceIndex: 2,
        kind: 'action',
        actionDescription: 'They square off.',
        beatDirection: { shotType: 'Two-Shot' },
      },
      projectCharacters: characters,
      scene: { heading: 'INT. OFFICE - DAY' },
    })

    expect(unioned.characterIds).toEqual(['c1', 'c2'])
  })

  // A planned prompt may name any prop in the reference catalog, but auto-resolve
  // matched on the beat's own text — so a prop the planner staged arrived with no
  // reference image and the model invented how it looks.
  it('adds a prop the planned prompt names but the beat text did not', () => {
    const selection = toBeatReferenceSelection({
      characterIds: ['c1'],
      objectRefIds: [],
      source: 'auto',
    })
    const unioned = unionBeatSelectionWithPromptText({
      selection,
      promptText: 'Insert Shot: the Briefcase sits open on the counter.',
      projectCharacters: characters,
      scene: { heading: 'INT. KITCHEN - DAY' },
      sceneIndex: 0,
      objectReferences: objects,
      locationReferences: locations,
    })

    expect(unioned.objectRefIds).toEqual(['obj-briefcase'])
  })

  it('does not add a prop that has no reference image to attach', () => {
    const unimaged: VisualReference[] = [
      { id: 'obj-ledger', type: 'object', name: 'Leather Ledger' },
    ]
    const selection = toBeatReferenceSelection({
      characterIds: [],
      objectRefIds: [],
      source: 'auto',
    })
    const unioned = unionBeatSelectionWithPromptText({
      selection,
      promptText: 'Insert Shot: the Leather Ledger lies open.',
      projectCharacters: characters,
      scene: { heading: 'INT. KITCHEN - DAY' },
      sceneIndex: 0,
      objectReferences: unimaged,
      locationReferences: locations,
    })

    expect(unioned.objectRefIds).toEqual([])
    expect(unioned).toBe(selection)
  })

  it('leaves a selection alone when the prompt names nothing new', () => {
    const selection = toBeatReferenceSelection({
      characterIds: ['c1'],
      objectRefIds: ['obj-briefcase'],
      source: 'auto',
    })
    const unioned = unionBeatSelectionWithPromptText({
      selection,
      promptText: 'Insert Shot: the Briefcase sits open on the counter.',
      projectCharacters: characters,
      scene: { heading: 'INT. KITCHEN - DAY' },
      sceneIndex: 0,
      objectReferences: objects,
      locationReferences: locations,
    })

    expect(unioned).toBe(selection)
  })
})
