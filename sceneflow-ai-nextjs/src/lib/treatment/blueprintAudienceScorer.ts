/**
 * Blueprint Audience Resonance v3 — deduct-from-100 scoring (aligned with Script AR).
 */

import type {
  BlueprintAudienceCategory,
  BlueprintAudienceDeduction,
  BlueprintAudienceRecommendation,
  BlueprintRecommendationPriority,
} from '@/lib/types/audienceResonance'
import { BLUEPRINT_AR_CATEGORY_WEIGHTS } from '@/lib/types/audienceResonance'

export const PRIORITY_POINTS: Record<
  BlueprintRecommendationPriority,
  { min: number; max: number }
> = {
  critical: { min: 12, max: 18 },
  high: { min: 10, max: 15 },
  medium: { min: 5, max: 9 },
  low: { min: 1, max: 4 },
  optional: { min: 1, max: 3 },
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function normalizePriority(
  raw?: string
): BlueprintRecommendationPriority {
  const p = (raw || 'medium').toLowerCase()
  if (p === 'critical') return 'critical'
  if (p === 'high') return 'high'
  if (p === 'low') return 'low'
  if (p === 'optional') return 'optional'
  return 'medium'
}

export function pointsForPriority(priority: BlueprintRecommendationPriority): number {
  const band = PRIORITY_POINTS[priority] || PRIORITY_POINTS.medium
  return Math.round((band.min + band.max) / 2)
}

/**
 * Diminishing weights so a full polish backlog does not crater a solid blueprint.
 * Sorted highest-impact first: first gap counts fully, later gaps taper.
 */
export const DEDUCTION_SCORE_WEIGHTS = [1, 0.65, 0.4, 0.25, 0.15, 0.1] as const
export const DEDUCTION_SCORE_WEIGHT_TAIL = 0.05

/**
 * Weighted deduction total used for the headline score (raw points stay on each item).
 */
export function weightedDeductionPoints(
  deductions: Array<{ points: number }>
): number {
  const sorted = [...deductions].sort(
    (a, b) => (Number(b.points) || 0) - (Number(a.points) || 0)
  )
  return sorted.reduce((sum, d, index) => {
    const weight =
      index < DEDUCTION_SCORE_WEIGHTS.length
        ? DEDUCTION_SCORE_WEIGHTS[index]
        : DEDUCTION_SCORE_WEIGHT_TAIL
    return sum + (Number(d.points) || 0) * weight
  }, 0)
}

export function calculateOverallFromDeductions(
  deductions: BlueprintAudienceDeduction[]
): number {
  const total = weightedDeductionPoints(deductions)
  return clamp(Math.round(100 - total), 0, 100)
}

/** Per-deduction contribution after sorting (for UI transparency). */
export function scoreContributionsForDeductions(
  deductions: BlueprintAudienceDeduction[]
): Array<BlueprintAudienceDeduction & { scoreContribution: number }> {
  const sorted = [...deductions].sort(
    (a, b) => (Number(b.points) || 0) - (Number(a.points) || 0)
  )
  return sorted.map((d, index) => {
    const weight =
      index < DEDUCTION_SCORE_WEIGHTS.length
        ? DEDUCTION_SCORE_WEIGHTS[index]
        : DEDUCTION_SCORE_WEIGHT_TAIL
    return {
      ...d,
      scoreContribution: Math.round((Number(d.points) || 0) * weight * 10) / 10,
    }
  })
}

export function applyCategoryHysteresis(
  categories: BlueprintAudienceCategory[],
  previousCategories?: BlueprintAudienceCategory[] | null,
  anchorStrength = 0.2,
  maxDelta = 15
): BlueprintAudienceCategory[] {
  if (!previousCategories?.length) return categories

  const prevLookup = Object.fromEntries(
    previousCategories.map((c) => [c.name, c.score])
  )

  return categories.map((cat) => {
    const prev = prevLookup[cat.name]
    if (prev === undefined) return cat
    let anchored = Math.round(prev * anchorStrength + cat.score * (1 - anchorStrength))
    const delta = anchored - prev
    if (Math.abs(delta) > maxDelta) {
      anchored = prev + (delta > 0 ? maxDelta : -maxDelta)
    }
    return { ...cat, score: clamp(anchored, 0, 100) }
  })
}

export function calculateWeightedCategoryScore(
  categories: BlueprintAudienceCategory[]
): number {
  let weightedSum = 0
  let totalWeight = 0
  for (const cat of categories) {
    const weight =
      BLUEPRINT_AR_CATEGORY_WEIGHTS[cat.name] ?? cat.weight ?? 20
    weightedSum += (cat.score || 70) * weight
    totalWeight += weight
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 70
}

/**
 * Final score: deductions are primary; category weighted score is fallback cap check.
 */
export function finalizeBlueprintScore(
  deductions: BlueprintAudienceDeduction[],
  categories: BlueprintAudienceCategory[],
  previousCategories?: BlueprintAudienceCategory[] | null
): { overallScore: number; categories: BlueprintAudienceCategory[] } {
  const smoothed = applyCategoryHysteresis(categories, previousCategories)
  const fromDeductions = calculateOverallFromDeductions(deductions)
  const fromCategories = calculateWeightedCategoryScore(smoothed)
  // Deductions authoritative; if model over-deducted vs categories, use higher of the two for fairness
  const overallScore = Math.max(
    fromDeductions,
    Math.min(fromCategories, 100)
  )
  return { overallScore: clamp(overallScore, 0, 100), categories: smoothed }
}

/**
 * Stable id derived from the fix text, mirroring `recommendationId` in the
 * Production Studio.
 *
 * Positional `rec-0` ids collided across runs: applying the first fix in one
 * analysis silently suppressed whatever landed first in the next one.
 */
export function blueprintRecommendationId(text: string, fallbackIndex = 0): string {
  const slug = text
    .trim()
    .slice(0, 60)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug ? `rec-${slug}` : `rec-${fallbackIndex}`
}

export function mapRecommendations(
  raw: unknown[],
  startIndex = 0
): BlueprintAudienceRecommendation[] {
  return (raw || []).map((item: any, idx) => {
    const priority = normalizePriority(item.priority)
    const pointsDeducted =
      typeof item.pointsDeducted === 'number'
        ? clamp(item.pointsDeducted, 1, 20)
        : pointsForPriority(priority)
    const fixSection = ['core', 'story', 'tone', 'beats', 'characters'].includes(
      item.fix_section || item.fixSection
    )
      ? (item.fix_section || item.fixSection)
      : 'story'

    const rawImpact = item.impact_sections || item.impactSections
    const impactSections = Array.isArray(rawImpact)
      ? rawImpact.filter((s: string) =>
          ['core', 'story', 'tone', 'beats', 'characters'].includes(s)
        )
      : undefined

    const rawReason =
      item.reason || item.deduction || item.deduction_reason || item.deductionReason
    const reason = rawReason ? String(rawReason) : undefined
    const text = String(item.text || item.description || item.title || '')

    return {
      id: item.id
        ? String(item.id)
        : blueprintRecommendationId(text, startIndex + idx),
      text,
      title: item.title ? String(item.title) : undefined,
      reason,
      priority,
      pointsDeducted,
      fixSection,
      category: item.category ? String(item.category) : undefined,
      impactSections: impactSections?.length ? impactSections : undefined,
      intentLabel: item.intent_label || item.intentLabel
        ? String(item.intent_label || item.intentLabel)
        : undefined,
    }
  })
}

/** The gap text a recommendation stands for, falling back to the fix itself. */
export function gapTextForRecommendation(
  rec: Pick<BlueprintAudienceRecommendation, 'reason' | 'title' | 'text'>
): string {
  return rec.reason?.trim() || rec.title?.trim() || rec.text
}

/**
 * Project the merged list into the legacy `deductions` shape.
 *
 * The score breakdown is a view of the recommendations rather than a list the
 * model authors separately, so the two can no longer disagree.
 */
export function deductionsFromRecommendations(
  recommendations: BlueprintAudienceRecommendation[]
): BlueprintAudienceDeduction[] {
  return [...recommendations]
    .sort((a, b) => b.pointsDeducted - a.pointsDeducted)
    .map((rec) => ({
      reason: gapTextForRecommendation(rec),
      points: rec.pointsDeducted,
      category: rec.category || 'General',
      priority: rec.priority,
      recommendationId: rec.id,
    }))
}

/**
 * Back-fill `reason` on analyses stored before gaps and fixes were merged.
 *
 * Those payloads carry two independently authored lists. Pairing them on points
 * (then on leftover order) recovers the link well enough to render, so existing
 * projects do not have to pay for a re-analysis to see their score breakdown.
 */
export function normalizeLegacyAnalysis<
  T extends {
    deductions?: BlueprintAudienceDeduction[]
    recommendations?: BlueprintAudienceRecommendation[]
  },
>(analysis: T | null | undefined): T | null | undefined {
  if (!analysis) return analysis
  const recommendations = analysis.recommendations ?? []
  if (recommendations.length === 0) return analysis
  if (recommendations.every((r) => r.reason)) return analysis

  const unclaimed = [...(analysis.deductions ?? [])]
  const claim = (rec: BlueprintAudienceRecommendation): string | undefined => {
    if (rec.reason) return rec.reason
    const byId = unclaimed.findIndex((d) => d.recommendationId === rec.id)
    const byPoints =
      byId >= 0 ? byId : unclaimed.findIndex((d) => d.points === rec.pointsDeducted)
    const index = byPoints >= 0 ? byPoints : unclaimed.length > 0 ? 0 : -1
    if (index < 0) return undefined
    const [matched] = unclaimed.splice(index, 1)
    return matched?.reason || undefined
  }

  return {
    ...analysis,
    recommendations: recommendations.map((rec) => ({ ...rec, reason: claim(rec) })),
  }
}
