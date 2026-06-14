import { describe, expect, it } from 'vitest'
import {
  LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION,
  LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
  LOCATION_TURNAROUND_GRID_LAYOUT,
  LOCATION_TURNAROUND_USER_PROMPT_HINT,
  buildLocationReferencePromptLine,
} from '@/lib/vision/locationReferencePrompts'

describe('locationReferencePrompts', () => {
  it('generation instruction requests 2x2 grid with explicit N/E/S/W panel assignments', () => {
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('2x2 grid')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('4 distinct')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('do not generate 4 identical')
    expect(LOCATION_TURNAROUND_GRID_LAYOUT.toLowerCase()).toContain('top-left: north')
    expect(LOCATION_TURNAROUND_GRID_LAYOUT.toLowerCase()).toContain('top-right: east')
    expect(LOCATION_TURNAROUND_GRID_LAYOUT.toLowerCase()).toContain('bottom-left: south')
    expect(LOCATION_TURNAROUND_GRID_LAYOUT.toLowerCase()).toContain('bottom-right: west')
  })

  it('consumption instruction requires exactly one panel and forbids full sheet output', () => {
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('exactly one')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('no more than one')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION).toContain('ONE unified full-frame')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('never reproduce')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('2x2 grid')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('north')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('legacy')
  })

  it('user prompt hint emphasizes single panel from N/E/S/W turnaround', () => {
    expect(LOCATION_TURNAROUND_USER_PROMPT_HINT.toLowerCase()).toContain('pick exactly 1 panel')
    expect(LOCATION_TURNAROUND_USER_PROMPT_HINT.toLowerCase()).toContain('never use the full sheet')
    expect(LOCATION_TURNAROUND_USER_PROMPT_HINT.toLowerCase()).toContain('n/e/s/w')
  })

  it('buildLocationReferencePromptLine includes reference index and cardinal directions', () => {
    const line = buildLocationReferencePromptLine('Kitchen', 5)
    expect(line).toContain('Reference image 5')
    expect(line).toContain('Kitchen')
    expect(line.toLowerCase()).toContain('exactly one')
    expect(line.toLowerCase()).toContain('north')
    expect(line.toLowerCase()).toContain('east')
  })
})
