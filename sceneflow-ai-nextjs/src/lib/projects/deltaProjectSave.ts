/**
 * Delta Project Persistence utilities.
 *
 * Prevents resaving the entire multi-megabyte `project.metadata` blob (24+ scenes,
 * hundreds of beat frames, production takes, characters, references) on every edit:
 *
 * 1. Publishing & Streams delta PATCH (`PublishingMetadataPatch` -> `PATCH /api/projects/[id]/production`):
 *    Sends only `{ publishing, streams, exportedVideoUrl, exportedAnimaticUrl }` (~2–10 KB)
 *    instead of a 10+ MB full-project `PUT` that triggers HTTP 413 on Vercel Functions.
 *
 * 2. Dirty-Scene & Vision Slice Delta Tracking (`ProjectSaveBaselineSnapshot`):
 *    Fingerprints each scene by ID plus top-level / `visionPhase` slices when loaded from
 *    the server and after each successful save. Any subsequent `serializedProjectSave`
 *    automatically strips unchanged scenes and unchanged sibling slices, sending ONLY
 *    the modified scenes (`partialSceneBatch: true` + `sceneOrderIds`) and peeling off
 *    `persistProduction` updates into per-scene `PATCH /api/projects/[id]/production` calls.
 */

import {
  replaceScriptScenes,
  sceneIdentity,
  scriptScenes,
} from '@/lib/projects/refreshQueuedScriptPut'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import type { ProjectPublishingState } from '@/types/publishingAssets'

export interface PublishingMetadataPatch {
  publishing?: ProjectPublishingState
  streams?: ProjectStream[]
  exportedVideoUrl?: string
  exportedAnimaticUrl?: string
}

export interface ChangedProductionSceneEntry {
  sceneId: string
  productionData: Record<string, unknown>
}

export interface ProjectSaveBaselineSnapshot {
  initialized: boolean
  sceneOrderIds: string[]
  sceneDigestsById: Map<string, string>
  visionKeyDigests: Map<string, string>
  topMetadataKeyDigests: Map<string, string>
  productionSceneDigests: Map<string, string>
}

export interface DiffProjectPutResult {
  body: Record<string, any>
  noOp: boolean
  changedProductionScenes: ChangedProductionSceneEntry[]
  dirtySceneIds: string[]
  omittedUnchangedScenes: number
}

const VISION_SCRIPT_KEYS = new Set(['script', 'scenes', 'scriptUpdatedAt', 'production'])
const DEDICATED_METADATA_KEYS = new Set([
  'visionPhase',
  'finalCut',
  'storyboardShareLink',
  'screeningRoomShareLink',
  'storyboardRevision',
])

/**
 * Deterministic dual-pass FNV-1a fingerprint with byte length prefix.
 * Avoids keeping multi-MB serialized JSON strings in memory while remaining collision-safe.
 */
export function fastJsonFingerprint(value: unknown): string {
  if (value === undefined) return 'undef'
  let json: string
  try {
    json = JSON.stringify(value)
  } catch {
    return 'unserializable'
  }
  if (typeof json !== 'string') return 'undef'

  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5
  const len = json.length
  for (let i = 0; i < len; i++) {
    const c1 = json.charCodeAt(i)
    h1 ^= c1
    h1 = Math.imul(h1, 0x01000193) >>> 0

    const c2 = json.charCodeAt(len - 1 - i)
    h2 ^= c2
    h2 = Math.imul(h2, 0x01000193) >>> 0
  }
  return `${len}:${h1.toString(36)}:${h2.toString(36)}`
}

export function resolveStableSceneId(scene: unknown, fallbackIndex?: number): string | undefined {
  if (!scene || typeof scene !== 'object') return undefined
  const explicit = sceneIdentity(scene as { id?: unknown; sceneId?: unknown })
  if (explicit) return explicit
  const num = (scene as { sceneNumber?: unknown }).sceneNumber
  if (typeof num === 'number' && Number.isFinite(num)) {
    return `scene-${num}`
  }
  if (typeof fallbackIndex === 'number') {
    return `scene-${fallbackIndex + 1}`
  }
  return undefined
}

export function ensureSceneHasId<T>(scene: T, fallbackIndex?: number): T {
  if (!scene || typeof scene !== 'object') return scene
  const rec = scene as Record<string, unknown>
  if (rec.id || rec.sceneId) return scene
  const fallback = resolveStableSceneId(scene, fallbackIndex)
  if (!fallback) return scene
  return {
    ...rec,
    id: fallback,
    sceneId: fallback,
  } as T
}

export function createEmptySaveBaselineSnapshot(): ProjectSaveBaselineSnapshot {
  return {
    initialized: false,
    sceneOrderIds: [],
    sceneDigestsById: new Map(),
    visionKeyDigests: new Map(),
    topMetadataKeyDigests: new Map(),
    productionSceneDigests: new Map(),
  }
}

export function captureSaveBaselineFromMetadata(
  metadata: Record<string, any> | null | undefined,
  productionOverride?: Record<string, any> | null
): ProjectSaveBaselineSnapshot {
  const snapshot = createEmptySaveBaselineSnapshot()
  if (!metadata || typeof metadata !== 'object') return snapshot

  snapshot.initialized = true

  for (const [key, val] of Object.entries(metadata)) {
    if (DEDICATED_METADATA_KEYS.has(key)) continue
    snapshot.topMetadataKeyDigests.set(key, fastJsonFingerprint(val))
  }

  const vision = metadata.visionPhase
  if (vision && typeof vision === 'object') {
    for (const [key, val] of Object.entries(vision)) {
      if (VISION_SCRIPT_KEYS.has(key)) continue
      snapshot.visionKeyDigests.set(key, fastJsonFingerprint(val))
    }

    const rawScenes = scriptScenes(vision.script) ?? (Array.isArray(vision.scenes) ? vision.scenes : [])
    if (Array.isArray(rawScenes)) {
      const orderIds: string[] = []
      for (let i = 0; i < rawScenes.length; i++) {
        const scene = rawScenes[i]
        const id = resolveStableSceneId(scene, i)
        if (!id) continue
        orderIds.push(id)
        snapshot.sceneDigestsById.set(id, fastJsonFingerprint(ensureSceneHasId(scene, i)))
      }
      snapshot.sceneOrderIds = orderIds
    }

    const prodScenes =
      (productionOverride && typeof productionOverride === 'object'
        ? productionOverride.scenes
        : vision.production?.scenes) || {}
    if (prodScenes && typeof prodScenes === 'object') {
      for (const [sceneId, sceneProd] of Object.entries(prodScenes)) {
        if (!sceneId || !sceneProd || typeof sceneProd !== 'object') continue
        snapshot.productionSceneDigests.set(sceneId, fastJsonFingerprint(sceneProd))
      }
    }
  }

  return snapshot
}

export function updateBaselineProductionScenes(
  baseline: ProjectSaveBaselineSnapshot,
  production: Record<string, any> | null | undefined
): void {
  const scenes = production?.scenes
  if (!scenes || typeof scenes !== 'object') return
  for (const [sceneId, sceneProd] of Object.entries(scenes)) {
    if (!sceneId || !sceneProd || typeof sceneProd !== 'object') continue
    baseline.productionSceneDigests.set(sceneId, fastJsonFingerprint(sceneProd))
  }
}

/**
 * Advance baseline digests after a PUT (or batch of PUTs) has succeeded on the server.
 */
export function advanceSaveBaselineAfterPut(
  baseline: ProjectSaveBaselineSnapshot,
  sentBody: Record<string, any>,
  fullScenesAfterSave?: unknown[]
): void {
  const metadata = sentBody?.metadata
  if (!metadata || typeof metadata !== 'object') return

  baseline.initialized = true

  for (const [key, val] of Object.entries(metadata)) {
    if (DEDICATED_METADATA_KEYS.has(key)) continue
    baseline.topMetadataKeyDigests.set(key, fastJsonFingerprint(val))
  }

  const vision = metadata.visionPhase
  if (!vision || typeof vision !== 'object') return

  for (const [key, val] of Object.entries(vision)) {
    if (VISION_SCRIPT_KEYS.has(key)) continue
    baseline.visionKeyDigests.set(key, fastJsonFingerprint(val))
  }

  const sentScenes = scriptScenes(vision.script)
  if (Array.isArray(sentScenes)) {
    for (let i = 0; i < sentScenes.length; i++) {
      const scene = sentScenes[i]
      const id = resolveStableSceneId(scene)
      if (!id) continue
      baseline.sceneDigestsById.set(id, fastJsonFingerprint(ensureSceneHasId(scene)))
    }
  }

  if (Array.isArray(fullScenesAfterSave) && fullScenesAfterSave.length > 0) {
    const nextOrder: string[] = []
    for (let i = 0; i < fullScenesAfterSave.length; i++) {
      const id = resolveStableSceneId(fullScenesAfterSave[i], i)
      if (id) nextOrder.push(id)
    }
    if (nextOrder.length === fullScenesAfterSave.length) {
      baseline.sceneOrderIds = nextOrder
      const activeSet = new Set(nextOrder)
      for (const existingId of Array.from(baseline.sceneDigestsById.keys())) {
        if (!activeSet.has(existingId)) {
          baseline.sceneDigestsById.delete(existingId)
        }
      }
    }
  } else if (Array.isArray(sentBody.sceneOrderIds) && sentBody.sceneOrderIds.length > 0) {
    baseline.sceneOrderIds = [...sentBody.sceneOrderIds]
    const activeSet = new Set(baseline.sceneOrderIds)
    for (const existingId of Array.from(baseline.sceneDigestsById.keys())) {
      if (!activeSet.has(existingId)) {
        baseline.sceneDigestsById.delete(existingId)
      }
    }
  } else if (!sentBody.partialSceneBatch && Array.isArray(sentScenes) && sentScenes.length > 0) {
    const nextOrder = sentScenes
      .map((s, idx) => resolveStableSceneId(s, idx))
      .filter((id): id is string => Boolean(id))
    if (nextOrder.length === sentScenes.length) {
      baseline.sceneOrderIds = nextOrder
    }
  }
}

/**
 * Diff an outgoing project PUT payload against the last-saved server baseline:
 * 1. Peels off `persistProduction: true` into per-scene `changedProductionScenes` (so `production`
 *    never inflates a `PUT /api/projects/[id]` over Vercel's 4.5MB limit).
 * 2. Strips unchanged top-level `metadata` and `visionPhase` sibling keys.
 * 3. Scopes `visionPhase.script` down to ONLY dirty scenes (`partialSceneBatch: true` + `sceneOrderIds`),
 *    or removes `script` entirely when 0 scenes changed.
 */
export function diffProjectPutAgainstBaseline(
  rawBody: Record<string, any>,
  baseline: ProjectSaveBaselineSnapshot
): DiffProjectPutResult {
  if (!rawBody || typeof rawBody !== 'object') {
    return {
      body: rawBody,
      noOp: false,
      changedProductionScenes: [],
      dirtySceneIds: [],
      omittedUnchangedScenes: 0,
    }
  }

  const changedProductionScenes: ChangedProductionSceneEntry[] = []
  let body: Record<string, any> = { ...rawBody }

  // 1. Always peel `persistProduction` out of the PUT body into per-scene PATCH updates
  if (body.persistProduction) {
    delete body.persistProduction
    const prodScenes = body.metadata?.visionPhase?.production?.scenes
    if (prodScenes && typeof prodScenes === 'object') {
      for (const [sceneId, sceneProd] of Object.entries(prodScenes)) {
        if (!sceneId || !sceneProd || typeof sceneProd !== 'object') continue
        const nextDigest = fastJsonFingerprint(sceneProd)
        const prevDigest = baseline.productionSceneDigests.get(sceneId)
        if (!baseline.initialized || prevDigest !== nextDigest) {
          changedProductionScenes.push({
            sceneId,
            productionData: sceneProd as Record<string, unknown>,
          })
        }
      }
    }
    if (body.metadata?.visionPhase && 'production' in body.metadata.visionPhase) {
      const { production: _prod, ...restVision } = body.metadata.visionPhase
      body = {
        ...body,
        metadata: {
          ...body.metadata,
          visionPhase: restVision,
        },
      }
    }
  }

  if (!baseline.initialized) {
    return {
      body,
      noOp: false,
      changedProductionScenes,
      dirtySceneIds: [],
      omittedUnchangedScenes: 0,
    }
  }

  // Do not delta-strip intentional full-script clears or confirmed replacements
  if (body.confirmScriptReplace === true || body.metadata?.visionPhase?.script === null) {
    return {
      body,
      noOp: false,
      changedProductionScenes,
      dirtySceneIds: [],
      omittedUnchangedScenes: 0,
    }
  }

  const metadata = body.metadata
  if (!metadata || typeof metadata !== 'object') {
    return {
      body,
      noOp: false,
      changedProductionScenes,
      dirtySceneIds: [],
      omittedUnchangedScenes: 0,
    }
  }

  const nextMetadata: Record<string, any> = {}
  let hasChangedTopMetadata = false

  for (const [key, val] of Object.entries(metadata)) {
    if (key === 'visionPhase') continue
    if (DEDICATED_METADATA_KEYS.has(key)) continue
    const digest = fastJsonFingerprint(val)
    if (baseline.topMetadataKeyDigests.get(key) !== digest) {
      nextMetadata[key] = val
      hasChangedTopMetadata = true
    }
  }

  const vision = metadata.visionPhase
  let dirtySceneIds: string[] = []
  let omittedUnchangedScenes = 0

  if (vision && typeof vision === 'object') {
    const nextVision: Record<string, any> = {}
    let hasChangedVisionSibling = false

    for (const [key, val] of Object.entries(vision)) {
      if (VISION_SCRIPT_KEYS.has(key)) continue
      const digest = fastJsonFingerprint(val)
      if (baseline.visionKeyDigests.get(key) !== digest) {
        nextVision[key] = val
        hasChangedVisionSibling = true
      }
    }

    const incomingRawScenes = scriptScenes(vision.script)
    let includeScript = false
    let partialSceneBatch = Boolean(body.partialSceneBatch)
    let sceneOrderIds: string[] | undefined = Array.isArray(body.sceneOrderIds)
      ? body.sceneOrderIds
      : undefined
    let deletedSceneIds: string[] | undefined = Array.isArray(body.deletedSceneIds)
      ? [...body.deletedSceneIds]
      : undefined

    if (Array.isArray(incomingRawScenes) && incomingRawScenes.length > 0) {
      const normalizedScenes = incomingRawScenes.map((s, idx) =>
        partialSceneBatch ? ensureSceneHasId(s) : ensureSceneHasId(s, idx)
      )
      const allHaveIds = normalizedScenes.every((s) => Boolean(resolveStableSceneId(s)))

      if (!allHaveIds || baseline.sceneOrderIds.length === 0) {
        nextVision.script = replaceScriptScenes(vision.script, normalizedScenes)
        if (vision.scriptUpdatedAt) nextVision.scriptUpdatedAt = vision.scriptUpdatedAt
        includeScript = true
      } else {
        const dirtyScenes: any[] = []
        const incomingIds: string[] = []

        for (const scene of normalizedScenes) {
          const id = resolveStableSceneId(scene)!
          incomingIds.push(id)
          const digest = fastJsonFingerprint(scene)
          if (baseline.sceneDigestsById.get(id) !== digest) {
            dirtyScenes.push(scene)
            dirtySceneIds.push(id)
          }
        }

        const incomingIdSet = new Set(incomingIds)
        const implicitDeletes = partialSceneBatch
          ? []
          : baseline.sceneOrderIds.filter((id) => !incomingIdSet.has(id))
        const orderChanged =
          !partialSceneBatch &&
          (incomingIds.length !== baseline.sceneOrderIds.length ||
            incomingIds.some((id, idx) => id !== baseline.sceneOrderIds[idx]))

        if (dirtyScenes.length === 0 && !orderChanged && implicitDeletes.length === 0) {
          // 0 scenes changed and order is identical — drop script completely!
          omittedUnchangedScenes = normalizedScenes.length
          includeScript = false
        } else if (dirtyScenes.length === normalizedScenes.length && !partialSceneBatch) {
          // Every scene changed — keep full script (will scene-batch if > 4.25MB)
          nextVision.script = replaceScriptScenes(vision.script, normalizedScenes)
          nextVision.scriptUpdatedAt = vision.scriptUpdatedAt || new Date().toISOString()
          includeScript = true
          if (implicitDeletes.length > 0) {
            deletedSceneIds = Array.from(new Set([...(deletedSceneIds || []), ...implicitDeletes]))
          }
        } else {
          // Only a subset of scenes changed (or order/deletes occurred with 0+ dirty scenes)!
          // If 0 content changes but scenes were reordered/deleted, send 1 anchor scene so
          // mergeSceneArraysForPersistence runs with `deletedSceneIds` + `sceneOrderIds`.
          const scenesToSend = dirtyScenes.length > 0 ? dirtyScenes : [normalizedScenes[0]]
          omittedUnchangedScenes = Math.max(0, normalizedScenes.length - scenesToSend.length)
          nextVision.script = replaceScriptScenes(vision.script, scenesToSend)
          nextVision.scriptUpdatedAt = vision.scriptUpdatedAt || new Date().toISOString()
          partialSceneBatch = true
          includeScript = true
          if (!body.partialSceneBatch && orderChanged) {
            sceneOrderIds = incomingIds
          }
          if (implicitDeletes.length > 0) {
            deletedSceneIds = Array.from(new Set([...(deletedSceneIds || []), ...implicitDeletes]))
          }
        }
      }
    } else if ('script' in vision && vision.script !== undefined) {
      nextVision.script = vision.script
      if (vision.scriptUpdatedAt) nextVision.scriptUpdatedAt = vision.scriptUpdatedAt
      includeScript = true
    }

    if (hasChangedVisionSibling || includeScript) {
      nextMetadata.visionPhase = nextVision
    }

    const nextBody: Record<string, any> = { ...body }
    delete nextBody.metadata
    if (partialSceneBatch) nextBody.partialSceneBatch = true
    if (sceneOrderIds && sceneOrderIds.length > 0) nextBody.sceneOrderIds = sceneOrderIds
    if (deletedSceneIds && deletedSceneIds.length > 0) nextBody.deletedSceneIds = deletedSceneIds

    const hasOtherTopLevelBodyFields = Object.keys(nextBody).some(
      (k) => k !== 'partialSceneBatch' && k !== 'sceneOrderIds' && k !== 'deletedSceneIds'
    )

    if (!hasChangedTopMetadata && !hasChangedVisionSibling && !includeScript) {
      if (!hasOtherTopLevelBodyFields) {
        return {
          body: nextBody,
          noOp: true,
          changedProductionScenes,
          dirtySceneIds,
          omittedUnchangedScenes,
        }
      }
      return {
        body: nextBody,
        noOp: false,
        changedProductionScenes,
        dirtySceneIds,
        omittedUnchangedScenes,
      }
    }

    return {
      body: {
        ...nextBody,
        metadata: nextMetadata,
      },
      noOp: false,
      changedProductionScenes,
      dirtySceneIds,
      omittedUnchangedScenes,
    }
  }

  const { metadata: _oldMeta, ...restBody } = body
  const hasOtherTopLevelBodyFields = Object.keys(restBody).length > 0
  if (!hasChangedTopMetadata && !hasOtherTopLevelBodyFields) {
    return {
      body: restBody,
      noOp: true,
      changedProductionScenes,
      dirtySceneIds,
      omittedUnchangedScenes,
    }
  }

  return {
    body: hasChangedTopMetadata ? { ...restBody, metadata: nextMetadata } : restBody,
    noOp: false,
    changedProductionScenes,
    dirtySceneIds,
    omittedUnchangedScenes,
  }
}

/**
 * Extract ONLY the publishing & streams slice from an updated metadata object.
 */
export function extractPublishingMetadataPatch(
  metadata: Record<string, unknown>
): PublishingMetadataPatch {
  const visionPhase = (metadata.visionPhase as Record<string, unknown> | undefined) || {}
  const publishing = visionPhase.publishing as ProjectPublishingState | undefined
  const streams = (visionPhase.streams as ProjectStream[] | undefined) ?? publishing?.streams
  const exportedVideoUrl =
    typeof metadata.exportedVideoUrl === 'string' && metadata.exportedVideoUrl.trim()
      ? metadata.exportedVideoUrl.trim()
      : undefined
  const exportedAnimaticUrl =
    typeof metadata.exportedAnimaticUrl === 'string' && metadata.exportedAnimaticUrl.trim()
      ? metadata.exportedAnimaticUrl.trim()
      : undefined

  return {
    ...(publishing ? { publishing } : {}),
    ...(Array.isArray(streams) ? { streams } : {}),
    ...(exportedVideoUrl ? { exportedVideoUrl } : {}),
    ...(exportedAnimaticUrl ? { exportedAnimaticUrl } : {}),
  }
}

/**
 * Atomically merge a `PublishingMetadataPatch` onto stored `project.metadata` on the server
 * without touching `script`, `scenes`, `production`, `characters`, or `references`.
 */
export function mergePublishingMetadataPatch(
  existingMetadata: Record<string, any> | null | undefined,
  patch: PublishingMetadataPatch
): Record<string, any> {
  const baseMeta = existingMetadata && typeof existingMetadata === 'object' ? existingMetadata : {}
  const baseVision =
    baseMeta.visionPhase && typeof baseMeta.visionPhase === 'object' ? baseMeta.visionPhase : {}
  const basePub =
    baseVision.publishing && typeof baseVision.publishing === 'object'
      ? (baseVision.publishing as ProjectPublishingState)
      : ({ streams: [], youtubeByLanguage: {} } as ProjectPublishingState)

  const incomingPub = patch.publishing
  const mergedStreams =
    patch.streams ?? incomingPub?.streams ?? basePub.streams ?? (baseVision.streams as any[]) ?? []

  const mergedPublishing: ProjectPublishingState = {
    ...basePub,
    ...(incomingPub || {}),
    streams: mergedStreams as any,
    promo: incomingPub?.promo !== undefined ? incomingPub.promo : basePub.promo,
    previsByLanguage:
      incomingPub?.previsByLanguage || basePub.previsByLanguage
        ? {
            ...(basePub.previsByLanguage || {}),
            ...(incomingPub?.previsByLanguage || {}),
          }
        : undefined,
    youtubeByLanguage: {
      ...(basePub.youtubeByLanguage || {}),
      ...(incomingPub?.youtubeByLanguage || {}),
    },
    units: incomingPub?.units !== undefined ? incomingPub.units : basePub.units,
    readiness: incomingPub?.readiness !== undefined ? incomingPub.readiness : basePub.readiness,
  }

  return {
    ...baseMeta,
    ...(patch.exportedVideoUrl ? { exportedVideoUrl: patch.exportedVideoUrl } : {}),
    ...(patch.exportedAnimaticUrl ? { exportedAnimaticUrl: patch.exportedAnimaticUrl } : {}),
    visionPhase: {
      ...baseVision,
      streams: mergedStreams,
      publishing: mergedPublishing,
    },
  }
}

/**
 * Persist ONLY publishing & stream changes via lightweight `PATCH /api/projects/[id]/production`
 * (~2–10 KB instead of 10+ MB full-project PUT).
 */
export async function persistPublishingMetadataPatch(
  projectId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const publishingPatch = extractPublishingMetadataPatch(metadata)
  const response = await fetch(`/api/projects/${projectId}/production`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publishingPatch }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error || `Failed to save publishing metadata (${response.status})`)
  }
}
