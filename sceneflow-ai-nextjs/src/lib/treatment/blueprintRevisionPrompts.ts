import type { BlueprintAudienceRecommendation } from '@/lib/types/audienceResonance'
import type { BlueprintChangePlan, BlueprintFixSection } from './blueprintRevisionTypes'
import { SECTION_FIELDS } from './blueprintRevisionTypes'
import { strictJsonPromptSuffix } from '@/lib/safeJson'
import {
  type ContentIntent,
  getIntentCouplingRules,
  getIntentRevisionGuardrail,
  resolveContentIntent,
} from '@/lib/content/contentIntent'

const MAX_SYNOPSIS = 1200
const MAX_BEAT_SYNOPSIS = 120
const MAX_CHAR_DESC = 200
const MAX_REC_TEXT = 220
const MAX_RECS_IN_PROMPT = 12

export const CROSS_SECTION_COUPLING_RULES = `
MANDATORY CROSS-SECTION BALANCE (you MUST reconcile dependent sections when applying changes):
- character_descriptions (roles, relationships, arcs) → also update synopsis, protagonist, antagonist, and affected beats
- logline / genre / stakes changes → also update synopsis, beats pacing, and tone alignment
- beats structure changes → also update synopsis and total duration coherence
- tone / themes changes → also update visual_style, mood_references, and beat emotional tone
Never change one narrative layer in isolation when the user intent affects story logic.
`

export function getCouplingRulesForIntent(contentIntent?: ContentIntent): string {
  return getIntentCouplingRules(contentIntent ?? 'fiction')
}

/** Compact JSON for prompts (avoids pretty-print memory spikes). */
export function compactJson(value: unknown): string {
  return JSON.stringify(value)
}

function truncateStr(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.length <= max ? value : `${value.slice(0, max)}…`
}

export function trimVariantForPrompt(variant: Record<string, unknown>): Record<string, unknown> {
  const beats = Array.isArray(variant.beats)
    ? (variant.beats as Array<Record<string, unknown>>).slice(0, 8).map((b, i) => ({
        title: b.title || `Beat ${i + 1}`,
        intent: truncateStr(b.intent, 80),
        minutes: b.minutes || 0,
        synopsis: truncateStr(b.synopsis, MAX_BEAT_SYNOPSIS),
      }))
    : variant.beats

  const characters = Array.isArray(variant.character_descriptions)
    ? (variant.character_descriptions as Array<Record<string, unknown>>)
        .slice(0, 6)
        .map((c) => ({
          name: c.name,
          role: c.role,
          description: truncateStr(c.description, MAX_CHAR_DESC),
          externalGoal: truncateStr(c.externalGoal, 80),
          internalNeed: truncateStr(c.internalNeed, 80),
          fatalFlaw: truncateStr(c.fatalFlaw, 80),
        }))
    : variant.character_descriptions

  return {
    title: truncateStr(variant.title, 200),
    logline: truncateStr(variant.logline, 400),
    genre: variant.genre,
    format_length: variant.format_length,
    target_audience: truncateStr(variant.target_audience, 200),
    synopsis: truncateStr(variant.synopsis || variant.content, MAX_SYNOPSIS),
    setting: truncateStr(variant.setting, 300),
    protagonist: truncateStr(variant.protagonist, 300),
    antagonist: truncateStr(variant.antagonist, 300),
    tone_description: truncateStr(variant.tone_description || variant.tone, 300),
    visual_style: truncateStr(variant.visual_style, 300),
    themes: variant.themes,
    mood_references: Array.isArray(variant.mood_references)
      ? (variant.mood_references as string[]).slice(0, 6)
      : variant.mood_references,
    beats,
    character_descriptions: characters,
    total_duration_seconds: variant.total_duration_seconds,
    estimatedDurationMinutes: variant.estimatedDurationMinutes,
  }
}

export function trimRecommendationsForPrompt(
  recs: BlueprintAudienceRecommendation[]
): BlueprintAudienceRecommendation[] {
  return recs.slice(0, MAX_RECS_IN_PROMPT).map((r) => ({
    ...r,
    text: truncateStr(r.text, MAX_REC_TEXT),
    title: r.title ? truncateStr(r.title, 120) : r.title,
  }))
}

export function buildRecommendationIntentBlock(
  recs: BlueprintAudienceRecommendation[]
): string {
  const trimmed = trimRecommendationsForPrompt(recs)
  if (!trimmed.length) return ''
  return trimmed
    .map((r) => {
      const impact =
        r.impactSections?.length && r.impactSections.length > 0
          ? ` [also reconcile: ${r.impactSections.join(', ')}]`
          : ''
      return `- ${r.title || 'Fix'} (${r.fixSection}${impact}, −${r.pointsDeducted} pts): ${r.text}`
    })
    .join('\n')
}

function pickVariantFields(
  variant: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    if (variant[field] !== undefined) out[field] = variant[field]
  }
  return out
}

/** Skip planner LLM call when user scoped a single section (saves memory + latency). */
export function inferPlanFromFocus(
  focusScope: BlueprintFixSection | 'all' | undefined,
  intentText: string
): BlueprintChangePlan | null {
  if (!focusScope || focusScope === 'all') return null

  const sections = new Set<BlueprintFixSection>([focusScope])
  if (focusScope === 'characters') {
    sections.add('story')
    sections.add('beats')
  } else if (focusScope === 'story') {
    sections.add('beats')
    if (intentText.toLowerCase().includes('character')) sections.add('characters')
  } else if (focusScope === 'beats') {
    sections.add('story')
  } else if (focusScope === 'core') {
    sections.add('story')
  } else if (focusScope === 'tone') {
    sections.add('story')
  }

  return {
    primaryGoal: truncateStr(intentText, 300) || 'Apply focused blueprint revision',
    sectionsToUpdate: [...sections],
    crossSectionDependencies: [],
    preserveConstraints: ['Preserve title unless user requests a rename'],
    coherenceActions: [`Reconcile ${[...sections].join(', ')} for coherence`],
  }
}

export function buildPlannerPrompt(
  variant: Record<string, unknown>,
  userIntent: string,
  recs: BlueprintAudienceRecommendation[],
  focusScope?: BlueprintFixSection | 'all',
  contentIntent?: ContentIntent
): string {
  const intent = contentIntent ?? resolveContentIntent(String(variant.genre || ''))
  const trimmed = trimVariantForPrompt(variant)
  const recBlock = buildRecommendationIntentBlock(recs)
  const couplingRules = getCouplingRulesForIntent(intent)
  const intentGuard = getIntentRevisionGuardrail(intent)

  return `You are a ${intent === 'fiction' ? 'film development editor' : 'content development editor'} planning a BALANCED blueprint revision.

The user provides DIRECTION only — your job is to plan which blueprint sections must change together so the content stays coherent.

${intentGuard}

CURRENT BLUEPRINT (summary):
${compactJson(trimmed)}

USER DIRECTION:
${truncateStr(userIntent, 800) || '(See audience resonance recommendations below)'}

${recBlock ? `AUDIENCE RESONANCE RECOMMENDATIONS TO ADDRESS:\n${recBlock}\n` : ''}
${focusScope && focusScope !== 'all' ? `USER FOCUS SCOPE: ${focusScope} (still apply cross-section coupling where needed)\n` : ''}

${couplingRules}

Return ONLY valid JSON:
{
  "primaryGoal": "<one sentence>",
  "sectionsToUpdate": ["core"|"story"|"tone"|"beats"|"characters"],
  "crossSectionDependencies": ["<why section A requires updating section B>"],
  "preserveConstraints": ["<what must NOT change unless user asked>"],
  "coherenceActions": ["<concrete balancing actions you will take in the rewrite>"]
}
${strictJsonPromptSuffix}`
}

export function buildRewriterPrompt(
  variant: Record<string, unknown>,
  plan: BlueprintChangePlan,
  userIntent: string,
  recs: BlueprintAudienceRecommendation[],
  contentIntent?: ContentIntent
): string {
  const intent = contentIntent ?? resolveContentIntent(String(variant.genre || ''))
  const trimmed = trimVariantForPrompt(variant)
  const allFields = new Set<string>()
  for (const section of plan.sectionsToUpdate) {
    const fields = SECTION_FIELDS[section as BlueprintFixSection]
    if (fields) fields.forEach((f) => allFields.add(f))
  }
  if (plan.sectionsToUpdate.includes('characters')) {
    ;['synopsis', 'protagonist', 'antagonist', 'beats'].forEach((f) => allFields.add(f))
  }
  if (plan.sectionsToUpdate.includes('story')) {
    allFields.add('beats')
  }

  const allowedFields = [...allFields]
  const scopedBlueprint = pickVariantFields(trimmed, allowedFields)
  const recBlock = buildRecommendationIntentBlock(recs)
  const couplingRules = getCouplingRulesForIntent(intent)
  const intentGuard = getIntentRevisionGuardrail(intent)

  return `You are an expert ${intent === 'fiction' ? 'film treatment editor' : 'content blueprint editor'} performing a GUIDED, BALANCED blueprint revision.

CRITICAL RULES:
- You are REPLACING content, NOT appending. Return complete new values for each field you change.
- Apply the change plan and cross-section coupling. The blueprint must read as one coherent document.
- Do NOT change fields outside the allowed list unless coupling requires it.
- Maximum 8 beats. Beat synopses 1-3 sentences each.
- character_descriptions: preserve participant NAMES unless user explicitly requests rename.
- Return ONLY fields you modify — do not echo unchanged fields.
${intentGuard}

CHANGE PLAN:
${compactJson(plan)}

USER DIRECTION:
${truncateStr(userIntent, 800)}
${recBlock ? `\nRECOMMENDATIONS:\n${recBlock}` : ''}

ALLOWED FIELDS TO RETURN (include all you modify): ${allowedFields.join(', ')}

CURRENT VALUES (allowed fields only):
${compactJson(scopedBlueprint)}

${couplingRules}

Return ONLY a JSON object with the modified fields (subset of allowed fields). Include "narrative_reasoning" object:
{
  "narrative_reasoning": {
    "user_adjustments": "<summary of what changed and why, for the creator>",
    "key_decisions": [{"decision": "...", "why": "...", "impact": "..."}]
  },
  ...modified blueprint fields...
}
${strictJsonPromptSuffix}`
}

export function buildBalanceMicroPassPrompt(
  variant: Record<string, unknown>,
  plan: BlueprintChangePlan,
  partialDraft: Record<string, unknown>,
  missingSections: BlueprintFixSection[],
  contentIntent?: ContentIntent
): string {
  const intent = contentIntent ?? resolveContentIntent(String(variant.genre || ''))
  const fields: string[] = []
  for (const s of missingSections) {
    const f = SECTION_FIELDS[s]
    if (f) fields.push(...f)
  }

  const trimmed = trimVariantForPrompt(variant)
  const scopedOriginal = pickVariantFields(trimmed, fields)
  const scopedPartial = pickVariantFields(partialDraft, fields)

  return `The blueprint revision is incomplete. These sections still need reconciliation: ${missingSections.join(', ')}.

CHANGE PLAN: ${compactJson(plan)}

PARTIAL REVISION (relevant fields only):
${compactJson(scopedPartial)}

ORIGINAL (relevant fields only):
${compactJson(scopedOriginal)}

Update ONLY these fields to balance the blueprint: ${fields.join(', ')}
${getCouplingRulesForIntent(intent)}
${getIntentRevisionGuardrail(intent)}
Return ONLY JSON with those fields. Do not repeat unchanged content.
${strictJsonPromptSuffix}`
}
