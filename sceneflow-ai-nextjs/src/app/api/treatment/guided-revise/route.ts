import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import v8 from 'node:v8'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS } from '@/lib/credits/creditCosts'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type { GuidedReviseRequest, BlueprintChangePlan } from '@/lib/treatment/blueprintRevisionTypes'
import {
  buildPlannerPrompt,
  buildRewriterPrompt,
  buildBalanceMicroPassPrompt,
  inferPlanFromFocus,
  inferPlanFromRecommendations,
  inferPlanFromUserIntent,
  trimVariantForPrompt,
  trimRecommendationsForPrompt,
} from '@/lib/treatment/blueprintRevisionPrompts'
import {
  stripHeavyFieldsFromVariant,
  reattachPreservedAssets,
} from '@/lib/treatment/blueprintVariantSanitize'
import {
  buildFieldDiffs,
  mergeRevisionIntoVariant,
  detectMissingBalanceSections,
} from '@/lib/treatment/blueprintRevisionDiff'
import { resolveContentIntent } from '@/lib/content/contentIntent'
import { classifyAiError, upstreamStatusOf } from '@/lib/errors/aiErrorClassification'

export const runtime = 'nodejs'
export const maxDuration = 180

const CREDIT_COST = BLUEPRINT_CREDITS.BLUEPRINT_GUIDED_REVISE
const MAX_GEMINI_JSON_CHARS = 150_000
const MAX_BODY_BYTES = 3 * 1024 * 1024
/** With Fluid Compute one instance serves concurrent requests; cap at 1 to avoid heap stacking. */
const MAX_CONCURRENT_REVISIONS = 1
/** Skip the optional balance micro-pass when past this elapsed time so we finish inside maxDuration. */
const ROUTE_DEADLINE_MS = 120_000

let inFlightRevisions = 0

const v8HeapLimitMb = Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024)

// Identifies which build produced these logs (previews vs production)
console.log(
  `[Guided Revise] Module init (commit=${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'local'}, v8HeapLimit=${v8HeapLimitMb}MB, NODE_OPTIONS=${process.env.NODE_OPTIONS ? 'set' : 'unset'})`
)

function logHeap(label: string, extra?: Record<string, number>) {
  const { heapUsed, heapTotal, rss, external } = process.memoryUsage()
  const mb = (n: number) => Math.round(n / 1024 / 1024)
  const extras = extra
    ? ` ${Object.entries(extra)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')}`
    : ''
  console.log(
    `[Guided Revise][mem] ${label}: heapUsed=${mb(heapUsed)}MB heapTotal=${mb(heapTotal)}MB heapLimit=${v8HeapLimitMb}MB rss=${mb(rss)}MB external=${mb(external)}MB inFlight=${inFlightRevisions}${extras}`
  )
}

const MAX_PATCH_FIELD_LEN: Record<string, number> = {
  synopsis: 8000,
  content: 8000,
  logline: 600,
  setting: 2000,
  protagonist: 2000,
  antagonist: 2000,
  tone_description: 2000,
}

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

function capPatchSize(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch }
  for (const [key, max] of Object.entries(MAX_PATCH_FIELD_LEN)) {
    const v = out[key]
    if (typeof v === 'string' && v.length > max) {
      out[key] = `${v.slice(0, max)}…`
    }
  }
  if (Array.isArray(out.beats)) {
    out.beats = (out.beats as Array<Record<string, unknown>>).slice(0, 8)
  }
  if (Array.isArray(out.character_descriptions)) {
    out.character_descriptions = (out.character_descriptions as Array<Record<string, unknown>>).slice(
      0,
      8
    )
  }
  return out
}

async function runGeminiJson(
  label: string,
  prompt: string,
  maxOutputTokens: number
): Promise<Record<string, unknown> | null> {
  logHeap(`before ${label}`, { promptChars: prompt.length })
  // maxRetries 1 + 90s timeout: default 3 retries x 120s could retain in-flight
  // state for ~8 minutes, long past the 180s maxDuration, stacking memory on
  // the warm instance when users retry.
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    maxOutputTokens,
    thinkingBudget: 0,
    responseMimeType: 'application/json',
    timeoutMs: 90_000,
    maxRetries: 1,
  })
  let text = result?.text || '{}'
  logHeap(`after ${label}`, { responseChars: text.length })
  if (text.length > MAX_GEMINI_JSON_CHARS) {
    console.warn(
      `[Guided Revise] Model response too large (${text.length} chars), truncating to ${MAX_GEMINI_JSON_CHARS}`
    )
    text = text.slice(0, MAX_GEMINI_JSON_CHARS)
  }
  const parsed = safeParseJsonFromText(text)
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
}

/** Run rewriter as sequential section passes to cap peak heap per LLM call. */
async function runSequentialRewriter(
  variant: Record<string, unknown>,
  plan: BlueprintChangePlan,
  userIntent: string,
  selectedRecs: ReturnType<typeof trimRecommendationsForPrompt>,
  contentIntent: ReturnType<typeof resolveContentIntent>
): Promise<Record<string, unknown> | null> {
  const sections = [...new Set(plan.sectionsToUpdate)]
  if (sections.length <= 1) {
    const prompt = buildRewriterPrompt(
      variant,
      plan,
      userIntent,
      selectedRecs,
      contentIntent
    )
    return runGeminiJson('rewriter', prompt, 2048)
  }

  let mergedPatch: Record<string, unknown> = {}
  let narrativeReasoning: Record<string, unknown> | undefined

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i] as BlueprintFixSection
    const isLast = i === sections.length - 1
    const sectionPlan: BlueprintChangePlan = {
      ...plan,
      sectionsToUpdate: [section],
    }
    const prompt = buildRewriterPrompt(
      variant,
      sectionPlan,
      userIntent,
      selectedRecs,
      contentIntent,
      {
        partialPatch: mergedPatch,
        includeNarrativeReasoning: isLast,
      }
    )
    const sectionPatch = await runGeminiJson(
      `rewriter:${section}`,
      prompt,
      isLast ? 2048 : 1536
    )
    if (!sectionPatch) continue

    const { narrative_reasoning: nr, ...fieldPatch } = sectionPatch
    mergedPatch = { ...mergedPatch, ...fieldPatch }
    if (nr && typeof nr === 'object') {
      narrativeReasoning = nr as Record<string, unknown>
    }
  }

  if (narrativeReasoning) {
    mergedPatch.narrative_reasoning = narrativeReasoning
  }

  return Object.keys(mergedPatch).length > 0 ? mergedPatch : null
}

function resolveInitialPlan(
  focusScope: BlueprintFixSection | 'all' | undefined,
  intentText: string,
  selectedRecs: ReturnType<typeof trimRecommendationsForPrompt>
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

function shouldRunPlanner(
  focusScope: BlueprintFixSection | 'all' | undefined,
  selectedRecs: ReturnType<typeof trimRecommendationsForPrompt>,
  intentText: string
): boolean {
  if (inferPlanFromFocus(focusScope, '')) return false
  if (inferPlanFromRecommendations(selectedRecs, '')) return false
  if (intentText.trim() && inferPlanFromUserIntent(intentText)) return false
  return true
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()

  if (inFlightRevisions >= MAX_CONCURRENT_REVISIONS) {
    logHeap('rejected: concurrency cap')
    return NextResponse.json(
      {
        success: false,
        message:
          'A revision is already in progress — wait for it to finish before retrying.',
        code: 'too_many_revisions',
      },
      { status: 429 }
    )
  }

  inFlightRevisions++
  try {
    logHeap('request start')

    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await request.text()
    const bodyBytes = Buffer.byteLength(rawBody, 'utf8')
    logHeap('after body read', { bodyBytes })

    if (bodyBytes > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Blueprint payload is too large to revise. Remove embedded images from the blueprint and try again.',
          code: 'payload_too_large',
          bodyBytes,
        },
        { status: 413 }
      )
    }

    let body: GuidedReviseRequest
    try {
      body = JSON.parse(rawBody) as GuidedReviseRequest
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const {
      variant: incomingVariant,
      userIntent = '',
      selectedRecommendationIds = [],
      resonanceRecommendations = [],
      focusScope,
      contentIntent: bodyIntent,
    } = body

    if (v8HeapLimitMb < 2300 && !process.env.NODE_OPTIONS) {
      console.warn(
        `[Guided Revise] V8 heap limit is ${v8HeapLimitMb}MB without NODE_OPTIONS — OOM risk on warm instances`
      )
    }

    if (!incomingVariant || typeof incomingVariant !== 'object') {
      return NextResponse.json(
        { success: false, message: 'variant is required' },
        { status: 400 }
      )
    }

    const { variant: rawVariant, preservedCharacterAssets } =
      stripHeavyFieldsFromVariant(incomingVariant)
    logHeap('after strip')

    const contentIntent =
      bodyIntent ?? resolveContentIntent(String(rawVariant.genre || ''))

    const variant = trimVariantForPrompt(rawVariant)

    const selectedRecs = trimRecommendationsForPrompt(
      resonanceRecommendations.filter((r) =>
        selectedRecommendationIds.length > 0
          ? selectedRecommendationIds.includes(r.id)
          : true
      )
    )

    const intentText =
      userIntent.trim() ||
      selectedRecs.map((r) => r.text).join('\n') ||
      ''

    if (!intentText.trim() && selectedRecs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Provide revision direction or select recommendations' },
        { status: 400 }
      )
    }

    const hasCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient credits',
          creditsRequired: CREDIT_COST,
          creditsAvailable: breakdown?.total_credits ?? 0,
        },
        { status: 402 }
      )
    }

    let plan = resolveInitialPlan(focusScope, intentText, selectedRecs)

    if (shouldRunPlanner(focusScope, selectedRecs, intentText)) {
      const plannerPrompt = buildPlannerPrompt(
        variant,
        intentText,
        selectedRecs,
        focusScope,
        contentIntent
      )
      const planRaw = await runGeminiJson('planner', plannerPrompt, 1024)
      plan = normalizePlan(
        planRaw ?? { primaryGoal: intentText, sectionsToUpdate: ['story'] }
      )
    }

    if (plan.sectionsToUpdate.length === 0) {
      plan.sectionsToUpdate = selectedRecs[0]?.fixSection
        ? [selectedRecs[0].fixSection]
        : ['story']
    }

    logHeap('before rewriter', { sections: plan.sectionsToUpdate.length })

    let patch = await runSequentialRewriter(
      variant,
      plan,
      intentText,
      selectedRecs,
      contentIntent
    )

    if (!patch) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse revision response' },
        { status: 500 }
      )
    }

    let incompleteBalance = false
    const missing = detectMissingBalanceSections(plan.sectionsToUpdate, patch)
    if (missing.length > 0) {
      incompleteBalance = true
      const elapsedMs = Date.now() - startedAt
      if (elapsedMs > ROUTE_DEADLINE_MS) {
        console.warn(
          `[Guided Revise] Skipping balance micro-pass at ${elapsedMs}ms to stay inside maxDuration`
        )
      } else {
        const microPrompt = buildBalanceMicroPassPrompt(
          variant,
          plan,
          patch,
          missing,
          contentIntent
        )
        const microPatch = await runGeminiJson('micro-pass', microPrompt, 2048)
        if (microPatch) {
          patch = { ...patch, ...microPatch }
        }
      }
    }

    patch = capPatchSize(patch)

    const narrativeReasoning = patch.narrative_reasoning as
      | Record<string, unknown>
      | undefined
    const { narrative_reasoning: _nr, ...fieldPatch } = patch

    const merged = mergeRevisionIntoVariant(rawVariant, fieldPatch)
    const revisedVariant = reattachPreservedAssets(merged, preservedCharacterAssets)
    const diff = buildFieldDiffs(variant, trimVariantForPrompt(revisedVariant))
    logHeap('before response', { elapsedMs: Date.now() - startedAt })

    const changePlan: BlueprintChangePlan = {
      ...plan,
      coherenceActions: [
        ...plan.coherenceActions,
        ...(incompleteBalance
          ? ['Ran additional pass to align dependent sections']
          : []),
      ],
    }

    await CreditService.charge(userId, CREDIT_COST, 'ai_usage', null, {
      operation: 'blueprint_guided_revise',
      sections: plan.sectionsToUpdate.join(','),
    })

    return NextResponse.json({
      success: true,
      revisedVariant,
      changePlan,
      diff,
      narrativeReasoning: narrativeReasoning || undefined,
      incompleteBalance,
      creditsUsed: CREDIT_COST,
    })
  } catch (error) {
    const classified = classifyAiError(error)
    const upstreamStatus = upstreamStatusOf(error)
    console.error(
      `[Guided Revise] Error (code=${classified.code}, status=${classified.status}${
        upstreamStatus ? `, upstream=${upstreamStatus}` : ''
      }, name=${error instanceof Error ? error.name : typeof error}):`,
      classified.details
    )
    return NextResponse.json(
      {
        success: false,
        message:
          classified.code === 'out_of_memory'
            ? 'Revision ran out of memory. Try a narrower focus scope or fewer recommendations.'
            : classified.message,
        code: classified.code,
        details: classified.details,
        ...(upstreamStatus ? { upstreamStatus } : {}),
      },
      { status: classified.status }
    )
  } finally {
    inFlightRevisions = Math.max(0, inFlightRevisions - 1)
  }
}
