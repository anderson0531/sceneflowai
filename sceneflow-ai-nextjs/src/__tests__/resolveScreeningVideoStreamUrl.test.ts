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

  it('ignores streams listed in deletedStreamIds', () => {
    const state = {
      [sceneId]: {
        deletedStreamIds: ['s-old'],
        productionStreams: [
          {
            id: 's-old',
            streamType: 'video',
            language: 'en',
            streamVersion: 2,
            status: 'complete',
            mp4Url: 'https://example.com/deleted-v2.mp4',
          },
          {
            id: 's-new',
            streamType: 'video',
            language: 'en',
            streamVersion: 1,
            status: 'complete',
            mp4Url: 'https://example.com/new-v1.mp4',
          },
        ],
      },
    }

    expect(resolveScreeningVideoStreamUrl(sceneId, state, 'en', null)).toBe(
      'https://example.com/new-v1.mp4'
    )
  })

  it('prefers the newer completedAt stream when a resurrected old stream has the same or higher streamVersion', () => {
    const state = {
      [sceneId]: {
        renderedSceneUrl: 'https://example.com/new-render.mp4',
        productionStreams: [
          {
            id: 's-old-deleted',
            streamType: 'video',
            language: 'en',
            streamVersion: 2,
            status: 'complete',
            completedAt: '2026-10-20T10:00:00.000Z',
            mp4Url: 'https://example.com/old-deleted.mp4',
          },
          {
            id: 's-new-render',
            streamType: 'video',
            language: 'en',
            streamVersion: 1,
            status: 'complete',
            completedAt: '2026-10-21T10:00:00.000Z',
            mp4Url: 'https://example.com/new-render.mp4',
          },
        ],
      },
    }
    const staleFinalCut: FinalCutSelection = {
      format: 'full-video',
      language: 'en',
      perSceneOverrides: {
        [sceneId]: { streamType: 'video', language: 'en', streamVersion: 1 },
      },
    }

    expect(resolveScreeningVideoStreamUrl(sceneId, state, 'en', null)).toBe(
      'https://example.com/new-render.mp4'
    )
    expect(resolveScreeningVideoStreamUrl(sceneId, state, 'en', staleFinalCut)).toBe(
      'https://example.com/new-render.mp4'
    )
  })

  it('heals a stale v1 override when a newer v2 render matches renderedSceneUrl', () => {
    const state = {
      [sceneId]: {
        renderedSceneUrl: 'https://example.com/new-v2.mp4',
        productionStreams: [
          {
            id: 's-old-v1',
            streamType: 'video',
            language: 'en',
            streamVersion: 1,
            status: 'complete',
            completedAt: '2026-10-20T10:00:00.000Z',
            mp4Url: 'https://example.com/old-v1.mp4',
          },
          {
            id: 's-new-v2',
            streamType: 'video',
            language: 'en',
            streamVersion: 2,
            status: 'complete',
            completedAt: '2026-10-21T10:00:00.000Z',
            mp4Url: 'https://example.com/new-v2.mp4',
          },
        ],
      },
    }
    const staleFinalCut: FinalCutSelection = {
      format: 'full-video',
      language: 'en',
      perSceneOverrides: {
        [sceneId]: { streamType: 'video', language: 'en', streamVersion: 1 },
      },
    }

    expect(resolveScreeningVideoStreamUrl(sceneId, state, 'en', staleFinalCut)).toBe(
      'https://example.com/new-v2.mp4'
    )
  })
})
