import { describe, expect, it } from 'vitest'
import {
  LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION,
  LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
  LOCATION_TURNAROUND_USER_PROMPT_HINT,
  LOCATION_VERSION_CONSUMPTION_SUFFIX,
  LOCATION_VERSION_GENERATION_INSTRUCTION,
  buildLocationReferencePromptLine,
  buildLocationVersionPrompt,
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
    expect(line).not.toContain('CURRENT set state')
  })

  it('version consumption suffix is attached only for current set-state stills', () => {
    const line = buildLocationReferencePromptLine('Kitchen', 5, undefined, { currentSetState: true })
    expect(line).toContain(LOCATION_VERSION_CONSUMPTION_SUFFIX)
    expect(line.toLowerCase()).toContain('do not restore')
  })

  it('version generation prompt locks architecture to the base and bakes stateNotes', () => {
    const prompt = buildLocationVersionPrompt({
      locationName: 'FOYER',
      stateNotes: 'Front door exploded, debris across the floor',
    })
    expect(prompt).toContain(LOCATION_TURNAROUND_GENERATION_INSTRUCTION)
    expect(prompt).toContain(LOCATION_VERSION_GENERATION_INSTRUCTION)
    expect(prompt).toMatch(/front door exploded/i)
    expect(prompt.toLowerCase()).toContain('match architecture')
    expect(prompt.toLowerCase()).toContain('no people')
  })
})
