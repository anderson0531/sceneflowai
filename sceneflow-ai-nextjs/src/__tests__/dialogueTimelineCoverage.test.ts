import { describe, it, expect } from 'vitest'
import {
  validateAndRepairTimelineDialogueCoverage,
  normalizeTimelineIndices,
  repairPhase1DirectionsTimeline,
} from '@/lib/scene/dialogueTimelineCoverage'

describe('dialogueTimelineCoverage', () => {
  it('leaves valid coverage unchanged', () => {
    const segments = [
      { sequence: 1, assigned_dialogue_indices: [0] },
      { sequence: 2, assigned_dialogue_indices: [1] },
    ]
    const out = validateAndRepairTimelineDialogueCoverage(segments, 2, 'test-scene')
    expect(out[0].assigned_dialogue_indices).toEqual([0])
    expect(out[1].assigned_dialogue_indices).toEqual([1])
  })

  it('removes duplicate index assignments (keeps first segment)', () => {
    const segments = [
      { sequence: 1, assigned_dialogue_indices: [0, 1] },
      { sequence: 2, assigned_dialogue_indices: [1] },
    ]
    const out = validateAndRepairTimelineDialogueCoverage(segments, 2, 'test-scene')
    expect(out[0].assigned_dialogue_indices).toContain(0)
    expect(out[0].assigned_dialogue_indices).toContain(1)
    expect(out[1].assigned_dialogue_indices || []).not.toContain(1)
  })

  it('assigns missing index to lightest segment', () => {
    const segments = [
      { sequence: 1, assigned_dialogue_indices: [0] },
      { sequence: 2, assigned_dialogue_indices: [] as number[] },
    ]
    const out = validateAndRepairTimelineDialogueCoverage(segments, 2, 'test-scene')
    const all = out.flatMap((s) => s.assigned_dialogue_indices || [])
    expect(all.sort()).toEqual([0, 1])
  })

  it('normalizeTimelineIndices drops out-of-range and coerces strings', () => {
    expect(normalizeTimelineIndices(['0', 1, '2', 99, -1], 3)).toEqual([0, 1, 2])
  })

  it('repairPhase1DirectionsTimeline dedupes duplicate rows and covers missing last index', () => {
    const raw = [
      { dialogue_indices: [0, 1, 2], id: 'a' },
      { dialogue_indices: [0, 1, 2], id: 'b' },
    ]
    const out = repairPhase1DirectionsTimeline(raw, 4, 'test-scene')
    expect(out.length).toBeGreaterThanOrEqual(1)
    const all = out.flatMap((d) => d.dialogue_indices || [])
    expect([...all].sort((x, y) => x - y)).toEqual([0, 1, 2, 3])
    const owners = new Map<number, number>()
    out.forEach((d, si) => {
      for (const i of d.dialogue_indices || []) {
        expect(owners.has(i)).toBe(false)
        owners.set(i, si)
      }
    })
  })
})
