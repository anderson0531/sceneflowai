import { describe, it, expect } from 'vitest'
import { resolveScreeningVideoStreamUrl } from '@/lib/final-cut/resolveScreeningVideoStreamUrl'
import type { FinalCutSelection } from '@/lib/types/finalCut'

const sceneId = 'scene-1'

function makeSceneState(streams: Array<Record<string, unknown>>) {
  return {
    [sceneId]: {
      productionStreams: streams,
    },
  }
}

describe('resolveScreeningVideoStreamUrl', () => {
  it('returns pinned streamVersion URL when override is set', () => {
    const state = makeSceneState([
      {
        streamType: 'video',
        language: 'en',
        streamVersion: 1,
        status: 'complete',
        mp4Url: 'https://example.com/v1.mp4',
      },
      {
        streamType: 'video',
        language: 'en',
        streamVersion: 2,
        status: 'complete',
        mp4Url: 'https://example.com/v2.mp4',
      },
    ])
    const finalCut: FinalCutSelection = {
      format: 'full-video',
      language: 'en',
      perSceneOverrides: {
        [sceneId]: { streamType: 'video', language: 'en', streamVersion: 1 },
      },
    }

    expect(resolveScreeningVideoStreamUrl(sceneId, state, 'en', finalCut)).toBe(
      'https://example.com/v1.mp4'
    )
  })

  it('returns latest version when no override is set (not first in array)', () => {
    const state = makeSceneState([
      {
        streamType: 'video',
        language: 'en',
        streamVersion: 1,
        status: 'complete',
        mp4Url: 'https://example.com/v1.mp4',
      },
      {
        streamType: 'video',
        language: 'en',
        streamVersion: 2,
        status: 'complete',
        mp4Url: 'https://example.com/v2.mp4',
      },
    ])

    expect(resolveScreeningVideoStreamUrl(sceneId, state, 'en', null)).toBe(
      'https://example.com/v2.mp4'
    )
  })

  it('falls back to latest when pinned stream version is missing', () => {
    const state = makeSceneState([
      {
        streamType: 'video',
        language: 'en',
        streamVersion: 2,
        status: 'complete',
        mp4Url: 'https://example.com/v2.mp4',
      },
    ])
    const finalCut: FinalCutSelection = {
      format: 'full-video',
      language: 'en',
      perSceneOverrides: {
        [sceneId]: { streamType: 'video', language: 'en', streamVersion: 99 },
      },
    }

    expect(resolveScreeningVideoStreamUrl(sceneId, state, 'en', finalCut)).toBe(
      'https://example.com/v2.mp4'
    )
  })

  it('uses global language when override language differs from screening language', () => {
    const state = makeSceneState([
      {
        streamType: 'video',
        language: 'en',
        streamVersion: 1,
        status: 'complete',
        mp4Url: 'https://example.com/en-v1.mp4',
      },
      {
        streamType: 'video',
        language: 'th',
        streamVersion: 1,
        status: 'complete',
        mp4Url: 'https://example.com/th-v1.mp4',
      },
    ])
    const finalCut: FinalCutSelection = {
      format: 'full-video',
      language: 'en',
      perSceneOverrides: {
        [sceneId]: { streamType: 'video', language: 'en', streamVersion: 1 },
      },
    }

    expect(resolveScreeningVideoStreamUrl(sceneId, state, 'th', finalCut)).toBe(
      'https://example.com/th-v1.mp4'
    )
  })
})
