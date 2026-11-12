import type { PreserveElementInput } from '@/lib/audio/cleanupAudio'
import {
  recommendationIsHighImpact,
  recommendationId,
  recommendationText,
} from '@/lib/script/audienceResonance/highImpact'
import {
  isAbortError,
} from '@/lib/vision/scriptInceptionFollowups'

/**
 * Default concurrent `/api/vision/revise-scene` requests for the Scene Director Agent.
 * Balances ~3x wall-clock speedup on multi-scene scripts while staying within
 * Vertex AI Gemini Pro per-minute quota.
 */
export const DEFAULT_SCENE_DIRECTOR_CONCURRENCY = 3
export const MAX_SCENE_DIRECTOR_CONCURRENCY = 4

export type SceneDirectorRevisionDepth = 'light' | 'moderate' | 'deep'

async function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function isTransientRevisionStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

async function runWithConcurrencyLimit<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const concurrency = Math.max(
    1,
    Math.min(MAX_SCENE_DIRECTOR_CONCURRENCY, Math.floor(limit) || 1)
  )
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
  preserveElements?: PreserveElementInput[]
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
  activeSceneNumbers?: number[]
  progressPct?: number
  label: string
}

export interface PreVisPrepResult {
  revisedSceneCount: number
  appliedRecommendationCount: number
  directedSceneCount: number
  totalShotsDirected: number
  failedRevisions: Array<{ sceneNumber: number; sceneIndex?: number; error: string }>
  failedSceneIndices?: number[]
  failedDirections: Array<{ sceneNumber: number; error: string }>
}

export interface SelectedRecommendationsSummary {
  selectedRecCount: number
  selectedSceneCount: number
  totalUnappliedCount: number
  totalScenesWithUnappliedCount: number
  selectedPointsDeducted: number
  highImpactSelectedCount: number
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
 * Defaults to selecting all unapplied recommendations (or filtered subset when requested).
 */
export function collectInitialSelectedRecKeys(
  sceneAnalysis: SceneAnalysisForPreVis[],
  scriptScenes?: any[],
  options?: {
    highImpactOnly?: boolean
    maxSceneScoreExclusive?: number
    sceneIndicesFilter?: ReadonlySet<number>
    localAppliedKeys?: Set<string>
  }
): Set<string> {
  const selected = new Set<string>()
  const highImpactOnly = options?.highImpactOnly === true
  const maxSceneScoreExclusive = options?.maxSceneScoreExclusive
  const sceneIndicesFilter = options?.sceneIndicesFilter
  const localAppliedKeys = options?.localAppliedKeys

  if (!Array.isArray(sceneAnalysis)) return selected

  sceneAnalysis.forEach((scene, arrayIdx) => {
    const sceneIndex = resolveSceneAnalysisIndex(scene, arrayIdx)
    if (sceneIndicesFilter && !sceneIndicesFilter.has(sceneIndex)) {
      return
    }
    if (
      typeof maxSceneScoreExclusive === 'number' &&
      typeof scene?.score === 'number' &&
      scene.score >= maxSceneScoreExclusive
    ) {
      return
    }
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
 * Summarize currently selected vs total unapplied recommendations across scenes,
 * including estimated recoverable score deduction points.
 */
export function summarizeSelectedRecommendations(
  sceneAnalysis: SceneAnalysisForPreVis[],
  selectedKeys: Set<string>,
  scriptScenes?: any[],
  localAppliedKeys?: Set<string>
): SelectedRecommendationsSummary {
  let selectedRecCount = 0
  let totalUnappliedCount = 0
  let selectedPointsDeducted = 0
  let highImpactSelectedCount = 0
  const selectedSceneIndices = new Set<number>()
  const unappliedSceneIndices = new Set<number>()

  if (Array.isArray(sceneAnalysis)) {
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
        totalUnappliedCount += 1
        unappliedSceneIndices.add(sceneIndex)

        const key = buildSceneRecSelectionKey(sceneIndex, recId)
        if (!selectedKeys.has(key)) return

        selectedRecCount += 1
        selectedSceneIndices.add(sceneIndex)
        if (recommendationIsHighImpact(rec)) {
          highImpactSelectedCount += 1
        }
        if (typeof rec === 'object' && rec && typeof rec.pointsDeducted === 'number') {
          selectedPointsDeducted += Math.max(0, rec.pointsDeducted)
        }
      })
    })
  }

  return {
    selectedRecCount,
    selectedSceneCount: selectedSceneIndices.size,
    totalUnappliedCount,
    totalScenesWithUnappliedCount: unappliedSceneIndices.size,
    selectedPointsDeducted: Math.round(selectedPointsDeducted * 10) / 10,
    highImpactSelectedCount,
  }
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

export interface PreVisSceneStatusEvent {
  sceneIndex: number
  sceneNumber: number
  status: 'running' | 'done' | 'error'
  error?: string
  revision?: BatchSceneRevisionItem
}

export interface ArRecommendationsBackgroundState {
  isRunning: boolean
  progress: PreVisPrepProgress | null
  result: PreVisPrepResult | null
  appliedRecKeys: Set<string>
  abortController: AbortController | null
  pendingOpenTab: 'recommendations' | null
}

const backgroundStateByProject = new Map<string, ArRecommendationsBackgroundState>()
const backgroundListeners = new Set<() => void>()

export function getArRecommendationsBackgroundState(
  projectId?: string
): ArRecommendationsBackgroundState {
  const key = projectId || '__default__'
  let state = backgroundStateByProject.get(key)
  if (!state) {
    state = {
      isRunning: false,
      progress: null,
      result: null,
      appliedRecKeys: new Set<string>(),
      abortController: null,
      pendingOpenTab: null,
    }
    backgroundStateByProject.set(key, state)
  }
  return state
}

export function patchArRecommendationsBackgroundState(
  projectId: string | undefined,
  patch: Partial<ArRecommendationsBackgroundState>
): ArRecommendationsBackgroundState {
  const current = getArRecommendationsBackgroundState(projectId)
  const next: ArRecommendationsBackgroundState = {
    ...current,
    ...patch,
  }
  backgroundStateByProject.set(projectId || '__default__', next)
  backgroundListeners.forEach((listener) => listener())
  return next
}

export function subscribeArRecommendationsBackgroundState(
  listener: () => void
): () => void {
  backgroundListeners.add(listener)
  return () => {
    backgroundListeners.delete(listener)
  }
}

function formatActiveSceneProgressLabel(
  activeSceneNumbers: Iterable<number>,
  done: number,
  total: number
): string {
  const sortedActive = Array.from(activeSceneNumbers).sort((a, b) => a - b)
  if (sortedActive.length > 1) {
    return `Directing Scenes ${sortedActive.join(', ')} (${done}/${total} complete)…`
  }
  if (sortedActive.length === 1) {
    return `Running Scene Director on Scene ${sortedActive[0]} (${done}/${total} scenes)…`
  }
  return `Scene Director revised ${done}/${total} scene${total === 1 ? '' : 's'}…`
}

function computeInFlightProgressPct(
  done: number,
  activeCount: number,
  total: number
): number {
  if (total <= 0) return 0
  const weighted = done + activeCount * 0.35
  return Math.max(8, Math.min(95, Math.round((weighted / total) * 95)))
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
  /** Concurrency for scene revisions (defaults to 3, clamped 1..4) */
  revisionConcurrency?: number
  /** Scene Director depth: 'light' (polish), 'moderate' (substantive rewrite), 'deep' (restructure) */
  revisionDepth?: SceneDirectorRevisionDepth
  /** Optional global director guidance applied alongside selected recommendations */
  directorNote?: string
  /** Optional per-scene custom guidance indexed by 0-based sceneIndex */
  perSceneNotes?: Record<number, string>
  /** Elements to preserve across revised scenes (e.g. ['music']) */
  preserveElements?: PreserveElementInput[]
  /** Max retries per scene on transient 429/5xx errors (defaults to 1) */
  maxTransientRetries?: number
  /** Base backoff delay in ms for transient retries (defaults to 1200) */
  retryBaseDelayMs?: number
  signal?: AbortSignal
  onProgress?: (progress: PreVisPrepProgress) => void
  onSceneStatusChange?: (event: PreVisSceneStatusEvent) => void
  onPersistRevisedScenes: (
    revisions: BatchSceneRevisionItem[]
  ) => Promise<{ sceneCount: number } | void>
  onRefreshProject?: () => Promise<void>
  fetchImpl?: typeof fetch
}

/**
 * Orchestrates applying selected Audience Resonance scene recommendations via the Scene Director Agent:
 * 1. Revises all scenes that have >= 1 selected recommendation via `/api/vision/revise-scene`
 *    with bounded concurrency (default 3) and automatic transient 429/5xx backoff retry.
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
    revisionConcurrency = DEFAULT_SCENE_DIRECTOR_CONCURRENCY,
    revisionDepth = 'moderate',
    directorNote = '',
    perSceneNotes,
    preserveElements = [],
    maxTransientRetries = 1,
    retryBaseDelayMs = 1200,
    signal,
    onProgress,
    onSceneStatusChange,
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

  const failedRevisions: Array<{ sceneNumber: number; sceneIndex?: number; error: string }> = []
  const failedDirections: Array<{ sceneNumber: number; error: string }> = []
  const successfulRevisions: BatchSceneRevisionItem[] = []
  let appliedRecommendationCount = 0

  try {
    if (groups.length > 0) {
      let completedRevisions = 0
      const activeSceneNumbers = new Set<number>()

      onProgress?.({
        phase: 'revise-scenes',
        done: 0,
        total: groups.length,
        currentSceneNumber: groups[0]?.sceneNumber,
        activeSceneNumbers: [],
        progressPct: 8,
        label: `Preparing Scene Director for ${groups.length} scene${groups.length === 1 ? '' : 's'}…`,
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
            const errMsg = `Scene ${group.sceneNumber} not found in script`
            failedRevisions.push({
              sceneNumber: group.sceneNumber,
              sceneIndex: group.sceneIndex,
              error: errMsg,
            })
            completedRevisions += 1
            onSceneStatusChange?.({
              sceneIndex: group.sceneIndex,
              sceneNumber: group.sceneNumber,
              status: 'error',
              error: errMsg,
            })
            onProgress?.({
              phase: 'revise-scenes',
              done: completedRevisions,
              total: groups.length,
              currentSceneNumber: group.sceneNumber,
              activeSceneNumbers: Array.from(activeSceneNumbers).sort((a, b) => a - b),
              progressPct: computeInFlightProgressPct(
                completedRevisions,
                activeSceneNumbers.size,
                groups.length
              ),
              label: formatActiveSceneProgressLabel(
                activeSceneNumbers,
                completedRevisions,
                groups.length
              ),
            })
            return
          }

          activeSceneNumbers.add(group.sceneNumber)
          onSceneStatusChange?.({
            sceneIndex: group.sceneIndex,
            sceneNumber: group.sceneNumber,
            status: 'running',
          })

          onProgress?.({
            phase: 'revise-scenes',
            done: completedRevisions,
            total: groups.length,
            currentSceneNumber: group.sceneNumber,
            activeSceneNumbers: Array.from(activeSceneNumbers).sort((a, b) => a - b),
            progressPct: computeInFlightProgressPct(
              completedRevisions,
              activeSceneNumbers.size,
              groups.length
            ),
            label: formatActiveSceneProgressLabel(
              activeSceneNumbers,
              completedRevisions,
              groups.length
            ),
          })

          const previousScene = group.sceneIndex > 0 ? scriptScenes[group.sceneIndex - 1] : null
          const nextScene =
            group.sceneIndex < scriptScenes.length - 1 ? scriptScenes[group.sceneIndex + 1] : null

          const recItems = group.selectedRecommendations.map((r) => r.raw)
          const formattedRecList = group.selectedRecommendations
            .map((r, idx) => `${idx + 1}. ${r.text}`)
            .join('\n\n')
          const recIds = group.selectedRecommendations.map((r) => r.recId)

          const globalNote = directorNote.trim()
          const sceneSpecificNote = perSceneNotes?.[group.sceneIndex]?.trim() || ''
          const combinedGuidance = [globalNote, sceneSpecificNote].filter(Boolean).join('\n')
          const useHybridMode = combinedGuidance.length > 0

          try {
            let revisedSceneData: any = null
            let continuationScenesData: any[] | undefined

            for (let attempt = 0; attempt <= Math.max(0, maxTransientRetries); attempt += 1) {
              if (signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError')
              }
              const response = await fetchImpl('/api/vision/revise-scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  sceneIndex: group.sceneIndex,
                  currentScene,
                  revisionMode: useHybridMode ? 'hybrid' : 'recommendations',
                  selectedRecommendations: recItems,
                  customInstruction: useHybridMode ? combinedGuidance : formattedRecList,
                  targetDemographic,
                  preserveElements,
                  revisionDepth,
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
              if (response.ok && data?.revisedScene) {
                revisedSceneData = data.revisedScene
                continuationScenesData = Array.isArray(data.continuationScenes)
                  ? data.continuationScenes
                  : undefined
                break
              }

              const shouldRetry =
                attempt < Math.max(0, maxTransientRetries) &&
                isTransientRevisionStatus(response.status)

              if (shouldRetry) {
                const delayMs = retryBaseDelayMs * (attempt + 1)
                await sleepWithAbort(delayMs, signal)
                continue
              }

              throw new Error(data?.error || `Failed to revise Scene ${group.sceneNumber}`)
            }

            const revisionItem: BatchSceneRevisionItem = {
              sceneIndex: group.sceneIndex,
              revisedScene: revisedSceneData,
              continuationScenes: continuationScenesData,
              appliedRecommendationIds: recIds,
              preserveElements: preserveElements.length > 0 ? [...preserveElements] : undefined,
            }
            successfulRevisions.push(revisionItem)
            appliedRecommendationCount += recIds.length
            onSceneStatusChange?.({
              sceneIndex: group.sceneIndex,
              sceneNumber: group.sceneNumber,
              status: 'done',
              revision: revisionItem,
            })
          } catch (err) {
            if (signal?.aborted || isAbortError(err)) {
              throw new DOMException('Aborted', 'AbortError')
            }
            const errMsg = err instanceof Error ? err.message : String(err)
            failedRevisions.push({
              sceneNumber: group.sceneNumber,
              sceneIndex: group.sceneIndex,
              error: errMsg,
            })
            onSceneStatusChange?.({
              sceneIndex: group.sceneIndex,
              sceneNumber: group.sceneNumber,
              status: 'error',
              error: errMsg,
            })
          } finally {
            activeSceneNumbers.delete(group.sceneNumber)
            completedRevisions += 1
            onProgress?.({
              phase: 'revise-scenes',
              done: completedRevisions,
              total: groups.length,
              currentSceneNumber: group.sceneNumber,
              activeSceneNumbers: Array.from(activeSceneNumbers).sort((a, b) => a - b),
              progressPct: computeInFlightProgressPct(
                completedRevisions,
                activeSceneNumbers.size,
                groups.length
              ),
              label: formatActiveSceneProgressLabel(
                activeSceneNumbers,
                completedRevisions,
                groups.length
              ),
            })
          }
        }
      )
    }
  } catch (err) {
    if (
      (signal?.aborted || isAbortError(err)) &&
      successfulRevisions.length > 0
    ) {
      // Persist any scenes that finished before cancellation so completed work is preserved
      await onPersistRevisedScenes(successfulRevisions).catch(() => {})
      await onRefreshProject?.().catch(() => {})
    }
    throw err
  }

  if (signal?.aborted) {
    if (successfulRevisions.length > 0) {
      await onPersistRevisedScenes(successfulRevisions).catch(() => {})
      await onRefreshProject?.().catch(() => {})
    }
    throw new DOMException('Aborted', 'AbortError')
  }

  if (successfulRevisions.length > 0) {
    onProgress?.({
      phase: 'persist-scenes',
      done: successfulRevisions.length,
      total: groups.length,
      progressPct: 97,
      label: `Saving ${successfulRevisions.length} revised scene${successfulRevisions.length === 1 ? '' : 's'}…`,
    })
    await onPersistRevisedScenes(successfulRevisions)
    await onRefreshProject?.()
  }

  onProgress?.({
    phase: 'done',
    done: groups.length,
    total: groups.length,
    progressPct: 100,
    label: 'Scene recommendations applied',
  })

  return {
    revisedSceneCount: successfulRevisions.length,
    appliedRecommendationCount,
    directedSceneCount: 0,
    totalShotsDirected: 0,
    failedRevisions,
    failedSceneIndices: failedRevisions
      .map((f) => f.sceneIndex)
      .filter((idx): idx is number => typeof idx === 'number'),
    failedDirections,
  }
}
