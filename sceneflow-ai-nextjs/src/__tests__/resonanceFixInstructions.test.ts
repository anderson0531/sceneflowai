import { describe, expect, it } from 'vitest'
import type { BlueprintAudienceRecommendation } from '@/lib/types/audienceResonance'
import {
  appendFixInstruction,
  fixInstructionForRecommendation,
  focusScopeForRecommendations,
  formatResonanceFixInstructions,
  removeFixInstruction,
} from '@/lib/treatment/resonanceFixInstructions'
import { MAX_INTENT_CHARS } from '@/lib/treatment/blueprintRevisionTypes'

function rec(
  overrides: Partial<BlueprintAudienceRecommendation> & { text?: string }
): BlueprintAudienceRecommendation {
  return {
    id: overrides.id ?? 'rec-1',
    text: overrides.text ?? 'Strengthen the grounded aftermath so the cost lands.',
    title: overrides.title ?? 'Grounded Aftermath',
    reason: overrides.reason ?? 'The ending lets the crew walk away unscarred.',
    priority: overrides.priority ?? 'medium',
    pointsDeducted: overrides.pointsDeducted ?? 4,
    fixSection: overrides.fixSection ?? 'story',
    impactSections: overrides.impactSections,
    intentLabel: overrides.intentLabel ?? 'Grounded Aftermath',
    category: overrides.category,
  }
}

describe('fixInstructionForRecommendation', () => {
  it('prefers the concrete fix text', () => {
    expect(fixInstructionForRecommendation(rec({}))).toBe(
      'Strengthen the grounded aftermath so the cost lands.'
    )
  })

  it('falls back to the gap, then the title, when text is empty', () => {
    expect(
      fixInstructionForRecommendation(rec({ text: '   ', reason: 'Act two sags' }))
    ).toBe('Act two sags')
    expect(
      fixInstructionForRecommendation(
        rec({ text: '', reason: '', title: 'Logline Alignment' })
      )
    ).toBe('Logline Alignment')
    expect(
      fixInstructionForRecommendation(rec({ text: '', reason: '', title: '' }))
    ).toBe('')
  })
})

describe('formatResonanceFixInstructions', () => {
  it('numbers each concrete fix', () => {
    const formatted = formatResonanceFixInstructions([
      rec({ text: 'Show the aftermath.' }),
      rec({ id: 'rec-2', text: 'Deepen rapport in act two.' }),
      rec({ id: 'rec-3', text: 'Align the logline with the ending.' }),
    ])
    expect(formatted).toBe(
      '1. Show the aftermath.\n2. Deepen rapport in act two.\n3. Align the logline with the ending.'
    )
  })

  it('skips empty instructions', () => {
    expect(
      formatResonanceFixInstructions([
        rec({ text: '', reason: '', title: '' }),
        rec({ text: 'Keep the betrayal.' }),
      ])
    ).toBe('1. Keep the betrayal.')
  })
})

describe('appendFixInstruction / removeFixInstruction', () => {
  it('starts a numbered list when the field is empty', () => {
    expect(appendFixInstruction('', 'Show the aftermath.')).toBe(
      '1. Show the aftermath.'
    )
  })

  it('appends the next number and does not duplicate', () => {
    const once = appendFixInstruction('1. Show the aftermath.', 'Deepen rapport.')
    expect(once).toBe('1. Show the aftermath.\n2. Deepen rapport.')
    expect(appendFixInstruction(once, 'Deepen rapport.')).toBe(once)
    expect(appendFixInstruction(once, 'Show the aftermath.')).toBe(once)
  })

  it('removes a line and renumbers the rest', () => {
    const current =
      '1. Show the aftermath.\n2. Deepen rapport.\n3. Align the logline.'
    expect(removeFixInstruction(current, 'Deepen rapport.')).toBe(
      '1. Show the aftermath.\n2. Align the logline.'
    )
    expect(removeFixInstruction(current, 'Show the aftermath.')).toBe(
      '1. Deepen rapport.\n2. Align the logline.'
    )
  })

  it('refuses to append past the intent character cap', () => {
    const almostFull = 'x'.repeat(MAX_INTENT_CHARS - 5)
    expect(appendFixInstruction(almostFull, 'A much longer fix instruction')).toBe(
      almostFull
    )
    expect(appendFixInstruction('', 'Short fix', 20)).toBe('1. Short fix')
    expect(appendFixInstruction('', 'This will not fit', 10)).toBe('')
  })
})

describe('focusScopeForRecommendations', () => {
  it('keeps a single shared section when nothing else is impacted', () => {
    expect(
      focusScopeForRecommendations([
        rec({ fixSection: 'story' }),
        rec({ id: 'rec-2', fixSection: 'story', impactSections: ['story'] }),
      ])
    ).toBe('story')
  })

  it('opens full-balance when recs span sections', () => {
    expect(
      focusScopeForRecommendations([
        rec({ fixSection: 'story' }),
        rec({ id: 'rec-2', fixSection: 'characters' }),
      ])
    ).toBe('all')
  })

  it('opens full-balance when a rec impacts another section', () => {
    expect(
      focusScopeForRecommendations([
        rec({ fixSection: 'story', impactSections: ['story', 'beats'] }),
      ])
    ).toBe('all')
  })

  it('defaults empty lists to full-balance', () => {
    expect(focusScopeForRecommendations([])).toBe('all')
  })
})
