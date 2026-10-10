import {
  dropExtraIntroShots,
  findPromoTitleCard,
  isPromoTitleCard,
} from '@/lib/publish/promoPlanConstraints'
import {
  buildPromoShotCatalog,
  trailerRoleForBeatRole,
  type PromoShotCatalogEntry,
} from '@/lib/publish/promoShotCatalog'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'

export const MIN_TRAILER_SEC = 30
export const MAX_TRAILER_SEC = 120
export const DEFAULT_TRAILER_SEC = 60

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
  /** Kept so a revise that asks for another intro is not collapsed. */
  directorNotes?: string
}

export interface TrailerPlannerResult {
  beatPlan: PromoTrailerBeatPlan[]
  totalDurationSec: number
  targetDurationSec: number
  /** Model composition, or the cinematic arc used when the model plan is unusable. */
  source?: 'model' | 'heuristic'
}

/**
 * Cinematic score. A clip or still is only a tie-break so an unproduced
 * climax can outrank a weak shot that already has media.
 */
function scoreShot(shot: PromoShotCatalogEntry): number {
  let score = 40
  if (shot.hero) score += 100
  if (shot.audienceScore != null) score += shot.audienceScore * 0.5
  if (shot.hasClip) score += 3
  else if (shot.hasStill) score += 1

  if (shot.beatRole === 'climax') score += 25
  if (shot.beatRole === 'title_reveal') score += 20
  if (shot.beatRole === 'opening') score += 8
  if (shot.beatKind === 'dialogue') score += 15
  if (shot.beatKind === 'action') score += 12
  if (shot.beatKind === 'narration') score += 5
  score += Math.sin(shot.beatIndex * 0.7) * 5
  return score
}

/** Hook, then rising shots, then the peak and the button. */
function trailerArcRank(role?: string): number {
  if (role === 'opening') return 0
  if (role === 'climax') return 2
  if (role === 'title_reveal') return 3
  return 1
}

function compareTrailerArc(a: PromoShotCatalogEntry, b: PromoShotCatalogEntry): number {
  const rank = trailerArcRank(a.beatRole) - trailerArcRank(b.beatRole)
  if (rank !== 0) return rank
  if (a.sceneIndex !== b.sceneIndex) return a.sceneIndex - b.sceneIndex
  return a.beatIndex - b.beatIndex
}

function toBeatPlan(shot: PromoShotCatalogEntry, score: number): PromoTrailerBeatPlan {
  return {
    sceneId: shot.sceneId,
    beatId: shot.beatId,
    sceneIndex: shot.sceneIndex,
    startSec: 0,
    endSec: shot.durationSec,
    durationSec: shot.durationSec,
    score,
    label: shot.label,
    frameUrl: shot.frameUrl,
    videoUrl: shot.videoUrl,
    beatRole: shot.beatRole,
    beatKind: shot.beatKind,
    trailerRole: trailerRoleForBeatRole(shot.beatRole),
  }
}

/**
 * Select shots totaling 30–120 seconds for a promo trailer.
 * Media is not required. Order is a trailer arc, not script order.
 */
export function planPromoTrailer(input: TrailerPlannerInput): TrailerPlannerResult {
  const targetDurationSec = Math.min(
    MAX_TRAILER_SEC,
    Math.max(MIN_TRAILER_SEC, input.targetDurationSec ?? DEFAULT_TRAILER_SEC)
  )

  const catalog = buildPromoShotCatalog(input)
  const scored = catalog.map((shot) => ({
    shot,
    score: scoreShot(shot),
  }))
  scored.sort((a, b) => b.score - a.score)

  const selected: Array<{ shot: PromoShotCatalogEntry; score: number }> = []
  let totalDurationSec = 0

  const addShot = (entry: { shot: PromoShotCatalogEntry; score: number }) => {
    if (
      selected.some(
        (item) =>
          item.shot.beatId === entry.shot.beatId &&
          item.shot.sceneIndex === entry.shot.sceneIndex
      )
    ) {
      return
    }
    selected.push(entry)
    totalDurationSec += entry.shot.durationSec
  }

  for (const entry of scored) {
    if (entry.shot.hero) addShot(entry)
  }

  for (const entry of scored) {
    if (totalDurationSec + entry.shot.durationSec > targetDurationSec && totalDurationSec >= MIN_TRAILER_SEC) {
      break
    }
    addShot(entry)
    if (totalDurationSec >= targetDurationSec) break
  }

  if (totalDurationSec < MIN_TRAILER_SEC) {
    for (const entry of scored) {
      if (totalDurationSec >= MIN_TRAILER_SEC) break
      addShot(entry)
    }
  }

  const collapsed = dropExtraIntroShots(selected, input.directorNotes)
  selected.length = 0
  selected.push(...collapsed)
  totalDurationSec = selected.reduce((sum, item) => sum + item.shot.durationSec, 0)

  const title = findPromoTitleCard(catalog)
  if (title) {
    const titleAt = selected.findIndex(
      (item) => item.shot.sceneIndex === title.sceneIndex && item.shot.beatId === title.beatId
    )
    if (titleAt >= 0) {
      const [item] = selected.splice(titleAt, 1)
      if (item) selected.push(item)
    } else {
      addShot({ shot: title, score: scoreShot(title) })
    }
  }

  const protectedShot = (shot: PromoShotCatalogEntry) => shot.hero || isPromoTitleCard(shot)
  while (totalDurationSec > targetDurationSec) {
    let dropAt = -1
    for (let i = selected.length - 1; i >= 0; i--) {
      if (!protectedShot(selected[i]!.shot)) {
        dropAt = i
        break
      }
    }
    if (dropAt < 0) break
    const nextTotal = totalDurationSec - selected[dropAt]!.shot.durationSec
    if (nextTotal < MIN_TRAILER_SEC && totalDurationSec <= MAX_TRAILER_SEC) break
    totalDurationSec = nextTotal
    selected.splice(dropAt, 1)
  }

  if (totalDurationSec < MIN_TRAILER_SEC) {
    for (const entry of scored) {
      if (totalDurationSec >= MIN_TRAILER_SEC) break
      const name = entry.shot.introCharacter?.trim().toLowerCase()
      const duplicateIntro =
        !!name &&
        selected.some((item) => item.shot.introCharacter?.trim().toLowerCase() === name)
      if (duplicateIntro) continue
      addShot(entry)
    }
    totalDurationSec = selected.reduce((sum, item) => sum + item.shot.durationSec, 0)
  }

  selected.sort((a, b) => compareTrailerArc(a.shot, b.shot))
  if (title) {
    const titleAt = selected.findIndex(
      (item) => item.shot.sceneIndex === title.sceneIndex && item.shot.beatId === title.beatId
    )
    if (titleAt >= 0 && titleAt !== selected.length - 1) {
      const [item] = selected.splice(titleAt, 1)
      if (item) selected.push(item)
    }
  }
  totalDurationSec = selected.reduce((sum, item) => sum + item.shot.durationSec, 0)

  return {
    beatPlan: selected.map((item) => toBeatPlan(item.shot, item.score)),
    totalDurationSec,
    targetDurationSec,
    source: 'heuristic',
  }
}
