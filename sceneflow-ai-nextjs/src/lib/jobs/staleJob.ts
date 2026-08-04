import type { GenerationJobStatus } from '@/models/GenerationJob'

/** Queued jobs with no worker pickup (e.g. missing Inngest key). */
export const STALE_QUEUED_JOB_MS = 15 * 60 * 1000

/** Processing jobs with no heartbeat/progress update. */
export const STALE_PROCESSING_JOB_MS = 30 * 60 * 1000

type JobTimestamps = {
  status: GenerationJobStatus
  created_at?: Date | string | null
  updated_at?: Date | string | null
}

function jobAgeMs(job: JobTimestamps): number {
  const updated = job.updated_at ? new Date(job.updated_at).getTime() : NaN
  const created = job.created_at ? new Date(job.created_at).getTime() : NaN
  const anchor = Number.isFinite(updated) ? updated : created
  if (!Number.isFinite(anchor)) return 0
  return Date.now() - anchor
}

/** True when an active job is unlikely to ever finish and should be cleared. */
export function isStaleActiveJob(job: JobTimestamps): boolean {
  const ageMs = jobAgeMs(job)
  if (job.status === 'queued') return ageMs > STALE_QUEUED_JOB_MS
  if (job.status === 'processing') return ageMs > STALE_PROCESSING_JOB_MS
  return false
}

export const STALE_JOB_ERROR =
  'Revision timed out with no progress. Start a new revision to try again.'
