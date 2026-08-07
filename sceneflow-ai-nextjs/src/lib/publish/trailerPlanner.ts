import { getSceneBeats } from '@/lib/script/beatMigration'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

export const MIN_TRAILER_SEC = 30
export const MAX_TRAILER_SEC = 60
export const DEFAULT_TRAILER_SEC = 60

const DEFAULT_CLIP_SEC = 5
const CLIMAX_CLIP_SEC = 6
const MIN_CLIP_SEC = 4
const MAX_CLIP_SEC = 6

export interface TrailerPlannerProductionScene {
  segments?: Array<{
    beatId?: string
    activeAssetUrl?: string | null
    startTime?: number
    endTime?: number
    status?: string
  }>
}

export interface TrailerPlannerInput {
  scenes: unknown[]
  /** Per-scene production data keyed by scene id (or scene-N). */
  sceneProductionState?: Record<string, TrailerPlannerProductionScene | unknown>
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
    (id) =>
      id === beatId ||
      id === `${sceneIndex}:${beatIndex}` ||
      id === `${sceneIndex}:${beatId}`
  )
}

function isPromoOrBookendScene(scene: Record<string, unknown>): boolean {
  const cinematicType = String(scene.cinematicType || '')
  if (cinematicType === 'promo') return true
  return false
}

function resolveSceneId(scene: Record<string, unknown>, sceneIndex: number): string {
  return String(scene.id || scene.sceneId || `scene-${sceneIndex}`)
}

function resolveProduction(
  sceneProductionState: TrailerPlannerInput['sceneProductionState'],
  sceneId: string,
  sceneIndex: number
): TrailerPlannerProductionScene | undefined {
  if (!sceneProductionState) return undefined
  const byId = sceneProductionState[sceneId]
  if (byId && typeof byId === 'object') return byId as TrailerPlannerProductionScene
  const byIndex = sceneProductionState[`scene-${sceneIndex}`]
  if (byIndex && typeof byIndex === 'object') return byIndex as TrailerPlannerProductionScene
  return undefined
}

function findSegmentForBeat(
  production: TrailerPlannerProductionScene | undefined,
  beatId: string
): TrailerPlannerProductionScene['segments'] extends (infer S)[] | undefined ? S : never {
  const segments = production?.segments
  if (!Array.isArray(segments)) return undefined as never
  return segments.find((s) => s.beatId === beatId && s.activeAssetUrl) as never
}

function clipDurationForBeat(opts: {
  beatRole?: string
  beatDuration?: number
  segmentStart?: number
  segmentEnd?: number
}): number {
  const { beatRole, beatDuration, segmentStart, segmentEnd } = opts
  if (
    typeof segmentStart === 'number' &&
    typeof segmentEnd === 'number' &&
    segmentEnd > segmentStart
  ) {
    return Math.min(MAX_CLIP_SEC, Math.max(MIN_CLIP_SEC, segmentEnd - segmentStart))
  }
  if (typeof beatDuration === 'number' && beatDuration > 0) {
    return Math.min(MAX_CLIP_SEC, Math.max(MIN_CLIP_SEC, beatDuration))
  }
  if (beatRole === 'climax' || beatRole === 'title_reveal') return CLIMAX_CLIP_SEC
  return DEFAULT_CLIP_SEC
}

function scoreBeat(opts: {
  sceneIndex: number
  beatIndex: number
  beatId: string
  beatKind?: string
  beatRole?: string
  frameUrl?: string
  videoUrl?: string
  sceneScores?: Record<number, number>
  heroBeatIds?: string[]
}): number {
  let score = 40
  if (isHeroBeat(opts.sceneIndex, opts.beatIndex, opts.beatId, opts.heroBeatIds)) {
    score += 100
  }
  if (opts.sceneScores?.[opts.sceneIndex] != null) {
    score += opts.sceneScores[opts.sceneIndex]! * 0.5
  }
  if (opts.videoUrl) score += 35
  if (opts.frameUrl) score += 20
  if (!opts.videoUrl && !opts.frameUrl) score -= 40

  if (opts.beatRole === 'climax') score += 25
  if (opts.beatRole === 'title_reveal') score += 20
  if (opts.beatRole === 'opening') score += 8
  if (opts.beatKind === 'dialogue') score += 15
  if (opts.beatKind === 'action') score += 12
  if (opts.beatKind === 'narration') score += 5
  score += Math.sin(opts.beatIndex * 0.7) * 5
  return score
}

/** Select beat-woven clips totaling 30–60 seconds for a vertical promo trailer. */
export function planPromoTrailer(input: TrailerPlannerInput): TrailerPlannerResult {
  const targetDurationSec = Math.min(
    MAX_TRAILER_SEC,
    Math.max(MIN_TRAILER_SEC, input.targetDurationSec ?? DEFAULT_TRAILER_SEC)
  )

  type Candidate = PromoTrailerBeatPlan & { beatIndex: number }

  const candidates: Candidate[] = []

  input.scenes.forEach((rawScene, sceneIndex) => {
    const scene = rawScene as Record<string, unknown>
    if (isPromoOrBookendScene(scene)) return

    const sceneId = resolveSceneId(scene, sceneIndex)
    const production = resolveProduction(input.sceneProductionState, sceneId, sceneIndex)
    const beats = getSceneBeats(scene)

    beats.forEach((beat, beatIndex) => {
      if (beat.excluded) return
      const frameUrl =
        beat.storyboardImageUrl ||
        beat.storyboardEndImageUrl ||
        undefined
      const segment = findSegmentForBeat(production, beat.beatId)
      const videoUrl = segment?.activeAssetUrl || undefined
      const durationSec = clipDurationForBeat({
        beatRole: beat.beatRole,
        beatDuration: beat.durationSeconds,
        segmentStart: segment?.startTime,
        segmentEnd: segment?.endTime,
      })

      const score = scoreBeat({
        sceneIndex,
        beatIndex,
        beatId: beat.beatId,
        beatKind: beat.kind,
        beatRole: beat.beatRole,
        frameUrl,
        videoUrl,
        sceneScores: input.sceneScores,
        heroBeatIds: input.heroBeatIds,
      })

      candidates.push({
        sceneId,
        beatId: beat.beatId,
        sceneIndex,
        beatIndex,
        startSec: 0,
        endSec: durationSec,
        durationSec,
        score,
        label:
          beat.line ||
          beat.actionDescription ||
          beat.kind ||
          `Beat ${beatIndex + 1}`,
        frameUrl,
        videoUrl,
        beatRole: beat.beatRole,
        beatKind: beat.kind,
      })
    })
  })

  candidates.sort((a, b) => b.score - a.score)

  const selected: PromoTrailerBeatPlan[] = []
  let totalDurationSec = 0

  const addCandidate = (candidate: Candidate) => {
    if (
      selected.some(
        (s) => s.beatId === candidate.beatId && s.sceneIndex === candidate.sceneIndex
      )
    ) {
      return
    }
    const durationSec = candidate.durationSec ?? candidate.endSec - candidate.startSec
    selected.push({
      sceneId: candidate.sceneId,
      beatId: candidate.beatId,
      sceneIndex: candidate.sceneIndex,
      startSec: 0,
      endSec: durationSec,
      durationSec,
      score: candidate.score,
      label: candidate.label,
      frameUrl: candidate.frameUrl,
      videoUrl: candidate.videoUrl,
      beatRole: candidate.beatRole,
      beatKind: candidate.beatKind,
    })
    totalDurationSec += durationSec
  }

  for (const candidate of candidates) {
    if (
      isHeroBeat(
        candidate.sceneIndex,
        candidate.beatIndex,
        candidate.beatId,
        input.heroBeatIds
      )
    ) {
      addCandidate(candidate)
    }
  }

  for (const candidate of candidates) {
    const clipLen = candidate.durationSec ?? candidate.endSec - candidate.startSec
    if (totalDurationSec + clipLen > targetDurationSec && totalDurationSec >= MIN_TRAILER_SEC) {
      break
    }
    addCandidate(candidate)
    if (totalDurationSec >= targetDurationSec) break
  }

  selected.sort((a, b) => {
    if (a.sceneIndex !== b.sceneIndex) return a.sceneIndex - b.sceneIndex
    return (a.beatId || '').localeCompare(b.beatId || '')
  })

  // Recompute chronological order using original beatIndex from candidates
  const beatIndexByKey = new Map(
    candidates.map((c) => [`${c.sceneIndex}:${c.beatId}`, c.beatIndex] as const)
  )
  selected.sort((a, b) => {
    if (a.sceneIndex !== b.sceneIndex) return a.sceneIndex - b.sceneIndex
    const ai = beatIndexByKey.get(`${a.sceneIndex}:${a.beatId}`) ?? 0
    const bi = beatIndexByKey.get(`${b.sceneIndex}:${b.beatId}`) ?? 0
    return ai - bi
  })

  if (totalDurationSec < MIN_TRAILER_SEC) {
    for (const candidate of candidates) {
      if (selected.some((s) => s.beatId === candidate.beatId && s.sceneIndex === candidate.sceneIndex)) {
        continue
      }
      addCandidate(candidate)
      if (totalDurationSec >= MIN_TRAILER_SEC) break
    }
    selected.sort((a, b) => {
      if (a.sceneIndex !== b.sceneIndex) return a.sceneIndex - b.sceneIndex
      const ai = beatIndexByKey.get(`${a.sceneIndex}:${a.beatId}`) ?? 0
      const bi = beatIndexByKey.get(`${b.sceneIndex}:${b.beatId}`) ?? 0
      return ai - bi
    })
  }

  // Rebuild total after sort (unchanged lengths)
  totalDurationSec = selected.reduce(
    (sum, b) => sum + (b.durationSec ?? b.endSec - b.startSec),
    0
  )

  return {
    beatPlan: selected,
    totalDurationSec,
    targetDurationSec,
  }
}
