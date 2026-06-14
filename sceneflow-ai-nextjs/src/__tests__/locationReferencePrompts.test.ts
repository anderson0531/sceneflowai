import { describe, expect, it } from 'vitest'
import {
  LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION,
  LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
  LOCATION_TURNAROUND_USER_PROMPT_HINT,
  buildLocationReferencePromptLine,
} from '@/lib/vision/locationReferencePrompts'

describe('locationReferencePrompts', () => {
  it('generation instruction requests single extreme-wide establishing shot', () => {
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('extreme wide')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('single unified')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('not a 2x2 grid')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('not a multi-panel')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('no people')
  })

  it('consumption instruction matches layout and palette from single reference', () => {
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('wide-angle')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('match architectural layout')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('color palette')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION).toContain('ONE unified full-frame')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).not.toContain('exactly one panel')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).not.toContain('forward')
  })

  it('user prompt hint emphasizes single extreme-wide establishing shot', () => {
    expect(LOCATION_TURNAROUND_USER_PROMPT_HINT.toLowerCase()).toContain('extreme-wide')
    expect(LOCATION_TURNAROUND_USER_PROMPT_HINT.toLowerCase()).toContain('match layout and palette')
  })

  it('buildLocationReferencePromptLine includes reference index and consumption instruction', () => {
    const line = buildLocationReferencePromptLine('Kitchen', 5)
    expect(line).toContain('Reference image 5')
    expect(line).toContain('Kitchen')
    expect(line.toLowerCase()).toContain('wide-angle')
    expect(line.toLowerCase()).toContain('match architectural layout')
  })
})
