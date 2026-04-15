import { list, put } from '@vercel/blob'

export type EapApplicationStatus = 'new' | 'in_review' | 'approved' | 'waitlisted' | 'rejected'

export interface EapApplicationRecord {
  applicationId: string
  submittedAt: string
  source: string
  userAgent?: string
  fullName: string
  email: string
  countryOfOrigin: string
  organizationName: string
  primaryRole: string
  distributionChannel: string
  monthlyVolume: string
  bottleneck: string
  artStyles: string[]
  artStyleOther?: string
  audienceResonanceImportance: string
  multiLanguageStatus: string
  gcpVertexComfort: string
  seriesConcept: string
  weeklyFeedbackCommitment: string
  hasF2vExperience: boolean
}

export interface EapReviewNote {
  id: string
  body: string
  author: string
  createdAt: string
}

export interface EapReviewScore {
  agencyLead: number
  seriesCreator: number
  techEnthusiast: number
  casualCreator: number
  total: number
  updatedAt: string
  updatedBy: string
}

export interface EapReviewRecord {
  applicationId: string
  status: EapApplicationStatus
  reviewer?: string
  score?: EapReviewScore
  notes: EapReviewNote[]
  updatedAt: string
}

export interface EapListFilters {
  status?: EapApplicationStatus | 'all'
  search?: string
  page?: number
  limit?: number
  sort?: 'newest' | 'oldest' | 'score_desc' | 'score_asc'
}

const APPLICATIONS_PREFIX = 'early-access/applications/'
const REVIEWS_PREFIX = 'early-access/reviews/'

function reviewPath(applicationId: string): string {
  return `${REVIEWS_PREFIX}${applicationId}.json`
}

function toSafeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return value
}

async function fetchJsonFromBlobUrl<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return null
  return (await response.json()) as T
}

function normalizeStatus(value: unknown): EapApplicationStatus {
  const text = typeof value === 'string' ? value : ''
  if (text === 'in_review' || text === 'approved' || text === 'waitlisted' || text === 'rejected') {
    return text
  }
  return 'new'
}

function ensureReviewBase(applicationId: string, review?: EapReviewRecord | null): EapReviewRecord {
  return {
    applicationId,
    status: normalizeStatus(review?.status),
    reviewer: review?.reviewer,
    score: review?.score,
    notes: Array.isArray(review?.notes) ? review!.notes : [],
    updatedAt: review?.updatedAt || new Date().toISOString(),
  }
}

async function loadReviewsMap(): Promise<Map<string, EapReviewRecord>> {
  const map = new Map<string, EapReviewRecord>()
  const listing = await list({ prefix: REVIEWS_PREFIX, limit: 1000 })
  for (const blob of listing.blobs) {
    const review = await fetchJsonFromBlobUrl<EapReviewRecord>(blob.url)
    if (review?.applicationId) {
      map.set(review.applicationId, ensureReviewBase(review.applicationId, review))
    }
  }
  return map
}

export async function listEapApplications(filters: EapListFilters = {}) {
  const page = Math.max(filters.page || 1, 1)
  const limit = Math.max(Math.min(filters.limit || 25, 100), 1)
  const search = (filters.search || '').trim().toLowerCase()
  const sort = filters.sort || 'newest'
  const status = filters.status || 'all'

  const [appsListing, reviewsMap] = await Promise.all([
    list({ prefix: APPLICATIONS_PREFIX, limit: 1000 }),
    loadReviewsMap(),
  ])

  const allItems: Array<{ application: EapApplicationRecord; review: EapReviewRecord }> = []
  for (const blob of appsListing.blobs) {
    const application = await fetchJsonFromBlobUrl<EapApplicationRecord>(blob.url)
    if (!application?.applicationId) continue
    const review = ensureReviewBase(application.applicationId, reviewsMap.get(application.applicationId))
    allItems.push({ application, review })
  }

  let filtered = allItems
  if (status !== 'all') {
    filtered = filtered.filter((item) => item.review.status === status)
  }
  if (search) {
    filtered = filtered.filter((item) => {
      const fields = [
        item.application.fullName,
        item.application.email,
        item.application.organizationName,
        item.application.primaryRole,
        item.application.countryOfOrigin,
        item.application.applicationId,
      ]
      return fields.some((value) => (value || '').toLowerCase().includes(search))
    })
  }

  filtered.sort((a, b) => {
    if (sort === 'oldest') {
      return new Date(a.application.submittedAt).getTime() - new Date(b.application.submittedAt).getTime()
    }
    if (sort === 'score_desc') {
      return toSafeNumber(b.review.score?.total) - toSafeNumber(a.review.score?.total)
    }
    if (sort === 'score_asc') {
      return toSafeNumber(a.review.score?.total) - toSafeNumber(b.review.score?.total)
    }
    return new Date(b.application.submittedAt).getTime() - new Date(a.application.submittedAt).getTime()
  })

  const total = filtered.length
  const start = (page - 1) * limit
  const end = start + limit

  return {
    total,
    page,
    limit,
    items: filtered.slice(start, end),
  }
}

export async function getEapApplication(applicationId: string) {
  const appBlobPath = `${APPLICATIONS_PREFIX}${applicationId}.json`
  const [appsListing, reviewListing] = await Promise.all([
    list({ prefix: appBlobPath, limit: 1 }),
    list({ prefix: reviewPath(applicationId), limit: 1 }),
  ])

  const appBlob = appsListing.blobs.find((b) => b.pathname === appBlobPath) || appsListing.blobs[0]
  if (!appBlob?.url) return null

  const application = await fetchJsonFromBlobUrl<EapApplicationRecord>(appBlob.url)
  if (!application?.applicationId) return null

  const reviewBlob = reviewListing.blobs.find((b) => b.pathname === reviewPath(applicationId)) || reviewListing.blobs[0]
  const review = reviewBlob?.url
    ? ensureReviewBase(applicationId, await fetchJsonFromBlobUrl<EapReviewRecord>(reviewBlob.url))
    : ensureReviewBase(applicationId)

  return { application, review }
}

export async function upsertEapReview(applicationId: string, updates: Partial<EapReviewRecord>) {
  const existing = await getEapApplication(applicationId)
  if (!existing) return null

  const merged: EapReviewRecord = {
    ...existing.review,
    ...updates,
    applicationId,
    status: normalizeStatus(updates.status || existing.review.status),
    notes: updates.notes || existing.review.notes,
    updatedAt: new Date().toISOString(),
  }

  await put(reviewPath(applicationId), JSON.stringify(merged, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
  })

  return { application: existing.application, review: merged }
}

export async function addEapReviewNote(applicationId: string, body: string, author: string) {
  const existing = await getEapApplication(applicationId)
  if (!existing) return null

  const note: EapReviewNote = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    body: body.trim(),
    author,
    createdAt: new Date().toISOString(),
  }

  const nextNotes = [note, ...existing.review.notes]
  return upsertEapReview(applicationId, { notes: nextNotes })
}

export async function updateEapScore(
  applicationId: string,
  score: Omit<EapReviewScore, 'total' | 'updatedAt' | 'updatedBy'>,
  updatedBy: string
) {
  const total = score.agencyLead + score.seriesCreator + score.techEnthusiast + score.casualCreator
  return upsertEapReview(applicationId, {
    score: {
      ...score,
      total,
      updatedAt: new Date().toISOString(),
      updatedBy,
    },
  })
}
