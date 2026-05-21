import type { BlueprintAudienceRecommendation } from '@/lib/types/audienceResonance'
import type { BlueprintChangePlan, BlueprintFixSection } from './blueprintRevisionTypes'
import { SECTION_FIELDS } from './blueprintRevisionTypes'
import { strictJsonPromptSuffix } from '@/lib/safeJson'

export const CROSS_SECTION_COUPLING_RULES = `
MANDATORY CROSS-SECTION BALANCE (you MUST reconcile dependent sections when applying changes):
- character_descriptions (roles, relationships, arcs) → also update synopsis, protagonist, antagonist, and affected beats
- logline / genre / stakes changes → also update synopsis, beats pacing, and tone alignment
- beats structure changes → also update synopsis and total duration coherence
- tone / themes changes → also update visual_style, mood_references, and beat emotional tone
Never change one narrative layer in isolation when the user intent affects story logic.
`

export function trimVariantForPrompt(variant: Record<string, unknown>): Record<string, unknown> {
  const beats = Array.isArray(variant.beats)
    ? (variant.beats as Array<Record<string, unknown>>).slice(0, 10).map((b, i) => ({
        title: b.title || `Beat ${i + 1}`,
        intent: b.intent || '',
        minutes: b.minutes || 0,
        synopsis:
          typeof b.synopsis === 'string' ? b.synopsis.substring(0, 200) : '',
      }))
    : variant.beats

  const characters = Array.isArray(variant.character_descriptions)
    ? (variant.character_descriptions as Array<Record<string, unknown>>)
        .slice(0, 8)
        .map((c) => ({
          name: c.name,
          role: c.role,
          description:
            typeof c.description === 'string'
              ? c.description.substring(0, 300)
              : c.description,
          externalGoal: c.externalGoal,
          internalNeed: c.internalNeed,
          fatalFlaw: c.fatalFlaw,
        }))
    : variant.character_descriptions

  return {
    title: variant.title,
    logline: variant.logline,
    genre: variant.genre,
    format_length: variant.format_length,
    target_audience: variant.target_audience,
    synopsis: variant.synopsis || variant.content,
    setting: variant.setting,
    protagonist: variant.protagonist,
    antagonist: variant.antagonist,
    tone_description: variant.tone_description || variant.tone,
    visual_style: variant.visual_style,
    themes: variant.themes,
    mood_references: variant.mood_references,
    beats,
    character_descriptions: characters,
    total_duration_seconds: variant.total_duration_seconds,
    estimatedDurationMinutes: variant.estimatedDurationMinutes,
  }
}

export function buildRecommendationIntentBlock(
  recs: BlueprintAudienceRecommendation[]
): string {
  if (!recs.length) return ''
  return recs
    .map((r) => {
      const impact =
        r.impactSections?.length && r.impactSections.length > 0
          ? ` [also reconcile: ${r.impactSections.join(', ')}]`
          : ''
      return `- ${r.title || 'Fix'} (${r.fixSection}${impact}, −${r.pointsDeducted} pts): ${r.text}`
    })
    .join('\n')
}

export function buildPlannerPrompt(
  variant: Record<string, unknown>,
  userIntent: string,
  recs: BlueprintAudienceRecommendation[],
  focusScope?: BlueprintFixSection | 'all'
): string {
  const trimmed = trimVariantForPrompt(variant)
  const recBlock = buildRecommendationIntentBlock(recs)

  return `You are a film development editor planning a BALANCED blueprint revision.

The user provides DIRECTION only — your job is to plan which blueprint sections must change together so the story stays coherent.

CURRENT BLUEPRINT (summary):
${JSON.stringify(trimmed, null, 2)}

USER DIRECTION:
${userIntent.trim() || '(See audience resonance recommendations below)'}

${recBlock ? `AUDIENCE RESONANCE RECOMMENDATIONS TO ADDRESS:\n${recBlock}\n` : ''}
${focusScope && focusScope !== 'all' ? `USER FOCUS SCOPE: ${focusScope} (still apply cross-section coupling where needed)\n` : ''}

${CROSS_SECTION_COUPLING_RULES}

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
  recs: BlueprintAudienceRecommendation[]
): string {
  const trimmed = trimVariantForPrompt(variant)
  const allFields = new Set<string>()
  for (const section of plan.sectionsToUpdate) {
    const fields = SECTION_FIELDS[section as BlueprintFixSection]
    if (fields) fields.forEach((f) => allFields.add(f))
  }
  // Always include coupled fields from plan
  if (plan.sectionsToUpdate.includes('characters')) {
    ;['synopsis', 'protagonist', 'antagonist', 'beats'].forEach((f) =>
      allFields.add(f)
    )
  }
  if (plan.sectionsToUpdate.includes('story')) {
    allFields.add('beats')
  }

  const allowedFields = [...allFields]
  const recBlock = buildRecommendationIntentBlock(recs)

  return `You are an expert film treatment editor performing a GUIDED, BALANCED blueprint revision.

CRITICAL RULES:
- You are REPLACING content, NOT appending. Return complete new values for each field you change.
- Apply the change plan and cross-section coupling. The blueprint must read as one coherent document.
- Do NOT change fields outside the allowed list unless coupling requires it.
- Maximum 8 beats. Beat synopses 1-3 sentences each.
- character_descriptions: preserve character NAMES unless user explicitly requests rename.

CHANGE PLAN:
${JSON.stringify(plan, null, 2)}

USER DIRECTION:
${userIntent.trim()}
${recBlock ? `\nRECOMMENDATIONS:\n${recBlock}` : ''}

ALLOWED FIELDS TO RETURN (include all you modify): ${allowedFields.join(', ')}

CURRENT BLUEPRINT:
${JSON.stringify(trimmed, null, 2)}

${CROSS_SECTION_COUPLING_RULES}

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
  missingSections: BlueprintFixSection[]
): string {
  const fields: string[] = []
  for (const s of missingSections) {
    const f = SECTION_FIELDS[s]
    if (f) fields.push(...f)
  }

  return `The blueprint revision is incomplete. These sections still need reconciliation: ${missingSections.join(', ')}.

CHANGE PLAN: ${JSON.stringify(plan, null, 2)}

PARTIAL REVISION SO FAR:
${JSON.stringify(partialDraft, null, 2)}

FULL ORIGINAL:
${JSON.stringify(trimVariantForPrompt(variant), null, 2)}

Update ONLY these fields to balance the story: ${fields.join(', ')}
${CROSS_SECTION_COUPLING_RULES}
Return ONLY JSON with those fields.
${strictJsonPromptSuffix}`
}
