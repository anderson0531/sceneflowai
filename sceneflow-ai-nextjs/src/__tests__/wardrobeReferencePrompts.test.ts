import { describe, it, expect } from 'vitest'
import {
  WARDROBE_REFERENCE_ASPECT_RATIO,
  WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION,
  buildWardrobeTurnaroundPrompt,
  buildWardrobeTurnaroundSubjectDescription,
} from '@/lib/character/wardrobeReferencePrompts'

describe('wardrobeReferencePrompts', () => {
  it('uses 16:9 aspect ratio for single-row sheets', () => {
    expect(WARDROBE_REFERENCE_ASPECT_RATIO).toBe('16:9')
  })

  it('builds mannequin-only subject description without character anchor', () => {
    const subject = buildWardrobeTurnaroundSubjectDescription()
    expect(subject.toLowerCase()).toContain('faceless')
    expect(subject).not.toContain('[img-1]')
  })

  it('builds single-row mannequin turnaround prompt', () => {
    const prompt = buildWardrobeTurnaroundPrompt({
      wardrobeDescription: 'Navy blazer, white shirt, dark trousers',
      gender: 'male',
    })

    expect(prompt.toLowerCase()).toContain('one horizontal row')
    expect(prompt.toLowerCase()).toContain('faceless')
    expect(prompt.toLowerCase()).not.toContain('headshot')
    expect(prompt.toLowerCase()).not.toContain('top row')
  })

  it('consumption instruction references front full-body view only', () => {
    expect(WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION).toContain('FRONT full-body view')
    expect(WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION).not.toContain('BOTTOM ROW')
    expect(WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION).not.toContain('TOP ROW')
  })
})
