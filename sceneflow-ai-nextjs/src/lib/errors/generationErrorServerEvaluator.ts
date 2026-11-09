import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { generateText } from '@/lib/vertexai/gemini'
import {
  evaluateGenerationError,
  extractRawErrorText,
  type EvaluateGenerationErrorInput,
  type EvaluatedGenerationError,
  type GenerationRecoveryAction,
} from '@/lib/errors/generationErrorIntelligence'

const ALLOWED_AI_ACTIONS = new Set<GenerationRecoveryAction>([
  'rerun',
  'retry_i2v',
  'rewrite_director',
  'switch_creative',
  'regenerate_previous',
  'open_references',
])

const AI_ACTION_LABELS: Record<GenerationRecoveryAction, { still: string; clip: string }> = {
  rerun: { still: 'Rerun Still', clip: 'Rerun Clip' },
  retry_i2v: { still: 'Rerun Still', clip: 'Retry with Start Frame' },
  rewrite_director: { still: 'Shot Director', clip: 'Rewrite for Safety' },
  switch_creative: { still: 'Switch to Creative', clip: 'Switch to Creative' },
  regenerate_previous: { still: 'Rerun Still', clip: 'Regenerate Previous Shot' },
  open_references: { still: 'Review References', clip: 'Review References' },
  top_up_credits: { still: 'View Credits', clip: 'View Credits' },
  refresh_session: { still: 'Refresh Page', clip: 'Refresh Page' },
  dismiss: { still: 'Dismiss', clip: 'Dismiss' },
}

const EVAL_CACHE_MAX = 100
const evalCache = new Map<string, EvaluatedGenerationError>()

const SYSTEM_PROMPT = `You are SceneFlow's UX error translator for film creators generating shot stills and video clips.
Given a raw upstream API error message, return ONLY valid JSON:
{"title":"2-5 word plain-English headline","explanation":"1 concise sentence explaining what happened in plain filmmaker-friendly language without technical jargon, JSON, model IDs, or env vars.","suggestion":"1 concise actionable next step for the creator.","ctaAction":"rerun|retry_i2v|rewrite_director|switch_creative|open_references"}

Rules:
- Never mention Vercel, API keys, environment variables, HTTP status codes, JSON, Vertex, or stack traces.
- Keep explanation + suggestion under 260 characters combined.
- Default ctaAction to "rerun" when the error is transient, internal, or unclear.`

function isAiEvalEnabled(): boolean {
  if (process.env.NODE_ENV === 'test' && process.env.GENERATION_ERROR_AI_EVAL !== 'true') {
    return false
  }
  const v = process.env.GENERATION_ERROR_AI_EVAL
  if (v === 'false' || v === '0') return false
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.VERTEX_PROJECT_ID)
}

/**
 * Server-side intelligent evaluator:
 * 1. Runs fast deterministic `evaluateGenerationError` (<1ms) for all well-known categories.
 * 2. When an error is `unexpected` or `invalid_request` with an opaque upstream payload,
 *    runs a fast bounded Gemini Flash micro-pass (<=2.8s, cached) to produce a specific,
 *    creator-friendly explanation and CTA, falling back cleanly if unavailable.
 */
export async function evaluateGenerationErrorForApi(
  input: EvaluateGenerationErrorInput
): Promise<EvaluatedGenerationError> {
  const base = evaluateGenerationError(input)
  if (base.category !== 'unexpected' && base.category !== 'invalid_request') {
    return base
  }

  const rawText = extractRawErrorText(input.rawError)
  if (!rawText || rawText.length < 12 || !isAiEvalEnabled()) {
    return base
  }

  const cacheKey = `${input.mediaType}:${input.generationMethod || ''}:${rawText.slice(0, 300)}`
  const cached = evalCache.get(cacheKey)
  if (cached) return { ...cached, technicalDetails: base.technicalDetails }

  try {
    const result = await generateText(
      JSON.stringify({
        mediaType: input.mediaType,
        generationMethod: input.generationMethod || undefined,
        provider: input.provider || undefined,
        rawError: rawText.slice(0, 800),
      }),
      {
        model: getGeminiTextModel('flash'),
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 256,
        timeoutMs: 2800,
        thinkingLevel: 'minimal',
        maxRetries: 0,
      }
    )

    const parsed = JSON.parse(result.text.replace(/```json\s*|\s*```/g, '').trim()) as {
      title?: string
      explanation?: string
      suggestion?: string
      ctaAction?: GenerationRecoveryAction
    }

    const title = parsed.title?.trim()
    const explanation = parsed.explanation?.trim()
    const suggestion = parsed.suggestion?.trim()
    if (!title || !explanation || !suggestion) return base

    const action: GenerationRecoveryAction =
      parsed.ctaAction && ALLOWED_AI_ACTIONS.has(parsed.ctaAction)
        ? parsed.ctaAction
        : base.primaryCta.action

    const enriched: EvaluatedGenerationError = {
      ...base,
      title: title.slice(0, 60),
      explanation: explanation.slice(0, 220),
      suggestion: suggestion.slice(0, 180),
      shortSummary: `${title.slice(0, 48)} — ${AI_ACTION_LABELS[action][input.mediaType]}`,
      primaryCta: {
        action,
        label: AI_ACTION_LABELS[action][input.mediaType],
      },
      recommendSupportEscalation: action === 'rerun' || base.recommendSupportEscalation,
    }

    if (evalCache.size >= EVAL_CACHE_MAX) {
      const oldest = evalCache.keys().next().value
      if (oldest) evalCache.delete(oldest)
    }
    evalCache.set(cacheKey, enriched)
    return enriched
  } catch {
    return base
  }
}

export function clearGenerationErrorEvalCache(): void {
  evalCache.clear()
}
