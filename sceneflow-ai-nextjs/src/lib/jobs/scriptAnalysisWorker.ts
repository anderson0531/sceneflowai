import '@/models'
import GenerationJob from '@/models/GenerationJob'
import {
  notifyUser,
  patchGenerationJobPayload,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import {
  isStepLeaseHeld,
  readWorkerState,
  type ScriptAnalysisWorkerState,
} from '@/lib/jobs/scriptAnalysisWorkerState'
import { applyShowVsTellAutoCap } from '@/lib/script/narrationPolicy'
import { DEFAULT_SCENE_CHUNK_SIZE, chunkProgress, planSceneChunks } from '@/lib/script/audienceResonance/chunkPlan'
import {
  loadScriptForAnalysis,
  persistAudienceReview,
} from '@/lib/script/audienceResonance/persistReview'
import { buildAnalysisContext } from '@/lib/script/audienceResonance/runner'
import { analyzeSceneChunk } from '@/lib/script/audienceResonance/scenePass'
import { applyHysteresis, resolveOverallScore } from '@/lib/script/audienceResonance/scoring'
import { synthesizeReview } from '@/lib/script/audienceResonance/synthesisPass'
import type { AudienceResonanceReview } from '@/lib/script/audienceResonance/types'
import { localeDirective } from '@/lib/prompts/localeDirective'

export type ScriptAnalysisStepOutcome = {
  done: boolean
  error?: string
  phase?: string
  /** Another invocation currently holds the lease on this phase. */
  inFlight?: boolean
}

async function saveWorkerState(jobId: string, worker: ScriptAnalysisWorkerState): Promise<void> {
  await patchGenerationJobPayload(jobId, { _worker: worker })
}

async function failJob(
  jobId: string,
  userId: string,
  projectId: string,
  message: string
): Promise<ScriptAnalysisStepOutcome> {
  await updateGenerationJob(jobId, { status: 'failed', error: message })
  await notifyUser({
    userId,
    projectId,
    jobId,
    type: 'job_failed',
    title: 'Script analysis failed',
    message,
    metadata: { kind: 'script_analysis', dispatch: 'step_worker' },
  })
  return { done: true, error: message }
}

async function loadRunInputs(
  projectId: string,
  userId: string,
  payload: Record<string, unknown>,
  languageBlock?: string
) {
  const context = await loadScriptForAnalysis(projectId)
  if (!context) throw new Error('Project not found')
  if (!context.script.scenes?.length) throw new Error('Script has no scenes to analyze')

  let resolvedLanguageBlock = languageBlock
  if (resolvedLanguageBlock === undefined) {
    const { resolveStoryLocale } = await import('@/i18n/server/storyLocale')
    const { storyLocale, properNouns } = await resolveStoryLocale({
      projectId,
      userIdOrEmail: userId,
    })
    resolvedLanguageBlock = localeDirective(storyLocale, {
      properNouns,
      note: 'The JSON keys and the "priority" values stay exactly as specified; "name" and "category" values are labels shown to the reader and should be localized.',
    })
  }

  const analysisContext = buildAnalysisContext({
    script: context.script,
    targetDemographic:
      (payload.targetDemographic as string | undefined) ?? context.targetDemographic,
    format: context.format,
    contentIntent: context.contentIntent,
    treatment: context.treatment,
    previousScores: context.previousScores,
    languageBlock: resolvedLanguageBlock,
    baseScriptUpdatedAt:
      (payload.baseScriptUpdatedAt as string | null | undefined) ?? context.scriptUpdatedAt,
    chunkSize: (payload.chunkSize as number | undefined) ?? undefined,
  })

  const chunks = planSceneChunks(
    analysisContext.scenesForAnalysis.length,
    (payload.chunkSize as number | undefined) ?? DEFAULT_SCENE_CHUNK_SIZE
  )

  return {
    analysisContext,
    chunks,
    languageBlock: resolvedLanguageBlock ?? '',
    baseScriptUpdatedAt:
      (payload.baseScriptUpdatedAt as string | null | undefined) ?? context.scriptUpdatedAt,
  }
}

function assembleReview(
  analysisContext: ReturnType<typeof buildAnalysisContext>,
  sceneAnalysis: AudienceResonanceReview['sceneAnalysis'],
  synthesis: Awaited<ReturnType<typeof synthesizeReview>>,
  modelId: string | undefined,
  requestedModelId: string | undefined,
  baseScriptUpdatedAt: string | null
): AudienceResonanceReview {
  const categories = applyHysteresis(synthesis.categories, analysisContext.previousScores)
  const { autoScoreCap } = applyShowVsTellAutoCap(
    analysisContext.showVsTellMetrics.ratio,
    analysisContext.narrationPolicy
  )
  const { score } = resolveOverallScore({ sceneAnalysis, categories, autoScoreCap })
  const totalScenes = analysisContext.scenesForAnalysis.length

  return {
    overallScore: score,
    baseScore: 100,
    deductions: synthesis.deductions,
    categories,
    showVsTellRatio: analysisContext.showVsTellMetrics.ratio,
    analysis: synthesis.analysis,
    strengths: synthesis.strengths,
    improvements: synthesis.improvements,
    recommendations: synthesis.recommendations,
    sceneAnalysis,
    targetDemographic: synthesis.targetDemographic,
    emotionalImpact: synthesis.emotionalImpact,
    generatedAt: new Date().toISOString(),
    modelId: synthesis.modelId ?? modelId,
    requestedModelId: synthesis.requestedModelId ?? requestedModelId,
    coverage: { analyzedScenes: sceneAnalysis.length, totalScenes },
    baseScriptUpdatedAt,
  }
}

async function runProcessingPhase(
  jobId: string,
  userId: string,
  projectId: string,
  payload: Record<string, unknown>,
  worker: ScriptAnalysisWorkerState
): Promise<ScriptAnalysisStepOutcome> {
  if (isStepLeaseHeld(worker)) {
    return { done: false, phase: worker.phase, inFlight: true }
  }

  await saveWorkerState(jobId, { ...worker, inFlightAt: new Date().toISOString() })

  try {
    if (worker.phase === 'scenes') {
      const { analysisContext, chunks, languageBlock } = await loadRunInputs(
        projectId,
        userId,
        payload,
        worker.languageBlock
      )
      const chunk = chunks[worker.chunkIndex]
      if (!chunk) {
        throw new Error(`Invalid chunk index ${worker.chunkIndex}`)
      }

      const result = await analyzeSceneChunk(analysisContext, chunk)
      const sceneAnalysis = [...worker.sceneAnalysis, ...result.sceneAnalysis]
      const modelId = result.modelId ?? worker.modelId
      const requestedModelId = result.requestedModelId ?? worker.requestedModelId
      const nextIndex = worker.chunkIndex + 1
      const hasMore = nextIndex < chunks.length

      await updateGenerationJob(jobId, {
        progress: chunkProgress(nextIndex, chunks.length),
      })

      await saveWorkerState(jobId, {
        phase: hasMore ? 'scenes' : 'synthesis',
        chunkIndex: nextIndex,
        sceneAnalysis,
        modelId,
        requestedModelId,
        languageBlock,
        inFlightAt: null,
      })
      return { done: false, phase: hasMore ? 'scenes' : 'synthesis' }
    }

    if (worker.phase === 'synthesis') {
      const { analysisContext, chunks, languageBlock, baseScriptUpdatedAt } = await loadRunInputs(
        projectId,
        userId,
        payload,
        worker.languageBlock
      )
      await updateGenerationJob(jobId, { progress: 90 })

      const sceneAnalysis = [...worker.sceneAnalysis].sort(
        (a, b) => a.sceneNumber - b.sceneNumber
      )
      const synthesis = await synthesizeReview(analysisContext, sceneAnalysis)
      const review = assembleReview(
        analysisContext,
        sceneAnalysis,
        synthesis,
        worker.modelId,
        worker.requestedModelId,
        baseScriptUpdatedAt
      )

      await saveWorkerState(jobId, {
        phase: 'persist',
        chunkIndex: chunks.length,
        sceneAnalysis,
        modelId: review.modelId,
        requestedModelId: review.requestedModelId,
        languageBlock,
        review,
        inFlightAt: null,
      })
      return { done: false, phase: 'persist' }
    }

    if (worker.phase === 'persist') {
      const review = worker.review
      if (!review) {
        throw new Error('Analysis worker missing review before persist')
      }

      const { stale } = await persistAudienceReview({ projectId, review })

      await updateGenerationJob(jobId, {
        status: 'completed',
        progress: 100,
        result: {
          overallScore: review.overallScore,
          analyzedScenes: review.coverage?.analyzedScenes ?? review.sceneAnalysis.length,
          totalScenes: review.coverage?.totalScenes ?? review.sceneAnalysis.length,
          recommendationCount: review.sceneAnalysis.reduce(
            (sum, scene) => sum + (scene.recommendations?.length || 0),
            review.recommendations.length
          ),
          modelId: review.modelId,
          requestedModelId: review.requestedModelId,
          stale,
          dispatch: 'step_worker',
        },
      })
      await notifyUser({
        userId,
        projectId,
        jobId,
        type: 'job_completed',
        title: 'Script analysis ready',
        message: stale
          ? `Audience Resonance scored ${review.overallScore}. Your script changed while this ran, so results may be out of date.`
          : `Audience Resonance scored ${review.overallScore} across ${review.coverage?.analyzedScenes ?? 0} scenes.`,
        metadata: {
          overallScore: review.overallScore,
          stale,
          kind: 'script_analysis',
          dispatch: 'step_worker',
        },
      })
      return { done: true, phase: 'completed' }
    }

    return { done: true, error: `Unknown worker phase: ${String(worker.phase)}` }
  } catch (err) {
    await saveWorkerState(jobId, { ...worker, inFlightAt: null }).catch(() => {})
    throw err
  }
}

/**
 * Run exactly one init / scene-chunk / synthesis / persist phase for a
 * script_analysis job. Safe to call repeatedly: a DB lease guards each phase.
 */
export async function runScriptAnalysisStep(jobId: string): Promise<ScriptAnalysisStepOutcome> {
  const job = await GenerationJob.findByPk(jobId)
  if (!job || job.job_type !== 'script_analysis') {
    return { done: true, error: 'Job not found' }
  }

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return { done: true, phase: job.status }
  }

  const userId = job.user_id
  const projectId = job.project_id
  const payload = (job.payload ?? {}) as Record<string, unknown>
  const worker = readWorkerState(payload)

  try {
    if (job.status === 'processing') {
      if (!worker) {
        return {
          done: true,
          error: 'Analysis worker state missing — cancel and start a new analysis',
        }
      }
      return await runProcessingPhase(jobId, userId, projectId, payload, worker)
    }

    if (job.status !== 'queued') {
      return { done: true, error: `Unexpected job status: ${job.status}` }
    }

    // Init runs only while queued. The conditional update is the claim, so
    // concurrent callers cannot initialize the same job twice.
    const [claimed] = await GenerationJob.update(
      { status: 'processing', progress: 2 },
      { where: { id: jobId, status: 'queued' } }
    )

    if (claimed === 0) {
      const retry = await GenerationJob.findByPk(jobId)
      const retryWorker = retry
        ? readWorkerState((retry.payload ?? {}) as Record<string, unknown>)
        : null
      if (retry?.status === 'processing' && retryWorker) {
        return await runProcessingPhase(
          jobId,
          userId,
          projectId,
          (retry.payload ?? {}) as Record<string, unknown>,
          retryWorker
        )
      }
      return { done: false, phase: 'claim_pending', inFlight: true }
    }

    const { languageBlock, chunks } = await loadRunInputs(projectId, userId, payload)
    if (!chunks.length) {
      throw new Error('Script has no scenes to analyze')
    }

    const nextWorker: ScriptAnalysisWorkerState = {
      phase: 'scenes',
      chunkIndex: 0,
      sceneAnalysis: [],
      languageBlock,
      inFlightAt: null,
    }

    await saveWorkerState(jobId, nextWorker)
    await updateGenerationJob(jobId, { progress: 5 })
    return { done: false, phase: nextWorker.phase }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Script analysis failed'
    return failJob(jobId, userId, projectId, message)
  }
}
