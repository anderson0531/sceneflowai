import { describe, it, expect } from 'vitest'
import {
  getPublishingState,
  upsertPreVisMaster,
  upsertPublishingState,
  upsertPublishUnit,
  upsertYoutubeBundle,
  upsertYoutubeBundles,
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

  it('upsertPreVisMaster persists stitched Pre-Vis per language and syncs legacy exportedAnimaticUrl', () => {
    const hydratedLegacy = getPublishingState({
      exportedAnimaticUrl: 'https://example.com/legacy-animatic.mp4',
    })
    expect(hydratedLegacy.previsByLanguage?.en?.mp4Url).toBe(
      'https://example.com/legacy-animatic.mp4'
    )

    const updatedEn = upsertPreVisMaster({}, 'en', {
      mp4Url: 'https://example.com/previs-en.mp4',
      language: 'en',
      durationSec: 94,
      sceneCount: 3,
      resolution: '1080p',
      renderedAt: '2026-11-11T10:00:00.000Z',
    })
    const updatedBoth = upsertPreVisMaster(updatedEn, 'es', {
      mp4Url: 'https://example.com/previs-es.mp4',
      language: 'es',
      durationSec: 98,
      sceneCount: 3,
      resolution: '1080p',
      renderedAt: '2026-11-11T10:05:00.000Z',
    })

    expect((updatedBoth as { exportedAnimaticUrl?: string }).exportedAnimaticUrl).toBe(
      'https://example.com/previs-en.mp4'
    )
    const state = getPublishingState(updatedBoth)
    expect(state.previsByLanguage?.en?.mp4Url).toBe('https://example.com/previs-en.mp4')
    expect(state.previsByLanguage?.es?.mp4Url).toBe('https://example.com/previs-es.mp4')
    expect(state.previsByLanguage?.es?.sceneCount).toBe(3)
  })

  it('upsertYoutubeBundles saves batch multi-language translations atomically', () => {
    const next = upsertYoutubeBundles({}, {
      en: {
        title: 'Northline — Pre-Vis',
        description: 'English synopsis',
        tags: ['Northline', 'Sci-Fi'],
        thumbnailUrl: 'https://example.com/thumb.jpg',
        status: 'ready',
      },
      es: {
        title: 'Northline — Previsualización',
        description: 'Sinopsis en español',
        tags: ['Northline', 'Ciencia Ficción'],
        thumbnailUrl: 'https://example.com/thumb.jpg',
        status: 'ready',
      },
      fr: {
        title: 'Northline — Prévisualisation',
        description: 'Synopsis en français',
        status: 'ready',
      },
    })
    const state = getPublishingState(next)
    expect(state.youtubeByLanguage.en?.title).toBe('Northline — Pre-Vis')
    expect(state.youtubeByLanguage.es?.title).toBe('Northline — Previsualización')
    expect(state.youtubeByLanguage.fr?.title).toBe('Northline — Prévisualisation')
    expect(state.youtubeByLanguage.es?.thumbnailUrl).toBe('https://example.com/thumb.jpg')
  })
})
