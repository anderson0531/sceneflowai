import { describe, expect, it } from 'vitest'
import {
  canRunExpress,
  evaluateProductionReadyChecklist,
  resolveCharacterReferenceImageUrl,
} from '@/lib/production/productionReadinessGate'

describe('resolveCharacterReferenceImageUrl', () => {
  it('prefers referenceImageUrl when both are set', () => {
    expect(
      resolveCharacterReferenceImageUrl({
        referenceImageUrl: 'https://example.com/a.png',
        referenceImage: 'https://example.com/b.png',
      })
    ).toBe('https://example.com/a.png')
  })

  it('falls back to referenceImage', () => {
    expect(
      resolveCharacterReferenceImageUrl({
        referenceImage: 'https://example.com/cast.png',
      })
    ).toBe('https://example.com/cast.png')
  })

  it('returns undefined for empty strings', () => {
    expect(resolveCharacterReferenceImageUrl({ referenceImage: '  ' })).toBeUndefined()
  })
})

describe('evaluateProductionReadyChecklist', () => {
  const baseInput = {
    scenes: [],
    objectReferences: [],
    locationReferences: [],
  }

  it('hasReferences is true when character uses referenceImage field', () => {
    const checklist = evaluateProductionReadyChecklist({
      ...baseInput,
      characters: [
        {
          name: 'Marcus',
          voiceConfig: { voiceId: 'gemini-achird' },
          referenceImage: 'https://example.com/marcus.png',
        },
      ],
    })
    expect(checklist.hasReferences).toBe(true)
    expect(checklist.isPreVisReady).toBe(true)
  })

  it('voicesReady is true when there are no speaking characters (narrator-only)', () => {
    const checklist = evaluateProductionReadyChecklist({
      ...baseInput,
      characters: [
        {
          name: 'Narrator',
          type: 'narrator',
          voiceConfig: { voiceId: 'gemini-achird' },
          referenceImage: 'https://example.com/narrator.png',
        },
      ],
    })
    expect(checklist.voicesReady).toBe(true)
    expect(checklist.isPreVisReady).toBe(true)
  })

  it('canRunExpress allows when voices ready and referenceImage set', () => {
    const checklist = evaluateProductionReadyChecklist({
      ...baseInput,
      characters: [
        {
          name: 'Marcus',
          voiceConfig: { voiceId: 'gemini-achird' },
          referenceImage: 'https://example.com/marcus.png',
        },
      ],
    })
    const gate = canRunExpress({ checklist })
    expect(gate.allowed).toBe(true)
    expect(gate.reasons).toHaveLength(0)
  })

  it('canRunExpress blocks when referenceImage is missing', () => {
    const checklist = evaluateProductionReadyChecklist({
      ...baseInput,
      characters: [
        {
          name: 'Marcus',
          voiceConfig: { voiceId: 'gemini-achird' },
        },
      ],
    })
    const gate = canRunExpress({ checklist })
    expect(gate.allowed).toBe(false)
    expect(gate.reasons.some((r) => r.includes('reference'))).toBe(true)
  })

  it('canRunExpress blocks when speaking character is missing a voice', () => {
    const checklist = evaluateProductionReadyChecklist({
      ...baseInput,
      characters: [
        {
          name: 'Marcus',
          referenceImage: 'https://example.com/marcus.png',
        },
      ],
    })
    const gate = canRunExpress({ checklist })
    expect(gate.allowed).toBe(false)
    expect(gate.reasons.some((r) => r.includes('voice'))).toBe(true)
  })
})

describe('Express waits for the whole reference library to be drawn', () => {
  const readyCast = [
    {
      name: 'Marcus',
      voiceConfig: { voiceId: 'gemini-achird' },
      referenceImage: 'https://example.com/marcus.png',
    },
  ]

  it('blocks on a prop reference that has no generated image', () => {
    const checklist = evaluateProductionReadyChecklist({
      scenes: [],
      characters: readyCast,
      objectReferences: [{ name: 'Iron spanner' }],
      locationReferences: [],
    })

    expect(checklist.referencesReady).toBe(false)
    expect(checklist.isPreVisReady).toBe(false)

    const gate = canRunExpress({ checklist })
    expect(gate.allowed).toBe(false)
    expect(gate.reasons.some((r) => r.includes('Iron spanner'))).toBe(true)
  })

  it('blocks on a location reference that has no generated image', () => {
    const checklist = evaluateProductionReadyChecklist({
      scenes: [],
      characters: readyCast,
      objectReferences: [],
      locationReferences: [{ location: 'INT. RECEIVING TERMINAL' }],
    })

    expect(checklist.referencesReady).toBe(false)
    const gate = canRunExpress({ checklist })
    expect(gate.allowed).toBe(false)
    expect(gate.reasons.some((r) => r.includes('RECEIVING TERMINAL'))).toBe(true)
  })

  it('stays blocked even under a soft gate', () => {
    const checklist = evaluateProductionReadyChecklist({
      scenes: [],
      characters: readyCast,
      objectReferences: [{ name: 'Iron spanner' }],
      locationReferences: [],
    })

    expect(canRunExpress({ checklist, softGate: true }).allowed).toBe(false)
  })

  it('allows once every row carries an image', () => {
    const checklist = evaluateProductionReadyChecklist({
      scenes: [],
      characters: readyCast,
      objectReferences: [{ name: 'Iron spanner', imageUrl: 'https://example.com/spanner.png' }],
      locationReferences: [
        { location: 'INT. RECEIVING TERMINAL', imageUrl: 'https://example.com/term.png' },
      ],
    })

    expect(checklist.referencesReady).toBe(true)
    expect(canRunExpress({ checklist }).allowed).toBe(true)
  })
})
