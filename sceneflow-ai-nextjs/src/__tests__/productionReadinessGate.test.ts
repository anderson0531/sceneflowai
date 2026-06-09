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
