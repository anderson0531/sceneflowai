import type {
  EpisodeBlueprintResponse,
  SeriesProductionBible,
  SeriesResonanceAnalysis,
} from '@/types/series'

const BIBLE_COMPLETENESS_CHECKS: Array<{
  key: keyof SeriesProductionBible | 'protagonist' | 'antagonistConflict'
  label: string
}> = [
  { key: 'logline', label: 'Logline' },
  { key: 'synopsis', label: 'Synopsis' },
  { key: 'setting', label: 'Setting' },
  { key: 'protagonist', label: 'Protagonist' },
  { key: 'antagonistConflict', label: 'Antagonist / conflict' },
  { key: 'aesthetic', label: 'Aesthetic' },
  { key: 'characters', label: 'Cast' },
  { key: 'locations', label: 'Locations' },
  { key: 'storyThreads', label: 'Story threads' },
  { key: 'keyEvents', label: 'Key events' },
  { key: 'consistencyRules', label: 'Consistency rules' },
  { key: 'toneGuidelines', label: 'Tone guidelines' },
]

function isFilled(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return true
}

export function computeBibleCompleteness(bible: SeriesProductionBible | null | undefined) {
  const total = BIBLE_COMPLETENESS_CHECKS.length
  if (!bible) return { filled: 0, total, percent: 0, missing: BIBLE_COMPLETENESS_CHECKS.map((c) => c.label) }

  const missing: string[] = []
  let filled = 0
  for (const check of BIBLE_COMPLETENESS_CHECKS) {
    const val = bible[check.key as keyof SeriesProductionBible]
    if (isFilled(val)) {
      filled++
    } else {
      missing.push(check.label)
    }
  }
  return { filled, total, percent: Math.round((filled / total) * 100), missing }
}

export function computeContinuityStats(bible: SeriesProductionBible | null | undefined) {
  return {
    characters: bible?.characters?.length ?? 0,
    locations: bible?.locations?.length ?? 0,
    props: bible?.props?.length ?? 0,
    threads: bible?.storyThreads?.length ?? 0,
    keyEvents: bible?.keyEvents?.length ?? 0,
  }
}

export function computeSlateStats(episodes: EpisodeBlueprintResponse[]) {
  const blueprint = episodes.filter((e) => e.status === 'blueprint').length
  const inProgress = episodes.filter((e) => e.status === 'in_progress').length
  const completed = episodes.filter((e) => e.status === 'completed').length
  return { total: episodes.length, blueprint, inProgress, completed }
}

export function getEpisodeDriftWarnings(
  episode: EpisodeBlueprintResponse,
  bible: SeriesProductionBible | null | undefined
): string[] {
  const warnings: string[] = []
  if (!bible) return warnings

  const bibleCharIds = new Set((bible.characters ?? []).map((c) => c.id))
  const bibleThreadIds = new Set((bible.storyThreads ?? []).map((t) => t.id))

  const unknownChars = (episode.characters ?? []).filter(
    (c) => c.characterId && !bibleCharIds.has(c.characterId)
  )
  if (unknownChars.length > 0) {
    warnings.push(`${unknownChars.length} character(s) not in Series Bible`)
  }

  const unknownThreads = (episode.storyThreads ?? []).filter(
    (t) => t.id && !bibleThreadIds.has(t.id)
  )
  if (unknownThreads.length > 0) {
    warnings.push(`${unknownThreads.length} story thread(s) not in bible`)
  }

  return warnings
}

export function formatResonanceFreshness(
  analysis: SeriesResonanceAnalysis | null | undefined,
  analyzedAt?: string | null
): { label: string; stale: boolean } {
  if (!analysis?.greenlightScore?.score) {
    return { label: 'Not analyzed', stale: true }
  }
  const score = analysis.greenlightScore.score
  if (!analyzedAt) {
    return { label: `Score ${score}`, stale: false }
  }
  const days = Math.floor((Date.now() - new Date(analyzedAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return { label: `Score ${score} · today`, stale: false }
  if (days === 1) return { label: `Score ${score} · 1d ago`, stale: days > 14 }
  return { label: `Score ${score} · ${days}d ago`, stale: days > 14 }
}

export function resolveAssetAuthorProjectId(
  assetId: string,
  episodes: EpisodeBlueprintResponse[],
  match: (ep: EpisodeBlueprintResponse) => boolean
): string | null {
  for (const ep of episodes) {
    if (!ep.projectId) continue
    if (match(ep)) return ep.projectId
  }
  return episodes.find((e) => e.projectId)?.projectId ?? null
}

export function getCharacterUsageEpisodes(
  characterId: string,
  episodes: EpisodeBlueprintResponse[]
): number[] {
  return episodes
    .filter((ep) => (ep.characters ?? []).some((c) => c.characterId === characterId))
    .map((ep) => ep.episodeNumber)
}

export function getLocationUsageEpisodes(
  locationName: string,
  episodes: EpisodeBlueprintResponse[]
): number[] {
  const needle = locationName.toLowerCase()
  return episodes
    .filter((ep) => {
      const text = `${ep.synopsis ?? ''} ${ep.logline ?? ''}`.toLowerCase()
      return text.includes(needle)
    })
    .map((ep) => ep.episodeNumber)
}
