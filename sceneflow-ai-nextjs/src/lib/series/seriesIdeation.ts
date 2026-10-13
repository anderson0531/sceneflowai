import {
  isSeriesProductionFormat,
  NEW_SERIES_EPISODE_COUNT,
} from '@/config/series/productionFormats'
import {
  createAudienceDefinition,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import type { SeriesSynopsisLock } from '@/lib/series/clarifySynopsis'

export interface SeriesIdeationSeedSource {
  maxEpisodes?: number
  targetAudience?: string | null
  metadata?: Record<string, unknown> | null
}

export interface SeriesIdeationSeed {
  format: string
  episodeCount: number
  draft: string
  locked: SeriesSynopsisLock | null
  audience: AudienceDefinition
}

function optionalMetaString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'any') return undefined
  return trimmed
}

/**
 * Prefill the studio generate dialog from a series record.
 * Episode count stays on the series: metadata.episodeCount, then maxEpisodes.
 */
export function readSeriesIdeationSeed(series: SeriesIdeationSeedSource): SeriesIdeationSeed {
  const meta =
    series.metadata && typeof series.metadata === 'object' && !Array.isArray(series.metadata)
      ? series.metadata
      : {}

  const lastGeneration = meta.lastGeneration
  const lastTopic =
    lastGeneration &&
    typeof lastGeneration === 'object' &&
    !Array.isArray(lastGeneration) &&
    typeof (lastGeneration as { topic?: unknown }).topic === 'string'
      ? (lastGeneration as { topic: string }).topic.trim()
      : ''
  const storedTopic = typeof meta.ideaTopic === 'string' ? meta.ideaTopic.trim() : ''
  const ideaTopic = storedTopic || lastTopic
  const formatValue = typeof meta.format === 'string' ? meta.format : ''
  const format = isSeriesProductionFormat(formatValue) ? formatValue : 'narrative'

  const rawCount = Number(meta.episodeCount)
  const maxEpisodes = Number(series.maxEpisodes)
  const episodeCount =
    Number.isFinite(rawCount) && rawCount >= 1
      ? Math.floor(rawCount)
      : Number.isFinite(maxEpisodes) && maxEpisodes >= 1
        ? Math.floor(maxEpisodes)
        : NEW_SERIES_EPISODE_COUNT

  const genre = optionalMetaString(meta.genre)
  const tone = optionalMetaString(meta.tone)
  const locked =
    meta.synopsisLocked === true && storedTopic
      ? { synopsis: storedTopic, genre, tone }
      : null

  const storedAudience = meta.audienceDefinition
  const audience =
    storedAudience && typeof storedAudience === 'object' && !Array.isArray(storedAudience)
      ? createAudienceDefinition({
          ...(storedAudience as Partial<AudienceDefinition>),
          source: 'series',
        })
      : createAudienceDefinition({
          description: typeof series.targetAudience === 'string' ? series.targetAudience : '',
          source: 'series',
        })

  return {
    format,
    episodeCount,
    draft: locked ? '' : ideaTopic,
    locked,
    audience,
  }
}
