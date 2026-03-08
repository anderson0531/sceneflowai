/**
 * Shared Job Status Store
 * 
 * Database-backed (RenderJob model) store for render job status.
 * Uses the Sequelize RenderJob model for persistence across serverless
 * function instances on Vercel.
 * 
 * Falls back to in-memory Map for local development or when DB is unavailable.
 * 
 * RESILIENCE: If the DB schema is missing columns (e.g., scene_id),
 * queries will retry without those columns before falling back to in-memory.
 */

import RenderJob from '@/models/RenderJob'

/**
 * Helper: Detect if a Sequelize error is caused by a missing column
 * and return the column name if so.
 */
function getMissingColumn(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err)
  // Matches: column "scene_id" does not exist
  const match = msg.match(/column "(\w+)" does not exist/)
  return match ? match[1] : null
}

// Track columns that are known to be missing from the DB
// so we can exclude them from subsequent queries without retrying
const missingColumns = new Set<string>()

export interface JobStatus {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  downloadUrl?: string
  error?: string
  createdAt: string
  updatedAt?: string
}

// In-memory fallback for when DB is unavailable
const fallbackStore = new Map<string, JobStatus>()

/**
 * Get job status by ID - checks database first, then in-memory fallback.
 * Resilient to missing columns (e.g., scene_id not yet migrated).
 */
export async function getJobStatusAsync(jobId: string): Promise<JobStatus | undefined> {
  try {
    // Exclude known missing columns from the SELECT
    const excludeAttrs = Array.from(missingColumns)
    const queryOptions: Record<string, unknown> = {}
    if (excludeAttrs.length > 0) {
      queryOptions.attributes = { exclude: excludeAttrs }
    }
    
    const job = await RenderJob.findByPk(jobId, queryOptions)
    if (job) {
      return {
        status: job.status as JobStatus['status'],
        progress: job.progress,
        downloadUrl: job.download_url || undefined,
        error: job.error || undefined,
        createdAt: job.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: job.updated_at?.toISOString(),
      }
    }
  } catch (dbError) {
    // Check if error is caused by a missing column
    const col = getMissingColumn(dbError)
    if (col && !missingColumns.has(col)) {
      console.warn(`[JobStatusStore] Column "${col}" missing from DB, excluding from future queries. Run migration: scripts/migrations/add_scene_id_to_render_jobs.sql`)
      missingColumns.add(col)
      // Retry once with the column excluded
      return getJobStatusAsync(jobId)
    }
    console.warn('[JobStatusStore] DB read failed, checking fallback:', dbError)
  }
  
  // Fallback to in-memory
  return fallbackStore.get(jobId)
}

/**
 * Synchronous getter - only checks in-memory fallback.
 * Use getJobStatusAsync when possible for DB-backed persistence.
 */
export function getJobStatus(jobId: string): JobStatus | undefined {
  return fallbackStore.get(jobId)
}

/**
 * Set job status - writes to both database and in-memory fallback
 */
export function setJobStatus(jobId: string, status: JobStatus): void {
  const now = new Date().toISOString()
  const statusWithTimestamp = { ...status, updatedAt: now }
  
  // Always update in-memory fallback immediately
  fallbackStore.set(jobId, statusWithTimestamp)
  
  // Async write to database (non-blocking)
  RenderJob.findByPk(jobId, missingColumns.size > 0 ? { attributes: { exclude: Array.from(missingColumns) } } : {})
    .then(async (existing) => {
      if (existing) {
        await existing.update({
          status: status.status,
          progress: status.progress,
          download_url: status.downloadUrl || null,
          error: status.error || null,
          completed_at: (status.status === 'COMPLETED' || status.status === 'FAILED') ? new Date() : null,
        })
      }
      // If job doesn't exist in DB, it was likely created by the render route already
    })
    .catch(err => {
      const col = getMissingColumn(err)
      if (col) {
        missingColumns.add(col)
        console.warn(`[JobStatusStore] Column "${col}" missing, added to exclusion list`)
      }
      console.warn('[JobStatusStore] DB write failed (in-memory still updated):', err)
    })
}

/**
 * Update job status (partial update) - writes to both database and in-memory
 */
export function updateJobStatus(jobId: string, update: Partial<JobStatus>): boolean {
  const existing = fallbackStore.get(jobId)
  if (!existing) {
    // Try to set as new entry with partial data
    const newStatus: JobStatus = {
      status: update.status || 'QUEUED',
      progress: update.progress || 0,
      downloadUrl: update.downloadUrl,
      error: update.error,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    fallbackStore.set(jobId, newStatus)
  } else {
    fallbackStore.set(jobId, {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString(),
    })
  }
  
  // Async write to database (non-blocking)
  RenderJob.findByPk(jobId, missingColumns.size > 0 ? { attributes: { exclude: Array.from(missingColumns) } } : {})
    .then(async (job) => {
      if (job) {
        const dbUpdate: Record<string, unknown> = {}
        if (update.status) dbUpdate.status = update.status
        if (update.progress !== undefined) dbUpdate.progress = update.progress
        if (update.downloadUrl !== undefined) dbUpdate.download_url = update.downloadUrl
        if (update.error !== undefined) dbUpdate.error = update.error
        if (update.status === 'COMPLETED' || update.status === 'FAILED') {
          dbUpdate.completed_at = new Date()
        }
        await job.update(dbUpdate)
      }
    })
    .catch(err => {
      const col = getMissingColumn(err)
      if (col) {
        missingColumns.add(col)
        console.warn(`[JobStatusStore] Column "${col}" missing, added to exclusion list`)
      }
      console.warn('[JobStatusStore] DB update failed:', err)
    })
  
  return true
}

/**
 * Delete job status
 */
export function deleteJobStatus(jobId: string): boolean {
  return fallbackStore.delete(jobId)
}

/**
 * Get all job statuses (for debugging) - only returns in-memory entries
 */
export function getAllJobStatuses(): Map<string, JobStatus> {
  return new Map(fallbackStore)
}

/**
 * Clear all job statuses (for testing)
 */
export function clearAllJobStatuses(): void {
  fallbackStore.clear()
}
