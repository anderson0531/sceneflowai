/**
 * Rebuild a script PUT immediately before it goes on the wire.
 *
 * `handleScriptChange` stamps `scriptUpdatedAt` when the save is enqueued.
 * If that PUT waits behind another write, a 20s-old snapshot + timestamp is
 * what the timestamp guard sees. Replacing the script from the live ref and
 * minting a fresh timestamp at send time is what keeps a dialogue edit from
 * looking stale.
 *
 * Live text wins, but still history is adopted from the queued body so a
 * generate that updated React state (and the queued payload) is not dropped
 * when `scriptRef` is still the pre-generate snapshot.
 */

import { mergeScenePreservingMedia } from '@/lib/storyboard/mergeSceneMedia'
import { salvageStaleWriteMedia } from '@/lib/storyboard/staleWriteSalvage'

export type RefreshQueuedScriptPutOptions = {
  liveScript?: unknown
  nowIso?: string
  /** Replace `visionPhase.script` with `liveScript`. Default: true when liveScript is set. */
  replaceScript?: boolean
  /**
   * When set, keep only these scene ids after the live merge so a one-scene
   * persist cannot re-inflate to the full script (Vercel 413).
   */
  persistSceneIds?: string[]
}

type VisionPhaseBody = {
  metadata?: {
    visionPhase?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function scriptScenes(script: unknown): any[] | undefined {
  if (!script || typeof script !== 'object') return undefined
  const root = script as { script?: { scenes?: unknown }; scenes?: unknown }
  if (Array.isArray(root.script?.scenes)) return root.script.scenes
  if (Array.isArray(root.scenes)) return root.scenes
  return undefined
}

export function replaceScriptScenes(script: unknown, scenes: any[]): unknown {
  if (!script || typeof script !== 'object') {
    return { script: { scenes } }
  }
  const root = script as Record<string, unknown>
  if (root.script && typeof root.script === 'object') {
    return {
      ...root,
      script: {
        ...(root.script as Record<string, unknown>),
        scenes,
      },
    }
  }
  return { ...root, scenes }
}

export function sceneIdentity(scene: { id?: unknown; sceneId?: unknown }): string | undefined {
  const id = scene.id || scene.sceneId
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}

/**
 * Callers copy the scene array and replace one index. Send only those new
 * object identities. Length changes and bulk `.map()` rebuilds still send all.
 */
export function scenesToPersistForScriptPut(
  previous: unknown[] | undefined,
  next: unknown[]
): unknown[] {
  if (!Array.isArray(previous) || previous.length !== next.length || next.length === 0) {
    return next
  }
  const changed = next.filter((scene, index) => scene !== previous[index])
  if (changed.length === 0 || changed.length === next.length) return next
  return changed
}

export function persistSceneIdsForChangedScenes(
  previousScenes: unknown[] | undefined,
  nextScenes: unknown[]
): { scenes: unknown[]; persistSceneIds?: string[] } {
  const scenes = scenesToPersistForScriptPut(previousScenes, nextScenes)
  if (scenes === nextScenes) return { scenes: nextScenes }
  const persistSceneIds: string[] = []
  for (const scene of scenes) {
    if (!scene || typeof scene !== 'object') return { scenes: nextScenes }
    const id = sceneIdentity(scene as { id?: unknown; sceneId?: unknown })
    if (!id) return { scenes: nextScenes }
    persistSceneIds.push(id)
  }
  return { scenes, persistSceneIds }
}

export function scopeScriptPutToSceneIds<T extends VisionPhaseBody>(
  body: T,
  sceneIds: string[] | undefined
): T {
  if (!sceneIds || sceneIds.length === 0) return body
  if (!isScriptWriterPut(body)) return body
  const idSet = new Set(sceneIds)
  const vision = body.metadata!.visionPhase as Record<string, unknown>
  const scenes = scriptScenes(vision.script)
  if (!Array.isArray(scenes) || scenes.length === 0) return body

  const scoped = scenes.filter((scene) => {
    const id = sceneIdentity(scene)
    return Boolean(id && idSet.has(id))
  })
  if (scoped.length === 0 || scoped.length === scenes.length) return body

  return {
    ...body,
    metadata: {
      ...body.metadata,
      visionPhase: {
        ...vision,
        script: replaceScriptScenes(vision.script, scoped),
      },
    },
  }
}

/**
 * Overlay queued still history onto the live script's scene list.
 * Live scene order/membership wins (deletes stay deleted). Matching queued
 * scenes contribute version lists; salvage then points current at a newer
 * queued take when live still holds the original URL.
 */
export function mergeLiveScriptWithQueuedMedia(
  liveScript: unknown,
  queuedScript: unknown
): unknown {
  const liveScenes = scriptScenes(liveScript)
  const queuedScenes = scriptScenes(queuedScript)
  if (!Array.isArray(liveScenes) || liveScenes.length === 0) {
    return queuedScript ?? liveScript
  }
  if (!Array.isArray(queuedScenes) || queuedScenes.length === 0) {
    return liveScript
  }

  const queuedById = new Map<string, any>()
  for (const scene of queuedScenes) {
    const id = sceneIdentity(scene)
    if (id && !queuedById.has(id)) queuedById.set(id, scene)
  }

  const mergedScenes = liveScenes.map((liveScene, index) => {
    const liveId = sceneIdentity(liveScene)
    const queuedScene = liveId ? queuedById.get(liveId) : queuedScenes[index]
    if (!queuedScene) return liveScene
    const spread = {
      ...queuedScene,
      ...liveScene,
      sceneDirection: liveScene.sceneDirection || queuedScene.sceneDirection,
    }
    return mergeScenePreservingMedia(queuedScene, spread)
  })

  const salvaged = salvageStaleWriteMedia(mergedScenes, queuedScenes)
  return replaceScriptScenes(liveScript, salvaged.scenes)
}

export function isScriptWriterPut(body: unknown): body is VisionPhaseBody {
  if (!body || typeof body !== 'object') return false
  const metadata = (body as VisionPhaseBody).metadata
  const vision = metadata?.visionPhase
  if (!vision || typeof vision !== 'object') return false
  if (!('script' in vision) || vision.script == null) return false
  if (!('scriptUpdatedAt' in vision)) return false
  return true
}

export function refreshQueuedScriptPut<T extends Record<string, any>>(
  body: T,
  options: RefreshQueuedScriptPutOptions = {}
): T {
  if (!isScriptWriterPut(body)) return body

  const nowIso = options.nowIso ?? new Date().toISOString()
  const replaceScript =
    options.replaceScript !== false && options.liveScript != null
  const vision = body.metadata!.visionPhase as Record<string, unknown>
  const nextVision: Record<string, unknown> = {
    ...vision,
    scriptUpdatedAt: nowIso,
  }

  if (replaceScript) {
    nextVision.script = mergeLiveScriptWithQueuedMedia(options.liveScript, vision.script)
  }

  const refreshed = {
    ...body,
    metadata: {
      ...body.metadata,
      visionPhase: nextVision,
    },
  }

  return scopeScriptPutToSceneIds(refreshed, options.persistSceneIds)
}

export function putResponseIndicatesStaleScriptWrite(
  payload: unknown,
  sentScriptUpdatedAt?: string
): boolean {
  if (!payload || typeof payload !== 'object') return false
  const body = payload as {
    staleScriptWriteBlocked?: unknown
    project?: { metadata?: { visionPhase?: { scriptUpdatedAt?: unknown } } }
  }
  if (body.staleScriptWriteBlocked === true) return true
  if (!sentScriptUpdatedAt) return false
  const serverAt = body.project?.metadata?.visionPhase?.scriptUpdatedAt
  if (typeof serverAt !== 'string') return false
  const sent = new Date(sentScriptUpdatedAt).getTime()
  const server = new Date(serverAt).getTime()
  if (!Number.isFinite(sent) || !Number.isFinite(server)) return false
  return server > sent
}
