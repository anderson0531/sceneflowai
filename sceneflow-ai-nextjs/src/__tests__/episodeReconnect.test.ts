import { describe, expect, it } from 'vitest'
import { alignEpisodeCharacters } from '@/lib/series/seriesHealth'
import { keepCharacterIds } from '@/lib/series/keepStorylineIds'
import {
  episodeProjectDescription,
  episodeProjectTitle,
  linkedEpisode,
  linkedProjectFields,
  linkRejection,
  rankConnectableProjects,
} from '@/lib/series/linkEpisodeProject'
import { applyProjectToSeriesTransfer } from '@/lib/series/referenceTransfer'
import type { SeriesProductionBible } from '@/types/series'

const bible = {
  version: '1.0.0',
  characters: [
    {
      id: 'char_real',
      name: 'Maya Chen',
      role: 'protagonist',
      description: 'Series lead',
      appearance: 'short hair',
      referenceImageUrl: 'https://img/series-maya.png',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  locations: [
    {
      id: 'loc_real',
      name: 'Night Market',
      description: 'Series market',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  props: [
    {
      id: 'prop_real',
      name: 'Brass Key',
      description: 'Series key',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
} as SeriesProductionBible

const projectMetadata = {
  visionPhase: {
    characters: [
      {
        id: 'proj_char',
        name: 'maya chen',
        referenceUrl: 'https://img/prod-maya.png',
        appearance: 'production look',
        voiceId: 'voice-1',
        description: 'Production bio',
      },
    ],
    references: {
      locationReferences: [
        {
          id: 'proj_loc',
          location: 'night market',
          imageUrl: 'https://img/prod-market.png',
          description: 'Production market',
          sourceSceneIndex: 0,
          sourceSceneHeading: 'EXT. NIGHT MARKET',
          pinnedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      objectReferences: [
        {
          id: 'proj_prop',
          type: 'object',
          name: 'brass key',
          imageUrl: 'https://img/prod-key.png',
          description: 'Production key',
        },
      ],
    },
  },
}

describe('keepCharacterIds', () => {
  it('keeps the series id, portrait, voice, and wardrobes when the model renames a character', () => {
    const kept = keepCharacterIds(
      [
        {
          id: 'char_real',
          name: 'John',
          referenceImageUrl: 'https://img/john.png',
          voiceId: 'voice-1',
          wardrobes: [{ id: 'w1', name: 'Coat' }],
        },
      ],
      [{ id: 'char_1', name: 'Somchai', role: 'protagonist', referenceImageUrl: '' }]
    )

    expect(kept).toHaveLength(1)
    expect(kept[0].id).toBe('char_real')
    expect(kept[0].name).toBe('Somchai')
    expect(kept[0].referenceImageUrl).toBe('https://img/john.png')
    expect(kept[0].voiceId).toBe('voice-1')
    expect(kept[0].wardrobes).toEqual([{ id: 'w1', name: 'Coat' }])
  })
})

describe('reference import identity', () => {
  it.each(['add_new_only', 'merge'] as const)(
    'updates the series character with the same name instead of copying it (%s)',
    (strategy) => {
      const { updatedBible, diff } = applyProjectToSeriesTransfer(
        bible,
        projectMetadata,
        {
          characterIds: ['proj_char'],
          locationIds: ['proj_loc'],
          propIds: ['proj_prop'],
        },
        strategy
      )

      expect(updatedBible.characters).toHaveLength(1)
      expect(updatedBible.characters?.[0].id).toBe('char_real')
      expect(updatedBible.characters?.[0].referenceImageUrl).toBe('https://img/prod-maya.png')
      expect(updatedBible.characters?.[0].voiceId).toBe('voice-1')
      expect(updatedBible.locations).toHaveLength(1)
      expect(updatedBible.locations?.[0].id).toBe('loc_real')
      expect(updatedBible.locations?.[0].referenceImageUrl).toBe('https://img/prod-market.png')
      expect(updatedBible.props).toHaveLength(1)
      expect(updatedBible.props?.[0].id).toBe('prop_real')
      expect(updatedBible.props?.[0].referenceImageUrl).toBe('https://img/prod-key.png')
      expect(diff.characters.added).toEqual([])
      expect(diff.locations.added).toEqual([])
      expect(diff.props.added).toEqual([])
    }
  )
})

describe('linkEpisodeProject', () => {
  const episode = {
    id: 'ep-2',
    episodeNumber: 2,
    title: 'The Market',
    logline: 'A key changes hands.',
    synopsis: 'Maya finds the key at the night market.',
    status: 'blueprint',
  }
  const episodes = [
    episode,
    { id: 'ep-1', episodeNumber: 1, title: 'Pilot', status: 'in_progress', projectId: 'taken' },
  ]

  it('writes the blueprint name and details onto the project and marks the episode in progress', () => {
    expect(episodeProjectTitle('Bangkok Nights', episode)).toBe('Bangkok Nights - Ep 2: The Market')
    expect(episodeProjectDescription(episode)).toBe('Maya finds the key at the night market.')
    expect(linkedEpisode(episode, 'proj-9')).toMatchObject({
      projectId: 'proj-9',
      status: 'in_progress',
      title: 'The Market',
    })
    expect(linkedProjectFields('series-1', 'Bangkok Nights', episode)).toMatchObject({
      title: 'Bangkok Nights - Ep 2: The Market',
      description: 'Maya finds the key at the night market.',
      series_id: 'series-1',
      episode_number: 2,
      metadata: { seriesId: 'series-1', episodeId: 'ep-2', episodeNumber: 2 },
    })
  })

  it('rejects another owner or a project already connected to a different episode', () => {
    expect(
      linkRejection('owner', episode, episodes, { id: 'proj-9', userId: 'other', title: 'Loose' })
    ).toMatch(/own projects/)
    expect(
      linkRejection('owner', episode, episodes, { id: 'taken', userId: 'owner', title: 'Pilot project' })
    ).toMatch(/episode 1/)
    expect(linkRejection('owner', episode, episodes, { id: 'proj-9', userId: 'owner', title: 'Loose' })).toBeNull()
  })

  it('lists this series first and hides projects already connected', () => {
    const ranked = rankConnectableProjects('series-1', 'owner', episodes, [
      { id: 'taken', userId: 'owner', title: 'Already used', seriesId: 'series-1' },
      { id: 'other-series', userId: 'owner', title: 'Zebra', seriesId: 'series-2' },
      { id: 'orphan', userId: 'owner', title: 'Alpha', metadataSeriesId: 'series-1' },
      { id: 'foreign', userId: 'someone-else', title: 'Nope' },
    ])
    expect(ranked.map((project) => project.id)).toEqual(['orphan', 'other-series'])
    expect(ranked[0].preferred).toBe(true)
    expect(ranked[1].preferred).toBe(false)
  })
})

describe('alignEpisodeCharacters', () => {
  it('maps rewritten names onto the current series cast and drops unknown characters', () => {
    const aligned = alignEpisodeCharacters(
      [
        { name: 'maya chen', role: 'protagonist' },
        { characterId: 'char_missing', role: 'supporting' },
      ],
      [{ id: 'char_real', name: 'Maya Chen', role: 'protagonist' }]
    )
    expect(aligned).toEqual([{ characterId: 'char_real', role: 'protagonist' }])
  })
})
