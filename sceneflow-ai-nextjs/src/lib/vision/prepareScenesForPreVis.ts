import {
  recommendationIsHighImpact,
  recommendationId,
  recommendationText,
} from '@/lib/script/audienceResonance/highImpact'
import {
  isAbortError,
  requestSceneShotDirection,
} from '@/lib/vision/scriptInceptionFollowups'

async function runWithConcurrencyLimit<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const concurrency = Math.max(1, Math.floor(limit) || 1)
  let nextIndex = 0
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex++
        await worker(items[currentIndex], currentIndex)
      }
    }
  )
  await Promise.all(runners)
}

export interface SceneRecommendationCandidate {
  text: string
  category?: string
  targetElement?: string
  impact?: 'structural' | 'polish'
  priority?: 'high' | 'medium' | 'low'
  pointsDeducted?: number
}

export interface SceneAnalysisForPreVis {
  sceneNumber?: number
  sceneHeading?: string
  score?: number
  recommendations?: (string | SceneRecommendationCandidate)[]
}

export interface SelectedSceneRecommendation {
  recId: string
  recIndex: number
  text: string
  raw: string | SceneRecommendationCandidate
  highImpact: boolean
}

export interface SceneRecommendationSelectionGroup {
  /** 0-based index in script.scenes */
  sceneIndex: number
  /** 1-based scene number */
  sceneNumber: number
  sceneHeading: string
  selectedRecommendations: SelectedSceneRecommendation[]
}

export interface BatchSceneRevisionItem {
  /** 0-based scene index in script.scenes */
  sceneIndex: number
  revisedScene: any
  continuationScenes?: any[]
  appliedRecommendationIds: string[]
}

export type PreVisPrepPhase =
  | 'revise-scenes'
  | 'persist-scenes'
  | 'scene-direction'
  | 'shot-direction'
  | 'done'

export interface PreVisPrepProgress {
  phase: PreVisPrepPhase
  done: number
  total: number
  currentSceneNumber?: number
  label: string
}

export interface PreVisPrepResult {
  revisedSceneCount: number
  appliedRecommendationCount: number
  directedSceneCount: number
  totalShotsDirected: number
  failedRevisions: Array<{ sceneNumber: number; error: string }>
  failedDirections: Array<{ sceneNumber: number; error: string }>
}

/**
 * Deterministic selection key for a recommendation inside a scene: `${sceneIndex}::${recId}`.
 */
export function buildSceneRecSelectionKey(sceneIndex: number, recId: string): string {
  return `${sceneIndex}::${recId}`
}

/**
 * Resolve 0-based scene index from a SceneAnalysis entry.
 */
export function resolveSceneAnalysisIndex(
  sceneAnalysisItem: SceneAnalysisForPreVis,
  arrayIndex: number
): number {
  const num = sceneAnalysisItem?.sceneNumber
  if (typeof num === 'number' && Number.isFinite(num) && num >= 1) {
    return num - 1
  }
  return arrayIndex
}

/**
 * Check whether a recommendation is already marked as applied on the script scene's
 * audienceAnalysis.appliedRecommendationIds or local applied set.
 */
export function isRecommendationApplied(
  sceneIndex: number,
  recId: string,
  scriptScenes?: any[],
  localAppliedKeys?: Set<string>
): boolean {
  const key = buildSceneRecSelectionKey(sceneIndex, recId)
  if (localAppliedKeys?.has(key)) return true
  const scriptScene = Array.isArray(scriptScenes) ? scriptScenes[sceneIndex] : undefined
  const appliedIds = scriptScene?.audienceAnalysis?.appliedRecommendationIds
  return Array.isArray(appliedIds) && appliedIds.includes(recId)
}

/**
 * Collect recommendation selection keys across all scenes in sceneAnalysis.
 * Defaults to selecting all unapplied recommendations (or high-impact only when requested).
 */
export function collectInitialSelectedRecKeys(
  sceneAnalysis: SceneAnalysisForPreVis[],
  scriptScenes?: any[],
  options?: {
    highImpactOnly?: boolean
    localAppliedKeys?: Set<string>
  }
): Set<string> {
  const selected = new Set<string>()
  const highImpactOnly = options?.highImpactOnly === true
  const localAppliedKeys = options?.localAppliedKeys

  if (!Array.isArray(sceneAnalysis)) return selected

  sceneAnalysis.forEach((scene, arrayIdx) => {
    const sceneIndex = resolveSceneAnalysisIndex(scene, arrayIdx)
    const recs = Array.isArray(scene?.recommendations) ? scene.recommendations : []
    recs.forEach((rec, recIdx) => {
      const text = recommendationText(rec)
      if (!text) return
      const recId = recommendationId(rec, recIdx)
      if (isRecommendationApplied(sceneIndex, recId, scriptScenes, localAppliedKeys)) {
        return
      }
      if (highImpactOnly && !recommendationIsHighImpact(rec)) {
        return
      }
      selected.add(buildSceneRecSelectionKey(sceneIndex, recId))
    })
  })

  return selected
}

/**
 * Group currently selected recommendations by 0-based sceneIndex.
 */
export function groupSelectedRecommendationsByScene(
  sceneAnalysis: SceneAnalysisForPreVis[],
  selectedKeys: Set<string>,
  scriptScenes?: any[],
  localAppliedKeys?: Set<string>
): SceneRecommendationSelectionGroup[] {
  const groups: SceneRecommendationSelectionGroup[] = []
  if (!Array.isArray(sceneAnalysis) || selectedKeys.size === 0) return groups

  sceneAnalysis.forEach((scene, arrayIdx) => {
    const sceneIndex = resolveSceneAnalysisIndex(scene, arrayIdx)
    const sceneNumber = sceneIndex + 1
    const recs = Array.isArray(scene?.recommendations) ? scene.recommendations : []
    const selectedRecommendations: SelectedSceneRecommendation[] = []

    recs.forEach((rec, recIdx) => {
      const text = recommendationText(rec)
      if (!text) return
      const recId = recommendationId(rec, recIdx)
      if (isRecommendationApplied(sceneIndex, recId, scriptScenes, localAppliedKeys)) {
        return
      }
      const key = buildSceneRecSelectionKey(sceneIndex, recId)
      if (!selectedKeys.has(key)) return
      selectedRecommendations.push({
        recId,
        recIndex: recIdx,
        text,
        raw: rec,
        highImpact: recommendationIsHighImpact(rec),
      })
    })

    if (selectedRecommendations.length > 0) {
      groups.push({
        sceneIndex,
        sceneNumber,
        sceneHeading:
          scene?.sceneHeading ||
          (typeof scriptScenes?.[sceneIndex]?.heading === 'string'
            ? scriptScenes[sceneIndex].heading
            : scriptScenes?.[sceneIndex]?.heading?.text) ||
          `Scene ${sceneNumber}`,
        selectedRecommendations,
      })
    }
  })

  return groups.sort((a, b) => a.sceneIndex - b.sceneIndex)
}

export interface RunPreVisScenePreparationParams {
  projectId: string
  sceneAnalysis: SceneAnalysisForPreVis[]
  selectedKeys: Set<string>
  scriptScenes: any[]
  characters?: any[]
  targetDemographic?: string
  scriptTitle?: string
  logline?: string
  localAppliedKeys?: Set<string>
  /** Concurrency for scene revisions (defaults to 2 to avoid Vertex AI 429s) */
  revisionConcurrency?: number
  signal?: AbortSignal
  onProgress?: (progress: PreVisPrepProgress) => void
  onPersistRevisedScenes: (
    revisions: BatchSceneRevisionItem[]
  ) => Promise<{ sceneCount: number } | void>
  onRefreshProject?: () => Promise<void>
  fetchImpl?: typeof fetch
}

/**
 * Orchestrates applying selected Audience Resonance scene recommendations in batch:
 * 1. Revises all scenes that have >= 1 selected recommendation via `/api/vision/revise-scene` (concurrency 2).
 * 2. Persists all revised scenes to the database in a single batch save and marks revised scenes
 *    as needing Shot Direction refresh (`shotDirectionNeedsRefresh: true`).
 *
 * Shot Direction is intentionally deferred to the scene card's Shot Direction Agent or the
 * Production Agent so the user can iterate quickly on script revisions + AR re-analysis
 * inside the Audience Analysis dialog.
 */
export async function runPreVisScenePreparation(
  params: RunPreVisScenePreparationParams
): Promise<PreVisPrepResult> {
  const {
    projectId,
    sceneAnalysis,
    selectedKeys,
    scriptScenes,
    characters = [],
    targetDemographic = '',
    scriptTitle,
    logline,
    localAppliedKeys,
    revisionConcurrency = 2,
    signal,
    onProgress,
    onPersistRevisedScenes,
    onRefreshProject,
    fetchImpl = fetch,
  } = params

  const groups = groupSelectedRecommendationsByScene(
    sceneAnalysis,
    selectedKeys,
    scriptScenes,
    localAppliedKeys
  )

  const failedRevisions: Array<{ sceneNumber: number; error: string }> = []
  const failedDirections: Array<{ sceneNumber: number; error: string }> = []
  const successfulRevisions: BatchSceneRevisionItem[] = []
  let appliedRecommendationCount = 0

  if (groups.length > 0) {
    let completedRevisions = 0
    onProgress?.({
      phase: 'revise-scenes',
      done: 0,
      total: groups.length,
      currentSceneNumber: groups[0]?.sceneNumber,
      label: `Running Scene Director on Scene ${groups[0]?.sceneNumber} (0/${groups.length} scenes)…`,
    })

    await runWithConcurrencyLimit(
      groups,
      Math.max(1, revisionConcurrency),
      async (group) => {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        const currentScene = scriptScenes[group.sceneIndex]
        if (!currentScene) {
          failedRevisions.push({
            sceneNumber: group.sceneNumber,
            error: `Scene ${group.sceneNumber} not found in script`,
          })
          return
        }

        onProgress?.({
          phase: 'revise-scenes',
          done: completedRevisions,
          total: groups.length,
          currentSceneNumber: group.sceneNumber,
          label: `Running Scene Director on Scene ${group.sceneNumber} (${completedRevisions}/${groups.length} scenes)…`,
        })

        const previousScene = group.sceneIndex > 0 ? scriptScenes[group.sceneIndex - 1] : null
        const nextScene =
          group.sceneIndex < scriptScenes.length - 1 ? scriptScenes[group.sceneIndex + 1] : null

        const recItems = group.selectedRecommendations.map((r) => r.raw)
        const formattedInstruction = group.selectedRecommendations
          .map((r, idx) => `${idx + 1}. ${r.text}`)
          .join('\n\n')
        const recIds = group.selectedRecommendations.map((r) => r.recId)

        try {
          const response = await fetchImpl('/api/vision/revise-scene', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              sceneIndex: group.sceneIndex,
              currentScene,
              revisionMode: 'recommendations',
              selectedRecommendations: recItems,
              customInstruction: formattedInstruction,
              targetDemographic,
              preserveElements: [],
              revisionDepth: 'moderate',
              context: {
                characters,
                previousScene,
                nextScene,
                scriptTitle,
                logline,
              },
            }),
            signal,
          })

          const data = await response.json().catch(() => ({}))
          if (!response.ok || !data?.revisedScene) {
            throw new Error(data?.error || `Failed to revise Scene ${group.sceneNumber}`)
          }

          successfulRevisions.push({
            sceneIndex: group.sceneIndex,
            revisedScene: data.revisedScene,
            continuationScenes: Array.isArray(data.continuationScenes)
              ? data.continuationScenes
              : undefined,
            appliedRecommendationIds: recIds,
          })
          appliedRecommendationCount += recIds.length
        } catch (err) {
          if (signal?.aborted || isAbortError(err)) {
            throw new DOMException('Aborted', 'AbortError')
          }
          failedRevisions.push({
            sceneNumber: group.sceneNumber,
            error: err instanceof Error ? err.message : String(err),
          })
        } finally {
          completedRevisions += 1
          onProgress?.({
            phase: 'revise-scenes',
            done: completedRevisions,
            total: groups.length,
            currentSceneNumber: group.sceneNumber,
            label: `Scene Director revised ${completedRevisions}/${groups.length} scene${groups.length === 1 ? '' : 's'}…`,
          })
        }
      }
    )
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  if (successfulRevisions.length > 0) {
    onProgress?.({
      phase: 'persist-scenes',
      done: successfulRevisions.length,
      total: successfulRevisions.length,
      label: `Saving ${successfulRevisions.length} revised scene${successfulRevisions.length === 1 ? '' : 's'}…`,
    })
    await onPersistRevisedScenes(successfulRevisions)
    await onRefreshProject?.()
  }

  onProgress?.({
    phase: 'done',
    done: groups.length,
    total: groups.length,
    label: 'Scene recommendations applied',
  })

  return {
    revisedSceneCount: successfulRevisions.length,
    appliedRecommendationCount,
    directedSceneCount: 0,
    totalShotsDirected: 0,
    failedRevisions,
    failedDirections,
  }
}
