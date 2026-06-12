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
})
