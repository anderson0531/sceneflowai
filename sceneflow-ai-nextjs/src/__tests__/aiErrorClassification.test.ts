import { describe, expect, it } from 'vitest'
import {
  classifyAiError,
  upstreamStatusOf,
} from '@/lib/errors/aiErrorClassification'
import { ImagenRetiredError } from '@/lib/vertexai/client'

describe('upstreamStatusOf', () => {
  it('extracts the upstream status from provider error messages', () => {
    expect(upstreamStatusOf(new Error('Vertex AI error 429: quota'))).toBe(429)
    expect(upstreamStatusOf(new Error('Vertex Gemini Image error 404: NOT_FOUND'))).toBe(404)
  })

  it('returns undefined when no status is present', () => {
    expect(upstreamStatusOf(new Error('something broke'))).toBeUndefined()
  })
})

describe('classifyAiError', () => {
  it('maps retired Imagen models to 503 model_retired', () => {
    const result = classifyAiError(new ImagenRetiredError('imagen-3.0-fast-generate-001'))
    expect(result.status).toBe(503)
    expect(result.code).toBe('model_retired')
    expect(result.details).toContain('imagen-3.0-fast-generate-001')
  })

  it('maps content policy blocks to 422', () => {
    expect(classifyAiError(new Error('Image generation blocked: SAFETY')).code).toBe(
      'content_policy'
    )
    expect(
      classifyAiError(new Error('filtered due to content policies')).status
    ).toBe(422)
  })

  it('maps rate limits to 429', () => {
    const result = classifyAiError(new Error('Vertex Gemini Image error 429: rate limit'))
    expect(result.status).toBe(429)
    expect(result.code).toBe('quota_exceeded')
  })

  it('maps auth failures to 502', () => {
    const result = classifyAiError(new Error('Vertex AI authentication failed: bad key'))
    expect(result.status).toBe(502)
    expect(result.code).toBe('auth_failed')
  })

  it('maps Lightning dunning / billing deny to 503 billing_denied (not auth_failed)', () => {
    const result = classifyAiError(
      new Error(
        'Vertex AI error 403: {\n  "error": {\n    "code": 403,\n    "message": "Lightning dunning decision is deny for project: projects/809352734041",\n    "status": "PERMISSION_DENIED"\n  }\n}'
      )
    )
    expect(result.status).toBe(503)
    expect(result.code).toBe('billing_denied')
    expect(result.message).toMatch(/billing/i)
    expect(result.details).toContain('Lightning dunning')
  })

  it('maps missing configuration to 503', () => {
    const result = classifyAiError(
      new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID must be configured for image generation')
    )
    expect(result.status).toBe(503)
    expect(result.code).toBe('not_configured')
  })

  it('maps OOM to 503 out_of_memory', () => {
    const result = classifyAiError(new Error('JavaScript heap out of memory'))
    expect(result.status).toBe(503)
    expect(result.code).toBe('out_of_memory')
  })

  it('falls back to 500 unknown while preserving details', () => {
    const result = classifyAiError(new Error('totally novel failure'))
    expect(result.status).toBe(500)
    expect(result.code).toBe('unknown')
    expect(result.details).toBe('totally novel failure')
  })
})
