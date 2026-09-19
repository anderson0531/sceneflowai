import { stripBase64FromMetadata } from '@/lib/storage/mediaStorage'

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

export interface ProjectPutBody {
  metadata?: Record<string, any>
  persistProduction?: boolean
  [key: string]: unknown
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

  return {
    ...stripped,
    visionPhase: nextVision,
  }
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
