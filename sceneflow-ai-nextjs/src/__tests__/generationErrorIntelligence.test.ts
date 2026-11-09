import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: vi.fn(),
}))

import { generateText } from '@/lib/vertexai/gemini'
import { evaluateGenerationError } from '@/lib/errors/generationErrorIntelligence'
import {
  clearGenerationErrorEvalCache,
  evaluateGenerationErrorForApi,
} from '@/lib/errors/generationErrorServerEvaluator'

describe('evaluateGenerationError', () => {
  it('evaluates FTV content policy blocks with Retry with Start Frame CTA', () => {
    const raw =
      'Omni video generation failed: [content_blocked] Request blocked for an unspecified policy reason.'
    const res = evaluateGenerationError({
      mediaType: 'clip',
      rawError: raw,
      statusCode: 422,
      errorCode: 'CONTENT_POLICY_VIOLATION',
      generationMethod: 'FTV',
      hasStartFrame: true,
      isFTVRelated: true,
    })

    expect(res.category).toBe('ftv_content_policy')
    expect(res.title).toBe('Two-Frame Transition Blocked')
    expect(res.primaryCta).toEqual({ action: 'retry_i2v', label: 'Retry with Start Frame' })
    expect(res.secondaryCta).toEqual({ action: 'rewrite_director', label: 'Shot Director' })
    expect(res.noCreditsCharged).toBe(true)
    expect(res.canReportToSupport).toBe(true)
    expect(res.explanation).not.toContain('content_blocked')
    expect(res.technicalDetails).toContain('content_blocked')
  })

  it('evaluates general content policy blocks on Vertex vs Creative', () => {
    const vertexRes = evaluateGenerationError({
      mediaType: 'clip',
      rawError: 'Content policy: Vertex blocked this generation.',
      statusCode: 422,
      errorCode: 'CONTENT_POLICY_VIOLATION',
      provider: 'vertex',
    })
    expect(vertexRes.category).toBe('content_policy')
    expect(vertexRes.primaryCta).toEqual({
      action: 'rewrite_director',
      label: 'Rewrite for Safety',
    })
    expect(vertexRes.secondaryCta).toEqual({
      action: 'switch_creative',
      label: 'Switch to Creative',
    })

    const klingRes = evaluateGenerationError({
      mediaType: 'clip',
      rawError: 'Blocked by safety guard',
      statusCode: 422,
      errorCode: 'CONTENT_POLICY_VIOLATION',
      provider: 'kling',
    })
    expect(klingRes.secondaryCta).toEqual({ action: 'rerun', label: 'Rerun Clip' })
  })

  it('evaluates identity reference declines on stills', () => {
    const res = evaluateGenerationError({
      mediaType: 'still',
      rawError: 'Google rendered this still without the character references.',
      statusCode: 422,
      errorCode: 'IMAGE_SAFETY',
    })
    expect(res.category).toBe('identity_declined')
    expect(res.primaryCta).toEqual({ action: 'rewrite_director', label: 'Shot Director' })
    expect(res.secondaryCta).toEqual({ action: 'switch_creative', label: 'Switch to Creative' })
  })

  it('evaluates rate limit 429 errors with wait time and Rerun + Support escalation', () => {
    const res = evaluateGenerationError({
      mediaType: 'clip',
      rawError: 'HTTP 429: RESOURCE_EXHAUSTED — Please wait 60 seconds and try again.',
      statusCode: 429,
    })
    expect(res.category).toBe('rate_limited')
    expect(res.retryAfterSeconds).toBe(60)
    expect(res.explanation).toContain('60s')
    expect(res.primaryCta).toEqual({ action: 'rerun', label: 'Rerun Clip' })
    expect(res.canReportToSupport).toBe(true)
    expect(res.recommendSupportEscalation).toBe(true)
  })

  it('hides server/env jargon on provider configuration errors while recommending Support escalation', () => {
    const raw =
      'Multiplatform video is not configured on the server. Set VIDEO_AGGREGATOR_API_KEY in Vercel.'
    const res = evaluateGenerationError({
      mediaType: 'clip',
      rawError: raw,
      statusCode: 503,
      errorCode: 'AGGREGATOR_NOT_CONFIGURED',
    })
    expect(res.category).toBe('provider_unavailable')
    expect(res.explanation).not.toContain('VIDEO_AGGREGATOR_API_KEY')
    expect(res.explanation).not.toContain('Vercel')
    expect(res.primaryCta).toEqual({ action: 'rerun', label: 'Rerun Clip' })
    expect(res.canReportToSupport).toBe(true)
    expect(res.recommendSupportEscalation).toBe(true)
    expect(res.technicalDetails).toContain('VIDEO_AGGREGATOR_API_KEY')
  })

  it('evaluates expired extension references, timeouts, credits, and cancellations', () => {
    const ext = evaluateGenerationError({
      mediaType: 'clip',
      rawError: 'Veo extension reference expired (~48h).',
      errorCode: 'VEO_EXT_REF_REQUIRED',
    })
    expect(ext.category).toBe('extension_ref_expired')
    expect(ext.primaryCta.action).toBe('regenerate_previous')

    const timeout = evaluateGenerationError({
      mediaType: 'still',
      rawError: 'Upstream DEADLINE_EXCEEDED after 180s',
      statusCode: 504,
    })
    expect(timeout.category).toBe('timeout')
    expect(timeout.primaryCta).toEqual({ action: 'rerun', label: 'Rerun Still' })
    expect(timeout.recommendSupportEscalation).toBe(true)

    const credits = evaluateGenerationError({
      mediaType: 'clip',
      rawError: 'Insufficient credits',
      statusCode: 402,
    })
    expect(credits.category).toBe('insufficient_credits')
    expect(credits.primaryCta.action).toBe('top_up_credits')

    const cancelled = evaluateGenerationError({
      mediaType: 'still',
      rawError: 'Stills Agent cancelled',
      statusCode: 499,
    })
    expect(cancelled.category).toBe('cancelled')
    expect(cancelled.canReportToSupport).toBe(false)
  })

  it('evaluates unexpected crashes cleanly with Rerun CTA and Support escalation', () => {
    const raw = 'TypeError: Cannot read properties of undefined (reading "candidates")'
    const res = evaluateGenerationError({
      mediaType: 'still',
      rawError: raw,
      statusCode: 500,
    })
    expect(res.category).toBe('unexpected')
    expect(res.title).toBe('Still Generation Failed')
    expect(res.explanation).not.toContain('TypeError')
    expect(res.primaryCta).toEqual({ action: 'rerun', label: 'Rerun Still' })
    expect(res.canReportToSupport).toBe(true)
    expect(res.recommendSupportEscalation).toBe(true)
    expect(res.technicalDetails).toBe(raw)
  })
})

describe('evaluateGenerationErrorForApi', () => {
  beforeEach(() => {
    clearGenerationErrorEvalCache()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('enriches novel unexpected errors with Gemini Flash when enabled and falls back cleanly on error', async () => {
    vi.stubEnv('GENERATION_ERROR_AI_EVAL', 'true')
    vi.stubEnv('VERTEX_PROJECT_ID', 'test-proj')

    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify({
        title: 'Unsupported Aspect Ratio',
        explanation: 'The selected video model only supports 16:9 or 9:16 framing for this shot.',
        suggestion: 'Switch aspect ratio to 16:9 and rerun the clip.',
        ctaAction: 'rerun',
      }),
      finishReason: 'STOP',
    } as any)

    const enriched = await evaluateGenerationErrorForApi({
      mediaType: 'clip',
      rawError: 'Vertex AI Interactions error 400: unsupported aspect_ratio 21:9 for task',
      statusCode: 400,
    })

    expect(enriched.title).toBe('Unsupported Aspect Ratio')
    expect(enriched.explanation).toContain('16:9')
    expect(enriched.primaryCta).toEqual({ action: 'rerun', label: 'Rerun Clip' })
    expect(enriched.canReportToSupport).toBe(true)
    expect(enriched.technicalDetails).toContain('aspect_ratio 21:9')

    clearGenerationErrorEvalCache()
    vi.mocked(generateText).mockRejectedValueOnce(new Error('Flash timeout'))

    const fallback = await evaluateGenerationErrorForApi({
      mediaType: 'clip',
      rawError: 'Vertex AI Interactions error 400: opaque failure',
      statusCode: 400,
    })
    expect(fallback.category).toBe('invalid_request')
    expect(fallback.primaryCta.action).toBe('rerun')
  })
})
