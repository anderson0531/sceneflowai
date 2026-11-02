const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isProjectIdRef(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

/** Resolve project id from charge ref/meta (ref is often projectId on scene routes). */
export function resolveProjectIdFromCharge(
  ref?: string | null,
  meta?: Record<string, unknown> | null
): string | undefined {
  const metaProjectId = meta?.projectId
  if (isProjectIdRef(metaProjectId)) return metaProjectId
  if (isProjectIdRef(ref)) return ref
  return undefined
}

export function getProjectCreditsUsed(metadata: Record<string, unknown> | undefined | null): number {
  const rawValue =
    metadata?.creditsUsed ??
    (metadata?.creationHub as { metrics?: { creditsUsed?: unknown } } | undefined)?.metrics
      ?.creditsUsed ??
    (metadata?.productionCosts as { totalCredits?: unknown } | undefined)?.totalCredits ??
    0
  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

export function getProjectCreditsBudget(metadata: Record<string, unknown> | undefined | null): number {
  const parsedValue = Number(metadata?.creditsBudget ?? 0)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

export function getProjectScenesList(metadata: Record<string, any> | undefined | null): any[] {
  if (!metadata) return []
  const scenes =
    metadata?.visionPhase?.script?.script?.scenes ||
    metadata?.visionPhase?.scenes ||
    metadata?.scenes ||
    []
  return Array.isArray(scenes) ? scenes : []
}

export function getProjectSceneCount(metadata: Record<string, any> | undefined | null): number {
  const explicit = Number(metadata?.sceneCount)
  const listCount = getProjectScenesList(metadata).length
  if (listCount > 0) return listCount
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 0
}

export function getProjectEstimatedTotalCredits(
  metadata: Record<string, any> | undefined | null
): number {
  const explicitTotal = Number(metadata?.estimatedTotalCredits)
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) {
    return explicitTotal
  }
  const budget = getProjectCreditsBudget(metadata)
  if (budget > 0) {
    return budget
  }
  const sceneCount = getProjectSceneCount(metadata)
  return sceneCount > 0 ? sceneCount * 100 : 500
}

export function getProjectEstimatedRemainingCredits(
  metadata: Record<string, any> | undefined | null,
  progressPercent = 0
): number {
  const explicitRemaining = Number(metadata?.estimatedCreditsToComplete)
  if (Number.isFinite(explicitRemaining) && explicitRemaining >= 0) {
    return Math.round(explicitRemaining)
  }
  const clampedProgress = Math.max(0, Math.min(100, Number(progressPercent) || 0))
  if (clampedProgress >= 100) return 0
  const remainingRatio = 1 - clampedProgress / 100
  const baseTotal = getProjectEstimatedTotalCredits(metadata)
  return Math.ceil(baseTotal * remainingRatio)
}

export function getProjectBudgetStatus(
  metadata: Record<string, any> | undefined | null
): 'on-track' | 'near-limit' | 'over-budget' {
  const creditsUsed = getProjectCreditsUsed(metadata)
  const target = getProjectEstimatedTotalCredits(metadata)
  if (creditsUsed > target) return 'over-budget'
  if (creditsUsed > target * 0.75) return 'near-limit'
  return 'on-track'
}

/**
 * Extracts a truthful Audience Resonance score (0–100) or returns null when unanalyzed.
 * Never fabricates a placeholder score.
 */
export function getProjectAudienceResonanceScore(
  metadata: Record<string, any> | undefined | null
): number | null {
  if (!metadata) return null
  const visionAudience = metadata?.visionPhase?.reviews?.audience?.overallScore
  const blueprintAr = metadata?.blueprintAudienceResonance?.analysis?.overallScore
  const directScore = metadata?.audienceScore

  const rawPrimary = visionAudience ?? blueprintAr ?? directScore
  if (rawPrimary !== undefined && rawPrimary !== null && Number.isFinite(Number(rawPrimary))) {
    return Math.min(100, Math.max(0, Math.round(Number(rawPrimary))))
  }

  const scenes = getProjectScenesList(metadata)
  const sceneScores = scenes
    .map((s: any) => Number(s?.score || s?.reviewScore || 0))
    .filter((s: number) => Number.isFinite(s) && s > 0)

  if (sceneScores.length > 0) {
    const avg = Math.round(sceneScores.reduce((a: number, b: number) => a + b, 0) / sceneScores.length)
    return Math.min(100, Math.max(0, avg))
  }

  return null
}

