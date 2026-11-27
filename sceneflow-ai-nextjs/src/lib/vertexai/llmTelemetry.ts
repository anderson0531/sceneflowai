/**
 * Persistent LLM Telemetry & Unit-Economics Recorder
 *
 * Records every Vertex AI Gemini and Vercel AI Gateway text call into:
 * 1. A fast in-memory ring buffer (for diagnostics & unit tests)
 * 2. Persistent `ai_usage` rows (`category: 'text'`) via non-blocking write,
 *    automatically lighting up FinanceReportCard and Admin MIUA cost projections.
 */

import { estimateLlmCostUsd, type LlmTokenUsage } from '@/lib/credits/llmPricing'
import { isUuid } from '@/lib/auth/isUuid'

const SYSTEM_TELEMETRY_USER_ID = '00000000-0000-4000-8000-000000000000'
const MAX_RECENT_EVENTS = 200

export interface LlmTelemetryEvent {
  at: string
  surface: string
  providerBackend: 'vertex' | 'ai_gateway'
  requestedModel: string
  servedModel: string
  downgraded: boolean
  usedCache: boolean
  promptTokens: number
  cachedTokens: number
  outputTokens: number
  thoughtsTokens: number
  latencyMs: number
  finishReason?: string
  truncated: boolean
  estimatedCostUsd: number
  status: 'success' | 'error'
  errorCode?: string
  projectId?: string
  userId?: string
}

export interface SurfaceTelemetryRollup {
  surface: string
  calls: number
  promptTokens: number
  cachedTokens: number
  outputTokens: number
  thoughtsTokens: number
  totalCostUsd: number
  avgLatencyMs: number
  downgradeCount: number
  truncationCount: number
  cacheHitCount: number
  models: Record<string, number>
}

export interface LlmTelemetrySummary {
  periodDays: number
  source: 'database' | 'memory'
  totalCalls: number
  totalPromptTokens: number
  totalCachedTokens: number
  totalOutputTokens: number
  totalThoughtsTokens: number
  totalCostUsd: number
  avgLatencyMs: number
  downgradeRate: number
  truncationRate: number
  cacheHitRate: number
  bySurface: SurfaceTelemetryRollup[]
  byModel: Array<{
    model: string
    calls: number
    promptTokens: number
    cachedTokens: number
    outputTokens: number
    thoughtsTokens: number
    totalCostUsd: number
    avgLatencyMs: number
    truncationRate: number
  }>
}

const recentTelemetry: LlmTelemetryEvent[] = []

export function getRecentLlmTelemetry(): LlmTelemetryEvent[] {
  return [...recentTelemetry]
}

export function clearRecentLlmTelemetry(): void {
  recentTelemetry.length = 0
}

/**
 * Record an LLM inference call. Always updates the in-memory ring buffer and
 * schedules a non-blocking DB write to `ai_usage` (unless in unit test mode).
 */
export function recordLlmTelemetry(input: {
  surface?: string
  providerBackend?: 'vertex' | 'ai_gateway'
  requestedModel: string
  servedModel: string
  downgraded?: boolean
  usedCache?: boolean
  usageMetadata?: LlmTokenUsage | null
  latencyMs: number
  finishReason?: string
  status?: 'success' | 'error'
  errorCode?: string
  projectId?: string
  userId?: string
  persistToDb?: boolean
}): LlmTelemetryEvent {
  const usage = input.usageMetadata || {}
  const promptTokens = Math.max(0, usage.promptTokenCount ?? 0)
  const cachedTokens = Math.max(0, usage.cachedContentTokenCount ?? 0)
  const outputTokens = Math.max(0, usage.candidatesTokenCount ?? 0)
  const thoughtsTokens = Math.max(0, usage.thoughtsTokenCount ?? 0)
  const estimatedCostUsd = estimateLlmCostUsd(input.servedModel, {
    promptTokenCount: promptTokens,
    cachedContentTokenCount: cachedTokens,
    candidatesTokenCount: outputTokens,
    thoughtsTokenCount: thoughtsTokens,
  })
  const finishReason = input.finishReason
  const truncated = finishReason === 'MAX_TOKENS'

  const event: LlmTelemetryEvent = {
    at: new Date().toISOString(),
    surface: (input.surface || 'general').trim() || 'general',
    providerBackend: input.providerBackend || 'vertex',
    requestedModel: input.requestedModel,
    servedModel: input.servedModel,
    downgraded: Boolean(input.downgraded ?? input.requestedModel !== input.servedModel),
    usedCache: Boolean(input.usedCache || cachedTokens > 0),
    promptTokens,
    cachedTokens,
    outputTokens,
    thoughtsTokens,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    finishReason,
    truncated,
    estimatedCostUsd,
    status: input.status || 'success',
    errorCode: input.errorCode,
    projectId: input.projectId,
    userId: input.userId,
  }

  recentTelemetry.push(event)
  if (recentTelemetry.length > MAX_RECENT_EVENTS) {
    recentTelemetry.splice(0, recentTelemetry.length - MAX_RECENT_EVENTS)
  }

  const shouldPersist =
    input.persistToDb !== false &&
    process.env.NODE_ENV !== 'test' &&
    !process.env.VITEST

  if (shouldPersist) {
    scheduleBackgroundPersist(event)
  }

  return event
}

function scheduleBackgroundPersist(event: LlmTelemetryEvent): void {
  // Prefer Next.js `after()` so Vercel serverless lambdas keep the runtime alive
  // until the telemetry row flushes, falling back cleanly outside request scopes.
  void (async () => {
    try {
      const nextServer = await import('next/server')
      if (typeof nextServer.after === 'function') {
        nextServer.after(async () => {
          await persistLlmTelemetryToDb(event)
        })
        return
      }
    } catch {
      // Outside Next request scope (e.g., Inngest worker or script) — fall through
    }
    await persistLlmTelemetryToDb(event)
  })()
}

async function persistLlmTelemetryToDb(event: LlmTelemetryEvent): Promise<void> {
  try {
    const [{ AIUsage }] = await Promise.all([import('@/models')])
    const userId = event.userId && isUuid(event.userId)
      ? event.userId
      : SYSTEM_TELEMETRY_USER_ID

    await AIUsage.create({
      user_id: userId,
      route: `/api/llm/${event.surface.replace(/[^a-z0-9_-]/gi, '_')}`,
      provider: 'sceneflow-ai',
      category: 'text',
      model: event.servedModel.slice(0, 100),
      input_tokens: event.promptTokens,
      output_tokens: event.outputTokens + event.thoughtsTokens,
      image_count: 0,
      cogs_usd: event.estimatedCostUsd,
      markup_multiplier: 1,
      charged_credits: 0,
      byok: false,
      status: event.status,
      error_code: event.errorCode ? event.errorCode.slice(0, 100) : null,
      meta: {
        operation: `llm_${event.surface}`,
        surface: event.surface,
        providerBackend: event.providerBackend,
        requestedModel: event.requestedModel,
        servedModel: event.servedModel,
        downgraded: event.downgraded,
        usedCache: event.usedCache,
        cachedTokens: event.cachedTokens,
        outputTokensOnly: event.outputTokens,
        thoughtsTokens: event.thoughtsTokens,
        latencyMs: event.latencyMs,
        finishReason: event.finishReason ?? null,
        truncated: event.truncated,
        projectId: event.projectId ?? null,
      },
    } as any)
  } catch (err) {
    // Non-fatal: telemetry must never disrupt generation
    if (process.env.DEBUG_LLM_TELEMETRY === 'true') {
      console.warn('[LLMTelemetry] DB persist skipped:', err instanceof Error ? err.message : err)
    }
  }
}

/**
 * Summarize a list of telemetry events (shared by DB query & in-memory fallback).
 */
export function summarizeLlmTelemetryEvents(
  events: LlmTelemetryEvent[],
  periodDays: number,
  source: 'database' | 'memory'
): LlmTelemetrySummary {
  const surfaceMap = new Map<string, SurfaceTelemetryRollup & { latencySum: number }>()
  const modelMap = new Map<
    string,
    {
      model: string
      calls: number
      promptTokens: number
      cachedTokens: number
      outputTokens: number
      thoughtsTokens: number
      totalCostUsd: number
      latencySum: number
      truncationCount: number
    }
  >()

  let totalPromptTokens = 0
  let totalCachedTokens = 0
  let totalOutputTokens = 0
  let totalThoughtsTokens = 0
  let totalCostUsd = 0
  let totalLatency = 0
  let downgradeCount = 0
  let truncationCount = 0
  let cacheHitCount = 0

  for (const ev of events) {
    totalPromptTokens += ev.promptTokens
    totalCachedTokens += ev.cachedTokens
    totalOutputTokens += ev.outputTokens
    totalThoughtsTokens += ev.thoughtsTokens
    totalCostUsd += ev.estimatedCostUsd
    totalLatency += ev.latencyMs
    if (ev.downgraded) downgradeCount += 1
    if (ev.truncated) truncationCount += 1
    if (ev.usedCache) cacheHitCount += 1

    const s = surfaceMap.get(ev.surface) ?? {
      surface: ev.surface,
      calls: 0,
      promptTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      thoughtsTokens: 0,
      totalCostUsd: 0,
      avgLatencyMs: 0,
      downgradeCount: 0,
      truncationCount: 0,
      cacheHitCount: 0,
      models: {},
      latencySum: 0,
    }
    s.calls += 1
    s.promptTokens += ev.promptTokens
    s.cachedTokens += ev.cachedTokens
    s.outputTokens += ev.outputTokens
    s.thoughtsTokens += ev.thoughtsTokens
    s.totalCostUsd += ev.estimatedCostUsd
    s.latencySum += ev.latencyMs
    if (ev.downgraded) s.downgradeCount += 1
    if (ev.truncated) s.truncationCount += 1
    if (ev.usedCache) s.cacheHitCount += 1
    s.models[ev.servedModel] = (s.models[ev.servedModel] || 0) + 1
    surfaceMap.set(ev.surface, s)

    const m = modelMap.get(ev.servedModel) ?? {
      model: ev.servedModel,
      calls: 0,
      promptTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      thoughtsTokens: 0,
      totalCostUsd: 0,
      latencySum: 0,
      truncationCount: 0,
    }
    m.calls += 1
    m.promptTokens += ev.promptTokens
    m.cachedTokens += ev.cachedTokens
    m.outputTokens += ev.outputTokens
    m.thoughtsTokens += ev.thoughtsTokens
    m.totalCostUsd += ev.estimatedCostUsd
    m.latencySum += ev.latencyMs
    if (ev.truncated) m.truncationCount += 1
    modelMap.set(ev.servedModel, m)
  }

  const totalCalls = events.length
  const bySurface: SurfaceTelemetryRollup[] = Array.from(surfaceMap.values())
    .map(({ latencySum, ...rest }) => ({
      ...rest,
      totalCostUsd: Number(rest.totalCostUsd.toFixed(6)),
      avgLatencyMs: rest.calls > 0 ? Math.round(latencySum / rest.calls) : 0,
    }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)

  const byModel = Array.from(modelMap.values())
    .map(({ latencySum, truncationCount: tc, ...rest }) => ({
      ...rest,
      totalCostUsd: Number(rest.totalCostUsd.toFixed(6)),
      avgLatencyMs: rest.calls > 0 ? Math.round(latencySum / rest.calls) : 0,
      truncationRate: rest.calls > 0 ? Number((tc / rest.calls).toFixed(4)) : 0,
    }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)

  return {
    periodDays,
    source,
    totalCalls,
    totalPromptTokens,
    totalCachedTokens,
    totalOutputTokens,
    totalThoughtsTokens,
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
    avgLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
    downgradeRate: totalCalls > 0 ? Number((downgradeCount / totalCalls).toFixed(4)) : 0,
    truncationRate: totalCalls > 0 ? Number((truncationCount / totalCalls).toFixed(4)) : 0,
    cacheHitRate: totalCalls > 0 ? Number((cacheHitCount / totalCalls).toFixed(4)) : 0,
    bySurface,
    byModel,
  }
}

/**
 * Load trailing N-day LLM telemetry from Postgres `ai_usage` (falling back to in-memory ring buffer).
 */
export async function loadLlmTelemetrySummary(periodDays = 30): Promise<LlmTelemetrySummary> {
  const since = new Date(Date.now() - Math.max(1, periodDays) * 24 * 60 * 60 * 1000)

  try {
    const [{ Op }, { AIUsage }] = await Promise.all([import('sequelize'), import('@/models')])
    const rows = await AIUsage.findAll({
      where: {
        category: 'text',
        created_at: { [Op.gte]: since },
      },
      order: [['created_at', 'DESC']],
      limit: 5000,
    })

    const events: LlmTelemetryEvent[] = rows.map((row: any) => {
      const meta = (row.meta || {}) as Record<string, unknown>
      const thoughtsTokens = Number(meta.thoughtsTokens || 0)
      const outputTokensOnly =
        meta.outputTokensOnly !== undefined
          ? Number(meta.outputTokensOnly)
          : Math.max(0, Number(row.output_tokens || 0) - thoughtsTokens)
      return {
        at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        surface: String(meta.surface || row.route?.replace(/^\/api\/llm\//, '') || 'general'),
        providerBackend: meta.providerBackend === 'ai_gateway' ? 'ai_gateway' : 'vertex',
        requestedModel: String(meta.requestedModel || row.model || 'unknown'),
        servedModel: String(meta.servedModel || row.model || 'unknown'),
        downgraded: Boolean(meta.downgraded),
        usedCache: Boolean(meta.usedCache),
        promptTokens: Number(row.input_tokens || 0),
        cachedTokens: Number(meta.cachedTokens || 0),
        outputTokens: outputTokensOnly,
        thoughtsTokens,
        latencyMs: Number(meta.latencyMs || 0),
        finishReason: meta.finishReason ? String(meta.finishReason) : undefined,
        truncated: Boolean(meta.truncated),
        estimatedCostUsd: Number(row.cogs_usd || 0),
        status: row.status === 'error' ? 'error' : 'success',
        errorCode: row.error_code ? String(row.error_code) : undefined,
        projectId: meta.projectId ? String(meta.projectId) : undefined,
        userId: row.user_id ? String(row.user_id) : undefined,
      }
    })

    return summarizeLlmTelemetryEvents(events, periodDays, 'database')
  } catch {
    return summarizeLlmTelemetryEvents(getRecentLlmTelemetry(), periodDays, 'memory')
  }
}
