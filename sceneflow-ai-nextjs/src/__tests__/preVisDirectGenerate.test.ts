import { describe, it, expect } from 'vitest'
import {
  buildPreVisDirectApiFields,
  buildBeatRegenDirectImagePayload,
  shouldUseCustomPromptOverride,
} from '@/lib/vision/preVisDirectGenerate'
import type { VisualSetup, TalentDirection } from '@/components/image-gen/types'

const visualSetup: VisualSetup = {
  location: 'INT. KITCHEN',
  timeOfDay: 'day',
  weather: 'clear',
  atmosphere: 'neutral',
  shotType: 'medium-shot',
  cameraAngle: 'eye-level',
  lighting: 'natural',
}

const talentDirection: TalentDirection = {
  talentBlocking: '',
  emotionalBeat: '',
  keyProps: '',
}

describe('buildPreVisDirectApiFields', () => {
  it('never includes customPrompt, even when direction is empty', () => {
    const fields = buildPreVisDirectApiFields({
      visualSetup,
      talentDirection,
      artStyle: 'photorealistic',
      modelTier: 'eco',
      thinkingLevel: 'low',
    })

    expect(fields).not.toHaveProperty('customPrompt')
    expect(fields.generationMode).toBe('direct')
    expect(fields.fromDialog).toBe(true)
    expect(fields.visualSetup).toEqual(visualSetup)
    expect(fields).not.toHaveProperty('userDirection')
  })

  it('passes trimmed userDirection and visual overlays', () => {
    const fields = buildPreVisDirectApiFields({
      visualSetup: { ...visualSetup, lighting: 'cold' },
      talentDirection: { ...talentDirection, talentBlocking: 'Maya at the counter' },
      userDirection: '  Closer on Maya, keep the coffee cup  ',
      artStyle: 'photorealistic',
      modelTier: 'designer',
      thinkingLevel: 'high',
    })

    expect(fields.userDirection).toBe('Closer on Maya, keep the coffee cup')
    expect((fields.visualSetup as VisualSetup).lighting).toBe('cold')
    expect((fields.talentDirection as TalentDirection).talentBlocking).toBe('Maya at the counter')
    expect(fields).not.toHaveProperty('customPrompt')
  })
})

describe('shouldUseCustomPromptOverride', () => {
  it('skips the custom-prompt compiler bypass in Direct mode', () => {
    expect(shouldUseCustomPromptOverride('direct', 'adhoc prompt text')).toBe(false)
  })

  it('allows custom prompt override for non-Direct modes', () => {
    expect(shouldUseCustomPromptOverride('default', 'adhoc prompt text')).toBe(true)
    expect(shouldUseCustomPromptOverride('default', '  ')).toBe(false)
  })
})

describe('buildBeatRegenDirectImagePayload', () => {
  const gideon = {
    id: '8b19d9c6-ab02-41fa-85c3-6e5ed609b358',
    name: 'Gideon Croft',
    referenceImage: 'https://example.com/gideon.png',
    wardrobes: [
      {
        id: 'wardrobe-archivist',
        name: 'Subterranean Archivist',
        description: 'Frayed dark wool sweater',
        isDefault: true,
        sceneNumbers: [2],
        fullBodyUrl: 'https://example.com/gideon-wardrobe.png',
      },
    ],
    appearanceDescription: 'Mixed Afro-descendant, tightly curled salt-and-pepper hair',
  }

  const location = {
    id: 'loc-vault',
    location: 'FREIGHT TUNNEL VAULT',
    imageUrl: 'https://example.com/vault.png',
  }

  const prop = {
    id: 'prop-spanner',
    name: 'Thirty-Inch Iron Rail Spanner',
    imageUrl: 'https://example.com/spanner.png',
  }

  const beat = {
    beatId: 'bt_5ea473a5-2e2',
    sequenceIndex: 0,
    kind: 'action' as const,
    actionDescription: 'Gideon hunches over the seismograph.',
    beatDirection: {
      shotType: 'Medium Shot',
      frozenMoment: 'Gideon at the zinc workbench',
      lightingAccent: 'Low-key practicals',
    },
    storyboardImagePrompt: 'Medium shot: Gideon at the zinc workbench.',
  }

  const scene = {
    heading: 'INT. FREIGHT TUNNEL VAULT - NIGHT',
    action: 'Gideon hunches over the seismograph.',
    beats: [beat],
  }

  it('sends the Direct payload with full character objects, not IDs', () => {
    const payload = buildBeatRegenDirectImagePayload({
      projectId: 'proj-1',
      sceneIndex: 1,
      scene,
      beat,
      beatIndex: 0,
      quality: 'auto',
      projectCharacters: [gideon],
      locationReferences: [location as never],
      objectReferences: [prop as never],
      filmTitle: 'The Vault',
      lockedArtStyle: 'photorealistic',
      referenceSelection: {
        characterIds: [gideon.id],
        locationRefId: location.id,
        objectRefIds: [prop.id],
        characterWardrobes: [{ characterId: gideon.id, wardrobeId: 'wardrobe-archivist' }],
        resolvedAt: '2026-09-10T00:00:00.000Z',
        source: 'auto',
      },
    })

    expect(payload.generationMode).toBe('direct')
    expect(payload.fromDialog).toBe(true)
    expect(payload.characterSelectionExplicit).toBe(true)
    expect(payload.skipObjectAutoDetection).toBe(true)
    expect(payload).not.toHaveProperty('customPrompt')
    expect(payload.visualSetup).toBeDefined()
    expect(payload.talentDirection).toBeDefined()
    expect(Array.isArray(payload.characters)).toBe(true)
    const chars = payload.characters as Array<{ id: string; name: string; referenceImage: string }>
    expect(chars).toHaveLength(1)
    expect(typeof chars[0]).toBe('object')
    expect(chars[0].id).toBe(gideon.id)
    expect(chars[0].referenceImage).toBe(gideon.referenceImage)
    expect(payload.locationReferences).toEqual([location])
    expect(payload.objectReferences).toEqual([prop])
    expect(payload.frameType).toBe('beat')
    expect(payload.beatId).toBe(beat.beatId)
  })

  it('includes the same refs on an end-frame regen', () => {
    const payload = buildBeatRegenDirectImagePayload({
      projectId: 'proj-1',
      sceneIndex: 1,
      scene,
      beat: { ...beat, storyboardImageUrl: 'https://example.com/start.png' },
      beatIndex: 0,
      frameRole: 'end',
      startFrameUrl: 'https://example.com/start.png',
      projectCharacters: [gideon],
      locationReferences: [location as never],
      objectReferences: [prop as never],
      referenceSelection: {
        characterIds: [gideon.id],
        locationRefId: location.id,
        objectRefIds: [prop.id],
        resolvedAt: '2026-09-10T00:00:00.000Z',
        source: 'auto',
      },
    })

    expect(payload.frameRole).toBe('end')
    expect(payload.startFrameUrl).toBe('https://example.com/start.png')
    expect(payload.generationMode).toBe('direct')
    expect((payload.characters as unknown[]).length).toBe(1)
    expect(payload.locationReferences).toEqual([location])
  })
})
