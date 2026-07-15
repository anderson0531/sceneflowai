import { describe, it, expect } from 'vitest'
import {
  buildBeatAlignedMusicClips,
  groupContiguousMusicFrames,
} from '@/lib/storyboard/musicPlayback'
import type { StoryboardVisualFrame } from '@/lib/storyboard/types'

describe('buildBeatAlignedMusicClips', () => {
  const musicUrl = 'https://example.com/music.mp3'

  it('merges contiguous music-enabled beats into one scene clip', () => {
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
        startTime: 5,
        duration: 4,
        imageUrl: 'https://example.com/2.jpg',
      },
      {
        clipId: 'c3',
        beatId: 'b3',
        startTime: 9,
        duration: 3,
        imageUrl: 'https://example.com/3.jpg',
      },
    ]

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl,
      sceneDuration: 15,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].id).toBe('music-scene')
    expect(clips[0].fadeAnchorTime).toBe(0)
    expect(clips[0].startTime).toBe(0)
    expect(clips[0].duration).toBe(12)
    expect(clips[0].loop).toBe(true)
  })

  it('splits music into two clips when a middle beat disables music', () => {
    const scene = {
      beats: [
        { beatId: 'b1', kind: 'dialogue', musicEnabled: true },
        { beatId: 'b2', kind: 'dialogue', musicEnabled: false },
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
        startTime: 5,
        duration: 4,
        imageUrl: 'https://example.com/2.jpg',
      },
      {
        clipId: 'c3',
        beatId: 'b3',
        startTime: 9,
        duration: 3,
        imageUrl: 'https://example.com/3.jpg',
      },
    ]

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl,
      sceneDuration: 15,
    })

    expect(clips).toHaveLength(2)
    expect(clips[0].id).toBe('music-b1')
    expect(clips[0].startTime).toBe(0)
    expect(clips[0].duration).toBe(5)
    expect(clips[1].id).toBe('music-b3')
    expect(clips[1].startTime).toBe(9)
    expect(clips[1].duration).toBe(3)
    expect(clips.every((c) => c.fadeAnchorTime === 0)).toBe(true)
  })

  it('bounds leading partial run to enabled beats only (not music-scene)', () => {
    const scene = {
      beats: [
        { beatId: 'b1', kind: 'dialogue', musicEnabled: true },
        { beatId: 'b2', kind: 'dialogue', musicEnabled: true },
        { beatId: 'b3', kind: 'action', musicEnabled: false },
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
        startTime: 5,
        duration: 4,
        imageUrl: 'https://example.com/2.jpg',
      },
      {
        clipId: 'c3',
        beatId: 'b3',
        startTime: 9,
        duration: 3,
        imageUrl: 'https://example.com/3.jpg',
      },
    ]

    const clips = buildBeatAlignedMusicClips(scene, visualFrames, {
      musicUrl,
      sceneDuration: 15,
    })

    expect(clips).toHaveLength(1)
    expect(clips[0].id).toBe('music-b1')
    expect(clips[0].id).not.toBe('music-scene')
    expect(clips[0].startTime).toBe(0)
    expect(clips[0].duration).toBe(9)
    expect(clips[0].loop).toBe(true)
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
    expect(clips[0].id).toBe('music-b2')
  })
})

describe('groupContiguousMusicFrames', () => {
  it('groups frames within tolerance and splits on gaps', () => {
    const frames: StoryboardVisualFrame[] = [
      { clipId: 'c1', beatId: 'b1', startTime: 0, duration: 5, imageUrl: 'x' },
      { clipId: 'c2', beatId: 'b2', startTime: 5, duration: 4, imageUrl: 'x' },
      { clipId: 'c3', beatId: 'b3', startTime: 12, duration: 3, imageUrl: 'x' },
    ]

    const groups = groupContiguousMusicFrames(frames)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveLength(2)
    expect(groups[1]).toHaveLength(1)
  })
})
