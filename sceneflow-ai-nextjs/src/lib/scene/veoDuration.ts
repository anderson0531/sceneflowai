export const VEO_VALID_DURATIONS = [4, 6, 8, 10, 12] as const

export function snapToVeoDuration(duration: number): number {
  if (duration <= 5) return 4
  if (duration <= 7) return 6
  if (duration <= 9) return 8
  if (duration <= 11) return 10
  return 12
}

type ComboScore = {
  overshoot: number
  twelveCount: number
  tenCount: number
  eightCount: number
  fourCount: number
  sixCount: number
}

function scoreCombo(durations: number[], targetDuration: number): ComboScore {
  const total = durations.reduce((acc, d) => acc + d, 0)
  return {
    overshoot: total - targetDuration,
    twelveCount: durations.filter((d) => d === 12).length,
    tenCount: durations.filter((d) => d === 10).length,
    eightCount: durations.filter((d) => d === 8).length,
    fourCount: durations.filter((d) => d === 4).length,
    sixCount: durations.filter((d) => d === 6).length,
  }
}

function compareScores(a: ComboScore, b: ComboScore): number {
  // 1) Stay as close as possible to target (least overshoot)
  if (a.overshoot !== b.overshoot) return a.overshoot - b.overshoot
  // 2) Prefer longer clips when feasible (more 12s, 10s, 8s)
  if (a.twelveCount !== b.twelveCount) return b.twelveCount - a.twelveCount
  if (a.tenCount !== b.tenCount) return b.tenCount - a.tenCount
  if (a.eightCount !== b.eightCount) return b.eightCount - a.eightCount
  // 3) Then avoid short 4s unless required
  if (a.fourCount !== b.fourCount) return a.fourCount - b.fourCount
  // 4) Mild tie-breaker toward 6s over mixed/noisy combinations
  if (a.sixCount !== b.sixCount) return b.sixCount - a.sixCount
  return 0
}

/**
 * Allocate Veo clip durations for a segment that must be split.
 * Uses minimum required parts (ceil(total/maxDuration)) and picks a maxDuration-first combination
 * that still minimizes overshoot and avoids unnecessary 4s.
 */
export function allocateVeoSplitDurations(totalDuration: number, maxDuration: number = 12): number[] {
  const safeTotal = Math.max(0, totalDuration)
  if (safeTotal <= maxDuration) return [snapToVeoDuration(safeTotal)]

  const partCount = Math.max(1, Math.ceil(safeTotal / maxDuration))
  const candidates = [...VEO_VALID_DURATIONS].filter((d) => d <= maxDuration)
  if (candidates.length === 0) return [maxDuration]

  let best: number[] | null = null
  let bestScore: ComboScore | null = null

  const current: number[] = new Array(partCount).fill(candidates[candidates.length - 1])

  const search = (index: number) => {
    if (index === partCount) {
      const total = current.reduce((acc, d) => acc + d, 0)
      if (total < safeTotal) return

      const combo = [...current].sort((a, b) => b - a) // Normalize ordering
      const comboScore = scoreCombo(combo, safeTotal)

      if (!best || !bestScore || compareScores(comboScore, bestScore) < 0) {
        best = combo
        bestScore = comboScore
      }
      return
    }

    for (const d of candidates) {
      current[index] = d
      search(index + 1)
    }
  }

  search(0)
  return best || new Array(partCount).fill(maxDuration)
}
