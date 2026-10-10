/**
 * Hand edits to a promo cut. These stay in the order and length the user set.
 * The model normalizer is for Plan and Promo Director, which replace this cut.
 */

import { DEFAULT_WATERMARK_CONFIG } from '@/lib/scene/mixerSettings'
import { trailerRoleForBeatRole, type PromoShotCatalogEntry } from '@/lib/publish/promoShotCatalog'
import type { PromoTrailerBeatPlan, PromoTrailerRole } from '@/types/publishingAssets'

export const PROMO_TIMELINE_MIN_SEC = 1
export const PROMO_TIMELINE_MAX_SEC = 12

export function promoShotKey(shot: { sceneIndex: number; beatId: string }): string {
  return `${shot.sceneIndex}:${shot.beatId}`
}

/** A shot plays unless the timeline has turned it off. */
export function promoShotIncluded(beat: { included?: boolean } | null | undefined): boolean {
  return beat?.included !== false
}

export function clampPromoTimelineDuration(value: number): number {
  const rounded = Math.round(value)
  if (!Number.isFinite(rounded)) return 5
  return Math.min(PROMO_TIMELINE_MAX_SEC, Math.max(PROMO_TIMELINE_MIN_SEC, rounded))
}

export function withPromoShotDuration(
  beat: PromoTrailerBeatPlan,
  seconds: number
): PromoTrailerBeatPlan {
  const durationSec = clampPromoTimelineDuration(seconds)
  return { ...beat, startSec: 0, durationSec, endSec: durationSec }
}

export function withPromoShotIncluded(
  beat: PromoTrailerBeatPlan,
  included: boolean
): PromoTrailerBeatPlan {
  if (included) {
    const rest = { ...beat }
    delete rest.included
    return rest
  }
  return { ...beat, included: false }
}

function beatFromCatalog(shot: PromoShotCatalogEntry): PromoTrailerBeatPlan {
  const durationSec = clampPromoTimelineDuration(shot.durationSec)
  return {
    sceneId: shot.sceneId,
    beatId: shot.beatId,
    sceneIndex: shot.sceneIndex,
    startSec: 0,
    endSec: durationSec,
    durationSec,
    score: 1,
    label: shot.label,
    frameUrl: shot.frameUrl,
    videoUrl: shot.videoUrl,
    beatRole: shot.beatRole,
    beatKind: shot.beatKind,
    trailerRole: trailerRoleForBeatRole(shot.beatRole),
    ...(shot.cinematicType ? { cinematicType: shot.cinematicType } : {}),
    ...(shot.overlayText ? { overlayText: shot.overlayText } : {}),
  }
}

/**
 * Insert a catalog shot, or move it if it is already on the timeline.
 * Position is 1-based. A position past the end appends.
 */
export function placePromoShot(
  plan: PromoTrailerBeatPlan[],
  shot: PromoShotCatalogEntry,
  position: number
): PromoTrailerBeatPlan[] {
  const key = promoShotKey(shot)
  const existing = plan.find((beat) => promoShotKey(beat) === key)
  const without = plan.filter((beat) => promoShotKey(beat) !== key)
  const row = existing ? { ...existing } : beatFromCatalog(shot)
  const slot = Math.round(position)
  const index = Math.min(Math.max(1, Number.isFinite(slot) ? slot : 1), without.length + 1) - 1
  const next = [...without]
  next.splice(index, 0, row)
  return next
}

/** Move a shot to another index. Out-of-range indexes leave the cut unchanged. */
export function movePromoShot(
  plan: PromoTrailerBeatPlan[],
  fromIndex: number,
  toIndex: number
): PromoTrailerBeatPlan[] {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return plan
  if (fromIndex < 0 || fromIndex >= plan.length) return plan
  if (toIndex < 0 || toIndex >= plan.length || toIndex === fromIndex) return plan
  const next = [...plan]
  const [shot] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, shot!)
  return next
}

/** Seconds of included picture before narration should begin. An unknown shot starts at 0. */
export function promoNarrationStartSec(
  plan: PromoTrailerBeatPlan[],
  key: string | undefined
): number {
  const startKey = key?.trim()
  if (!startKey) return 0
  let elapsed = 0
  for (const beat of plan) {
    if (!promoShotIncluded(beat)) continue
    if (promoShotKey(beat) === startKey) return elapsed
    elapsed += beat.durationSec ?? Math.max(0, beat.endSec - beat.startSec)
  }
  return 0
}

/**
 * Accept a hand-edited cut. Every row must be a real source shot, once.
 * Duration becomes a whole second from 1 to 12. Included stays only when false.
 */
export function sanitizePromoTimeline(
  raw: unknown,
  catalog: PromoShotCatalogEntry[]
): PromoTrailerBeatPlan[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const byKey = new Map(catalog.map((shot) => [promoShotKey(shot), shot]))
  const seen = new Set<string>()
  const plan: PromoTrailerBeatPlan[] = []

  for (const row of raw) {
    if (!row || typeof row !== 'object') return null
    const record = row as Partial<PromoTrailerBeatPlan>
    const sceneIndex = typeof record.sceneIndex === 'number' ? record.sceneIndex : Number.NaN
    const beatId = typeof record.beatId === 'string' ? record.beatId : ''
    if (!beatId || !Number.isInteger(sceneIndex)) return null
    const key = promoShotKey({ sceneIndex, beatId })
    const shot = byKey.get(key)
    if (!shot || seen.has(key)) return null
    seen.add(key)

    const requested =
      typeof record.durationSec === 'number'
        ? record.durationSec
        : typeof record.endSec === 'number' && typeof record.startSec === 'number'
          ? record.endSec - record.startSec
          : shot.durationSec
    const durationSec = clampPromoTimelineDuration(requested)
    const trailerRole = isTrailerRole(record.trailerRole)
      ? record.trailerRole
      : trailerRoleForBeatRole(shot.beatRole)

    plan.push({
      sceneId: shot.sceneId,
      beatId: shot.beatId,
      sceneIndex: shot.sceneIndex,
      startSec: 0,
      endSec: durationSec,
      durationSec,
      score: typeof record.score === 'number' && Number.isFinite(record.score) ? record.score : 1,
      label: typeof record.label === 'string' && record.label.trim() ? record.label : shot.label,
      frameUrl: record.frameUrl || shot.frameUrl,
      videoUrl: record.videoUrl || shot.videoUrl,
      beatRole: shot.beatRole,
      beatKind: shot.beatKind,
      trailerRole,
      ...(shot.cinematicType ? { cinematicType: shot.cinematicType } : {}),
      ...(shot.overlayText ? { overlayText: shot.overlayText } : {}),
      ...(record.included === false ? { included: false } : {}),
    })
  }

  return plan
}

function isTrailerRole(value: unknown): value is PromoTrailerRole {
  return value === 'hook' || value === 'rise' || value === 'peak' || value === 'button'
}

/** Unset means the promo watermark is on. */
export function promoWatermarkEnabled(value: boolean | undefined): boolean {
  return value !== false
}

/** Same SceneFlow Studio mark the scene mixer burns in. */
export function promoStudioWatermarkPayload() {
  const watermark = DEFAULT_WATERMARK_CONFIG
  return {
    type: 'text' as const,
    text: watermark.text || 'SceneFlow Studio',
    anchor: watermark.anchor,
    padding: watermark.padding,
    textStyle: {
      fontFamily: watermark.textStyle.fontFamily,
      fontSize: watermark.textStyle.fontSize,
      fontWeight: watermark.textStyle.fontWeight,
      color: watermark.textStyle.color,
      opacity: watermark.textStyle.opacity,
      textShadow: watermark.textStyle.textShadow,
    },
    imageStyle: {
      width: watermark.imageStyle.width,
      opacity: watermark.imageStyle.opacity,
    },
  }
}
