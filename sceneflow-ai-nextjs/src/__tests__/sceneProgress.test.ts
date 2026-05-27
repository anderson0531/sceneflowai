import { describe, it, expect } from 'vitest'
import {
  buildSceneProgressItem,
  sceneHasBeatFrames,
  getStoryboardBeatProgress,
} from '@/lib/production/sceneProgress'

describe('sceneProgress', () => {
  it('uses beat frames (start+end) not scene.imageUrl for hasFrame', () => {
    const scene = { id: 's1', imageUrl: 'https://example.com/est.jpg', narration: 'Hello' }
    const withImageOnly = buildSceneProgressItem(scene, 0, {
      isSegmented: true,
      segments: [
        {
          segmentId: 'seg1',
          startFrameUrl: 'https://example.com/start.jpg',
          endFrameUrl: undefined,
        } as never,
      ],
    })
    expect(withImageOnly.hasFrame).toBe(false)

    const complete = buildSceneProgressItem(scene, 0, {
      isSegmented: true,
      segments: [
        {
          segmentId: 'seg1',
          startFrameUrl: 'https://example.com/start.jpg',
          endFrameUrl: 'https://example.com/end.jpg',
        } as never,
      ],
    })
    expect(complete.hasFrame).toBe(true)
  })

  it('counts storyboard beat progress from beats[]', () => {
    const scene = {
      beats: [
        { beatId: 'b1', kind: 'narration', storyboardImageUrl: 'https://a.png' },
        { beatId: 'b2', kind: 'dialogue', line: 'Hi' },
      ],
    }
    expect(getStoryboardBeatProgress(scene)).toEqual({ complete: 1, total: 2 })
  })

  it('sceneHasBeatFrames requires both frames on every segment', () => {
    expect(
      sceneHasBeatFrames({
        segments: [{ startFrameUrl: 'a', endFrameUrl: 'b' } as never],
      } as never)
    ).toBe(true)
    expect(sceneHasBeatFrames({ segments: [] } as never)).toBe(false)
  })
})
