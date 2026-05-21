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

export function calculateOverallFromDeductions(
  deductions: BlueprintAudienceDeduction[]
): number {
  const total = deductions.reduce(
    (sum, d) => sum + (Number(d.points) || 0),
    0
  )
  return clamp(100 - total, 0, 100)
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

    return {
      id: item.id || `rec-${startIndex + idx}`,
      text: String(item.text || item.description || item.title || ''),
      title: item.title ? String(item.title) : undefined,
      priority,
      pointsDeducted,
      fixSection,
      category: item.category ? String(item.category) : undefined,
    }
  })
}

export function mapDeductions(raw: unknown[]): BlueprintAudienceDeduction[] {
  return (raw || []).map((d: any) => ({
    reason: String(d.reason || d.text || ''),
    points: clamp(Number(d.points) || 0, 0, 40),
    category: String(d.category || 'General'),
    priority: d.priority ? normalizePriority(d.priority) : undefined,
  }))
}
