import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { getEpisodeDriftWarnings, resetEpisodesForMissingProjects } from '@/lib/series/seriesHealth'
import {
  collectProductionReferenceImages,
  resolveLibraryImage,
  selectEpisodeReferences,
} from '@/lib/series/referenceTransfer'
import type { EpisodeBlueprintResponse, SeriesProductionBible } from '@/types/series'

const bible = {
  characters: [{ id: 'char_0_abcd1234', name: 'Maya' }],
  storyThreads: [],
} as unknown as SeriesProductionBible

function episode(overrides: Partial<EpisodeBlueprintResponse>): EpisodeBlueprintResponse {
  return {
    id: 'ep-1',
    episodeNumber: 1,
    title: 'Pilot',
    logline: '',
    synopsis: '',
    beats: [],
    characters: [],
    status: 'blueprint',
    ...overrides,
  }
}

describe('getEpisodeDriftWarnings', () => {
  it('ignores placeholder character ids and episode-only story threads', () => {
    const warnings = getEpisodeDriftWarnings(
      episode({
        characters: [{ characterId: 'char_1', role: 'protagonist' }],
        storyThreads: [{ id: 'thread_1', name: 'Mystery', type: 'main', status: 'developing' }],
      }),
      bible
    )
    expect(warnings).toEqual([])
  })

  it('warns when an episode cites a real cast id that is gone', () => {
    const warnings = getEpisodeDriftWarnings(
      episode({
        characters: [{ characterId: 'char_0_missing1', role: 'supporting' }],
      }),
      bible
    )
    expect(warnings).toEqual(['1 character no longer in the series cast'])
  })

  it('does not warn when the character is still in the cast', () => {
    const warnings = getEpisodeDriftWarnings(
      episode({
        characters: [{ characterId: 'char_0_abcd1234', role: 'protagonist' }],
      }),
      bible
    )
    expect(warnings).toEqual([])
  })
})

describe('resetEpisodesForMissingProjects', () => {
  it('returns a started episode to blueprint when its project is gone', () => {
    const { episodes, changed } = resetEpisodesForMissingProjects(
      [
        { id: 'ep-1', projectId: 'gone', status: 'in_progress' },
        { id: 'ep-2', projectId: 'kept', status: 'completed' },
        { id: 'ep-3', status: 'blueprint' },
      ],
      new Set(['kept'])
    )
    expect(changed).toBe(true)
    expect(episodes[0]).toEqual({ id: 'ep-1', status: 'blueprint' })
    expect(episodes[1].status).toBe('completed')
    expect(episodes[1].projectId).toBe('kept')
    expect(episodes[2].status).toBe('blueprint')
  })
})

describe('production reference images', () => {
  it('prefers the Production Stage picture over the series copy', () => {
    const images = collectProductionReferenceImages([
      {
        visionPhase: {
          characters: [{ id: 'c1', name: 'Maya Chen', referenceImage: 'https://cdn.example/maya.jpg' }],
          references: {
            locationReferences: [
              { id: 'l1', location: 'Bangkok alley', imageUrl: 'https://cdn.example/alley.jpg' },
            ],
            objectReferences: [
              { id: 'o1', name: 'Family locket', imageUrl: 'https://cdn.example/locket.jpg' },
            ],
          },
        },
      },
    ])

    expect(resolveLibraryImage('Maya Chen', undefined, images.characters)).toBe(
      'https://cdn.example/maya.jpg'
    )
    expect(resolveLibraryImage('Bangkok alley', 'https://cdn.example/old.jpg', images.locations)).toBe(
      'https://cdn.example/alley.jpg'
    )
    expect(resolveLibraryImage('Family locket', undefined, images.props)).toBe(
      'https://cdn.example/locket.jpg'
    )
  })

  it('falls back to the series picture when Production has none', () => {
    expect(resolveLibraryImage('Maya', 'https://cdn.example/series.jpg', {})).toBe(
      'https://cdn.example/series.jpg'
    )
  })
})

describe('selectEpisodeReferences', () => {
  const series = {
    characters: [{ id: 'char-maya', name: 'Maya', imageUrl: 'https://cdn.example/series-maya.jpg' }],
    locations: [{ id: 'loc-1', name: 'Apartment', imageUrl: 'https://cdn.example/series-apt.jpg' }],
    props: [],
  }
  const library = {
    characters: [{ id: 'lib-maya', name: 'Maya', imageUrl: 'https://cdn.example/library-maya.jpg' }],
    locations: [],
    props: [],
  }

  it('shows Production assets when the episode has pictures', () => {
    const view = selectEpisodeReferences({
      production: {
        characters: [
          {
            id: 'ep-maya',
            name: 'Maya',
            imageUrl: 'https://cdn.example/episode-maya.jpg',
            libraryAssetId: 'lib-maya',
          },
        ],
        locations: [],
        props: [],
      },
      library,
      series,
      episodeCharacterIds: ['char-maya'],
    })
    expect(view.source).toBe('production')
    expect(view.characters[0].imageUrl).toBe('https://cdn.example/episode-maya.jpg')
  })

  it('uses the shared library picture for a recurring character without an episode image', () => {
    const view = selectEpisodeReferences({
      production: {
        characters: [{ id: 'ep-maya', name: 'Maya', libraryAssetId: 'lib-maya' }],
        locations: [],
        props: [],
      },
      library,
      series,
    })
    expect(view.source).toBe('series')
    expect(view.characters[0].imageUrl).toBe('https://cdn.example/library-maya.jpg')
  })

  it('falls back to the series bible when Production has no images', () => {
    const view = selectEpisodeReferences({
      production: { characters: [], locations: [], props: [] },
      library: { characters: [], locations: [], props: [] },
      series,
      episodeCharacterIds: ['char-maya'],
    })
    expect(view.source).toBe('series')
    expect(view.characters[0].imageUrl).toBe('https://cdn.example/series-maya.jpg')
    expect(view.locations[0].name).toBe('Apartment')
  })
})

describe('series analyze-resonance prompt', () => {
  it('applies the audience localization directive', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/series/[seriesId]/analyze-resonance/route.ts'),
      'utf8'
    )
    expect(route).toContain('buildAudienceLocalizationDirective')
    expect(route).toContain('requestAudience')
  })
})
