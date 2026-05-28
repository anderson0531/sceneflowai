import Project from '@/models/Project'

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

export async function incrementProjectCreditsUsed(
  projectId: string,
  amount: number
): Promise<number | null> {
  if (!isProjectIdRef(projectId) || amount <= 0) return null

  try {
    const project = await Project.findByPk(projectId)
    if (!project) return null

    const metadata = { ...(project.metadata || {}) } as Record<string, unknown>
    const current = getProjectCreditsUsed(metadata)
    const next = current + amount
    metadata.creditsUsed = next
    metadata.creditsUpdatedAt = new Date().toISOString()

    project.set('metadata', metadata)
    project.changed('metadata', true)
    await project.save()

    return next
  } catch (error) {
    console.warn('[projectBudget] Failed to increment creditsUsed:', { projectId, amount, error })
    return null
  }
}

export async function setProjectCreditsUsed(projectId: string, amount: number): Promise<number> {
  if (!isProjectIdRef(projectId)) {
    throw new Error('Invalid project ID')
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('creditsUsed must be a non-negative number')
  }

  const normalized = Math.round(amount)
  const project = await Project.findByPk(projectId)
  if (!project) {
    throw new Error('Project not found')
  }

  const metadata = { ...(project.metadata || {}) } as Record<string, unknown>
  metadata.creditsUsed = normalized
  metadata.creditsManualSetAt = new Date().toISOString()

  project.set('metadata', metadata)
  project.changed('metadata', true)
  await project.save()

  return normalized
}

export async function updateProjectBudgetFields(
  projectId: string,
  fields: { creditsUsed?: number; creditsBudget?: number }
): Promise<{ creditsUsed: number; creditsBudget: number }> {
  if (!isProjectIdRef(projectId)) {
    throw new Error('Invalid project ID')
  }

  const project = await Project.findByPk(projectId)
  if (!project) {
    throw new Error('Project not found')
  }

  const metadata = { ...(project.metadata || {}) } as Record<string, unknown>
  const now = new Date().toISOString()

  if (fields.creditsUsed !== undefined) {
    if (!Number.isFinite(fields.creditsUsed) || fields.creditsUsed < 0) {
      throw new Error('creditsUsed must be a non-negative number')
    }
    metadata.creditsUsed = Math.round(fields.creditsUsed)
    metadata.creditsManualSetAt = now
  }

  if (fields.creditsBudget !== undefined) {
    if (!Number.isFinite(fields.creditsBudget) || fields.creditsBudget < 0) {
      throw new Error('creditsBudget must be a non-negative number')
    }
    metadata.creditsBudget = Math.round(fields.creditsBudget)
    metadata.creditsBudgetSetAt = now
  }

  project.set('metadata', metadata)
  project.changed('metadata', true)
  await project.save()

  return {
    creditsUsed: getProjectCreditsUsed(metadata),
    creditsBudget: getProjectCreditsBudget(metadata),
  }
}
