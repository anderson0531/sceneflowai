import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/vertexai/client', () => ({
  getVertexAIAuthToken: vi.fn(),
}))

import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import {
  batchTranslateWithVertexAI,
  translateWithVertexAI,
} from '@/lib/vertexai/translate'

describe('Vertex translate skip rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GCP_PROJECT_ID = 'test-project'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          translations: [{ translatedText: 'Hello' }],
        }),
      }))
    )
  })

  it('skips only when target equals source', async () => {
    const result = await translateWithVertexAI({
      text: 'Hola',
      targetLanguage: 'es',
      sourceLanguage: 'es',
    })
    expect(result.translatedText).toBe('Hola')
    expect(getVertexAIAuthToken).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('translates Spanish into English instead of skipping target=en', async () => {
    vi.mocked(getVertexAIAuthToken).mockResolvedValue('token')

    const result = await translateWithVertexAI({
      text: 'Hola mundo',
      targetLanguage: 'en',
      sourceLanguage: 'es',
    })

    expect(getVertexAIAuthToken).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalled()
    expect(result.translatedText).toBe('Hello')
  })

  it('batch-translates Spanish into English instead of skipping target=en', async () => {
    vi.mocked(getVertexAIAuthToken).mockResolvedValue('token')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          translations: [{ translatedText: 'One' }, { translatedText: 'Two' }],
        }),
      }))
    )

    const results = await batchTranslateWithVertexAI(['Uno', 'Dos'], 'en', 'es')
    expect(getVertexAIAuthToken).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalled()
    expect(results.map((r) => r.translatedText)).toEqual(['One', 'Two'])
  })
})
