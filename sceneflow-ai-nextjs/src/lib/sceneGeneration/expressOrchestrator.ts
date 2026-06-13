/**
 * Storyboard Express orchestrator.
 *
 * Per scene: Direction first, then Audio and Image in parallel.
 * Multiple scenes run concurrently (EXPRESS_SCENE_CONCURRENCY, default 3).
 * A per-run ExpressTrafficCop caps global Vertex/TTS in-flight work and
 * throttles lanes on 429 bursts. Partial beat/scene failures are acceptable.
 *
 * All work is done against an in-memory `scenes` array; the orchestrator
 * does NOT touch the DB.
 *
 * Callers (e.g. `[api/vision/express/route.ts]`) are responsible for:
 *  - Loading the project once at the start.
 *  - Persisting the mutated `scenes` array atomically once `runExpress`
 *    resolves.
 */

import {
  processWithConcurrency,
  SCENE_EXPRESS_BEAT_CONCURRENCY,
} from '../utils/concurrent-processor'
import {
  ExpressTrafficCop,
  getExpressSceneConcurrency,
} from './expressTrafficCop'
import type {
  ExpressEmit,
  ExpressEvent,
  ExpressMode,
  ExpressOptions,
  ExpressPerSceneSummary,
  ExpressPhase,
  ExpressRateLimitedFailure,
  ExpressResult,
  SceneAudioCounts,
} from './types'
import { runSceneExpressPreflight } from './sceneExpressPreflight'
import { generateSceneDirection } from './generateDirection'
import { generateSceneAudio, applyAudioAssetsToScene } from './generateAudio'
import { generateSceneImage } from './generateImage'
import { shouldScheduleStandaloneNarration } from '../script/narration'
import {
  mapBeatReferenceSelectionForApi,
  shouldUseExplicitBeatReferences,
} from '../vision/beatFrameGenerationContext'
import { getSceneBeats, applyBeatsToScene } from '../script/beatMigration'
import { countExpressFrameScope } from '../storyboard/types'
import { stampPreVisContentHash } from '../storyboard/preVisSync'
import type { SceneBeat } from '../script/segmentTypes'
import {
  planBeatSequence,
  applyBeatKeyframePlansToScene,
  ensureSceneMusicFromDirection,
  isTitleOrCinematicScene,
  type BeatKeyframePlan,
} from '../intelligence/beat-sequence-planner'
import {
  resolveStoryboardGeneration,
  beatFrameNeedsGeneration,
  beatEndFrameNeedsGeneration,
  dialogueFrameNeedsGeneration,
  type StoryboardQuality,
} from '../storyboard/storyboardQuality'
import { isStoryboardNoCharacterScene } from '../script/sceneClassification'
import { buildEndFramePrompt } from '../scene/deriveSegmentsFromBeats'
import { ensureLanguageStreamTranslations } from '../storyboard/playerTranslations.server'

const EXPRESS_SKIP_LIKENESS = { skipLikenessValidation: true }

function getExpressImageParams(options: ExpressOptions) {
  const gen = resolveStoryboardGeneration({
    storyboardQuality: options.storyboardQuality,
    legacyImageQuality:
      options.imageQuality === 'max' || options.imageQuality === 'auto'
        ? options.imageQuality
        : undefined,
  })
  return { ...gen, ...EXPRESS_SKIP_LIKENESS }
}

function getBeatGenerationContext(options: ExpressOptions) {
  return {
    storyboardQuality: (options.storyboardQuality ?? 'draft') as StoryboardQuality,
    finalizeOnly: !!options.finalizeOnly,
    regenerate: !!options.regenerate,
    missingOnly: !!options.missingFramesOnly,
  }
}

function getSelectedFrameKeySet(options: ExpressOptions): Set<string> | null {
  if (!options.selectedFrameKeys?.length) return null
  return new Set(options.selectedFrameKeys)
}

function isBeatStartSlotSelected(beat: SceneBeat, selectedKeys: Set<string> | null): boolean {
  if (!selectedKeys) return true
  if (!beat.beatId) return false
  return selectedKeys.has(beat.beatId)
}

function isBeatEndSlotSelected(beat: SceneBeat, selectedKeys: Set<string> | null): boolean {
  if (!selectedKeys) return true
  if (!beat.beatId) return false
  return selectedKeys.has(`${beat.beatId}-end`)
}

function isLegacySlotSelected(key: string, selectedKeys: Set<string> | null): boolean {
  if (!selectedKeys) return true
  return selectedKeys.has(key)
}

export interface RunExpressParams {
  /** Already-loaded project. The orchestrator mutates `metadata.visionPhase.script` in-memory. */
  project: any
  options: ExpressOptions
  baseUrl: string
  authCookie?: string
  emit: ExpressEmit
  /** Optional hook invoked after each scene completes (used for checkpoint DB persist). */
  onSceneComplete?: (
    sceneIndex: number,
    summary: ExpressPerSceneSummary
  ) => void | Promise<void>
}

interface SceneRunContext {
  sceneIndex: number
  sceneNumber: number
  scene: any
}

function getScenes(project: any): { scenes: any[]; nested: boolean } {
  const visionPhase = project?.metadata?.visionPhase || {}
  const nested = !!visionPhase?.script?.script?.scenes?.length
  const scenes = nested
    ? visionPhase.script.script.scenes
    : visionPhase?.script?.scenes || []
  return { scenes: Array.isArray(scenes) ? scenes : [], nested }
}

function safeEmit(emit: ExpressEmit, event: ExpressEvent) {
  try {
    emit(event)
  } catch (err: any) {
    console.error('[expressOrchestrator] emit failed:', err?.message || err)
  }
}

function sceneNeedsDirection(scene: any): boolean {
  const direction = scene?.sceneDirection
  if (!direction) return true
  const hasCore =
    direction.camera &&
    direction.scene &&
    direction.talent &&
    Array.isArray(direction.segmentPromptBundle)
  return !hasCore
}

function sceneNeedsAudio(scene: any, language: string): boolean {
  const wantsStandaloneNarration = shouldScheduleStandaloneNarration(scene)
  const narrationOk =
    !wantsStandaloneNarration ||
    !!scene?.narrationAudio?.[language]?.url
  const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
  const dialogueAudio = scene?.dialogueAudio?.[language]
  const dialogueOk =
    dialogue.length === 0 ||
    (Array.isArray(dialogueAudio) &&
      dialogueAudio.length >= dialogue.length &&
      dialogueAudio.every((d: any) => d && d.audioUrl))
  return !(narrationOk && dialogueOk)
}

function sceneNeedsEstablishingImage(scene: any): boolean {
  return !scene?.imageUrl
}

function sceneNeedsDialogueImages(scene: any): boolean {
  const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
  return dialogue.some((d: any) => !d?.storyboardImageUrl)
}

function sceneNeedsImage(scene: any): boolean {
  return sceneNeedsEstablishingImage(scene) || sceneNeedsDialogueImages(scene)
}

function sceneNeedsLegacyImages(scene: any, options: ExpressOptions): boolean {
  const genCtx = getBeatGenerationContext(options)
  const selectedKeys = getSelectedFrameKeySet(options)

  if (isLegacySlotSelected('establishing', selectedKeys)) {
    if (
      beatFrameNeedsGeneration(
        {
          storyboardImageUrl: scene.imageUrl,
          storyboardImageTier: scene.storyboardImageTier,
        },
        genCtx
      )
    ) {
      return true
    }
  }

  const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
  for (let dialogueIdx = 0; dialogueIdx < dialogue.length; dialogueIdx++) {
    if (!isLegacySlotSelected(`dialogue-${dialogueIdx}`, selectedKeys)) continue
    if (dialogueFrameNeedsGeneration(dialogue[dialogueIdx] || {}, genCtx)) return true
  }

  return false
}

function getExpressMode(options: ExpressOptions): ExpressMode {
  return options.mode === 'scene' ? 'scene' : 'batch'
}

function isRateLimitError(err: unknown): boolean {
  const msg = String((err as any)?.message || err).toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('quota')
  )
}

function recordRateLimitedFailure(
  failures: ExpressRateLimitedFailure[],
  entry: ExpressRateLimitedFailure
): void {
  failures.push(entry)
}

function emitImageFailure(
  emit: ExpressEmit,
  ctx: SceneRunContext,
  err: unknown,
  beatIndex?: number,
  frameRole: 'start' | 'end' = 'start'
): string {
  const { sceneIndex, sceneNumber } = ctx
  const error = (err as any)?.message || String(err)
  const rateLimited = isRateLimitError(err)
  safeEmit(emit, {
    type: 'phase-done',
    sceneIndex,
    sceneNumber,
    phase: 'image',
    ok: false,
    error,
    beatIndex,
    frameRole,
    rateLimited,
  })
  return error
}

async function runDirectionPhase(
  ctx: SceneRunContext,
  options: ExpressOptions,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const { sceneIndex, sceneNumber, scene } = ctx
  if (!options.regenerate && !sceneNeedsDirection(scene)) {
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'direction',
      ok: true,
      skipped: true,
    })
    return { ok: true, skipped: true }
  }

  safeEmit(emit, {
    type: 'phase-start',
    sceneIndex,
    sceneNumber,
    phase: 'direction',
  })

  try {
    const result = await trafficCop.runInLane('text', () =>
      generateSceneDirection({ scene, sceneIndex })
    )
    scene.sceneDirection = result.sceneDirection
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'direction',
      ok: true,
    })
    return { ok: true, skipped: false }
  } catch (err: any) {
    const error = err?.message || String(err)
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'direction',
      ok: false,
      error,
    })
    return { ok: false, skipped: false, error }
  }
}

function resolveExpressIncludeMusic(scene: any, options: ExpressOptions): boolean {
  if (options.includeMusic) return true
  return isTitleOrCinematicScene(scene)
}

async function runAudioPhase(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop,
  rateLimitedFailures: ExpressRateLimitedFailure[]
): Promise<{ ok: boolean; skipped: boolean; counts?: SceneAudioCounts; error?: string; rateLimited?: boolean }> {
  const { sceneIndex, sceneNumber, scene } = ctx
  const language = options.language || 'en'

  const musicReadyScene = ensureSceneMusicFromDirection(scene)
  Object.assign(scene, musicReadyScene)

  if (!options.regenerate && !options.dialogueOnly && !sceneNeedsAudio(scene, language)) {
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'audio',
      ok: true,
      skipped: true,
      counts: { narration: 0, dialogue: 0, music: 0, sfx: 0 },
    })
    return { ok: true, skipped: true }
  }

  safeEmit(emit, {
    type: 'phase-start',
    sceneIndex,
    sceneNumber,
    phase: 'audio',
  })

  try {
    const visionPhase = project?.metadata?.visionPhase || {}
    const narrationVoice = visionPhase.narrationVoice
    const characters = visionPhase.characters || []
    const storedTranslations =
      (language !== 'en' && visionPhase.translations?.[language]) || {}

    if (!narrationVoice) {
      safeEmit(emit, {
        type: 'phase-done',
        sceneIndex,
        sceneNumber,
        phase: 'audio',
        ok: false,
        error: 'Narration voice not configured',
      })
      return { ok: false, skipped: false, error: 'Narration voice not configured' }
    }

    const result = await generateSceneAudio({
        projectId: options.projectId,
        sceneIndex,
        scene,
        characters,
        narrationVoice,
        language,
        storedTranslations: storedTranslations as Record<
          number,
          { narration?: string; dialogue?: string[] }
        >,
        includeMusic: options.dialogueOnly
          ? false
          : resolveExpressIncludeMusic(scene, options),
        includeSFX: options.dialogueOnly ? false : !!options.includeSFX,
        baseUrl,
        authCookie,
        parallelMode: true,
        trafficCop,
      })

    applyAudioAssetsToScene(scene, language, result)

    if (result.failures?.length) {
      for (const failure of result.failures) {
        if (failure.rateLimited) {
          recordRateLimitedFailure(rateLimitedFailures, {
            sceneIndex,
            sceneNumber,
            phase: 'audio',
            dialogueIndex: failure.dialogueIndex,
            error: failure.error,
          })
        }
      }
    }

    const hasRateLimitedFailures = result.failures?.some((f) => f.rateLimited) ?? false

    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'audio',
      ok: true,
      counts: result.counts,
      rateLimited: hasRateLimitedFailures,
    })
    return { ok: true, skipped: false, counts: result.counts, rateLimited: hasRateLimitedFailures }
  } catch (err: any) {
    const error = err?.message || String(err)
    const rateLimited = isRateLimitError(err)
    if (rateLimited) {
      recordRateLimitedFailure(rateLimitedFailures, {
        sceneIndex,
        sceneNumber,
        phase: 'audio',
        error,
      })
    }
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'audio',
      ok: false,
      error,
      rateLimited,
    })
    return { ok: false, skipped: false, error, rateLimited }
  }
}

function sceneNeedsBeatImages(scene: any, options: ExpressOptions): boolean {
  const genCtx = getBeatGenerationContext(options)
  const selectedKeys = getSelectedFrameKeySet(options)
  const beats = getSceneBeats(scene)
  for (const beat of beats) {
    if (isBeatStartSlotSelected(beat, selectedKeys) && beatFrameNeedsGeneration(beat, genCtx)) {
      return true
    }
    if (
      options.includeEndFrames &&
      isBeatEndSlotSelected(beat, selectedKeys) &&
      beat.storyboardImageUrl?.trim() &&
      beatEndFrameNeedsGeneration(beat, genCtx)
    ) {
      return true
    }
  }
  if (selectedKeys) return false
  return countExpressFrameScope(scene, {
    includeEndFrames: options.includeEndFrames,
    regenerate: false,
  }) > 0
}

async function generateSingleBeatImage(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop,
  beatIdx: number,
  artStyle: string,
  beatPlan?: BeatKeyframePlan
): Promise<{ imageUrl: string }> {
  const { sceneIndex, sceneNumber, scene } = ctx
  const imageParams = getExpressImageParams(options)
  const excludeCharacters = isStoryboardNoCharacterScene(scene, sceneNumber)
  const beats = getSceneBeats(scene)
  const beat = beats[beatIdx]
  const visionPhase = project?.metadata?.visionPhase || {}
  const references = visionPhase.references || {}

  let verifiedBeatRefs: ReturnType<typeof mapBeatReferenceSelectionForApi> | null = null
  if (shouldUseExplicitBeatReferences(beat)) {
    verifiedBeatRefs = mapBeatReferenceSelectionForApi(
      beat.referenceSelection,
      visionPhase.characters || [],
      references.locationReferences || [],
      references.objectReferences || []
    )
    console.log(
      `[expressOrchestrator] Beat ${beatIdx + 1} scene ${sceneNumber} — using saved reference selection`
    )
  }

  const result = await trafficCop.runInLane('image', () =>
    generateSceneImage({
    projectId: options.projectId,
    sceneIndex,
    baseUrl,
    authCookie,
    quality: imageParams.quality,
    storyboardQuality: imageParams.storyboardQuality,
    artStyle,
    frameType: 'beat',
    beatIndex: beatIdx,
    ...(beat?.beatId ? { beatId: beat.beatId } : {}),
    sceneOverride: scene,
    ...(verifiedBeatRefs
      ? {
          selectedCharacters: verifiedBeatRefs.selectedCharacters,
          locationReferences: verifiedBeatRefs.locationReferences,
          objectReferences: verifiedBeatRefs.objectReferences,
          characterWardrobes: verifiedBeatRefs.characterWardrobes,
          characterSelectionExplicit: true,
          skipObjectAutoDetection: true,
        }
      : {}),
    ...(Array.isArray(scene.characterWardrobes) && scene.characterWardrobes.length > 0 && !verifiedBeatRefs
      ? { characterWardrobes: scene.characterWardrobes }
      : {}),
    ...(excludeCharacters && !verifiedBeatRefs
      ? { excludeCharacters: true, characterSelectionExplicit: true }
      : {}),
    ...(beatPlan?.prompt ? { customPrompt: beatPlan.prompt, useAIPrompt: false } : {}),
    ...(typeof beatPlan?.allowTypography === 'boolean'
      ? { allowTypography: beatPlan.allowTypography }
      : {}),
    modelTier: imageParams.modelTier,
    skipLikenessValidation: imageParams.skipLikenessValidation,
    })
  )
  await persistBeatFrame(scene, beatIdx, result, imageParams.storyboardQuality)
  safeEmit(emit, {
    type: 'phase-done',
    sceneIndex,
    sceneNumber,
    phase: 'image',
    ok: true,
    imageUrl: result.imageUrl,
    beatIndex: beatIdx,
    imageTier: imageParams.storyboardQuality,
    imagePrompt: result.imagePrompt ?? undefined,
    gcsPath: result.gcsPath ?? undefined,
  })
  console.log(
    `[expressOrchestrator] Beat ${beatIdx + 1} scene ${sceneNumber} — ${imageParams.storyboardQuality} (${imageParams.modelTier})`
  )

  if (options.includeEndFrames && result.imageUrl) {
    const genCtx = getBeatGenerationContext(options)
    const updatedBeats = getSceneBeats(scene)
    const updatedBeat = updatedBeats[beatIdx]
    if (updatedBeat && beatEndFrameNeedsGeneration(updatedBeat, genCtx)) {
      await generateSingleBeatEndImage(
        ctx,
        options,
        project,
        baseUrl,
        authCookie,
        emit,
        trafficCop,
        beatIdx,
        artStyle,
        result.imageUrl
      )
    }
  }

  return { imageUrl: result.imageUrl }
}

async function generateSingleBeatEndImage(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop,
  beatIdx: number,
  artStyle: string,
  startFrameUrl: string
): Promise<{ imageUrl: string }> {
  const { sceneIndex, sceneNumber, scene } = ctx
  const imageParams = getExpressImageParams(options)
  const beats = getSceneBeats(scene)
  const beat = beats[beatIdx]
  if (!beat) return { imageUrl: startFrameUrl }

  const endPrompt = buildEndFramePrompt(beat)

  const result = await trafficCop.runInLane('image', () =>
    generateSceneImage({
      projectId: options.projectId,
      sceneIndex,
      baseUrl,
      authCookie,
      quality: imageParams.quality,
      storyboardQuality: imageParams.storyboardQuality,
      artStyle,
      frameType: 'beat',
      frameRole: 'end',
      startFrameUrl,
      beatIndex: beatIdx,
      ...(beat?.beatId ? { beatId: beat.beatId } : {}),
      sceneOverride: scene,
      customPrompt: endPrompt,
      useAIPrompt: false,
      modelTier: imageParams.modelTier,
      skipLikenessValidation: imageParams.skipLikenessValidation,
    })
  )

  await persistBeatEndFrame(scene, beatIdx, result, imageParams.storyboardQuality)
  safeEmit(emit, {
    type: 'phase-done',
    sceneIndex,
    sceneNumber,
    phase: 'image',
    ok: true,
    imageUrl: result.imageUrl,
    beatIndex: beatIdx,
    frameRole: 'end',
    imageTier: imageParams.storyboardQuality,
    imagePrompt: result.imagePrompt ?? undefined,
    gcsPath: result.gcsPath ?? undefined,
  })
  console.log(
    `[expressOrchestrator] Beat ${beatIdx + 1} scene ${sceneNumber} end frame — ${imageParams.storyboardQuality}`
  )
  return { imageUrl: result.imageUrl }
}

async function runSupplementalEndFrames(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop,
  beats: SceneBeat[],
  artStyle: string,
  genCtx: ReturnType<typeof getBeatGenerationContext>,
  skipBeatIndices: Set<number>,
  rateLimitedFailures: ExpressRateLimitedFailure[]
): Promise<{ hadFailure: boolean; lastError?: string; lastImageUrl?: string }> {
  const { scene, sceneIndex, sceneNumber } = ctx
  if (!options.includeEndFrames) {
    return { hadFailure: false, lastImageUrl: scene.imageUrl }
  }

  const endBeatsToGenerate: number[] = []
  const selectedKeys = getSelectedFrameKeySet(options)
  for (let beatIdx = 0; beatIdx < beats.length; beatIdx++) {
    if (skipBeatIndices.has(beatIdx)) continue
    const beat = beats[beatIdx]
    if (!isBeatEndSlotSelected(beat, selectedKeys)) continue
    if (!beat.storyboardImageUrl?.trim()) continue
    if (!beatEndFrameNeedsGeneration(beat, genCtx)) continue
    endBeatsToGenerate.push(beatIdx)
  }

  if (endBeatsToGenerate.length === 0) {
    return { hadFailure: false, lastImageUrl: scene.imageUrl }
  }

  let lastImageUrl = scene.imageUrl as string | undefined
  let lastError: string | undefined
  let hadFailure = false
  let concurrency = SCENE_EXPRESS_BEAT_CONCURRENCY

  const runEndBatch = async (indices: number[], limit: number) => {
    const tasks = indices.map((beatIdx) => ({
      id: beatIdx,
      execute: async () => {
        const startUrl = getSceneBeats(scene)[beatIdx]?.storyboardImageUrl?.trim()
        if (!startUrl) return { imageUrl: startUrl }
        return generateSingleBeatEndImage(
          ctx,
          options,
          project,
          baseUrl,
          authCookie,
          emit,
          trafficCop,
          beatIdx,
          artStyle,
          startUrl
        )
      },
    }))
    return processWithConcurrency(tasks, limit, undefined, false)
  }

  let results = await runEndBatch(endBeatsToGenerate, concurrency)
  let failedIndices = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.id as number)

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value?.imageUrl) {
      lastImageUrl = r.value.imageUrl
    }
    if (r.status === 'rejected') {
      hadFailure = true
      lastError = emitImageFailure(emit, ctx, r.error, r.id as number, 'end')
      if (isRateLimitError(r.error)) {
        recordRateLimitedFailure(rateLimitedFailures, {
          sceneIndex,
          sceneNumber,
          phase: 'image',
          beatIndex: r.id as number,
          frameRole: 'end',
          error: lastError,
        })
      }
    }
  }

  const rateLimited = results.some(
    (r) => r.status === 'rejected' && isRateLimitError(r.error)
  )
  if (rateLimited && failedIndices.length > 0) {
    concurrency = Math.max(1, Math.floor(concurrency / 2))
    results = await runEndBatch(failedIndices, concurrency)
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.imageUrl) {
        lastImageUrl = r.value.imageUrl
        hadFailure = false
      }
      if (r.status === 'rejected') {
        hadFailure = true
        lastError = emitImageFailure(emit, ctx, r.error, r.id as number, 'end')
        if (isRateLimitError(r.error)) {
          recordRateLimitedFailure(rateLimitedFailures, {
            sceneIndex,
            sceneNumber,
            phase: 'image',
            beatIndex: r.id as number,
            frameRole: 'end',
            error: lastError,
          })
        }
      }
    }
  }

  return { hadFailure, lastError, lastImageUrl }
}

async function runBeatImages(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop,
  beats: SceneBeat[],
  artStyle: string,
  beatPlansByIndex: Map<number, BeatKeyframePlan>,
  rateLimitedFailures: ExpressRateLimitedFailure[]
): Promise<{ hadFailure: boolean; lastError?: string; lastImageUrl?: string }> {
  const { scene, sceneIndex, sceneNumber } = ctx
  const genCtx = getBeatGenerationContext(options)
  const selectedKeys = getSelectedFrameKeySet(options)
  const beatsToGenerate: number[] = []
  for (let beatIdx = 0; beatIdx < beats.length; beatIdx++) {
    const beat = beats[beatIdx]
    if (!isBeatStartSlotSelected(beat, selectedKeys)) continue
    if (!beatFrameNeedsGeneration(beat, genCtx)) continue
    beatsToGenerate.push(beatIdx)
  }

  const generatedStartIndices = new Set<number>()
  let lastImageUrl = scene.imageUrl as string | undefined
  let lastError: string | undefined
  let hadFailure = false

  if (beatsToGenerate.length > 0) {
    let remaining = [...beatsToGenerate]

    if (beatsToGenerate.length >= 3) {
      const probeIdx = beatsToGenerate[0]
      try {
        const probe = await generateSingleBeatImage(
          ctx,
          options,
          project,
          baseUrl,
          authCookie,
          emit,
          trafficCop,
          probeIdx,
          artStyle,
          beatPlansByIndex.get(probeIdx)
        )
        lastImageUrl = probe.imageUrl
        generatedStartIndices.add(probeIdx)
        remaining = beatsToGenerate.slice(1)
      } catch (err: any) {
        lastError = emitImageFailure(emit, ctx, err, probeIdx, 'start')
        hadFailure = true
        if (isRateLimitError(err)) {
          recordRateLimitedFailure(rateLimitedFailures, {
            sceneIndex,
            sceneNumber,
            phase: 'image',
            beatIndex: probeIdx,
            frameRole: 'start',
            error: lastError,
          })
        }
        return { hadFailure: true, lastError, lastImageUrl }
      }
    }

    let concurrency = SCENE_EXPRESS_BEAT_CONCURRENCY

    const runBatch = async (indices: number[], limit: number) => {
      const tasks = indices.map((beatIdx) => ({
        id: beatIdx,
        execute: async () => {
          const result = await generateSingleBeatImage(
            ctx,
            options,
            project,
            baseUrl,
            authCookie,
            emit,
            trafficCop,
            beatIdx,
            artStyle,
            beatPlansByIndex.get(beatIdx)
          )
          generatedStartIndices.add(beatIdx)
          return result
        },
      }))
      return processWithConcurrency(tasks, limit, undefined, false)
    }

    let results = await runBatch(remaining, concurrency)
    let failedIndices = results
      .filter((r) => r.status === 'rejected')
      .map((r) => r.id as number)

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.imageUrl) {
        lastImageUrl = r.value.imageUrl
      }
      if (r.status === 'rejected') {
        hadFailure = true
        lastError = emitImageFailure(emit, ctx, r.error, r.id as number, 'start')
        if (isRateLimitError(r.error)) {
          recordRateLimitedFailure(rateLimitedFailures, {
            sceneIndex,
            sceneNumber,
            phase: 'image',
            beatIndex: r.id as number,
            frameRole: 'start',
            error: lastError,
          })
        }
      }
    }

    const rateLimited = results.some(
      (r) => r.status === 'rejected' && isRateLimitError(r.error)
    )

    if (rateLimited && failedIndices.length > 0) {
      concurrency = Math.max(1, Math.floor(concurrency / 2))
      results = await runBatch(failedIndices, concurrency)
      failedIndices = results
        .filter((r) => r.status === 'rejected')
        .map((r) => r.id as number)
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.imageUrl) {
          lastImageUrl = r.value.imageUrl
          hadFailure = false
        }
        if (r.status === 'rejected') {
          hadFailure = true
          lastError = emitImageFailure(emit, ctx, r.error, r.id as number, 'start')
          if (isRateLimitError(r.error)) {
            recordRateLimitedFailure(rateLimitedFailures, {
              sceneIndex,
              sceneNumber,
              phase: 'image',
              beatIndex: r.id as number,
              frameRole: 'start',
              error: lastError,
            })
          }
        }
      }
    }

    if (hadFailure && failedIndices.length > remaining.length / 2) {
      const endResult = await runSupplementalEndFrames(
        ctx,
        options,
        project,
        baseUrl,
        authCookie,
        emit,
        trafficCop,
        getSceneBeats(scene),
        artStyle,
        genCtx,
        generatedStartIndices,
        rateLimitedFailures
      )
      return {
        hadFailure: true,
        lastError: endResult.lastError ?? lastError,
        lastImageUrl: endResult.lastImageUrl ?? lastImageUrl,
      }
    }
  }

  const endResult = await runSupplementalEndFrames(
    ctx,
    options,
    project,
    baseUrl,
    authCookie,
    emit,
    trafficCop,
    getSceneBeats(scene),
    artStyle,
    genCtx,
    generatedStartIndices,
    rateLimitedFailures
  )

  return {
    hadFailure: hadFailure || endResult.hadFailure,
    lastError: endResult.lastError ?? lastError,
    lastImageUrl: endResult.lastImageUrl ?? lastImageUrl,
  }
}

/** Serialize in-memory beat persist so parallel generations do not drop sibling URLs. */
const beatPersistChains = new WeakMap<object, Promise<void>>()

function writeBeatFrameToScene(
  scene: any,
  beatIndex: number,
  result: { imageUrl: string; gcsPath?: string | null; imagePrompt?: string | null },
  tier: StoryboardQuality
): void {
  const beats = getSceneBeats(scene)
  if (!beats[beatIndex]) return
  beats[beatIndex] = {
    ...beats[beatIndex],
    storyboardImageUrl: result.imageUrl,
    storyboardImageTier: tier,
    ...(result.gcsPath ? { storyboardImageGcsPath: result.gcsPath } : {}),
    ...(result.imagePrompt ? { storyboardImagePrompt: result.imagePrompt } : {}),
  }
  const updated = applyBeatsToScene(scene, beats)
  Object.assign(scene, updated)
  if (beatIndex === 0 && beats[0]?.kind === 'action') {
    scene.imageUrl = result.imageUrl
    if (result.imagePrompt) scene.imagePrompt = result.imagePrompt
  }
}

function writeBeatEndFrameToScene(
  scene: any,
  beatIndex: number,
  result: { imageUrl: string; gcsPath?: string | null; imagePrompt?: string | null },
  tier: StoryboardQuality
): void {
  const beats = getSceneBeats(scene)
  if (!beats[beatIndex]) return
  beats[beatIndex] = {
    ...beats[beatIndex],
    storyboardEndImageUrl: result.imageUrl,
    storyboardEndImageTier: tier,
    ...(result.gcsPath ? { storyboardEndImageGcsPath: result.gcsPath } : {}),
    ...(result.imagePrompt ? { storyboardEndImagePrompt: result.imagePrompt } : {}),
  }
  const updated = applyBeatsToScene(scene, beats)
  Object.assign(scene, updated)
}

async function persistBeatEndFrame(
  scene: any,
  beatIndex: number,
  result: { imageUrl: string; gcsPath?: string | null; imagePrompt?: string | null },
  tier: StoryboardQuality
): Promise<void> {
  const previous = beatPersistChains.get(scene) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  beatPersistChains.set(scene, previous.then(() => gate))
  await previous
  try {
    writeBeatEndFrameToScene(scene, beatIndex, result, tier)
  } finally {
    release()
  }
}

async function persistBeatFrame(
  scene: any,
  beatIndex: number,
  result: { imageUrl: string; gcsPath?: string | null; imagePrompt?: string | null },
  tier: StoryboardQuality
): Promise<void> {
  const previous = beatPersistChains.get(scene) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  beatPersistChains.set(scene, previous.then(() => gate))
  await previous
  try {
    writeBeatFrameToScene(scene, beatIndex, result, tier)
  } finally {
    release()
  }
}

async function planSceneBeatKeyframes(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop,
  beats: SceneBeat[],
  artStyle: string
): Promise<Map<number, BeatKeyframePlan>> {
  const { sceneIndex, sceneNumber, scene } = ctx
  const beatPlansByIndex = new Map<number, BeatKeyframePlan>()

  safeEmit(emit, {
    type: 'phase-start',
    sceneIndex,
    sceneNumber,
    phase: 'image-plan',
  })

  try {
    const visionPhase = project?.metadata?.visionPhase || {}
    const treatment = visionPhase.treatment || project?.metadata?.treatmentPhase
    const scenes =
      project?.metadata?.visionPhase?.script?.script?.scenes ||
      visionPhase?.script?.scenes ||
      []
    const planResult = await trafficCop.runInLane('text', () =>
      planBeatSequence({
        scene,
        beats,
        sceneNumber,
        totalScenes: Array.isArray(scenes) ? scenes.length : undefined,
        filmContext: {
          title: project?.metadata?.title || project?.title,
          logline: treatment?.logline || treatment?.synopsis,
          genre: treatment?.genre
            ? Array.isArray(treatment.genre)
              ? treatment.genre
              : [treatment.genre]
            : undefined,
          tone: treatment?.tone,
          visualStyle: treatment?.visualStyle,
        },
        artStyle,
        projectId: options.projectId,
      })
    )
    Object.assign(scene, applyBeatKeyframePlansToScene(scene, planResult.plans))
    for (const plan of planResult.plans) {
      beatPlansByIndex.set(plan.beatIndex, plan)
    }
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'image-plan',
      ok: true,
    })
    console.log(
      `[expressOrchestrator] Planned ${planResult.plans.length} keyframes (AI: ${planResult.usedAI}) scene ${sceneNumber}`
    )
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err)
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'image-plan',
      ok: false,
      error,
    })
    console.warn(`[expressOrchestrator] Beat plan failed, continuing without plan: ${error}`)
  }

  return beatPlansByIndex
}

async function generateLegacySceneImage(
  trafficCop: ExpressTrafficCop,
  params: Parameters<typeof generateSceneImage>[0]
) {
  return trafficCop.runInLane('image', () => generateSceneImage(params))
}

async function runImagePhase(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop,
  rateLimitedFailures: ExpressRateLimitedFailure[]
): Promise<{ ok: boolean; skipped: boolean; imageUrl?: string; error?: string; rateLimited?: boolean }> {
  const { sceneIndex, sceneNumber, scene } = ctx
  const beats = getSceneBeats(scene)
  const useBeatPipeline = beats.length > 0
  const artStyle = options.artStyle || 'photorealistic'

  const needsImages =
    options.regenerate ||
    options.finalizeOnly ||
    (options.selectedFrameKeys?.length
      ? useBeatPipeline
        ? sceneNeedsBeatImages(scene, options)
        : sceneNeedsLegacyImages(scene, options)
      : useBeatPipeline
        ? sceneNeedsBeatImages(scene, options)
        : sceneNeedsImage(scene))

  if (!needsImages) {
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'image',
      ok: true,
      skipped: true,
      imageUrl: scene.imageUrl,
    })
    return { ok: true, skipped: true, imageUrl: scene.imageUrl }
  }

  safeEmit(emit, { type: 'phase-start', sceneIndex, sceneNumber, phase: 'image' })

  let lastImageUrl = scene.imageUrl as string | undefined
  let hadFailure = false
  let lastError: string | undefined

  try {
    if (useBeatPipeline) {
      const beatPlansByIndex = await planSceneBeatKeyframes(
        ctx,
        options,
        project,
        emit,
        trafficCop,
        beats,
        artStyle
      )

      const beatResult = await runBeatImages(
        ctx,
        options,
        project,
        baseUrl,
        authCookie,
        emit,
        trafficCop,
        beats,
        artStyle,
        beatPlansByIndex,
        rateLimitedFailures
      )
      hadFailure = beatResult.hadFailure
      lastError = beatResult.lastError
      lastImageUrl = beatResult.lastImageUrl ?? lastImageUrl
      scene.storyboardStatus = 'pending_review'
      scene.storyboardApprovedAt = undefined
    } else {
      const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
      const imageParams = getExpressImageParams(options)
      const genCtx = getBeatGenerationContext(options)
      const selectedKeys = getSelectedFrameKeySet(options)
      const needsEstablishing =
        (options.regenerate || sceneNeedsEstablishingImage(scene)) &&
        isLegacySlotSelected('establishing', selectedKeys)

      const persistDialogueFrame = (
        idx: number,
        result: { imageUrl: string; gcsPath?: string | null; imagePrompt?: string | null },
        tier: StoryboardQuality
      ) => {
        if (!Array.isArray(scene.dialogue)) scene.dialogue = []
        scene.dialogue[idx] = {
          ...scene.dialogue[idx],
          storyboardImageUrl: result.imageUrl,
          storyboardImageTier: tier,
          ...(result.gcsPath ? { storyboardImageGcsPath: result.gcsPath } : {}),
          ...(result.imagePrompt ? { storyboardImagePrompt: result.imagePrompt } : {}),
        }
      }

      if (needsEstablishing) {
        try {
          const result = await generateLegacySceneImage(trafficCop, {
            projectId: options.projectId,
            sceneIndex,
            baseUrl,
            authCookie,
            quality: imageParams.quality,
            storyboardQuality: imageParams.storyboardQuality,
            artStyle,
            frameType: 'establishing',
            sceneOverride: scene,
            modelTier: imageParams.modelTier,
            skipLikenessValidation: imageParams.skipLikenessValidation,
          })
          scene.imageUrl = result.imageUrl
          lastImageUrl = result.imageUrl
          if (result.gcsPath) scene.imageGcsPath = result.gcsPath
          if (result.imagePrompt) scene.imagePrompt = result.imagePrompt
          safeEmit(emit, {
            type: 'phase-done',
            sceneIndex,
            sceneNumber,
            phase: 'image',
            ok: true,
            imageUrl: result.imageUrl,
          })
        } catch (err: any) {
          hadFailure = true
          lastError = err?.message || String(err)
          safeEmit(emit, {
            type: 'phase-done',
            sceneIndex,
            sceneNumber,
            phase: 'image',
            ok: false,
            error: lastError,
          })
        }
      }

      for (let dialogueIdx = 0; dialogueIdx < dialogue.length; dialogueIdx++) {
        if (!isLegacySlotSelected(`dialogue-${dialogueIdx}`, selectedKeys)) continue
        if (!dialogueFrameNeedsGeneration(dialogue[dialogueIdx] || {}, genCtx)) continue

        try {
          const result = await generateLegacySceneImage(trafficCop, {
            projectId: options.projectId,
            sceneIndex,
            baseUrl,
            authCookie,
            quality: imageParams.quality,
            storyboardQuality: imageParams.storyboardQuality,
            artStyle,
            frameType: 'dialogue',
            dialogueIndex: dialogueIdx,
            sceneOverride: scene,
            modelTier: imageParams.modelTier,
            skipLikenessValidation: imageParams.skipLikenessValidation,
          })
          persistDialogueFrame(dialogueIdx, result, imageParams.storyboardQuality)
          lastImageUrl = result.imageUrl
          safeEmit(emit, {
            type: 'phase-done',
            sceneIndex,
            sceneNumber,
            phase: 'image',
            ok: true,
            imageUrl: result.imageUrl,
            dialogueIndex: dialogueIdx,
          })
        } catch (err: any) {
          hadFailure = true
          lastError = err?.message || String(err)
          safeEmit(emit, {
            type: 'phase-done',
            sceneIndex,
            sceneNumber,
            phase: 'image',
            ok: false,
            error: lastError,
            dialogueIndex: dialogueIdx,
          })
        }
      }
    }

    if (hadFailure) {
      return { ok: false, skipped: false, imageUrl: lastImageUrl, error: lastError }
    }
    Object.assign(scene, stampPreVisContentHash(scene))
    return { ok: true, skipped: false, imageUrl: lastImageUrl }
  } catch (err: any) {
    const error = err?.message || String(err)
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'image',
      ok: false,
      error,
    })
    return { ok: false, skipped: false, error }
  }
}

async function runScene(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  trafficCop: ExpressTrafficCop,
  rateLimitedFailures: ExpressRateLimitedFailure[]
): Promise<ExpressPerSceneSummary> {
  const { sceneIndex, sceneNumber } = ctx
  const phasesRun: ExpressPhase[] = []
  const phasesSkipped: ExpressPhase[] = []
  const phasesFailed: ExpressPhase[] = []
  const sceneMode = getExpressMode(options) === 'scene'

  safeEmit(emit, { type: 'scene-start', sceneIndex, sceneNumber })

  if (sceneMode) {
    const visionPhase = project?.metadata?.visionPhase || {}
    const preflight = runSceneExpressPreflight({
      scene: ctx.scene,
      sceneIndex,
      characters: visionPhase.characters || [],
      narrationVoice: visionPhase.narrationVoice,
      language: options.language || 'en',
      regenerate: options.regenerate,
    })

    if (!preflight.ok) {
      safeEmit(emit, {
        type: 'preflight-failed',
        sceneIndex,
        sceneNumber,
        errors: preflight.errors,
      })
      for (const phase of ['direction', 'audio', 'image'] as ExpressPhase[]) {
        safeEmit(emit, {
          type: 'phase-done',
          sceneIndex,
          sceneNumber,
          phase,
          ok: false,
          error: preflight.errors[0],
        })
        phasesFailed.push(phase)
      }
      const error = preflight.errors.join(' ')
      safeEmit(emit, { type: 'scene-done', sceneIndex, sceneNumber, ok: false, error })
      return {
        sceneIndex,
        sceneNumber,
        ok: false,
        error,
        phasesRun,
        phasesSkipped,
        phasesFailed,
      }
    }

    if (
      preflight.nothingToDo &&
      !(options.framesOnly && (options.selectedFrameKeys?.length ?? 0) > 0)
    ) {
      for (const phase of ['direction', 'audio', 'image'] as ExpressPhase[]) {
        safeEmit(emit, {
          type: 'phase-done',
          sceneIndex,
          sceneNumber,
          phase,
          ok: true,
          skipped: true,
        })
        phasesSkipped.push(phase)
      }
      safeEmit(emit, { type: 'scene-done', sceneIndex, sceneNumber, ok: true })
      return {
        sceneIndex,
        sceneNumber,
        ok: true,
        phasesRun,
        phasesSkipped,
        phasesFailed,
      }
    }
  }

  if (options.finalizeOnly) {
    for (const phase of ['direction', 'audio'] as ExpressPhase[]) {
      safeEmit(emit, {
        type: 'phase-done',
        sceneIndex,
        sceneNumber,
        phase,
        ok: true,
        skipped: true,
      })
      phasesSkipped.push(phase)
    }

    const iRes = await runImagePhase(
      ctx,
      options,
      project,
      baseUrl,
      authCookie,
      emit,
      trafficCop,
      rateLimitedFailures
    )
    if (iRes.skipped) phasesSkipped.push('image')
    else if (iRes.ok) phasesRun.push('image')
    else phasesFailed.push('image')

    const ok = phasesFailed.length === 0
    const error = phasesFailed.length > 0 ? `Failed phases: ${phasesFailed.join(', ')}` : undefined
    safeEmit(emit, { type: 'scene-done', sceneIndex, sceneNumber, ok, error })
    return {
      sceneIndex,
      sceneNumber,
      ok,
      error,
      phasesRun,
      phasesSkipped,
      phasesFailed,
    }
  }

  if (options.framesOnly) {
    for (const phase of ['direction', 'audio'] as ExpressPhase[]) {
      safeEmit(emit, {
        type: 'phase-done',
        sceneIndex,
        sceneNumber,
        phase,
        ok: true,
        skipped: true,
      })
      phasesSkipped.push(phase)
    }

    const iRes = await runImagePhase(
      ctx,
      options,
      project,
      baseUrl,
      authCookie,
      emit,
      trafficCop,
      rateLimitedFailures
    )
    if (iRes.skipped) phasesSkipped.push('image')
    else if (iRes.ok) phasesRun.push('image')
    else phasesFailed.push('image')

    const ok = phasesFailed.length === 0
    const error = phasesFailed.length > 0 ? `Failed phases: ${phasesFailed.join(', ')}` : undefined
    safeEmit(emit, { type: 'scene-done', sceneIndex, sceneNumber, ok, error })
    return {
      sceneIndex,
      sceneNumber,
      ok,
      error,
      phasesRun,
      phasesSkipped,
      phasesFailed,
    }
  }

  if (options.dialogueOnly) {
    for (const phase of ['direction', 'image'] as ExpressPhase[]) {
      safeEmit(emit, {
        type: 'phase-done',
        sceneIndex,
        sceneNumber,
        phase,
        ok: true,
        skipped: true,
      })
      phasesSkipped.push(phase)
    }

    const aRes = await runAudioPhase(
      ctx,
      { ...options, regenerate: options.regenerate ?? true },
      project,
      baseUrl,
      authCookie,
      emit,
      trafficCop,
      rateLimitedFailures
    )

    if (aRes.skipped) phasesSkipped.push('audio')
    else if (aRes.ok) phasesRun.push('audio')
    else phasesFailed.push('audio')

    const ok = phasesFailed.length === 0
    const error = phasesFailed.length > 0 ? `Failed phases: ${phasesFailed.join(', ')}` : undefined
    safeEmit(emit, { type: 'scene-done', sceneIndex, sceneNumber, ok, error })

    return {
      sceneIndex,
      sceneNumber,
      ok,
      error,
      phasesRun,
      phasesSkipped,
      phasesFailed,
    }
  }

  // Phase 1: Direction
  const dRes = await runDirectionPhase(ctx, options, emit, trafficCop)
  if (dRes.skipped) phasesSkipped.push('direction')
  else if (dRes.ok) phasesRun.push('direction')
  else phasesFailed.push('direction')

  if (sceneMode && !dRes.ok && !dRes.skipped) {
    for (const phase of ['audio', 'image'] as ExpressPhase[]) {
      safeEmit(emit, {
        type: 'phase-done',
        sceneIndex,
        sceneNumber,
        phase,
        ok: false,
        error: dRes.error || 'Direction failed',
        skipped: true,
      })
      phasesFailed.push(phase)
    }
    const error = dRes.error || 'Direction failed'
    safeEmit(emit, { type: 'scene-done', sceneIndex, sceneNumber, ok: false, error })
    return {
      sceneIndex,
      sceneNumber,
      ok: false,
      error,
      phasesRun,
      phasesSkipped,
      phasesFailed,
    }
  }

  const [aRes, iRes] = await Promise.all([
    runAudioPhase(
      ctx,
      options,
      project,
      baseUrl,
      authCookie,
      emit,
      trafficCop,
      rateLimitedFailures
    ),
    runImagePhase(
      ctx,
      options,
      project,
      baseUrl,
      authCookie,
      emit,
      trafficCop,
      rateLimitedFailures
    ),
  ])

  if (aRes.skipped) phasesSkipped.push('audio')
  else if (aRes.ok) phasesRun.push('audio')
  else phasesFailed.push('audio')

  if (iRes.skipped) phasesSkipped.push('image')
  else if (iRes.ok) phasesRun.push('image')
  else phasesFailed.push('image')

  const ok = phasesFailed.length === 0
  const error = phasesFailed.length > 0 ? `Failed phases: ${phasesFailed.join(', ')}` : undefined
  safeEmit(emit, { type: 'scene-done', sceneIndex, sceneNumber, ok, error })

  return {
    sceneIndex,
    sceneNumber,
    ok,
    error,
    phasesRun,
    phasesSkipped,
    phasesFailed,
  }
}

/**
 * Run the Storyboard Express pipeline.
 *
 * Mutates `project.metadata.visionPhase.script.scenes` in-memory. The caller
 * is responsible for persisting the mutation (one atomic
 * `Project.update({ metadata })` call after this function returns).
 */
export async function runExpress(
  params: RunExpressParams
): Promise<ExpressResult> {
  const { project, options, baseUrl, authCookie, emit, onSceneComplete } = params
  const { scenes } = getScenes(project)

  const sceneIndices =
    options.sceneIndices && options.sceneIndices.length > 0
      ? options.sceneIndices.filter((idx) => idx >= 0 && idx < scenes.length)
      : scenes.map((_: any, idx: number) => idx)

  safeEmit(emit, { type: 'start', sceneCount: sceneIndices.length })

  if (options.dialogueOnly && options.language && options.language !== 'en') {
    await ensureLanguageStreamTranslations(project, scenes, options.language, sceneIndices)
  }

  const rateLimitedFailures: ExpressRateLimitedFailure[] = []

  const trafficCop = new ExpressTrafficCop({
    onThrottle: (lane, max, cooldownMs) => {
      safeEmit(emit, { type: 'throttle', lane, max, cooldownMs })
    },
    onRegulator: (engaged, lanes, reason) => {
      safeEmit(emit, { type: 'regulator', engaged, lanes, reason })
    },
  })

  const tasks = sceneIndices.map((idx: number) => ({
    id: idx,
    execute: async () => {
      const result = await runScene(
        {
          sceneIndex: idx,
          sceneNumber: idx + 1,
          scene: scenes[idx],
        },
        options,
        project,
        baseUrl,
        authCookie,
        emit,
        trafficCop,
        rateLimitedFailures
      )
      if (onSceneComplete) {
        await onSceneComplete(idx, result)
      }
      return result
    },
  }))

  const results = await processWithConcurrency(
    tasks,
    getExpressSceneConcurrency(),
    undefined,
    /* retryFailures */ false
  )

  const perScene: ExpressPerSceneSummary[] = results.map((r, taskIdx) => {
    const sceneIndex = sceneIndices[taskIdx] ?? taskIdx
    if (r.status === 'fulfilled' && r.value) return r.value
    return {
      sceneIndex,
      sceneNumber: sceneIndex + 1,
      ok: false,
      error: r.error?.message || 'Unknown error',
      phasesRun: [],
      phasesSkipped: [],
      phasesFailed: ['direction', 'audio', 'image'],
    }
  })

  const successScenes = perScene.filter((s) => s.ok).length
  const failedScenes = perScene.length - successScenes

  safeEmit(emit, {
    type: 'complete',
    successScenes,
    failedScenes,
    rateLimitedFailures: rateLimitedFailures.length > 0 ? rateLimitedFailures : undefined,
  })

  return {
    successScenes,
    failedScenes,
    perScene,
  }
}
