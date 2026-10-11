import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { buildPublicSeriesShare, seriesShareNarrationText } from '@/lib/series/publicShare'

const ROOT = path.resolve(__dirname, '../..')

describe('public series share', () => {
  const share = buildPublicSeriesShare({
    title: 'The White City',
    logline: 'A current under the city.',
    genre: 'Drama',
    bible: {
      synopsis: 'The city keeps its own time.',
      setting: 'A coastal capital',
      protagonist: { name: 'Mara', goal: 'Keep the current from rising', characterId: 'secret' },
      characters: [
        { name: 'Mara', role: 'protagonist', description: 'Harbor engineer', voiceId: 'hidden' },
      ],
    },
    episodes: [
      {
        id: 'ep-1',
        episodeNumber: 2,
        title: 'Second tide',
        logline: 'The lock fails.',
        synopsis: 'Water reaches the square.',
        episodeHook: 'The gate stays open.',
        projectId: 'project-secret',
        beats: [{ beatNumber: 1, title: 'Dawn', description: 'The harbor is quiet.', act: 1 }],
      },
      { episodeNumber: 1, title: 'First light', logline: 'She finds the map.' },
    ],
  })

  it('keeps episodes in order and drops private fields', () => {
    expect(share.episodes.map((episode) => episode.episodeNumber)).toEqual([1, 2])
    expect(share.episodes[1]?.hook).toBe('The gate stays open.')
    expect(JSON.stringify(share)).not.toContain('project-secret')
    expect(JSON.stringify(share)).not.toContain('hidden')
    expect(JSON.stringify(share)).not.toContain('characterId')
  })

  it('speaks the overview and one episode from the share, not caller text', () => {
    expect(seriesShareNarrationText(share, 'overview')).toContain('The city keeps its own time.')
    expect(seriesShareNarrationText(share, 'overview')).toContain('Mara')
    expect(seriesShareNarrationText(share, 'episode', 2)).toContain('Second tide')
    expect(seriesShareNarrationText(share, 'episode', 2)).toContain('The gate stays open.')
    expect(seriesShareNarrationText(share, 'episode', 9)).toBe('')
  })

  it('builds narration on the server from the series record', () => {
    const route = readFileSync(
      path.join(ROOT, 'src/app/api/series/share/[token]/narration/route.ts'),
      'utf8'
    )
    expect(route).toContain('seriesShareNarrationText')
    expect(route).not.toContain('body.text')
    expect(route).toContain('findCachedNarrationAudio')
  })
})
