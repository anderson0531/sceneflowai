import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SCENE_CHUNK_SIZE,
  chunkProgress,
  planSceneChunks,
} from '@/lib/script/audienceResonance/chunkPlan'
import { isReviewStale, isStoredReviewStale } from '@/lib/script/audienceResonance/staleness'
import {
  applyHysteresis,
  dimensionalScore,
  resolveOverallScore,
  sceneWeightedScore,
} from '@/lib/script/audienceResonance/scoring'
import { ACTIVE_JOB_STATUSES } from '@/lib/jobs/jobStatus'
import {
  GEMINI_TEXT_MODEL_CANDIDATES,
  getAudienceResonanceModel,
  getGeminiTextModel,
  getScriptGenerationModel,
} from '@/lib/config/modelConfig'
import type { SceneAnalysis } from '@/lib/script/audienceResonance/types'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function scene(sceneNumber: number, score: number, storyWeight?: number): SceneAnalysis {
  return {
    sceneNumber,
    sceneHeading: `Scene ${sceneNumber}`,
    score,
    storyWeight,
    pacing: 'moderate',
    tension: 'medium',
    characterDevelopment: 'moderate',
    visualPotential: 'medium',
    notes: '',
    recommendations: [],
  }
}

describe('Scene chunk planning', () => {
  it('covers every scene exactly once', () => {
    for (const sceneCount of [1, 7, 10, 11, 30, 31, 64, 120]) {
      const chunks = planSceneChunks(sceneCount)
      const covered = chunks.flatMap((c) => c.sceneNumbers)

      expect(covered).toHaveLength(sceneCount)
      expect(new Set(covered).size).toBe(sceneCount)
      expect(covered[0]).toBe(1)
      expect(covered[covered.length - 1]).toBe(sceneCount)
    }
  })

  it('never samples or skips scenes on long scripts', () => {
    // The regression this guards: scripts over 30 scenes used to be sampled
    // roughly every 15th scene, so most scenes got no recommendations.
    const chunks = planSceneChunks(64)
    const covered = chunks.flatMap((c) => c.sceneNumbers)

    expect(covered).toEqual(Array.from({ length: 64 }, (_, i) => i + 1))
  })

  it('respects the chunk size and leaves a partial final chunk', () => {
    const chunks = planSceneChunks(25, 10)

    expect(chunks).toHaveLength(3)
    expect(chunks[0].sceneNumbers).toHaveLength(10)
    expect(chunks[1].sceneNumbers).toHaveLength(10)
    expect(chunks[2].sceneNumbers).toEqual([21, 22, 23, 24, 25])
  })

  it('exposes zero-based slice bounds that match the scene numbers', () => {
    for (const chunk of planSceneChunks(23, 7)) {
      expect(chunk.startIndex).toBe(chunk.sceneNumbers[0] - 1)
      expect(chunk.endIndex).toBe(chunk.sceneNumbers[chunk.sceneNumbers.length - 1])
    }
  })

  it('handles empty and invalid scene counts', () => {
    expect(planSceneChunks(0)).toEqual([])
    expect(planSceneChunks(-5)).toEqual([])
    expect(planSceneChunks(Number.NaN)).toEqual([])
  })

  it('treats a non-positive chunk size as one scene per chunk', () => {
    expect(planSceneChunks(3, 0)).toHaveLength(3)
  })

  it('reserves the last tenth of progress for synthesis', () => {
    expect(chunkProgress(0, 5)).toBe(0)
    expect(chunkProgress(5, 5)).toBe(90)
    expect(chunkProgress(3, 6)).toBe(45)
    expect(chunkProgress(1, 0)).toBe(90)
  })

  it('defaults to a chunk size that keeps requests small', () => {
    expect(DEFAULT_SCENE_CHUNK_SIZE).toBeGreaterThan(0)
    expect(DEFAULT_SCENE_CHUNK_SIZE).toBeLessThanOrEqual(15)
  })
})

describe('Review staleness', () => {
  const earlier = '2026-07-26T10:00:00.000Z'
  const later = '2026-07-26T10:30:00.000Z'

  it('flags a review the script outran', () => {
    expect(isReviewStale({ baseScriptUpdatedAt: earlier, currentScriptUpdatedAt: later })).toBe(true)
  })

  it('accepts a review whose script has not moved', () => {
    expect(isReviewStale({ baseScriptUpdatedAt: earlier, currentScriptUpdatedAt: earlier })).toBe(
      false
    )
  })

  it('trusts the server flag even when timestamps look fine', () => {
    // The server computes this under a row lock at write time, so it wins.
    expect(
      isReviewStale({ baseScriptUpdatedAt: later, currentScriptUpdatedAt: later, stale: true })
    ).toBe(true)
  })

  it('does not guess when either timestamp is missing or unparseable', () => {
    expect(isReviewStale({ currentScriptUpdatedAt: later })).toBe(false)
    expect(isReviewStale({ baseScriptUpdatedAt: earlier })).toBe(false)
    expect(isReviewStale({ baseScriptUpdatedAt: 'not-a-date', currentScriptUpdatedAt: later })).toBe(
      false
    )
  })

  it('reports stored reviews as fresh when absent', () => {
    expect(isStoredReviewStale(null, later)).toBe(false)
    expect(isStoredReviewStale(undefined, later)).toBe(false)
  })

  it('reads baseScriptUpdatedAt off a stored review', () => {
    expect(isStoredReviewStale({ baseScriptUpdatedAt: earlier }, later)).toBe(true)
    expect(isStoredReviewStale({ baseScriptUpdatedAt: later }, later)).toBe(false)
  })
})

describe('Score resolution', () => {
  it('weights scene scores by story weight', () => {
    // Scene 1 carries four times the weight, so the average leans toward it.
    expect(sceneWeightedScore([scene(1, 90, 80), scene(2, 50, 20)])).toBe(82)
  })

  it('falls back to a simple average when weights are missing', () => {
    expect(sceneWeightedScore([scene(1, 80), scene(2, 60)])).toBe(70)
  })

  it('returns null when there is nothing to score', () => {
    expect(sceneWeightedScore([])).toBeNull()
  })

  it('prefers scene scores over dimensional scores', () => {
    const categories = [{ name: 'Dialogue Subtext', score: 40, weight: 20 }]
    const { score, basis } = resolveOverallScore({
      sceneAnalysis: [scene(1, 88, 50)],
      categories,
      autoScoreCap: 100,
    })

    expect(basis).toBe('scene')
    expect(score).toBe(88)
  })

  it('uses dimensional scores when no scene analysis survived', () => {
    const { score, basis } = resolveOverallScore({
      sceneAnalysis: [],
      categories: [
        { name: 'Dialogue Subtext', score: 80, weight: 20 },
        { name: 'Structural Integrity', score: 60, weight: 20 },
      ],
      autoScoreCap: 100,
    })

    expect(basis).toBe('dimensional')
    expect(score).toBe(70)
  })

  it('applies the narration auto cap', () => {
    const { score } = resolveOverallScore({
      sceneAnalysis: [scene(1, 95, 50)],
      categories: [],
      autoScoreCap: 75,
    })

    expect(score).toBe(75)
  })

  it('computes a weighted dimensional average', () => {
    expect(
      dimensionalScore([
        { name: 'Dialogue Subtext', score: 100, weight: 20 },
        { name: 'Show vs Tell Ratio', score: 50, weight: 10 },
      ])
    ).toBe(83)
  })

  it('anchors scores toward the previous run to stop them swinging', () => {
    const [anchored] = applyHysteresis(
      [{ name: 'Emotional Arc', score: 80, weight: 20 }],
      { overallScore: 70, categories: [{ name: 'Emotional Arc', score: 70, weight: 20 }] }
    )

    // 20% previous + 80% new = 78, an 8 point move that stays inside the clamp.
    expect(anchored.score).toBe(78)
  })

  it('clamps a dimension to 15 points of movement per run', () => {
    const [anchored] = applyHysteresis(
      [{ name: 'Emotional Arc', score: 100, weight: 20 }],
      { overallScore: 20, categories: [{ name: 'Emotional Arc', score: 20, weight: 20 }] }
    )

    expect(anchored.score).toBe(35)
  })

  it('leaves dimensions untouched when there is no previous run', () => {
    const categories = [{ name: 'Emotional Arc', score: 90, weight: 20 }]
    expect(applyHysteresis(categories, undefined)).toEqual(categories)
  })
})

describe('Job lifecycle', () => {
  it('treats only queued and processing as active', () => {
    expect(ACTIVE_JOB_STATUSES).toEqual(['queued', 'processing'])
    expect(ACTIVE_JOB_STATUSES).not.toContain('completed')
    expect(ACTIVE_JOB_STATUSES).not.toContain('failed')
  })

  it('registers script_analysis as a job type with a worker', () => {
    expect(readSource('src/models/GenerationJob.ts')).toContain("'script_analysis'")

    const worker = readSource('src/inngest/functions.ts')
    expect(worker).toContain('process-script-analysis')
    expect(worker).toContain('processScriptAnalysis')
    // Must be registered, or the queued event is never consumed.
    expect(worker).toMatch(/inngestFunctions\s*=\s*\[[\s\S]*processScriptAnalysis/)
  })

  it('enqueues rather than analyzing inline, and rejects duplicate runs', () => {
    const start = readSource('src/app/api/vision/review-script/start/route.ts')

    expect(start).toContain('findActiveJob')
    expect(start).toContain('alreadyRunning')
    expect(start).toContain('baseScriptUpdatedAt')
    expect(start).toContain('status: 202')
  })

  it('fails fast without charging when Inngest dispatch fails', () => {
    const start = readSource('src/app/api/vision/review-script/start/route.ts')
    const jobService = readSource('src/lib/jobs/jobService.ts')

    expect(start).toContain('isInngestDispatchConfigured')
    expect(start).toContain('dispatched')
    expect(start).toContain('status: 503')
    expect(start).toContain('background jobs are not configured')
    expect(start).toContain("code: 'INNGEST_NOT_CONFIGURED'")
    // Guard before create — no queued orphan when the key is missing.
    const configGuard = start.indexOf('if (!isInngestDispatchConfigured())')
    const createCall = start.indexOf('await createGenerationJob')
    expect(configGuard).toBeGreaterThan(-1)
    expect(createCall).toBeGreaterThan(configGuard)
    // Charge must come after the dispatch guard, not before.
    const dispatchGuard = start.indexOf('if (!dispatched)')
    const chargeCall = start.indexOf('CreditService.charge')
    expect(dispatchGuard).toBeGreaterThan(-1)
    expect(chargeCall).toBeGreaterThan(dispatchGuard)

    expect(jobService).toContain('isInngestDispatchConfigured')
    expect(jobService).toContain('cancelActiveJobsForProject')
    expect(jobService).toContain("patch.status === 'cancelled'")
    expect(jobService).toContain('caller must handle')
    expect(jobService).not.toContain('job remains queued')
  })

  it('exposes cancel for queued AR jobs via PATCH /api/jobs and the dock', () => {
    const jobsApi = readSource('src/app/api/jobs/route.ts')
    const jobService = readSource('src/lib/jobs/jobService.ts')
    const dock = readSource('src/components/vision/BackgroundJobDock.tsx')
    const visionPage = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    const scriptPanel = readSource('src/components/vision/ScriptPanel.tsx')
    const hook = readSource('src/hooks/useBackgroundJob.ts')

    expect(jobsApi).toContain("action === 'cancel-active'")
    expect(jobsApi).toContain('cancelActiveJobsForProject')
    expect(jobsApi).toContain('cancelGenerationJob')
    expect(jobService).toContain('export async function cancelGenerationJob')
    expect(jobService).toContain('export async function cancelActiveJobsForProject')
    expect(dock).toContain('onCancel')
    expect(dock).toContain('Cancel analysis')
    expect(dock).toContain("job.status === 'cancelled'")
    expect(dock).toContain('isActive && onCancel')
    expect(visionPage).toContain('onCancel={() => void scriptAnalysisJob.cancel()}')
    expect(visionPage).toContain("label: 'Cancel analysis'")
    expect(visionPage).toContain("label: 'Clear stuck analysis'")
    expect(visionPage).toContain('cancelActive')
    expect(visionPage).toContain('scriptAnalysisJob.rehydrate')
    expect(visionPage).toContain("job.status === 'cancelled'")
    expect(visionPage).toContain('Analysis cancelled')
    expect(visionPage).toContain('INNGEST_NOT_CONFIGURED')
    expect(visionPage).toContain('Audience Resonance isn’t available right now')
    expect(visionPage).toContain('onCancelReviews={() => void scriptAnalysisJob.cancel()}')
    expect(scriptPanel).toContain('onCancelReviews')
    expect(hook).toContain('cancelActive')
    expect(hook).toContain('rehydrate')
  })

  it('returns a stable code when Inngest is not configured', () => {
    const start = readSource('src/app/api/vision/review-script/start/route.ts')
    expect(start).toContain("code: 'INNGEST_NOT_CONFIGURED'")
  })

  it('scopes job reads to the session user', () => {
    const jobs = readSource('src/app/api/jobs/route.ts')

    expect(jobs).toContain('getSessionUserId')
    // A client-supplied userId would let one account read another's jobs.
    expect(jobs).not.toContain("searchParams.get('userId')")
  })

  it('persists only review metadata from the background job', () => {
    const persist = readSource('src/lib/script/audienceResonance/persistReview.ts')

    expect(persist).toContain('visionPhase.reviews')
    // Writing script data from a late job would clobber newer user edits.
    expect(persist).not.toMatch(/visionPhase\.script\s*=/)
    expect(persist).not.toMatch(/visionPhase\.scenes\s*=/)
  })
})

describe('Model selection', () => {
  it('pins Audience Resonance to the GA workhorse', () => {
    expect(getAudienceResonanceModel()).toBe('gemini-3.6-flash')

    for (const relativePath of [
      'src/app/api/treatment/audience-resonance/route.ts',
      'src/app/api/treatment/analyze-resonance/route.ts',
      'src/lib/script/audienceResonance/scenePass.ts',
      'src/lib/script/audienceResonance/synthesisPass.ts',
    ]) {
      const source = readSource(relativePath)
      expect(source, `${relativePath} should use AR model helper`).toContain(
        'getAudienceResonanceModel()'
      )
      expect(source, `${relativePath} should not hardcode a model`).not.toContain(
        "model: 'gemini-2.5-flash'"
      )
      expect(source, `${relativePath} should not hardcode a model`).not.toContain(
        "model: 'gemini-3.0-flash'"
      )
      expect(source, `${relativePath} should not use Pro for AR`).not.toContain(
        "getGeminiTextModel('pro')"
      )
    }
  })

  it('keeps scene revision on the Pro tier helper', () => {
    expect(getGeminiTextModel('pro')).toBe('gemini-3.1-pro-preview')
    const source = readSource('src/app/api/vision/revise-scene/route.ts')
    expect(source).toContain("getGeminiTextModel('pro')")
  })

  it('pins script generation to the GA workhorse', () => {
    expect(getScriptGenerationModel()).toBe('gemini-3.6-flash')

    for (const relativePath of [
      'src/app/api/vision/generate-script/route.ts',
      'src/app/api/vision/generate-script-v2/route.ts',
      'src/app/api/script/complete-gaps/route.ts',
    ]) {
      const source = readSource(relativePath)
      expect(source, `${relativePath} should use script model helper`).toContain(
        'getScriptGenerationModel()'
      )
      expect(source, `${relativePath} should not hardcode 2.5 flash`).not.toContain(
        "model: 'gemini-2.5-flash'"
      )
    }
  })

  it('keeps the probe candidate list ranked newest-first', () => {
    expect(GEMINI_TEXT_MODEL_CANDIDATES[0]).toBe('gemini-3.6-flash')
    expect(GEMINI_TEXT_MODEL_CANDIDATES).toContain('gemini-3.1-pro-preview')
    expect(GEMINI_TEXT_MODEL_CANDIDATES).toContain('gemini-3.5-flash')
    expect(GEMINI_TEXT_MODEL_CANDIDATES).not.toContain('gemini-3.0-flash')
  })

  it('records a downgrade instead of failing over in silence', () => {
    const gemini = readSource('src/lib/vertexai/gemini.ts')

    expect(gemini).toContain('recordModelDowngrade')
    expect(gemini).toContain('requestedModelId')
    expect(gemini).toContain('downgraded')
  })
})

describe('Scene revision context', () => {
  it('chains repeat previews from the latest revision', () => {
    const modal = readSource('src/components/vision/SceneEditorModalV2.tsx')

    // Sending the original scene every time made a second Generate Preview
    // discard the first revision.
    expect(modal).toContain('revisionHistory[currentHistoryIndex] ?? scene')
    expect(modal).toContain('currentScene: baseScene')
  })

  it('sends audience, story, and depth so edits are not context-starved', () => {
    const modal = readSource('src/components/vision/SceneEditorModalV2.tsx')

    expect(modal).toContain('targetDemographic')
    expect(modal).toContain('revisionDepth')
    expect(modal).toContain('logline')
  })

  it('offers the deep restructure mode the UI previously never reached', () => {
    const modal = readSource('src/components/vision/SceneEditorModalV2.tsx')
    expect(modal).toContain("value: 'deep'")
  })

  it('gives the model neighbouring scene content, not just headings', () => {
    const route = readSource('src/app/api/vision/revise-scene/route.ts')

    expect(route).toContain('formatNeighbourScene')
    expect(route).toContain('formatCharacterProfiles')
  })

  it('no longer blocks the whole page while a scene preview generates', () => {
    const modal = readSource('src/components/vision/SceneEditorModalV2.tsx')
    expect(modal).not.toContain('useOverlayStore')
  })
})
