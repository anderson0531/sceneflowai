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
 * Orchestrates the Pre-Vis Preparation Agent from the Audience Resonance Scene Breakdown:
 * 1. Revises all scenes that have >= 1 selected recommendation via `/api/vision/revise-scene` (concurrency 2).
 * 2. Persists all revised scenes to the database in a single batch save so server endpoints see the updated script.
 * 3. Runs Scene Direction (`/api/vision/attach-scene-directions`) and Shot Direction Agent (`/api/vision/direct-scene-shots`)
 *    across all scenes so every scene has production-ready camera/lighting/blocking direction for Pre-Vis (Audio + Stills).
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
  const revisedSceneIndices = new Set<number>()
  let appliedRecommendationCount = 0

  // Phase 1: Revise scenes with selected recommendations
  if (groups.length > 0) {
    let completedRevisions = 0
    onProgress?.({
      phase: 'revise-scenes',
      done: 0,
      total: groups.length,
      currentSceneNumber: groups[0]?.sceneNumber,
      label: `Applying recommendations (0/${groups.length} scenes)…`,
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

        const previousScene = group.sceneIndex > 0 ? scriptScenes[group.sceneIndex - 1] : null
        const nextScene =
          group.sceneIndex < scriptScenes.length - 1 ? scriptScenes[group.sceneIndex + 1] : null

        const recTexts = group.selectedRecommendations.map((r) => r.text)
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
              selectedRecommendations: recTexts,
              customInstruction: '',
              preserveElements: [],
              revisionDepth: 'moderate',
              characters,
              previousScene,
              nextScene,
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
          revisedSceneIndices.add(group.sceneIndex)
          appliedRecommendationCount += recIds.length
        } catch (err) {
          if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
            throw err
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
            label: `Applied recommendations (${completedRevisions}/${groups.length} scenes)…`,
          })
        }
      }
    )
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  // Persist revised scenes to DB before running server-side Scene Direction & Shot Direction
  let totalScenesForDirection = scriptScenes.length
  if (successfulRevisions.length > 0) {
    onProgress?.({
      phase: 'persist-scenes',
      done: successfulRevisions.length,
      total: successfulRevisions.length,
      label: `Saving ${successfulRevisions.length} revised scene${successfulRevisions.length === 1 ? '' : 's'}…`,
    })
    const persistResult = await onPersistRevisedScenes(successfulRevisions)
    if (typeof persistResult?.sceneCount === 'number' && persistResult.sceneCount > 0) {
      totalScenesForDirection = persistResult.sceneCount
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  // Phase 2a: Ensure Scene Direction is generated for revised / undirected scenes
  if (totalScenesForDirection > 0) {
    onProgress?.({
      phase: 'scene-direction',
      done: 0,
      total: totalScenesForDirection,
      label: 'Generating scene direction for scenes…',
    })

    try {
      const response = await fetchImpl('/api/vision/attach-scene-directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
        signal,
      })
      if (response.ok && response.body?.getReader) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        const parseLine = (part: string) => {
          const line = part
            .split('\n')
            .map((entry) => entry.trim())
            .find((entry) => entry.startsWith('data:'))
          if (!line) return
          try {
            const event = JSON.parse(line.slice(line.indexOf(':') + 1).trim())
            if (event?.type === 'progress') {
              const done = Number(event.done) || 0
              const total = Number(event.total) || totalScenesForDirection
              onProgress?.({
                phase: 'scene-direction',
                done,
                total,
                label: `Scene direction (${done}/${total})…`,
              })
            }
          } catch {}
        }
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            buffer += decoder.decode()
            buffer.split('\n\n').forEach(parseLine)
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''
          parts.forEach(parseLine)
        }
      }
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) {
        throw new DOMException('Aborted', 'AbortError')
      }
      console.warn('[PreVisPrep] attach-scene-directions warning:', err)
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  // Phase 2b: Run Shot Direction Agent across all scenes
  let directedSceneCount = 0
  let totalShotsDirected = 0

  for (let sceneIndex = 0; sceneIndex < totalScenesForDirection; sceneIndex++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    const sceneNumber = sceneIndex + 1
    onProgress?.({
      phase: 'shot-direction',
      done: sceneIndex,
      total: totalScenesForDirection,
      currentSceneNumber: sceneNumber,
      label: `Running Shot Direction Agent (Scene ${sceneNumber}/${totalScenesForDirection})…`,
    })

    // Force regeneration when either no scenes were revised (explicit "Run Shot Direction for All Scenes")
    // or when this specific scene was revised in Phase 1.
    const force = revisedSceneIndices.size === 0 || revisedSceneIndices.has(sceneIndex)
    try {
      const shotRes = await requestSceneShotDirection({
        projectId,
        sceneIndex,
        force,
        signal,
        fetchImpl,
      })
      directedSceneCount += 1
      totalShotsDirected += shotRes.optimized ?? 0
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) {
        throw new DOMException('Aborted', 'AbortError')
      }
      failedDirections.push({
        sceneNumber,
        error: err instanceof Error ? err.message : `Failed shot direction for Scene ${sceneNumber}`,
      })
    }

    onProgress?.({
      phase: 'shot-direction',
      done: sceneIndex + 1,
      total: totalScenesForDirection,
      currentSceneNumber: sceneNumber,
      label: `Shot Direction Agent (${sceneIndex + 1}/${totalScenesForDirection} scenes)…`,
    })
  }

  await onRefreshProject?.()

  onProgress?.({
    phase: 'done',
    done: totalScenesForDirection,
    total: totalScenesForDirection,
    label: 'Pre-Vis preparation complete',
  })

  return {
    revisedSceneCount: successfulRevisions.length,
    appliedRecommendationCount,
    directedSceneCount,
    totalShotsDirected,
    failedRevisions,
    failedDirections,
  }
}
