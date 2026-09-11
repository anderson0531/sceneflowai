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

import { processWithConcurrency } from '../utils/concurrent-processor'
import {
  getSceneExpressBeatConcurrency,
  getSceneExpressBeatMaxAttempts,
  runAdaptiveBeatPool,
  type AdaptiveBeatPoolOptions,
  type AdaptiveBeatPoolResult,
} from './adaptiveBeatScheduler'
import {
  isExpressBeatPoolRetryable,
  isExpressImageCanaryAbortError,
  isExpressImageRateLimitError,
  formatExpressImageErrorForUser,
} from './expressImageErrors'
import {
  ExpressTrafficCop,
  getExpressImageConcurrency,
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
import { usesFlashDraftTier } from './animaticImageModel'
import { beatDirectionFingerprint } from '../script/beatDirectionFingerprint'
import { shouldScheduleStandaloneNarration } from '../script/narration'
import {
  detectCharactersNamedInBeat,
  mapBeatReferenceSelectionForApi,
  resolveBeatFrameGenerationContext,
  shouldUseExplicitBeatReferences,
  toBeatReferenceSelection,
  unionBeatSelectionWithPromptText,
} from '../vision/beatFrameGenerationContext'
import {
  applyBeatReferenceSelectionToScene,
  getSceneBeats,
  applyBeatsToScene,
  isBeatExcluded,
} from '../script/beatMigration'
import { beatFrameSlotKey, countExpressFrameScope } from '../storyboard/types'
import { stampPreVisContentHash } from '../storyboard/preVisSync'
import type { BeatReferenceSelection, SceneBeat } from '../script/segmentTypes'
import {
  planBeatSequence,
  applyBeatKeyframePlansToScene,
  asBeatRole,
  ensureSceneMusicFromDirection,
  isTitleOrCinematicScene,
  roleAllowsTypography,
  storedPromptMatchesDirection,
  type BeatKeyframePlan,
  type BeatPlannerContinuityAnchor,
} from '../intelligence/beat-sequence-planner'
import {
  ensureProjectLookbook,
  summarizeScenesForLookbook,
  type LookbookSceneSummary,
  type ProjectLookbook,
} from '../intelligence/project-lookbook'
import { parseStillPromptSource } from '../imagen/structuredStillPrompt'
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

function buildExpressReferenceCatalog(project: any): {
  characterNames: string[]
  propNames: string[]
  locationNames: string[]
} {
  const visionPhase = project?.metadata?.visionPhase || {}
  const references = visionPhase.references || {}
  const characters = Array.isArray(visionPhase.characters) ? visionPhase.characters : []
  const objectReferences = Array.isArray(references.objectReferences)
    ? references.objectReferences
    : []
  const locationReferences = Array.isArray(references.locationReferences)
    ? references.locationReferences
    : []

  return {
    characterNames: characters
      .map((c: { name?: string }) => String(c?.name ?? '').trim())
      .filter(Boolean),
    propNames: objectReferences
      .map((o: { name?: string }) => String(o?.name ?? '').trim())
      .filter(Boolean),
    locationNames: locationReferences
      .map((l: { location?: string; name?: string }) =>
        String(l?.location || l?.name || '').trim()
      )
      .filter(Boolean),
  }
}

function getExpressImageParams(options: ExpressOptions) {
  const gen = resolveStoryboardGeneration({
    storyboardQuality: options.storyboardQuality,
    legacyImageQuality:
      options.imageQuality === 'max' || options.imageQuality === 'auto'
        ? options.imageQuality
        : undefined,
  })
  // Draft beats are animatic coverage — the image route may serve them from flash.
  return { ...gen, animaticDraft: gen.modelTier === 'eco', ...EXPRESS_SKIP_LIKENESS }
}

/** Draft beats on flash get a wider image lane than pro identity-ref frames. */
function usesFlashAnimaticRun(options: ExpressOptions): boolean {
  return usesFlashDraftTier({
    isBeatFrame: true,
    resolvedModelTier: getExpressImageParams(options).modelTier,
  })
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
  return selectedKeys.has(beatFrameSlotKey(beat.beatId, 'start'))
}

function isBeatEndSlotSelected(beat: SceneBeat, selectedKeys: Set<string> | null): boolean {
  if (!selectedKeys) return true
  if (!beat.beatId) return false
  return selectedKeys.has(beatFrameSlotKey(beat.beatId, 'end'))
}

function isLegacySlotSelected(key: string, selectedKeys: Set<string> | null): boolean {
  if (!selectedKeys) return true
  return selectedKeys.has(key)
}

export type ExpressBeatRefsResolved = {
  api: ReturnType<typeof mapBeatReferenceSelectionForApi>
  selection: BeatReferenceSelection
  fromSavedSelection: boolean
}

/** Resolve beat references for Express — user Direct selection wins, else dialog-parity auto-resolve. */
export function resolveExpressBeatReferences(args: {
  beat: SceneBeat
  scene: Record<string, unknown>
  sceneIndex: number
  beatIdx: number
  sceneNumber: number
  project: any
  promptText?: string
}): ExpressBeatRefsResolved | null {
  const { beat, scene, sceneIndex, beatIdx, sceneNumber, project, promptText } = args
  const visionPhase = project?.metadata?.visionPhase || {}
  const references = visionPhase.references || {}
  const projectCharacters = visionPhase.characters || []
  const locationReferences = references.locationReferences || []
  const objectReferences = references.objectReferences || []
  const filmTitle = project?.metadata?.title || project?.title

  const finish = (
    selection: BeatReferenceSelection,
    fromSavedSelection: boolean
  ): ExpressBeatRefsResolved => {
    const unioned = unionBeatSelectionWithPromptText(
      selection,
      promptText,
      projectCharacters,
      scene,
      sceneIndex,
      filmTitle,
      objectReferences,
      locationReferences
    )
    return {
      api: mapBeatReferenceSelectionForApi(
        unioned,
        projectCharacters,
        locationReferences,
        objectReferences
      ),
      selection: unioned,
      fromSavedSelection,
    }
  }

  if (shouldUseExplicitBeatReferences(beat)) {
    console.log(
      `[expressOrchestrator] Beat ${beatIdx + 1} scene ${sceneNumber} — using saved user reference selection`
    )
    return finish(beat.referenceSelection, true)
  }

  const autoCtx = resolveBeatFrameGenerationContext({
    scene,
    beat,
    sceneIndex,
    projectCharacters,
    locationReferences,
    objectReferences,
    filmTitle,
  })

  if (autoCtx.warnings.length > 0) {
    console.log(
      `[expressOrchestrator] Beat ${beatIdx + 1} scene ${sceneNumber} — reference warnings: ${autoCtx.warnings.join('; ')}`
    )
  } else {
    console.log(
      `[expressOrchestrator] Beat ${beatIdx + 1} scene ${sceneNumber} — auto-resolved references (dialog parity)`
    )
  }

  return finish(toBeatReferenceSelection({ ...autoCtx, source: 'auto' }), false)
}

export interface BeatCharacterPolicy {
  excludeCharacters: boolean
  /**
   * Cast this beat is allowed to reference, as id/name tokens. Non-null only
   * inside a no-talent scene, where the beat earns references by naming people
   * and must not inherit the rest of the scene cast.
   */
  restrictToCharacterIds: string[] | null
}

/**
 * Narrow a scene-level no-talent verdict down to one beat.
 *
 * `isStoryboardNoCharacterScene` answers for the whole scene, so a heading
 * containing "TITLE SEQUENCE" stripped the cast from every beat inside it —
 * including beats whose own text names a character. Those frames reached Vertex
 * with zero identity references and came back with a stranger's face.
 *
 * The beat has to name someone itself. The ordinary auto-resolver is too loose
 * here: when a beat names nobody it falls back to the scene cast, and in a
 * one-character project to that character, which would put a face on a title
 * card. A beat that names nobody stays reference-free.
 */
export function resolveBeatCharacterPolicy(args: {
  sceneExcludesCharacters: boolean
  beat: SceneBeat | undefined
  promptText?: string
  project: any
  beatIdx: number
  sceneNumber: number
}): BeatCharacterPolicy {
  if (!args.sceneExcludesCharacters) {
    return { excludeCharacters: false, restrictToCharacterIds: null }
  }
  if (!args.beat) return { excludeCharacters: true, restrictToCharacterIds: null }

  const visionPhase = args.project?.metadata?.visionPhase || {}
  const references = visionPhase.references || {}
  const named = detectCharactersNamedInBeat({
    beat: args.beat,
    promptText: args.promptText,
    projectCharacters: visionPhase.characters || [],
    filmTitle: args.project?.metadata?.title || args.project?.title,
    objectReferences: references.objectReferences || [],
    locationReferences: references.locationReferences || [],
  })

  if (named.length === 0) {
    return { excludeCharacters: true, restrictToCharacterIds: null }
  }

  const restrictToCharacterIds = named
    .flatMap((char) => [char.id, char.name])
    .filter((token): token is string => !!token)

  console.log(
    `[expressOrchestrator] Beat ${args.beatIdx + 1} scene ${args.sceneNumber} — no-talent scene, but this beat names ${named
      .map((c) => c.name || c.id)
      .join(', ')}; attaching character references`
  )
  return { excludeCharacters: false, restrictToCharacterIds }
}

/**
 * Build the reference fields for one beat's generate-image call.
 *
 * Owns `excludeCharacters` as well as the selection so the exclusion decision
 * has a single source of truth. `characterSelectionExplicit` locks the route out
 * of its own auto-detection, so it is only ever set alongside a real cast or a
 * deliberate exclusion — an explicit-but-empty selection reaches the route as
 * "zero valid character objects" with no way to recover.
 */
export function buildExpressBeatRefPayload(
  verifiedBeatRefs: ReturnType<typeof mapBeatReferenceSelectionForApi> | null,
  policy: BeatCharacterPolicy
): Record<string, unknown> {
  const { excludeCharacters, restrictToCharacterIds } = policy
  const exclusion: Record<string, unknown> = excludeCharacters
    ? { excludeCharacters: true, characterSelectionExplicit: true }
    : {}

  if (!verifiedBeatRefs) return exclusion

  const allowed = restrictToCharacterIds
    ? new Set(restrictToCharacterIds.map((token) => token.toLowerCase()))
    : null
  const selectedCharacters = excludeCharacters
    ? []
    : allowed
      ? verifiedBeatRefs.selectedCharacters.filter((token) =>
          allowed.has(token.toLowerCase())
        )
      : verifiedBeatRefs.selectedCharacters

  const payload: Record<string, unknown> = {
    ...exclusion,
    locationReferences: verifiedBeatRefs.locationReferences,
    objectReferences: verifiedBeatRefs.objectReferences,
    skipObjectAutoDetection: true,
  }

  if (selectedCharacters.length > 0) {
    const selectedKeys = new Set(selectedCharacters.map((token) => token.toLowerCase()))
    const characterWardrobes = allowed
      ? verifiedBeatRefs.characterWardrobes.filter((cw) =>
          selectedKeys.has(cw.characterId.toLowerCase())
        )
      : verifiedBeatRefs.characterWardrobes

    payload.characterSelectionExplicit = true
    payload.selectedCharacters = selectedCharacters
    if (characterWardrobes.length > 0) {
      payload.characterWardrobes = characterWardrobes
    }
  }

  return payload
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
  /** The one look every frame in this run shares. */
  lookbook?: ProjectLookbook
  /** One line per scene, so beats are planned against the whole film. */
  storySpine?: LookbookSceneSummary[]
  /** Last beat of the preceding scene, for continuity across the cut. */
  previousSceneLastBeat?: BeatPlannerContinuityAnchor
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

/**
 * Resolve the project's look once per run and stash it on the in-memory
 * project, so the route's atomic metadata write persists it and later
 * single-frame regenerations resolve to the same look.
 */
async function resolveRunLookbook(
  project: any,
  options: ExpressOptions
): Promise<ProjectLookbook | undefined> {
  try {
    const lookbook = await ensureProjectLookbook(project, options.artStyle)
    if (!lookbook) return undefined
    if (!project.metadata) project.metadata = {}
    if (!project.metadata.visionPhase) project.metadata.visionPhase = {}
    project.metadata.visionPhase.lookbook = lookbook
    console.log(
      `[expressOrchestrator] Lookbook ${lookbook.fingerprint} (AI: ${lookbook.usedAI !== false})`
    )
    return lookbook
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[expressOrchestrator] Lookbook unavailable, frames run unanchored: ${message}`)
    return undefined
  }
}

/**
 * Last beat of the preceding scene, read from stored direction rather than the
 * in-flight plan: scenes run concurrently, so the previous scene may not have
 * been planned yet in this run.
 */
function getPreviousSceneContinuityAnchor(
  scenes: any[],
  sceneIndex: number
): BeatPlannerContinuityAnchor | undefined {
  if (sceneIndex <= 0) return undefined
  const previous = scenes[sceneIndex - 1]
  if (!previous) return undefined
  const beats = getSceneBeats(previous)
  const lastBeat = beats[beats.length - 1]
  if (!lastBeat) return undefined

  const shotType = lastBeat.beatDirection?.shotType?.trim() || undefined
  const frozenMoment =
    lastBeat.beatDirection?.frozenMoment?.trim() || lastBeat.actionDescription?.trim() || undefined
  if (!shotType && !frozenMoment) return undefined
  return { shotType, frozenMoment }
}

/**
 * A plan that replays what the beat already had.
 *
 * Used on a scoped run so a regen renders the frame the user was looking at
 * rather than the planner's fresh interpretation of the same beat. `beatRole`
 * and `shotType` are inert here — nothing downstream reads them off a reused
 * plan, and the beat keeps its own stored values because
 * `applyBeatKeyframePlansToScene` is not called for it.
 */
function reusedBeatPlan(beat: SceneBeat, beatIndex: number): BeatKeyframePlan {
  const beatRole = asBeatRole(beat.beatRole) ?? 'progression'
  return {
    beatIndex,
    beatRole,
    shotType: beat.beatDirection?.shotType ?? '',
    frozenMoment: beat.beatDirection?.frozenMoment ?? '',
    prompt: beat.storyboardImagePrompt ?? '',
    allowTypography: roleAllowsTypography(beat.beatRole),
    ...(beat.durationSeconds ? { durationSeconds: beat.durationSeconds } : {}),
    ...(beat.beatDirection?.lightingAccent
      ? { lighting: beat.beatDirection.lightingAccent }
      : {}),
  }
}

/** Action/Framing text only — style prose must not drive reference matching. */
function beatPlanActionText(plan?: BeatKeyframePlan): string | undefined {
  const prompt = plan?.prompt?.trim()
  if (!prompt) return undefined
  return parseStillPromptSource(prompt).actionFraming || prompt
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

function buildAdaptiveBeatPoolOptions(
  emit: ExpressEmit,
  options: ExpressOptions
): AdaptiveBeatPoolOptions {
  const concurrency = getSceneExpressBeatConcurrency({
    flashAnimatic: usesFlashAnimaticRun(options),
  })
  return {
    initialConcurrency: concurrency,
    maxConcurrency: concurrency,
    minConcurrency: 1,
    maxAttempts: getSceneExpressBeatMaxAttempts(),
    isRetryable: isExpressBeatPoolRetryable,
    isCanaryAbort: isExpressImageCanaryAbortError,
    onConcurrencyChange: (max, reason) => {
      if (reason === 'decrease') {
        safeEmit(emit, { type: 'throttle', lane: 'image', max })
      }
    },
    abortOnNonRetryableCanary: true,
  }
}

function emitOrphanBeatFailures(
  emit: ExpressEmit,
  ctx: SceneRunContext,
  beatIndices: number[],
  pool: AdaptiveBeatPoolResult,
  frameRole: 'start' | 'end',
  rateLimitedFailures: ExpressRateLimitedFailure[],
  onBeatFailed?: (beatIdx: number) => void
): string | undefined {
  const { sceneIndex, sceneNumber } = ctx
  let lastError: string | undefined

  for (const beatIdx of beatIndices) {
    if (pool.succeeded.has(beatIdx) || pool.failed.has(beatIdx)) continue
    const err = pool.aborted?.error ?? new Error('Beat generation did not run')
    onBeatFailed?.(beatIdx)
    lastError = emitImageFailure(emit, ctx, err, beatIdx, frameRole)
    if (isExpressImageRateLimitError(err)) {
      recordRateLimitedFailure(rateLimitedFailures, {
        sceneIndex,
        sceneNumber,
        phase: 'image',
        beatIndex: beatIdx,
        frameRole,
        error: lastError,
      })
    }
  }

  return lastError
}

function emitImageFailure(
  emit: ExpressEmit,
  ctx: SceneRunContext,
  err: unknown,
  beatIndex?: number,
  frameRole: 'start' | 'end' = 'start'
): string {
  const { sceneIndex, sceneNumber, scene } = ctx
  const error = formatExpressImageErrorForUser(err)
  const rateLimited = isExpressImageRateLimitError(err)
  if (typeof beatIndex === 'number') {
    writeBeatFrameErrorToScene(scene, beatIndex, error, frameRole)
  }
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
  const sceneExcludesCharacters = isStoryboardNoCharacterScene(scene, sceneNumber)
  const beats = getSceneBeats(scene)
  const beat = beats[beatIdx]

  const verifiedBeatRefs = beat
    ? resolveExpressBeatReferences({
        beat,
        scene,
        sceneIndex,
        beatIdx,
        sceneNumber,
        project,
        promptText: beatPlanActionText(beatPlan),
      })
    : null
  if (beat && verifiedBeatRefs?.selection && !verifiedBeatRefs.fromSavedSelection) {
    persistBeatReferenceSelection(scene, beatIdx, verifiedBeatRefs.selection)
  }
  const characterPolicy = resolveBeatCharacterPolicy({
    sceneExcludesCharacters,
    beat,
    promptText: beatPlanActionText(beatPlan),
    project,
    beatIdx,
    sceneNumber,
  })
  const beatRefPayload = buildExpressBeatRefPayload(verifiedBeatRefs?.api ?? null, characterPolicy)

  // Emitted after the lane grants a slot, so the UI shows what is generating
  // rather than every queued beat at once.
  const result = await trafficCop.runInLane('image', () => {
    safeEmit(emit, {
      type: 'frame-start',
      sceneIndex,
      sceneNumber,
      beatIndex: beatIdx,
      frameRole: 'start',
    })
    return generateSceneImage({
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
      ...beatRefPayload,
      useAIPrompt: false,
      ...(beatPlan?.prompt?.trim() ? { customPrompt: beatPlan.prompt } : {}),
      ...(typeof beatPlan?.allowTypography === 'boolean'
        ? { allowTypography: beatPlan.allowTypography }
        : {}),
      modelTier: imageParams.modelTier,
      animaticDraft: imageParams.animaticDraft,
      skipLikenessValidation: true,
    })
  })
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
  const sceneExcludesCharacters = isStoryboardNoCharacterScene(scene, sceneNumber)
  const beats = getSceneBeats(scene)
  const beat = beats[beatIdx]
  if (!beat) return { imageUrl: startFrameUrl }

  const endPrompt = buildEndFramePrompt(beat)
  const verifiedBeatRefs = resolveExpressBeatReferences({
    beat,
    scene,
    sceneIndex,
    beatIdx,
    sceneNumber,
    project,
    promptText: endPrompt,
  })
  if (verifiedBeatRefs?.selection && !verifiedBeatRefs.fromSavedSelection) {
    persistBeatReferenceSelection(scene, beatIdx, verifiedBeatRefs.selection)
  }
  const characterPolicy = resolveBeatCharacterPolicy({
    sceneExcludesCharacters,
    beat,
    promptText: endPrompt,
    project,
    beatIdx,
    sceneNumber,
  })
  const beatRefPayload = buildExpressBeatRefPayload(verifiedBeatRefs?.api ?? null, characterPolicy)

  const result = await trafficCop.runInLane('image', () => {
    safeEmit(emit, {
      type: 'frame-start',
      sceneIndex,
      sceneNumber,
      beatIndex: beatIdx,
      frameRole: 'end',
    })
    return generateSceneImage({
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
      ...beatRefPayload,
      customPrompt: endPrompt,
      useAIPrompt: false,
      modelTier: imageParams.modelTier,
      animaticDraft: imageParams.animaticDraft,
      skipLikenessValidation: imageParams.skipLikenessValidation,
    })
  })

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
  failedStartBeatIndices: Set<number>,
  rateLimitedFailures: ExpressRateLimitedFailure[]
): Promise<{ hadFailure: boolean; lastError?: string; lastImageUrl?: string }> {
  const { scene, sceneIndex, sceneNumber } = ctx
  if (!options.includeEndFrames) {
    return { hadFailure: false, lastImageUrl: scene.imageUrl }
  }

  const endBeatsToGenerate: number[] = []
  const selectedKeys = getSelectedFrameKeySet(options)
  for (let beatIdx = 0; beatIdx < beats.length; beatIdx++) {
    if (failedStartBeatIndices.has(beatIdx)) continue
    const beat = beats[beatIdx]
    if (isBeatExcluded(beat)) continue
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

  const pool = await runAdaptiveBeatPool(
    endBeatsToGenerate,
    async (beatIdx) => {
      const startUrl = getSceneBeats(scene)[beatIdx]?.storyboardImageUrl?.trim()
      if (!startUrl) {
        throw new Error(`Missing start frame URL for beat ${beatIdx + 1}`)
      }
      const result = await generateSingleBeatEndImage(
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
      lastImageUrl = result.imageUrl
    },
    buildAdaptiveBeatPoolOptions(emit, options)
  )

  for (const [beatIdx, err] of pool.failed) {
    hadFailure = true
    lastError = emitImageFailure(emit, ctx, err, beatIdx, 'end')
    if (isExpressImageRateLimitError(err)) {
      recordRateLimitedFailure(rateLimitedFailures, {
        sceneIndex,
        sceneNumber,
        phase: 'image',
        beatIndex: beatIdx,
        frameRole: 'end',
        error: lastError,
      })
    }
  }

  const orphanError = emitOrphanBeatFailures(
    emit,
    ctx,
    endBeatsToGenerate,
    pool,
    'end',
    rateLimitedFailures
  )
  if (orphanError) {
    hadFailure = true
    lastError = orphanError
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
    if (isBeatExcluded(beat)) continue
    if (!isBeatStartSlotSelected(beat, selectedKeys)) continue
    if (!beatFrameNeedsGeneration(beat, genCtx)) continue
    beatsToGenerate.push(beatIdx)
  }

  let lastImageUrl = scene.imageUrl as string | undefined
  let lastError: string | undefined
  let hadFailure = false
  const failedStartBeatIndices = new Set<number>()

  if (beatsToGenerate.length > 0) {
    const pool = await runAdaptiveBeatPool(
      beatsToGenerate,
      async (beatIdx) => {
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
        lastImageUrl = result.imageUrl
      },
      buildAdaptiveBeatPoolOptions(emit, options)
    )

    for (const [beatIdx, err] of pool.failed) {
      failedStartBeatIndices.add(beatIdx)
      hadFailure = true
      lastError = emitImageFailure(emit, ctx, err, beatIdx, 'start')
      if (isExpressImageRateLimitError(err)) {
        recordRateLimitedFailure(rateLimitedFailures, {
          sceneIndex,
          sceneNumber,
          phase: 'image',
          beatIndex: beatIdx,
          frameRole: 'start',
          error: lastError,
        })
      }
    }

    const orphanError = emitOrphanBeatFailures(
      emit,
      ctx,
      beatsToGenerate,
      pool,
      'start',
      rateLimitedFailures,
      (beatIdx) => failedStartBeatIndices.add(beatIdx)
    )
    if (orphanError) {
      hadFailure = true
      lastError = orphanError
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
    failedStartBeatIndices,
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

function persistBeatReferenceSelection(
  scene: Record<string, unknown>,
  beatIndex: number,
  selection: BeatReferenceSelection
): void {
  const beats = getSceneBeats(scene)
  const beat = beats[beatIndex]
  if (!beat?.beatId) return
  const updated = applyBeatReferenceSelectionToScene(scene, beat.beatId, selection)
  Object.assign(scene, updated)
}

function writeBeatFrameToScene(
  scene: any,
  beatIndex: number,
  result: { imageUrl: string; gcsPath?: string | null; imagePrompt?: string | null },
  tier: StoryboardQuality
): void {
  const beats = getSceneBeats(scene)
  if (!beats[beatIndex]) return
  const previous = beats[beatIndex]
  const { storyboardImageError: _cleared, ...rest } = previous
  beats[beatIndex] = {
    ...rest,
    storyboardImageUrl: result.imageUrl,
    storyboardImageTier: tier,
    ...(result.gcsPath ? { storyboardImageGcsPath: result.gcsPath } : {}),
    // Stamped with the direction it describes, so a later direction edit
    // recomposes the frame instead of replaying this wording.
    ...(result.imagePrompt
      ? {
          storyboardImagePrompt: result.imagePrompt,
          storyboardImagePromptDirectionKey: beatDirectionFingerprint(previous.beatDirection),
        }
      : {}),
  }
  const updated = applyBeatsToScene(scene, beats)
  Object.assign(scene, updated)
  if (beatIndex === 0 && beats[0]?.kind === 'action') {
    scene.imageUrl = result.imageUrl
    if (result.imagePrompt) scene.imagePrompt = result.imagePrompt
  }
}

function writeBeatFrameErrorToScene(
  scene: any,
  beatIndex: number,
  error: string,
  frameRole: 'start' | 'end' = 'start'
): void {
  const beats = getSceneBeats(scene)
  if (!beats[beatIndex]) return
  beats[beatIndex] =
    frameRole === 'end'
      ? { ...beats[beatIndex], storyboardEndImageError: error }
      : { ...beats[beatIndex], storyboardImageError: error }
  const updated = applyBeatsToScene(scene, beats)
  Object.assign(scene, updated)
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
    storyboardEndImageError: undefined,
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

/** Exported for tests; the run path calls it through runImagePhase. */
export async function planSceneBeatKeyframes(
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
    const selectedKeys = getSelectedFrameKeySet(options)
    const activeEntries = beats
      .map((beat, beatIndex) => ({ beat, beatIndex }))
      .filter(({ beat }) => !isBeatExcluded(beat))

    // A scoped run plans only the frames it was asked to render. Planning writes
    // storyboardImagePrompt on every beat it covers, so planning a whole scene
    // in order to regenerate one frame would overwrite its siblings' prompts —
    // including any authored by hand in the prompt builder.
    const inScope = selectedKeys
      ? activeEntries.filter(
          ({ beat }) =>
            isBeatStartSlotSelected(beat, selectedKeys) ||
            isBeatEndSlotSelected(beat, selectedKeys)
        )
      : activeEntries

    // A stored prompt whose direction fingerprint still matches describes the
    // beat as it stands, so it is replayed instead of re-planned. Only scoped
    // runs reuse: an unscoped pass is asking for the scene to be re-planned.
    const toPlan = selectedKeys
      ? inScope.filter(({ beat }) => !storedPromptMatchesDirection(beat))
      : inScope

    if (selectedKeys) {
      for (const { beat, beatIndex } of inScope) {
        if (storedPromptMatchesDirection(beat)) {
          beatPlansByIndex.set(beatIndex, reusedBeatPlan(beat, beatIndex))
        }
      }
    }

    if (toPlan.length === 0) {
      safeEmit(emit, {
        type: 'phase-done',
        sceneIndex,
        sceneNumber,
        phase: 'image-plan',
        ok: true,
        skipped: true,
      })
      console.log(
        `[expressOrchestrator] Reused ${beatPlansByIndex.size} stored beat prompt(s) scene ${sceneNumber} — planner skipped`
      )
      return beatPlansByIndex
    }

    const visionPhase = project?.metadata?.visionPhase || {}
    const treatment = visionPhase.treatment || project?.metadata?.treatmentPhase
    const scenes =
      project?.metadata?.visionPhase?.script?.script?.scenes ||
      visionPhase?.script?.scenes ||
      []
    const planResult = await trafficCop.runInLane('text', () =>
      planBeatSequence({
        scene,
        beats: toPlan.map((entry) => entry.beat),
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
        referenceCatalog: buildExpressReferenceCatalog(project),
        lookbook: ctx.lookbook,
        storySpine: ctx.storySpine,
        previousSceneLastBeat: ctx.previousSceneLastBeat,
      })
    )
    const remappedPlans = planResult.plans.map((plan) => ({
      ...plan,
      beatIndex: toPlan[plan.beatIndex]?.beatIndex ?? plan.beatIndex,
    }))
    Object.assign(scene, applyBeatKeyframePlansToScene(scene, remappedPlans))
    for (const plan of remappedPlans) {
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
      `[expressOrchestrator] Planned ${remappedPlans.length} keyframes (AI: ${planResult.usedAI}) scene ${sceneNumber}`
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
            skipLikenessValidation: true,
            useAIPrompt: false,
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
            skipLikenessValidation: true,
            useAIPrompt: false,
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
      framesOnly: options.framesOnly,
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

  const lookbook = await resolveRunLookbook(project, options)
  const storySpine = summarizeScenesForLookbook(scenes)

  const trafficCop = new ExpressTrafficCop({
    laneMax: {
      image: getExpressImageConcurrency({ flashAnimatic: usesFlashAnimaticRun(options) }),
    },
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
          lookbook,
          storySpine,
          previousSceneLastBeat: getPreviousSceneContinuityAnchor(scenes, idx),
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
