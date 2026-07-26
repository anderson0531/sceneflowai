import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SceneChunk } from '@/lib/script/audienceResonance/chunkPlan'
import type { AnalysisContext, SceneAnalysis } from '@/lib/script/audienceResonance/types'

// Stub the two model passes so the orchestration can be exercised without
// Vertex credentials. Everything else (chunking, progress, assembly, scoring)
// is the real implementation.
const analyzeSceneChunk = vi.fn()
const synthesizeReview = vi.fn()

vi.mock('@/lib/script/audienceResonance/scenePass', () => ({
  analyzeSceneChunk: (...args: unknown[]) => analyzeSceneChunk(...args),
}))
vi.mock('@/lib/script/audienceResonance/synthesisPass', () => ({
  synthesizeReview: (...args: unknown[]) => synthesizeReview(...args),
}))

const { runAudienceResonance } = await import('@/lib/script/audienceResonance/runner')

function makeScenes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    heading: `INT. LOCATION ${i + 1} - DAY`,
    action: `Something happens in scene ${i + 1}.`,
    dialogue: [{ character: 'ALEX', line: `Line for scene ${i + 1}` }],
  }))
}

function sceneAnalysisFor(chunk: SceneChunk): SceneAnalysis[] {
  return chunk.sceneNumbers.map((sceneNumber) => ({
    sceneNumber,
    sceneHeading: `Scene ${sceneNumber}`,
    score: 80,
    storyWeight: 50,
    pacing: 'moderate' as const,
    tension: 'medium' as const,
    characterDevelopment: 'moderate' as const,
    visualPotential: 'medium' as const,
    notes: 'note',
    recommendations: [{ text: `fix ${sceneNumber}`, priority: 'medium' as const, pointsDeducted: 5 }],
  }))
}

beforeEach(() => {
  analyzeSceneChunk.mockReset()
  synthesizeReview.mockReset()

  analyzeSceneChunk.mockImplementation(async (_ctx: AnalysisContext, chunk: SceneChunk) => ({
    sceneAnalysis: sceneAnalysisFor(chunk),
    modelId: 'gemini-3.1-pro-preview',
    requestedModelId: 'gemini-3.1-pro-preview',
  }))

  synthesizeReview.mockImplementation(async () => ({
    categories: [
      { name: 'Dialogue Subtext', score: 75, weight: 20 },
      { name: 'Structural Integrity', score: 75, weight: 20 },
    ],
    deductions: [],
    analysis: 'Overall analysis.',
    strengths: ['Strength in scene 1'],
    improvements: ['Issue in scene 2'],
    recommendations: [{ text: 'Tighten act two', priority: 'high' as const }],
    targetDemographic: 'Adults 18-34',
    emotionalImpact: 'Tense',
    modelId: 'gemini-3.1-pro-preview',
    requestedModelId: 'gemini-3.1-pro-preview',
  }))
})

describe('runAudienceResonance orchestration', () => {
  it('analyzes every scene of a long script, not a sample', () => {
    return runAudienceResonance({
      script: { title: 'Long Script', scenes: makeScenes(64) },
    }).then((review) => {
      expect(review.sceneAnalysis).toHaveLength(64)
      expect(review.sceneAnalysis.map((s) => s.sceneNumber)).toEqual(
        Array.from({ length: 64 }, (_, i) => i + 1)
      )
      expect(review.coverage).toEqual({ analyzedScenes: 64, totalScenes: 64 })
    })
  })

  it('splits work into chunks and synthesizes exactly once', async () => {
    await runAudienceResonance({
      script: { title: 'Script', scenes: makeScenes(25) },
      chunkSize: 10,
    })

    expect(analyzeSceneChunk).toHaveBeenCalledTimes(3)
    expect(synthesizeReview).toHaveBeenCalledTimes(1)
  })

  it('returns scene analysis in scene order even if chunks resolve out of order', async () => {
    analyzeSceneChunk.mockImplementation(async (_ctx: AnalysisContext, chunk: SceneChunk) => ({
      sceneAnalysis: [...sceneAnalysisFor(chunk)].reverse(),
    }))

    const review = await runAudienceResonance({
      script: { title: 'Script', scenes: makeScenes(12) },
      chunkSize: 5,
    })

    const numbers = review.sceneAnalysis.map((s) => s.sceneNumber)
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
  })

  it('reports monotonic progress ending with a synthesis stage', async () => {
    const updates: Array<{ progress: number; stage: string }> = []

    await runAudienceResonance({
      script: { title: 'Script', scenes: makeScenes(30) },
      chunkSize: 10,
      onProgress: (p) => {
        updates.push({ progress: p.progress, stage: p.stage })
      },
    })

    const progresses = updates.map((u) => u.progress)
    expect(progresses).toEqual([...progresses].sort((a, b) => a - b))
    expect(progresses[progresses.length - 1]).toBe(90)
    expect(updates[updates.length - 1].stage).toBe('synthesis')
    // Scene stages never claim completion; synthesis owns the last stretch.
    for (const update of updates.filter((u) => u.stage === 'scenes')) {
      expect(update.progress).toBeLessThanOrEqual(90)
    }
  })

  it('routes each chunk through the caller supplied durable executor', async () => {
    const names: string[] = []

    await runAudienceResonance({
      script: { title: 'Script', scenes: makeScenes(20) },
      chunkSize: 10,
      runChunk: async (name, fn) => {
        names.push(name)
        return fn()
      },
    })

    // Named steps are what let Inngest resume mid-analysis after a failure.
    expect(names).toEqual(['scenes-1-10', 'scenes-11-20', 'synthesis'])
  })

  it('records the base script timestamp for later staleness checks', async () => {
    const review = await runAudienceResonance({
      script: { title: 'Script', scenes: makeScenes(5) },
      baseScriptUpdatedAt: '2026-07-26T10:00:00.000Z',
    })

    expect(review.baseScriptUpdatedAt).toBe('2026-07-26T10:00:00.000Z')
  })

  it('surfaces the model that actually ran', async () => {
    const review = await runAudienceResonance({
      script: { title: 'Script', scenes: makeScenes(5) },
    })

    expect(review.modelId).toBe('gemini-3.1-pro-preview')
    expect(review.requestedModelId).toBe('gemini-3.1-pro-preview')
  })

  it('derives the overall score from weighted scene scores', async () => {
    const review = await runAudienceResonance({
      script: { title: 'Script', scenes: makeScenes(10) },
    })

    // Every stubbed scene scores 80 at equal weight.
    expect(review.overallScore).toBe(80)
    expect(review.baseScore).toBe(100)
  })

  it('passes the same immutable context to every pass', async () => {
    await runAudienceResonance({
      script: { title: 'Script', scenes: makeScenes(20) },
      chunkSize: 10,
      targetDemographic: 'Adults 18-34',
    })

    const contexts = analyzeSceneChunk.mock.calls.map((call) => call[0])
    expect(contexts[0]).toBe(contexts[1])
    expect(contexts[0].targetDemographic).toBe('Adults 18-34')
    expect(synthesizeReview.mock.calls[0][0]).toBe(contexts[0])
  })

  it('strips empty narration before analysis so it cannot skew Show vs Tell', async () => {
    await runAudienceResonance({
      script: {
        title: 'Script',
        scenes: [
          { heading: 'A', action: 'x', narration: '   ' },
          { heading: 'B', action: 'y', narration: 'none' },
          { heading: 'C', action: 'z', narration: 'Real narration.' },
        ],
      },
    })

    const scenes = analyzeSceneChunk.mock.calls[0][0].scenesForAnalysis
    expect(scenes[0]).not.toHaveProperty('narration')
    expect(scenes[1]).not.toHaveProperty('narration')
    expect(scenes[2].narration).toBe('Real narration.')
  })

  it('produces a stable seed for the same script identity', async () => {
    const script = { title: 'Script', logline: 'A logline', scenes: makeScenes(5) }

    await runAudienceResonance({ script })
    const firstSeed = analyzeSceneChunk.mock.calls[0][0].contentSeed

    analyzeSceneChunk.mockClear()
    await runAudienceResonance({ script })
    const secondSeed = analyzeSceneChunk.mock.calls[0][0].contentSeed

    expect(secondSeed).toBe(firstSeed)
  })

  it('handles a script with a single scene', async () => {
    const review = await runAudienceResonance({
      script: { title: 'Short', scenes: makeScenes(1) },
    })

    expect(analyzeSceneChunk).toHaveBeenCalledTimes(1)
    expect(review.sceneAnalysis).toHaveLength(1)
  })

  it('still synthesizes when a script has no scenes', async () => {
    const review = await runAudienceResonance({ script: { title: 'Empty', scenes: [] } })

    expect(analyzeSceneChunk).not.toHaveBeenCalled()
    expect(synthesizeReview).toHaveBeenCalledTimes(1)
    expect(review.sceneAnalysis).toEqual([])
    expect(review.coverage).toEqual({ analyzedScenes: 0, totalScenes: 0 })
  })

  it('propagates a chunk failure so the job can retry that chunk', async () => {
    analyzeSceneChunk.mockImplementationOnce(async () => {
      throw new Error('scene pass exploded')
    })

    await expect(
      runAudienceResonance({ script: { title: 'Script', scenes: makeScenes(10) } })
    ).rejects.toThrow('scene pass exploded')

    expect(synthesizeReview).not.toHaveBeenCalled()
  })
})
