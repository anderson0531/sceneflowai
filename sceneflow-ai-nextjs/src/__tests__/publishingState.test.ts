import { describe, it, expect } from 'vitest'
import {
  getPublishingState,
  upsertPublishingState,
  upsertPublishUnit,
  upsertYoutubeBundle,
  computePublishingReadiness,
} from '@/lib/publish/publishingState'
import type { ProjectStream } from '@/lib/streams/projectStreams'

const baseStream: ProjectStream = {
  id: 'stream-en',
  language: 'en',
  format: 'full-video',
  status: 'ready',
  mp4Url: 'https://example.com/en.mp4',
}

describe('publishingState', () => {
  it('hydrates from legacy visionPhase.streams when publishing is absent', () => {
    const metadata = {
      visionPhase: { streams: [baseStream] },
    }
    const state = getPublishingState(metadata)
    expect(state.streams).toHaveLength(1)
    expect(state.streams[0].language).toBe('en')
    expect(state.streams[0].renderSettings?.preset).toBe('standard')
    expect(state.youtubeByLanguage.en?.status).toBe('draft')
  })

  it('upsertPublishingState syncs streams and publishing', () => {
    const metadata = { visionPhase: { streams: [] } }
    const next = upsertPublishingState(metadata, {
      streams: [baseStream],
    })
    const vp = (next as { visionPhase?: { streams?: ProjectStream[]; publishing?: { streams?: ProjectStream[] } } })
      .visionPhase
    expect(vp?.streams).toHaveLength(1)
    expect(vp?.publishing?.streams).toHaveLength(1)
  })

  it('upsertYoutubeBundle merges per language', () => {
    const metadata = {}
    const next = upsertYoutubeBundle(metadata, 'en', {
      title: 'My Video',
      description: 'Desc',
      status: 'ready',
    })
    const state = getPublishingState(next)
    expect(state.youtubeByLanguage.en.title).toBe('My Video')
    expect(state.youtubeByLanguage.en.description).toBe('Desc')
  })

  it('computePublishingReadiness flags missing renders', () => {
    const draftStream: ProjectStream = {
      ...baseStream,
      status: 'draft',
      mp4Url: undefined,
    }
    const readiness = computePublishingReadiness(undefined, [draftStream])
    expect(readiness.readyStreamCount).toBe(0)
    expect(readiness.blockers.length).toBeGreaterThan(0)
  })

  it('upsertPublishUnit stores a prepared package on publishing state', () => {
    const next = upsertPublishUnit({}, {
      id: 'scene:s1:en:16:9',
      kind: 'scene',
      aspectRatio: '16:9',
      language: 'en',
      title: 'Cold open',
      mp4Url: 'https://example.com/s1.mp4',
      sceneId: 's1',
    })
    const state = getPublishingState(next)
    expect(state.units).toHaveLength(1)
    expect(state.units?.[0]?.mp4Url).toBe('https://example.com/s1.mp4')
    expect(state.units?.[0]?.kind).toBe('scene')
  })

  it('computePublishingReadiness counts ready streams', () => {
    const readiness = computePublishingReadiness(undefined, [baseStream])
    expect(readiness.readyStreamCount).toBe(1)
    expect(readiness.totalStreamCount).toBe(1)
  })
})
