import { Storage } from '@google-cloud/storage'
import type { AggregatorJobRecord } from './types'

const GCS_RENDER_BUCKET = (process.env.GCS_RENDER_BUCKET || 'sceneflow-render-jobs').trim()
const JOB_PREFIX = 'aggregator-jobs'

function getStorageClient(): Storage | null {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) return null
  try {
    const credentials = JSON.parse(credentialsJson)
    return new Storage({ projectId: credentials.project_id, credentials })
  } catch {
    return null
  }
}

const memoryJobs = new Map<string, AggregatorJobRecord>()

function jobPath(jobId: string): string {
  return `${JOB_PREFIX}/${jobId}.json`
}

export async function saveAggregatorJob(record: AggregatorJobRecord): Promise<void> {
  memoryJobs.set(record.jobId, record)
  const storage = getStorageClient()
  if (!storage) return
  try {
    const file = storage.bucket(GCS_RENDER_BUCKET).file(jobPath(record.jobId))
    await file.save(JSON.stringify(record), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    })
  } catch (e) {
    console.warn('[AggregatorJobStore] GCS save failed, using memory only:', e)
  }
}

export async function getAggregatorJob(jobId: string): Promise<AggregatorJobRecord | null> {
  const mem = memoryJobs.get(jobId)
  if (mem) return mem

  const storage = getStorageClient()
  if (!storage) return null
  try {
    const file = storage.bucket(GCS_RENDER_BUCKET).file(jobPath(jobId))
    const [exists] = await file.exists()
    if (!exists) return null
    const [contents] = await file.download()
    const parsed = JSON.parse(contents.toString()) as AggregatorJobRecord
    memoryJobs.set(jobId, parsed)
    return parsed
  } catch {
    return null
  }
}

export async function updateAggregatorJob(
  jobId: string,
  patch: Partial<AggregatorJobRecord>
): Promise<AggregatorJobRecord | null> {
  const existing = (await getAggregatorJob(jobId)) || null
  if (!existing) return null
  const updated: AggregatorJobRecord = {
    ...existing,
    ...patch,
    jobId,
    updatedAt: new Date().toISOString(),
  }
  await saveAggregatorJob(updated)
  return updated
}

export async function countInFlightAggregatorJobsForUser(userId: string): Promise<number> {
  let count = 0
  for (const job of memoryJobs.values()) {
    if (job.userId === userId && (job.status === 'processing' || job.status === 'queued')) {
      count++
    }
  }
  return count
}
