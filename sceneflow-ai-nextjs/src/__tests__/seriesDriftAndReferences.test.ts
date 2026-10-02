import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { getEpisodeDriftWarnings } from '@/lib/series/seriesHealth'
import {
  collectProductionReferenceImages,
  resolveLibraryImage,
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
