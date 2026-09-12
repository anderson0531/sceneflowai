import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/vertexai/client', () => ({
  getVertexAIAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

import { generateVertexGeminiImage } from '@/lib/vertexai/vertexImageClient'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function imageResponse(): Response {
  return jsonResponse({
    candidates: [
      {
        content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }] },
      },
    ],
  })
}

function safetyBlockResponse(): Response {
  return jsonResponse({ promptFeedback: { blockReason: 'IMAGE_SAFETY' } })
}

function textOnlyResponse(): Response {
  return jsonResponse({
    candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: 'I cannot help.' }] } }],
  })
}

/** An Express animatic beat: eco tier with a character likeness attached. */
function animaticBeatOptions() {
  return {
    prompt: 'Julian Ward turns toward the window',
    modelTier: 'eco' as const,
    referenceImages: [
      { base64Image: 'cmVmZXJlbmNl', mimeType: 'image/jpeg', name: 'Julian Ward' },
    ],
  }
}

function modelsCalled(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((call) => {
    const url = String(call[0])
    return url.slice(url.lastIndexOf('/models/') + '/models/'.length).replace(':generateContent', '')
  })
}

describe('flash-to-pro escalation for identity-ref frames', () => {
  beforeEach(() => {
    process.env.VERTEX_PROJECT_ID = 'sceneflowai-test'
    delete process.env.VERTEX_GEMINI_IMAGE_PRO_MODEL
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('retries on pro when flash blocks an identity-ref frame for safety', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(safetyBlockResponse())
      .mockResolvedValueOnce(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateVertexGeminiImage(animaticBeatOptions())

    expect(modelsCalled(fetchMock)).toEqual([GEMINI_IMAGE_MODELS.flash, GEMINI_IMAGE_MODELS.pro])
    expect(result.imageBase64).toBe('aW1hZ2U=')
    expect(result.modelId).toBe(GEMINI_IMAGE_MODELS.pro)
  })

  it('retries on pro when flash returns a text-only refusal', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(textOnlyResponse())
      .mockResolvedValueOnce(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateVertexGeminiImage(animaticBeatOptions())

    expect(modelsCalled(fetchMock)).toEqual([GEMINI_IMAGE_MODELS.flash, GEMINI_IMAGE_MODELS.pro])
    expect(result.imageBase64).toBe('aW1hZ2U=')
  })

  it('retries on pro when flash returns no candidates', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ candidates: [] }))
      .mockResolvedValueOnce(imageResponse())
    vi.stubGlobal('fetch', fetchMock)

    await generateVertexGeminiImage(animaticBeatOptions())

    expect(modelsCalled(fetchMock)).toEqual([GEMINI_IMAGE_MODELS.flash, GEMINI_IMAGE_MODELS.pro])
  })

  it('escalates only once, so a pro refusal is not retried in a loop', async () => {
    const fetchMock = vi.fn().mockImplementation(() => safetyBlockResponse())
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateVertexGeminiImage(animaticBeatOptions())).rejects.toThrow(/IMAGE_SAFETY/)

    expect(modelsCalled(fetchMock)).toEqual([GEMINI_IMAGE_MODELS.flash, GEMINI_IMAGE_MODELS.pro])
  })

  it('does not escalate an eco frame that carries no references', async () => {
    const fetchMock = vi.fn().mockImplementation(() => safetyBlockResponse())
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({ prompt: 'an empty sepia hall', modelTier: 'eco' })
    ).rejects.toThrow(/IMAGE_SAFETY/)

    expect(modelsCalled(fetchMock)).toEqual([GEMINI_IMAGE_MODELS.flash])
  })

  it('does not escalate when failFastOnRateLimit is set', async () => {
    const fetchMock = vi.fn().mockImplementation(() => safetyBlockResponse())
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({
        ...animaticBeatOptions(),
        failFastOnRateLimit: true,
      })
    ).rejects.toThrow(/IMAGE_SAFETY/)

    expect(modelsCalled(fetchMock)).toEqual([GEMINI_IMAGE_MODELS.flash])
  })

  it('does not spend a pro attempt once the caller deadline has passed', async () => {
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(safetyBlockResponse()), 40))
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateVertexGeminiImage({ ...animaticBeatOptions(), deadlineAt: Date.now() + 20 })
    ).rejects.toThrow(/IMAGE_SAFETY/)

    expect(modelsCalled(fetchMock)).toEqual([GEMINI_IMAGE_MODELS.flash])
  })
})
