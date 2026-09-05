import type { EpisodeBlueprintResponse, SeriesProductionBible } from '@/types/series'

export interface SeriesSeason {
  id: string
  number: number
  title: string
  episodeNumbers: number[]
}

/** Ensure bible has a seasons[] array; migrate flat episode list into Season 1 when missing. */
export function ensureSeasons(
  bible: SeriesProductionBible | null | undefined,
  episodes: EpisodeBlueprintResponse[]
): SeriesSeason[] {
  const existing = (bible as SeriesProductionBible & { seasons?: SeriesSeason[] })?.seasons
  if (existing?.length) {
    return existing.map((s) => ({
      ...s,
      episodeNumbers: [...s.episodeNumbers].sort((a, b) => a - b),
    }))
  }

  const numbers = episodes.map((e) => e.episodeNumber).sort((a, b) => a - b)
  if (numbers.length === 0) return []

  return [
    {
      id: 'season-1',
      number: 1,
      title: 'Season 1',
      episodeNumbers: numbers,
    },
  ]
}

export function getSeasonForEpisode(
  seasons: SeriesSeason[],
  episodeNumber: number
): SeriesSeason | undefined {
  return seasons.find((s) => s.episodeNumbers.includes(episodeNumber))
}

export function groupEpisodesBySeason(
  episodes: EpisodeBlueprintResponse[],
  seasons: SeriesSeason[]
): Array<{ season: SeriesSeason; episodes: EpisodeBlueprintResponse[] }> {
  return seasons.map((season) => ({
    season,
    episodes: episodes
      .filter((ep) => season.episodeNumbers.includes(ep.episodeNumber))
      .sort((a, b) => a.episodeNumber - b.episodeNumber),
  }))
}
