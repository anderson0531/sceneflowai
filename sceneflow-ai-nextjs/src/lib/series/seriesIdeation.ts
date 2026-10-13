import {
  isSeriesProductionFormat,
  NEW_SERIES_EPISODE_COUNT,
} from '@/config/series/productionFormats'
import {
  createAudienceDefinition,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import type { SeriesSynopsisLock } from '@/lib/series/clarifySynopsis'
import { resolveVariantArtStyle } from '@/lib/treatment/blueprintFoundation'

export interface SeriesIdeationSeedSource {
  maxEpisodes?: number
  targetAudience?: string | null
  metadata?: Record<string, unknown> | null
}

export interface SeriesIdeationSeed {
  format: string
  episodeCount: number
  artStyle: string
  draft: string
  locked: SeriesSynopsisLock | null
  audience: AudienceDefinition
}

/**
 * Preset id for a series, from an explicit request, series metadata, the bible,
 * or the vision phase copied onto an episode project.
 */
export function resolveSeriesArtStyle(source: {
  artStyle?: unknown
  metadata?: Record<string, unknown> | null
  productionBible?: { aesthetic?: { artStyle?: unknown; visualStyle?: unknown } } | null
}): string {
  const meta =
    source.metadata && typeof source.metadata === 'object' && !Array.isArray(source.metadata)
      ? source.metadata
      : {}
  const visionPhase = meta.visionPhase
  const visionArtStyle =
    visionPhase && typeof visionPhase === 'object' && !Array.isArray(visionPhase)
      ? (visionPhase as { artStyle?: unknown }).artStyle
      : undefined
  const aesthetic = source.productionBible?.aesthetic
  const explicit =
    (typeof source.artStyle === 'string' && source.artStyle.trim()) ||
    (typeof meta.artStyle === 'string' && meta.artStyle.trim()) ||
    (typeof aesthetic?.artStyle === 'string' && aesthetic.artStyle.trim()) ||
    (typeof visionArtStyle === 'string' && visionArtStyle.trim()) ||
    undefined
  return resolveVariantArtStyle({
    artStyle: explicit,
    visual_style: typeof aesthetic?.visualStyle === 'string' ? aesthetic.visualStyle : undefined,
  })
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
    artStyle: resolveSeriesArtStyle({ metadata: meta }),
    draft: locked ? '' : ideaTopic,
    locked,
    audience,
  }
}

export type SeriesStudioEntry = 'generate' | 'ideate' | 'wait' | 'ready'

/**
 * Decide what the studio should do when a series record loads.
 * A pending create (metadata flag or autoGenerate query) must generate before
 * the empty ideation dialog can open, even if the query is not visible yet.
 */
export function resolveSeriesStudioEntry(input: {
  hasContent: boolean
  ideaTopic?: string
  pendingAutoGenerate?: boolean
  searchAutoGenerate?: boolean
}): SeriesStudioEntry {
  if (input.hasContent) return 'ready'
  const wantsGenerate = input.pendingAutoGenerate === true || input.searchAutoGenerate === true
  if (wantsGenerate && (input.ideaTopic || '').trim()) return 'generate'
  if (wantsGenerate) return 'wait'
  return 'ideate'
}
