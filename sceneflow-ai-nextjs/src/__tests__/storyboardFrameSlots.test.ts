import { describe, it, expect } from 'vitest'
import {
  countMissingStoryboardFrames,
  countStoryboardFrameStats,
  countStoryboardFramesNeedingGeneration,
  enumerateStoryboardFrameSlots,
} from '@/lib/storyboard/types'

describe('storyboard frame slots', () => {
  it('marks dialogue line as placeholder when only establishing image exists', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      dialogue: [
        {
          lineId: 'ln_narr',
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Voiceover line.',
        },
      ],
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide',
          storyboardImageUrl: 'https://example.com/establishing.jpg',
        },
        {
          beatId: 'bt_narr',
          sequenceIndex: 1,
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Voiceover line.',
          lineId: 'ln_narr',
        },
      ],
    }

    const slots = enumerateStoryboardFrameSlots(scene)
    const narrator = slots.find((s) => s.beatId === 'bt_narr')
    // Leading action beat is excluded from playback timeline when followed by spoken beat
    expect(narrator?.beatIndex).toBe(0)
    expect(narrator?.isPlaceholder).toBe(true)
    expect(narrator?.isMissing).toBe(false)
    expect(narrator?.ownImageUrl).toBeUndefined()
    expect(narrator?.displayImageUrl).toBe('https://example.com/establishing.jpg')

    const stats = countStoryboardFrameStats(scene)
    expect(stats.withImage).toBe(0)
    expect(stats.total).toBe(1)
    expect(stats.placeholders).toBe(1)
    expect(countStoryboardFramesNeedingGeneration(scene)).toBe(1)
    expect(countMissingStoryboardFrames(scene)).toBe(0)
  })

  it('prefers scene.imageUrl over stale action beat URL after establishing upload', () => {
    const scene = {
      imageUrl: 'https://example.com/new-establishing.jpg',
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide',
          storyboardImageUrl: 'https://example.com/old-establishing.jpg',
        },
      ],
    }

    const slots = enumerateStoryboardFrameSlots(scene)
    expect(slots[0]?.ownImageUrl).toBe('https://example.com/new-establishing.jpg')
    expect(slots[0]?.isPlaceholder).toBe(false)
    expect(countStoryboardFramesNeedingGeneration(scene)).toBe(0)
  })
})
