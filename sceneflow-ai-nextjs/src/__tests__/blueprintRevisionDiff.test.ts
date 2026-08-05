import { describe, it, expect } from 'vitest'
import {
  buildFieldDiffs,
  detectMissingBalanceSections,
  mergeRevisionIntoVariant,
} from '@/lib/treatment/blueprintRevisionDiff'

describe('blueprintRevisionDiff', () => {
  it('buildFieldDiffs detects changed fields', () => {
    const before = { title: 'Old', logline: 'Same' }
    const after = { title: 'New', logline: 'Same' }
    const diffs = buildFieldDiffs(before, after)
    expect(diffs).toHaveLength(1)
    expect(diffs[0].field).toBe('title')
    expect(diffs[0].before).toBe('Old')
    expect(diffs[0].after).toBe('New')
  })

  it('detectMissingBalanceSections flags story/beats when characters planned', () => {
    const missing = detectMissingBalanceSections(['characters'], { character_descriptions: [] })
    expect(missing).toContain('story')
    expect(missing).toContain('beats')
  })

  it('mergeRevisionIntoVariant merges narrative_reasoning', () => {
    const merged = mergeRevisionIntoVariant(
      { title: 'A', narrative_reasoning: { character_focus: 'x' } },
      {
        title: 'B',
        narrative_reasoning: { user_adjustments: 'Updated logline' },
      }
    )
    expect(merged.title).toBe('B')
    expect((merged.narrative_reasoning as Record<string, unknown>).character_focus).toBe('x')
    expect((merged.narrative_reasoning as Record<string, unknown>).user_adjustments).toBe(
      'Updated logline'
    )
  })

  it('buildFieldDiffs humanizes total_duration_seconds', () => {
    const diffs = buildFieldDiffs(
      { total_duration_seconds: 600 },
      { total_duration_seconds: 2700 }
    )
    expect(diffs).toHaveLength(1)
    expect(diffs[0].before).toBe('10 min (600 sec)')
    expect(diffs[0].after).toBe('45 min (2700 sec)')
  })
})
