/**
 * Metered Billing Gateway — Reserve → Execute → Settle + Mandatory Pre-Dispatch Telemetry
 *
 * Ensures every paid provider invocation:
 * 1. Atomically reserves credits in `credit_holds` BEFORE dispatching to GCP/Vertex/Kling/ElevenLabs/OpenAI
 * 2. Logs a pre-dispatch `provider_api_runs` row so timeouts, failures, and unbilled paths are auditable
 * 3. Captures exact final credits into `credit_ledger` (idempotently) on success, or releases the hold on failure
 * 4. Updates `provider_api_runs` with `ledger_id`, `charged_credits`, `estimated_cogs_usd`, and `status`
 */

import crypto from 'crypto'
import { ProviderApiRun, type ProviderRunStatus, type ProviderRunVendor } from '@/models/ProviderApiRun'
import { ensureProviderApiRunsTable } from '@/lib/database/migrateProviderApiRuns'
import { CreditService } from '@/services/CreditService'
import { resolveGenerationQuote } from './resolveGenerationQuote'
import { logProviderCost } from './costTracking'
import { isUuid } from '@/lib/auth/isUuid'
import { resolveUser } from '@/lib/userHelper'
import type { GenerationQuote, QuoteGenerationInput } from './quoteGenerationCredits'

export interface ProviderRunStartInput {
  userId?: string | null
  projectId?: string | null
  route: string
  provider: ProviderRunVendor
  model: string
  operation: string
  credentialSource?: 'platform' | 'byok'
  holdId?: string | null
  estimatedCogsUsd?: number
  unitsBilled?: number
  unitType?: string | null
  meta?: Record<string, unknown>
}

export interface ProviderRunFinishInput {
  runId: string | null
  status: ProviderRunStatus
  providerRequestId?: string | null
  unitsBilled?: number
  unitType?: string | null
  estimatedCogsUsd?: number
  ledgerId?: string | null
  chargedCredits?: number
  httpStatus?: number | null
  errorCode?: string | null
  meta?: Record<string, unknown>
}

async function resolveUuidSafe(userId?: string | null): Promise<string | null> {
  if (!userId) return null
  if (isUuid(userId)) return userId
  try {
    const u = await resolveUser(userId)
    return u?.id && isUuid(u.id) ? u.id : null
  } catch {
    return null
  }
}

export function inferVendorFromProviderOrModel(
  providerHint?: string | null,
  model?: string | null
): ProviderRunVendor {
  const hint = (providerHint || '').toLowerCase()
  const combined = `${hint} ${model || ''}`.toLowerCase()
  if (hint.includes('fal') || combined.includes('fal-ai')) return 'fal'
  if (hint.includes('aggregator') || combined.includes('kie') || combined.includes('piapi')) {
    return 'aggregator'
  }
  if (combined.includes('eleven')) return 'elevenlabs'
  if (combined.includes('edge_tts') || combined.includes('edge-tts')) return 'edge_tts'
  if (combined.includes('kling')) return 'kling'
  if (combined.includes('openai') || combined.includes('gpt-image') || combined.includes('dall')) {
    return 'openai'
  }
  if (combined.includes('cloud_run') || combined.includes('ffmpeg') || combined.includes('render')) {
    return 'cloud_run'
  }
  if (combined.includes('ai_gateway')) return 'ai_gateway'
  if (
    combined.includes('vertex') ||
    combined.includes('gemini') ||
    combined.includes('veo') ||
    combined.includes('imagen') ||
    combined.includes('lyria') ||
    combined.includes('google')
  ) {
    return 'vertex'
  }
  return 'other'
}

/**
 * Record a `provider_api_runs` row BEFORE dispatching to an external paid provider.
 * Non-fatal if DB telemetry fails so healthy requests aren't broken by telemetry glitches,
 * while logging loudly for operational visibility.
 */
export async function recordProviderRunStart(
  input: ProviderRunStartInput
): Promise<string | null> {
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return null
  }
  try {
    await ensureProviderApiRunsTable()
    const resolvedUserId = await resolveUuidSafe(input.userId)
    const projectUuid = input.projectId && isUuid(input.projectId) ? input.projectId : null
    const id = crypto.randomUUID()
    await ProviderApiRun.create({
      id,
      user_id: resolvedUserId,
      project_id: projectUuid,
      route: input.route.slice(0, 255),
      provider: input.provider,
      model: (input.model || 'unknown').slice(0, 128),
      operation: (input.operation || 'unknown').slice(0, 128),
      credential_source: input.credentialSource ?? 'platform',
      hold_id: input.holdId ?? null,
      units_billed: Number(input.unitsBilled ?? 0),
      unit_type: input.unitType ?? null,
      estimated_cogs_usd: Number(input.estimatedCogsUsd ?? 0),
      charged_credits: 0,
      status: 'dispatching',
      meta: input.meta ?? null,
    })
    return id
  } catch (err) {
    console.error('[MeteredGateway] Failed to write pre-dispatch provider_api_runs row:', err)
    return null
  }
}

/**
 * Update a `provider_api_runs` row upon completion, rate limit, or error.
 */
export async function recordProviderRunFinish(input: ProviderRunFinishInput): Promise<void> {
  if (!input.runId || process.env.VITEST || process.env.NODE_ENV === 'test') return
  try {
    await ensureProviderApiRunsTable()
    const row = await ProviderApiRun.findByPk(input.runId)
    if (!row) return
    row.status = input.status
    if (input.providerRequestId !== undefined) row.provider_request_id = input.providerRequestId
    if (input.unitsBilled !== undefined) row.units_billed = input.unitsBilled
    if (input.unitType !== undefined) row.unit_type = input.unitType
    if (input.estimatedCogsUsd !== undefined) row.estimated_cogs_usd = input.estimatedCogsUsd
    if (input.ledgerId !== undefined) row.ledger_id = input.ledgerId
    if (input.chargedCredits !== undefined) row.charged_credits = input.chargedCredits
    if (input.httpStatus !== undefined) row.http_status = input.httpStatus
    if (input.errorCode !== undefined) {
      row.error_code = input.errorCode ? input.errorCode.slice(0, 128) : null
    }
    if (input.meta) {
      row.meta = { ...(row.meta || {}), ...input.meta }
    }
    await row.save()
  } catch (err) {
    console.error('[MeteredGateway] Failed to update provider_api_runs row:', err)
  }
}

function classifyErrorStatus(err: unknown): {
  status: ProviderRunStatus
  httpStatus: number | null
  errorCode: string
} {
  const anyErr = err as any
  const msg = String(anyErr?.message || err || 'unknown_error')
  const lower = msg.toLowerCase()
  const httpStatus =
    typeof anyErr?.status === 'number'
      ? anyErr.status
      : typeof anyErr?.statusCode === 'number'
        ? anyErr.statusCode
        : lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('rate limit')
          ? 429
          : null

  if (
    httpStatus === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit')
  ) {
    return { status: 'rate_limited', httpStatus: 429, errorCode: 'RATE_LIMITED' }
  }
  if (lower.includes('timeout') || lower.includes('aborted') || httpStatus === 504) {
    return { status: 'timed_out', httpStatus: httpStatus ?? 504, errorCode: 'TIMEOUT' }
  }
  return {
    status: 'failed',
    httpStatus,
    errorCode: String(anyErr?.code || anyErr?.name || 'PROVIDER_ERROR').slice(0, 128),
  }
}

export interface ExecuteMeteredCallInput<T> {
  userId: string
  projectId?: string | null
  sceneId?: string
  segmentId?: string
  route: string
  provider: ProviderRunVendor
  model: string
  operation: string
  /** Provide either quoteInput (dynamic rate card) OR flatCredits (fixed floor). */
  quoteInput?: QuoteGenerationInput
  flatCredits?: number
  estimatedCogsUsd?: number
  credentialSource?: 'platform' | 'byok'
  idempotencyKey?: string
  ref?: string | null
  holdTtlSeconds?: number
  meta?: Record<string, unknown>
  /** Execute the paid external API call. Receives the reserved holdId and runId. */
  execute: (ctx: {
    holdId: string | null
    runId: string | null
    reservedCredits: number
    quote: GenerationQuote | null
  }) => Promise<T>
  /**
   * Optional hook to compute final billable credits & units from the result
   * (e.g., actual generated video seconds or fallback to free Edge TTS = 0 credits).
   */
  resolveSettlement?: (
    result: T,
    initialQuote: GenerationQuote | null
  ) =>
    | Promise<{
        finalCredits?: number
        estimatedCogsUsd?: number
        unitsBilled?: number
        unitType?: string
        providerRequestId?: string
        skipCharge?: boolean
        meta?: Record<string, unknown>
      }>
    | {
        finalCredits?: number
        estimatedCogsUsd?: number
        unitsBilled?: number
        unitType?: string
        providerRequestId?: string
        skipCharge?: boolean
        meta?: Record<string, unknown>
      }
  /**
   * Optional predicate: return true if the error represents an async handoff
   * (e.g., Kling/Aggregator HTTP 202) where the hold MUST remain PENDING for the webhook to capture.
   */
  isAsyncPendingError?: (err: unknown) => boolean
}

export interface ExecuteMeteredCallResult<T> {
  result: T
  holdId: string | null
  runId: string | null
  ledgerId: string | null
  creditsCharged: number
  quote: GenerationQuote | null
}

/**
 * Full escrow-backed Reserve → Execute → Settle pipeline.
 * Fails closed before calling the provider if the user has insufficient active credits.
 */
export async function executeMeteredProviderCall<T>(
  input: ExecuteMeteredCallInput<T>
): Promise<ExecuteMeteredCallResult<T>> {
  const credentialSource = input.credentialSource ?? 'platform'
  let quote: GenerationQuote | null = null
  let reservedCredits = Math.max(0, Math.ceil(input.flatCredits ?? 0))
  let initialCogsUsd = input.estimatedCogsUsd ?? 0

  if (input.quoteInput) {
    quote = await resolveGenerationQuote({
      ...input.quoteInput,
      userKeyUsed: credentialSource === 'byok',
    })
    reservedCredits = quote.credits
    initialCogsUsd = quote.cogsUsd
  }

  const effectiveReason = credentialSource === 'byok' ? 'byok_platform_fee' : 'ai_usage'
  const effectiveRef = input.ref ?? input.projectId ?? null

  // 1. Atomic Escrow Hold BEFORE calling external provider
  let holdId: string | null = null
  if (reservedCredits > 0) {
    const reservation = await CreditService.reserveCredits({
      userId: input.userId,
      amount: reservedCredits,
      idempotencyKey: input.idempotencyKey,
      reason: effectiveReason,
      provider: input.provider,
      operation: input.operation,
      projectId: input.projectId ?? null,
      ref: effectiveRef,
      ttlSeconds: input.holdTtlSeconds ?? 900,
      meta: {
        route: input.route,
        model: input.model,
        credentialSource,
        ...(input.meta || {}),
      },
    })
    holdId = reservation.holdId
  }

  // 2. Write Pre-Dispatch Provider Run Telemetry
  const runId = await recordProviderRunStart({
    userId: input.userId,
    projectId: input.projectId ?? null,
    route: input.route,
    provider: input.provider,
    model: quote?.model || input.model,
    operation: quote?.operation || input.operation,
    credentialSource,
    holdId,
    estimatedCogsUsd: initialCogsUsd,
    unitsBilled: quote?.units ?? 1,
    unitType: quote?.metric ?? 'unit',
    meta: input.meta,
  })

  // 3. Execute External Provider
  let result: T
  try {
    result = await input.execute({ holdId, runId, reservedCredits, quote })
  } catch (err) {
    // Keep hold PENDING if this is an async job handoff (webhook will capture/release)
    if (input.isAsyncPendingError?.(err)) {
      throw err
    }

    const classified = classifyErrorStatus(err)
    if (holdId) {
      await CreditService.releaseHold({
        holdId,
        reason: classified.errorCode,
        meta: { httpStatus: classified.httpStatus },
      }).catch((relErr: unknown) =>
        console.error('[MeteredGateway] Failed to release hold on error:', relErr)
      )
    }
    await recordProviderRunFinish({
      runId,
      status: classified.status,
      httpStatus: classified.httpStatus,
      errorCode: classified.errorCode,
      estimatedCogsUsd: 0,
      chargedCredits: 0,
    })
    throw err
  }

  // 4. Settle Hold (Capture Final Credits or Release if skipped e.g. free Edge TTS fallback)
  const settlement = input.resolveSettlement
    ? await input.resolveSettlement(result, quote)
    : {}

  const finalCredits = settlement.skipCharge
    ? 0
    : settlement.finalCredits !== undefined
      ? Math.max(0, Math.ceil(settlement.finalCredits))
      : reservedCredits
  const finalCogsUsd =
    settlement.estimatedCogsUsd !== undefined ? settlement.estimatedCogsUsd : initialCogsUsd

  let ledgerId: string | null = null
  if (holdId) {
    if (finalCredits <= 0) {
      await CreditService.releaseHold({
        holdId,
        reason: 'zero_cost_settlement',
        meta: settlement.meta,
      })
    } else {
      const captured = await CreditService.captureHold({
        holdId,
        finalAmount: finalCredits,
        reason: effectiveReason,
        ref: effectiveRef,
        meta: {
          operation: quote?.operation || input.operation,
          model: quote?.model || input.model,
          provider: input.provider,
          credentialSource,
          projectId: input.projectId ?? undefined,
          segmentId: input.segmentId,
          sceneId: input.sceneId,
          ...(input.meta || {}),
          ...(settlement.meta || {}),
        },
      })
      ledgerId = captured.ledgerId
    }
  } else if (finalCredits > 0) {
    const charged = await CreditService.charge(
      input.userId,
      finalCredits,
      effectiveReason,
      effectiveRef,
      {
        operation: quote?.operation || input.operation,
        model: quote?.model || input.model,
        provider: input.provider,
        credentialSource,
        projectId: input.projectId ?? undefined,
        segmentId: input.segmentId,
        ...(input.meta || {}),
        ...(settlement.meta || {}),
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    )
    ledgerId = charged?.ledgerId ?? null
  }

  // 5. Finalize Telemetry & AIUsage Cost Log
  await recordProviderRunFinish({
    runId,
    status: 'succeeded',
    providerRequestId: settlement.providerRequestId ?? null,
    unitsBilled: settlement.unitsBilled ?? quote?.units ?? 1,
    unitType: settlement.unitType ?? quote?.metric ?? 'unit',
    estimatedCogsUsd: finalCogsUsd,
    ledgerId,
    chargedCredits: finalCredits,
    httpStatus: 200,
    meta: settlement.meta,
  })

  if (finalCredits > 0 || finalCogsUsd > 0) {
    await logProviderCost({
      userId: input.userId,
      operation: quote?.operation || input.operation,
      provider: input.provider === 'openai' ? 'openai' : 'sceneflow-ai',
      model: quote?.model || input.model,
      creditsCharged: finalCredits,
      providerCostUsd: finalCogsUsd,
      marginPercent: 0,
      imageCount: quote?.metric === 'per_image' ? quote.units : undefined,
      videoDurationSec: quote?.metric === 'per_second' ? quote.durationSeconds : undefined,
      projectId: input.projectId ?? undefined,
      sceneId: input.sceneId,
      segmentId: input.segmentId,
      requestId: settlement.providerRequestId ?? runId ?? undefined,
      byok: credentialSource === 'byok',
      resolution: quote?.resolution ?? null,
      vendor: input.provider,
      timestamp: new Date(),
    })
  }

  return {
    result,
    holdId,
    runId,
    ledgerId,
    creditsCharged: finalCredits,
    quote,
  }
}

/**
 * Settle an async job (e.g. Kling webhook, Aggregator webhook, Inngest Long-Take)
 * by capturing its reserved `holdId`, or falling back to an idempotent direct charge
 * if the job predated holds.
 */
export async function settleAsyncJobBilling(args: {
  userId: string
  holdId?: string | null
  runId?: string | null
  idempotencyKey: string
  credits: number
  provider: ProviderRunVendor
  model: string
  operation: string
  estimatedCogsUsd: number
  projectId?: string | null
  segmentId?: string
  credentialSource?: 'platform' | 'byok'
  succeeded: boolean
  providerRequestId?: string | null
  errorCode?: string | null
  meta?: Record<string, unknown>
}): Promise<{ ledgerId: string | null; creditsCharged: number }> {
  const credentialSource = args.credentialSource ?? 'platform'
  const reason = credentialSource === 'byok' ? 'byok_platform_fee' : 'ai_usage'

  if (!args.succeeded) {
    if (args.holdId) {
      await CreditService.releaseHold({
        holdId: args.holdId,
        reason: args.errorCode || 'async_job_failed',
        meta: args.meta,
      }).catch((e: unknown) => console.error('[MeteredGateway] Async releaseHold error:', e))
    }
    await recordProviderRunFinish({
      runId: args.runId ?? null,
      status: 'failed',
      providerRequestId: args.providerRequestId ?? null,
      estimatedCogsUsd: 0,
      chargedCredits: 0,
      errorCode: args.errorCode ?? 'ASYNC_FAILED',
      meta: args.meta,
    })
    return { ledgerId: null, creditsCharged: 0 }
  }

  let ledgerId: string | null = null
  let chargedCredits = Math.max(0, Math.ceil(args.credits))

  if (args.holdId) {
    const captured = await CreditService.captureHold({
      holdId: args.holdId,
      finalAmount: chargedCredits,
      reason,
      ref: args.projectId ?? args.segmentId ?? null,
      meta: {
        provider: args.provider,
        model: args.model,
        operation: args.operation,
        credentialSource,
        projectId: args.projectId ?? undefined,
        segmentId: args.segmentId,
        ...(args.meta || {}),
      },
    })
    ledgerId = captured.ledgerId
    chargedCredits = captured.charged
  } else if (chargedCredits > 0) {
    const charged = await CreditService.charge(
      args.userId,
      chargedCredits,
      reason,
      args.projectId ?? args.segmentId ?? null,
      {
        provider: args.provider,
        model: args.model,
        operation: args.operation,
        credentialSource,
        projectId: args.projectId ?? undefined,
        segmentId: args.segmentId,
        ...(args.meta || {}),
      },
      { idempotencyKey: args.idempotencyKey }
    )
    ledgerId = charged?.ledgerId ?? null
  }

  await recordProviderRunFinish({
    runId: args.runId ?? null,
    status: 'succeeded',
    providerRequestId: args.providerRequestId ?? null,
    estimatedCogsUsd: args.estimatedCogsUsd,
    ledgerId,
    chargedCredits,
    httpStatus: 200,
    meta: args.meta,
  })

  if (chargedCredits > 0 || args.estimatedCogsUsd > 0) {
    await logProviderCost({
      userId: args.userId,
      operation: args.operation,
      provider: args.provider === 'openai' ? 'openai' : 'sceneflow-ai',
      model: args.model,
      creditsCharged: chargedCredits,
      providerCostUsd: args.estimatedCogsUsd,
      marginPercent: 0,
      projectId: args.projectId ?? undefined,
      segmentId: args.segmentId,
      requestId: args.providerRequestId ?? args.runId ?? undefined,
      byok: credentialSource === 'byok',
      vendor: args.provider,
      timestamp: new Date(),
    })
  }

  return { ledgerId, creditsCharged: chargedCredits }
}
