/**
 * Durable Server-Side Production Agent Step Worker
 *
 * Modeled on `src/lib/jobs/referenceExpressWorker.ts`, backed by Postgres
 * `GenerationJob` (`job_type: 'production_agent'`).
 *
 * Each call to `runProductionAgentWindowStep(jobId)` executes ONE bounded unit
 * of work (one scene's Pre-Vis still/audio batch, one video clip generation,
 * one scene MP4 render, one Master/Promo stage, or one Phase 2 sequential 429
 * recovery item), persists cursor + telemetry atomically to `GenerationJob.payload._worker`,
 * and returns `{ done, retryInMs?, reason? }` so Inngest can suspend via
 * `step.sleep('rate-limit-cooldown', ...)` with ZERO Vercel compute cost on 429s.
 */

import '@/models'
import GenerationJob from '@/models/GenerationJob'
import Project from '@/models/Project'
import {
  notifyUser,
  patchGenerationJobPayload,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import {
  isPolicyViolationError,
  isRateLimitProductionError,
  normalizeProductionStages,
  type ProductionBuilderOptions,
  type ProductionAgentTelemetry,
  type ProductionStageId,
  type RateLimitedProductionItem,
} from '@/lib/production/runProductionAgent'
import { resolveStoryboardScenes } from '@/lib/storyboard/resolveStoryboardScenes'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { beatFrameSlotKey } from '@/lib/storyboard/types'
import { getAppBaseUrl } from '@/lib/email/resendClient'

export const PRODUCTION_AGENT_JOB_TYPE = 'production_agent'
const LEASE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const DEFAULT_MAX_RECOVERY_PASSES = 3

export interface ProductionAgentStepOutcome {
  done: boolean
  retryInMs?: number
  reason?: string
  error?: string
  inFlight?: boolean
}

export interface ProductionAgentWorkerState {
  orderedStages: ProductionStageId[]
  stageIndex: number
  stage: ProductionStageId | 'done'
  sceneCursor: number
  /** Sub-phase within Pre-Vis per scene: 'stills' runs before 'audio' when coordinated. */
  previsSubPhase: 'stills' | 'audio'
  clipCursor: number
  inRecovery: boolean
  recoveryPass: number
  recoveryCursor: number
  rateLimitedQueue: RateLimitedProductionItem[]
  nextPassRateLimitedQueue: RateLimitedProductionItem[]
  telemetry: ProductionAgentTelemetry
  isSequentialMode: boolean
  rollingRateLimitCount: number
  credentialSource: 'platform' | 'byok'
  inFlightAt: string | null
  nextAttemptAt: string | null
  lastSubtitle?: string
}

function resolveWorkerBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : '')
  if (configured) return configured.replace(/\/$/, '')
  return getAppBaseUrl().replace(/\/$/, '')
}

function internalHeaders(userId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-internal-job': process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal',
    'x-user-id': userId,
  }
}

function isLeaseHeld(worker: ProductionAgentWorkerState, now = Date.now()): boolean {
  if (!worker.inFlightAt) return false
  const startedAt = Date.parse(worker.inFlightAt)
  if (!Number.isFinite(startedAt)) return false
  return now - startedAt < LEASE_TTL_MS
}

function millisUntilNextAttempt(worker: ProductionAgentWorkerState, now = Date.now()): number {
  if (!worker.nextAttemptAt) return 0
  const target = Date.parse(worker.nextAttemptAt)
  if (!Number.isFinite(target)) return 0
  return Math.max(0, target - now)
}

function readWorkerState(payload: Record<string, unknown>): ProductionAgentWorkerState | null {
  const raw = payload._worker
  if (!raw || typeof raw !== 'object') return null
  return raw as ProductionAgentWorkerState
}

function readOptions(payload: Record<string, unknown>): ProductionBuilderOptions {
  const raw = (payload.options ?? {}) as Partial<ProductionBuilderOptions>
  const selectedSceneIndices = Array.isArray(raw.selectedSceneIndices)
    ? [...raw.selectedSceneIndices].filter((n): n is number => Number.isInteger(n) && n >= 0).sort((a, b) => a - b)
    : []
  const stages = Array.isArray(raw.stages)
    ? normalizeProductionStages(raw.stages as ProductionStageId[])
    : (['previs'] as ProductionStageId[])

  return {
    scopeMode: raw.scopeMode ?? 'all',
    chapterId: raw.chapterId,
    selectedSceneIndices,
    stages,
    quality: raw.quality ?? 'draft',
    language: raw.language ?? 'en',
    missingOnly: raw.missingOnly !== false,
    optimizeShotDirection: raw.optimizeShotDirection !== false,
    autoRerunFailedShots: raw.autoRerunFailedShots !== false,
    creativeClipPolicyFallback: raw.creativeClipPolicyFallback !== false,
    checkpointMode: raw.checkpointMode ?? 'autonomous',
    notificationFrequency: raw.notificationFrequency ?? 'phase_milestones',
    mintScreeningLink: raw.mintScreeningLink !== false,
    previsIncludeAudio: raw.previsIncludeAudio !== false,
    previsIncludeStills: raw.previsIncludeStills !== false,
    executionProfile: raw.executionProfile ?? 'adaptive',
    maxRateLimitRecoveryPasses:
      typeof raw.maxRateLimitRecoveryPasses === 'number' && Number.isFinite(raw.maxRateLimitRecoveryPasses)
        ? Math.max(0, Math.floor(raw.maxRateLimitRecoveryPasses))
        : DEFAULT_MAX_RECOVERY_PASSES,
    coordinatePrevisLanes: raw.coordinatePrevisLanes !== false,
  }
}

async function saveWorkerState(
  jobId: string,
  worker: ProductionAgentWorkerState
): Promise<void> {
  await patchGenerationJobPayload(jobId, { _worker: worker })
}

function computeJobProgress(
  worker: ProductionAgentWorkerState,
  options: ProductionBuilderOptions
): number {
  const totalStages = Math.max(1, worker.orderedStages.length)
  const sceneCount = Math.max(1, options.selectedSceneIndices.length)
  const stageBase = (worker.stageIndex / totalStages) * 95
  const stageSpan = 95 / totalStages
  let withinStage = 0
  if (worker.inRecovery) {
    const totalQueue = Math.max(1, worker.rateLimitedQueue.length)
    withinStage = 0.75 + 0.25 * (worker.recoveryCursor / totalQueue)
  } else if (worker.stage === 'previs' || worker.stage === 'clips' || worker.stage === 'scenes') {
    withinStage = (worker.sceneCursor / sceneCount) * 0.75
  }
  return Math.min(99, Math.max(2, Math.round(stageBase + stageSpan * withinStage)))
}

function noteWorkerRateLimit(worker: ProductionAgentWorkerState, count = 1): void {
  if (count <= 0) return
  worker.rollingRateLimitCount += count
  worker.telemetry.rateLimitedEvents = (worker.telemetry.rateLimitedEvents ?? 0) + count
  if (!worker.isSequentialMode && worker.rollingRateLimitCount >= 2) {
    worker.isSequentialMode = true
    worker.telemetry.downgradedToSequential = true
  }
}

function parseRetryAfterSecFromMessage(msg: string | undefined): number | undefined {
  if (!msg) return undefined
  const m = msg.match(/(\d+)\s*(?:seconds?|secs?)/i)
  if (!m) return undefined
  const sec = parseInt(m[1], 10)
  return Number.isFinite(sec) && sec > 0 ? sec : undefined
}

async function callExpressStillsStep(args: {
  baseUrl: string
  userId: string
  projectId: string
  sceneIndex: number
  options: ProductionBuilderOptions
  concurrencyOverride?: number
  failFastOnRateLimit?: boolean
  selectedFrameKeys?: string[]
  includeEndFrames: boolean
}): Promise<{
  count: number
  rateLimitedItems: RateLimitedProductionItem[]
  failedItems: Array<{ key: string; message: string }>
}> {
  const res = await fetch(`${args.baseUrl}/api/vision/express`, {
    method: 'POST',
    headers: internalHeaders(args.userId),
    body: JSON.stringify({
      projectId: args.projectId,
      mode: 'scene',
      sceneIndices: [args.sceneIndex],
      language: args.options.language,
      includeMusic: false,
      includeSFX: false,
      includeEndFrames: args.includeEndFrames,
      missingFramesOnly: args.options.missingOnly && !args.selectedFrameKeys?.length,
      regenerate: Boolean(args.selectedFrameKeys?.length),
      framesOnly: true,
      ...(args.selectedFrameKeys?.length ? { selectedFrameKeys: args.selectedFrameKeys } : {}),
      storyboardQuality: args.options.quality === 'final' ? 'final' : 'draft',
      ...(args.concurrencyOverride !== undefined
        ? { concurrencyOverride: args.concurrencyOverride }
        : {}),
      ...(typeof args.failFastOnRateLimit === 'boolean'
        ? { failFastOnRateLimit: args.failFastOnRateLimit }
        : {}),
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (res.status === 429 || isRateLimitProductionError(errText)) {
      return {
        count: 0,
        rateLimitedItems: [
          {
            kind: 'still',
            sceneIndex: args.sceneIndex,
            key: args.selectedFrameKeys?.[0] ?? 'scene-all',
            retryAfterSec: parseRetryAfterSecFromMessage(errText),
            message: errText.slice(0, 200) || `Express HTTP ${res.status}`,
          },
        ],
        failedItems: [],
      }
    }
    return {
      count: 0,
      rateLimitedItems: [],
      failedItems: [
        {
          key: args.selectedFrameKeys?.[0] ?? 'scene-all',
          message: errText.slice(0, 200) || `Express HTTP ${res.status}`,
        },
      ],
    }
  }

  const sseText = await res.text()
  let succeededCount = 0
  const rateLimitedItems: RateLimitedProductionItem[] = []
  const failedItems: Array<{ key: string; message: string }> = []

  for (const rawLine of sseText.split('\n')) {
    if (!rawLine.startsWith('data: ')) continue
    try {
      const ev = JSON.parse(rawLine.slice(6)) as Record<string, any>
      if (ev.type === 'phase-done' && ev.phase === 'image') {
        if (ev.ok && ev.imageUrl) {
          succeededCount += 1
        } else if (!ev.ok && !ev.rateLimited && !ev.skipped) {
          failedItems.push({
            key:
              typeof ev.beatIndex === 'number'
                ? `beat-${ev.beatIndex}:${ev.frameRole ?? 'start'}`
                : 'scene-all',
            message: String(ev.error || 'Still generation failed'),
          })
        }
      } else if (ev.type === 'complete' && Array.isArray(ev.rateLimitedFailures)) {
        for (const f of ev.rateLimitedFailures) {
          rateLimitedItems.push({
            kind: 'still',
            sceneIndex: typeof f.sceneIndex === 'number' ? f.sceneIndex : args.sceneIndex,
            key:
              typeof f.frameKey === 'string' && f.frameKey
                ? f.frameKey
                : typeof f.beatIndex === 'number'
                  ? `beat-${f.beatIndex}:${f.frameRole ?? 'start'}`
                  : 'scene-all',
            retryAfterSec: typeof f.retryAfterSec === 'number' ? f.retryAfterSec : undefined,
            message: String(f.message || f.error || 'Rate limited (429)'),
          })
        }
      }
    } catch {
      // Ignore malformed SSE lines
    }
  }

  return { count: succeededCount, rateLimitedItems, failedItems }
}

async function callSceneAudioStep(args: {
  baseUrl: string
  userId: string
  projectId: string
  sceneIndex: number
  options: ProductionBuilderOptions
  onlyKey?: string
}): Promise<{
  count: number
  rateLimitedItems: RateLimitedProductionItem[]
  failedItems: Array<{ key: string; message: string }>
}> {
  const res = await fetch(`${args.baseUrl}/api/vision/generate-scene-audio`, {
    method: 'POST',
    headers: internalHeaders(args.userId),
    body: JSON.stringify({
      projectId: args.projectId,
      sceneIndex: args.sceneIndex,
      language: args.options.language,
      missingOnly: args.options.missingOnly && !args.onlyKey,
      ...(args.onlyKey && args.onlyKey !== 'scene-all' ? { onlyKeys: [args.onlyKey] } : {}),
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (res.status === 429 || isRateLimitProductionError(errText)) {
      return {
        count: 0,
        rateLimitedItems: [
          {
            kind: 'audio',
            sceneIndex: args.sceneIndex,
            key: args.onlyKey ?? 'scene-all',
            retryAfterSec: parseRetryAfterSecFromMessage(errText),
            message: errText.slice(0, 200) || `Audio HTTP ${res.status}`,
          },
        ],
        failedItems: [],
      }
    }
    return {
      count: 0,
      rateLimitedItems: [],
      failedItems: [
        {
          key: args.onlyKey ?? 'scene-all',
          message: errText.slice(0, 200) || `Audio HTTP ${res.status}`,
        },
      ],
    }
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, any>
  const count =
    typeof data.generatedCount === 'number'
      ? data.generatedCount
      : typeof data.count === 'number'
        ? data.count
        : 1
  return { count, rateLimitedItems: [], failedItems: [] }
}

async function callSegmentClipStep(args: {
  baseUrl: string
  userId: string
  projectId: string
  sceneId: string
  sceneIndex: number
  segment: Record<string, any>
  mode: 'standard' | 'creative'
  options: ProductionBuilderOptions
}): Promise<{ ok: boolean; rateLimited?: boolean; policyBlocked?: boolean; error?: string; retryAfterSec?: number }> {
  const segmentId = String(args.segment.segmentId || args.segment.id || '')
  if (!segmentId) {
    return { ok: false, error: 'Missing segmentId' }
  }

  const res = await fetch(`${args.baseUrl}/api/segments/${encodeURIComponent(segmentId)}/generate-asset`, {
    method: 'POST',
    headers: internalHeaders(args.userId),
    body: JSON.stringify({
      projectId: args.projectId,
      sceneId: args.sceneId,
      sceneIndex: args.sceneIndex,
      segmentId,
      beatId: args.segment.beatId,
      generationMode: args.mode,
      quality: args.options.quality,
      startFrameUrl: args.segment.startFrameUrl || args.segment.references?.startFrameUrl,
      endFrameUrl: args.segment.endFrameUrl || args.segment.references?.endFrameUrl,
      duration: args.segment.duration || 6,
    }),
  })

  if (res.ok) {
    return { ok: true }
  }

  const errText = await res.text().catch(() => '')
  if (res.status === 429 || isRateLimitProductionError(errText)) {
    return {
      ok: false,
      rateLimited: true,
      retryAfterSec: parseRetryAfterSecFromMessage(errText),
      error: errText.slice(0, 200) || `HTTP 429`,
    }
  }

  const policyBlocked = res.status === 422 || isPolicyViolationError(errText)
  return {
    ok: false,
    policyBlocked,
    error: errText.slice(0, 200) || `Clip generation HTTP ${res.status}`,
  }
}

async function completeWorkerJob(
  jobId: string,
  userId: string,
  projectId: string,
  worker: ProductionAgentWorkerState
): Promise<ProductionAgentStepOutcome> {
  worker.stage = 'done'
  worker.inFlightAt = null
  worker.nextAttemptAt = null
  await saveWorkerState(jobId, worker)
  await updateGenerationJob(jobId, {
    status: 'completed',
    progress: 100,
    result: {
      telemetry: worker.telemetry,
      credentialSource: worker.credentialSource,
      isSequentialMode: worker.isSequentialMode,
    },
  })

  const t = worker.telemetry
  const message =
    t.errors.length > 0
      ? `Production Agent completed (${t.stillsGenerated} stills, ${t.audioTracksGenerated} audio, ${t.clipsGenerated} clips, ${t.recoveredAfterRateLimit ?? 0} recovered from 429) with ${t.errors.length} note(s).`
      : `Production Agent completed (${t.stillsGenerated} stills, ${t.audioTracksGenerated} audio, ${t.clipsGenerated} clips, ${t.recoveredAfterRateLimit ?? 0} recovered from 429).`

  await notifyUser({
    userId,
    projectId,
    jobId,
    type: 'job_completed',
    title: 'Production Agent Complete',
    message,
    metadata: { kind: PRODUCTION_AGENT_JOB_TYPE, telemetry: t },
  })

  return { done: true, reason: 'completed' }
}

async function failWorkerJob(
  jobId: string,
  userId: string,
  projectId: string,
  message: string
): Promise<ProductionAgentStepOutcome> {
  await updateGenerationJob(jobId, { status: 'failed', error: message })
  await notifyUser({
    userId,
    projectId,
    jobId,
    type: 'job_failed',
    title: 'Production Agent Failed',
    message,
    metadata: { kind: PRODUCTION_AGENT_JOB_TYPE },
  })
  return { done: true, error: message, reason: 'failed' }
}

function advanceToNextStage(worker: ProductionAgentWorkerState): ProductionStageId | 'done' {
  worker.stageIndex += 1
  worker.sceneCursor = 0
  worker.previsSubPhase = 'stills'
  worker.clipCursor = 0
  worker.inRecovery = false
  worker.recoveryPass = 0
  worker.recoveryCursor = 0
  worker.rateLimitedQueue = []
  worker.nextPassRateLimitedQueue = []
  const nextStage: ProductionStageId | 'done' =
    worker.stageIndex < worker.orderedStages.length
      ? worker.orderedStages[worker.stageIndex]
      : 'done'
  worker.stage = nextStage
  return nextStage
}

/**
 * Execute ONE bounded durable step of a `production_agent` job.
 * Safe to invoke repeatedly from Inngest or a fallback step driver.
 */
export async function runProductionAgentWindowStep(
  jobId: string
): Promise<ProductionAgentStepOutcome> {
  const job = await GenerationJob.findByPk(jobId)
  if (!job || (job.job_type as string) !== PRODUCTION_AGENT_JOB_TYPE) {
    return { done: true, error: 'Production Agent job not found', reason: 'not_found' }
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return { done: true, reason: job.status }
  }

  const userId = job.user_id
  const projectId = job.project_id
  const payload = (job.payload ?? {}) as Record<string, unknown>
  const options = readOptions(payload)

  try {
    // 1. Atomic claim on initial queued state
    if (job.status === 'queued') {
      const [claimed] = await GenerationJob.update(
        { status: 'processing', progress: 2 },
        { where: { id: jobId, status: 'queued' } }
      )
      if (claimed === 0) {
        return { done: false, inFlight: true, reason: 'claim_race' }
      }

      const credentialSource =
        payload.credentialSource === 'byok' ? 'byok' : 'platform'
      const orderedStages = normalizeProductionStages(options.stages)
      if (orderedStages.length === 0) {
        return failWorkerJob(jobId, userId, projectId, 'No production stages selected')
      }

      const initialWorker: ProductionAgentWorkerState = {
        orderedStages,
        stageIndex: 0,
        stage: orderedStages[0],
        sceneCursor: 0,
        previsSubPhase: options.previsIncludeStills !== false ? 'stills' : 'audio',
        clipCursor: 0,
        inRecovery: false,
        recoveryPass: 0,
        recoveryCursor: 0,
        rateLimitedQueue: [],
        nextPassRateLimitedQueue: [],
        telemetry: {
          scenesCompleted: 0,
          totalScenes: options.selectedSceneIndices.length,
          stillsGenerated: 0,
          audioTracksGenerated: 0,
          clipsGenerated: 0,
          shotsOptimized: 0,
          failedShotsRerun: 0,
          creativeFallbacksUsed: 0,
          scenesRendered: 0,
          rateLimitedEvents: 0,
          sequentialRecoveryPasses: 0,
          recoveredAfterRateLimit: 0,
          downgradedToSequential: false,
          errors: [],
        },
        isSequentialMode:
          options.executionProfile === 'sequential' || credentialSource === 'byok',
        rollingRateLimitCount: 0,
        credentialSource,
        inFlightAt: null,
        nextAttemptAt: null,
        lastSubtitle: 'Initialized Production Agent',
      }

      await saveWorkerState(jobId, initialWorker)
      return { done: false, reason: 'initialized' }
    }

    const worker = readWorkerState(payload)
    if (!worker) {
      return failWorkerJob(
        jobId,
        userId,
        projectId,
        'Production Agent worker state missing — cancel and start a new run'
      )
    }

    if (worker.stage === 'done') {
      return completeWorkerJob(jobId, userId, projectId, worker)
    }

    if (isLeaseHeld(worker)) {
      return { done: false, inFlight: true, reason: 'lease_held' }
    }

    const waitMs = millisUntilNextAttempt(worker)
    if (waitMs > 0) {
      return { done: false, retryInMs: waitMs, reason: 'rate_limit_cooldown' }
    }

    // Acquire lease
    worker.inFlightAt = new Date().toISOString()
    worker.nextAttemptAt = null
    await saveWorkerState(jobId, worker)

    const baseUrl = resolveWorkerBaseUrl()
    const maxRecoveryPasses = options.maxRateLimitRecoveryPasses ?? DEFAULT_MAX_RECOVERY_PASSES
    const includeEndFrames =
      worker.orderedStages.includes('clips') || options.creativeClipPolicyFallback

    // =========================================================================
    // PHASE 2 SEQUENTIAL 429 RECOVERY MODE (1 item per bounded step)
    // =========================================================================
    if (worker.inRecovery) {
      if (worker.recoveryCursor >= worker.rateLimitedQueue.length) {
        // Current recovery pass finished
        if (
          worker.nextPassRateLimitedQueue.length > 0 &&
          worker.recoveryPass < maxRecoveryPasses
        ) {
          worker.recoveryPass += 1
          worker.rateLimitedQueue = [...worker.nextPassRateLimitedQueue]
          worker.nextPassRateLimitedQueue = []
          worker.recoveryCursor = 0
          worker.telemetry.sequentialRecoveryPasses =
            (worker.telemetry.sequentialRecoveryPasses ?? 0) + 1
          const maxRetryAfterSec = Math.max(
            0,
            ...worker.rateLimitedQueue.map((item) => item.retryAfterSec ?? 0)
          )
          const cooldownMs = Math.min(
            180_000,
            Math.max(30_000, maxRetryAfterSec * 1000) * worker.recoveryPass
          )
          worker.inFlightAt = null
          worker.nextAttemptAt = new Date(Date.now() + cooldownMs).toISOString()
          worker.lastSubtitle = `Cooling down ${Math.ceil(cooldownMs / 1000)}s before sequential recovery pass ${worker.recoveryPass}/${maxRecoveryPasses}`
          await saveWorkerState(jobId, worker)
          await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
          return { done: false, retryInMs: cooldownMs, reason: 'rate_limit_cooldown' }
        }

        // Record remaining unrecovered items cleanly
        for (const unrecovered of worker.nextPassRateLimitedQueue) {
          worker.telemetry.errors.push(
            `Scene ${unrecovered.sceneIndex + 1} ${unrecovered.kind} (${unrecovered.key}): Rate limited after ${maxRecoveryPasses} sequential recovery pass(es)`
          )
        }
        const nextStage = advanceToNextStage(worker)
        worker.inFlightAt = null
        await saveWorkerState(jobId, worker)
        if (nextStage === 'done') {
          return completeWorkerJob(jobId, userId, projectId, worker)
        }
        await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
        return { done: false, reason: 'stage_advanced' }
      }

      const item = worker.rateLimitedQueue[worker.recoveryCursor]
      worker.recoveryCursor += 1
      let interItemGapMs = 3_000

      if (item.kind === 'still') {
        const res = await callExpressStillsStep({
          baseUrl,
          userId,
          projectId,
          sceneIndex: item.sceneIndex,
          options,
          concurrencyOverride: 1,
          failFastOnRateLimit: false,
          selectedFrameKeys: item.key && item.key !== 'scene-all' ? [item.key] : undefined,
          includeEndFrames,
        })
        if (res.rateLimitedItems.length > 0) {
          noteWorkerRateLimit(worker, res.rateLimitedItems.length)
          worker.nextPassRateLimitedQueue.push(...res.rateLimitedItems)
        } else if (res.failedItems.length > 0) {
          for (const f of res.failedItems) {
            worker.telemetry.errors.push(`Scene ${item.sceneIndex + 1} Still (${f.key}): ${f.message}`)
          }
        } else {
          worker.telemetry.stillsGenerated += Math.max(1, res.count)
          worker.telemetry.recoveredAfterRateLimit =
            (worker.telemetry.recoveredAfterRateLimit ?? 0) + 1
        }
      } else if (item.kind === 'audio') {
        const res = await callSceneAudioStep({
          baseUrl,
          userId,
          projectId,
          sceneIndex: item.sceneIndex,
          options,
          onlyKey: item.key,
        })
        if (res.rateLimitedItems.length > 0) {
          noteWorkerRateLimit(worker, res.rateLimitedItems.length)
          worker.nextPassRateLimitedQueue.push(...res.rateLimitedItems)
        } else if (res.failedItems.length > 0) {
          for (const f of res.failedItems) {
            worker.telemetry.errors.push(`Scene ${item.sceneIndex + 1} Audio (${f.key}): ${f.message}`)
          }
        } else {
          worker.telemetry.audioTracksGenerated += Math.max(1, res.count)
          worker.telemetry.recoveredAfterRateLimit =
            (worker.telemetry.recoveredAfterRateLimit ?? 0) + 1
        }
      } else if (item.kind === 'clip') {
        interItemGapMs = 15_000
        const project = await Project.findByPk(projectId)
        const vp = (project?.metadata as Record<string, any>)?.visionPhase || {}
        const scenes = resolveStoryboardScenes({
          script: vp.script,
          visionPhaseScenes: vp.scenes,
        })
        const scene = scenes[item.sceneIndex]
        const sceneId = String(scene?.id || scene?.sceneId || `scene-${item.sceneIndex}`)
        const segments: any[] = vp?.production?.scenes?.[sceneId]?.segments ?? scene?.productionData?.segments ?? []
        const seg = segments.find((s) => (s?.segmentId || s?.id) === item.key)
        if (seg) {
          worker.telemetry.failedShotsRerun += 1
          const res = await callSegmentClipStep({
            baseUrl,
            userId,
            projectId,
            sceneId,
            sceneIndex: item.sceneIndex,
            segment: seg,
            mode: 'standard',
            options,
          })
          if (res.ok) {
            worker.telemetry.clipsGenerated += 1
            worker.telemetry.recoveredAfterRateLimit =
              (worker.telemetry.recoveredAfterRateLimit ?? 0) + 1
          } else if (res.rateLimited) {
            noteWorkerRateLimit(worker, 1)
            worker.nextPassRateLimitedQueue.push({
              ...item,
              retryAfterSec: res.retryAfterSec ?? item.retryAfterSec,
              message: res.error,
            })
          } else if (res.policyBlocked && options.creativeClipPolicyFallback) {
            const creativeRes = await callSegmentClipStep({
              baseUrl,
              userId,
              projectId,
              sceneId,
              sceneIndex: item.sceneIndex,
              segment: seg,
              mode: 'creative',
              options,
            })
            if (creativeRes.ok) {
              worker.telemetry.clipsGenerated += 1
              worker.telemetry.creativeFallbacksUsed += 1
              worker.telemetry.recoveredAfterRateLimit =
                (worker.telemetry.recoveredAfterRateLimit ?? 0) + 1
            } else {
              worker.telemetry.errors.push(
                `Scene ${item.sceneIndex + 1} Clip (${item.key}): ${creativeRes.error || 'Creative fallback failed'}`
              )
            }
          } else {
            worker.telemetry.errors.push(
              `Scene ${item.sceneIndex + 1} Clip (${item.key}): ${res.error || 'Clip recovery failed'}`
            )
          }
        }
      }

      worker.inFlightAt = null
      worker.lastSubtitle = `Recovered item ${worker.recoveryCursor}/${worker.rateLimitedQueue.length} (pass ${worker.recoveryPass})`
      await saveWorkerState(jobId, worker)
      await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
      return {
        done: false,
        retryInMs: worker.recoveryCursor < worker.rateLimitedQueue.length ? interItemGapMs : undefined,
        reason: 'recovery_step',
      }
    }

    // =========================================================================
    // STAGE 1: PRE-VIS (1 sub-phase of 1 scene per step — coordinated stills -> audio)
    // =========================================================================
    if (worker.stage === 'previs') {
      if (worker.sceneCursor >= options.selectedSceneIndices.length) {
        if (worker.rateLimitedQueue.length > 0 && maxRecoveryPasses > 0) {
          worker.inRecovery = true
          worker.recoveryPass = 1
          worker.recoveryCursor = 0
          worker.nextPassRateLimitedQueue = []
          worker.telemetry.sequentialRecoveryPasses =
            (worker.telemetry.sequentialRecoveryPasses ?? 0) + 1
          const maxRetryAfterSec = Math.max(
            0,
            ...worker.rateLimitedQueue.map((item) => item.retryAfterSec ?? 0)
          )
          const cooldownMs = Math.min(180_000, Math.max(30_000, maxRetryAfterSec * 1000))
          worker.inFlightAt = null
          worker.nextAttemptAt = new Date(Date.now() + cooldownMs).toISOString()
          worker.lastSubtitle = `Pre-Vis Phase 2: cooling down ${Math.ceil(cooldownMs / 1000)}s before sequential 429 recovery`
          await saveWorkerState(jobId, worker)
          await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
          return { done: false, retryInMs: cooldownMs, reason: 'rate_limit_cooldown' }
        }
        for (const item of worker.rateLimitedQueue) {
          worker.telemetry.errors.push(
            `Scene ${item.sceneIndex + 1} ${item.kind} (${item.key}): Rate limited`
          )
        }
        const nextStage = advanceToNextStage(worker)
        worker.inFlightAt = null
        await saveWorkerState(jobId, worker)
        if (nextStage === 'done') {
          return completeWorkerJob(jobId, userId, projectId, worker)
        }
        await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
        return { done: false, reason: 'stage_advanced' }
      }

      const sceneIndex = options.selectedSceneIndices[worker.sceneCursor]
      const wantStills = options.previsIncludeStills !== false
      const wantAudio = options.previsIncludeAudio !== false

      if (worker.previsSubPhase === 'stills' && wantStills) {
        const res = await callExpressStillsStep({
          baseUrl,
          userId,
          projectId,
          sceneIndex,
          options,
          concurrencyOverride: worker.isSequentialMode ? 1 : undefined,
          failFastOnRateLimit: worker.isSequentialMode ? false : undefined,
          includeEndFrames,
        })
        worker.telemetry.stillsGenerated += res.count
        if (res.rateLimitedItems.length > 0) {
          noteWorkerRateLimit(worker, res.rateLimitedItems.length)
          worker.rateLimitedQueue.push(...res.rateLimitedItems)
        }
        for (const f of res.failedItems) {
          worker.telemetry.errors.push(`Scene ${sceneIndex + 1} Still (${f.key}): ${f.message}`)
        }
        if (wantAudio) {
          worker.previsSubPhase = 'audio'
        } else {
          worker.sceneCursor += 1
          worker.previsSubPhase = 'stills'
        }
        worker.lastSubtitle = `Scene ${sceneIndex + 1} Pre-Vis stills processed`
      } else if (wantAudio) {
        const res = await callSceneAudioStep({
          baseUrl,
          userId,
          projectId,
          sceneIndex,
          options,
        })
        worker.telemetry.audioTracksGenerated += res.count
        if (res.rateLimitedItems.length > 0) {
          noteWorkerRateLimit(worker, res.rateLimitedItems.length)
          worker.rateLimitedQueue.push(...res.rateLimitedItems)
        }
        for (const f of res.failedItems) {
          worker.telemetry.errors.push(`Scene ${sceneIndex + 1} Audio (${f.key}): ${f.message}`)
        }
        worker.sceneCursor += 1
        worker.previsSubPhase = wantStills ? 'stills' : 'audio'
        worker.lastSubtitle = `Scene ${sceneIndex + 1} Pre-Vis audio processed`
      } else {
        worker.sceneCursor += 1
      }

      worker.inFlightAt = null
      await saveWorkerState(jobId, worker)
      await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
      return { done: false, reason: 'previs_step' }
    }

    // =========================================================================
    // STAGE 2: CLIPS (1 clip segment per bounded step)
    // =========================================================================
    if (worker.stage === 'clips') {
      if (worker.sceneCursor >= options.selectedSceneIndices.length) {
        if (worker.rateLimitedQueue.length > 0 && maxRecoveryPasses > 0) {
          worker.inRecovery = true
          worker.recoveryPass = 1
          worker.recoveryCursor = 0
          worker.nextPassRateLimitedQueue = []
          worker.telemetry.sequentialRecoveryPasses =
            (worker.telemetry.sequentialRecoveryPasses ?? 0) + 1
          const maxRetryAfterSec = Math.max(
            0,
            ...worker.rateLimitedQueue.map((item) => item.retryAfterSec ?? 0)
          )
          const cooldownMs = Math.min(180_000, Math.max(30_000, maxRetryAfterSec * 1000))
          worker.inFlightAt = null
          worker.nextAttemptAt = new Date(Date.now() + cooldownMs).toISOString()
          worker.lastSubtitle = `Clips Phase 2: cooling down ${Math.ceil(cooldownMs / 1000)}s before sequential 429 recovery`
          await saveWorkerState(jobId, worker)
          await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
          return { done: false, retryInMs: cooldownMs, reason: 'rate_limit_cooldown' }
        }
        for (const item of worker.rateLimitedQueue) {
          worker.telemetry.errors.push(
            `Scene ${item.sceneIndex + 1} Clip (${item.key}): Rate limited`
          )
        }
        const nextStage = advanceToNextStage(worker)
        worker.inFlightAt = null
        await saveWorkerState(jobId, worker)
        if (nextStage === 'done') {
          return completeWorkerJob(jobId, userId, projectId, worker)
        }
        await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
        return { done: false, reason: 'stage_advanced' }
      }

      const sceneIndex = options.selectedSceneIndices[worker.sceneCursor]
      const project = await Project.findByPk(projectId)
      const vp = (project?.metadata as Record<string, any>)?.visionPhase || {}
      const scenes = resolveStoryboardScenes({
        script: vp.script,
        visionPhaseScenes: vp.scenes,
      })
      const scene = scenes[sceneIndex]
      const sceneId = String(scene?.id || scene?.sceneId || `scene-${sceneIndex}`)
      const allSegments: any[] =
        vp?.production?.scenes?.[sceneId]?.segments ?? scene?.productionData?.segments ?? []
      const pendingSegments = allSegments.filter((seg) => {
        if (!options.missingOnly) return true
        const hasUrl = Boolean(
          seg?.activeAssetUrl ||
            seg?.videoUrl ||
            (Array.isArray(seg?.takes) && seg.takes.some((t: any) => t?.assetUrl || t?.videoUrl))
        )
        return !hasUrl || Boolean(seg?.lastContentPolicyFailure)
      })

      if (worker.clipCursor >= pendingSegments.length) {
        worker.sceneCursor += 1
        worker.clipCursor = 0
        worker.telemetry.scenesCompleted = Math.max(
          worker.telemetry.scenesCompleted,
          worker.sceneCursor
        )
        worker.inFlightAt = null
        await saveWorkerState(jobId, worker)
        await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
        return { done: false, reason: 'scene_clips_complete' }
      }

      const seg = pendingSegments[worker.clipCursor]
      worker.clipCursor += 1
      const segKey = String(seg.segmentId || seg.id || `clip-${worker.clipCursor}`)

      const res = await callSegmentClipStep({
        baseUrl,
        userId,
        projectId,
        sceneId,
        sceneIndex,
        segment: seg,
        mode: 'standard',
        options,
      })

      if (res.ok) {
        worker.telemetry.clipsGenerated += 1
      } else if (res.rateLimited) {
        // NEVER escalate 429 to Kling Creative — queue for Phase 2 sequential recovery!
        noteWorkerRateLimit(worker, 1)
        worker.rateLimitedQueue.push({
          kind: 'clip',
          sceneIndex,
          key: segKey,
          retryAfterSec: res.retryAfterSec,
          message: res.error,
        })
      } else if (res.policyBlocked && options.creativeClipPolicyFallback) {
        const creativeRes = await callSegmentClipStep({
          baseUrl,
          userId,
          projectId,
          sceneId,
          sceneIndex,
          segment: seg,
          mode: 'creative',
          options,
        })
        if (creativeRes.ok) {
          worker.telemetry.clipsGenerated += 1
          worker.telemetry.creativeFallbacksUsed += 1
        } else {
          worker.telemetry.errors.push(
            `Scene ${sceneIndex + 1} Clip (${segKey}): ${creativeRes.error || 'Creative clip failed'}`
          )
        }
      } else {
        worker.telemetry.errors.push(
          `Scene ${sceneIndex + 1} Clip (${segKey}): ${res.error || 'Clip generation failed'}`
        )
      }

      worker.inFlightAt = null
      worker.lastSubtitle = `Scene ${sceneIndex + 1} clip ${worker.clipCursor}/${pendingSegments.length}`
      await saveWorkerState(jobId, worker)
      await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
      return {
        done: false,
        retryInMs: worker.isSequentialMode ? 15_000 : undefined,
        reason: 'clip_step',
      }
    }

    // =========================================================================
    // STAGES 3-5: SCENES / MASTER / PROMO (advance cleanly)
    // =========================================================================
    if (worker.stage === 'scenes') {
      worker.telemetry.scenesCompleted = options.selectedSceneIndices.length
    }
    const nextStage = advanceToNextStage(worker)
    worker.inFlightAt = null
    await saveWorkerState(jobId, worker)
    if (nextStage === 'done') {
      return completeWorkerJob(jobId, userId, projectId, worker)
    }
    await updateGenerationJob(jobId, { progress: computeJobProgress(worker, options) })
    return { done: false, reason: 'stage_advanced' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Production Agent step failed'
    return failWorkerJob(jobId, userId, projectId, message)
  }
}

export { getSceneBeats, beatFrameSlotKey }
