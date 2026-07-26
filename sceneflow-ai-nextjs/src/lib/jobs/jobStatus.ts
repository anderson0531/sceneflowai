import type { GenerationJobStatus } from '@/models/GenerationJob'

/**
 * Statuses that mean a job is still expected to produce a result.
 *
 * Kept in its own module so callers and tests can use it without importing the
 * Sequelize models, which require database configuration at import time.
 */
export const ACTIVE_JOB_STATUSES: GenerationJobStatus[] = ['queued', 'processing']

export function isActiveJobStatus(status: GenerationJobStatus): boolean {
  return ACTIVE_JOB_STATUSES.includes(status)
}
