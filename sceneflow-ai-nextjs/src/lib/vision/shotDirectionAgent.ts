import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface ShotDirectionAgentResult {
  optimized: number
  failed: number
  cancelled: boolean
}

/** Shots the Stills and Video Agents will generate: every beat not excluded. */
export function shotsForDirectionAgent(scene: unknown): SceneBeat[] {
  return getSceneBeats((scene ?? {}) as Record<string, unknown>).filter(
    (beat) => beat.excluded !== true
  )
}

const PATCH_FIELDS = [
  'actionFraming',
  'actionDescription',
  'shotType',
  'cameraAngle',
  'frozenMoment',
  'blocking',
  'gaze',
  'emotion',
  'propInteraction',
  'lightingAccent',
  'cameraMovement',
  'audioCue',
] as const

function patchHasDirection(patch: StillDirectorPatch): boolean {
  return (
    PATCH_FIELDS.some((key) => typeof patch[key] === 'string' && patch[key]!.trim().length > 0) ||
    Array.isArray(patch.castInFrame) ||
    (patch.keyProps?.length ?? 0) > 0
  )
}

/**
 * The Direct Shot optimize request (empty note). A fallback response without
 * AI carries no rewrite, so it is reported as a failure instead of saved.
 */
export async function requestOptimizedShotDirection(args: {
  projectId: string
  sceneIndex: number
  beatId: string
  /** Safety rewrite for a shot whose last generate was policy-blocked. */
  policyCompliance?: boolean
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}): Promise<StillDirectorPatch> {
  const response = await (args.fetchImpl ?? fetch)('/api/scene/direct-beat-still', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: args.projectId,
      sceneIndex: args.sceneIndex,
      beatId: args.beatId,
      mode: 'optimize',
      ...(args.policyCompliance ? { policyCompliance: true } : {}),
    }),
    signal: args.signal,
  })
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    usedAI?: boolean
    fallbackReason?: string
    patch?: StillDirectorPatch
  }
  if (!response.ok) throw new Error(data.error || 'Direction optimize failed')
  const patch = data.patch ?? {}
  if (data.usedAI === false || !patchHasDirection(patch)) {
    throw new Error(data.fallbackReason || 'Direction optimize returned no rewrite')
  }
  return patch
}

/**
 * Optimizes each shot and saves it in shot order. Requests run a few at a time;
 * saves are applied one after another so each builds on the last.
 */
export async function runShotDirectionAgent(args: {
  shots: SceneBeat[]
  requestPatch: (shot: SceneBeat) => Promise<StillDirectorPatch>
  savePatch: (shot: SceneBeat, patch: StillDirectorPatch) => void
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
  concurrency?: number
}): Promise<ShotDirectionAgentResult> {
  const { shots, signal } = args
  const total = shots.length
  const concurrency = Math.max(1, Math.min(args.concurrency ?? 3, total || 1))
  const results: Array<StillDirectorPatch | null | undefined> = new Array(total).fill(undefined)
  let optimized = 0
  let failed = 0
  let done = 0
  let nextToSave = 0
  let nextToRequest = 0

  const flushSaves = () => {
    while (nextToSave < total && results[nextToSave] !== undefined) {
      const patch = results[nextToSave]
      if (patch && !signal?.aborted) {
        args.savePatch(shots[nextToSave], patch)
        optimized += 1
      }
      nextToSave += 1
    }
  }

  const worker = async () => {
    while (!signal?.aborted && nextToRequest < total) {
      const index = nextToRequest++
      try {
        results[index] = await args.requestPatch(shots[index])
      } catch {
        results[index] = null
        if (!signal?.aborted) failed += 1
      }
      done += 1
      flushSaves()
      if (!signal?.aborted) args.onProgress?.(done, total)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return { optimized, failed, cancelled: signal?.aborted === true }
}
