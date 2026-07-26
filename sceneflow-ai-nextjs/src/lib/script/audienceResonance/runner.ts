import {
  applyShowVsTellAutoCap,
  calculateShowVsTellMetrics,
  resolveNarrationPolicy,
  type NarrationPolicy,
} from '@/lib/script/narrationPolicy'
import { DEFAULT_SCENE_CHUNK_SIZE, chunkProgress, planSceneChunks } from './chunkPlan'
import { analyzeSceneChunk } from './scenePass'
import { synthesizeReview } from './synthesisPass'
import { applyHysteresis, resolveOverallScore } from './scoring'
import type {
  AnalysisContext,
  AnalysisScript,
  AudienceResonanceReview,
  PreviousScores,
  SceneAnalysis,
} from './types'

export type AnalysisProgress = {
  progress: number
  stage: 'scenes' | 'synthesis'
  completedChunks: number
  totalChunks: number
  analyzedScenes: number
  totalScenes: number
}

/**
 * Wraps one unit of analysis work. Callers can supply a durable executor such
 * as Inngest's `step.run` so a retry resumes mid-analysis instead of restarting.
 */
export type RunChunk = <T>(name: string, fn: () => Promise<T>) => Promise<T>

export type RunAudienceResonanceInput = {
  script: AnalysisScript
  targetDemographic?: string
  format?: string
  contentIntent?: string
  treatment?: { character_descriptions?: Array<{ name?: string; role?: string }> }
  previousScores?: PreviousScores
  /** script.scriptUpdatedAt when the run started, recorded for staleness checks. */
  baseScriptUpdatedAt?: string | null
  chunkSize?: number
  onProgress?: (progress: AnalysisProgress) => void | Promise<void>
  /** Runs one chunk. The Inngest worker supplies a durable step wrapper. */
  runChunk?: RunChunk
}

/** Strips empty narration so it neither reaches the prompt nor skews Show vs Tell. */
export function cleanScenesForAnalysis(scenes: any[]): any[] {
  return (scenes || []).map((scene: any) => {
    const rawNarration = (scene?.narration || '').trim().toLowerCase()
    if (!rawNarration || rawNarration === 'none' || rawNarration === 'null') {
      const { narration: _removed, ...rest } = scene || {}
      return rest
    }
    return scene
  })
}

/** Stable seed from script identity so repeat runs are reproducible. */
export function deriveContentSeed(script: AnalysisScript): number {
  const seedContent = JSON.stringify({
    title: script.title,
    logline: script.logline,
    sceneCount: script.scenes?.length,
  })
  let seed = 0
  for (let i = 0; i < seedContent.length; i++) {
    seed = (seed << 5) - seed + seedContent.charCodeAt(i)
    seed = seed & seed
  }
  return Math.abs(seed)
}

export function buildAnalysisContext(input: RunAudienceResonanceInput): AnalysisContext {
  const scenesForAnalysis = cleanScenesForAnalysis(input.script.scenes)
  const narrationPolicy: NarrationPolicy = resolveNarrationPolicy({
    format: input.format || 'short-film',
    treatment:
      input.treatment ?? {
        character_descriptions: (input.script.characters || []).map(
          (c: { name?: string; role?: string }) => ({ name: c.name, role: c.role })
        ),
      },
    contentIntent: input.contentIntent,
  })

  return {
    script: input.script,
    scenesForAnalysis,
    showVsTellMetrics: calculateShowVsTellMetrics(scenesForAnalysis),
    narrationPolicy,
    targetDemographic: input.targetDemographic,
    contentSeed: deriveContentSeed(input.script),
    previousScores: input.previousScores,
  }
}

/**
 * Full audience resonance analysis: every scene is scored in chunks, then the
 * results are synthesized into a script-level verdict.
 *
 * `runChunk` lets the caller make each chunk a durable unit of work. The
 * Inngest worker passes `step.run`, which is what removes the single-request
 * timeout that previously forced long scripts to be sampled.
 */
export async function runAudienceResonance(
  input: RunAudienceResonanceInput
): Promise<AudienceResonanceReview> {
  const context = buildAnalysisContext(input)
  const totalScenes = context.scenesForAnalysis.length
  const chunks = planSceneChunks(totalScenes, input.chunkSize ?? DEFAULT_SCENE_CHUNK_SIZE)
  const runChunk = input.runChunk ?? (async (_name, fn) => fn())

  const sceneAnalysis: SceneAnalysis[] = []
  let modelId: string | undefined
  let requestedModelId: string | undefined

  for (const chunk of chunks) {
    const first = chunk.sceneNumbers[0]
    const last = chunk.sceneNumbers[chunk.sceneNumbers.length - 1]
    const result = await runChunk(`scenes-${first}-${last}`, () =>
      analyzeSceneChunk(context, chunk)
    )
    sceneAnalysis.push(...result.sceneAnalysis)
    modelId = result.modelId ?? modelId
    requestedModelId = result.requestedModelId ?? requestedModelId

    await input.onProgress?.({
      progress: chunkProgress(chunk.index + 1, chunks.length),
      stage: 'scenes',
      completedChunks: chunk.index + 1,
      totalChunks: chunks.length,
      analyzedScenes: sceneAnalysis.length,
      totalScenes,
    })
  }

  sceneAnalysis.sort((a, b) => a.sceneNumber - b.sceneNumber)

  await input.onProgress?.({
    progress: 90,
    stage: 'synthesis',
    completedChunks: chunks.length,
    totalChunks: chunks.length,
    analyzedScenes: sceneAnalysis.length,
    totalScenes,
  })

  const synthesis = await runChunk('synthesis', () => synthesizeReview(context, sceneAnalysis))

  const categories = applyHysteresis(synthesis.categories, context.previousScores)
  const { autoScoreCap } = applyShowVsTellAutoCap(
    context.showVsTellMetrics.ratio,
    context.narrationPolicy
  )
  const { score } = resolveOverallScore({ sceneAnalysis, categories, autoScoreCap })

  return {
    overallScore: score,
    baseScore: 100,
    deductions: synthesis.deductions,
    categories,
    showVsTellRatio: context.showVsTellMetrics.ratio,
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
    baseScriptUpdatedAt: input.baseScriptUpdatedAt ?? null,
  }
}
