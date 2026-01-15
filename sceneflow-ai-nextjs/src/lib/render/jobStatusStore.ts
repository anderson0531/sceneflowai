/**
 * Shared Job Status Store
 * 
 * In-memory store for render job status. In production, this should be
 * replaced with a database (Firestore, Redis, etc.) for persistence
 * across serverless function instances.
 * 
 * Note: Vercel serverless functions may not share memory, so this is
 * primarily for local development and same-instance requests.
 */

export interface JobStatus {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  downloadUrl?: string
  error?: string
  createdAt: string
  updatedAt?: string
}

// Global in-memory store
// Note: This won't persist across Vercel serverless function instances
const jobStatusStore = new Map<string, JobStatus>()

/**
 * Get job status by ID
 */
export function getJobStatus(jobId: string): JobStatus | undefined {
  return jobStatusStore.get(jobId)
}

/**
 * Set job status
 */
export function setJobStatus(jobId: string, status: JobStatus): void {
  jobStatusStore.set(jobId, {
    ...status,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Update job status (partial update)
 */
export function updateJobStatus(jobId: string, update: Partial<JobStatus>): boolean {
  const existing = jobStatusStore.get(jobId)
  if (!existing) {
    return false
  }
  
  jobStatusStore.set(jobId, {
    ...existing,
    ...update,
    updatedAt: new Date().toISOString(),
  })
  
  return true
}

/**
 * Delete job status
 */
export function deleteJobStatus(jobId: string): boolean {
  return jobStatusStore.delete(jobId)
}

/**
 * Get all job statuses (for debugging)
 */
export function getAllJobStatuses(): Map<string, JobStatus> {
  return new Map(jobStatusStore)
}

/**
 * Clear all job statuses (for testing)
 */
export function clearAllJobStatuses(): void {
  jobStatusStore.clear()
}
