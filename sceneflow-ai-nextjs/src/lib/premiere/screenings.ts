import { del, list, put } from '@vercel/blob'

export type PremiereScreeningStatus = 'draft' | 'active' | 'completed' | 'expired'
export type PremiereScreeningSource = 'external_upload' | 'final_cut_export'
export type PremiereSourceType = 'video' | 'animatic'
export type PremiereReviewStatus = 'open' | 'in_review' | 'resolved'

export interface PremiereScreeningRecord {
  id: string
  projectId: string
  title: string
  streamId?: string
  streamLabel?: string
  locale?: string
  sourceType?: PremiereSourceType
  videoUrl: string
  createdAt: string
  updatedAt?: string
  status: PremiereScreeningStatus
  reviewStatus?: PremiereReviewStatus
  owner?: string
  lastActionAt?: string
  viewerCount: number
  averageCompletion: number
  feedbackCount?: number
  avgRating?: number
  latestFeedbackAt?: string
  openItems?: number
  source: PremiereScreeningSource
}

export interface CreatePremiereScreeningInput {
  projectId: string
  title: string
  videoUrl: string
  streamId?: string
  streamLabel?: string
  locale?: string
  sourceType?: PremiereSourceType
  source?: PremiereScreeningSource
}

export interface UpdatePremiereScreeningInput {
  title?: string
  reviewStatus?: PremiereReviewStatus
  owner?: string
  status?: PremiereScreeningStatus
  feedbackCount?: number
  avgRating?: number
  latestFeedbackAt?: string
  openItems?: number
}

const PREMIERE_SCREENINGS_PREFIX = 'premiere/screenings/'

function screeningsPrefix(projectId: string): string {
  return `${PREMIERE_SCREENINGS_PREFIX}${projectId}/`
}

function screeningPath(projectId: string, screeningId: string): string {
  return `${screeningsPrefix(projectId)}${screeningId}.json`
}

async function fetchJsonFromBlobUrl<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return null
  return (await response.json()) as T
}

function normalizeStatus(value: unknown): PremiereScreeningStatus {
  if (value === 'active' || value === 'completed' || value === 'expired') return value
  return 'draft'
}

function normalizeReviewStatus(value: unknown): PremiereReviewStatus {
  if (value === 'in_review' || value === 'resolved') return value
  return 'open'
}

function normalizeSourceType(value: unknown): PremiereSourceType {
  if (value === 'animatic') return 'animatic'
  return 'video'
}

function toRecord(input: Partial<PremiereScreeningRecord>): PremiereScreeningRecord | null {
  if (!input.id || !input.projectId || !input.title || !input.videoUrl || !input.createdAt) return null
  return {
    id: input.id,
    projectId: input.projectId,
    title: input.title,
    streamId: input.streamId,
    streamLabel: typeof input.streamLabel === 'string' ? input.streamLabel : undefined,
    locale: typeof input.locale === 'string' ? input.locale : undefined,
    sourceType: normalizeSourceType(input.sourceType),
    videoUrl: input.videoUrl,
    createdAt: input.createdAt,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : input.createdAt,
    status: normalizeStatus(input.status),
    reviewStatus: normalizeReviewStatus(input.reviewStatus),
    owner: typeof input.owner === 'string' ? input.owner : undefined,
    lastActionAt: typeof input.lastActionAt === 'string' ? input.lastActionAt : undefined,
    viewerCount: typeof input.viewerCount === 'number' ? input.viewerCount : 0,
    averageCompletion: typeof input.averageCompletion === 'number' ? input.averageCompletion : 0,
    feedbackCount: typeof input.feedbackCount === 'number' ? input.feedbackCount : 0,
    avgRating: typeof input.avgRating === 'number' ? input.avgRating : 0,
    latestFeedbackAt: typeof input.latestFeedbackAt === 'string' ? input.latestFeedbackAt : undefined,
    openItems: typeof input.openItems === 'number' ? input.openItems : 0,
    source: input.source === 'final_cut_export' ? 'final_cut_export' : 'external_upload',
  }
}

export async function createPremiereScreeningFromUpload(
  input: CreatePremiereScreeningInput
): Promise<PremiereScreeningRecord> {
  const projectId = input.projectId.trim()
  const title = input.title.trim()
  const videoUrl = input.videoUrl.trim()
  if (!projectId || !title || !videoUrl) {
    throw new Error('projectId, title, and videoUrl are required')
  }

  const createdAt = new Date().toISOString()
  const id = `premiere-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const record: PremiereScreeningRecord = {
    id,
    projectId,
    title,
    streamId: input.streamId,
    streamLabel: input.streamLabel?.trim() || undefined,
    locale: input.locale?.trim() || undefined,
    sourceType: normalizeSourceType(input.sourceType),
    videoUrl,
    createdAt,
    updatedAt: createdAt,
    status: 'draft',
    reviewStatus: 'open',
    lastActionAt: createdAt,
    viewerCount: 0,
    averageCompletion: 0,
    feedbackCount: 0,
    avgRating: 0,
    openItems: 0,
    source: input.source || 'external_upload',
  }

  await put(screeningPath(projectId, id), JSON.stringify(record, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
  })

  return record
}

export async function listPremiereScreenings(projectId: string): Promise<PremiereScreeningRecord[]> {
  const trimmed = projectId.trim()
  if (!trimmed) return []

  const listing = await list({ prefix: screeningsPrefix(trimmed), limit: 1000 })
  const records: PremiereScreeningRecord[] = []
  for (const blob of listing.blobs) {
    const payload = await fetchJsonFromBlobUrl<Partial<PremiereScreeningRecord>>(blob.url)
    const record = payload ? toRecord(payload) : null
    if (record) records.push(record)
  }

  records.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  )
  return records
}

export async function updatePremiereScreening(
  projectId: string,
  screeningId: string,
  updates: UpdatePremiereScreeningInput
): Promise<PremiereScreeningRecord | null> {
  const normalizedProjectId = projectId.trim()
  const normalizedScreeningId = screeningId.trim()
  if (!normalizedProjectId || !normalizedScreeningId) return null

  const targetPath = screeningPath(normalizedProjectId, normalizedScreeningId)
  const listing = await list({ prefix: targetPath, limit: 2 })
  const targetBlob = listing.blobs.find((blob) => blob.pathname === targetPath) || listing.blobs[0]
  if (!targetBlob?.url) return null

  const payload = await fetchJsonFromBlobUrl<Partial<PremiereScreeningRecord>>(targetBlob.url)
  const existing = payload ? toRecord(payload) : null
  if (!existing) return null

  const updated: PremiereScreeningRecord = {
    ...existing,
    title: typeof updates.title === 'string' && updates.title.trim() ? updates.title.trim() : existing.title,
    reviewStatus:
      updates.reviewStatus === 'open' ||
      updates.reviewStatus === 'in_review' ||
      updates.reviewStatus === 'resolved'
        ? updates.reviewStatus
        : existing.reviewStatus,
    owner: typeof updates.owner === 'string' ? updates.owner.trim() || undefined : existing.owner,
    status:
      updates.status === 'active' || updates.status === 'completed' || updates.status === 'expired'
        ? updates.status
        : existing.status,
    feedbackCount: typeof updates.feedbackCount === 'number' ? updates.feedbackCount : existing.feedbackCount,
    avgRating: typeof updates.avgRating === 'number' ? updates.avgRating : existing.avgRating,
    latestFeedbackAt:
      typeof updates.latestFeedbackAt === 'string' ? updates.latestFeedbackAt : existing.latestFeedbackAt,
    openItems: typeof updates.openItems === 'number' ? updates.openItems : existing.openItems,
    updatedAt: new Date().toISOString(),
    lastActionAt: new Date().toISOString(),
  }

  // Some environments ignore allowOverwrite; delete first for deterministic updates.
  try {
    await del(targetPath)
  } catch {
    /* no-op: proceed to write */
  }

  await put(targetPath, JSON.stringify(updated, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
  })

  return updated
}

export async function updatePremiereScreeningTitle(
  projectId: string,
  screeningId: string,
  title: string
): Promise<PremiereScreeningRecord | null> {
  return updatePremiereScreening(projectId, screeningId, { title })
}

export function dedupePremiereScreenings(
  items: Array<Pick<PremiereScreeningRecord, 'id' | 'videoUrl'> & PremiereScreeningRecord>
): PremiereScreeningRecord[] {
  const bestByStreamAndUrl = new Map<string, PremiereScreeningRecord>()
  const deduped: PremiereScreeningRecord[] = []
  const seenIds = new Set<string>()

  for (const item of items) {
    if (!item.id || seenIds.has(item.id)) continue
    seenIds.add(item.id)
    const urlKey = (item.videoUrl || '').trim().toLowerCase()
    const streamKey = (item.streamId || item.streamLabel || 'unscoped').trim().toLowerCase()
    if (!urlKey) continue
    const dedupeKey = `${streamKey}::${urlKey}`

    const existing = bestByStreamAndUrl.get(dedupeKey)
    if (!existing) {
      bestByStreamAndUrl.set(dedupeKey, item)
      continue
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime()
    const itemTime = new Date(item.updatedAt || item.createdAt).getTime()
    if (itemTime >= existingTime) {
      bestByStreamAndUrl.set(dedupeKey, item)
    }
  }

  for (const item of bestByStreamAndUrl.values()) {
    deduped.push(item)
  }

  deduped.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  )
  return deduped
}
