/**
 * Storyboard Express orchestrator.
 *
 * For each scene, runs Direction -> Audio -> Image sequentially.
 * Scenes are processed sequentially (one by one) to ensure chain reference
 * consistency, since the end frame of one scene/segment may be used as the
 * start frame of the next. All work is done against
 * an in-memory `scenes` array; the orchestrator does NOT touch the DB.
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
import type {
  ExpressEmit,
  ExpressEvent,
  ExpressMode,
  ExpressOptions,
  ExpressPerSceneSummary,
  ExpressPhase,
  ExpressResult,
  SceneAudioCounts,
} from './types'
import { runSceneExpressPreflight } from './sceneExpressPreflight'
import { generateSceneDirection } from './generateDirection'
import { generateSceneAudio, applyAudioAssetsToScene } from './generateAudio'
import { generateSceneImage } from './generateImage'
import { shouldScheduleStandaloneNarration } from '../script/narration'
import { getSceneBeats, applyBeatsToScene } from '../script/beatMigration'
import { countStoryboardFramesNeedingGeneration } from '../storyboard/types'
import type { SceneBeat } from '../script/segmentTypes'
import {
  planBeatSequence,
  applyBeatKeyframePlansToScene,
  ensureSceneMusicFromDirection,
  isTitleOrCinematicScene,
  type BeatKeyframePlan,
} from '../intelligence/beat-sequence-planner'

const EXPRESS_CONCURRENCY = 1 // Process one scene at a time for chain reference consistency
const EXPRESS_BEAT_IMAGE_DELAY_MS = 2000

const EXPRESS_IMAGE_OPTS = {
  modelTier: 'eco' as const,
  skipLikenessValidation: true,
}

function expressImageDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, EXPRESS_BEAT_IMAGE_DELAY_MS))
}

export interface RunExpressParams {
  /** Already-loaded project. The orchestrator mutates `metadata.visionPhase.script` in-memory. */
  project: any
  options: ExpressOptions
  baseUrl: string
  authCookie?: string
  emit: ExpressEmit
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

function getExpressMode(options: ExpressOptions): ExpressMode {
  return options.mode === 'scene' ? 'scene' : 'batch'
}

function isRateLimitError(err: unknown): boolean {
  const msg = String((err as any)?.message || err).toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit')
  )
}

async function runDirectionPhase(
  ctx: SceneRunContext,
  options: ExpressOptions,
  emit: ExpressEmit
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
    const result = await generateSceneDirection({ scene, sceneIndex })
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
  emit: ExpressEmit
): Promise<{ ok: boolean; skipped: boolean; counts?: SceneAudioCounts; error?: string }> {
  const { sceneIndex, sceneNumber, scene } = ctx
  const language = options.language || 'en'

  const musicReadyScene = ensureSceneMusicFromDirection(scene)
  Object.assign(scene, musicReadyScene)

  if (!options.regenerate && !sceneNeedsAudio(scene, language)) {
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
      includeMusic: resolveExpressIncludeMusic(scene, options),
      includeSFX: !!options.includeSFX,
      baseUrl,
      authCookie,
      parallelMode: getExpressMode(options) === 'scene',
    })

    applyAudioAssetsToScene(scene, language, result)

    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'audio',
      ok: true,
      counts: result.counts,
    })
    return { ok: true, skipped: false, counts: result.counts }
  } catch (err: any) {
    const error = err?.message || String(err)
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'audio',
      ok: false,
      error,
    })
    return { ok: false, skipped: false, error }
  }
}

function sceneNeedsBeatImages(scene: any): boolean {
  return countStoryboardFramesNeedingGeneration(scene) > 0
}

async function generateSingleBeatImage(
  ctx: SceneRunContext,
  options: ExpressOptions,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  beatIdx: number,
  artStyle: string,
  beatPlan?: BeatKeyframePlan
): Promise<{ imageUrl: string }> {
  const { sceneIndex, sceneNumber, scene } = ctx
  const result = await generateSceneImage({
    projectId: options.projectId,
    sceneIndex,
    baseUrl,
    authCookie,
    quality: options.imageQuality || 'auto',
    artStyle,
    frameType: 'beat',
    beatIndex: beatIdx,
    sceneOverride: scene,
    ...(beatPlan?.prompt ? { customPrompt: beatPlan.prompt, useAIPrompt: false } : {}),
    ...(typeof beatPlan?.allowTypography === 'boolean'
      ? { allowTypography: beatPlan.allowTypography }
      : {}),
    ...EXPRESS_IMAGE_OPTS,
  })
  persistBeatFrame(scene, beatIdx, result)
  safeEmit(emit, {
    type: 'phase-done',
    sceneIndex,
    sceneNumber,
    phase: 'image',
    ok: true,
    imageUrl: result.imageUrl,
    beatIndex: beatIdx,
  })
  console.log(
    `[expressOrchestrator] Beat ${beatIdx + 1} scene ${sceneNumber} — vertex eco`
  )
  return { imageUrl: result.imageUrl }
}

async function runBeatImagesSceneMode(
  ctx: SceneRunContext,
  options: ExpressOptions,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit,
  beats: SceneBeat[],
  artStyle: string,
  beatPlansByIndex: Map<number, BeatKeyframePlan>
): Promise<{ hadFailure: boolean; lastError?: string; lastImageUrl?: string }> {
  const { scene } = ctx
  const beatsToGenerate: number[] = []
  for (let beatIdx = 0; beatIdx < beats.length; beatIdx++) {
    const beat = beats[beatIdx]
    if (!options.regenerate && beat.storyboardImageUrl?.trim()) continue
    beatsToGenerate.push(beatIdx)
  }

  if (beatsToGenerate.length === 0) {
    return { hadFailure: false, lastImageUrl: scene.imageUrl }
  }

  let lastImageUrl = scene.imageUrl as string | undefined
  let lastError: string | undefined
  let hadFailure = false
  let remaining = [...beatsToGenerate]

  if (beatsToGenerate.length >= 3) {
    const probeIdx = beatsToGenerate[0]
    try {
      const probe = await generateSingleBeatImage(
        ctx,
        options,
        baseUrl,
        authCookie,
        emit,
        probeIdx,
        artStyle,
        beatPlansByIndex.get(probeIdx)
      )
      lastImageUrl = probe.imageUrl
      remaining = beatsToGenerate.slice(1)
    } catch (err: any) {
      lastError = err?.message || String(err)
      hadFailure = true
      safeEmit(emit, {
        type: 'phase-done',
        sceneIndex,
        sceneNumber,
        phase: 'image',
        ok: false,
        error: lastError,
        beatIndex: probeIdx,
      })
      return { hadFailure: true, lastError, lastImageUrl }
    }
  }

  let concurrency = SCENE_EXPRESS_BEAT_CONCURRENCY

  const runBatch = async (indices: number[], limit: number) => {
    const tasks = indices.map((beatIdx) => ({
      id: beatIdx,
      execute: async () => {
        try {
          return await generateSingleBeatImage(
            ctx,
            options,
            baseUrl,
            authCookie,
            emit,
            beatIdx,
            artStyle,
            beatPlansByIndex.get(beatIdx)
          )
        } catch (err: any) {
          const error = err?.message || String(err)
          safeEmit(emit, {
            type: 'phase-done',
            sceneIndex,
            sceneNumber,
            phase: 'image',
            ok: false,
            error,
            beatIndex: beatIdx,
          })
          throw err
        }
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
      lastError = r.error?.message || String(r.error)
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
        lastError = r.error?.message || String(r.error)
      }
    }
  }

  if (hadFailure && failedIndices.length > remaining.length / 2) {
    return { hadFailure: true, lastError, lastImageUrl }
  }

  return { hadFailure: failedIndices.length > 0, lastError, lastImageUrl }
}

function persistBeatFrame(scene: any, beatIndex: number, result: { imageUrl: string; gcsPath?: string | null; imagePrompt?: string | null }) {
  const beats = getSceneBeats(scene)
  if (!beats[beatIndex]) return
  beats[beatIndex] = {
    ...beats[beatIndex],
    storyboardImageUrl: result.imageUrl,
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

async function planSceneBeatKeyframes(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  emit: ExpressEmit,
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
    const planResult = await planBeatSequence({
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

async function runImagePhase(
  ctx: SceneRunContext,
  options: ExpressOptions,
  project: any,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit
): Promise<{ ok: boolean; skipped: boolean; imageUrl?: string; error?: string }> {
  const { sceneIndex, sceneNumber, scene } = ctx
  const beats = getSceneBeats(scene)
  const useBeatPipeline = beats.length > 0
  const artStyle = options.artStyle || 'photorealistic'

  const needsImages =
    options.regenerate ||
    (useBeatPipeline ? sceneNeedsBeatImages(scene) : sceneNeedsImage(scene))

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
        beats,
        artStyle
      )

      if (getExpressMode(options) === 'scene') {
        const beatResult = await runBeatImagesSceneMode(
          ctx,
          options,
          baseUrl,
          authCookie,
          emit,
          beats,
          artStyle,
          beatPlansByIndex
        )
        hadFailure = beatResult.hadFailure
        lastError = beatResult.lastError
        lastImageUrl = beatResult.lastImageUrl ?? lastImageUrl
      } else {
        for (let beatIdx = 0; beatIdx < beats.length; beatIdx++) {
          const beat = beats[beatIdx]
          if (!options.regenerate && beat.storyboardImageUrl?.trim()) continue

          try {
            const beatPlan = beatPlansByIndex.get(beatIdx)
            const result = await generateSceneImage({
              projectId: options.projectId,
              sceneIndex,
              baseUrl,
              authCookie,
              quality: options.imageQuality || 'auto',
              artStyle,
              frameType: 'beat',
              beatIndex: beatIdx,
              sceneOverride: scene,
              ...(beatPlan?.prompt ? { customPrompt: beatPlan.prompt, useAIPrompt: false } : {}),
              ...(typeof beatPlan?.allowTypography === 'boolean'
                ? { allowTypography: beatPlan.allowTypography }
                : {}),
              ...EXPRESS_IMAGE_OPTS,
            })
            persistBeatFrame(scene, beatIdx, result)
            lastImageUrl = result.imageUrl
            safeEmit(emit, {
              type: 'phase-done',
              sceneIndex,
              sceneNumber,
              phase: 'image',
              ok: true,
              imageUrl: result.imageUrl,
              beatIndex: beatIdx,
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
              beatIndex: beatIdx,
            })
          }
          if (beatIdx < beats.length - 1) {
            await expressImageDelay()
          }
        }
      }
      scene.storyboardStatus = 'pending_review'
      scene.storyboardApprovedAt = undefined
    } else {
      const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
      const needsEstablishing = options.regenerate || sceneNeedsEstablishingImage(scene)

      const persistDialogueFrame = (idx: number, result: { imageUrl: string; gcsPath?: string | null; imagePrompt?: string | null }) => {
        if (!Array.isArray(scene.dialogue)) scene.dialogue = []
        scene.dialogue[idx] = {
          ...scene.dialogue[idx],
          storyboardImageUrl: result.imageUrl,
          ...(result.gcsPath ? { storyboardImageGcsPath: result.gcsPath } : {}),
          ...(result.imagePrompt ? { storyboardImagePrompt: result.imagePrompt } : {}),
        }
      }

      if (needsEstablishing) {
        try {
          const result = await generateSceneImage({
            projectId: options.projectId,
            sceneIndex,
            baseUrl,
            authCookie,
            quality: options.imageQuality || 'auto',
            artStyle,
            frameType: 'establishing',
            sceneOverride: scene,
            ...EXPRESS_IMAGE_OPTS,
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
        if (!options.regenerate && dialogue[dialogueIdx]?.storyboardImageUrl) continue

        try {
          const result = await generateSceneImage({
            projectId: options.projectId,
            sceneIndex,
            baseUrl,
            authCookie,
            quality: options.imageQuality || 'auto',
            artStyle,
            frameType: 'dialogue',
            dialogueIndex: dialogueIdx,
            sceneOverride: scene,
            ...EXPRESS_IMAGE_OPTS,
          })
          persistDialogueFrame(dialogueIdx, result)
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
  emit: ExpressEmit
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

    if (preflight.nothingToDo) {
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

  // Phase 1: Direction
  const dRes = await runDirectionPhase(ctx, options, emit)
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

  let aRes: Awaited<ReturnType<typeof runAudioPhase>>
  let iRes: Awaited<ReturnType<typeof runImagePhase>>

  if (sceneMode) {
    ;[aRes, iRes] = await Promise.all([
      runAudioPhase(ctx, options, project, baseUrl, authCookie, emit),
      runImagePhase(ctx, options, project, baseUrl, authCookie, emit),
    ])
  } else {
    aRes = await runAudioPhase(ctx, options, project, baseUrl, authCookie, emit)
    iRes = await runImagePhase(ctx, options, project, baseUrl, authCookie, emit)
  }

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
  const { project, options, baseUrl, authCookie, emit } = params
  const { scenes } = getScenes(project)

  const sceneIndices =
    options.sceneIndices && options.sceneIndices.length > 0
      ? options.sceneIndices.filter((idx) => idx >= 0 && idx < scenes.length)
      : scenes.map((_: any, idx: number) => idx)

  safeEmit(emit, { type: 'start', sceneCount: sceneIndices.length })

  const tasks = sceneIndices.map((idx: number) => ({
    id: idx,
    execute: () =>
      runScene(
        {
          sceneIndex: idx,
          sceneNumber: idx + 1,
          scene: scenes[idx],
        },
        options,
        project,
        baseUrl,
        authCookie,
        emit
      ),
  }))

  const results = await processWithConcurrency(
    tasks,
    EXPRESS_CONCURRENCY,
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

  safeEmit(emit, { type: 'complete', successScenes, failedScenes })

  return {
    successScenes,
    failedScenes,
    perScene,
  }
}
