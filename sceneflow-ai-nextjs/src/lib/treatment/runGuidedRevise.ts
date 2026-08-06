/**
 * Core guided-revise orchestration — shared by sync route, Inngest steps, and tests.
 */

import { safeParseJsonFromText } from '@/lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import type { BlueprintAudienceRecommendation } from '@/lib/types/audienceResonance'
import type { ContentIntent } from '@/lib/content/contentIntent'
import { resolveContentIntent } from '@/lib/content/contentIntent'
import type { BlueprintChangePlan, FieldDiff } from './blueprintRevisionTypes'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import { deriveRuntimeFieldsFromBeats } from './duration'
import {
  buildPlannerPrompt,
  buildRewriterPrompt,
  inferPlanFromFocus,
  inferPlanFromRecommendations,
  inferPlanFromUserIntent,
  trimVariantForPrompt,
  trimRecommendationsForPrompt,
} from './blueprintRevisionPrompts'
import {
  stripHeavyFieldsFromVariant,
  type PreservedCharacterAssets,
} from './blueprintVariantSanitize'
import {
  buildFieldDiffs,
  capPatchSize,
  mergeRevisionIntoVariant,
} from './blueprintRevisionDiff'

export const MAX_GEMINI_JSON_CHARS = 150_000

export type GuidedRevisePayload = {
  rawVariant: Record<string, unknown>
  preservedCharacterAssets: PreservedCharacterAssets
  variant: Record<string, unknown>
  intentText: string
  /**
   * English rendering of `intentText`, used only for the English keyword
   * matching in section inference and request validation. Absent when the
   * creator already writes in English.
   */
  intentTextForRouting?: string
  selectedRecs: BlueprintAudienceRecommendation[]
  focusScope?: BlueprintFixSection | 'all'
  contentIntent: ContentIntent
  /** Language the creator authors in; each rewrite pass must answer in it. */
  storyLocale?: string
}

export type GuidedReviseResult = {
  patch: Record<string, unknown>
  diff: FieldDiff[]
  changePlan: BlueprintChangePlan
  narrativeReasoning?: Record<string, unknown>
  incompleteBalance: boolean
}

export type HeapLogger = (label: string, extra?: Record<string, number>) => void

const noopHeap: HeapLogger = () => {}

function normalizePlan(raw: Record<string, unknown>): BlueprintChangePlan {
  const sections = (raw.sectionsToUpdate as string[]) || ['story']
  const valid: BlueprintFixSection[] = ['core', 'story', 'tone', 'beats', 'characters']
  return {
    primaryGoal: String(raw.primaryGoal || 'Improve blueprint coherence'),
    sectionsToUpdate: sections.filter((s): s is BlueprintFixSection =>
      valid.includes(s as BlueprintFixSection)
    ) as BlueprintFixSection[],
    crossSectionDependencies: Array.isArray(raw.crossSectionDependencies)
      ? raw.crossSectionDependencies.map(String)
      : [],
    preserveConstraints: Array.isArray(raw.preserveConstraints)
      ? raw.preserveConstraints.map(String)
      : [],
    coherenceActions: Array.isArray(raw.coherenceActions)
      ? raw.coherenceActions.map(String)
      : [],
  }
}

export function resolveInitialPlan(
  focusScope: BlueprintFixSection | 'all' | undefined,
  intentText: string,
  selectedRecs: BlueprintAudienceRecommendation[]
): BlueprintChangePlan {
  return (
    inferPlanFromFocus(focusScope, intentText) ??
    inferPlanFromRecommendations(selectedRecs, intentText) ??
    inferPlanFromUserIntent(intentText) ??
    normalizePlan({
      primaryGoal: intentText,
      sectionsToUpdate: ['story'],
    })
  )
}

export function shouldRunPlanner(
  focusScope: BlueprintFixSection | 'all' | undefined,
  selectedRecs: BlueprintAudienceRecommendation[],
  intentText: string
): boolean {
  if (inferPlanFromFocus(focusScope, '')) return false
  if (inferPlanFromRecommendations(selectedRecs, '')) return false
  if (intentText.trim() && inferPlanFromUserIntent(intentText)) return false
  return true
}

/** Pick Gemini model for a rewrite step. Pro for full-balance multi-section jobs. */
export function modelForRewriteStep(
  sectionCount: number,
  focusScope?: BlueprintFixSection | 'all'
): string {
  const isFullBalance =
    !focusScope || focusScope === 'all' || sectionCount >= 3
  return isFullBalance ? getGeminiTextModel('pro') : getGeminiTextModel('flash')
}

export const REWRITE_TOKENS_BASE = 3072
export const REWRITE_TOKENS_WITH_BEATS = 8192
export const REWRITE_TOKENS_REASONING = 1024

/**
 * Sections whose rewrite emits the beats array. Mirrors buildRewriterPrompt,
 * which adds `beats` to the allowed fields for story and characters too.
 */
const BEAT_EMITTING_SECTIONS: BlueprintFixSection[] = ['beats', 'story', 'characters']

/**
 * Output budget for one rewrite pass. A beats pass has to emit every beat with
 * its own synopsis, so the former flat 2048 was cut off mid-beat and the JSON
 * repair salvaged only the first title.
 */
export function tokensForRewriteStep(
  sections: BlueprintFixSection[],
  isLast: boolean
): number {
  const emitsBeats = sections.some((s) => BEAT_EMITTING_SECTIONS.includes(s))
  const base = emitsBeats ? REWRITE_TOKENS_WITH_BEATS : REWRITE_TOKENS_BASE
  return base + (isLast ? REWRITE_TOKENS_REASONING : 0)
}

/** A model response was cut off, so the patch is missing fields the user asked for. */
export class GuidedReviseTruncatedError extends Error {
  readonly finishReason: string
  constructor(label: string, finishReason: string) {
    super(
      `The ${label} pass was cut off by the model (${finishReason}), so the revision is incomplete. Try a narrower focus, or a shorter runtime if you increased it.`
    )
    this.name = 'GuidedReviseTruncatedError'
    this.finishReason = finishReason
  }
}

export type GeminiJsonStepResult = {
  data: Record<string, unknown> | null
  /** Set when the model stopped for any reason other than STOP. */
  truncatedBy?: string
}

export async function runGeminiJsonStep(
  label: string,
  prompt: string,
  maxOutputTokens: number,
  model: string,
  logHeap: HeapLogger = noopHeap
): Promise<GeminiJsonStepResult> {
  logHeap(`before ${label}`, { promptChars: prompt.length })
  const isGemini3 = model.includes('gemini-3')
  const result = await generateText(prompt, {
    model,
    temperature: 0.3,
    maxOutputTokens,
    ...(isGemini3
      ? { thinkingLevel: 'minimal' as const }
      : { thinkingBudget: 0 }),
    responseMimeType: 'application/json',
    timeoutMs: 90_000,
    maxRetries: 1,
  })
  let text = result?.text || '{}'
  logHeap(`after ${label}`, { responseChars: text.length })
  const truncatedBy =
    result?.finishReason && result.finishReason !== 'STOP' ? result.finishReason : undefined
  if (truncatedBy) {
    console.warn(
      `[Guided Revise] ${label} finished with ${truncatedBy} (${text.length} chars, budget ${maxOutputTokens}) — patch is incomplete`
    )
  }
  if (text.length > MAX_GEMINI_JSON_CHARS) {
    text = text.slice(0, MAX_GEMINI_JSON_CHARS)
  }
  const parsed = safeParseJsonFromText(text)
  return {
    data: parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null,
    truncatedBy,
  }
}

export async function runPlannerStep(
  payload: GuidedRevisePayload,
  logHeap: HeapLogger = noopHeap
): Promise<BlueprintChangePlan> {
  // Section inference matches English keywords, so it reads the English copy of
  // the direction while every prompt below keeps the creator's own words.
  const routingText = payload.intentTextForRouting ?? payload.intentText

  let plan = resolveInitialPlan(
    payload.focusScope,
    routingText,
    payload.selectedRecs
  )

  if (shouldRunPlanner(payload.focusScope, payload.selectedRecs, routingText)) {
    const plannerPrompt = buildPlannerPrompt(
      payload.variant,
      payload.intentText,
      payload.selectedRecs,
      payload.focusScope,
      payload.contentIntent
    )
    // The plan is small and has a usable fallback, so truncation here is tolerated.
    const { data: planRaw } = await runGeminiJsonStep(
      'planner',
      plannerPrompt,
      1024,
      getGeminiTextModel('flash'),
      logHeap
    )
    plan = normalizePlan(
      planRaw ?? { primaryGoal: payload.intentText, sectionsToUpdate: ['story'] }
    )
  }

  if (plan.sectionsToUpdate.length === 0) {
    plan.sectionsToUpdate = payload.selectedRecs[0]?.fixSection
      ? [payload.selectedRecs[0].fixSection]
      : ['story']
  }

  return plan
}

export async function runSectionRewriteStep(
  payload: GuidedRevisePayload,
  plan: BlueprintChangePlan,
  section: BlueprintFixSection,
  partialPatch: Record<string, unknown>,
  isLast: boolean,
  logHeap: HeapLogger = noopHeap
): Promise<Record<string, unknown>> {
  const sectionPlan: BlueprintChangePlan = {
    ...plan,
    sectionsToUpdate: [section],
  }
  const model = modelForRewriteStep(plan.sectionsToUpdate.length, payload.focusScope)
  const prompt = buildRewriterPrompt(
    payload.variant,
    sectionPlan,
    payload.intentText,
    payload.selectedRecs,
    payload.contentIntent,
    {
      partialPatch,
      includeNarrativeReasoning: isLast,
      storyLocale: payload.storyLocale,
    }
  )
  const { data: sectionPatch, truncatedBy } = await runGeminiJsonStep(
    `rewriter:${section}`,
    prompt,
    tokensForRewriteStep([section], isLast),
    model,
    logHeap
  )
  if (truncatedBy) {
    throw new GuidedReviseTruncatedError(section, truncatedBy)
  }
  return sectionPatch ?? {}
}

export async function runAllSectionRewrites(
  payload: GuidedRevisePayload,
  plan: BlueprintChangePlan,
  logHeap: HeapLogger = noopHeap
): Promise<Record<string, unknown>> {
  const sections = [...new Set(plan.sectionsToUpdate)]
  if (sections.length <= 1) {
    const model = modelForRewriteStep(1, payload.focusScope)
    const prompt = buildRewriterPrompt(
      payload.variant,
      plan,
      payload.intentText,
      payload.selectedRecs,
      payload.contentIntent,
      { storyLocale: payload.storyLocale }
    )
    const { data: patch, truncatedBy } = await runGeminiJsonStep(
      'rewriter',
      prompt,
      tokensForRewriteStep(sections, true),
      model,
      logHeap
    )
    if (truncatedBy) {
      throw new GuidedReviseTruncatedError(sections[0] ?? 'revision', truncatedBy)
    }
    return patch ?? {}
  }

  let mergedPatch: Record<string, unknown> = {}
  let narrativeReasoning: Record<string, unknown> | undefined

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i] as BlueprintFixSection
    const isLast = i === sections.length - 1
    const sectionPatch = await runSectionRewriteStep(
      payload,
      plan,
      section,
      mergedPatch,
      isLast,
      logHeap
    )
    const { narrative_reasoning: nr, ...fieldPatch } = sectionPatch
    mergedPatch = { ...mergedPatch, ...fieldPatch }
    if (nr && typeof nr === 'object') {
      narrativeReasoning = nr as Record<string, unknown>
    }
  }

  if (narrativeReasoning) {
    mergedPatch.narrative_reasoning = narrativeReasoning
  }

  return mergedPatch
}

export function finalizeGuidedRevise(
  payload: GuidedRevisePayload,
  plan: BlueprintChangePlan,
  patch: Record<string, unknown>,
  options: { incompleteBalance?: boolean } = {}
): GuidedReviseResult {
  const capped = capPatchSize(patch)
  const narrativeReasoning = capped.narrative_reasoning as
    | Record<string, unknown>
    | undefined
  const { narrative_reasoning: _nr, ...fieldPatch } = capped

  // Runtime is derived, not authored: when beats change, restate every runtime
  // field so the Format chip and the beat sheet cannot disagree.
  const derivedRuntime = deriveRuntimeFieldsFromBeats(fieldPatch.beats)
  if (derivedRuntime) {
    Object.assign(fieldPatch, derivedRuntime)
  }

  const merged = mergeRevisionIntoVariant(payload.rawVariant, fieldPatch)
  const diff = buildFieldDiffs(
    payload.variant,
    trimVariantForPrompt(merged)
  )

  const changePlan: BlueprintChangePlan = {
    ...plan,
    coherenceActions: [
      ...plan.coherenceActions,
      ...(options.incompleteBalance
        ? ['Ran additional pass to align dependent sections']
        : []),
    ],
  }

  return {
    patch: fieldPatch,
    diff,
    changePlan,
    narrativeReasoning: narrativeReasoning || undefined,
    incompleteBalance: options.incompleteBalance ?? false,
  }
}

/** Build payload from request body fields (after strip). */
export function buildGuidedRevisePayload(input: {
  incomingVariant: Record<string, unknown>
  userIntent?: string
  selectedRecommendationIds?: string[]
  resonanceRecommendations?: BlueprintAudienceRecommendation[]
  focusScope?: BlueprintFixSection | 'all'
  contentIntent?: ContentIntent
  storyLocale?: string
  intentTextForRouting?: string
}): GuidedRevisePayload {
  const { variant: rawVariant, preservedCharacterAssets } =
    stripHeavyFieldsFromVariant(input.incomingVariant)

  const contentIntent =
    input.contentIntent ?? resolveContentIntent(String(rawVariant.genre || ''))

  const selectedRecs = trimRecommendationsForPrompt(
    (input.resonanceRecommendations ?? []).filter((r) =>
      (input.selectedRecommendationIds ?? []).length > 0
        ? (input.selectedRecommendationIds ?? []).includes(r.id)
        : true
    )
  )

  const intentText =
    (input.userIntent ?? '').trim() ||
    selectedRecs.map((r) => r.text).join('\n') ||
    ''

  return {
    rawVariant,
    preservedCharacterAssets,
    variant: trimVariantForPrompt(rawVariant),
    intentText,
    intentTextForRouting: input.intentTextForRouting,
    selectedRecs,
    focusScope: input.focusScope,
    contentIntent,
    storyLocale: input.storyLocale,
  }
}

/** Rehydrate payload from generation_jobs.payload (Inngest steps). */
export function payloadFromJobRecord(
  stored: Record<string, unknown>
): GuidedRevisePayload {
  const rawVariant = stored.rawVariant as Record<string, unknown>
  const contentIntent = stored.contentIntent as ContentIntent
  const selectedRecs = (stored.resonanceRecommendations ??
    []) as BlueprintAudienceRecommendation[]
  const intentText =
    String(stored.userIntent ?? '').trim() ||
    selectedRecs.map((r) => r.text).join('\n') ||
    ''

  return {
    rawVariant,
    preservedCharacterAssets: (stored.preservedCharacterAssets ??
      {}) as PreservedCharacterAssets,
    variant: trimVariantForPrompt(rawVariant),
    intentText,
    intentTextForRouting: (stored.intentTextForRouting as string | undefined) || undefined,
    selectedRecs,
    focusScope: stored.focusScope as BlueprintFixSection | 'all' | undefined,
    contentIntent,
    storyLocale: stored.storyLocale as string | undefined,
  }
}

export { stripHeavyFieldsFromVariant, reattachPreservedAssets } from './blueprintVariantSanitize'
