import { describe, it, expect } from 'vitest'
import {
  coerceDialogueLineText,
  normalizeDialogueEntry,
} from '@/lib/script/segmentScript'

describe('dialogueTextCoercion', () => {
  it('coerces nested dialogue objects', () => {
    expect(
      coerceDialogueLineText({ character: 'Sarah', line: 'Hello world.' })
    ).toBe('Hello world.')
  })

  it('normalizes flat dialogue entries with nested line', () => {
    const entry = normalizeDialogueEntry({
      character: 'Ben',
      line: { character: 'Ben', line: '[calmly] Peace is here.' },
    })
    expect(entry.character).toBe('Ben')
    expect(entry.line).toBe('[calmly] Peace is here.')
  })
})
