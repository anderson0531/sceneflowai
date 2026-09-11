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
   * Why the AI plan was not used, when it was attempted and lost.
   *
   * The fallback produces a whole scene of plausible-looking prompts, so
   * without this a rejected plan is indistinguishable from a planned one —
   * which is how a scene of near-identical frames reached a user with nothing
   * in the logs but `AI: false`.
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


/**
 * Beats should share a look but not a camera setup. Reject only the degenerate
 * case where every beat is the same setup on the same moment — an earlier
 * distinctness gate on `frozenMoment` alone punished the continuity the planner
 * is now asked to produce.
 */
function hasShotCoverageVariety(plans: BeatKeyframePlan[]): boolean {
  if (plans.length < 2) return true
  const setups = new Set(
    plans.map(
      (plan) =>
        `${plan.shotType.trim().toLowerCase()}|${plan.frozenMoment.trim().toLowerCase()}`
    )
  )
  return setups.size >= 2
}

/**
 * Outcome of one planner pass, carrying why a rejected plan was rejected.
 *
 * Callers used to get a bare `null` and had nothing to log, so every reason a
 * plan could lose looked the same from the outside.
 */
type PlanAttempt = { ok: true; result: BeatSequencePlanResult } | { ok: false; reason: string }

function validatePlans(
  plans: BeatKeyframePlan[],
  beatCount: number
): { ok: true } | { ok: false; reason: string } {
  if (plans.length !== beatCount) {
    return { ok: false, reason: `planned ${plans.length} beats for a ${beatCount}-beat scene` }
  }
  if (!hasShotCoverageVariety(plans)) {
    return { ok: false, reason: 'every beat repeated the same shot on the same moment' }
  }
  for (const plan of plans) {
    if (!plan.prompt || plan.prompt.trim().length < 20) {
      return { ok: false, reason: `beat ${plan.beatIndex + 1} came back without a usable prompt` }
    }
    if (!plan.frozenMoment || plan.frozenMoment.trim().length < 8) {
      return { ok: false, reason: `beat ${plan.beatIndex + 1} came back without a frozen moment` }
    }
  }
  return { ok: true }
}

async function planWithGemini(request: BeatSequencePlanRequest): Promise<PlanAttempt> {
  const systemPrompt = buildPlannerSystemPrompt()
  const userPrompt = buildPlannerUserPrompt(request)

  const options: TextGenerationOptions = {
    systemInstruction: systemPrompt,
    temperature: 0.5,
    maxOutputTokens: 4096,
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

  const plans: BeatKeyframePlan[] = parsed.beats.map((b, i) => {
    const beatIndex = typeof b.beatIndex === 'number' ? b.beatIndex : i
    const beat = request.beats[beatIndex] ?? request.beats[i]
    const beatRole =
      b.beatRole ??
      inferBeatRole(
        beat,
        beatIndex,
        request.beats.length,
        detectSceneType(
          String(request.scene.heading ?? ''),
          String(request.scene.action ?? ''),
          request.sceneNumber,
          request.totalScenes
        ),
        request.filmContext?.title
      )
    const allowTypography =
      typeof b.allowTypography === 'boolean' ? b.allowTypography : roleAllowsTypography(beatRole)

    return {
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
  })

  // Validate the raw action text, then wrap it in the style anchor — validating
  // the composed prompt would pass on anchor length alone.
  const validated = validatePlans(plans, request.beats.length)
  if (!validated.ok) return validated

  const anchored = plans.map((plan) => ({
    ...plan,
    prompt: composeBeatStillPrompt({
      actionFraming: plan.prompt,
      lookbook: request.lookbook,
      sceneIndex: request.sceneNumber - 1,
      artStyleAnchor: request.artStyleAnchor,
      lighting: plan.lighting,
      lensMm: plan.lensMm,
    }),
  }))

  return { ok: true, result: { plans: anchored, usedAI: true, reasoning: parsed.reasoning } }
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
