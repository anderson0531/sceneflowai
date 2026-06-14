import { describe, expect, it } from 'vitest'
import {
  LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION,
  LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
  LOCATION_TURNAROUND_USER_PROMPT_HINT,
} from '@/lib/vision/locationReferencePrompts'

describe('locationReferencePrompts', () => {
  it('generation instruction requests 4 distinct separate camera angles in 2x2 grid', () => {
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('2x2 grid')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('4 distinct')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('do not generate 4 identical')
    expect(LOCATION_TURNAROUND_GENERATION_INSTRUCTION.toLowerCase()).toContain('different facing view')
  })

  it('consumption instruction forbids multi-panel output and supports legacy layouts', () => {
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION).toContain('ONE unified full-frame')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('never reproduce')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('2x2 grid')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('4 distinct angles')
    expect(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION.toLowerCase()).toContain('legacy')
  })

  it('user prompt hint emphasizes single cinematic frame and 4 angles', () => {
    expect(LOCATION_TURNAROUND_USER_PROMPT_HINT).toContain('single cinematic frame only')
    expect(LOCATION_TURNAROUND_USER_PROMPT_HINT).toContain('4 distinct angles')
  })
})
