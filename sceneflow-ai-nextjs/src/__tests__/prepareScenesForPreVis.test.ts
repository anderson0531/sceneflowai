import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'
import { recommendationId } from '@/lib/script/audienceResonance/highImpact'
import {
  DEFAULT_SCENE_DIRECTOR_CONCURRENCY,
  buildSceneRecSelectionKey,
  collectInitialSelectedRecKeys,
  getArRecommendationsBackgroundState,
  groupSelectedRecommendationsByScene,
  patchArRecommendationsBackgroundState,
  runPreVisScenePreparation,
  subscribeArRecommendationsBackgroundState,
  summarizeSelectedRecommendations,
  type PreVisPrepProgress,
  type PreVisSceneStatusEvent,
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
    const statusEvents: PreVisSceneStatusEvent[] = []

    const result = await runPreVisScenePreparation({
      projectId: 'proj-123',
      sceneAnalysis: sampleSceneAnalysis,
      selectedKeys: selected,
      scriptScenes,
      characters: [{ name: 'Mara' }],
      targetDemographic: 'Sci-Fi Thriller Core',
      scriptTitle: 'The Cipher',
      logline: 'A cryptographer uncovers a signal in the bunker.',
      onSceneStatusChange: (ev) => statusEvents.push(ev),
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

    expect(statusEvents.map((e) => ({ sceneNumber: e.sceneNumber, status: e.status }))).toEqual([
      { sceneNumber: 1, status: 'running' },
      { sceneNumber: 1, status: 'done' },
    ])

    // Verify Scene Director payload includes nested `context` so `/api/vision/revise-scene` executes Gemini
    expect(calls[0].body).toMatchObject({
      projectId: 'proj-123',
      sceneIndex: 0,
      revisionMode: 'recommendations',
      customInstruction: '1. Replace exposition monologue with visual discovery of the cipher.',
      targetDemographic: 'Sci-Fi Thriller Core',
      revisionDepth: 'moderate',
      context: {
        characters: [{ name: 'Mara' }],
        previousScene: null,
        nextScene: scriptScenes[1],
        scriptTitle: 'The Cipher',
        logline: 'A cryptographer uncovers a signal in the bunker.',
      },
    })

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

  it('tracks background AR recommendation state across modal open/close cycles', () => {
    const notifySpy = vi.fn()
    const unsubscribe = subscribeArRecommendationsBackgroundState(notifySpy)

    const initial = getArRecommendationsBackgroundState('proj-bg-test')
    expect(initial.isRunning).toBe(false)

    patchArRecommendationsBackgroundState('proj-bg-test', {
      isRunning: true,
      pendingOpenTab: 'recommendations',
    })
    expect(notifySpy).toHaveBeenCalledTimes(1)
    expect(getArRecommendationsBackgroundState('proj-bg-test').isRunning).toBe(true)
    expect(getArRecommendationsBackgroundState('proj-bg-test').pendingOpenTab).toBe(
      'recommendations'
    )

    unsubscribe()
  })

  it('removes applied recommendations from Scene Breakdown cards instead of leaving strikethrough lists', () => {
    const modalSource = readFileSync(
      path.join(process.cwd(), 'src/components/vision/ScriptReviewModal.tsx'),
      'utf8'
    )
    expect(modalSource).toContain('{unappliedRecsInScene.length > 0 && (')
    expect(modalSource).toContain('{unappliedRecsInScene.map(({ rec, rIdx, recId }) => {')
    expect(modalSource).not.toContain('line-through opacity-80')
    expect(modalSource).toContain('Scene Director Agent')
    expect(modalSource).toContain('Review &amp; Select')
  })

  it('summarizes selected recommendations and supports Scenes < 80 filtering', () => {
    const allSelected = collectInitialSelectedRecKeys(sampleSceneAnalysis)
    const fullSummary = summarizeSelectedRecommendations(sampleSceneAnalysis, allSelected)
    expect(fullSummary).toEqual({
      selectedRecCount: 3,
      selectedSceneCount: 2,
      totalUnappliedCount: 3,
      totalScenesWithUnappliedCount: 2,
      selectedPointsDeducted: 5,
      highImpactSelectedCount: 1,
    })

    // Filter to scenes scoring below 80 (only Scene 1 has score 72; Scene 2 has 88)
    const lowScoreKeys = collectInitialSelectedRecKeys(sampleSceneAnalysis, undefined, {
      maxSceneScoreExclusive: 80,
    })
    expect(lowScoreKeys.size).toBe(2)
    const lowScoreSummary = summarizeSelectedRecommendations(sampleSceneAnalysis, lowScoreKeys)
    expect(lowScoreSummary.selectedRecCount).toBe(2)
    expect(lowScoreSummary.selectedSceneCount).toBe(1)
    expect(lowScoreSummary.totalUnappliedCount).toBe(3)
  })

  it('runs concurrent Scene Director requests up to DEFAULT_SCENE_DIRECTOR_CONCURRENCY and retries transient 429s', async () => {
    const fiveScenesAnalysis: SceneAnalysisForPreVis[] = Array.from({ length: 5 }, (_, idx) => ({
      sceneNumber: idx + 1,
      sceneHeading: `INT. ROOM ${idx + 1} - NIGHT`,
      score: 70,
      recommendations: [{ text: `Fix pacing in scene ${idx + 1}`, priority: 'high', pointsDeducted: 3 }],
    }))
    const fiveScriptScenes = Array.from({ length: 5 }, (_, idx) => ({
      heading: `INT. ROOM ${idx + 1} - NIGHT`,
      action: `Original action ${idx + 1}`,
      beats: [{ beatId: `b-${idx}`, beat_title: 'Beat 1' }],
    }))

    const selectedKeys = collectInitialSelectedRecKeys(fiveScenesAnalysis, fiveScriptScenes)
    expect(selectedKeys.size).toBe(5)

    let inFlight = 0
    let peakInFlight = 0
    let scene2Attempts = 0
    const progressEvents: PreVisPrepProgress[] = []
    const requestBodies: any[] = []

    const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      requestBodies.push(body)
      inFlight += 1
      peakInFlight = Math.max(peakInFlight, inFlight)

      await new Promise((resolve) => setTimeout(resolve, 15))
      inFlight -= 1

      if (body.sceneIndex === 1 && scene2Attempts === 0) {
        scene2Attempts += 1
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          revisedScene: {
            ...fiveScriptScenes[body.sceneIndex],
            action: `Revised action ${body.sceneIndex + 1}`,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })

    const onPersistRevisedScenes = vi.fn(async () => ({ sceneCount: 5 }))

    const result = await runPreVisScenePreparation({
      projectId: 'proj-concurrent',
      sceneAnalysis: fiveScenesAnalysis,
      selectedKeys,
      scriptScenes: fiveScriptScenes,
      revisionDepth: 'deep',
      directorNote: 'Keep dialogue taut and grounded.',
      preserveElements: ['music'],
      retryBaseDelayMs: 5,
      onProgress: (p) => progressEvents.push(p),
      onPersistRevisedScenes,
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    expect(DEFAULT_SCENE_DIRECTOR_CONCURRENCY).toBe(3)
    expect(peakInFlight).toBeGreaterThan(1)
    expect(peakInFlight).toBeLessThanOrEqual(DEFAULT_SCENE_DIRECTOR_CONCURRENCY)
    expect(scene2Attempts).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(6) // 5 scenes + 1 transient retry on Scene 2
    expect(result.revisedSceneCount).toBe(5)
    expect(result.appliedRecommendationCount).toBe(5)
    expect(result.failedRevisions).toEqual([])

    // Verify hybrid mode, depth, and preserveElements propagated to Scene Director API
    expect(requestBodies[0].revisionMode).toBe('hybrid')
    expect(requestBodies[0].customInstruction).toBe('Keep dialogue taut and grounded.')
    expect(requestBodies[0].revisionDepth).toBe('deep')
    expect(requestBodies[0].preserveElements).toEqual(['music'])

    // Verify preserveElements propagated to batch persistence
    expect(onPersistRevisedScenes).toHaveBeenCalledTimes(1)
    expect(onPersistRevisedScenes.mock.calls[0][0][0].preserveElements).toEqual(['music'])

    // Verify progress events reported concurrent active scenes and smooth percentage
    expect(progressEvents.some((p) => (p.activeSceneNumbers?.length ?? 0) > 1)).toBe(true)
    expect(progressEvents[progressEvents.length - 1]?.progressPct).toBe(100)
  })
})
