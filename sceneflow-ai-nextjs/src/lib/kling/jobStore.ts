import { Storage } from '@google-cloud/storage'
import type { KlingJobRecord } from './types'

const GCS_RENDER_BUCKET = (process.env.GCS_RENDER_BUCKET || 'sceneflow-render-jobs').trim()
const JOB_PREFIX = 'kling-jobs'

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

const memoryJobs = new Map<string, KlingJobRecord>()

function jobPath(jobId: string): string {
  return `${JOB_PREFIX}/${jobId}.json`
}

export async function saveKlingJob(record: KlingJobRecord): Promise<void> {
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
    console.warn('[KlingJobStore] GCS save failed, using memory only:', e)
  }
}

export async function getKlingJob(jobId: string): Promise<KlingJobRecord | null> {
  const mem = memoryJobs.get(jobId)
  if (mem) return mem

  const storage = getStorageClient()
  if (!storage) return null
  try {
    const file = storage.bucket(GCS_RENDER_BUCKET).file(jobPath(jobId))
    const [exists] = await file.exists()
    if (!exists) return null
    const [contents] = await file.download()
    const parsed = JSON.parse(contents.toString()) as KlingJobRecord
    memoryJobs.set(jobId, parsed)
    return parsed
  } catch {
    return null
  }
}

export async function updateKlingJob(
  jobId: string,
  patch: Partial<KlingJobRecord>
): Promise<KlingJobRecord | null> {
  const existing = await getKlingJob(jobId)
  if (!existing) return null
  const updated: KlingJobRecord = {
    ...existing,
    ...patch,
    jobId,
    updatedAt: new Date().toISOString(),
  }
  await saveKlingJob(updated)
  return updated
}
