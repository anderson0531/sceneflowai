/**
 * Editorial constraints the promo planner must keep even when the model misses them.
 * A credit is not the title. One introduction per protagonist. Dialogue keeps its line.
 */

import {
  MAX_PROMO_CLIP_SEC,
  MIN_PROMO_CLIP_SEC,
  type PromoShotCatalogEntry,
} from '@/lib/publish/promoShotCatalog'
import { VEO_DIALOGUE_CLIP_MAX_SEC } from '@/lib/scene/dialogueSegmentSplit'

export function isPromoTitleCard(shot: {
  beatRole?: string
  cinematicType?: string
}): boolean {
  if (shot.beatRole !== 'title_reveal') return false
  if (shot.cinematicType === 'outro') return false
  return true
}

export function isPromoCreditShot(shot: {
  beatRole?: string
  cinematicType?: string
}): boolean {
  return shot.beatRole === 'credit' || shot.cinematicType === 'outro'
}

/** Director notes that explicitly ask to keep more than one introduction. */
export function directorKeepsExtraIntros(notes?: string): boolean {
  const text = notes?.trim() ?? ''
  if (!text) return false
  return (
    /\b(keep|include|repeat|another|both|all|multiple)\b[\s\S]{0,48}\bintros?\b/i.test(text) ||
    /\bintros?\b[\s\S]{0,48}\b(keep|include|repeat|another|both|all|multiple)\b/i.test(text)
  )
}

/** Dialogue uses the spoken length, up to a Veo clip. Every other shot stays 4–6s. */
export function dialogueClipDuration(
  shot: { beatKind?: string; spokenDurationSec?: number; durationSec?: number },
  requested?: number
): number {
  if (
    shot.beatKind === 'dialogue' &&
    typeof shot.spokenDurationSec === 'number' &&
    shot.spokenDurationSec > 0
  ) {
    const editorial = Math.min(
      MAX_PROMO_CLIP_SEC,
      Math.max(MIN_PROMO_CLIP_SEC, Math.round(shot.durationSec ?? requested ?? MIN_PROMO_CLIP_SEC))
    )
    return Math.min(VEO_DIALOGUE_CLIP_MAX_SEC, Math.max(editorial, Math.round(shot.spokenDurationSec)))
  }
  const value =
    typeof requested === 'number' && Number.isFinite(requested)
      ? requested
      : shot.durationSec ?? MIN_PROMO_CLIP_SEC
  if (!Number.isFinite(value)) return MIN_PROMO_CLIP_SEC
  return Math.min(MAX_PROMO_CLIP_SEC, Math.max(MIN_PROMO_CLIP_SEC, Math.round(value)))
}

/** The title sequence's title reveal. A credit beat does not qualify. */
export function findPromoTitleCard<T extends PromoShotCatalogEntry>(catalog: T[]): T | undefined {
  return (
    catalog.find((shot) => shot.beatRole === 'title_reveal' && shot.cinematicType === 'title') ??
    catalog.find((shot) => isPromoTitleCard(shot))
  )
}

export function dropExtraIntroShots<T extends { shot: PromoShotCatalogEntry }>(
  selected: T[],
  directorNotes?: string
): T[] {
  if (directorKeepsExtraIntros(directorNotes)) return [...selected]
  const seen = new Set<string>()
  return selected.filter((item) => {
    const name = item.shot.introCharacter?.trim().toLowerCase()
    if (!name) return true
    if (seen.has(name)) return false
    seen.add(name)
    return true
  })
}
