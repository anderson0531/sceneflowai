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
  ensureSceneMusicFromDirection,
  formatBeatPlannerReferenceCatalog,
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  inferBeatRole,
  type BeatKeyframePlan,
  type BeatRole,
  type BeatSequencePlanRequest,
  type BeatSequenceReferenceCatalog,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import { generateDirectionHash } from '@/lib/utils/contentHash'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export type {
  BeatRole,
  BeatKeyframePlan,
  BeatSequencePlanRequest,
  BeatSequenceReferenceCatalog,
  FilmContext,
}
export {
  inferBeatRole,
  buildFallbackBeatPlans,
  applyBeatKeyframePlansToScene,
  ensureSceneMusicFromDirection,
  formatBeatPlannerReferenceCatalog,
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
}

export interface BeatSequencePlanResult {
  plans: BeatKeyframePlan[]
  usedAI: boolean
  reasoning?: string
}

interface PlanCacheEntry {
  result: BeatSequencePlanResult
  timestamp: number
}

const planCache = new Map<string, PlanCacheEntry>()
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000

export function getBeatPlanCacheKey(
  scene: Record<string, unknown>,
  beatCount: number,
  projectId?: string,
  catalog?: BeatSequenceReferenceCatalog
): string {
  const directionHash = generateDirectionHash(scene)
  const heading = String(scene.heading ?? '').slice(0, 80)
  const actionHash = String(scene.action ?? scene.visualDescription ?? '').slice(0, 120)
  const catalogKey = [
    ...(catalog?.characterNames ?? []),
    ...(catalog?.propNames ?? []),
    ...(catalog?.locationNames ?? []),
  ].join(',')
  return [projectId ?? 'default', directionHash, beatCount, heading, actionHash, catalogKey].join('|')
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

function roleAllowsTypography(role: BeatRole): boolean {
  return role === 'title_reveal' || role === 'credit'
}

function validatePlans(plans: BeatKeyframePlan[], beatCount: number): BeatKeyframePlan[] | null {
  if (plans.length !== beatCount) return null
  const moments = plans.map((p) => p.frozenMoment.trim().toLowerCase())
  const uniqueMoments = new Set(moments)
  if (uniqueMoments.size < Math.min(beatCount, 2)) return null
  for (const plan of plans) {
    if (!plan.prompt || plan.prompt.trim().length < 20) return null
    if (!plan.frozenMoment || plan.frozenMoment.trim().length < 8) return null
  }
  return plans
}

async function planWithGemini(
  request: BeatSequencePlanRequest
): Promise<BeatSequencePlanResult | null> {
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
      allowTypography?: boolean
      durationSeconds?: number
      negativeAdditions?: string[]
    }>
  }

  if (!Array.isArray(parsed.beats) || parsed.beats.length === 0) return null

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
    }
  })

  const validated = validatePlans(plans, request.beats.length)
  if (!validated) return null

  return { plans: validated, usedAI: true, reasoning: parsed.reasoning }
}

export async function planBeatSequence(
  request: BeatSequencePlanRequest
): Promise<BeatSequencePlanResult> {
  const cacheKey = getBeatPlanCacheKey(
    request.scene,
    request.beats.length,
    request.projectId,
    request.referenceCatalog
  )
  const cached = getCachedPlan(cacheKey)
  if (cached) {
    console.log(`[BeatSequencePlanner] Cache hit (${request.beats.length} beats)`)
    return cached
  }

  if (!request.forceFallback) {
    try {
      const aiResult = await planWithGemini(request)
      if (aiResult) {
        setCachedPlan(cacheKey, aiResult)
        console.log(`[BeatSequencePlanner] AI planned ${aiResult.plans.length} distinct keyframes`)
        return aiResult
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[BeatSequencePlanner] Gemini failed, using fallback: ${msg}`)
    }
  }

  const fallbackPlans = buildFallbackBeatPlans(request)
  const result: BeatSequencePlanResult = {
    plans: fallbackPlans,
    usedAI: false,
    reasoning: 'Deterministic fallback from direction shots and scene description',
  }
  setCachedPlan(cacheKey, result)
  return result
}

export { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
