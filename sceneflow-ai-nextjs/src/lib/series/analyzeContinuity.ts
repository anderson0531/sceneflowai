import type { EpisodeBlueprintResponse, SeriesProductionBible } from '@/types/series'
import { getEpisodeDriftWarnings } from '@/lib/series/seriesHealth'

export type ContinuityIssueSeverity = 'info' | 'warning' | 'error'

export interface ContinuityIssue {
  id: string
  severity: ContinuityIssueSeverity
  category: 'characters' | 'threads' | 'events' | 'episodes' | 'assets'
  message: string
  episodeNumber?: number
}

export interface ContinuityAnalysisResult {
  ok: boolean
  issueCount: number
  issues: ContinuityIssue[]
  summary: string
}

export function analyzeContinuity(
  bible: SeriesProductionBible | null | undefined,
  episodes: EpisodeBlueprintResponse[]
): ContinuityAnalysisResult {
  const issues: ContinuityIssue[] = []

  for (const ep of episodes) {
    for (const warning of getEpisodeDriftWarnings(ep, bible)) {
      issues.push({
        id: `drift-${ep.id}-${issues.length}`,
        severity: 'warning',
        category: 'characters',
        message: warning,
        episodeNumber: ep.episodeNumber,
      })
    }
  }

  const startedWithoutSummary = episodes.filter(
    (ep) => ep.projectId && ep.status !== 'blueprint'
  )
  const summaryEps = new Set((bible?.episodeSummaries ?? []).map((s) => s.episodeNumber))
  for (const ep of startedWithoutSummary) {
    if (!summaryEps.has(ep.episodeNumber)) {
      issues.push({
        id: `missing-summary-${ep.episodeNumber}`,
        severity: 'info',
        category: 'episodes',
        message: `Episode ${ep.episodeNumber} is in production but has no bible summary yet`,
        episodeNumber: ep.episodeNumber,
      })
    }
  }

  const unresolvedThreads = (bible?.storyThreads ?? []).filter((t) => t.status !== 'resolved')
  const lastEp = episodes.length > 0 ? Math.max(...episodes.map((e) => e.episodeNumber)) : 0
  for (const thread of unresolvedThreads) {
    if (thread.introducedInEpisode && thread.introducedInEpisode < lastEp - 2) {
      issues.push({
        id: `stale-thread-${thread.id}`,
        severity: 'info',
        category: 'threads',
        message: `Story thread "${thread.name}" still ${thread.status} near end of slate`,
      })
    }
  }

  const deceased = new Set<string>()
  for (const ev of bible?.keyEvents ?? []) {
    if (ev.type === 'death' && ev.irreversible) {
      for (const id of ev.affectedCharacterIds) deceased.add(id)
    }
  }
  for (const ep of episodes) {
    if (ep.episodeNumber <= (bible?.keyEvents?.find((e) => e.type === 'death')?.episodeNumber ?? 0)) {
      continue
    }
    for (const c of ep.characters ?? []) {
      if (c.characterId && deceased.has(c.characterId)) {
        const name =
          bible?.characters?.find((ch) => ch.id === c.characterId)?.name ?? c.characterId
        issues.push({
          id: `dead-char-${ep.id}-${c.characterId}`,
          severity: 'error',
          category: 'events',
          message: `Deceased character "${name}" appears in Episode ${ep.episodeNumber} blueprint`,
          episodeNumber: ep.episodeNumber,
        })
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length

  let summary = 'Aligned with Series Bible.'
  if (errorCount > 0) {
    summary = `${errorCount} continuity conflict${errorCount !== 1 ? 's' : ''} need attention.`
  } else if (warningCount > 0) {
    summary = `${warningCount} drift signal${warningCount !== 1 ? 's' : ''} — review before producing.`
  } else if (issues.length > 0) {
    summary = `${issues.length} suggestion${issues.length !== 1 ? 's' : ''} for bible completeness.`
  }

  return {
    ok: errorCount === 0,
    issueCount: issues.length,
    issues,
    summary,
  }
}
