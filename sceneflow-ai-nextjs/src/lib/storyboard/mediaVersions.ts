/**
 * Version history for stills (and production start/end frames).
 *
 * Current URL fields stay the live pointer so existing readers keep working.
 * History is an append-only list (capped) merged by URL so PUT/Express/salvage
 * never drop a paid-for blob.
 */

export const MEDIA_VERSION_CAP = 10

export type MediaVersionSource = 'generate' | 'upload' | 'edit' | 'express' | 'salvage' | 'restore'

export interface MediaVersion {
  id: string
  url: string
  createdAt: string
  source: MediaVersionSource
  prompt?: string
  /** True when createdAt was derived from a blob path, not a user write. */
  inferred?: boolean
}

export interface StillSlotSpec {
  urlKey: string
  versionsKey: string
  versionIdKey: string
}

export const BEAT_START_STILL_SLOT: StillSlotSpec = {
  urlKey: 'storyboardImageUrl',
  versionsKey: 'storyboardImageVersions',
  versionIdKey: 'storyboardImageVersionId',
}

export const BEAT_END_STILL_SLOT: StillSlotSpec = {
  urlKey: 'storyboardEndImageUrl',
  versionsKey: 'storyboardEndImageVersions',
  versionIdKey: 'storyboardEndImageVersionId',
}

export const SCENE_STILL_SLOT: StillSlotSpec = {
  urlKey: 'imageUrl',
  versionsKey: 'imageVersions',
  versionIdKey: 'imageVersionId',
}

export const DIALOGUE_STILL_SLOT: StillSlotSpec = {
  urlKey: 'storyboardImageUrl',
  versionsKey: 'storyboardImageVersions',
  versionIdKey: 'storyboardImageVersionId',
}

export const CUSTOM_FRAME_STILL_SLOT: StillSlotSpec = {
  urlKey: 'imageUrl',
  versionsKey: 'imageVersions',
  versionIdKey: 'imageVersionId',
}

export const START_FRAME_STILL_SLOT: StillSlotSpec = {
  urlKey: 'startFrameUrl',
  versionsKey: 'startFrameVersions',
  versionIdKey: 'startFrameVersionId',
}

export const END_FRAME_STILL_SLOT: StillSlotSpec = {
  urlKey: 'endFrameUrl',
  versionsKey: 'endFrameVersions',
  versionIdKey: 'endFrameVersionId',
}

export function isUsableMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'deferred') return false
  return true
}

/**
 * Millisecond timestamp from Vercel blob paths.
 * Matches `1779527367355.jpeg` and suffixed `1779527367355-AbCdEf.jpeg` / `scene-1779527367355-x.png`.
 */
export function mediaBlobUrlTimestamp(url: string): number {
  const suffixed = url.match(/(\d{13})(?:-[A-Za-z0-9]+)?\.(jpe?g|png|webp|gif)(?:\?|$)/i)
  if (suffixed) return parseInt(suffixed[1], 10)
  const sceneNamed = url.match(/scene-(\d{13})/i)
  if (sceneNamed) return parseInt(sceneNamed[1], 10)
  return 0
}

function newMediaVersionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `mv_${crypto.randomUUID().slice(0, 12)}`
  }
  return `mv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function asMediaVersions(value: unknown): MediaVersion[] {
  if (!Array.isArray(value)) return []
  const versions: MediaVersion[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    if (!isUsableMediaUrl(row.url)) continue
    const createdAt =
      typeof row.createdAt === 'string' && row.createdAt.trim()
        ? row.createdAt.trim()
        : new Date(mediaBlobUrlTimestamp(row.url.trim()) || 0).toISOString()
    const source = isMediaVersionSource(row.source) ? row.source : 'generate'
    versions.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : newMediaVersionId(),
      url: row.url.trim(),
      createdAt,
      source,
      ...(row.inferred === true ? { inferred: true } : {}),
      ...(typeof row.prompt === 'string' && row.prompt.trim()
        ? { prompt: row.prompt.trim() }
        : {}),
    })
  }
  return versions
}

function isMediaVersionSource(value: unknown): value is MediaVersionSource {
  return (
    value === 'generate' ||
    value === 'upload' ||
    value === 'edit' ||
    value === 'express' ||
    value === 'salvage' ||
    value === 'restore'
  )
}

export function versionFromUrl(
  url: string,
  options?: {
    source?: MediaVersionSource
    prompt?: string
    createdAt?: string
    id?: string
    inferred?: boolean
  }
): MediaVersion | null {
  if (!isUsableMediaUrl(url)) return null
  const trimmed = url.trim()
  return {
    id: options?.id || newMediaVersionId(),
    url: trimmed,
    createdAt: options?.createdAt || new Date().toISOString(),
    source: options?.source ?? 'generate',
    ...(options?.inferred ? { inferred: true } : {}),
    ...(options?.prompt?.trim() ? { prompt: options.prompt.trim() } : {}),
  }
}

function capVersions(list: MediaVersion[]): MediaVersion[] {
  if (list.length <= MEDIA_VERSION_CAP) return list
  return list.slice(list.length - MEDIA_VERSION_CAP)
}

export function appendMediaVersion(
  list: MediaVersion[] | unknown,
  next: MediaVersion
): MediaVersion[] {
  const existing = asMediaVersions(list)
  const duplicate = existing.find((version) => version.url === next.url)
  if (duplicate) {
    return existing.map((version) =>
      version.url === next.url
        ? {
            ...version,
            createdAt:
              Date.parse(next.createdAt) > Date.parse(version.createdAt)
                ? next.createdAt
                : version.createdAt,
            inferred: next.inferred ? version.inferred : undefined,
            ...(next.prompt ? { prompt: next.prompt } : {}),
          }
        : version
    )
  }
  return capVersions([...existing, next])
}

export function unionMediaVersions(
  a: MediaVersion[] | unknown,
  b: MediaVersion[] | unknown
): MediaVersion[] {
  const merged = new Map<string, MediaVersion>()
  const upsert = (version: MediaVersion) => {
    const prev = merged.get(version.url)
    if (!prev) {
      merged.set(version.url, version)
      return
    }
    const prevTime = Date.parse(prev.createdAt) || 0
    const nextTime = Date.parse(version.createdAt) || 0
    merged.set(version.url, nextTime >= prevTime ? { ...prev, ...version, id: prev.id } : prev)
  }
  asMediaVersions(a).forEach(upsert)
  asMediaVersions(b).forEach(upsert)
  return capVersions(
    [...merged.values()].sort(
      (left, right) => (Date.parse(left.createdAt) || 0) - (Date.parse(right.createdAt) || 0)
    )
  )
}

export function resolveCurrentMedia(
  list: MediaVersion[] | unknown,
  preferredUrl?: string | null
): MediaVersion | undefined {
  const versions = asMediaVersions(list)
  if (versions.length === 0) return undefined
  if (preferredUrl && isUsableMediaUrl(preferredUrl)) {
    const match = versions.find((version) => version.url === preferredUrl.trim())
    if (match) return match
  }
  return versions.reduce((newest, version) => {
    if (!newest) return version
    return (Date.parse(version.createdAt) || 0) >= (Date.parse(newest.createdAt) || 0)
      ? version
      : newest
  })
}

export function createdAtForUrl(
  list: MediaVersion[] | unknown,
  url: string | undefined
): number {
  if (!url || !isUsableMediaUrl(url)) return 0
  const match = asMediaVersions(list).find((version) => version.url === url.trim())
  if (match && !match.inferred) {
    const parsed = Date.parse(match.createdAt)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return 0
}

/** Recency for salvage/sort: explicit createdAt, then inferred/blob path digits. */
export function mediaRecencyMs(
  url: string | undefined,
  list?: MediaVersion[] | unknown
): number {
  if (!url || !isUsableMediaUrl(url)) return 0
  const explicit = createdAtForUrl(list, url)
  if (explicit) return explicit
  const match = asMediaVersions(list).find((version) => version.url === url.trim())
  if (match) {
    const parsed = Date.parse(match.createdAt)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return mediaBlobUrlTimestamp(url.trim())
}

/**
 * Current pointer for an accepted PUT: incoming wins unless both sides have
 * ISO createdAt and incoming is strictly older.
 */
export function pickCurrentMediaUrl(
  incomingUrl: unknown,
  canonicalUrl: unknown,
  incomingVersions?: unknown,
  canonicalVersions?: unknown
): string | undefined {
  const incoming = isUsableMediaUrl(incomingUrl) ? incomingUrl.trim() : undefined
  const canonical = isUsableMediaUrl(canonicalUrl) ? canonicalUrl.trim() : undefined
  if (!incoming) return canonical
  if (!canonical) return incoming
  if (incoming === canonical) return incoming

  const incomingAt = createdAtForUrl(incomingVersions, incoming)
  const canonicalAt = createdAtForUrl(canonicalVersions, canonical)
  if (incomingAt && canonicalAt && incomingAt < canonicalAt) return canonical
  return incoming
}

export function backfillVersionsFromUrl(
  list: MediaVersion[] | unknown,
  url: unknown,
  options?: { source?: MediaVersionSource; createdAt?: string; prompt?: string }
): MediaVersion[] {
  const versions = asMediaVersions(list)
  if (!isUsableMediaUrl(url)) return versions
  if (versions.some((version) => version.url === url.trim())) return versions
  const blobTs = mediaBlobUrlTimestamp(url.trim())
  const next = versionFromUrl(url.trim(), {
    ...options,
    createdAt: options?.createdAt || (blobTs ? new Date(blobTs).toISOString() : new Date(0).toISOString()),
    inferred: true,
  })
  return next ? appendMediaVersion(versions, next) : versions
}

export interface AssignStillOptions {
  source?: MediaVersionSource
  prompt?: string
  createdAt?: string
  restoreVersionId?: string
}

export function assignStillUrl<T extends Record<string, unknown>>(
  row: T,
  spec: StillSlotSpec,
  url: string,
  options?: AssignStillOptions
): T {
  if (!isUsableMediaUrl(url) && !options?.restoreVersionId) return row

  let versions = backfillVersionsFromUrl(row[spec.versionsKey], row[spec.urlKey], {
    source: options?.source,
    prompt: options?.prompt,
  })

  if (options?.restoreVersionId) {
    const restore = versions.find((version) => version.id === options.restoreVersionId)
    if (!restore) return row
    return {
      ...row,
      [spec.urlKey]: restore.url,
      [spec.versionsKey]: versions,
      [spec.versionIdKey]: restore.id,
    }
  }

  const next = versionFromUrl(url, {
    source: options?.source ?? 'generate',
    prompt: options?.prompt,
    createdAt: options?.createdAt || new Date().toISOString(),
  })
  if (!next) return row
  versions = appendMediaVersion(versions, next)
  const current = versions.find((version) => version.url === next.url) ?? next
  return {
    ...row,
    [spec.urlKey]: current.url,
    [spec.versionsKey]: versions,
    [spec.versionIdKey]: current.id,
  }
}

export function mergeStillSlot(
  merged: Record<string, unknown>,
  incoming: Record<string, unknown> | undefined,
  canonical: Record<string, unknown> | undefined,
  spec: StillSlotSpec
): void {
  const inc = incoming ?? {}
  const can = canonical ?? {}
  const incomingListed = asMediaVersions(inc[spec.versionsKey])
  const canonicalListed = asMediaVersions(can[spec.versionsKey])
  const incomingVersions = backfillVersionsFromUrl(incomingListed, inc[spec.urlKey])
  const canonicalVersions = backfillVersionsFromUrl(canonicalListed, can[spec.urlKey])
  const versions = unionMediaVersions(incomingVersions, canonicalVersions)
  const currentUrl = pickCurrentMediaUrl(
    inc[spec.urlKey],
    can[spec.urlKey],
    incomingListed,
    canonicalListed
  )
  const current = resolveCurrentMedia(versions, currentUrl)

  if (currentUrl) merged[spec.urlKey] = currentUrl
  else delete merged[spec.urlKey]

  if (versions.length > 0) merged[spec.versionsKey] = versions
  else delete merged[spec.versionsKey]

  if (current?.id) merged[spec.versionIdKey] = current.id
  else if (typeof inc[spec.versionIdKey] === 'string') merged[spec.versionIdKey] = inc[spec.versionIdKey]
  else if (typeof can[spec.versionIdKey] === 'string') merged[spec.versionIdKey] = can[spec.versionIdKey]
  else delete merged[spec.versionIdKey]
}

/**
 * Union rejected still history into the newer script. Adopt the rejected
 * current when it is newer (ISO, then blob digits). Never drop either URL.
 */
export function salvageStillSlot(
  newer: Record<string, unknown>,
  stale: Record<string, unknown> | undefined,
  spec: StillSlotSpec,
  path: string,
  fields: string[]
): Record<string, unknown> {
  if (!stale) return newer

  const staleListed = asMediaVersions(stale[spec.versionsKey])
  const staleUrl = isUsableMediaUrl(stale[spec.urlKey]) ? stale[spec.urlKey].trim() : undefined
  if (!staleUrl && staleListed.length === 0) return newer

  const newerVersions = backfillVersionsFromUrl(newer[spec.versionsKey], newer[spec.urlKey])
  const staleVersions = backfillVersionsFromUrl(staleListed, staleUrl, {
    source: 'salvage',
  })
  const versions = unionMediaVersions(newerVersions, staleVersions)
  const newerUrl = isUsableMediaUrl(newer[spec.urlKey]) ? newer[spec.urlKey].trim() : undefined

  let currentUrl = newerUrl
  if (staleUrl) {
    if (!newerUrl) {
      currentUrl = staleUrl
    } else if (staleUrl !== newerUrl) {
      const staleAt = mediaRecencyMs(staleUrl, staleVersions)
      const newerAt = mediaRecencyMs(newerUrl, newerVersions)
      if (staleAt && (!newerAt || staleAt > newerAt)) currentUrl = staleUrl
    }
  }

  const current = resolveCurrentMedia(versions, currentUrl)
  const versionsChanged =
    versions.length !== newerVersions.length ||
    versions.some((version, index) => version.url !== newerVersions[index]?.url)
  const urlChanged = (currentUrl || undefined) !== (newerUrl || undefined)
  if (!versionsChanged && !urlChanged) return newer

  if (urlChanged) fields.push(`${path}.${spec.urlKey}`)
  else fields.push(`${path}.${spec.versionsKey}`)

  return {
    ...newer,
    ...(currentUrl ? { [spec.urlKey]: currentUrl } : {}),
    ...(versions.length > 0 ? { [spec.versionsKey]: versions } : {}),
    ...(current?.id ? { [spec.versionIdKey]: current.id } : {}),
  }
}

export function stillVersionsOnRow(
  row: Record<string, unknown> | undefined,
  spec: StillSlotSpec
): MediaVersion[] {
  if (!row) return []
  return backfillVersionsFromUrl(row[spec.versionsKey], row[spec.urlKey])
}

export function stillVersionCount(row: Record<string, unknown> | undefined, spec: StillSlotSpec): number {
  if (!row) return 0
  return backfillVersionsFromUrl(row[spec.versionsKey], row[spec.urlKey]).length
}

type IdentifiedRow = Record<string, unknown> & { id?: string }

function rowId(row: IdentifiedRow, idKey: string): string | undefined {
  const value = row[idKey]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function unionRowsById<T extends IdentifiedRow>(
  incoming: T[] | undefined,
  existing: T[] | undefined,
  idKey: string,
  mergeRow?: (incomingRow: T, existingRow: T) => T
): T[] {
  const incomingRows = Array.isArray(incoming) ? incoming : []
  const existingRows = Array.isArray(existing) ? existing : []
  if (incomingRows.length === 0) return existingRows
  if (existingRows.length === 0) return incomingRows

  const byId = new Map<string, T>()
  const order: string[] = []
  const remember = (row: T) => {
    const id = rowId(row, idKey)
    if (!id) return
    if (!byId.has(id)) order.push(id)
    const prev = byId.get(id)
    byId.set(id, prev && mergeRow ? mergeRow(row, prev) : row)
  }

  existingRows.forEach(remember)
  incomingRows.forEach(remember)

  const unnamed = [
    ...existingRows.filter((row) => !rowId(row, idKey)),
    ...incomingRows.filter((row) => !rowId(row, idKey)),
  ]
  return [...order.map((id) => byId.get(id)!), ...unnamed]
}

export function resolveCurrentTakeId(
  takes: Array<{ id?: string; status?: string; createdAt?: string }> | undefined,
  currentTakeId?: string | null,
  activeAssetUrl?: string | null
): string | undefined {
  const list = Array.isArray(takes) ? takes : []
  if (currentTakeId && list.some((take) => take.id === currentTakeId)) return currentTakeId
  if (activeAssetUrl) {
    const byUrl = list.find(
      (take) =>
        (take as { assetUrl?: string; videoUrl?: string }).assetUrl === activeAssetUrl ||
        (take as { videoUrl?: string }).videoUrl === activeAssetUrl
    )
    if (byUrl?.id) return byUrl.id
  }
  const complete = list.filter((take) => take.status === 'COMPLETE' || take.status === 'done')
  const pool = complete.length > 0 ? complete : list
  const latest = [...pool].sort(
    (a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')
  )[0]
  return latest?.id
}

/** A stored beat-video take the Videos tab can preview or restore. */
export interface PlayableTake {
  id: string
  url: string
  thumbnailUrl?: string
  createdAt: string
  status?: string
  durationSec?: number
  /** True when this row was inferred from activeAssetUrl and is not yet stored. */
  backfill?: boolean
}

export interface TakeRow {
  id?: string
  assetUrl?: string | null
  videoUrl?: string | null
  thumbnailUrl?: string
  createdAt?: string
  status?: string
  durationSec?: number
}

export interface VideoPointerSegment {
  status?: string
  assetType?: string | null
  activeAssetUrl?: string | null
  currentTakeId?: string
  actualVideoDuration?: number
  takes?: TakeRow[]
}

function isProbablyStillUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(url)
}

/** Non-still media URL. Extensionless blob paths count so stored clips stay recoverable. */
export function isVideoLikeUrl(url: string): boolean {
  if (!isUsableMediaUrl(url)) return false
  return !isProbablyStillUrl(url.trim())
}

function takeTime(take: { createdAt?: string }): number {
  const parsed = Date.parse(take.createdAt || '')
  return Number.isFinite(parsed) ? parsed : 0
}

function backfillTakeId(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0
  }
  return `backfill_${(hash >>> 0).toString(36)}`
}

/** COMPLETE, uploaded, or legacy `done`. Missing status still counts as a stored clip. */
export function isStoredTakeComplete(status?: string): boolean {
  if (!status) return true
  return status === 'COMPLETE' || status === 'UPLOADED' || status === 'done'
}

/** Prefer an explicit video URL, then a non-still asset URL. */
export function takeMediaUrl(
  take: { assetUrl?: string | null; videoUrl?: string | null } | null | undefined
): string | undefined {
  if (!take) return undefined
  const video = typeof take.videoUrl === 'string' ? take.videoUrl.trim() : ''
  if (isVideoLikeUrl(video)) return video
  const asset = typeof take.assetUrl === 'string' ? take.assetUrl.trim() : ''
  if (isVideoLikeUrl(asset)) return asset
  return undefined
}

/**
 * Playable takes in stored order, plus one backfill when activeAssetUrl is a
 * video that is not already in the list. Does not trim history.
 */
export function listPlayableTakes(
  takes: TakeRow[] | undefined,
  activeAssetUrl?: string | null
): PlayableTake[] {
  const rows = Array.isArray(takes) ? takes : []
  const listed: PlayableTake[] = []
  const seenUrls = new Set<string>()
  for (const row of rows) {
    const url = takeMediaUrl(row)
    if (!url || seenUrls.has(url)) continue
    seenUrls.add(url)
    const thumbnail = typeof row.thumbnailUrl === 'string' ? row.thumbnailUrl.trim() : ''
    listed.push({
      id: row.id?.trim() || backfillTakeId(url),
      url,
      createdAt: row.createdAt?.trim() || new Date(0).toISOString(),
      ...(thumbnail && isUsableMediaUrl(thumbnail) ? { thumbnailUrl: thumbnail } : {}),
      ...(row.status ? { status: row.status } : {}),
      ...(typeof row.durationSec === 'number' ? { durationSec: row.durationSec } : {}),
    })
  }

  const active = typeof activeAssetUrl === 'string' ? activeAssetUrl.trim() : ''
  if (isVideoLikeUrl(active) && !seenUrls.has(active)) {
    const blobTs = mediaBlobUrlTimestamp(active)
    listed.push({
      id: backfillTakeId(active),
      url: active,
      createdAt: blobTs ? new Date(blobTs).toISOString() : new Date(0).toISOString(),
      status: 'COMPLETE',
      backfill: true,
    })
  }
  return listed
}

/**
 * Live clip: currentTakeId, else the active URL, else the latest stored take.
 * Complete takes win over in-progress rows when no pointer matches.
 */
export function resolveLiveTake(
  takes: TakeRow[] | undefined,
  currentTakeId?: string | null,
  activeAssetUrl?: string | null
): PlayableTake | undefined {
  const listed = listPlayableTakes(takes, activeAssetUrl)
  if (listed.length === 0) return undefined
  if (currentTakeId) {
    const byId = listed.find((take) => take.id === currentTakeId)
    if (byId) return byId
  }
  const active = typeof activeAssetUrl === 'string' ? activeAssetUrl.trim() : ''
  if (active) {
    const byUrl = listed.find((take) => take.url === active)
    if (byUrl) return byUrl
  }
  const complete = listed.filter((take) => isStoredTakeComplete(take.status))
  const pool = complete.length > 0 ? complete : listed
  return [...pool].sort((a, b) => takeTime(b) - takeTime(a))[0]
}

function resolveHealTake(
  takes: TakeRow[] | undefined,
  currentTakeId?: string | null
): PlayableTake | undefined {
  const complete = listPlayableTakes(takes, undefined).filter(
    (take) => !take.backfill && isStoredTakeComplete(take.status)
  )
  if (complete.length === 0) return undefined
  if (currentTakeId) {
    const byId = complete.find((take) => take.id === currentTakeId)
    if (byId) return byId
  }
  return [...complete].sort((a, b) => takeTime(b) - takeTime(a))[0]
}

/** True when the segment already points at a video or still has a stored take URL. */
export function segmentHasPlayableVideo(segment: VideoPointerSegment | null | undefined): boolean {
  if (!segment) return false
  const url = typeof segment.activeAssetUrl === 'string' ? segment.activeAssetUrl.trim() : ''
  if (url && (segment.assetType === 'video' || isVideoLikeUrl(url))) return true
  return listPlayableTakes(segment.takes, undefined).length > 0
}

/**
 * Queue status for the Videos tab. A stored take or video URL is complete even
 * when segment.status was cleared. In-progress generation stays rendering.
 */
export function deriveClipQueueStatus(
  segment: VideoPointerSegment,
  approvalStatus?: string
): 'complete' | 'rendering' | 'error' | 'queued' {
  if (segment.status === 'GENERATING') return 'rendering'
  if (segmentHasPlayableVideo(segment)) return 'complete'
  if (segment.status === 'COMPLETE' && segment.activeAssetUrl?.trim()) return 'complete'
  if (approvalStatus === 'rendered') return 'complete'
  if (segment.status === 'ERROR') return 'error'
  return 'queued'
}

/**
 * Fill a missing activeAssetUrl from a stored complete take.
 * Leaves a different existing URL alone, including a non-video pointer.
 */
export function healMissingVideoPointer<T extends VideoPointerSegment>(segment: T): T {
  if (segment.status === 'GENERATING') return segment
  const current = typeof segment.activeAssetUrl === 'string' ? segment.activeAssetUrl.trim() : ''
  if (current) return segment
  const live = resolveHealTake(segment.takes, segment.currentTakeId)
  if (!live) return segment
  return {
    ...segment,
    activeAssetUrl: live.url,
    currentTakeId: live.id,
    assetType: 'video',
    status: 'COMPLETE',
    ...(typeof live.durationSec === 'number' ? { actualVideoDuration: live.durationSec } : {}),
  }
}

/** Prepend a take and keep the newest MEDIA_VERSION_CAP rows. */
export function appendSegmentTake<T extends { id?: string }>(takes: T[] | undefined, next: T): T[] {
  const existing = Array.isArray(takes) ? takes : []
  const nextId = typeof next.id === 'string' ? next.id.trim() : ''
  const rest = nextId ? existing.filter((row) => row.id !== nextId) : existing
  const combined = [next, ...rest]
  if (combined.length <= MEDIA_VERSION_CAP) return combined
  return combined.slice(0, MEDIA_VERSION_CAP)
}

/** Point the segment at a stored or backfilled take and persist that row. */
export function applyVideoTakeSelection<T extends VideoPointerSegment>(segment: T, takeId: string): T {
  const selected = listPlayableTakes(segment.takes, segment.activeAssetUrl).find(
    (take) => take.id === takeId
  )
  if (selected) {
    let takes = segment.takes ?? []
    const stored = takes.some((row) => row.id === selected.id || takeMediaUrl(row) === selected.url)
    if (!stored) {
      takes = appendSegmentTake(takes, {
        id: selected.id,
        createdAt: selected.createdAt,
        assetUrl: selected.url,
        status: 'COMPLETE',
        ...(selected.thumbnailUrl ? { thumbnailUrl: selected.thumbnailUrl } : {}),
        ...(selected.durationSec != null ? { durationSec: selected.durationSec } : {}),
      })
    }
    return {
      ...segment,
      takes,
      currentTakeId: selected.id,
      activeAssetUrl: selected.url,
      assetType: 'video',
      status: 'COMPLETE',
      ...(selected.durationSec != null ? { actualVideoDuration: selected.durationSec } : {}),
    }
  }

  const raw = (segment.takes ?? []).find((row) => row.id === takeId)
  const rawUrl =
    (typeof raw?.assetUrl === 'string' && raw.assetUrl.trim()) ||
    (typeof raw?.videoUrl === 'string' && raw.videoUrl.trim()) ||
    ''
  if (!isUsableMediaUrl(rawUrl)) return segment
  return {
    ...segment,
    currentTakeId: takeId,
    activeAssetUrl: rawUrl,
  }
}
