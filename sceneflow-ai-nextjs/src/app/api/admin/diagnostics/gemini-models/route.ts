import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { generateText } from '@/lib/vertexai/gemini'
import { getRecentModelDowngrades } from '@/lib/vertexai/modelTelemetry'
import {
  GEMINI_TEXT_MODEL_CANDIDATES,
  getGeminiTextModel,
} from '@/lib/config/modelConfig'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

type ProbeResult = {
  model: string
  available: boolean
  httpStatus?: number
  latencyMs?: number
  error?: string
}

/**
 * Probes each candidate text model with a minimal prompt so we can see which
 * ids this Vertex project actually serves. Model fallback is disabled, since a
 * fallback would report success for a model that does not exist.
 */
async function probeModel(model: string): Promise<ProbeResult> {
  const startedAt = Date.now()
  try {
    await generateText('Reply with the single word: ok', {
      model,
      maxOutputTokens: 8,
      temperature: 0,
      thinkingLevel: 'minimal',
      responseMimeType: 'text/plain',
      timeoutMs: 20000,
      maxRetries: 0,
      disableModelFallback: true,
    })
    return { model, available: true, latencyMs: Date.now() - startedAt }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const statusMatch = message.match(/Vertex AI error (\d{3})/)
    return {
      model,
      available: false,
      httpStatus: statusMatch ? Number(statusMatch[1]) : undefined,
      latencyMs: Date.now() - startedAt,
      error: message.slice(0, 300),
    }
  }
}

export async function GET() {
  const { authorized } = await requireAdminSession()
  if (!authorized) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const results: ProbeResult[] = []
  for (const model of GEMINI_TEXT_MODEL_CANDIDATES) {
    results.push(await probeModel(model))
  }

  const available = results.filter((r) => r.available).map((r) => r.model)

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    configuredDefaults: {
      pro: getGeminiTextModel('pro'),
      flash: getGeminiTextModel('flash'),
    },
    /** Best candidate this project can actually serve, in ranked order. */
    bestAvailable: available[0] ?? null,
    available,
    results,
    recentDowngrades: getRecentModelDowngrades(),
  })
}
