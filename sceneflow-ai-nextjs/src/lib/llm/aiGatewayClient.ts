/**
 * Vercel AI Gateway Inference Client (Multi-Provider Text Routing)
 *
 * Uses `AI_GATEWAY_API_KEY` against `https://ai-gateway.vercel.sh/v1/chat/completions`
 * so SceneFlow can invoke cross-provider models (e.g. `anthropic/claude-sonnet-4.6`,
 * `openai/gpt-5`, `google/gemini-3.8-flash`) for Tier 1 creative pitching and unbiased
 * Admin MIUA cross-model judging, without extra runtime SDK weight.
 */

import { recordLlmTelemetry } from '@/lib/vertexai/llmTelemetry'
import type { TextGenerationResult } from '@/lib/vertexai/gemini'

const AI_GATEWAY_CHAT_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'

export interface AiGatewayOptions {
  /** Gateway model slug, e.g. 'anthropic/claude-sonnet-4.6' or 'google/gemini-3.8-flash' */
  model: string
  systemInstruction?: string
  temperature?: number
  topP?: number
  maxOutputTokens?: number
  responseMimeType?: 'text/plain' | 'application/json'
  timeoutMs?: number
  surface?: string
  projectId?: string
  userId?: string
}

export function isAiGatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim())
}

/**
 * Normalize bare model IDs into Vercel AI Gateway `provider/model` slugs when needed.
 */
export function toAiGatewayModelSlug(modelId: string): string {
  const trimmed = modelId.trim()
  if (trimmed.includes('/')) return trimmed
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('gemini-')) return `google/${trimmed}`
  if (lower.startsWith('claude-')) return `anthropic/${trimmed}`
  if (lower.startsWith('gpt-') || lower.startsWith('o1') || lower.startsWith('o3') || lower.startsWith('o4')) {
    return `openai/${trimmed}`
  }
  if (lower.startsWith('deepseek-')) return `deepseek/${trimmed}`
  return trimmed
}

export async function generateTextViaAiGateway(
  prompt: string,
  options: AiGatewayOptions
): Promise<TextGenerationResult> {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY is not configured')
  }

  const startTime = Date.now()
  const modelSlug = toAiGatewayModelSlug(options.model)
  const messages: Array<{ role: 'system' | 'user'; content: string }> = []
  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction })
  }
  messages.push({ role: 'user', content: prompt })

  const body: Record<string, unknown> = {
    model: modelSlug,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxOutputTokens ?? 8192,
  }
  if (typeof options.topP === 'number') {
    body.top_p = options.topP
  }
  if (options.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(AI_GATEWAY_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText)
    recordLlmTelemetry({
      surface: options.surface || 'ai_gateway',
      providerBackend: 'ai_gateway',
      requestedModel: modelSlug,
      servedModel: modelSlug,
      latencyMs: Date.now() - startTime,
      status: 'error',
      errorCode: `HTTP_${response.status}`,
      projectId: options.projectId,
      userId: options.userId,
    })
    throw new Error(`Vercel AI Gateway error ${response.status}: ${errText}`)
  }

  const data = (await response.json()) as any
  const choice = data?.choices?.[0]
  const rawContent = choice?.message?.content
  const text =
    typeof rawContent === 'string'
      ? rawContent.trim()
      : Array.isArray(rawContent)
        ? rawContent.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('').trim()
        : ''

  const finishReason =
    choice?.finish_reason === 'length'
      ? 'MAX_TOKENS'
      : choice?.finish_reason === 'stop'
        ? 'STOP'
        : choice?.finish_reason

  const usageMetadata = data?.usage
    ? {
        promptTokenCount: Number(data.usage.prompt_tokens || 0),
        cachedContentTokenCount: Number(data.usage.prompt_tokens_details?.cached_tokens || 0),
        candidatesTokenCount: Number(data.usage.completion_tokens || 0),
        thoughtsTokenCount: Number(data.usage.completion_tokens_details?.reasoning_tokens || 0),
        totalTokenCount: Number(data.usage.total_tokens || 0),
      }
    : undefined

  recordLlmTelemetry({
    surface: options.surface || 'ai_gateway',
    providerBackend: 'ai_gateway',
    requestedModel: modelSlug,
    servedModel: typeof data?.model === 'string' ? data.model : modelSlug,
    downgraded: false,
    usedCache: Boolean(usageMetadata?.cachedContentTokenCount),
    usageMetadata,
    latencyMs: Date.now() - startTime,
    finishReason,
    status: 'success',
    projectId: options.projectId,
    userId: options.userId,
  })

  return {
    text,
    finishReason,
    modelId: typeof data?.model === 'string' ? data.model : modelSlug,
    requestedModelId: modelSlug,
    downgraded: false,
    usageMetadata,
  }
}
