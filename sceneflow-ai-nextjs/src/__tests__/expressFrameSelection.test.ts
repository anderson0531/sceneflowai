import { describe, expect, it } from 'vitest'
import {
  enumerateStoryboardFrameSlots,
  filterStoryboardSlotsForExpressChecklist,
  isStoryboardSlotSelected,
  countSelectedExpressFrameSlots,
  type StoryboardFrameSlot,
} from '@/lib/storyboard/types'

function slot(key: string, overrides: Partial<StoryboardFrameSlot> = {}): StoryboardFrameSlot {
  return {
    key,
    label: key,
    kind: 'action',
    isPlaceholder: false,
    isMissing: false,
    ...overrides,
  }
}

describe('express frame slot selection helpers', () => {
  it('filterStoryboardSlotsForExpressChecklist hides end frames unless included', () => {
    const slots = [
      slot('beat-1', { frameRole: 'start', beatId: 'beat-1' }),
      slot('beat-1-end', { frameRole: 'end', beatId: 'beat-1' }),
      slot('custom-1', { kind: 'custom', customFrameId: 'custom-1' }),
    ]

    expect(filterStoryboardSlotsForExpressChecklist(slots, { includeEndFrames: false })).toHaveLength(2)
    expect(filterStoryboardSlotsForExpressChecklist(slots, { includeEndFrames: true })).toHaveLength(3)
  })

  it('isStoryboardSlotSelected checks membership in the selection set', () => {
    const selected = new Set(['beat-1', 'beat-2-end'])
    expect(isStoryboardSlotSelected(slot('beat-1'), selected)).toBe(true)
    expect(isStoryboardSlotSelected(slot('beat-1-end'), selected)).toBe(false)
    expect(isStoryboardSlotSelected(slot('beat-2-end', { frameRole: 'end' }), selected)).toBe(true)
  })

  it('countSelectedExpressFrameSlots respects includeEndFrames filter', () => {
    const slots = [
      slot('beat-1', { frameRole: 'start' }),
      slot('beat-1-end', { frameRole: 'end' }),
    ]
    const selected = new Set(['beat-1', 'beat-1-end'])

    expect(
      countSelectedExpressFrameSlots(slots, selected, { includeEndFrames: false })
    ).toBe(1)
    expect(
      countSelectedExpressFrameSlots(slots, selected, { includeEndFrames: true })
    ).toBe(2)
  })

  it('enumerateStoryboardFrameSlots uses stable beat start and end keys', () => {
    const scene = {
      beats: [
        {
          beatId: 'b1',
          kind: 'action',
          sequenceIndex: 0,
          storyboardImageUrl: 'https://example.com/start.jpg',
          storyboardEndImageUrl: 'https://example.com/end.jpg',
        },
      ],
    }

    const keys = enumerateStoryboardFrameSlots(scene).map((s) => s.key)
    expect(keys).toContain('b1')
    expect(keys).toContain('b1-end')
  })
})
