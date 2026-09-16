import { describe, expect, it } from 'vitest'
import {
  LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION,
  LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
  LOCATION_TURNAROUND_USER_PROMPT_HINT,
  LOCATION_VERSION_CONSUMPTION_SUFFIX,
  LOCATION_VERSION_GENERATION_INSTRUCTION,
  buildLocationConsumptionInstruction,
  buildLocationReferencePromptLine,
  buildLocationVersionPrompt,
  stripBeatPropsFromLocationStateNotes,
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
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION).toContain('unbroken single-camera frame')
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

  it('attenuates location consumption on a close-up to lighting and palette bokeh', () => {
    const instruction = buildLocationConsumptionInstruction({
      shotType: 'Insert Shot',
      promptToken: 'location [2]',
    })
    expect(instruction.toLowerCase()).toContain('shallow-focus background bokeh')
    expect(instruction).toContain('location [2]')
    expect(instruction.toLowerCase()).not.toContain('match architectural layout')

    const line = buildLocationReferencePromptLine('TITLE SEQUENCE', 2, undefined, {
      shotType: 'Extreme Close-Up',
      promptToken: 'location [2]',
    })
    expect(line.toLowerCase()).toContain('bokeh')
    expect(line.toLowerCase()).not.toContain('match architectural layout')
  })

  it('keeps architectural layout match on a two-shot', () => {
    expect(buildLocationConsumptionInstruction({ shotType: 'Two-Shot' })).toBe(
      LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION
    )
    expect(buildLocationConsumptionInstruction({ shotType: 'Medium Shot' })).toBe(
      LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION
    )
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

  it('strips handheld beat props such as unspooled drafting vellum from version prompts', () => {
    const notes =
      'Front door exploded, debris across the floor. A heavy roll of drafting vellum with vibrant violet ink schematics is unspooled across the damp flagstones. The floor is flooded.'
    const cleaned = stripBeatPropsFromLocationStateNotes(notes, ['drafting vellum'])
    expect(cleaned.toLowerCase()).not.toMatch(/vellum/)
    expect(cleaned.toLowerCase()).not.toMatch(/unspooled/)
    expect(cleaned).toMatch(/exploded/i)
    expect(cleaned).toMatch(/flood/i)

    const prompt = buildLocationVersionPrompt({
      locationName: 'FOYER',
      stateNotes: notes,
      catalogPropNames: ['drafting vellum'],
    })
    expect(prompt).toContain(cleaned)
    expect(prompt).not.toMatch(/unspooled/i)
    expect(prompt).not.toMatch(/violet ink/i)
    expect(LOCATION_VERSION_GENERATION_INSTRUCTION.toLowerCase()).toContain('handheld')
    expect(LOCATION_VERSION_GENERATION_INSTRUCTION.toLowerCase()).toContain('keyprops')
  })

  it('stripBeatPropsFromLocationStateNotes keeps structural clauses only', () => {
    const cleaned = stripBeatPropsFromLocationStateNotes(
      'Windows boarded. Piper unrolls drafting vellum across the desk. Furniture overturned.',
      ['drafting vellum']
    )
    expect(cleaned.toLowerCase()).toMatch(/windows boarded/)
    expect(cleaned.toLowerCase()).toMatch(/furniture overturned/)
    expect(cleaned.toLowerCase()).not.toMatch(/vellum/)
  })
})
