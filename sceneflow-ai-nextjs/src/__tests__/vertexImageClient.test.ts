import { describe, it, expect } from 'vitest'
import { resolveVertexGeminiImageEndpoint } from '@/lib/vertexai/vertexImageClient'

describe('resolveVertexGeminiImageEndpoint', () => {
  const projectId = 'sceneflowai-test'

  it('routes Gemini 3 pro image preview to global v1beta1 endpoint', () => {
    const { endpoint, effectiveLocation, apiVersion } = resolveVertexGeminiImageEndpoint({
      model: 'gemini-3-pro-image-preview',
      projectId,
      regionalLocation: 'us-central1',
    })

    expect(effectiveLocation).toBe('global')
    expect(apiVersion).toBe('v1beta1')
    expect(endpoint).toBe(
      'https://aiplatform.googleapis.com/v1beta1/projects/sceneflowai-test/locations/global/publishers/google/models/gemini-3-pro-image-preview:generateContent'
    )
    expect(endpoint).not.toContain('us-central1')
  })

  it('keeps GA flash-image on regional endpoint', () => {
    const { endpoint, effectiveLocation, apiVersion } = resolveVertexGeminiImageEndpoint({
      model: 'gemini-2.5-flash-image',
      projectId,
      regionalLocation: 'us-central1',
    })

    expect(effectiveLocation).toBe('us-central1')
    expect(apiVersion).toBe('v1')
    expect(endpoint).toBe(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/sceneflowai-test/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent'
    )
  })

  it('respects explicit global regionalLocation for non-Gemini-3 models', () => {
    const { endpoint, effectiveLocation } = resolveVertexGeminiImageEndpoint({
      model: 'gemini-2.5-flash-image',
      projectId,
      regionalLocation: 'global',
    })

    expect(effectiveLocation).toBe('global')
    expect(endpoint).toContain('https://aiplatform.googleapis.com/')
    expect(endpoint).toContain('/locations/global/')
  })
})
