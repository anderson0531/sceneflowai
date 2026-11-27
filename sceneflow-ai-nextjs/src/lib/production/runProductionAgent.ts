/**
 * SceneFlow Autonomous Production Agent ("Production Builder")
 *
 * Orchestrates multi-scene or chapter-level production end-to-end so Directors
 * can spend < 1 hour perfecting their script, launch the Production Agent, walk
 * away, and receive milestone notifications + Screening Room (/s/) links.
 *
 * Pipeline stages (selectable by the user):
 *  1. Pre-Vis  — Shot Direction + Continuity References + Scene Audio + Keyframe Stills
 *  2. Clips    — Segment derivation + Motion Video clips + Shot Direction optimization
 *                + Automatic rerun + Creative Clips fallback on persistent policy blocks
 *  3. Scenes   — Per-scene multitrack MP4 mixer renders
 *  4. Master   — Final Cut master stream stitch + Screening Room (/s/) review link
 *  5. Promo    — Autonomous theatrical trailer cut + narration + score
 */

import { IMAGE_CREDITS, AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import {
  estimateVideoAgentCredits,
  type VideoGenerationMode,
  type VideoGenerationQuality,
  type VideoSourceMethod,
} from '@/lib/video/videoGenerationPolicy'
import { isStillPolicyImageError } from '@/lib/generation/stillPolicy'

export type ProductionStageId = 'previs' | 'clips' | 'scenes' | 'master' | 'promo'

export const PRODUCTION_STAGE_ORDER: ProductionStageId[] = [
  'previs',
  'clips',
  'scenes',
  'master',
  'promo',
]

export type ProductionSceneScopeMode = 'all' | 'chapter' | 'custom'

export type ProductionCheckpointMode =
  | 'autonomous'
  | 'previs_checkpoint'
  | 'scene_checkpoint'

export type ProductionNotificationFrequency =
  | 'every_scene'
  | 'phase_milestones'
  | 'checkpoints_and_completion'
  | 'completion_only'

export interface ProductionChapterGroup {
  id: string
  label: string
  subtitle: string
  sceneIndices: number[]
}

export interface RateLimitedProductionItem {
  kind: 'audio' | 'still' | 'clip'
  sceneIndex: number
  key: string // beatId, segmentId, or audio line key
  retryAfterSec?: number
  message?: string
}

export interface StageStepResult {
  count: number
  rateLimitedItems?: RateLimitedProductionItem[]
  failedItems?: Array<{ key: string; message: string }>
}

export interface ProductionBuilderOptions {
  scopeMode: ProductionSceneScopeMode
  chapterId?: string
  selectedSceneIndices: number[]
  stages: ProductionStageId[]
  quality: VideoGenerationQuality
  language: string
  missingOnly: boolean
  /** Proactively optimize shot direction and rewrite policy-blocked shots before rerunning */
  optimizeShotDirection: boolean
  /** Automatically rerun failed shots with exponential backoff / direction rewrite */
  autoRerunFailedShots: boolean
  /** Switch to Creative Clips (Kling Omni F2V) when a shot still violates Google policy after optimization */
  creativeClipPolicyFallback: boolean
  checkpointMode: ProductionCheckpointMode
  notificationFrequency: ProductionNotificationFrequency
  /** Automatically mint a Screening Room (/s/) link for review at Pre-Vis / Master completion */
  mintScreeningLink: boolean
  /** Optional granular sub-toggle for Stage 1 Pre-Vis (defaults to true) */
  previsIncludeAudio?: boolean
  /** Optional granular sub-toggle for Stage 1 Pre-Vis (defaults to true) */
  previsIncludeStills?: boolean
  /** Execution concurrency profile ('adaptive' default; callers with BYOK or active cooldown pass 'sequential') */
  executionProfile?: 'adaptive' | 'sequential'
  /** Maximum Phase 2 sequential recovery passes for rate-limited (429) items (default 3) */
  maxRateLimitRecoveryPasses?: number
  /** Run Pre-Vis stills THEN audio sequentially per scene to avoid 12-way double bursts (default true) */
  coordinatePrevisLanes?: boolean
}

export type ProductionAgentOptions = ProductionBuilderOptions

export interface ProductionSceneReadinessSummary {
  sceneIndex: number
  sceneNumber: number
  sceneId: string
  heading: string
  chapterLabel?: string
  beatCount: number
  hasDirection: boolean
  hasAudio: boolean
  missingStillsCount: number
  totalStillsCount: number
  completedClipsCount: number
  totalClipsCount: number
  policyBlockedClipsCount: number
  hasRenderedSceneMp4: boolean
}

export interface ProductionRunEstimate {
  sceneCount: number
  totalBeats: number
  stillsToGenerate: number
  audioScenesToGenerate: number
  clipsToGenerate: number
  scenesToRender: number
  credits: {
    previs: number
    clips: number
    scenes: number
    master: number
    promo: number
    total: number
  }
  estimatedAutonomousMinutes: number
  estimatedDirectorHoursSaved: number
}

export type ProductionNotificationEventKind =
  | 'scene_completed'
  | 'stage_completed'
  | 'checkpoint_reached'
  | 'policy_escalated'
  | 'run_completed'
  | 'run_failed'

export interface ProductionNotificationPayload {
  kind: ProductionNotificationEventKind
  title: string
  message: string
  stage?: ProductionStageId
  sceneIndex?: number
  sceneNumber?: number
  screeningUrl?: string
}

export interface ProductionAgentTelemetry {
  scenesCompleted: number
  totalScenes: number
  stillsGenerated: number
  audioTracksGenerated: number
  clipsGenerated: number
  shotsOptimized: number
  failedShotsRerun: number
  creativeFallbacksUsed: number
  scenesRendered: number
  masterStreamUrl?: string
  promoStreamUrl?: string
  screeningUrl?: string
  rateLimitedEvents?: number
  sequentialRecoveryPasses?: number
  recoveredAfterRateLimit?: number
  downgradedToSequential?: boolean
  errors: string[]
}

export interface ProductionCheckpointGate {
  type: 'previs' | 'scene'
  title: string
  description: string
  sceneIndex?: number
  sceneNumber?: number
  screeningUrl?: string
}

export interface ProductionAgentShotDescriptor {
  segmentId: string
  beatId?: string
  sequenceIndex: number
  label: string
  durationSec: number
  hasClip: boolean
  hasStartFrame: boolean
  hasEndFrame: boolean
  startFrameUrl?: string
  endFrameUrl?: string
  policyBlocked?: boolean
  directionOptimized?: boolean
}

export interface ProductionAgentDeps {
  projectId: string
  projectTitle: string
  /** Step 1a: Ensure scene direction exists */
  ensureSceneDirection: (sceneIndex: number) => Promise<void>
  /** Step 1b: Ensure Continuity Vault references (cast, wardrobe, locations, props) are drawn */
  ensureSceneReferences: (sceneIndex: number) => Promise<void>
  /** Step 1c: Run Scene Audio Agent (dialogue, narration, music, SFX) */
  runSceneAudio: (
    sceneIndex: number,
    options: {
      language: string
      missingOnly: boolean
      concurrencyOverride?: number
      failFastOnRateLimit?: boolean
      onlyKeys?: string[]
    }
  ) => Promise<number | StageStepResult>
  /** Step 1d: Run Stills Agent (keyframes) */
  runSceneStills: (
    sceneIndex: number,
    options: {
      language: string
      quality: 'draft' | 'final'
      includeEndFrames: boolean
      missingOnly: boolean
      generationMode?: 'standard' | 'creative'
      concurrencyOverride?: number
      failFastOnRateLimit?: boolean
      onlyKeys?: string[]
    }
  ) => Promise<number | StageStepResult>
  /** Step 2a: Ensure segments exist for the scene and return current shot descriptors */
  ensureSceneSegments: (sceneIndex: number) => Promise<ProductionAgentShotDescriptor[]>
  /** Step 2b: Optimize shot direction (and rewrite for Google Safety compliance when policyCompliance=true) */
  optimizeShotDirection: (input: {
    sceneIndex: number
    beatId: string
    policyCompliance: boolean
  }) => Promise<void>
  /** Step 2c: Generate a single video clip segment in Standard or Creative mode */
  generateSegmentClip: (input: {
    sceneIndex: number
    segmentId: string
    beatId?: string
    mode: VideoGenerationMode
    quality: VideoGenerationQuality
    sourceMethod: VideoSourceMethod
    startFrameUrl?: string
    endFrameUrl?: string
    durationSec?: number
  }) => Promise<void>
  /** Step 3: Render per-scene multitrack MP4 */
  renderSceneMp4: (
    sceneIndex: number,
    options: { language: string; streamType: 'video' | 'animatic' }
  ) => Promise<string | undefined>
  /** Step 4: Assemble Master Final Cut stream */
  assembleMasterStream: (options: {
    language: string
    streamType: 'video' | 'animatic'
    sceneIndices: number[]
  }) => Promise<string | undefined>
  /** Step 4b: Mint a Screening Room (/s/) or shareable review link */
  mintScreeningLink: (options: {
    stage: 'previs' | 'master' | 'promo'
    language: string
    videoUrl?: string
  }) => Promise<string | undefined>
  /** Step 5: Run Promo Trailer Agent */
  runPromoStage: (options: { language: string }) => Promise<string | undefined>
  /** Notification callback */
  onNotify: (notification: ProductionNotificationPayload) => Promise<void>
  /** Progress / status update callback */
  onProgress: (update: {
    stage: ProductionStageId
    subtitle: string
    progressPct: number
    itemKey?: string
    itemStatus?: 'pending' | 'running' | 'done' | 'error'
    itemError?: string
    telemetry: ProductionAgentTelemetry
  }) => void
  /** Checkpoint pause handler — resolves true to continue, false to stop */
  awaitCheckpoint?: (gate: ProductionCheckpointGate) => Promise<boolean>
  /** Abort signal */
  signal?: AbortSignal
}

/**
 * Determine whether an error from clip or still generation is a Google content
 * policy / safety violation that warrants Shot Direction Optimization and, if still
 * blocked, escalation to Creative Clips.
 */
export function isPolicyViolationError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const e = error as {
      status?: number
      code?: string
      contentPolicyData?: unknown
      isContentPolicy?: boolean
      message?: string
    }
    if (e.code === 'CONTENT_POLICY_VIOLATION' || e.isContentPolicy === true) {
      return true
    }
    if (e.contentPolicyData) return true
    if (e.status === 422 && typeof e.message === 'string') {
      return true
    }
  }
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error)
  if (isStillPolicyImageError(msg)) {
    return true
  }
  const lower = msg.toLowerCase()
  return (
    lower.includes('content policy') ||
    lower.includes('content safety') ||
    lower.includes('safety') ||
    lower.includes('policy violation') ||
    lower.includes('prohibited') ||
    lower.includes('usage guidelines') ||
    lower.includes('rai') ||
    lower.includes('blocked by google') ||
    lower.includes('prompt was blocked') ||
    lower.includes('mix of references') ||
    lower.includes('filtered by')
  )
}

/**
 * Normalize selected stages in canonical execution order and automatically include
 * required upstream prerequisites when needed.
 */
export function normalizeProductionStages(
  stages: ProductionStageId[]
): ProductionStageId[] {
  const set = new Set<ProductionStageId>(stages)
  return PRODUCTION_STAGE_ORDER.filter((stage) => set.has(stage))
}

/**
 * Decide whether a notification event should be emitted for the user's chosen
 * notification frequency.
 */
export function shouldEmitProductionNotification(
  frequency: ProductionNotificationFrequency,
  kind: ProductionNotificationEventKind
): boolean {
  if (kind === 'run_completed' || kind === 'run_failed' || kind === 'checkpoint_reached') {
    return true
  }
  switch (frequency) {
    case 'every_scene':
      return true
    case 'phase_milestones':
      return kind === 'stage_completed' || kind === 'policy_escalated'
    case 'checkpoints_and_completion':
      return kind === 'policy_escalated'
    case 'completion_only':
      return false
    default:
      return true
  }
}

/**
 * Group script scenes into logical Chapters / Acts for 1-click Chapter selection
 * in the Production Builder Dialog.
 */
export function groupScenesIntoChapters(scenes: any[]): ProductionChapterGroup[] {
  if (!Array.isArray(scenes) || scenes.length === 0) return []

  // First check if scenes have explicit act/chapter metadata
  const actMap = new Map<string, number[]>()
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]
    const rawAct = s?.act || s?.chapter || s?.actNumber
    if (rawAct !== undefined && rawAct !== null && String(rawAct).trim() !== '') {
      const key = String(rawAct).trim()
      const list = actMap.get(key) || []
      list.push(i)
      actMap.set(key, list)
    }
  }

  if (actMap.size >= 2) {
    return Array.from(actMap.entries()).map(([actKey, indices], idx) => {
      const first = indices[0] + 1
      const last = indices[indices.length - 1] + 1
      const label = /^act|chapter/i.test(actKey) ? actKey : `Chapter ${idx + 1}: Act ${actKey}`
      return {
        id: `chapter-${idx + 1}`,
        label,
        subtitle: `Scenes ${first}–${last} (${indices.length} scene${indices.length === 1 ? '' : 's'})`,
        sceneIndices: indices,
      }
    })
  }

  // Otherwise group into chapters of up to 4 scenes (or 3 acts for standard feature/short structure)
  const chunkSize = scenes.length <= 6 ? 2 : scenes.length <= 12 ? 4 : 5
  const chapters: ProductionChapterGroup[] = []
  const actNames = ['Opening & Setup', 'Rising Tension', 'Confrontation', 'Climax & Resolution', 'Epilogue']

  for (let start = 0; start < scenes.length; start += chunkSize) {
    const sliceIndices: number[] = []
    for (let j = start; j < Math.min(scenes.length, start + chunkSize); j++) {
      sliceIndices.push(j)
    }
    const chapterNum = chapters.length + 1
    const firstSceneNum = sliceIndices[0] + 1
    const lastSceneNum = sliceIndices[sliceIndices.length - 1] + 1
    const theme = actNames[(chapterNum - 1) % actNames.length]
    chapters.push({
      id: `chapter-${chapterNum}`,
      label: `Chapter ${chapterNum}: ${theme}`,
      subtitle:
        firstSceneNum === lastSceneNum
          ? `Scene ${firstSceneNum}`
          : `Scenes ${firstSceneNum}–${lastSceneNum} (${sliceIndices.length} scenes)`,
      sceneIndices: sliceIndices,
    })
  }

  return chapters
}

/**
 * Inspect scenes and sceneProductionState to summarize per-scene readiness for the
 * Production Builder Dialog.
 */
export function summarizeProductionScenes(
  scenes: any[],
  sceneProductionState: Record<string, any> = {},
  language = 'en'
): ProductionSceneReadinessSummary[] {
  if (!Array.isArray(scenes)) return []

  return scenes.map((scene, idx) => {
    const sceneId = String(scene?.id || scene?.sceneId || `scene-${idx}`)
    const sceneNumber = typeof scene?.sceneNumber === 'number' ? scene.sceneNumber : idx + 1
    const heading =
      String(
        scene?.heading ||
          scene?.title ||
          scene?.slugline ||
          scene?.location ||
          `Scene ${sceneNumber}`
      ).trim() || `Scene ${sceneNumber}`

    const hasDirection = Boolean(
      scene?.sceneDirection &&
        scene.sceneDirection.camera &&
        scene.sceneDirection.scene
    )

    const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
    const dialogueAudio = scene?.dialogueAudio?.[language]
    const dialogueOk =
      dialogue.length === 0 ||
      (Array.isArray(dialogueAudio) &&
        dialogueAudio.length >= dialogue.length &&
        dialogueAudio.every((d: any) => d && d.audioUrl))
    const narrationOk =
      !scene?.narration ||
      Boolean(scene?.narrationAudio?.[language]?.url) ||
      (language === 'en' && Boolean(scene?.narrationAudioUrl))
    const hasAudio = dialogueOk && narrationOk

    const beats = Array.isArray(scene?.beats) ? scene.beats : []
    const totalBeats = Math.max(1, beats.length || dialogue.length || 1)
    let missingStillsCount = 0
    if (beats.length > 0) {
      for (const beat of beats) {
        if (beat?.excluded) continue
        if (!beat?.storyboardImageUrl && !beat?.startFrameUrl) {
          missingStillsCount += 1
        }
      }
    } else if (!scene?.imageUrl) {
      missingStillsCount = 1
    }

    const prodData = sceneProductionState[sceneId] || scene?.productionData || {}
    const segments: any[] = Array.isArray(prodData?.segments) ? prodData.segments : []
    const totalClipsCount = Math.max(segments.length, beats.length || 1)
    let completedClipsCount = 0
    let policyBlockedClipsCount = 0

    for (const seg of segments) {
      const hasUrl = Boolean(
        seg?.activeAssetUrl ||
          seg?.videoUrl ||
          (Array.isArray(seg?.takes) && seg.takes.some((t: any) => t?.assetUrl || t?.videoUrl))
      )
      if (hasUrl) completedClipsCount += 1
      if (seg?.lastContentPolicyFailure) policyBlockedClipsCount += 1
    }

    const streams: any[] = Array.isArray(prodData?.productionStreams)
      ? prodData.productionStreams
      : []
    const hasRenderedSceneMp4 = Boolean(
      prodData?.renderedSceneUrl ||
        streams.some((s) => s?.status === 'complete' && s?.mp4Url)
    )

    return {
      sceneIndex: idx,
      sceneNumber,
      sceneId,
      heading,
      beatCount: totalBeats,
      hasDirection,
      hasAudio,
      missingStillsCount,
      totalStillsCount: totalBeats,
      completedClipsCount,
      totalClipsCount,
      policyBlockedClipsCount,
      hasRenderedSceneMp4,
    }
  })
}

/**
 * Estimate credit cost, autonomous runtime, and active Director hours saved for a
 * Production Builder configuration.
 */
export function estimateProductionAgentRun(
  summaries: ProductionSceneReadinessSummary[],
  options: ProductionBuilderOptions
): ProductionRunEstimate {
  const selectedSet = new Set(options.selectedSceneIndices)
  const chosen = summaries.filter((s) => selectedSet.has(s.sceneIndex))
  const stages = new Set(options.stages)

  const sceneCount = chosen.length
  const totalBeats = chosen.reduce((sum, s) => sum + s.beatCount, 0)

  const includeStills = options.previsIncludeStills !== false
  const includeAudio = options.previsIncludeAudio !== false

  const stillsToGenerate =
    stages.has('previs') && includeStills
      ? chosen.reduce(
          (sum, s) =>
            sum + (options.missingOnly ? s.missingStillsCount : s.totalStillsCount),
          0
        )
      : 0

  const audioScenesToGenerate =
    stages.has('previs') && includeAudio
      ? chosen.filter((s) => (options.missingOnly ? !s.hasAudio : true)).length
      : 0

  const clipsToGenerate = stages.has('clips')
    ? chosen.reduce(
        (sum, s) =>
          sum +
          (options.missingOnly
            ? Math.max(0, s.totalClipsCount - s.completedClipsCount)
            : s.totalClipsCount),
        0
      )
    : 0

  const scenesToRender = stages.has('scenes')
    ? chosen.filter((s) => (options.missingOnly ? !s.hasRenderedSceneMp4 : true)).length
    : 0

  const previsImageCredits = stillsToGenerate * IMAGE_CREDITS.IMAGEN_4
  const previsAudioCredits =
    audioScenesToGenerate *
    (AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS + AUDIO_CREDITS.ELEVENLABS_SFX)
  const previsCredits = stages.has('previs')
    ? previsImageCredits + previsAudioCredits
    : 0

  const clipsCredits = stages.has('clips')
    ? estimateVideoAgentCredits({
        count: clipsToGenerate,
        quality: options.quality,
        mode: 'standard',
      })
    : 0

  const scenesCredits = stages.has('scenes') ? scenesToRender * 15 : 0
  const masterCredits = stages.has('master') && sceneCount > 0 ? 25 : 0
  const promoCredits = stages.has('promo') && sceneCount > 0 ? 180 : 0

  const totalCredits =
    previsCredits + clipsCredits + scenesCredits + masterCredits + promoCredits

  // Autonomous runtime estimate (minutes)
  const previsMins = stages.has('previs') ? Math.ceil(sceneCount * 1.5) : 0
  const clipsMins = stages.has('clips') ? Math.ceil(clipsToGenerate * 1.2) : 0
  const scenesMins = stages.has('scenes') ? Math.ceil(scenesToRender * 0.8) : 0
  const masterMins = stages.has('master') ? 2 : 0
  const promoMins = stages.has('promo') ? 4 : 0
  const estimatedAutonomousMinutes = Math.max(
    1,
    previsMins + clipsMins + scenesMins + masterMins + promoMins
  )

  // Manual babysitting & manual prompting time saved (hours)
  const estimatedDirectorHoursSaved = Number(
    Math.max(0.5, (sceneCount * 22 + clipsToGenerate * 4) / 60).toFixed(1)
  )

  return {
    sceneCount,
    totalBeats,
    stillsToGenerate,
    audioScenesToGenerate,
    clipsToGenerate,
    scenesToRender,
    credits: {
      previs: previsCredits,
      clips: clipsCredits,
      scenes: scenesCredits,
      master: masterCredits,
      promo: promoCredits,
      total: totalCredits,
    },
    estimatedAutonomousMinutes,
    estimatedDirectorHoursSaved,
  }
}

/**
 * Detect HTTP 429 / rate-limit / RESOURCE_EXHAUSTED errors across stills, audio, and video clips.
 */
export function isRateLimitProductionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const e = error as { status?: number; isByokRateLimit?: boolean; name?: string; message?: string }
    if (e.status === 429 || e.isByokRateLimit === true || e.name === 'ByokRateLimitError') {
      return true
    }
  }
  const msg = error instanceof Error ? error.message : String(error)
  const lower = msg.toLowerCase()
  return (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limit') ||
    lower.includes('too many requests') ||
    lower.includes('too_many_requests') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota exceeded')
  )
}

function extractRetryAfterSec(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const e = error as { retryAfterSec?: number; retryAfterMs?: number }
    if (typeof e.retryAfterSec === 'number' && Number.isFinite(e.retryAfterSec) && e.retryAfterSec > 0) {
      return Math.ceil(e.retryAfterSec)
    }
    if (typeof e.retryAfterMs === 'number' && Number.isFinite(e.retryAfterMs) && e.retryAfterMs > 0) {
      return Math.ceil(e.retryAfterMs / 1000)
    }
  }
  const msg = error instanceof Error ? error.message : String(error ?? '')
  const match = msg.match(/(\d+)\s*(?:seconds?|secs?|\bs\b)/i)
  if (match) {
    const parsed = parseInt(match[1], 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return undefined
}

function normalizeStageStepResult(raw: number | StageStepResult | undefined | null): StageStepResult {
  if (typeof raw === 'number') {
    return { count: raw }
  }
  if (raw && typeof raw === 'object') {
    return {
      count: typeof raw.count === 'number' ? raw.count : 0,
      rateLimitedItems: Array.isArray(raw.rateLimitedItems) ? raw.rateLimitedItems : undefined,
      failedItems: Array.isArray(raw.failedItems) ? raw.failedItems : undefined,
    }
  }
  return { count: 0 }
}

async function sleepAbortable(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || process.env.VITEST) return
  if (signal?.aborted) {
    throw new Error('Production Agent cancelled by user')
  }
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('Production Agent cancelled by user'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Execute the Autonomous Production Agent across the selected scenes and stages.
 */
export async function runProductionAgent(
  options: ProductionBuilderOptions,
  deps: ProductionAgentDeps
): Promise<ProductionAgentTelemetry> {
  const orderedStages = normalizeProductionStages(options.stages)
  const sceneIndices = [...options.selectedSceneIndices].sort((a, b) => a - b)
  const maxRecoveryPasses = Math.max(0, options.maxRateLimitRecoveryPasses ?? 3)
  const coordinatePrevisLanes = options.coordinatePrevisLanes !== false

  const telemetry: ProductionAgentTelemetry = {
    scenesCompleted: 0,
    totalScenes: sceneIndices.length,
    stillsGenerated: 0,
    audioTracksGenerated: 0,
    clipsGenerated: 0,
    shotsOptimized: 0,
    failedShotsRerun: 0,
    creativeFallbacksUsed: 0,
    scenesRendered: 0,
    rateLimitedEvents: 0,
    sequentialRecoveryPasses: 0,
    recoveredAfterRateLimit: 0,
    downgradedToSequential: false,
    errors: [],
  }

  let isSequentialMode = options.executionProfile === 'sequential'
  let rollingRateLimitCount = 0

  const noteRateLimitEvent = (count = 1) => {
    if (count <= 0) return
    rollingRateLimitCount += count
    telemetry.rateLimitedEvents = (telemetry.rateLimitedEvents ?? 0) + count
    if (!isSequentialMode && rollingRateLimitCount >= 2) {
      isSequentialMode = true
      telemetry.downgradedToSequential = true
    }
  }

  const checkAborted = () => {
    if (deps.signal?.aborted) {
      throw new Error('Production Agent cancelled by user')
    }
  }

  const emitNotificationIfEligible = async (
    payload: ProductionNotificationPayload
  ) => {
    if (shouldEmitProductionNotification(options.notificationFrequency, payload.kind)) {
      await deps.onNotify(payload)
    }
  }

  const totalSteps = Math.max(
    1,
    sceneIndices.length *
      ((orderedStages.includes('previs') ? 1 : 0) +
        (orderedStages.includes('clips') ? 1 : 0) +
        (orderedStages.includes('scenes') ? 1 : 0)) +
      (orderedStages.includes('master') ? 1 : 0) +
      (orderedStages.includes('promo') ? 1 : 0)
  )
  let completedSteps = 0
  const computePct = () =>
    Math.min(99, Math.max(4, Math.round((completedSteps / totalSteps) * 100)))

  // =========================================================================
  // STAGE 1: PRE-VIS (Direction + Continuity References + Stills + Audio)
  // =========================================================================
  if (orderedStages.includes('previs')) {
    const previsRateLimitedQueue: RateLimitedProductionItem[] = []
    const includeEndFrames =
      orderedStages.includes('clips') || options.creativeClipPolicyFallback

    for (const sceneIndex of sceneIndices) {
      checkAborted()
      const sceneNumber = sceneIndex + 1
      const itemKey = `previs:scene-${sceneIndex}`

      deps.onProgress({
        stage: 'previs',
        subtitle: `Scene ${sceneNumber}: Building Shot Direction, Continuity Plates, Audio & Stills`,
        progressPct: computePct(),
        itemKey,
        itemStatus: 'running',
        telemetry: { ...telemetry },
      })

      try {
        const wantAudio = options.previsIncludeAudio !== false
        const wantStills = options.previsIncludeStills !== false

        if (wantStills) {
          await deps.ensureSceneDirection(sceneIndex)
          checkAborted()

          await deps.ensureSceneReferences(sceneIndex)
          checkAborted()
        }

        const runStillsStep = async () => {
          if (!wantStills) return
          const stepOpts = {
            language: options.language,
            quality: options.quality,
            includeEndFrames,
            missingOnly: options.missingOnly,
            generationMode: 'standard' as const,
            ...(isSequentialMode
              ? { concurrencyOverride: 1, failFastOnRateLimit: false }
              : {}),
          }
          try {
            const res = normalizeStageStepResult(await deps.runSceneStills(sceneIndex, stepOpts))
            telemetry.stillsGenerated += res.count
            if (res.rateLimitedItems?.length) {
              noteRateLimitEvent(res.rateLimitedItems.length)
              previsRateLimitedQueue.push(...res.rateLimitedItems)
            }
            if (res.failedItems?.length) {
              for (const f of res.failedItems) {
                telemetry.errors.push(`Scene ${sceneNumber} Still (${f.key}): ${f.message}`)
              }
            }
          } catch (stillErr) {
            if (isRateLimitProductionError(stillErr)) {
              noteRateLimitEvent(1)
              previsRateLimitedQueue.push({
                kind: 'still',
                sceneIndex,
                key: 'scene-all',
                retryAfterSec: extractRetryAfterSec(stillErr),
                message: stillErr instanceof Error ? stillErr.message : String(stillErr),
              })
            } else {
              throw stillErr
            }
          }
        }

        const runAudioStep = async () => {
          if (!wantAudio) return
          const stepOpts = {
            language: options.language,
            missingOnly: options.missingOnly,
            ...(isSequentialMode
              ? { concurrencyOverride: 1, failFastOnRateLimit: false }
              : {}),
          }
          try {
            const res = normalizeStageStepResult(await deps.runSceneAudio(sceneIndex, stepOpts))
            telemetry.audioTracksGenerated += res.count
            if (res.rateLimitedItems?.length) {
              noteRateLimitEvent(res.rateLimitedItems.length)
              previsRateLimitedQueue.push(...res.rateLimitedItems)
            }
            if (res.failedItems?.length) {
              for (const f of res.failedItems) {
                telemetry.errors.push(`Scene ${sceneNumber} Audio (${f.key}): ${f.message}`)
              }
            }
          } catch (audioErr) {
            if (isRateLimitProductionError(audioErr)) {
              noteRateLimitEvent(1)
              previsRateLimitedQueue.push({
                kind: 'audio',
                sceneIndex,
                key: 'scene-all',
                retryAfterSec: extractRetryAfterSec(audioErr),
                message: audioErr instanceof Error ? audioErr.message : String(audioErr),
              })
            } else {
              throw audioErr
            }
          }
        }

        if (coordinatePrevisLanes) {
          // Coordinated Pre-Vis lanes: run stills THEN audio sequentially per scene
          await runStillsStep()
          checkAborted()
          await runAudioStep()
        } else {
          await Promise.all([runAudioStep(), runStillsStep()])
        }
        checkAborted()

        completedSteps += 1
        deps.onProgress({
          stage: 'previs',
          subtitle: `Scene ${sceneNumber} Pre-Vis ready`,
          progressPct: computePct(),
          itemKey,
          itemStatus: 'done',
          telemetry: { ...telemetry },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Pre-Vis step failed'
        telemetry.errors.push(`Scene ${sceneNumber} Pre-Vis: ${msg}`)
        completedSteps += 1
        deps.onProgress({
          stage: 'previs',
          subtitle: `Scene ${sceneNumber} Pre-Vis issue: ${msg}`,
          progressPct: computePct(),
          itemKey,
          itemStatus: 'error',
          itemError: msg,
          telemetry: { ...telemetry },
        })
      }
    }

    // Phase 2 Automatic Sequential 429 Recovery Pass for Pre-Vis
    if (previsRateLimitedQueue.length > 0) {
      let pending = [...previsRateLimitedQueue]
      for (let passNumber = 1; passNumber <= maxRecoveryPasses && pending.length > 0; passNumber++) {
        checkAborted()
        telemetry.sequentialRecoveryPasses = (telemetry.sequentialRecoveryPasses ?? 0) + 1
        const maxRetryAfterSec = Math.max(0, ...pending.map((item) => item.retryAfterSec ?? 0))
        const cooldownMs = Math.min(180_000, Math.max(30_000, maxRetryAfterSec * 1000) * passNumber)

        deps.onProgress({
          stage: 'previs',
          subtitle: `Pre-Vis sequential 429 recovery pass ${passNumber}/${maxRecoveryPasses} (${pending.length} item${pending.length === 1 ? '' : 's'})`,
          progressPct: computePct(),
          telemetry: { ...telemetry },
        })

        await sleepAbortable(cooldownMs, deps.signal)
        checkAborted()

        const nextPending: RateLimitedProductionItem[] = []
        for (let i = 0; i < pending.length; i++) {
          checkAborted()
          const item = pending[i]
          const sceneNumber = item.sceneIndex + 1
          const onlyKeys = item.key && item.key !== 'scene-all' ? [item.key] : undefined

          try {
            if (item.kind === 'still') {
              const res = normalizeStageStepResult(
                await deps.runSceneStills(item.sceneIndex, {
                  language: options.language,
                  quality: options.quality,
                  includeEndFrames,
                  missingOnly: options.missingOnly,
                  generationMode: 'standard',
                  concurrencyOverride: 1,
                  failFastOnRateLimit: false,
                  ...(onlyKeys ? { onlyKeys } : {}),
                })
              )
              if (res.rateLimitedItems?.length) {
                noteRateLimitEvent(res.rateLimitedItems.length)
                nextPending.push(...res.rateLimitedItems)
              } else if (res.failedItems?.length) {
                for (const f of res.failedItems) {
                  telemetry.errors.push(`Scene ${sceneNumber} Still (${f.key}): ${f.message}`)
                }
              } else {
                telemetry.stillsGenerated += Math.max(1, res.count)
                telemetry.recoveredAfterRateLimit = (telemetry.recoveredAfterRateLimit ?? 0) + 1
              }
            } else if (item.kind === 'audio') {
              const res = normalizeStageStepResult(
                await deps.runSceneAudio(item.sceneIndex, {
                  language: options.language,
                  missingOnly: options.missingOnly,
                  concurrencyOverride: 1,
                  failFastOnRateLimit: false,
                  ...(onlyKeys ? { onlyKeys } : {}),
                })
              )
              if (res.rateLimitedItems?.length) {
                noteRateLimitEvent(res.rateLimitedItems.length)
                nextPending.push(...res.rateLimitedItems)
              } else if (res.failedItems?.length) {
                for (const f of res.failedItems) {
                  telemetry.errors.push(`Scene ${sceneNumber} Audio (${f.key}): ${f.message}`)
                }
              } else {
                telemetry.audioTracksGenerated += Math.max(1, res.count)
                telemetry.recoveredAfterRateLimit = (telemetry.recoveredAfterRateLimit ?? 0) + 1
              }
            }
          } catch (recErr) {
            if (isRateLimitProductionError(recErr)) {
              noteRateLimitEvent(1)
              nextPending.push({
                ...item,
                retryAfterSec: extractRetryAfterSec(recErr) ?? item.retryAfterSec,
                message: recErr instanceof Error ? recErr.message : String(recErr),
              })
            } else {
              telemetry.errors.push(
                `Scene ${sceneNumber} ${item.kind} (${item.key}): ${
                  recErr instanceof Error ? recErr.message : 'Recovery failed'
                }`
              )
            }
          }

          if (i + 1 < pending.length) {
            await sleepAbortable(3_000, deps.signal)
          }
        }
        pending = nextPending
      }

      // Record any still-rate-limited items cleanly in telemetry.errors
      for (const unrecovered of pending) {
        const sceneNumber = unrecovered.sceneIndex + 1
        telemetry.errors.push(
          `Scene ${sceneNumber} ${unrecovered.kind} (${unrecovered.key}): Rate limited after ${maxRecoveryPasses} sequential recovery pass(es)${
            unrecovered.message ? ` — ${unrecovered.message}` : ''
          }`
        )
      }
    }

    // Mint Pre-Vis Screening Link if requested and either Pre-Vis is the final stage or Pre-Vis checkpoint is active
    const hasDownstreamStages = orderedStages.some((s) => s !== 'previs')
    if (
      options.mintScreeningLink &&
      (!hasDownstreamStages || options.checkpointMode === 'previs_checkpoint')
    ) {
      try {
        const url = await deps.mintScreeningLink({
          stage: 'previs',
          language: options.language,
        })
        if (url) telemetry.screeningUrl = url
      } catch {
        // Non-fatal
      }
    }

    await emitNotificationIfEligible({
      kind: 'stage_completed',
      stage: 'previs',
      title: `${deps.projectTitle} • Pre-Vis Stage Complete`,
      message: `Generated Pre-Vis direction, continuity references, audio, and keyframe stills across ${sceneIndices.length} scene${sceneIndices.length === 1 ? '' : 's'}.`,
      screeningUrl: telemetry.screeningUrl,
    })

    // Director Checkpoint after Pre-Vis before spending video clip credits
    if (
      options.checkpointMode === 'previs_checkpoint' &&
      hasDownstreamStages &&
      deps.awaitCheckpoint
    ) {
      await emitNotificationIfEligible({
        kind: 'checkpoint_reached',
        stage: 'previs',
        title: `${deps.projectTitle} • Pre-Vis Checkpoint Ready for Review`,
        message: `Pre-Vis animatic is ready across ${sceneIndices.length} scenes. Review in the Screening Room and approve to continue to Video Clips & Master.`,
        screeningUrl: telemetry.screeningUrl,
      })

      const approved = await deps.awaitCheckpoint({
        type: 'previs',
        title: 'Pre-Vis Checkpoint Reached',
        description:
          'Inspect your keyframes, continuity plates, and scene audio in the Screening Room before rendering motion video clips.',
        screeningUrl: telemetry.screeningUrl,
      })
      if (!approved) {
        return telemetry
      }
    }
  }

  // =========================================================================
  // STAGE 2 & 3: CLIPS (with Self-Healing Policy Ladder + 429 Recovery) & PER-SCENE RENDERS
  // =========================================================================
  const runClips = orderedStages.includes('clips')
  const runScenes = orderedStages.includes('scenes')

  interface QueuedRateLimitedClip {
    item: RateLimitedProductionItem
    shot: ProductionAgentShotDescriptor
    sourceMethod: VideoSourceMethod
  }

  const runClipsRecoveryQueue = async (queue: QueuedRateLimitedClip[]): Promise<number> => {
    if (queue.length === 0) return 0
    let pending = [...queue]
    let unrecoveredCount = 0

    for (let passNumber = 1; passNumber <= maxRecoveryPasses && pending.length > 0; passNumber++) {
      checkAborted()
      telemetry.sequentialRecoveryPasses = (telemetry.sequentialRecoveryPasses ?? 0) + 1
      const maxRetryAfterSec = Math.max(0, ...pending.map((q) => q.item.retryAfterSec ?? 0))
      const cooldownMs = Math.min(180_000, Math.max(30_000, maxRetryAfterSec * 1000) * passNumber)

      deps.onProgress({
        stage: 'clips',
        subtitle: `Clips sequential 429 recovery pass ${passNumber}/${maxRecoveryPasses} (${pending.length} clip${pending.length === 1 ? '' : 's'})`,
        progressPct: computePct(),
        telemetry: { ...telemetry },
      })

      await sleepAbortable(cooldownMs, deps.signal)
      checkAborted()

      const nextPending: QueuedRateLimitedClip[] = []
      for (let i = 0; i < pending.length; i++) {
        checkAborted()
        const entry = pending[i]
        const sceneNumber = entry.item.sceneIndex + 1

        try {
          telemetry.failedShotsRerun += 1
          await deps.generateSegmentClip({
            sceneIndex: entry.item.sceneIndex,
            segmentId: entry.shot.segmentId,
            beatId: entry.shot.beatId,
            mode: 'standard',
            quality: options.quality,
            sourceMethod: entry.sourceMethod,
            startFrameUrl: entry.shot.startFrameUrl,
            endFrameUrl: entry.shot.endFrameUrl,
            durationSec: entry.shot.durationSec,
          })
          telemetry.clipsGenerated += 1
          telemetry.recoveredAfterRateLimit = (telemetry.recoveredAfterRateLimit ?? 0) + 1
        } catch (recErr) {
          if (isRateLimitProductionError(recErr)) {
            noteRateLimitEvent(1)
            nextPending.push({
              ...entry,
              item: {
                ...entry.item,
                retryAfterSec: extractRetryAfterSec(recErr) ?? entry.item.retryAfterSec,
                message: recErr instanceof Error ? recErr.message : String(recErr),
              },
            })
          } else if (isPolicyViolationError(recErr) && options.creativeClipPolicyFallback) {
            // Only escalate to Creative Clips if a genuine content policy violation occurs
            try {
              await deps.generateSegmentClip({
                sceneIndex: entry.item.sceneIndex,
                segmentId: entry.shot.segmentId,
                beatId: entry.shot.beatId,
                mode: 'creative',
                quality: options.quality,
                sourceMethod: 'frame',
                startFrameUrl: entry.shot.startFrameUrl,
                endFrameUrl: entry.shot.endFrameUrl,
                durationSec: entry.shot.durationSec,
              })
              telemetry.clipsGenerated += 1
              telemetry.creativeFallbacksUsed += 1
              telemetry.recoveredAfterRateLimit = (telemetry.recoveredAfterRateLimit ?? 0) + 1
            } catch (creativeErr) {
              unrecoveredCount += 1
              telemetry.errors.push(
                `Scene ${sceneNumber} Shot ${entry.shot.sequenceIndex + 1} (Creative fallback): ${
                  creativeErr instanceof Error ? creativeErr.message : 'Creative clip failed'
                }`
              )
            }
          } else {
            unrecoveredCount += 1
            telemetry.errors.push(
              `Scene ${sceneNumber} Shot ${entry.shot.sequenceIndex + 1}: ${
                recErr instanceof Error ? recErr.message : 'Clip recovery failed'
              }`
            )
          }
        }

        if (i + 1 < pending.length) {
          await sleepAbortable(15_000, deps.signal)
        }
      }
      pending = nextPending
    }

    for (const unrecovered of pending) {
      unrecoveredCount += 1
      const sceneNumber = unrecovered.item.sceneIndex + 1
      telemetry.errors.push(
        `Scene ${sceneNumber} Shot ${unrecovered.shot.sequenceIndex + 1}: Rate limited after ${maxRecoveryPasses} sequential recovery pass(es)${
          unrecovered.item.message ? ` — ${unrecovered.item.message}` : ''
        }`
      )
    }

    return unrecoveredCount
  }

  if (runClips || runScenes) {
    const deferredClipsQueue: QueuedRateLimitedClip[] = []
    const recoverPerScene = runScenes || options.checkpointMode === 'scene_checkpoint'

    for (let idx = 0; idx < sceneIndices.length; idx++) {
      checkAborted()
      const sceneIndex = sceneIndices[idx]
      const sceneNumber = sceneIndex + 1

      if (runClips) {
        const clipItemKey = `clips:scene-${sceneIndex}`
        deps.onProgress({
          stage: 'clips',
          subtitle: `Scene ${sceneNumber}: Deriving shots & generating motion clips`,
          progressPct: computePct(),
          itemKey: clipItemKey,
          itemStatus: 'running',
          telemetry: { ...telemetry },
        })

        try {
          const shots = await deps.ensureSceneSegments(sceneIndex)
          let sceneClipErrors = 0
          const sceneRateLimitedClips: QueuedRateLimitedClip[] = []

          for (let shotIdx = 0; shotIdx < shots.length; shotIdx++) {
            const shot = shots[shotIdx]
            checkAborted()
            if (options.missingOnly && shot.hasClip && !shot.policyBlocked) {
              continue
            }

            if (isSequentialMode && shotIdx > 0) {
              await sleepAbortable(15_000, deps.signal)
              checkAborted()
            }

            // Proactive Shot Direction Optimization when requested
            const targetBeatId = shot.beatId || shot.segmentId
            if (
              options.optimizeShotDirection &&
              targetBeatId &&
              (!shot.directionOptimized || shot.policyBlocked)
            ) {
              try {
                await deps.optimizeShotDirection({
                  sceneIndex,
                  beatId: targetBeatId,
                  policyCompliance: Boolean(shot.policyBlocked),
                })
                telemetry.shotsOptimized += 1
              } catch {
                // Continue to clip generation even if optimization call fails
              }
            }

            // Attempt 1: Standard video generation
            const defaultSourceMethod: VideoSourceMethod =
              shot.hasStartFrame && shot.hasEndFrame ? 'frame' : 'reference'
            try {
              await deps.generateSegmentClip({
                sceneIndex,
                segmentId: shot.segmentId,
                beatId: shot.beatId,
                mode: 'standard',
                quality: options.quality,
                sourceMethod: defaultSourceMethod,
                startFrameUrl: shot.startFrameUrl,
                endFrameUrl: shot.endFrameUrl,
                durationSec: shot.durationSec,
              })
              telemetry.clipsGenerated += 1
              continue
            } catch (firstErr) {
              checkAborted()
              let lastErr: unknown = firstErr
              const isPolicyErr = isPolicyViolationError(firstErr)
              const isFirstRateLimit = isRateLimitProductionError(firstErr)

              if (isFirstRateLimit) {
                noteRateLimitEvent(1)
              }

              // Attempt 2: Optimize Shot Direction for Safety Compliance (or transient/429 retry) + Rerun
              let recoveredOnSecondAttempt = false
              let queuedForRecovery = false

              if (isPolicyErr && targetBeatId && options.optimizeShotDirection) {
                try {
                  deps.onProgress({
                    stage: 'clips',
                    subtitle: `Scene ${sceneNumber} · Shot ${shot.sequenceIndex + 1}: Optimizing shot direction for policy compliance & rerunning`,
                    progressPct: computePct(),
                    telemetry: { ...telemetry },
                  })
                  await deps.optimizeShotDirection({
                    sceneIndex,
                    beatId: targetBeatId,
                    policyCompliance: true,
                  })
                  telemetry.shotsOptimized += 1
                  telemetry.failedShotsRerun += 1

                  await deps.generateSegmentClip({
                    sceneIndex,
                    segmentId: shot.segmentId,
                    beatId: shot.beatId,
                    mode: 'standard',
                    quality: options.quality,
                    sourceMethod: 'reference',
                    startFrameUrl: shot.startFrameUrl,
                    durationSec: shot.durationSec,
                  })
                  telemetry.clipsGenerated += 1
                  recoveredOnSecondAttempt = true
                } catch (secondErr) {
                  lastErr = secondErr
                  if (isRateLimitProductionError(secondErr)) {
                    noteRateLimitEvent(1)
                    sceneRateLimitedClips.push({
                      item: {
                        kind: 'clip',
                        sceneIndex,
                        key: shot.segmentId,
                        retryAfterSec: extractRetryAfterSec(secondErr),
                        message: secondErr instanceof Error ? secondErr.message : String(secondErr),
                      },
                      shot,
                      sourceMethod: 'reference',
                    })
                    queuedForRecovery = true
                  } else if (
                    isPolicyViolationError(secondErr) &&
                    options.creativeClipPolicyFallback
                  ) {
                    // Proceed to Attempt 3 (Creative Clips fallback) below
                  } else {
                    sceneClipErrors += 1
                    telemetry.errors.push(
                      `Scene ${sceneNumber} Shot ${shot.sequenceIndex + 1}: ${
                        secondErr instanceof Error ? secondErr.message : 'Clip failed'
                      }`
                    )
                    continue
                  }
                }
              } else if (!isPolicyErr && options.autoRerunFailedShots) {
                try {
                  if (isFirstRateLimit) {
                    const waitSec = Math.max(15, extractRetryAfterSec(firstErr) ?? 60)
                    const cooldownMs = Math.min(90_000, waitSec * 1_000)
                    if (!process.env.VITEST && cooldownMs > 0) {
                      deps.onProgress({
                        stage: 'clips',
                        subtitle: `Scene ${sceneNumber} · Shot ${shot.sequenceIndex + 1}: Rate limited — cooling down ${waitSec}s before rerun`,
                        progressPct: computePct(),
                        telemetry: { ...telemetry },
                      })
                      await sleepAbortable(cooldownMs, deps.signal)
                      checkAborted()
                    }
                  }
                  telemetry.failedShotsRerun += 1
                  await deps.generateSegmentClip({
                    sceneIndex,
                    segmentId: shot.segmentId,
                    beatId: shot.beatId,
                    mode: 'standard',
                    quality: options.quality,
                    sourceMethod: defaultSourceMethod,
                    startFrameUrl: shot.startFrameUrl,
                    endFrameUrl: shot.endFrameUrl,
                    durationSec: shot.durationSec,
                  })
                  telemetry.clipsGenerated += 1
                  recoveredOnSecondAttempt = true
                } catch (retryErr) {
                  lastErr = retryErr
                  if (isRateLimitProductionError(retryErr)) {
                    noteRateLimitEvent(1)
                    sceneRateLimitedClips.push({
                      item: {
                        kind: 'clip',
                        sceneIndex,
                        key: shot.segmentId,
                        retryAfterSec: extractRetryAfterSec(retryErr),
                        message: retryErr instanceof Error ? retryErr.message : String(retryErr),
                      },
                      shot,
                      sourceMethod: defaultSourceMethod,
                    })
                    queuedForRecovery = true
                  } else if (
                    !isPolicyViolationError(retryErr) ||
                    !options.creativeClipPolicyFallback
                  ) {
                    sceneClipErrors += 1
                    telemetry.errors.push(
                      `Scene ${sceneNumber} Shot ${shot.sequenceIndex + 1}: ${
                        retryErr instanceof Error ? retryErr.message : 'Clip retry failed'
                      }`
                    )
                    continue
                  }
                }
              } else if (isFirstRateLimit) {
                // Queue 429 clips for Phase 2 sequential recovery — NEVER escalate to Kling Creative!
                sceneRateLimitedClips.push({
                  item: {
                    kind: 'clip',
                    sceneIndex,
                    key: shot.segmentId,
                    retryAfterSec: extractRetryAfterSec(firstErr),
                    message: firstErr instanceof Error ? firstErr.message : String(firstErr),
                  },
                  shot,
                  sourceMethod: defaultSourceMethod,
                })
                queuedForRecovery = true
              }

              if (recoveredOnSecondAttempt || queuedForRecovery) {
                continue
              }

              // Attempt 3: Escalate to Creative Clips (Kling Omni F2V) ONLY when Google content policy blocks the shot
              if (options.creativeClipPolicyFallback && isPolicyViolationError(lastErr)) {
                try {
                  deps.onProgress({
                    stage: 'clips',
                    subtitle: `Scene ${sceneNumber} · Shot ${shot.sequenceIndex + 1}: Escalating policy-blocked shot to Creative Clips`,
                    progressPct: computePct(),
                    telemetry: { ...telemetry },
                  })

                  await deps.generateSegmentClip({
                    sceneIndex,
                    segmentId: shot.segmentId,
                    beatId: shot.beatId,
                    mode: 'creative',
                    quality: options.quality,
                    sourceMethod: 'frame',
                    startFrameUrl: shot.startFrameUrl,
                    endFrameUrl: shot.endFrameUrl,
                    durationSec: shot.durationSec,
                  })
                  telemetry.clipsGenerated += 1
                  telemetry.creativeFallbacksUsed += 1

                  await emitNotificationIfEligible({
                    kind: 'policy_escalated',
                    stage: 'clips',
                    sceneIndex,
                    sceneNumber,
                    title: `Scene ${sceneNumber} Shot ${shot.sequenceIndex + 1} • Rescued via Creative Clips`,
                    message: `Shot direction was optimized and automatically switched to Creative Clips after Google content policy blocked the standard render.`,
                  })
                } catch (creativeErr) {
                  sceneClipErrors += 1
                  telemetry.errors.push(
                    `Scene ${sceneNumber} Shot ${shot.sequenceIndex + 1} (Creative fallback): ${
                      creativeErr instanceof Error
                        ? creativeErr.message
                        : 'Creative clip failed'
                    }`
                  )
                }
              } else {
                sceneClipErrors += 1
                telemetry.errors.push(
                  `Scene ${sceneNumber} Shot ${shot.sequenceIndex + 1}: ${
                    lastErr instanceof Error ? lastErr.message : 'Clip failed'
                  }`
                )
              }
            }
          }

          if (sceneRateLimitedClips.length > 0) {
            if (recoverPerScene) {
              sceneClipErrors += await runClipsRecoveryQueue(sceneRateLimitedClips)
            } else {
              deferredClipsQueue.push(...sceneRateLimitedClips)
            }
          }

          completedSteps += 1
          deps.onProgress({
            stage: 'clips',
            subtitle:
              sceneClipErrors > 0
                ? `Scene ${sceneNumber} clips finished with ${sceneClipErrors} issue${sceneClipErrors === 1 ? '' : 's'}`
                : `Scene ${sceneNumber} clips complete`,
            progressPct: computePct(),
            itemKey: clipItemKey,
            itemStatus: sceneClipErrors > 0 ? 'error' : 'done',
            itemError:
              sceneClipErrors > 0
                ? `${sceneClipErrors} clip${sceneClipErrors === 1 ? '' : 's'} had issues`
                : undefined,
            telemetry: { ...telemetry },
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Scene clips failed'
          telemetry.errors.push(`Scene ${sceneNumber} Clips: ${msg}`)
          completedSteps += 1
          deps.onProgress({
            stage: 'clips',
            subtitle: `Scene ${sceneNumber} clips error: ${msg}`,
            progressPct: computePct(),
            itemKey: clipItemKey,
            itemStatus: 'error',
            itemError: msg,
            telemetry: { ...telemetry },
          })
        }
      }

      if (runScenes) {
        const sceneRenderKey = `scenes:scene-${sceneIndex}`
        deps.onProgress({
          stage: 'scenes',
          subtitle: `Scene ${sceneNumber}: Rendering multitrack Scene MP4`,
          progressPct: computePct(),
          itemKey: sceneRenderKey,
          itemStatus: 'running',
          telemetry: { ...telemetry },
        })

        try {
          const streamType = runClips ? 'video' : 'animatic'
          const mp4Url = await deps.renderSceneMp4(sceneIndex, {
            language: options.language,
            streamType,
          })
          if (mp4Url) {
            telemetry.scenesRendered += 1
          }
          completedSteps += 1
          deps.onProgress({
            stage: 'scenes',
            subtitle: `Scene ${sceneNumber} MP4 render complete`,
            progressPct: computePct(),
            itemKey: sceneRenderKey,
            itemStatus: 'done',
            telemetry: { ...telemetry },
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Scene render failed'
          telemetry.errors.push(`Scene ${sceneNumber} Render: ${msg}`)
          completedSteps += 1
          deps.onProgress({
            stage: 'scenes',
            subtitle: `Scene ${sceneNumber} render issue: ${msg}`,
            progressPct: computePct(),
            itemKey: sceneRenderKey,
            itemStatus: 'error',
            itemError: msg,
            telemetry: { ...telemetry },
          })
        }
      }

      telemetry.scenesCompleted += 1

      await emitNotificationIfEligible({
        kind: 'scene_completed',
        stage: runScenes ? 'scenes' : 'clips',
        sceneIndex,
        sceneNumber,
        title: `${deps.projectTitle} • Scene ${sceneNumber} Complete (${telemetry.scenesCompleted}/${telemetry.totalScenes})`,
        message: `Scene ${sceneNumber} finished (${telemetry.clipsGenerated} clips, ${telemetry.shotsOptimized} shots optimized, ${telemetry.creativeFallbacksUsed} Creative fallbacks).`,
      })

      // Scene-by-Scene Director Checkpoint
      const isLastScene = idx === sceneIndices.length - 1
      if (
        options.checkpointMode === 'scene_checkpoint' &&
        !isLastScene &&
        deps.awaitCheckpoint
      ) {
        await emitNotificationIfEligible({
          kind: 'checkpoint_reached',
          stage: runScenes ? 'scenes' : 'clips',
          sceneIndex,
          sceneNumber,
          title: `${deps.projectTitle} • Scene ${sceneNumber} Checkpoint`,
          message: `Scene ${sceneNumber} is ready for Director review. Approve to advance to Scene ${sceneIndices[idx + 1] + 1}.`,
        })

        const approved = await deps.awaitCheckpoint({
          type: 'scene',
          title: `Scene ${sceneNumber} Checkpoint Reached`,
          description: `Review Scene ${sceneNumber}'s generated clips and audio mix before advancing to Scene ${sceneIndices[idx + 1] + 1}.`,
          sceneIndex,
          sceneNumber,
        })
        if (!approved) {
          return telemetry
        }
      }
    }

    if (deferredClipsQueue.length > 0) {
      await runClipsRecoveryQueue(deferredClipsQueue)
    }
  } else {
    telemetry.scenesCompleted = sceneIndices.length
  }

  // =========================================================================
  // STAGE 4: MASTER (Final Cut Master Assembly & Screening Room /s/ Link)
  // =========================================================================
  if (orderedStages.includes('master')) {
    checkAborted()
    deps.onProgress({
      stage: 'master',
      subtitle: 'Assembling Final Cut Master stream & Screening Room link',
      progressPct: computePct(),
      itemKey: 'stage:master',
      itemStatus: 'running',
      telemetry: { ...telemetry },
    })

    try {
      const streamType =
        orderedStages.includes('clips') || orderedStages.includes('scenes')
          ? 'video'
          : 'animatic'
      const masterUrl = await deps.assembleMasterStream({
        language: options.language,
        streamType,
        sceneIndices,
      })
      if (masterUrl) {
        telemetry.masterStreamUrl = masterUrl
      }

      if (options.mintScreeningLink) {
        const screeningUrl = await deps.mintScreeningLink({
          stage: 'master',
          language: options.language,
          videoUrl: masterUrl,
        })
        if (screeningUrl) {
          telemetry.screeningUrl = screeningUrl
        }
      }

      completedSteps += 1
      deps.onProgress({
        stage: 'master',
        subtitle: 'Final Cut Master & Screening Room link ready',
        progressPct: computePct(),
        itemKey: 'stage:master',
        itemStatus: 'done',
        telemetry: { ...telemetry },
      })

      await emitNotificationIfEligible({
        kind: 'stage_completed',
        stage: 'master',
        title: `${deps.projectTitle} • Master Final Cut Ready`,
        message: telemetry.screeningUrl
          ? `Master Final Cut assembled. Open your Screening Room link to review.`
          : `Master Final Cut assembled across ${sceneIndices.length} scenes.`,
        screeningUrl: telemetry.screeningUrl,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Master assembly failed'
      telemetry.errors.push(`Master Assembly: ${msg}`)
      completedSteps += 1
      deps.onProgress({
        stage: 'master',
        subtitle: `Master assembly issue: ${msg}`,
        progressPct: computePct(),
        itemKey: 'stage:master',
        itemStatus: 'error',
        itemError: msg,
        telemetry: { ...telemetry },
      })
    }
  }

  // =========================================================================
  // STAGE 5: PROMO (Autonomous Theatrical Trailer Cut)
  // =========================================================================
  if (orderedStages.includes('promo')) {
    checkAborted()
    deps.onProgress({
      stage: 'promo',
      subtitle: 'Building Promotional Trailer cut, voiceover narration & score',
      progressPct: computePct(),
      itemKey: 'stage:promo',
      itemStatus: 'running',
      telemetry: { ...telemetry },
    })

    try {
      const promoUrl = await deps.runPromoStage({
        language: options.language,
      })
      if (promoUrl) {
        telemetry.promoStreamUrl = promoUrl
      }
      completedSteps += 1
      deps.onProgress({
        stage: 'promo',
        subtitle: 'Promotional Trailer ready',
        progressPct: computePct(),
        itemKey: 'stage:promo',
        itemStatus: 'done',
        telemetry: { ...telemetry },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Promo trailer failed'
      telemetry.errors.push(`Promo Trailer: ${msg}`)
      completedSteps += 1
      deps.onProgress({
        stage: 'promo',
        subtitle: `Promo trailer issue: ${msg}`,
        progressPct: computePct(),
        itemKey: 'stage:promo',
        itemStatus: 'error',
        itemError: msg,
        telemetry: { ...telemetry },
      })
    }
  }

  // Final Screening Room link fallback if requested and not yet minted
  if (options.mintScreeningLink && !telemetry.screeningUrl) {
    try {
      const url = await deps.mintScreeningLink({
        stage: orderedStages.includes('master') ? 'master' : 'previs',
        language: options.language,
        videoUrl: telemetry.masterStreamUrl,
      })
      if (url) telemetry.screeningUrl = url
    } catch {
      // Non-fatal
    }
  }

  await emitNotificationIfEligible({
    kind: 'run_completed',
    title: `${deps.projectTitle} • Production Agent Complete`,
    message:
      telemetry.errors.length > 0
        ? `Production completed across ${telemetry.scenesCompleted} scenes (${telemetry.clipsGenerated} clips, ${telemetry.shotsOptimized} optimized, ${telemetry.creativeFallbacksUsed} Creative fallbacks) with ${telemetry.errors.length} note(s).`
        : `All ${telemetry.scenesCompleted} scenes built (${telemetry.stillsGenerated} stills, ${telemetry.clipsGenerated} clips, ${telemetry.shotsOptimized} shots optimized, ${telemetry.creativeFallbacksUsed} Creative fallbacks). Ready for review in the Screening Room!`,
    screeningUrl: telemetry.screeningUrl,
  })

  return telemetry
}
