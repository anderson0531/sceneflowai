/**
 * Shared Job Status Store
 * 
 * Database-backed (RenderJob model) store for render job status.
 * Uses the Sequelize RenderJob model for persistence across serverless
 * function instances on Vercel.
 * 
 * Falls back to in-memory Map for local development or when DB is unavailable.
 */

import RenderJob from '@/models/RenderJob'

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
 * Get job status by ID - checks database first, then in-memory fallback
 */
export async function getJobStatusAsync(jobId: string): Promise<JobStatus | undefined> {
  try {
    const job = await RenderJob.findByPk(jobId)
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
  RenderJob.findByPk(jobId)
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
  RenderJob.findByPk(jobId)
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
