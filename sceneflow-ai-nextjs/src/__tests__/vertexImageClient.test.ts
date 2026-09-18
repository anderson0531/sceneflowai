import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  resolveVertexGeminiImageEndpoint,
  buildMultimodalParts,
  pickGeneratedImageFromParts,
  countPromptImageTokens,
  effectiveImageSizeForModel,
  usesProImageReferenceLayout,
  generateVertexGeminiImage,
  PRO_REFERENCE_MEDIA_RESOLUTION_LEVEL,
} from '@/lib/vertexai/vertexImageClient'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'

vi.mock('@/lib/vertexai/client', () => ({
  getVertexAIAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

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
      model: GEMINI_IMAGE_MODELS.flash,
      projectId,
      regionalLocation: 'us-central1',
    })

    expect(effectiveLocation).toBe('global')
    expect(apiVersion).toBe('v1')
    expect(endpoint).toBe(
      `https://aiplatform.googleapis.com/v1/projects/sceneflowai-test/locations/global/publishers/google/models/${GEMINI_IMAGE_MODELS.flash}:generateContent`
    )
    expect(endpoint).not.toContain('us-central1')
  })

  it('honors an explicit region pin for leftover Gemini 2.5 image ids', () => {
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

  it('keeps Gemini 3 Flash Image global even when a region is pinned', () => {
    const { effectiveLocation, endpoint } = resolveVertexGeminiImageEndpoint({
      model: GEMINI_IMAGE_MODELS.flash,
      projectId,
      regionalLocation: 'us-east4',
      regionPinned: true,
    })

    expect(effectiveLocation).toBe('global')
    expect(endpoint).not.toContain('us-east4')
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
      model: GEMINI_IMAGE_MODELS.flash,
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
  it('pins Draft flash to GA Nano Banana 2 and Final pro to Nano Banana Pro', () => {
    expect(GEMINI_IMAGE_MODELS.flash).toBe('gemini-3.1-flash-image')
    expect(GEMINI_IMAGE_MODELS.pro).toBe('gemini-3-pro-image')
    expect(gatewayIds().has(GEMINI_IMAGE_MODELS.pro)).toBe(true)
    expect(gatewayIds().has(GEMINI_IMAGE_MODELS.flash)).toBe(true)
  })

  it('does not use retired preview image ids', () => {
    expect(GEMINI_IMAGE_MODELS.pro).not.toContain('preview')
    expect(GEMINI_IMAGE_MODELS.flash).not.toContain('preview')
  })
})

function fiveCharacterRefs() {
  return Array.from({ length: 5 }, (_, i) => ({
    base64Image: `ref${i}`,
    mimeType: 'image/jpeg' as const,
    name: `Reference image ${i + 1} — CHARACTER REFERENCE of person [${i + 1}]`,
  }))
}

describe('buildMultimodalParts Flash vs Pro layouts', () => {
  it('keeps Flash labeled images-first without mediaResolution', async () => {
    const parts = await buildMultimodalParts(
      'SCENE PROMPT',
      [
        { base64Image: 'aaa', mimeType: 'image/png', name: 'person [1]' },
        { base64Image: 'bbb', mimeType: 'image/png', name: 'person [2]' },
      ],
      true,
      'flash'
    )

    expect(parts).toEqual([
      { text: '[person [1]]\n' },
      { inlineData: { mimeType: 'image/png', data: 'aaa' } },
      { text: '[person [2]]\n' },
      { inlineData: { mimeType: 'image/png', data: 'bbb' } },
      { text: 'SCENE PROMPT' },
    ])
    for (const part of parts) {
      expect(part).not.toHaveProperty('mediaResolution')
    }
  })

  it('sends Pro refs as prompt-first unlabeled HIGH-resolution images', async () => {
    const refs = fiveCharacterRefs()
    const parts = await buildMultimodalParts('SCENE PROMPT', refs, true, 'pro')

    expect(parts[0]).toEqual({ text: 'SCENE PROMPT' })
    expect(parts.slice(1)).toHaveLength(5)
    for (let i = 0; i < 5; i++) {
      expect(parts[i + 1]).toEqual({
        inlineData: { mimeType: 'image/jpeg', data: `ref${i}` },
        mediaResolution: { level: PRO_REFERENCE_MEDIA_RESOLUTION_LEVEL },
      })
    }
    expect(parts.some((part) => 'text' in part && part.text.startsWith('['))).toBe(false)
  })

  it('defaults to the Flash layout when layout is omitted', async () => {
    const parts = await buildMultimodalParts('PROMPT', [
      { base64Image: 'aaa', mimeType: 'image/png', name: 'person [1]' },
    ])
    expect(parts[0]).toEqual({ text: '[person [1]]\n' })
    expect(parts.at(-1)).toEqual({ text: 'PROMPT' })
  })
})

describe('effectiveImageSizeForModel', () => {
  it('omits imageSize for Flash even when 1K is requested', () => {
    expect(effectiveImageSizeForModel(GEMINI_IMAGE_MODELS.flash, '1K')).toBeUndefined()
  })

  it('passes imageSize through for Pro', () => {
    expect(effectiveImageSizeForModel(GEMINI_IMAGE_MODELS.pro, '2K')).toBe('2K')
  })
})

describe('usesProImageReferenceLayout', () => {
  it('is true only for pro-image model ids', () => {
    expect(usesProImageReferenceLayout(GEMINI_IMAGE_MODELS.pro)).toBe(true)
    expect(usesProImageReferenceLayout(GEMINI_IMAGE_MODELS.flash)).toBe(false)
  })
})

describe('pickGeneratedImageFromParts', () => {
  it('skips thought images when a later non-thought image exists', () => {
    const picked = pickGeneratedImageFromParts([
      { thought: true, inlineData: { mimeType: 'image/png', data: 'dGhvdWdodA==' } },
      { text: 'composition notes', thought: true },
      { inlineData: { mimeType: 'image/png', data: 'ZmluYWw=' } },
    ])
    expect(picked.imageBase64).toBe('ZmluYWw=')
    expect(picked.text).toBeUndefined()
  })

  it('falls back to the last thought image when that is the only render', () => {
    const picked = pickGeneratedImageFromParts([
      { thought: true, inlineData: { mimeType: 'image/png', data: 'dGhvdWdodDE=' } },
      { thought: true, inlineData: { mimeType: 'image/png', data: 'dGhvdWdodDI=' } },
    ])
    expect(picked.imageBase64).toBe('dGhvdWdodDI=')
  })

  it('keeps the last non-thought text', () => {
    const picked = pickGeneratedImageFromParts([
      { text: 'thinking', thought: true },
      { text: 'visible caption' },
      { inlineData: { mimeType: 'image/png', data: 'ZmluYWw=' } },
    ])
    expect(picked.text).toBe('visible caption')
    expect(picked.imageBase64).toBe('ZmluYWw=')
  })
})

describe('countPromptImageTokens', () => {
  it('sums IMAGE promptTokensDetails', () => {
    expect(
      countPromptImageTokens({
        promptTokensDetails: [
          { modality: 'TEXT', tokenCount: 800 },
          { modality: 'IMAGE', tokenCount: 1120 },
          { modality: 'IMAGE', tokenCount: 1120 },
        ],
      })
    ).toBe(2240)
  })

  it('returns 0 when IMAGE details are present but empty', () => {
    expect(
      countPromptImageTokens({
        promptTokensDetails: [{ modality: 'IMAGE', tokenCount: 0 }],
      })
    ).toBe(0)
  })

  it('returns null when IMAGE details are missing', () => {
    expect(countPromptImageTokens({ promptTokenCount: 900 })).toBeNull()
    expect(
      countPromptImageTokens({
        promptTokensDetails: [{ modality: 'TEXT', tokenCount: 900 }],
      })
    ).toBeNull()
  })
})

function imageResponse(overrides?: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }],
          },
        },
      ],
      ...overrides,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

function requestBodyFromFetch(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0]?.[1] as { body: string }
  return JSON.parse(init.body) as {
    contents: [{ parts: Array<Record<string, unknown>> }]
    generationConfig: { imageConfig?: { aspectRatio?: string; imageSize?: string } }
  }
}

describe('generateVertexGeminiImage request shape', () => {
  beforeEach(() => {
    process.env.VERTEX_PROJECT_ID = 'sceneflowai-test'
    delete process.env.VERTEX_GEMINI_IMAGE_PRO_MODEL
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps Flash refs labeled, prompt-last, and omits imageSize', async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await generateVertexGeminiImage({
      prompt: 'SCENE PROMPT',
      modelTier: 'eco',
      imageSize: '1K',
      aspectRatio: '16:9',
      referenceImages: [
        { base64Image: 'aaa', mimeType: 'image/png', name: 'person [1]' },
        { base64Image: 'bbb', mimeType: 'image/png', name: 'person [2]' },
      ],
    })

    const body = requestBodyFromFetch(fetchMock)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(GEMINI_IMAGE_MODELS.flash)
    expect(body.contents[0].parts).toEqual([
      { text: '[person [1]]\n' },
      { inlineData: { mimeType: 'image/png', data: 'aaa' } },
      { text: '[person [2]]\n' },
      { inlineData: { mimeType: 'image/png', data: 'bbb' } },
      { text: 'SCENE PROMPT' },
    ])
    expect(body.generationConfig.imageConfig?.aspectRatio).toBe('16:9')
    expect(body.generationConfig.imageConfig?.imageSize).toBeUndefined()
  })

  it('sends Pro refs prompt-first with HIGH mediaResolution and 2K imageSize', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      imageResponse({
        usageMetadata: {
          promptTokensDetails: [
            { modality: 'TEXT', tokenCount: 900 },
            { modality: 'IMAGE', tokenCount: 5600 },
          ],
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await generateVertexGeminiImage({
      prompt: 'SCENE PROMPT',
      modelTier: 'designer',
      imageSize: '2K',
      aspectRatio: '16:9',
      referenceImages: fiveCharacterRefs(),
    })

    const body = requestBodyFromFetch(fetchMock)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(GEMINI_IMAGE_MODELS.pro)
    const parts = body.contents[0].parts
    expect(parts[0]).toEqual({ text: 'SCENE PROMPT' })
    expect(parts.slice(1)).toHaveLength(5)
    for (const part of parts.slice(1)) {
      expect(part).toMatchObject({
        inlineData: { mimeType: 'image/jpeg' },
        mediaResolution: { level: PRO_REFERENCE_MEDIA_RESOLUTION_LEVEL },
      })
      expect(part).not.toHaveProperty('text')
    }
    expect(body.generationConfig.imageConfig).toEqual({
      aspectRatio: '16:9',
      imageSize: '2K',
    })
  })

  it('returns the last non-thought image when Pro emits thought drafts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    thought: true,
                    inlineData: { mimeType: 'image/png', data: 'dGhvdWdodA==' },
                  },
                  { inlineData: { mimeType: 'image/png', data: 'ZmluYWw=' } },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateVertexGeminiImage({
      prompt: 'SCENE PROMPT',
      modelTier: 'designer',
      referenceImages: [{ base64Image: 'ref0', mimeType: 'image/jpeg', name: 'person [1]' }],
    })

    expect(result.imageBase64).toBe('ZmluYWw=')
  })

  it('warns when Pro reports 0 IMAGE tokens with refs attached', async () => {
    const warn = vi.spyOn(console, 'warn')
    const fetchMock = vi.fn().mockResolvedValue(
      imageResponse({
        usageMetadata: {
          promptTokensDetails: [{ modality: 'IMAGE', tokenCount: 0 }],
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await generateVertexGeminiImage({
      prompt: 'SCENE PROMPT',
      modelTier: 'designer',
      referenceImages: [{ base64Image: 'ref0', mimeType: 'image/jpeg', name: 'person [1]' }],
    })

    expect(warn.mock.calls.some((call) => String(call[0]).includes('0 IMAGE tokens'))).toBe(true)
  })
})
