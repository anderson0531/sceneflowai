import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { resolveVertexGeminiImageEndpoint } from '@/lib/vertexai/vertexImageClient'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'

const fixturePath = path.join(
  process.cwd(),
  'src/lib/config/__fixtures__/aiGatewayGeminiModelIds.json'
)

function gatewayIds(): Set<string> {
  return new Set(JSON.parse(readFileSync(fixturePath, 'utf8')) as string[])
}

describe('resolveVertexGeminiImageEndpoint', () => {
  const projectId = 'sceneflowai-test'

  it('routes Gemini 3 Pro Image GA to global v1 endpoint', () => {
    const { endpoint, effectiveLocation, apiVersion } = resolveVertexGeminiImageEndpoint({
      model: 'gemini-3-pro-image',
      projectId,
      regionalLocation: 'us-central1',
    })

    expect(effectiveLocation).toBe('global')
    expect(apiVersion).toBe('v1')
    expect(endpoint).toBe(
      'https://aiplatform.googleapis.com/v1/projects/sceneflowai-test/locations/global/publishers/google/models/gemini-3-pro-image:generateContent'
    )
    expect(endpoint).not.toContain('us-central1')
    expect(endpoint).not.toContain('v1beta1')
  })

  it('sends GA flash-image to global so 429s can route to a region with capacity', () => {
    const { endpoint, effectiveLocation, apiVersion } = resolveVertexGeminiImageEndpoint({
      model: 'gemini-2.5-flash-image',
      projectId,
      regionalLocation: 'us-central1',
    })

    expect(effectiveLocation).toBe('global')
    expect(apiVersion).toBe('v1')
    expect(endpoint).toBe(
      'https://aiplatform.googleapis.com/v1/projects/sceneflowai-test/locations/global/publishers/google/models/gemini-2.5-flash-image:generateContent'
    )
    expect(endpoint).not.toContain('us-central1')
  })

  it('honors an explicit region pin for non-Gemini-3 models', () => {
    const { endpoint, effectiveLocation } = resolveVertexGeminiImageEndpoint({
      model: 'gemini-2.5-flash-image',
      projectId,
      regionalLocation: 'us-east4',
      regionPinned: true,
    })

    expect(effectiveLocation).toBe('us-east4')
    expect(endpoint).toBe(
      'https://us-east4-aiplatform.googleapis.com/v1/projects/sceneflowai-test/locations/us-east4/publishers/google/models/gemini-2.5-flash-image:generateContent'
    )
  })

  it('keeps Gemini 3 global even when a region is pinned', () => {
    const { effectiveLocation, endpoint } = resolveVertexGeminiImageEndpoint({
      model: 'gemini-3-pro-image',
      projectId,
      regionalLocation: 'us-east4',
      regionPinned: true,
    })

    expect(effectiveLocation).toBe('global')
    expect(endpoint).not.toContain('us-east4')
  })

  it('resolves global when the pinned value is itself global', () => {
    const { endpoint, effectiveLocation } = resolveVertexGeminiImageEndpoint({
      model: 'gemini-2.5-flash-image',
      projectId,
      regionalLocation: 'global',
      regionPinned: true,
    })

    expect(effectiveLocation).toBe('global')
    expect(endpoint).toContain('https://aiplatform.googleapis.com/')
    expect(endpoint).toContain('/locations/global/')
  })
})

describe('GEMINI_IMAGE_MODELS', () => {
  it('pins pro to the GA Nano Banana Pro id from the Gateway snapshot', () => {
    expect(GEMINI_IMAGE_MODELS.pro).toBe('gemini-3-pro-image')
    expect(gatewayIds().has(GEMINI_IMAGE_MODELS.pro)).toBe(true)
    expect(gatewayIds().has(GEMINI_IMAGE_MODELS.flash)).toBe(true)
  })

  it('does not use the retired preview pro image id', () => {
    expect(GEMINI_IMAGE_MODELS.pro).not.toContain('preview')
  })
})
