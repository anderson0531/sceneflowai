/**
 * Storyboard Express orchestrator.
 *
 * For each scene, runs Direction -> Audio -> Image sequentially. Multiple
 * scenes are processed concurrently (default: 3). All work is done against
 * an in-memory `scenes` array; the orchestrator does NOT touch the DB.
 *
 * Callers (e.g. `[api/vision/express/route.ts]`) are responsible for:
 *  - Loading the project once at the start.
 *  - Persisting the mutated `scenes` array atomically once `runExpress`
 *    resolves.
 */

import { processWithConcurrency } from '../utils/concurrent-processor'
import type {
  ExpressEmit,
  ExpressEvent,
  ExpressOptions,
  ExpressPerSceneSummary,
  ExpressPhase,
  ExpressResult,
  SceneAudioCounts,
} from './types'
import { generateSceneDirection } from './generateDirection'
import { generateSceneAudio, applyAudioAssetsToScene } from './generateAudio'
import { generateSceneImage } from './generateImage'

const EXPRESS_CONCURRENCY = 3

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
  const narrationOk =
    !scene?.narration ||
    !!scene?.narrationAudio?.[language]?.url ||
    !!scene?.narrationAudio?.[language]
  const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
  const dialogueAudio = scene?.dialogueAudio?.[language]
  const dialogueOk =
    dialogue.length === 0 ||
    (Array.isArray(dialogueAudio) &&
      dialogueAudio.length >= dialogue.length &&
      dialogueAudio.every((d: any) => d && d.audioUrl))
  return !(narrationOk && dialogueOk)
}

function sceneNeedsImage(scene: any): boolean {
  return !scene?.imageUrl
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
      includeMusic: !!options.includeMusic,
      includeSFX: !!options.includeSFX,
      baseUrl,
      authCookie,
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

async function runImagePhase(
  ctx: SceneRunContext,
  options: ExpressOptions,
  baseUrl: string,
  authCookie: string | undefined,
  emit: ExpressEmit
): Promise<{ ok: boolean; skipped: boolean; imageUrl?: string; error?: string }> {
  const { sceneIndex, sceneNumber, scene } = ctx

  if (!options.regenerate && !sceneNeedsImage(scene)) {
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

  safeEmit(emit, {
    type: 'phase-start',
    sceneIndex,
    sceneNumber,
    phase: 'image',
  })

  try {
    const result = await generateSceneImage({
      projectId: options.projectId,
      sceneIndex,
      baseUrl,
      authCookie,
      quality: options.imageQuality || 'auto',
    })
    scene.imageUrl = result.imageUrl
    if (result.gcsPath) {
      scene.imageGcsPath = result.gcsPath
    }
    if (result.imagePrompt) {
      scene.imagePrompt = result.imagePrompt
    }
    safeEmit(emit, {
      type: 'phase-done',
      sceneIndex,
      sceneNumber,
      phase: 'image',
      ok: true,
      imageUrl: result.imageUrl,
    })
    return { ok: true, skipped: false, imageUrl: result.imageUrl }
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

  safeEmit(emit, { type: 'scene-start', sceneIndex, sceneNumber })

  // Phase 1: Direction
  const dRes = await runDirectionPhase(ctx, options, emit)
  if (dRes.skipped) phasesSkipped.push('direction')
  else if (dRes.ok) phasesRun.push('direction')
  else phasesFailed.push('direction')

  // Phase 2: Audio (continues even if direction failed; the dialog list
  // doesn't depend on the direction object).
  const aRes = await runAudioPhase(ctx, options, project, baseUrl, authCookie, emit)
  if (aRes.skipped) phasesSkipped.push('audio')
  else if (aRes.ok) phasesRun.push('audio')
  else phasesFailed.push('audio')

  // Phase 3: Image (continues even if earlier phases failed; the image
  // prompt is built independently from the scene's text/visualDescription.)
  const iRes = await runImagePhase(ctx, options, baseUrl, authCookie, emit)
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

  safeEmit(emit, { type: 'start', sceneCount: scenes.length })

  const tasks = scenes.map((scene: any, idx: number) => ({
    id: idx,
    execute: () =>
      runScene(
        {
          sceneIndex: idx,
          sceneNumber: idx + 1,
          scene,
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

  const perScene: ExpressPerSceneSummary[] = results.map((r, idx) => {
    if (r.status === 'fulfilled' && r.value) return r.value
    return {
      sceneIndex: idx,
      sceneNumber: idx + 1,
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
