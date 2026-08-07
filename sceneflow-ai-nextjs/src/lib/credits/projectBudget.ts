import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'
import Project from '@/models/Project'
import {
  isConnectionAcquireTimeoutError,
  isTransientConnectionCapacityError,
} from '@/lib/database/connectionDiagnostics'
import {
  getProjectCreditsBudget,
  getProjectCreditsUsed,
  isProjectIdRef,
} from './projectBudgetShared'

export {
  getProjectCreditsBudget,
  getProjectCreditsUsed,
  isProjectIdRef,
  resolveProjectIdFromCharge,
} from './projectBudgetShared'

const INCREMENT_RETRY_ATTEMPTS = 4
const INCREMENT_BACKOFF_BASE_MS = 150
const INCREMENT_BACKOFF_EXPONENT = 1.6

function isRetryableBudgetDbError(error: unknown): boolean {
  return isConnectionAcquireTimeoutError(error) || isTransientConnectionCapacityError(error)
}

function backoffMs(attemptIndex: number): number {
  return Math.round(INCREMENT_BACKOFF_BASE_MS * INCREMENT_BACKOFF_EXPONENT ** attemptIndex)
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Single-statement atomic increment so Express concurrent charges do not
 * read-modify-write race, and so pool max=1 only needs one checkout.
 *
 * Baseline matches getProjectCreditsUsed (creditsUsed → creationHub → productionCosts).
 */
async function atomicIncrementCreditsUsed(
  projectId: string,
  amount: number
): Promise<number | null> {
  const now = new Date().toISOString()
  const rows = await sequelize.query<{ credits_used: number | string }>(
    `
    UPDATE projects
    SET
      metadata = jsonb_set(
        jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{creditsUsed}',
          to_jsonb(
            (
              COALESCE(
                NULLIF(metadata->>'creditsUsed', '')::numeric,
                NULLIF(metadata #>> '{creationHub,metrics,creditsUsed}', '')::numeric,
                NULLIF(metadata #>> '{productionCosts,totalCredits}', '')::numeric,
                0
              ) + :amount
            )::int
          )
        ),
        '{creditsUpdatedAt}',
        to_jsonb(:now::text)
      ),
      updated_at = NOW()
    WHERE id = :projectId
    RETURNING (metadata->>'creditsUsed')::int AS credits_used
    `,
    {
      replacements: { projectId, amount, now },
      type: QueryTypes.SELECT,
    }
  )

  const first = Array.isArray(rows) ? rows[0] : undefined
  if (!first) return null
  const next = Number(first.credits_used)
  return Number.isFinite(next) ? next : null
}

export async function incrementProjectCreditsUsed(
  projectId: string,
  amount: number
): Promise<number | null> {
  if (!isProjectIdRef(projectId) || amount <= 0) return null

  let lastError: unknown
  for (let attempt = 1; attempt <= INCREMENT_RETRY_ATTEMPTS; attempt++) {
    try {
      return await atomicIncrementCreditsUsed(projectId, amount)
    } catch (error) {
      lastError = error
      if (!isRetryableBudgetDbError(error) || attempt === INCREMENT_RETRY_ATTEMPTS) {
        break
      }
      const wait = backoffMs(attempt - 1)
      console.warn('[projectBudget] Retrying creditsUsed increment after transient DB error:', {
        projectId,
        amount,
        attempt,
        waitMs: wait,
        error: error instanceof Error ? error.message : error,
      })
      await sleep(wait)
    }
  }

  console.warn('[projectBudget] Failed to increment creditsUsed:', {
    projectId,
    amount,
    error: lastError,
  })
  return null
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
  fields: {
    creditsUsed?: number
    creditsBudget?: number
    creditsBudgetParams?: Record<string, unknown>
  }
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

  if (fields.creditsBudgetParams !== undefined) {
    metadata.creditsBudgetParams = fields.creditsBudgetParams
  }

  project.set('metadata', metadata)
  project.changed('metadata', true)
  await project.save()

  return {
    creditsUsed: getProjectCreditsUsed(metadata),
    creditsBudget: getProjectCreditsBudget(metadata),
  }
}
