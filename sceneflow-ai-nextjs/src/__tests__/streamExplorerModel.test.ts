import { describe, expect, it } from 'vitest'
import {
  buildStreamInventory,
  DEFAULT_STREAM_EXPLORER_FILTERS,
  filterStreamDeliverables,
  formatDurationBadge,
  hasActiveStreamFilters,
} from '@/lib/streams/streamExplorerModel'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

describe('streamExplorerModel', () => {
  const streams: ProjectStream[] = [
    {
      id: 'stream-en',
      language: 'en',
      format: 'full-video',
      status: 'ready',
      mp4Url: 'https://cdn.example.com/en-master.mp4',
      renderedAt: '2026-11-11T00:00:00Z',
    },
    {
      id: 'stream-es',
      language: 'es',
      format: 'full-video',
      status: 'draft',
      mp4Url: null,
    },
  ]

  const projectScenes: Array<Record<string, unknown>> = [
    {
      id: 's1',
      sceneNumber: 1,
      heading: 'INT. OBSERVATORY - NIGHT',
      blueprintBeatIndex: 0,
      blueprintBeatTitle: 'Act I: Signal Found',
    },
    {
      id: 's2',
      sceneNumber: 2,
      heading: 'EXT. ROOFTOP - DAWN',
      blueprintBeatIndex: 0,
      blueprintBeatTitle: 'Act I: Signal Found',
    },
  ]

  const sceneProductionState: Record<string, SceneProductionData> = {
    s1: {
      isSegmented: true,
      segments: [],
      productionStreams: [
        {
          id: 's1-en-anim-v1',
          streamType: 'animatic',
          streamVersion: 1,
          language: 'en',
          languageLabel: 'English',
          status: 'complete',
          mp4Url: 'https://cdn.example.com/s1-en-previs-v1.mp4',
          duration: 18,
          resolution: '720p',
          completedAt: '2026-11-10T10:00:00Z',
        },
        {
          id: 's1-en-vid-v1',
          streamType: 'video',
          streamVersion: 1,
          language: 'en',
          languageLabel: 'English',
          status: 'complete',
          mp4Url: 'https://cdn.example.com/s1-en-video-v1.mp4',
          duration: 18,
          resolution: '1080p',
          completedAt: '2026-11-10T11:00:00Z',
        },
        {
          id: 's1-en-vid-v2',
          streamType: 'video',
          streamVersion: 2,
          language: 'en',
          languageLabel: 'English',
          status: 'complete',
          mp4Url: 'https://cdn.example.com/s1-en-video-v2.mp4',
          duration: 20,
          resolution: '4K',
          completedAt: '2026-11-11T01:00:00Z',
        },
        {
          id: 's1-es-anim-v1',
          streamType: 'animatic',
          streamVersion: 1,
          language: 'es',
          languageLabel: 'Spanish',
          status: 'complete',
          mp4Url: 'https://cdn.example.com/s1-es-previs-v1.mp4',
          duration: 19,
          resolution: '720p',
        },
      ],
    } as unknown as SceneProductionData,
    s2: {
      isSegmented: true,
      segments: [],
      productionStreams: [
        {
          id: 's2-es-anim-v1',
          streamType: 'animatic',
          streamVersion: 1,
          language: 'es',
          languageLabel: 'Spanish',
          status: 'complete',
          mp4Url: 'https://cdn.example.com/s2-es-previs-v1.mp4',
          duration: 22,
          resolution: '720p',
        },
      ],
    } as unknown as SceneProductionData,
  }

  const metadata = {
    visionPhase: {
      publishing: {
        previsByLanguage: {
          en: {
            mp4Url: 'https://cdn.example.com/en-previs-stitched.mp4',
            language: 'en',
            durationSec: 40,
            sceneCount: 2,
            resolution: '720p',
            renderedAt: '2026-11-11T02:00:00Z',
            status: 'ready',
          },
        },
        promo: {
          activePromoId: 'camp-main',
          campaigns: [
            {
              id: 'camp-main',
              name: 'Theatrical Trailer',
              aspect: '16:9',
              primaryLanguage: 'en',
              trailer: {
                mp4Url: 'https://cdn.example.com/promo-theatrical.mp4',
                aspect: '16:9',
                durationSec: 65,
                targetDurationSec: 60,
                beatPlan: [],
                renderedAt: '2026-11-11T03:00:00Z',
                status: 'ready',
              },
            },
            {
              id: 'camp-social',
              name: 'Vertical Hook',
              aspect: '9:16',
              primaryLanguage: 'en',
              trailer: {
                mp4Url: 'https://cdn.example.com/promo-vertical.mp4',
                aspect: '9:16',
                durationSec: 25,
                targetDurationSec: 30,
                beatPlan: [],
                renderedAt: '2026-11-11T03:30:00Z',
                status: 'ready',
              },
            },
          ],
          trailer: {
            mp4Url: 'https://cdn.example.com/promo-theatrical.mp4',
            aspect: '16:9',
            durationSec: 65,
            targetDurationSec: 60,
            beatPlan: [],
            renderedAt: '2026-11-11T03:00:00Z',
            status: 'ready',
          },
        },
        units: [
          {
            id: 'master:en:16:9',
            kind: 'master',
            aspectRatio: '16:9',
            language: 'en',
            title: 'Master',
            destinations: {
              youtube: {
                status: 'published',
                url: 'https://youtu.be/en-master-live',
              },
            },
          },
        ],
      },
    },
  }

  it('computes accurate header dashboard KPIs across languages, types, and take versions', () => {
    const { summary } = buildStreamInventory({
      streams,
      projectScenes,
      sceneProductionState,
      metadata,
    })

    expect(summary.languageCount).toBe(2)
    expect(summary.previs.stitchedReady).toBe(1) // EN stitched MP4
    expect(summary.previs.stitchableCount).toBe(1) // ES has 2/2 Pre-Vis scenes ready to stitch
    expect(summary.masters.ready).toBe(1) // EN master
    expect(summary.promos.ready).toBe(2) // EN Theatrical + EN Vertical Hook
    expect(summary.promos.campaignsCount).toBe(2)
    expect(summary.chapters.ready).toBe(2) // Act I ready in EN and ES
    expect(summary.scenes.ready).toBe(3) // EN s1 + ES s1 + ES s2
    expect(summary.scenes.maxVersion).toBe(2)
    expect(summary.scenes.availableVersions).toEqual([1, 2])
    expect(summary.totalPublishedAssets).toBe(1) // EN Master published on YouTube
  })

  it('filters deliverables by type, language, status, format, version, and search query', () => {
    const { items } = buildStreamInventory({
      streams,
      projectScenes,
      sceneProductionState,
      metadata,
    })

    // Default ('latest' version) keeps 1 row per scene rather than duplicating historical takes
    const defaultFiltered = filterStreamDeliverables(items, DEFAULT_STREAM_EXPLORER_FILTERS)
    const enS1Latest = defaultFiltered.filter(
      (i) => i.kind === 'scene' && i.language === 'en' && i.sceneId === 's1'
    )
    expect(enS1Latest).toHaveLength(1)
    expect(enS1Latest[0]?.version).toBe(2)
    expect(enS1Latest[0]?.versionVariants).toHaveLength(3)

    // Expanding to 'all' versions surfaces all 3 takes of EN Scene 1 (v2 video, v1 video, v1 animatic)
    const allVersions = filterStreamDeliverables(items, {
      ...DEFAULT_STREAM_EXPLORER_FILTERS,
      type: 'scene',
      language: 'en',
      version: 'all',
    })
    const enS1Takes = allVersions.filter((i) => i.sceneId === 's1')
    expect(enS1Takes).toHaveLength(3)

    // Filtering specifically for Version v2 returns only v2 scene takes
    const v2Only = filterStreamDeliverables(items, {
      ...DEFAULT_STREAM_EXPLORER_FILTERS,
      version: 2,
    })
    expect(v2Only).toHaveLength(1)
    expect(v2Only[0]?.mp4Url).toBe('https://cdn.example.com/s1-en-video-v2.mp4')

    // Filtering for Published status returns only EN Master
    const publishedOnly = filterStreamDeliverables(items, {
      ...DEFAULT_STREAM_EXPLORER_FILTERS,
      status: 'published',
    })
    expect(publishedOnly).toHaveLength(1)
    expect(publishedOnly[0]?.kind).toBe('master')
    expect(publishedOnly[0]?.publishedLinks[0]?.url).toBe('https://youtu.be/en-master-live')

    // Filtering by animatic format excludes AI video masters/promos
    const animaticsOnly = filterStreamDeliverables(items, {
      ...DEFAULT_STREAM_EXPLORER_FILTERS,
      format: 'animatic',
    })
    expect(animaticsOnly.every((i) => i.format !== 'video')).toBe(true)

    // Search query matches campaign title
    const searchVertical = filterStreamDeliverables(items, {
      ...DEFAULT_STREAM_EXPLORER_FILTERS,
      search: 'Vertical Hook',
    })
    expect(searchVertical).toHaveLength(1)
    expect(searchVertical[0]?.kind).toBe('promo')
  })

  it('tracks active filter state and formats duration badges cleanly', () => {
    expect(hasActiveStreamFilters(DEFAULT_STREAM_EXPLORER_FILTERS)).toBe(false)
    expect(
      hasActiveStreamFilters({ ...DEFAULT_STREAM_EXPLORER_FILTERS, language: 'es' })
    ).toBe(true)
    expect(formatDurationBadge(65)).toBe('1:05')
    expect(formatDurationBadge(undefined)).toBeNull()
  })
})
