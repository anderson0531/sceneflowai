import type { SceneChunk } from '@/lib/script/sceneChunkPlan'

export interface ScriptGenerationCheckpoint {
  jobId?: string | null
  planSignature: string
  updatedAt: string
  scenesGenerated: number
  totalScenes: number
  completedChunks: Record<string, any[]>
}

/**
 * Default max heartbeat silence before an in-flight script_generation job is
 * treated as abandoned and eligible for checkpoint-resumed restart.
 * The active route emits a DB heartbeat every 5s and on each chunk completion.
 */
export const ACTIVE_SCRIPT_JOB_HEARTBEAT_TTL_MS = 90 * 1000

/**
 * Deterministic signature for a Blueprint beat chunk plan.
 * If the Blueprint beats or scene counts change, the signature changes and old
 * checkpoints are ignored.
 */
export function buildScriptChunkPlanSignature(chunks: SceneChunk[]): string {
  return chunks
    .map(
      (c) =>
        `${c.blueprintBeatIndex === null ? 'n' : c.blueprintBeatIndex}:${c.partIndex}/${c.partCount}:${c.sceneNumberStart}:${c.sceneCount}`
    )
    .join('|')
}

/**
 * Restore any already-completed chunks from a saved checkpoint when its
 * `planSignature` matches the current chunk plan.
 */
export function restoreCompletedChunksFromCheckpoint(
  rawCheckpoint: unknown,
  planSignature: string,
  chunkCount: number
): {
  completedChunks: Record<number, any[]>
  restoredChunksCount: number
  restoredScenesCount: number
} {
  const empty = {
    completedChunks: {} as Record<number, any[]>,
    restoredChunksCount: 0,
    restoredScenesCount: 0,
  }
  if (!rawCheckpoint || typeof rawCheckpoint !== 'object') return empty
  const cp = rawCheckpoint as Partial<ScriptGenerationCheckpoint>
  if (!cp.planSignature || cp.planSignature !== planSignature) return empty
  if (!cp.completedChunks || typeof cp.completedChunks !== 'object') return empty

  const completedChunks: Record<number, any[]> = {}
  let restoredChunksCount = 0
  let restoredScenesCount = 0

  for (let i = 0; i < chunkCount; i++) {
    const scenes = (cp.completedChunks as Record<string, unknown>)[String(i)]
    if (Array.isArray(scenes) && scenes.length > 0) {
      completedChunks[i] = scenes
      restoredChunksCount += 1
      restoredScenesCount += scenes.length
    }
  }

  return {
    completedChunks,
    restoredChunksCount,
    restoredScenesCount,
  }
}

/**
 * Returns true if a `script_generation` job is actively processing and has
 * updated its heartbeat within `maxIdleMs` (default 90s).
 */
export function isActiveScriptGenerationJobFresh(
  job:
    | {
        status?: string | null
        updated_at?: Date | string | null
        created_at?: Date | string | null
      }
    | null
    | undefined,
  maxIdleMs: number = ACTIVE_SCRIPT_JOB_HEARTBEAT_TTL_MS,
  nowMs: number = Date.now()
): boolean {
  if (!job) return false
  if (job.status !== 'queued' && job.status !== 'processing') return false
  const updatedMs = job.updated_at ? new Date(job.updated_at).getTime() : NaN
  const createdMs = job.created_at ? new Date(job.created_at).getTime() : NaN
  const anchorMs = Number.isFinite(updatedMs) ? updatedMs : createdMs
  if (!Number.isFinite(anchorMs)) return false
  return nowMs - anchorMs <= maxIdleMs
}
