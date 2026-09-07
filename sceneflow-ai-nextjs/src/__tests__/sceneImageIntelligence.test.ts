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
  buildSceneImageIntelligenceUserPrompt,
  buildSceneImageCacheKey,
  parseVisualSetupOverlay,
  parseTalentDirectionOverlay,
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

describe('scene image intelligence Direct overlays', () => {
  const overlayRequest: SceneImageIntelligenceRequest = {
    ...baseRequest,
    beatAction: 'Elara opens the fridge',
    visualSetup: {
      shotType: 'close-up',
      lighting: 'cold',
      timeOfDay: 'night',
    },
    talentDirection: {
      talentBlocking: 'Elara at the fridge door',
      emotionalBeat: 'uneasy',
    },
    userDirection: 'Closer on Maya, keep the coffee cup',
  }

  it('puts visual setup, talent, and director notes after the beat action', () => {
    const prompt = buildSceneImageIntelligenceUserPrompt(overlayRequest)
    expect(prompt).toContain('BEAT ACTION (PRIMARY')
    expect(prompt).toContain('Elara opens the fridge')
    expect(prompt).toContain('VISUAL SETUP')
    expect(prompt).toContain('Shot: close-up')
    expect(prompt).toContain('TALENT DIRECTION')
    expect(prompt).toContain('Blocking: Elara at the fridge door')
    expect(prompt).toContain('DIRECTOR NOTES (apply on top of the beat; do not replace the beat action):')
    expect(prompt).toContain('Closer on Maya, keep the coffee cup')
    const beatIdx = prompt.indexOf('BEAT ACTION')
    const notesIdx = prompt.indexOf('DIRECTOR NOTES')
    const contextIdx = prompt.indexOf('SCENE CONTEXT')
    expect(beatIdx).toBeGreaterThanOrEqual(0)
    expect(notesIdx).toBeGreaterThan(beatIdx)
    expect(contextIdx).toBeGreaterThan(notesIdx)
  })

  it('changes the cache key when director notes change', () => {
    const withoutNotes = buildSceneImageCacheKey({ ...overlayRequest, userDirection: undefined })
    const withNotes = buildSceneImageCacheKey(overlayRequest)
    expect(withNotes).not.toBe(withoutNotes)
  })

  it('parses visual and talent overlays from request bodies', () => {
    expect(parseVisualSetupOverlay({ shotType: 'wide-shot', lighting: '  ' })).toEqual({
      shotType: 'wide-shot',
    })
    expect(parseTalentDirectionOverlay({ talentBlocking: 'stay wide', extra: 1 })).toEqual({
      talentBlocking: 'stay wide',
    })
    expect(parseVisualSetupOverlay(null)).toBeUndefined()
  })
})
