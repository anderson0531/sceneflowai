import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const generateText = vi.fn()

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: (...args: unknown[]) => generateText(...args),
}))

import {
  analyzeScenePolish,
  buildPolishPrompt,
  formatPolishBeats,
  isPolishAnalysisStale,
  parsePolishAnalysis,
  pendingPolishRecommendations,
  polishOutputTokenBudget,
  scenePolishBeatFingerprint,
  POLISH_BUDGET_ERROR,
  POLISH_MIN_OUTPUT_TOKENS,
  POLISH_TIMEOUT_MS,
} from '@/lib/script/scenePolish'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function wrenchScene() {
  return {
    heading: 'INT. ENGINE ROOM - NIGHT',
    action: 'Gideon works the valve with a wrench.',
    sceneDirection: {
      sceneDescription: 'Gideon loosens the valve with a wrench.',
      scene: { keyProps: ['Thirty-Inch Iron Rail Spanner'] },
    },
    beats: [
      {
        beatId: 'b1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Gideon has a wrench in his hand.',
        beatDirection: {
          keyProps: ['Thirty-Inch Iron Rail Spanner'],
          propInteraction: 'holds the wrench in his right hand',
          blocking: 'Gideon at the valve',
        },
      },
      {
        beatId: 'b2',
        sequenceIndex: 1,
        kind: 'action',
        actionDescription: 'Gideon picks up the wrench.',
        beatDirection: {
          keyProps: ['Thirty-Inch Iron Rail Spanner'],
          propInteraction: 'picks up the wrench',
        },
      },
    ] as SceneBeat[],
  }
}

const wrenchLlmJson = {
  notes: 'Wrench pickup is out of order.',
  recommendations: [
    {
      text: "Beat 2: Gideon already holds the wrench from Beat 1 — change 'picks up the wrench' to 'tightens his grip on the wrench'; keep Beat 1 as the pickup.",
      reason: 'Already holding the wrench, then picks it up',
      priority: 'high',
      category: 'prop_state',
      beatIndices: [1, 2],
    },
  ],
}

describe('Scene polish beat formatter', () => {
  it('numbers the wrench pickup contradiction on the beat timeline', () => {
    const formatted = formatPolishBeats(wrenchScene())
    expect(formatted).toContain('1. [beatId:b1] action: Gideon has a wrench in his hand.')
    expect(formatted).toContain('prop-interaction: holds the wrench in his right hand')
    expect(formatted).toContain('2. [beatId:b2] action: Gideon picks up the wrench.')
    expect(formatted).toContain('prop-interaction: picks up the wrench')
  })

  it('changes the fingerprint when beat 2 starts holding instead of picking up', () => {
    const scene = wrenchScene()
    const before = scenePolishBeatFingerprint(scene)
    scene.beats[1].actionDescription = 'Gideon tightens his grip on the wrench.'
    scene.beats[1].beatDirection = {
      ...scene.beats[1].beatDirection,
      propInteraction: 'tightens his grip on the wrench',
    }
    expect(scenePolishBeatFingerprint(scene)).not.toBe(before)
  })
})

describe('Scene polish parser', () => {
  it('maps the wrench fixture to a prop_state rec citing beats 1 and 2', () => {
    const parsed = parsePolishAnalysis(JSON.stringify(wrenchLlmJson), wrenchScene())
    expect(parsed.issueCount).toBe(1)
    expect(parsed.recommendations).toHaveLength(1)
    expect(parsed.recommendations[0].category).toBe('prop_state')
    expect(parsed.recommendations[0].beatIndices).toEqual([1, 2])
    expect(parsed.recommendations[0].beatIds).toEqual(['b1', 'b2'])
    expect(parsed.recommendations[0].text).toContain('Beat 2')
    expect(parsed.recommendations[0].text).toContain('Beat 1')
  })

  it('returns issueCount 0 for an aligned empty rec list', () => {
    const parsed = parsePolishAnalysis(
      JSON.stringify({ notes: 'Beat sequence looks aligned.', recommendations: [] }),
      wrenchScene()
    )
    expect(parsed.issueCount).toBe(0)
    expect(parsed.recommendations).toEqual([])
    expect(pendingPolishRecommendations({ ...parsed, beatFingerprint: '', analyzedAt: '' })).toEqual(
      []
    )
  })

  it('rejects incomplete JSON instead of inventing an empty rec list', () => {
    expect(() =>
      parsePolishAnalysis(
        '{"notes": "Wrench pickup is out of order.", "recommendations": [{"text": "Beat 2',
        wrenchScene()
      )
    ).toThrow('Failed to parse scene polish JSON')
  })
})

describe('Scene polish prompt', () => {
  it('asks the model to flag already-holding then picks-up contradictions', () => {
    const prompt = buildPolishPrompt({ scene: wrenchScene() })
    expect(prompt).toContain('Gideon has a wrench in his hand')
    expect(prompt).toContain('Gideon picks up the wrench')
    expect(prompt).toContain('prop_state')
    expect(prompt).toContain('already holding')
    expect(prompt).toContain('DO NOT FLAG')
    expect(prompt).toContain('Audience-craft notes')
  })
})

describe('analyzeScenePolish', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  it('returns a prop_state rec for the wrench fixture without writing audienceAnalysis', async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify(wrenchLlmJson),
      finishReason: 'STOP',
      modelId: 'gemini-3.8-flash',
    })

    const result = await analyzeScenePolish({ scene: wrenchScene() })
    expect(result.issueCount).toBe(1)
    expect(result.recommendations[0].category).toBe('prop_state')
    expect(result.recommendations[0].beatIndices).toEqual([1, 2])
    expect(result.beatFingerprint).toBe(scenePolishBeatFingerprint(wrenchScene()))
    expect(result).not.toHaveProperty('audienceAnalysis')
    expect(isPolishAnalysisStale(result, wrenchScene())).toBe(false)
  })

  it('requests a thinking-aware output budget, not the 4k cap that truncated production scenes', async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify(wrenchLlmJson),
      finishReason: 'STOP',
    })

    await analyzeScenePolish({ scene: wrenchScene() })

    expect(polishOutputTokenBudget(2)).toBe(POLISH_MIN_OUTPUT_TOKENS)
    expect(polishOutputTokenBudget(30)).toBeGreaterThanOrEqual(POLISH_MIN_OUTPUT_TOKENS)
    expect(generateText).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        maxOutputTokens: POLISH_MIN_OUTPUT_TOKENS,
        thinkingLevel: 'high',
        timeoutMs: POLISH_TIMEOUT_MS,
      })
    )
  })

  it('accepts complete JSON even when finishReason is MAX_TOKENS', async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify(wrenchLlmJson),
      finishReason: 'MAX_TOKENS',
      modelId: 'gemini-3.8-flash',
    })

    const result = await analyzeScenePolish({ scene: wrenchScene() })
    expect(result.issueCount).toBe(1)
    expect(result.recommendations[0].category).toBe('prop_state')
  })

  it('does not treat truncated JSON as an empty aligned scene', async () => {
    generateText.mockResolvedValue({
      text: '{"notes": "Wrench pickup is out of order.", "recommendations": [{"text": "Beat 2',
      finishReason: 'MAX_TOKENS',
    })

    await expect(analyzeScenePolish({ scene: wrenchScene() })).rejects.toThrow(POLISH_BUDGET_ERROR)
  })
})

describe('Scene polish wiring', () => {
  it('exposes a scene-level Polish API that uses the analyzer', () => {
    const route = readSource('src/app/api/vision/polish-scene/route.ts')
    expect(route).toContain("from '@/lib/script/scenePolish'")
    expect(route).toContain('analyzeScenePolish')
    expect(route).toContain('maxDuration = 120')

    const vercel = readSource('vercel.json')
    expect(vercel).toContain('src/app/api/vision/polish-scene/route.ts')

    const analyzer = readSource('src/lib/script/scenePolish/analyzeScenePolish.ts')
    expect(analyzer).toContain('getAudienceResonanceModel')
    expect(analyzer).not.toContain('audienceAnalysis')
    expect(analyzer).not.toContain('Try a shorter scene')
  })

  it('wires Polish from Vision into ScriptPanel and Co-Director', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('onPolishScene={handlePolishScene}')
    expect(page).toContain("fetch('/api/vision/polish-scene'")
    expect(page).toContain('polishAnalysis')
    expect(page).toContain('initialRevisionDepth')
    expect(page).toContain("recSource?: 'audience' | 'polish'")

    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain('ScenePolishBadge')
    expect(panel).toContain('ScenePolishPanel')
    expect(panel).toContain("recSource: 'polish'")

    const instructions = readSource('src/components/vision/InstructionsPanel.tsx')
    expect(instructions).toContain('Polish Recommendations')
    expect(instructions).toContain('polishAnalysis')

    const modal = readSource('src/components/vision/SceneEditorModalV2.tsx')
    expect(modal).toContain('initialRevisionDepth')
    expect(modal).toContain('polishAnalysis')

    const revise = readSource('src/app/api/vision/revise-scene/route.ts')
    expect(revise).toContain('When instructions name Beat N')

    const polishPanel = readSource('src/components/vision/ScenePolishPanel.tsx')
    expect(polishPanel).toContain("from '@/lib/script/scenePolish/formatPolishBeats'")
    expect(polishPanel).not.toContain('analyzeScenePolish')
    expect(polishPanel).not.toContain('vertexai/gemini')
  })

  it('stamps polish appliedRecommendationIds on Co-Director apply', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('cleanedScene.polishAnalysis')
    expect(page).toContain('originalScene.polishAnalysis.appliedRecommendationIds')
  })
})
