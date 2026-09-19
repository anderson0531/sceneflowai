import { MEDIA_VERSION_LIST_KEYS, stripBase64FromMetadata } from '@/lib/storage/mediaStorage'

/**
 * Drop the parts of a project PUT that have no business being re-sent.
 *
 * Vercel Functions reject a body over 4.5MB with 413, and the Vision page
 * persists the entire metadata blob on every script save. Two fields do most
 * of the damage:
 *
 * - `visionPhase.production` already has its own PATCH
 *   (`/api/projects/[id]/production`). Re-sending every take and asset URL
 *   alongside a beat-prompt refresh is what pushes a working project over
 *   the limit (production 2026-09-12, project 4a0457c8).
 * - `visionPhase.scenes` is a legacy mirror of `script.script.scenes`. The
 *   PUT rebuilds it from the canonical list, so the client copy is a second
 *   full script in the same body.
 *
 * Base64 data URIs are stripped as a last line of defence: they belong in
 * Blob, and a single wardrobe still stored inline is enough to 413 on its own.
 *
 * The PUT deep-merges `visionPhase`, so omitting a key leaves the stored
 * value in place. Callers that actually rewrote production (the segmented-
 * script migration) pass `persistProduction: true`.
 */
export const VERCEL_FUNCTION_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024
/** Leave room for the GET envelope (`success`, project fields, omitted flags). */
export const VERCEL_FUNCTION_RESPONSE_HEADROOM_BYTES = 100 * 1024
export const VERCEL_FUNCTION_RESPONSE_BUDGET_BYTES =
  VERCEL_FUNCTION_BODY_LIMIT_BYTES - VERCEL_FUNCTION_RESPONSE_HEADROOM_BYTES

export type ProjectResponseOmittedLayer =
  | 'versionPrompts'
  | 'versionArrays'
  | 'reviewHistory'
  | 'translations'

export interface FitProjectResponseResult {
  metadata: Record<string, any>
  omitted: ProjectResponseOmittedLayer[]
  bytes: number
}

export interface ProjectPutBody {
  metadata?: Record<string, any>
  persistProduction?: boolean
  [key: string]: unknown
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function jsonByteLength(value: unknown): number {
  try {
    return JSON.stringify(value).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

function visionScriptScenes(visionPhase: Record<string, any> | undefined): any[] {
  const scenes = visionPhase?.script?.script?.scenes
  return Array.isArray(scenes) ? scenes : []
}

function forEachStillHost(
  metadata: Record<string, any>,
  visit: (host: Record<string, any>) => void
): void {
  const vision = metadata.visionPhase
  if (!vision || typeof vision !== 'object') return
  for (const scene of visionScriptScenes(vision)) {
    if (!scene || typeof scene !== 'object') continue
    visit(scene)
    for (const line of scene.dialogue || []) {
      if (line && typeof line === 'object') visit(line)
    }
    for (const frame of scene.storyboardFrames || []) {
      if (frame && typeof frame === 'object') visit(frame)
    }
    for (const beat of scene.beats || []) {
      if (beat && typeof beat === 'object') visit(beat)
    }
  }
}

function stripMediaVersionPromptsInPlace(metadata: Record<string, any>): boolean {
  let stripped = false
  forEachStillHost(metadata, (host) => {
    for (const key of MEDIA_VERSION_LIST_KEYS) {
      const list = host[key]
      if (!Array.isArray(list)) continue
      host[key] = list.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object' || !('prompt' in entry)) return entry
        stripped = true
        const { prompt: _prompt, ...rest } = entry as Record<string, unknown>
        return rest
      })
    }
  })
  return stripped
}

function dropMediaVersionArraysInPlace(metadata: Record<string, any>): boolean {
  let dropped = false
  forEachStillHost(metadata, (host) => {
    for (const key of MEDIA_VERSION_LIST_KEYS) {
      if (key in host) {
        delete host[key]
        dropped = true
      }
    }
  })
  return dropped
}

export function slimProjectPutPayload<T extends ProjectPutBody>(
  body: T
): Omit<T, 'persistProduction'> {
  const persistProduction = Boolean(body.persistProduction)
  const { persistProduction: _flag, ...rest } = body
  const metadata = rest.metadata
  if (!metadata || typeof metadata !== 'object') {
    return rest
  }

  const visionPhase = metadata.visionPhase
  if (!visionPhase || typeof visionPhase !== 'object') {
    return {
      ...rest,
      metadata: stripBase64FromMetadata(metadata),
    }
  }

  const nextVision: Record<string, any> = { ...visionPhase }
  const canonicalScenes = nextVision.script?.script?.scenes
  if (Array.isArray(canonicalScenes) && canonicalScenes.length > 0 && 'scenes' in nextVision) {
    delete nextVision.scenes
  }
  if (!persistProduction && 'production' in nextVision) {
    delete nextVision.production
  }

  return {
    ...rest,
    metadata: stripBase64FromMetadata({
      ...metadata,
      visionPhase: nextVision,
    }),
  }
}

/** Fields this write is changing. The PUT deep-merge keeps everything else. */
export function visionPhasePut(
  fields: Record<string, unknown>,
  options?: { persistProduction?: boolean }
): ProjectPutBody {
  return {
    metadata: { visionPhase: fields },
    ...(options?.persistProduction ? { persistProduction: true } : {}),
  }
}

/** Slim, then stringify — for the project PUTs that still fetch instead of using the save queue. */
export function stringifyProjectPut(body: ProjectPutBody): string {
  return JSON.stringify(slimProjectPutPayload(body))
}

/** True when the stringified body is large enough that Vercel will 413 it. */
export function projectPutWouldExceedBodyLimit(body: unknown): boolean {
  try {
    return JSON.stringify(body).length >= VERCEL_FUNCTION_BODY_LIMIT_BYTES
  } catch {
    return false
  }
}

export interface SlimProjectResponseOptions {
  /** Keep `visionPhase.production`. Default omits it — that blob is what 413s GET/PUT echoes. */
  includeProduction?: boolean
}

/**
 * Slim a project metadata blob for a Function *response*.
 *
 * Vercel 413s a body over 4.5MB on the way out as well as in. GET and PUT
 * used to echo production takes plus any leftover data URIs; location persist
 * then looked like a failed save even after the Blob upload succeeded.
 *
 * GET also drops MediaVersion `prompt`s (they duplicate the live still prompt)
 * so Frames restore still has id/url/createdAt/source.
 */
export function slimProjectResponseMetadata(
  metadata: Record<string, any> | null | undefined,
  options?: SlimProjectResponseOptions
): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') return {}
  const stripped = stripBase64FromMetadata(metadata) as Record<string, any>
  const visionPhase = stripped.visionPhase
  if (!visionPhase || typeof visionPhase !== 'object') return stripped

  const nextVision: Record<string, any> = { ...visionPhase }
  const canonicalScenes = nextVision.script?.script?.scenes
  if (Array.isArray(canonicalScenes) && canonicalScenes.length > 0 && 'scenes' in nextVision) {
    delete nextVision.scenes
  }
  if (!options?.includeProduction && 'production' in nextVision) {
    delete nextVision.production
  }

  const next = {
    ...stripped,
    visionPhase: nextVision,
  }
  stripMediaVersionPromptsInPlace(next)
  return next
}

/**
 * Drop GET-only layers until metadata JSON fits under the Function budget.
 * Never removes live beats, beatDirection, or current still URLs.
 */
export function fitProjectResponseMetadata(
  metadata: Record<string, any> | null | undefined,
  options?: { budgetBytes?: number }
): FitProjectResponseResult {
  const budget = options?.budgetBytes ?? VERCEL_FUNCTION_RESPONSE_BUDGET_BYTES
  const next: Record<string, any> =
    metadata && typeof metadata === 'object' ? cloneJson(metadata) : {}
  const omitted: ProjectResponseOmittedLayer[] = []

  const measure = () => jsonByteLength(next)

  if (stripMediaVersionPromptsInPlace(next)) {
    omitted.push('versionPrompts')
  }

  if (measure() >= budget && dropMediaVersionArraysInPlace(next)) {
    omitted.push('versionArrays')
  }

  const vision = next.visionPhase
  if (measure() >= budget && vision && typeof vision === 'object' && 'reviewHistory' in vision) {
    delete vision.reviewHistory
    omitted.push('reviewHistory')
  }
  if (measure() >= budget && vision && typeof vision === 'object' && 'translations' in vision) {
    delete vision.translations
    omitted.push('translations')
  }

  return { metadata: next, omitted, bytes: measure() }
}

export interface CompactProjectPutAckArgs {
  staleScriptWriteBlocked?: boolean
  scriptUpdatedAt?: unknown
  script?: unknown
}

/**
 * PUT ack small enough to return. The Vision page only reads `ok`,
 * `staleScriptWriteBlocked`, and the server script when a stale write was blocked.
 */
export function compactProjectPutAck(args: CompactProjectPutAckArgs): Record<string, unknown> {
  const scriptUpdatedAt =
    typeof args.scriptUpdatedAt === 'string' ? args.scriptUpdatedAt : undefined
  const body: Record<string, unknown> = {
    success: true,
    ...(scriptUpdatedAt ? { scriptUpdatedAt } : {}),
  }
  if (!args.staleScriptWriteBlocked) return body

  body.staleScriptWriteBlocked = true
  body.project = {
    metadata: {
      visionPhase: {
        ...(scriptUpdatedAt ? { scriptUpdatedAt } : {}),
        ...(args.script != null ? { script: args.script } : {}),
      },
    },
  }
  return body
}
