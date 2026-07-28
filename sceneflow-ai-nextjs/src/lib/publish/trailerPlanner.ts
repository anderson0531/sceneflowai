import { getSceneBeats } from '@/lib/script/beatMigration'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

const BEAT_DURATION_SEC = 8
const MIN_TRAILER_SEC = 30
const MAX_TRAILER_SEC = 60

export interface TrailerPlannerInput {
  scenes: unknown[]
  /** Per-scene audience resonance score (0–100). Higher = more likely selected. */
  sceneScores?: Record<number, number>
  /** Beat ids the user pinned as hero beats. */
  heroBeatIds?: string[]
  targetDurationSec?: number
}

export interface TrailerPlannerResult {
  beatPlan: PromoTrailerBeatPlan[]
  totalDurationSec: number
  targetDurationSec: number
}

function isHeroBeat(
  sceneIndex: number,
  beatIndex: number,
  beatId: string,
  heroBeatIds: string[] | undefined
): boolean {
  if (!heroBeatIds?.length) return false
  return heroBeatIds.some(
    (id) => id === beatId || id === `${sceneIndex}:${beatIndex}` || id === `${sceneIndex}:${beatId}`
  )
}

function scoreBeat(
  sceneIndex: number,
  beatIndex: number,
  beatId: string,
  beatKind: string | undefined,
  sceneScores: Record<number, number> | undefined,
  heroBeatIds: string[] | undefined
): number {
  let score = 50
  if (isHeroBeat(sceneIndex, beatIndex, beatId, heroBeatIds)) score += 100
  if (sceneScores?.[sceneIndex] != null) {
    score += sceneScores[sceneIndex] * 0.5
  }
  if (beatKind === 'dialogue') score += 15
  if (beatKind === 'action') score += 10
  if (beatKind === 'narration') score += 5
  // Prefer mid-scene beats for pacing variety
  score += Math.sin(beatIndex * 0.7) * 5
  return score
}

/** Select beat-woven clips totaling 30–60 seconds for a vertical promo trailer. */
export function planPromoTrailer(input: TrailerPlannerInput): TrailerPlannerResult {
  const targetDurationSec = Math.min(
    MAX_TRAILER_SEC,
    Math.max(MIN_TRAILER_SEC, input.targetDurationSec ?? 45)
  )

  const candidates: Array<
    PromoTrailerBeatPlan & { score: number; beatIndex: number }
  > = []

  input.scenes.forEach((rawScene, sceneIndex) => {
    const scene = rawScene as { id?: string; sceneId?: string }
    const sceneId = scene.id || scene.sceneId || `scene-${sceneIndex}`
    const beats = getSceneBeats(rawScene as Record<string, unknown>)

    beats.forEach((beat, beatIndex) => {
      if (beat.excluded) return
      const startSec = beatIndex * BEAT_DURATION_SEC
      const endSec = startSec + BEAT_DURATION_SEC
      candidates.push({
        sceneId,
        beatId: beat.beatId,
        sceneIndex,
        beatIndex,
        startSec,
        endSec,
        score: scoreBeat(
          sceneIndex,
          beatIndex,
          beat.beatId,
          beat.kind,
          input.sceneScores,
          input.heroBeatIds
        ),
        label: beat.actionDescription || beat.kind || `Beat ${beatIndex + 1}`,
      })
    })
  })

  candidates.sort((a, b) => b.score - a.score)

  const selected: PromoTrailerBeatPlan[] = []
  let totalDurationSec = 0

  const addCandidate = (candidate: (typeof candidates)[number]) => {
    if (selected.some((s) => s.beatId === candidate.beatId && s.sceneIndex === candidate.sceneIndex)) {
      return
    }
    selected.push({
      sceneId: candidate.sceneId,
      beatId: candidate.beatId,
      sceneIndex: candidate.sceneIndex,
      startSec: candidate.startSec,
      endSec: candidate.endSec,
      score: candidate.score,
      label: candidate.label,
    })
    totalDurationSec += candidate.endSec - candidate.startSec
  }

  // Always include pinned hero beats first
  for (const candidate of candidates) {
    if (isHeroBeat(candidate.sceneIndex, candidate.beatIndex, candidate.beatId, input.heroBeatIds)) {
      addCandidate(candidate)
    }
  }

  for (const candidate of candidates) {
    const clipLen = candidate.endSec - candidate.startSec
    if (totalDurationSec + clipLen > targetDurationSec && totalDurationSec >= MIN_TRAILER_SEC) {
      break
    }
    addCandidate(candidate)
    if (totalDurationSec >= targetDurationSec) break
  }

  // Re-order chronologically for narrative flow
  selected.sort((a, b) => {
    if (a.sceneIndex !== b.sceneIndex) return a.sceneIndex - b.sceneIndex
    return a.startSec - b.startSec
  })

  // Pad with additional beats if under minimum
  if (totalDurationSec < MIN_TRAILER_SEC) {
    for (const candidate of candidates) {
      if (selected.some((s) => s.beatId === candidate.beatId)) continue
      const clipLen = candidate.endSec - candidate.startSec
      selected.push({
        sceneId: candidate.sceneId,
        beatId: candidate.beatId,
        sceneIndex: candidate.sceneIndex,
        startSec: candidate.startSec,
        endSec: candidate.endSec,
        score: candidate.score,
        label: candidate.label,
      })
      totalDurationSec += clipLen
      if (totalDurationSec >= MIN_TRAILER_SEC) break
    }
    selected.sort((a, b) => {
      if (a.sceneIndex !== b.sceneIndex) return a.sceneIndex - b.sceneIndex
      return a.startSec - b.startSec
    })
  }

  return {
    beatPlan: selected,
    totalDurationSec,
    targetDurationSec,
  }
}
