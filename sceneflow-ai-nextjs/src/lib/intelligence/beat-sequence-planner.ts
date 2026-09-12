/**
 * Beat Sequence Planner — one Gemini pass per scene to plan distinct animatic
 * film stills (frozen beat illustrations) before parallel image generation.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  detectSceneType,
  type FilmContext,
} from '@/lib/intelligence/scene-direction-metadata'
import {
  applyBeatKeyframePlansToScene,
  buildFallbackBeatPlans,
  composeBeatActionFraming,
  composeBeatStillPrompt,
  ensureSceneMusicFromDirection,
  formatBeatPlannerReferenceCatalog,
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  inferBeatRole,
  asBeatRole,
  roleAllowsTypography,
  storedPromptMatchesDirection,
  type BeatKeyframePlan,
  type BeatPlannerContinuityAnchor,
  type BeatRole,
  type BeatSequencePlanRequest,
  type BeatSequenceReferenceCatalog,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import { generateDirectionHash } from '@/lib/utils/contentHash'
import { fingerprintSource } from '@/lib/utils/fingerprint'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export type {
  BeatRole,
  BeatKeyframePlan,
  BeatPlannerContinuityAnchor,
  BeatSequencePlanRequest,
  BeatSequenceReferenceCatalog,
  FilmContext,
}
export {
  inferBeatRole,
  asBeatRole,
  roleAllowsTypography,
  storedPromptMatchesDirection,
  buildFallbackBeatPlans,
  applyBeatKeyframePlansToScene,
  composeBeatActionFraming,
  composeBeatStillPrompt,
  ensureSceneMusicFromDirection,
  formatBeatPlannerReferenceCatalog,
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
}

export interface BeatSequencePlanResult {
  plans: BeatKeyframePlan[]
  usedAI: boolean
  reasoning?: string
  /**
   * Why this plan is deterministic, in whole or in part.
   *
   * The fallback produces a whole scene of plausible-looking prompts, so
   * without this a rejected plan is indistinguishable from a planned one —
   * which is how a scene of near-identical frames reached a user with nothing
   * in the logs but `AI: false`. Also set when `usedAI` is true but individual
   * beats had to be filled deterministically.
   */
  fallbackReason?: string
}

interface PlanCacheEntry {
  result: BeatSequencePlanResult
  timestamp: number
}

const planCache = new Map<string, PlanCacheEntry>()
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000

export function getBeatPlanCacheKey(request: BeatSequencePlanRequest): string {
  const { scene, referenceCatalog: catalog } = request
  const directionHash = generateDirectionHash(scene)
  const heading = String(scene.heading ?? '').slice(0, 80)
  const actionHash = String(scene.action ?? scene.visualDescription ?? '').slice(0, 120)
  const catalogKey = [
    ...(catalog?.characterNames ?? []),
    ...(catalog?.propNames ?? []),
    ...(catalog?.locationNames ?? []),
  ].join(',')
  // Style inputs belong in the key: without them a cached pre-lookbook plan
  // would be served after the project's look changes.
  const spineHash = fingerprintSource(
    (request.storySpine ?? []).flatMap((entry) => [entry.heading, entry.oneLine])
  )
  const anchor = request.previousSceneLastBeat
  return [
    request.projectId ?? 'default',
    directionHash,
    request.beats.length,
    heading,
    actionHash,
    catalogKey,
    request.artStyle ?? 'photorealistic',
    request.lookbook?.fingerprint ?? 'no-lookbook',
    spineHash,
    fingerprintSource([anchor?.shotType, anchor?.frozenMoment, anchor?.screenDirection]),
  ].join('|')
}

function getCachedPlan(key: string): BeatSequencePlanResult | null {
  const entry = planCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > PLAN_CACHE_TTL_MS) {
    planCache.delete(key)
    return null
  }
  return entry.result
}

function setCachedPlan(key: string, result: BeatSequencePlanResult): void {
  if (planCache.size > 50) {
    const oldest = planCache.keys().next().value
    if (oldest) planCache.delete(oldest)
  }
  planCache.set(key, { result, timestamp: Date.now() })
}


/** Distinct camera setups a plan of this length has to bring. */
export function requiredShotSetups(beatCount: number): number {
  return Math.max(2, Math.ceil(beatCount / 3))
}

function countShotSetups(plans: BeatKeyframePlan[]): number {
  return new Set(
    plans.map(
      (plan) => `${plan.shotType.trim().toLowerCase()}|${plan.frozenMoment.trim().toLowerCase()}`
    )
  ).size
}

/**
 * Beats should share a look but not a camera setup.
 *
 * The gate is scaled to scene length because a flat `>= 2` passed a 15-beat
 * scene on one differing frame — which is how a user got fifteen frames of the
 * same vault. Setups collide only when shot and moment both match, and real
 * coverage gives every beat its own moment, so a third of the scene is a floor
 * no genuine plan comes near. An earlier gate on `frozenMoment` alone punished
 * the continuity the planner is now asked to produce; this one does not.
 */
function hasShotCoverageVariety(plans: BeatKeyframePlan[], beatCount: number): boolean {
  if (beatCount < 2) return true
  return countShotSetups(plans) >= requiredShotSetups(beatCount)
}

/**
 * Outcome of one planner pass, carrying why a rejected plan was rejected.
 *
 * Callers used to get a bare `null` and had nothing to log, so every reason a
 * plan could lose looked the same from the outside.
 */
type PlanAttempt = { ok: true; result: BeatSequencePlanResult } | { ok: false; reason: string }

/** Why a single plan is too thin to generate from, or null when it is fine. */
function planTextDefect(plan: BeatKeyframePlan): string | null {
  if (!plan.prompt || plan.prompt.trim().length < 20) return 'no usable prompt'
  if (!plan.frozenMoment || plan.frozenMoment.trim().length < 8) return 'no frozen moment'
  return null
}

/**
 * Shift to apply to the planner's claimed beat indices, 0 or -1.
 *
 * The prompt asks for 0-based indices and Gemini mostly complies, but a 1-based
 * response left beat 1 with no plan at all and pushed the last beat past the
 * end of the scene — a whole-scene defect out of an off-by-one. A response that
 * numbers anything from zero, or that reaches past the beat count, is taken at
 * its word.
 */
export function detectBeatIndexOffset(
  claimed: Array<number | undefined>,
  beatCount: number
): number {
  const values = claimed.filter((value): value is number => typeof value === 'number')
  if (values.length === 0) return 0
  if (values.some((value) => value < 1 || value > beatCount)) return 0
  return Math.max(...values) === beatCount ? -1 : 0
}

async function planWithGemini(request: BeatSequencePlanRequest): Promise<PlanAttempt> {
  const systemPrompt = buildPlannerSystemPrompt()
  const userPrompt = buildPlannerUserPrompt(request)

  const options: TextGenerationOptions = {
    systemInstruction: systemPrompt,
    temperature: 0.5,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
    thinkingLevel: 'low',
  }

  const result = await generateText(userPrompt, options)
  let cleanText = result.text.trim()
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  const parsed = JSON.parse(cleanText) as {
    reasoning?: string
    beats?: Array<{
      beatIndex?: number
      beatRole?: BeatRole
      shotType?: string
      frozenMoment?: string
      prompt?: string
      lighting?: string
      lensMm?: string
      screenDirection?: string
      continuityNote?: string
      allowTypography?: boolean
      durationSeconds?: number
      negativeAdditions?: string[]
    }>
  }

  if (!Array.isArray(parsed.beats) || parsed.beats.length === 0) {
    return { ok: false, reason: 'planner response carried no beats' }
  }

  const beatCount = request.beats.length
  const sceneType = detectSceneType(
    String(request.scene.heading ?? ''),
    String(request.scene.action ?? ''),
    request.sceneNumber,
    request.totalScenes
  )
  const offset = detectBeatIndexOffset(
    parsed.beats.map((b) => b.beatIndex),
    beatCount
  )

  // A response can be wrong about any one beat without being wrong about the
  // scene, so defects are collected per beat and the plan is judged on what
  // survives rather than discarded on the first flaw.
  const byIndex = new Map<number, BeatKeyframePlan>()
  const defects: string[] = []
  parsed.beats.forEach((b, i) => {
    const beatIndex = typeof b.beatIndex === 'number' ? b.beatIndex + offset : i
    if (beatIndex < 0 || beatIndex >= beatCount) {
      defects.push(`beat ${b.beatIndex ?? i} is outside the scene`)
      return
    }
    if (byIndex.has(beatIndex)) {
      defects.push(`beat ${beatIndex + 1} was planned twice`)
      return
    }
    const beat = request.beats[beatIndex]
    const beatRole =
      b.beatRole ??
      inferBeatRole(beat, beatIndex, beatCount, sceneType, request.filmContext?.title)
    const allowTypography =
      typeof b.allowTypography === 'boolean' ? b.allowTypography : roleAllowsTypography(beatRole)

    const plan: BeatKeyframePlan = {
      beatIndex,
      beatRole,
      shotType: b.shotType?.trim() || 'Medium shot',
      frozenMoment: b.frozenMoment?.trim() || beat?.actionDescription || `Beat ${beatIndex + 1}`,
      prompt: b.prompt?.trim() || '',
      allowTypography,
      durationSeconds: b.durationSeconds,
      negativeAdditions: b.negativeAdditions,
      ...(b.lighting?.trim() ? { lighting: b.lighting.trim() } : {}),
      ...(b.lensMm?.trim() ? { lensMm: b.lensMm.trim() } : {}),
      ...(b.screenDirection?.trim() ? { screenDirection: b.screenDirection.trim() } : {}),
      ...(b.continuityNote?.trim() ? { continuityNote: b.continuityNote.trim() } : {}),
    }

    // Judged on the raw action text: validating the composed prompt would pass
    // on the length of the style anchor alone.
    const defect = planTextDefect(plan)
    if (defect) {
      defects.push(`beat ${beatIndex + 1} has ${defect}`)
      return
    }
    byIndex.set(beatIndex, plan)
  })

  const usable = [...byIndex.values()]
  if (usable.length === 0) {
    return { ok: false, reason: `no beat survived validation (${defects.join('; ')})` }
  }
  if (!hasShotCoverageVariety(usable, beatCount)) {
    return {
      ok: false,
      reason:
        `only ${countShotSetups(usable)} distinct setup(s) across ${beatCount} beats, ` +
        `needs ${requiredShotSetups(beatCount)}`,
    }
  }

  // Beats the planner missed take the deterministic plan rather than sinking
  // the scene — the fallback already wraps its own prompts in the style anchor.
  let fallbackPlans: BeatKeyframePlan[] | null = null
  const filled: number[] = []
  const plans = request.beats.map((_, beatIndex) => {
    const planned = byIndex.get(beatIndex)
    if (planned) {
      return {
        ...planned,
        prompt: composeBeatStillPrompt({
          actionFraming: planned.prompt,
          lookbook: request.lookbook,
          sceneIndex: request.sceneNumber - 1,
          artStyleAnchor: request.artStyleAnchor,
          lighting: planned.lighting,
          lensMm: planned.lensMm,
          shotType: planned.shotType,
        }),
      }
    }
    filled.push(beatIndex + 1)
    return (fallbackPlans ??= buildFallbackBeatPlans(request))[beatIndex]
  })

  return {
    ok: true,
    result: {
      plans,
      usedAI: true,
      reasoning: parsed.reasoning,
      ...(filled.length > 0
        ? {
            fallbackReason:
              `beat${filled.length > 1 ? 's' : ''} ${filled.join(', ')} filled ` +
              `deterministically (${defects.join('; ')})`,
          }
        : {}),
    },
  }
}

export async function planBeatSequence(
  request: BeatSequencePlanRequest
): Promise<BeatSequencePlanResult> {
  const cacheKey = getBeatPlanCacheKey(request)
  const cached = getCachedPlan(cacheKey)
  if (cached) {
    console.log(`[BeatSequencePlanner] Cache hit (${request.beats.length} beats)`)
    return cached
  }

  let fallbackReason: string | undefined
  if (!request.forceFallback) {
    try {
      const attempt = await planWithGemini(request)
      if (attempt.ok) {
        setCachedPlan(cacheKey, attempt.result)
        console.log(
          `[BeatSequencePlanner] AI planned ${attempt.result.plans.length} distinct keyframes`
        )
        return attempt.result
      }
      fallbackReason = attempt.reason
      console.warn(`[BeatSequencePlanner] AI plan rejected, using fallback: ${attempt.reason}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      fallbackReason = msg
      console.warn(`[BeatSequencePlanner] Gemini failed, using fallback: ${msg}`)
    }
  }

  const fallbackPlans = buildFallbackBeatPlans(request)
  const result: BeatSequencePlanResult = {
    plans: fallbackPlans,
    usedAI: false,
    reasoning: 'Deterministic fallback from direction shots and scene description',
    ...(fallbackReason ? { fallbackReason } : {}),
  }
  setCachedPlan(cacheKey, result)
  return result
}

export { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
