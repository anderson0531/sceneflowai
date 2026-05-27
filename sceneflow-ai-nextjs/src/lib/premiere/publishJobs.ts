import { list, put } from '@vercel/blob'
import type { PublishDestination } from '@/lib/types/finalCut'

export type PublishJobStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'failed'

export interface PremierePublishJob {
  id: string
  projectId: string
  platform: PublishDestination
  status: PublishJobStatus
  videoUrl: string
  title: string
  description: string
  locale: string
  privacyStatus?: string
  thumbnailUrl?: string
  platformVideoId?: string
  platformUrl?: string
  error?: string
  createdAt: string
  updatedAt: string
}

const JOBS_PREFIX = 'premiere/publish-jobs/'

function jobPath(projectId: string, jobId: string): string {
  return `${JOBS_PREFIX}${projectId}/${jobId}.json`
}

export async function createPublishJob(
  input: Omit<PremierePublishJob, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: PublishJobStatus
  }
): Promise<PremierePublishJob> {
  const now = new Date().toISOString()
  const id = `publish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const job: PremierePublishJob = {
    id,
    status: input.status || 'pending',
    createdAt: now,
    updatedAt: now,
    ...input,
  }
  await put(jobPath(input.projectId, id), JSON.stringify(job, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
  })
  return job
}

export async function updatePublishJob(
  projectId: string,
  jobId: string,
  patch: Partial<PremierePublishJob>
): Promise<PremierePublishJob | null> {
  const jobs = await listPublishJobs(projectId)
  const existing = jobs.find((j) => j.id === jobId)
  if (!existing) return null
  const updated: PremierePublishJob = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await put(jobPath(projectId, jobId), JSON.stringify(updated, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
  })
  return updated
}

export async function listPublishJobs(projectId: string): Promise<PremierePublishJob[]> {
  const listing = await list({ prefix: `${JOBS_PREFIX}${projectId}/`, limit: 100 })
  const jobs: PremierePublishJob[] = []
  for (const blob of listing.blobs) {
    try {
      const res = await fetch(blob.url, { cache: 'no-store' })
      if (!res.ok) continue
      jobs.push((await res.json()) as PremierePublishJob)
    } catch {
      /* skip */
    }
  }
  return jobs.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}
