import type { EpidemicSearchResult } from './epidemicClient'

export interface RankedSfxResult extends EpidemicSearchResult {
  score: number
  scoreBreakdown: {
    queryMatch: number
    tagMatch: number
    durationFit: number
  }
}

const tokenize = (text?: string): string[] =>
  (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

export function rankSfxCandidates(
  query: string,
  candidates: EpidemicSearchResult[],
  targetDurationSec = 2
): RankedSfxResult[] {
  const queryTokens = tokenize(query)

  return candidates
    .map((candidate) => {
      const titleTokens = tokenize(`${candidate.title} ${candidate.description || ''}`)
      const tagTokens = tokenize((candidate.tags || []).join(' '))
      const mergedTokens = new Set([...titleTokens, ...tagTokens])

      const queryMatchCount = queryTokens.filter((t) => mergedTokens.has(t)).length
      const queryMatch = queryTokens.length ? queryMatchCount / queryTokens.length : 0

      const tagMatchCount = queryTokens.filter((t) => tagTokens.includes(t)).length
      const tagMatch = queryTokens.length ? tagMatchCount / queryTokens.length : 0

      const duration = candidate.durationSec ?? targetDurationSec
      const durationDelta = Math.abs(duration - targetDurationSec)
      const durationFit = Math.max(0, 1 - durationDelta / Math.max(1, targetDurationSec * 2))

      const score = queryMatch * 0.55 + tagMatch * 0.2 + durationFit * 0.25

      return {
        ...candidate,
        score,
        scoreBreakdown: {
          queryMatch,
          tagMatch,
          durationFit,
        },
      }
    })
    .sort((a, b) => b.score - a.score)
}
