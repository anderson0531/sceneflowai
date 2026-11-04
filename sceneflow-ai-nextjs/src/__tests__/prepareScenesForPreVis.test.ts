import { describe, expect, it, vi } from 'vitest'
import { recommendationId } from '@/lib/script/audienceResonance/highImpact'
import {
  buildSceneRecSelectionKey,
  collectInitialSelectedRecKeys,
  groupSelectedRecommendationsByScene,
  runPreVisScenePreparation,
  type SceneAnalysisForPreVis,
} from '@/lib/vision/prepareScenesForPreVis'

describe('prepareScenesForPreVis', () => {
  const sampleSceneAnalysis: SceneAnalysisForPreVis[] = [
    {
      sceneNumber: 1,
      sceneHeading: 'INT. BUNKER - NIGHT',
      score: 72,
      recommendations: [
        {
          text: 'Replace exposition monologue with visual discovery of the cipher.',
          priority: 'high',
          impact: 'structural',
          pointsDeducted: 5,
        },
        {
          text: 'Trim final farewell exchange by two lines.',
          priority: 'low',
          impact: 'polish',
        },
      ],
    },
    {
      sceneNumber: 2,
      sceneHeading: 'EXT. ROOFTOP - DAWN',
      score: 88,
      recommendations: [
        {
          text: 'Add environmental wind and distant siren cues.',
          priority: 'medium',
          impact: 'polish',
        },
      ],
    },
  ]

  it('collects all unapplied recommendations by default and supports highImpactOnly filter', () => {
    const allKeys = collectInitialSelectedRecKeys(sampleSceneAnalysis, [{}, {}])
    expect(allKeys.size).toBe(3)

    const highImpactKeys = collectInitialSelectedRecKeys(sampleSceneAnalysis, [{}, {}], {
      highImpactOnly: true,
    })
    expect(highImpactKeys.size).toBe(1)
    const highRecId = recommendationId(sampleSceneAnalysis[0].recommendations![0], 0)
    expect(highImpactKeys.has(buildSceneRecSelectionKey(0, highRecId))).toBe(true)
  })

  it('excludes recommendations already marked as applied on the script scene', () => {
    const firstRecId = recommendationId(sampleSceneAnalysis[0].recommendations![0], 0)
    const scriptScenes = [
      {
        audienceAnalysis: {
          appliedRecommendationIds: [firstRecId],
        },
      },
      {},
    ]
    const keys = collectInitialSelectedRecKeys(sampleSceneAnalysis, scriptScenes)
    expect(keys.size).toBe(2)
    expect(keys.has(buildSceneRecSelectionKey(0, firstRecId))).toBe(false)
  })

  it('groups selected recommendations by 0-based sceneIndex', () => {
    const rec0Id = recommendationId(sampleSceneAnalysis[0].recommendations![0], 0)
    const selected = new Set([buildSceneRecSelectionKey(0, rec0Id)])
    const groups = groupSelectedRecommendationsByScene(sampleSceneAnalysis, selected, [{}, {}])
    expect(groups).toHaveLength(1)
    expect(groups[0].sceneIndex).toBe(0)
    expect(groups[0].sceneNumber).toBe(1)
    expect(groups[0].selectedRecommendations).toHaveLength(1)
    expect(groups[0].selectedRecommendations[0].recId).toBe(rec0Id)
  })

  it('revises selected scenes and persists in batch without blocking on Shot Direction', async () => {
    const rec0Id = recommendationId(sampleSceneAnalysis[0].recommendations![0], 0)
    const selected = new Set([buildSceneRecSelectionKey(0, rec0Id)])
    const scriptScenes = [
      { heading: 'INT. BUNKER - NIGHT', action: 'Old action 1' },
      { heading: 'EXT. ROOFTOP - DAWN', action: 'Old action 2' },
    ]

    const calls: Array<{ url: string; body: any }> = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      calls.push({ url, body })

      if (url === '/api/vision/revise-scene') {
        return new Response(
          JSON.stringify({
            success: true,
            revisedScene: {
              ...scriptScenes[body.sceneIndex],
              action: 'Revised action with visual cipher discovery',
            },
          }),
          { status: 200 }
        )
      }
      throw new Error(`Unexpected URL: ${url}`)
    }) as unknown as typeof fetch

    const onPersistRevisedScenes = vi.fn(async () => ({ sceneCount: 2 }))
    const onRefreshProject = vi.fn(async () => {})

    const result = await runPreVisScenePreparation({
      projectId: 'proj-123',
      sceneAnalysis: sampleSceneAnalysis,
      selectedKeys: selected,
      scriptScenes,
      characters: [{ name: 'Mara' }],
      onPersistRevisedScenes,
      onRefreshProject,
      fetchImpl: fetchMock,
    })

    expect(result.revisedSceneCount).toBe(1)
    expect(result.appliedRecommendationCount).toBe(1)
    expect(result.directedSceneCount).toBe(0)
    expect(result.totalShotsDirected).toBe(0)
    expect(result.failedRevisions).toHaveLength(0)
    expect(result.failedDirections).toHaveLength(0)

    expect(onPersistRevisedScenes).toHaveBeenCalledTimes(1)
    expect(onPersistRevisedScenes.mock.calls[0][0]).toEqual([
      {
        sceneIndex: 0,
        revisedScene: {
          heading: 'INT. BUNKER - NIGHT',
          action: 'Revised action with visual cipher discovery',
        },
        continuationScenes: undefined,
        appliedRecommendationIds: [rec0Id],
      },
    ])

    // Shot direction is deferred to the scene card / Production Agent for fast AR iteration
    expect(calls.every((c) => c.url === '/api/vision/revise-scene')).toBe(true)
    expect(onRefreshProject).toHaveBeenCalledTimes(1)
  })
})
