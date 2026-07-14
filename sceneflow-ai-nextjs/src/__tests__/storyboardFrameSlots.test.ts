import { describe, it, expect } from 'vitest'
import {
  countMissingStoryboardFrames,
  countStoryboardFrameStats,
  countStoryboardFramesNeedingGeneration,
  enumerateStoryboardFrameSlots,
  sceneHasNoOwnedBeatImages,
} from '@/lib/storyboard/types'
import { applyExpressStoryboardImageToScene, getStoryboardTimelineBeats } from '@/lib/script/beatMigration'

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
    const action = slots.find((s) => s.beatId === 'bt_action')
    const narrator = slots.find((s) => s.beatId === 'bt_narr')
    expect(slots).toHaveLength(2)
    expect(action?.beatIndex).toBe(0)
    expect(action?.beatNumber).toBe(1)
    expect(action?.ownImageUrl).toBe('https://example.com/establishing.jpg')
    expect(narrator?.beatIndex).toBe(1)
    expect(narrator?.beatNumber).toBe(2)
    expect(narrator?.isPlaceholder).toBe(true)
    expect(narrator?.isMissing).toBe(false)
    expect(narrator?.ownImageUrl).toBeUndefined()
    expect(narrator?.displayImageUrl).toBe('https://example.com/establishing.jpg')

    const stats = countStoryboardFrameStats(scene)
    expect(stats.withImage).toBe(1)
    expect(stats.total).toBe(2)
    expect(stats.placeholders).toBe(1)
    expect(countStoryboardFramesNeedingGeneration(scene)).toBe(1)
    expect(countMissingStoryboardFrames(scene)).toBe(0)
  })

  it('uses beat stored URL for ownImageUrl; display falls back to scene.imageUrl when beat lacks image', () => {
    const sceneWithStaleBeat = {
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

    const slots = enumerateStoryboardFrameSlots(sceneWithStaleBeat)
    expect(slots[0]?.ownImageUrl).toBe('https://example.com/old-establishing.jpg')
    expect(slots[0]?.displayImageUrl).toBe('https://example.com/old-establishing.jpg')

    const sceneNoBeatImage = {
      imageUrl: 'https://example.com/new-establishing.jpg',
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide',
        },
      ],
    }

    const fallbackSlots = enumerateStoryboardFrameSlots(sceneNoBeatImage)
    expect(fallbackSlots[0]?.ownImageUrl).toBeUndefined()
    expect(fallbackSlots[0]?.displayImageUrl).toBe('https://example.com/new-establishing.jpg')
    expect(fallbackSlots[0]?.isPlaceholder).toBe(true)
    expect(countStoryboardFramesNeedingGeneration(sceneNoBeatImage)).toBe(1)
  })

  it('reflects beat-0 Express update on establishing display URLs immediately', () => {
    const scene = {
      imageUrl: 'https://example.com/old-establishing.jpg',
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide opening',
        },
        {
          beatId: 'bt_action2',
          sequenceIndex: 1,
          kind: 'action',
          actionDescription: 'Tracking',
        },
      ],
    }

    const updated = applyExpressStoryboardImageToScene(scene, {
      imageUrl: 'https://example.com/new-establishing.jpg',
      beatIndex: 0,
      imageTier: 'draft',
    })

    const slots = enumerateStoryboardFrameSlots(updated)
    expect(updated.imageUrl).toBe('https://example.com/new-establishing.jpg')
    expect(slots[0]?.displayImageUrl).toBe('https://example.com/new-establishing.jpg')
    expect(slots[1]?.displayImageUrl).toBe('https://example.com/new-establishing.jpg')
  })

  it('includes all 8 beats in frame slots for directed action before dialogue', () => {
    const beats = [
      {
        beatId: 'bt_0',
        sequenceIndex: 0,
        kind: 'action' as const,
        actionDescription:
          "CLOSE UP: Elara's hands, now visibly trembling, are clasped tightly on the cold table surface.",
      },
      {
        beatId: 'bt_1',
        sequenceIndex: 1,
        kind: 'dialogue' as const,
        character: 'ELARA VANCE',
        line: "I'm telling you, it wasn't me!",
        lineId: 'ln_1',
      },
      {
        beatId: 'bt_2',
        sequenceIndex: 2,
        kind: 'action' as const,
        actionDescription:
          "OFF-SCREEN VOICE: A DETECTIVE'S voice cuts her off. A folder SLIDES onto the table.",
      },
      {
        beatId: 'bt_3',
        sequenceIndex: 3,
        kind: 'action' as const,
        actionDescription:
          'INSERT SHOT: The folder opens to reveal crisp, high-resolution photographs.',
      },
      {
        beatId: 'bt_4',
        sequenceIndex: 4,
        kind: 'dialogue' as const,
        character: 'ELARA VANCE',
        line: "No... that's not possible!",
        lineId: 'ln_2',
      },
      {
        beatId: 'bt_5',
        sequenceIndex: 5,
        kind: 'action' as const,
        actionDescription:
          'MEDIUM SHOT: Elara pushes the photos away, recoiling.',
      },
      {
        beatId: 'bt_6',
        sequenceIndex: 6,
        kind: 'dialogue' as const,
        character: 'ELARA VANCE',
        line: 'You have to believe me!',
        lineId: 'ln_3',
      },
      {
        beatId: 'bt_7',
        sequenceIndex: 7,
        kind: 'action' as const,
        actionDescription:
          "CLOSE UP: The detective's hand taps the folder.",
      },
    ]

    const scene = {
      dialogue: [
        { lineId: 'ln_1', character: 'ELARA VANCE', line: "I'm telling you, it wasn't me!" },
        { lineId: 'ln_2', character: 'ELARA VANCE', line: "No... that's not possible!" },
        { lineId: 'ln_3', character: 'ELARA VANCE', line: 'You have to believe me!' },
      ],
      beats,
    }

    expect(getStoryboardTimelineBeats(scene)).toHaveLength(8)
    expect(enumerateStoryboardFrameSlots(scene)).toHaveLength(8)
    expect(countStoryboardFramesNeedingGeneration(scene)).toBe(8)
  })

  it('sceneHasNoOwnedBeatImages is true when all slots lack own images', () => {
    const scene = {
      beats: [
        { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Wide' },
        { beatId: 'bt_2', sequenceIndex: 1, kind: 'dialogue', character: 'A', line: 'Hi' },
      ],
    }
    expect(sceneHasNoOwnedBeatImages(scene)).toBe(true)
  })

  it('sceneHasNoOwnedBeatImages is false when a beat has storyboardImageUrl', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide',
          storyboardImageUrl: 'https://example.com/beat1.jpg',
        },
        { beatId: 'bt_2', sequenceIndex: 1, kind: 'dialogue', character: 'A', line: 'Hi' },
      ],
    }
    expect(sceneHasNoOwnedBeatImages(scene)).toBe(false)
  })

  it('sceneHasNoOwnedBeatImages is true when slots only show establishing placeholders', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide',
        },
        {
          beatId: 'bt_2',
          sequenceIndex: 1,
          kind: 'narration',
          character: 'NARRATOR',
          line: 'Voiceover.',
          lineId: 'ln_1',
        },
      ],
      dialogue: [
        { lineId: 'ln_1', kind: 'narration', character: 'NARRATOR', line: 'Voiceover.' },
      ],
    }
    const slots = enumerateStoryboardFrameSlots(scene)
    expect(slots.every((s) => !s.ownImageUrl)).toBe(true)
    expect(slots.some((s) => s.isPlaceholder)).toBe(true)
    expect(sceneHasNoOwnedBeatImages(scene)).toBe(true)
  })
})
