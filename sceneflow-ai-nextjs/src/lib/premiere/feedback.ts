import { list, put } from '@vercel/blob'

export type PremiereFeedbackStatus = 'open' | 'in_review' | 'resolved'

export interface PremiereFeedbackRecord {
  id: string
  projectId: string
  screeningId: string
  streamId?: string
  author: string
  rating: number
  comment: string
  tags: string[]
  status: PremiereFeedbackStatus
  owner?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePremiereFeedbackInput {
  projectId: string
  screeningId: string
  streamId?: string
  author?: string
  rating: number
  comment: string
  tags?: string[]
}

const PREMIERE_FEEDBACK_PREFIX = 'premiere/feedback/'

function feedbackPrefix(projectId: string, screeningId?: string): string {
  if (screeningId) return `${PREMIERE_FEEDBACK_PREFIX}${projectId}/${screeningId}/`
  return `${PREMIERE_FEEDBACK_PREFIX}${projectId}/`
}

function feedbackPath(projectId: string, screeningId: string, feedbackId: string): string {
  return `${feedbackPrefix(projectId, screeningId)}${feedbackId}.json`
}

async function fetchJsonFromBlobUrl<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return null
  return (await response.json()) as T
}

function normalizeStatus(value: unknown): PremiereFeedbackStatus {
  if (value === 'in_review' || value === 'resolved') return value
  return 'open'
}

function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function toRecord(input: Partial<PremiereFeedbackRecord>): PremiereFeedbackRecord | null {
  if (!input.id || !input.projectId || !input.screeningId || !input.comment || !input.createdAt) return null
  return {
    id: input.id,
    projectId: input.projectId,
    screeningId: input.screeningId,
    streamId: typeof input.streamId === 'string' ? input.streamId : undefined,
    author: typeof input.author === 'string' && input.author.trim() ? input.author.trim() : 'Reviewer',
    rating: typeof input.rating === 'number' ? Math.max(1, Math.min(5, input.rating)) : 3,
    comment: input.comment,
    tags: sanitizeTags(input.tags),
    status: normalizeStatus(input.status),
    owner: typeof input.owner === 'string' ? input.owner : undefined,
    createdAt: input.createdAt,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : input.createdAt,
  }
}

export async function listPremiereFeedback(
  projectId: string,
  options?: { screeningId?: string; streamId?: string }
): Promise<PremiereFeedbackRecord[]> {
  const normalizedProjectId = projectId.trim()
  if (!normalizedProjectId) return []
  const normalizedScreeningId = options?.screeningId?.trim() || undefined
  const normalizedStreamId = options?.streamId?.trim() || undefined

  const listing = await list({
    prefix: feedbackPrefix(normalizedProjectId, normalizedScreeningId),
    limit: 1000,
  })
  const records: PremiereFeedbackRecord[] = []
  for (const blob of listing.blobs) {
    const payload = await fetchJsonFromBlobUrl<Partial<PremiereFeedbackRecord>>(blob.url)
    const record = payload ? toRecord(payload) : null
    if (!record) continue
    if (normalizedStreamId && (record.streamId || '') !== normalizedStreamId) continue
    records.push(record)
  }

  records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return records
}

export async function createPremiereFeedback(
  input: CreatePremiereFeedbackInput
): Promise<PremiereFeedbackRecord> {
  const projectId = input.projectId.trim()
  const screeningId = input.screeningId.trim()
  const comment = input.comment.trim()
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)))
  if (!projectId || !screeningId || !comment) {
    throw new Error('projectId, screeningId, comment are required')
  }

  const now = new Date().toISOString()
  const id = `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const record: PremiereFeedbackRecord = {
    id,
    projectId,
    screeningId,
    streamId: input.streamId?.trim() || undefined,
    author: input.author?.trim() || 'Reviewer',
    rating,
    comment,
    tags: sanitizeTags(input.tags),
    status: 'open',
    createdAt: now,
    updatedAt: now,
  }

  await put(feedbackPath(projectId, screeningId, id), JSON.stringify(record, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
  })

  return record
}

export async function updatePremiereFeedback(
  projectId: string,
  screeningId: string,
  feedbackId: string,
  updates: {
    status?: PremiereFeedbackStatus
    tags?: string[]
    owner?: string
    comment?: string
    rating?: number
  }
): Promise<PremiereFeedbackRecord | null> {
  const path = feedbackPath(projectId.trim(), screeningId.trim(), feedbackId.trim())
  if (!projectId.trim() || !screeningId.trim() || !feedbackId.trim()) return null

  const listing = await list({ prefix: path, limit: 2 })
  const targetBlob = listing.blobs.find((blob) => blob.pathname === path) || listing.blobs[0]
  if (!targetBlob?.url) return null
  const payload = await fetchJsonFromBlobUrl<Partial<PremiereFeedbackRecord>>(targetBlob.url)
  const existing = payload ? toRecord(payload) : null
  if (!existing) return null

  const updated: PremiereFeedbackRecord = {
    ...existing,
    status:
      updates.status === 'open' || updates.status === 'in_review' || updates.status === 'resolved'
        ? updates.status
        : existing.status,
    tags: updates.tags ? sanitizeTags(updates.tags) : existing.tags,
    owner: typeof updates.owner === 'string' ? updates.owner.trim() || undefined : existing.owner,
    comment: typeof updates.comment === 'string' && updates.comment.trim() ? updates.comment.trim() : existing.comment,
    rating:
      typeof updates.rating === 'number'
        ? Math.max(1, Math.min(5, Math.round(updates.rating)))
        : existing.rating,
    updatedAt: new Date().toISOString(),
  }

  await put(path, JSON.stringify(updated, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
  })

  return updated
}

export function summarizePremiereFeedback(items: PremiereFeedbackRecord[]): {
  feedbackCount: number
  avgRating: number
  latestFeedbackAt?: string
  openItems: number
} {
  if (items.length === 0) {
    return { feedbackCount: 0, avgRating: 0, openItems: 0 }
  }
  const feedbackCount = items.length
  const avgRating = Number(
    (items.reduce((sum, item) => sum + item.rating, 0) / Math.max(1, feedbackCount)).toFixed(2)
  )
  const latestFeedbackAt = items
    .map((item) => item.updatedAt || item.createdAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
  const openItems = items.filter((item) => item.status !== 'resolved').length
  return { feedbackCount, avgRating, latestFeedbackAt, openItems }
}

