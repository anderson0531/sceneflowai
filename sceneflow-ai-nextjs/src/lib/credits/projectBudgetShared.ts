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
