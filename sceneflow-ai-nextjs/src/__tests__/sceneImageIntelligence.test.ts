import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: vi.fn(),
  generateTextCacheAware: vi.fn(
    () =>
      new Promise(() => {
        // never resolves — simulates a hung Vertex call
      })
  ),
}))

import {
  SCENE_IMAGE_INTELLIGENCE_GEMINI_OPTIONS,
  SCENE_IMAGE_INTELLIGENCE_DEADLINE_MS,
  generateSceneImagePromptWithDeadline,
  type SceneImageIntelligenceRequest,
} from '@/lib/intelligence/scene-image-intelligence'

const baseRequest: SceneImageIntelligenceRequest = {
  sceneHeading: 'INT. ALLEY - NIGHT',
  sceneAction: 'Rain falls as Vesper waits in the shadows.',
  sceneNumber: 8,
  sceneType: 'narrative',
  characters: [
    {
      name: 'Vesper Thorne',
      hasReferenceImage: true,
      referenceIndex: 1,
    },
  ],
  props: [],
  referenceImageCount: 1,
}

describe('scene image intelligence timeout tuning', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses fast Gemini options with no retries and a tight timeout', () => {
    expect(SCENE_IMAGE_INTELLIGENCE_GEMINI_OPTIONS.model).toBe('gemini-2.5-flash')
    expect(SCENE_IMAGE_INTELLIGENCE_GEMINI_OPTIONS.thinkingLevel).toBe('minimal')
    expect(SCENE_IMAGE_INTELLIGENCE_GEMINI_OPTIONS.maxRetries).toBe(0)
    expect(SCENE_IMAGE_INTELLIGENCE_GEMINI_OPTIONS.skipCache).toBe(true)
    expect(SCENE_IMAGE_INTELLIGENCE_GEMINI_OPTIONS.timeoutMs).toBeLessThanOrEqual(30_000)
  })

  it('defines a route-level intelligence deadline under the Vercel maxDuration budget', () => {
    expect(SCENE_IMAGE_INTELLIGENCE_DEADLINE_MS).toBeLessThanOrEqual(40_000)
  })

  it('returns rules-based fallback when intelligence exceeds the deadline', async () => {
    const resultPromise = generateSceneImagePromptWithDeadline(baseRequest, 50)
    await vi.advanceTimersByTimeAsync(60)
    const result = await resultPromise

    expect(result.usedAI).toBe(false)
    expect(result.prompt).toBe('')
    expect(result.reasoning).toContain('timed out')
  })
})
