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

  it('never attaches wardrobe URL even when includeWardrobeReferenceImages is true', () => {
    const pair = resolveCharacterReferencePair({
      character: characterWithPortrait,
      includeWardrobeReferenceImages: true,
    })
    expect(pair.wardrobeUrl).toBeUndefined()
    expect(pair.hasDualReferences).toBe(false)
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
})
