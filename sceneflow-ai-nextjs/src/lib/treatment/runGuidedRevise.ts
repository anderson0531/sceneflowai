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
  selectedRecs: BlueprintAudienceRecommendation[]
  focusScope?: BlueprintFixSection | 'all'
  contentIntent: ContentIntent
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

export async function runGeminiJsonStep(
  label: string,
  prompt: string,
  maxOutputTokens: number,
  model: string,
  logHeap: HeapLogger = noopHeap
): Promise<Record<string, unknown> | null> {
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
  if (text.length > MAX_GEMINI_JSON_CHARS) {
    text = text.slice(0, MAX_GEMINI_JSON_CHARS)
  }
  const parsed = safeParseJsonFromText(text)
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
}

export async function runPlannerStep(
  payload: GuidedRevisePayload,
  logHeap: HeapLogger = noopHeap
): Promise<BlueprintChangePlan> {
  let plan = resolveInitialPlan(
    payload.focusScope,
    payload.intentText,
    payload.selectedRecs
  )

  if (shouldRunPlanner(payload.focusScope, payload.selectedRecs, payload.intentText)) {
    const plannerPrompt = buildPlannerPrompt(
      payload.variant,
      payload.intentText,
      payload.selectedRecs,
      payload.focusScope,
      payload.contentIntent
    )
    const planRaw = await runGeminiJsonStep(
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
    }
  )
  const sectionPatch = await runGeminiJsonStep(
    `rewriter:${section}`,
    prompt,
    isLast ? 2048 : 1536,
    model,
    logHeap
  )
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
      payload.contentIntent
    )
    const patch = await runGeminiJsonStep('rewriter', prompt, 2048, model, logHeap)
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
    selectedRecs,
    focusScope: input.focusScope,
    contentIntent,
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
    selectedRecs,
    focusScope: stored.focusScope as BlueprintFixSection | 'all' | undefined,
    contentIntent,
  }
}

export { stripHeavyFieldsFromVariant, reattachPreservedAssets } from './blueprintVariantSanitize'
