import { describe, it, expect } from 'vitest'
import { buildBeatAlignedMusicClips } from '@/lib/storyboard/musicPlayback'
import type { StoryboardVisualFrame } from '@/lib/storyboard/types'

describe('buildBeatAlignedMusicClips', () => {
  const musicUrl = 'https://example.com/music.mp3'

  it('assigns a shared fadeAnchorTime to all beat music clips', () => {
    const scene = {
      beats: [
        { beatId: 'b1', kind: 'dialogue', musicEnabled: true },
        { beatId: 'b2', kind: 'dialogue', musicEnabled: true },
        { beatId: 'b3', kind: 'action', musicEnabled: true },
      ],
    }

    const visualFrames: StoryboardVisualFrame[] = [
      {
        clipId: 'c1',
        beatId: 'b1',
        startTime: 0,
        duration: 5,
        imageUrl: 'https://example.com/1.jpg',
      },
      {
        clipId: 'c2',
        beatId: 'b2',
        startTime: 5.3,
        duration: 4,
        imageUrl: 'https://example.com/2.jpg',
      },
      {
        clipId: 'c3',
        beatId: 'b3',
        startTime: 9.6,
        duration: 3,
        imageUrl: 'https://example.com/3.jpg',
      },
    ]

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl,
      sceneDuration: 15,
    })

    expect(clips).toHaveLength(3)
    expect(clips.every((c) => c.fadeAnchorTime === 0)).toBe(true)
    expect(clips[0].startTime).toBe(0)
    expect(clips[1].startTime).toBe(5.3)
  })

  it('uses earliest enabled beat startTime as fadeAnchor when first beat has music off', () => {
    const scene = {
      beats: [
        { beatId: 'b1', kind: 'action', musicEnabled: false },
        { beatId: 'b2', kind: 'dialogue', musicEnabled: true },
      ],
    }

    const visualFrames: StoryboardVisualFrame[] = [
      {
        clipId: 'c1',
        beatId: 'b1',
        startTime: 0,
        duration: 3,
        imageUrl: 'https://example.com/1.jpg',
      },
      {
        clipId: 'c2',
        beatId: 'b2',
        startTime: 3.3,
        duration: 5,
        imageUrl: 'https://example.com/2.jpg',
      },
    ]

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl,
      sceneDuration: 10,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].fadeAnchorTime).toBe(3.3)
    expect(clips[0].startTime).toBe(3.3)
  })
})
