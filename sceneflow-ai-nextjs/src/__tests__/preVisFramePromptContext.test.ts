import { describe, it, expect } from 'vitest'
import { resolveCharacterReferencePair } from '@/lib/character/characterReferenceAssembly'
import { resolvePreVisFramePromptContext } from '@/lib/vision/resolvePreVisFramePromptContext'
import type { StoryboardFrameSlot } from '@/lib/storyboard/types'

describe('resolveCharacterReferencePair includeWardrobeReferenceImages', () => {
  const characterWithPortrait = {
    id: 'char-1',
    name: 'Marcus',
    referenceImage: 'https://example.com/portrait.jpg',
    wardrobes: [
      {
        id: 'w1',
        name: 'Office suit',
        description: 'Navy suit',
        isDefault: true,
        fullBodyUrl: 'https://example.com/turnaround.jpg',
      },
    ],
  }

  it('omits wardrobe URL when includeWardrobeReferenceImages is false', () => {
    const pair = resolveCharacterReferencePair({
      character: characterWithPortrait,
      includeWardrobeReferenceImages: false,
    })
    expect(pair.identityUrl).toBe('https://example.com/portrait.jpg')
    expect(pair.wardrobeUrl).toBeUndefined()
    expect(pair.hasDualReferences).toBe(false)
    expect(pair.resolvedWardrobe?.description).toBe('Navy suit')
  })

  it('attaches full-body wardrobe URL when includeWardrobeReferenceImages is true', () => {
    const pair = resolveCharacterReferencePair({
      character: characterWithPortrait,
      includeWardrobeReferenceImages: true,
    })
    expect(pair.wardrobeUrl).toBe('https://example.com/turnaround.jpg')
    expect(pair.hasDualReferences).toBe(true)
    expect(pair.resolvedWardrobe?.description).toBe('Navy suit')
  })
})

describe('resolvePreVisFramePromptContext', () => {
  const scene = {
    heading: 'INT. LAB - DAY',
    action: 'Alex enters the lab.',
    sceneDirection: {
      camera: { shotType: 'wide-shot', angle: 'eye-level' },
      lighting: { type: 'natural', mood: 'clinical' },
    },
    beats: [
      {
        beatId: 'beat-1',
        kind: 'action',
        actionDescription: 'Alex scans the room.',
        storyboardImagePrompt: 'Wide lab establishing with Alex',
      },
    ],
  }

  const slot: StoryboardFrameSlot = {
    key: 'beat-beat-1',
    label: 'Action beat',
    kind: 'action',
    beatId: 'beat-1',
    isPlaceholder: false,
    isMissing: false,
    storyboardImagePrompt: 'Wide lab establishing with Alex',
  }

  it('seeds beat frame prompt context from slot and beat', () => {
    const ctx = resolvePreVisFramePromptContext({
      slot,
      scene,
      sceneIndex: 0,
      projectCharacters: [{ id: 'c1', name: 'Alex', referenceImage: 'https://example.com/alex.jpg' }],
      locationReferences: [],
      objectReferences: [],
    })
    expect(ctx.seedPrompt).toContain('Wide lab')
    expect(ctx.visualSetup.shotType).toBeTruthy()
  })

  const destroyedLab = {
    id: 'loc-lab',
    location: 'LAB',
    locationDisplay: 'INT. LAB - DAY',
    imageUrl: 'https://example.com/lab.jpg',
    sourceSceneIndex: 0,
    sourceSceneHeading: 'INT. LAB - DAY',
    pinnedAt: '2026-01-01T00:00:00.000Z',
    sceneNumbers: [1],
    versions: [
      {
        id: 'ver-blast',
        name: 'Destroyed consoles',
        stateNotes: 'Lab consoles exploded, debris on the floor',
        appliesFrom: { sceneNumber: 1, beatIndex: 0, beatId: 'beat-1' },
        imageUrl: 'https://example.com/lab-blast.jpg',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }

  it('auto-selects a sticky location version for the beat', () => {
    const ctx = resolvePreVisFramePromptContext({
      slot,
      scene,
      sceneIndex: 0,
      projectCharacters: [{ id: 'c1', name: 'Alex', referenceImage: 'https://example.com/alex.jpg' }],
      locationReferences: [destroyedLab],
      objectReferences: [],
    })
    expect(ctx.locationRefId).toBe('loc-lab')
    expect(ctx.locationVersionId).toBe('ver-blast')
  })

  it('honors a user pick of the intact base over the auto version', () => {
    const ctx = resolvePreVisFramePromptContext({
      slot,
      scene: {
        ...scene,
        beats: [
          {
            ...scene.beats[0],
            referenceSelection: {
              characterIds: ['c1'],
              locationRefId: 'loc-lab',
              locationVersionId: null,
              objectRefIds: [],
              resolvedAt: '2026-06-09T12:00:00.000Z',
              source: 'user',
            },
          },
        ],
      },
      sceneIndex: 0,
      projectCharacters: [{ id: 'c1', name: 'Alex', referenceImage: 'https://example.com/alex.jpg' }],
      locationReferences: [destroyedLab],
      objectReferences: [],
    })
    expect(ctx.locationRefId).toBe('loc-lab')
    expect(ctx.locationVersionId).toBeNull()
  })

  it('auto-selects wardrobe from scene.characterWardrobes on beat frames', () => {
    const ctx = resolvePreVisFramePromptContext({
      slot,
      scene: {
        ...scene,
        characterWardrobes: [{ characterId: 'c1', wardrobeId: 'w-scene' }],
      },
      sceneIndex: 0,
      projectCharacters: [
        {
          id: 'c1',
          name: 'Alex',
          referenceImage: 'https://example.com/alex.jpg',
          wardrobes: [
            { id: 'w-scene', name: 'Lab coat', description: 'White coat', isDefault: false },
            { id: 'w-default', name: 'Casual', description: 'Jeans', isDefault: true },
          ],
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })
    expect(ctx.selectedWardrobes.Alex).toBe('w-scene')
  })

  it('auto-selects wardrobe via sceneNumbers when no scene override', () => {
    const ctx = resolvePreVisFramePromptContext({
      slot,
      scene,
      sceneIndex: 3,
      projectCharacters: [
        {
          id: 'c1',
          name: 'Alex',
          referenceImage: 'https://example.com/alex.jpg',
          wardrobes: [
            {
              id: 'w-scene4',
              name: 'Scene 4 look',
              description: 'Hospital gown',
              sceneNumbers: [4],
              isDefault: false,
            },
            { id: 'w-default', name: 'Casual', description: 'Jeans', isDefault: true },
          ],
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })
    expect(ctx.selectedWardrobes.Alex).toBe('w-scene4')
  })

  it('auto-selects wardrobe for dialogue speaker', () => {
    const dialogueSlot: StoryboardFrameSlot = {
      key: 'dialogue-0',
      label: 'Dialogue',
      kind: 'dialogue',
      dialogueIndex: 0,
      isPlaceholder: false,
      isMissing: false,
    }
    const ctx = resolvePreVisFramePromptContext({
      slot: dialogueSlot,
      scene: {
        heading: 'INT. LAB - DAY',
        dialogue: [{ character: 'Alex', line: 'Something is wrong.' }],
        characterWardrobes: [{ characterId: 'c1', wardrobeId: 'w-lab' }],
      },
      sceneIndex: 0,
      projectCharacters: [
        {
          id: 'c1',
          name: 'Alex',
          referenceImage: 'https://example.com/alex.jpg',
          wardrobes: [
            { id: 'w-lab', name: 'Lab coat', description: 'White coat', isDefault: false },
          ],
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })
    expect(ctx.selectedCharacterNames).toEqual(['Alex'])
    expect(ctx.selectedWardrobes.Alex).toBe('w-lab')
  })

  it('seeds a dialogue beat from the beat, not the speaker-only fallback', () => {
    const dialogueSlot: StoryboardFrameSlot = {
      key: 'bt_dlg',
      label: 'Alex',
      kind: 'dialogue',
      beatId: 'bt_dlg',
      dialogueIndex: 0,
      isPlaceholder: false,
      isMissing: false,
    }
    const ctx = resolvePreVisFramePromptContext({
      slot: dialogueSlot,
      scene: {
        heading: 'INT. LAB - DAY',
        dialogue: [{ character: 'Alex', line: 'Something is wrong.' }],
        beats: [
          {
            beatId: 'bt_dlg',
            kind: 'dialogue',
            character: 'Alex',
            line: 'Something is wrong.',
            beatDirection: { frozenMoment: 'Alex at the console, eyes wide' },
          },
        ],
      },
      sceneIndex: 0,
      projectCharacters: [
        {
          id: 'c1',
          name: 'Alex',
          referenceImage: 'https://example.com/alex.jpg',
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })
    expect(ctx.seedPrompt).toContain('console')
    expect(ctx.seedPrompt).not.toBe('Something is wrong.')
    expect(ctx.beat?.beatId).toBe('bt_dlg')
  })
})
